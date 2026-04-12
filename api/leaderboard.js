import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
})

const LEADERBOARD_KEY = 'michi-leaderboard'
const MAX_ENTRIES = 50

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    if (req.method === 'GET') {
      const entries = await redis.get(LEADERBOARD_KEY) || []
      return res.status(200).json(entries)
    }

    if (req.method === 'POST') {
      const { name, score, level, achievements } = req.body || {}

      // Validate input
      if (!name || typeof name !== 'string' || name.length < 1 || name.length > 20) {
        return res.status(400).json({ error: 'Name muss 1-20 Zeichen sein' })
      }
      if (typeof score !== 'number' || score < 0 || score > 99999) {
        return res.status(400).json({ error: 'Ungültiger Score' })
      }
      if (typeof level !== 'number' || level < 1 || level > 100) {
        return res.status(400).json({ error: 'Ungültiges Level' })
      }
      if (typeof achievements !== 'number' || achievements < 0 || achievements > 50) {
        return res.status(400).json({ error: 'Ungültige Achievements' })
      }

      // Sanitize name
      const safeName = name.replace(/[<>&"'/]/g, '').trim().slice(0, 20)
      if (!safeName) return res.status(400).json({ error: 'Ungültiger Name' })

      const entries = await redis.get(LEADERBOARD_KEY) || []

      const entry = {
        name: safeName,
        score: Math.floor(score),
        level: Math.floor(level),
        achievements: Math.floor(achievements),
        date: new Date().toISOString().slice(0, 10)
      }

      entries.push(entry)
      // Sort by score desc, keep top N
      entries.sort((a, b) => b.score - a.score)
      const trimmed = entries.slice(0, MAX_ENTRIES)

      await redis.set(LEADERBOARD_KEY, trimmed)

      const rank = trimmed.findIndex(e => e === entry || (e.name === entry.name && e.score === entry.score && e.date === entry.date)) + 1

      return res.status(200).json({ rank, total: trimmed.length })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('Leaderboard error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
