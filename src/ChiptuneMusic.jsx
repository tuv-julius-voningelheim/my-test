import { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react'

/* ═══════════════════════════════════════
   8-BIT CHIPTUNE MUSIC ENGINE
   All music is procedurally generated via Web Audio API.
   100% license-free — no external audio files.
   ═══════════════════════════════════════ */

const MusicContext = createContext(null)

export function useMusic() {
  return useContext(MusicContext)
}

// Note frequencies (C4 = middle C)
const NOTES = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00, B5: 987.77,
  R: 0, // rest
}

// Overworld / map theme — upbeat adventure melody
const MAP_MELODY = [
  'C4','D4','E4','G4','R','E4','D4','R','C4','R','E4','R','G4','A4','G4','R',
  'A4','G4','E4','R','D4','R','C4','R','D4','E4','G4','E4','D4','R','R','R',
  'C4','E4','G4','A4','R','G4','E4','R','D4','E4','D4','C4','R','R','R','R',
  'E4','R','D4','R','C4','D4','E4','R','G4','R','A4','G4','E4','R','R','R',
  'C5','R','A4','G4','R','E4','G4','R','A4','G4','E4','D4','C4','R','R','R',
]
const MAP_BASS = [
  'C3','R','C3','R','G3','R','C3','R','E3','R','C3','R','G3','R','G3','R',
  'F3','R','F3','R','C3','R','E3','R','G3','R','G3','R','C3','R','R','R',
  'A3','R','A3','R','E3','R','A3','R','G3','R','E3','R','C3','R','R','R',
  'F3','R','G3','R','C3','R','E3','R','G3','R','F3','R','C3','R','R','R',
  'C3','R','F3','R','G3','R','E3','R','F3','R','C3','R','C3','R','R','R',
]

// Battle theme — more intense
const BATTLE_MELODY = [
  'E4','E4','E4','R','C4','E4','G4','R','G4','R','R','R','C4','R','R','R',
  'A4','A4','A4','R','G4','F4','E4','R','C4','R','D4','E4','R','R','R','R',
  'B4','B4','A4','G4','E4','F4','G4','R','A4','R','G4','E4','R','R','R','R',
  'E4','D4','C4','R','D4','E4','C4','R','D4','R','E4','F4','G4','R','R','R',
]
const BATTLE_BASS = [
  'C3','R','C3','R','C3','R','E3','R','G3','R','R','R','C3','R','R','R',
  'A3','R','A3','R','G3','R','E3','R','C3','R','D3','E3','R','R','R','R',
  'B3','R','A3','G3','E3','R','G3','R','A3','R','G3','E3','R','R','R','R',
  'E3','D3','C3','R','D3','E3','C3','R','D3','R','E3','F3','G3','R','R','R',
]

// Rhythm game theme — steady 4/4 beat with clear rhythm hits
// BPM = 120, each note = 1/8th note = 250ms
const RHYTHM_MELODY = [
  'C5','R','E4','R','G4','R','C5','R','B4','R','G4','R','A4','R','B4','R',
  'C5','R','A4','R','F4','R','A4','R','G4','R','E4','R','D4','R','E4','R',
  'C5','R','E4','R','G4','R','C5','R','D5','R','C5','R','B4','R','A4','R',
  'G4','R','A4','R','B4','R','C5','R','D5','R','E5','R','D5','R','C5','R',
  'E5','R','D5','R','C5','R','B4','R','A4','R','G4','R','A4','R','B4','R',
  'C5','R','D5','R','E5','R','C5','R','A4','R','G4','R','F4','R','E4','R',
]
const RHYTHM_BASS = [
  'C3','R','C3','R','G3','R','G3','R','C3','R','C3','R','F3','R','G3','R',
  'A3','R','A3','R','F3','R','F3','R','G3','R','G3','R','G3','R','G3','R',
  'C3','R','C3','R','G3','R','G3','R','C3','R','C3','R','F3','R','F3','R',
  'G3','R','G3','R','G3','R','C3','R','D3','R','E3','R','D3','R','C3','R',
  'C3','R','C3','R','G3','R','G3','R','F3','R','F3','R','F3','R','G3','R',
  'C3','R','D3','R','E3','R','C3','R','A3','R','G3','R','F3','R','E3','R',
]

// Rhythm game beat pattern: timestamps where notes should appear (in 8th note indices)
// Each beat index maps to when a note should be spawned
export const RHYTHM_BEAT_PATTERN = [
  { time: 0, col: 0 }, { time: 2, col: 1 }, { time: 4, col: 2 }, { time: 6, col: 3 },
  { time: 8, col: 1 }, { time: 10, col: 2 }, { time: 12, col: 0 }, { time: 14, col: 3 },
  { time: 16, col: 2 }, { time: 18, col: 0 }, { time: 20, col: 1 }, { time: 22, col: 3 },
  { time: 24, col: 2 }, { time: 26, col: 1 }, { time: 28, col: 0 }, { time: 30, col: 2 },
  { time: 32, col: 0 }, { time: 34, col: 1 }, { time: 36, col: 2 }, { time: 38, col: 3 },
  { time: 40, col: 3 }, { time: 42, col: 2 }, { time: 44, col: 1 }, { time: 46, col: 0 },
  { time: 48, col: 1 }, { time: 50, col: 3 }, { time: 52, col: 0 }, { time: 54, col: 2 },
  { time: 56, col: 2 }, { time: 58, col: 1 }, { time: 60, col: 3 }, { time: 62, col: 0 },
  { time: 64, col: 0 }, { time: 66, col: 2 }, { time: 68, col: 1 }, { time: 70, col: 3 },
  { time: 72, col: 3 }, { time: 74, col: 0 }, { time: 76, col: 2 }, { time: 78, col: 1 },
  { time: 80, col: 1 }, { time: 82, col: 3 }, { time: 84, col: 0 }, { time: 86, col: 2 },
  { time: 88, col: 0 }, { time: 90, col: 1 }, { time: 92, col: 2 }, { time: 94, col: 3 },
]

// Drum pattern (kick on 1&3, snare on 2&4, hihat on every 8th)
function createDrumPattern(ctx, startTime, bpm, bars) {
  const eighth = 60 / bpm / 2
  const totalSteps = bars * 8
  for (let i = 0; i < totalSteps; i++) {
    const t = startTime + i * eighth
    // Hi-hat on every step
    playNoise(ctx, t, 0.02, 0.03, 8000, 0.04)
    // Kick on beats 1 and 3 (every 4 steps)
    if (i % 8 === 0 || i % 8 === 4) playKick(ctx, t, 0.08)
    // Snare on beats 2 and 4
    if (i % 8 === 2 || i % 8 === 6) playNoise(ctx, t, 0.06, 0.08, 3000, 0.06)
  }
}

function playKick(ctx, time, vol) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(150, time)
  osc.frequency.exponentialRampToValueAtTime(30, time + 0.1)
  gain.gain.setValueAtTime(vol, time)
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15)
  osc.connect(gain).connect(ctx.destination)
  osc.start(time)
  osc.stop(time + 0.15)
}

function playNoise(ctx, time, vol, duration, filterFreq, attack) {
  const bufferSize = ctx.sampleRate * duration
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
  const source = ctx.createBufferSource()
  source.buffer = buffer
  const filter = ctx.createBiquadFilter()
  filter.type = 'highpass'
  filter.frequency.value = filterFreq
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.001, time)
  gain.gain.linearRampToValueAtTime(vol, time + (attack || 0.005))
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration)
  source.connect(filter).connect(gain).connect(ctx.destination)
  source.start(time)
  source.stop(time + duration)
}

function scheduleTrack(ctx, melody, bass, bpm, startTime, loopBars) {
  const eighth = 60 / bpm / 2
  const melodyLen = melody.length
  const bassLen = bass.length
  const totalSteps = loopBars * 8

  // Schedule melody
  for (let i = 0; i < Math.min(melodyLen, totalSteps); i++) {
    const note = melody[i]
    if (note === 'R' || !NOTES[note]) continue
    const t = startTime + i * eighth
    playSquare(ctx, NOTES[note], t, eighth * 0.8, 0.08)
  }

  // Schedule bass
  for (let i = 0; i < Math.min(bassLen, totalSteps); i++) {
    const note = bass[i]
    if (note === 'R' || !NOTES[note]) continue
    const t = startTime + i * eighth
    playTriangle(ctx, NOTES[note], t, eighth * 0.9, 0.1)
  }

  // Drums
  createDrumPattern(ctx, startTime, bpm, loopBars)
}

function playSquare(ctx, freq, time, duration, vol) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'square'
  osc.frequency.value = freq
  gain.gain.setValueAtTime(vol, time)
  gain.gain.setValueAtTime(vol, time + duration * 0.7)
  gain.gain.linearRampToValueAtTime(0, time + duration)
  osc.connect(gain).connect(ctx.destination)
  osc.start(time)
  osc.stop(time + duration + 0.01)
}

function playTriangle(ctx, freq, time, duration, vol) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'triangle'
  osc.frequency.value = freq
  gain.gain.setValueAtTime(vol, time)
  gain.gain.setValueAtTime(vol, time + duration * 0.8)
  gain.gain.linearRampToValueAtTime(0, time + duration)
  osc.connect(gain).connect(ctx.destination)
  osc.start(time)
  osc.stop(time + duration + 0.01)
}

/* ═══════ SFX ENGINE ═══════ */
let sfxCtx = null
function getSfxCtx() {
  if (!sfxCtx || sfxCtx.state === 'closed') {
    sfxCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
  if (sfxCtx.state === 'suspended') sfxCtx.resume()
  return sfxCtx
}

function sfxTone(freq, duration, type = 'square', vol = 0.15) {
  const ctx = getSfxCtx(), t = ctx.currentTime
  const osc = ctx.createOscillator(), g = ctx.createGain()
  osc.type = type; osc.frequency.value = freq
  g.gain.setValueAtTime(vol, t)
  g.gain.linearRampToValueAtTime(0, t + duration)
  osc.connect(g).connect(ctx.destination)
  osc.start(t); osc.stop(t + duration + 0.01)
}

function sfxNoise(duration, vol = 0.08, filterFreq = 4000) {
  const ctx = getSfxCtx(), t = ctx.currentTime
  const buf = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  const src = ctx.createBufferSource()
  src.buffer = buf
  const filt = ctx.createBiquadFilter()
  filt.type = 'highpass'; filt.frequency.value = filterFreq
  const g = ctx.createGain()
  g.gain.setValueAtTime(vol, t)
  g.gain.linearRampToValueAtTime(0, t + duration)
  src.connect(filt).connect(g).connect(ctx.destination)
  src.start(t); src.stop(t + duration + 0.01)
}

const SFX = {
  // Correct / success
  hit_perfect() { sfxTone(880, 0.08); setTimeout(() => sfxTone(1320, 0.1), 60) },
  hit_great()   { sfxTone(660, 0.08); setTimeout(() => sfxTone(880, 0.08), 50) },
  hit_ok()      { sfxTone(440, 0.06) },
  correct()     { sfxTone(523, 0.08); setTimeout(() => sfxTone(659, 0.08), 80); setTimeout(() => sfxTone(784, 0.12), 160) },
  match()       { sfxTone(660, 0.06); setTimeout(() => sfxTone(880, 0.08), 70) },
  // Errors
  miss()        { sfxTone(180, 0.15, 'sawtooth', 0.1) },
  wrong()       { sfxTone(200, 0.1, 'sawtooth', 0.1); setTimeout(() => sfxTone(160, 0.15, 'sawtooth', 0.1), 100) },
  // Combat
  player_attack()  { sfxNoise(0.08, 0.12, 2000); sfxTone(300, 0.06, 'sawtooth', 0.08) },
  player_crit()    { sfxNoise(0.12, 0.15, 1500); sfxTone(600, 0.08, 'sawtooth', 0.12); setTimeout(() => sfxTone(900, 0.1), 80) },
  player_heal()    { sfxTone(440, 0.08, 'triangle', 0.12); setTimeout(() => sfxTone(660, 0.1, 'triangle', 0.12), 100); setTimeout(() => sfxTone(880, 0.12, 'triangle', 0.12), 200) },
  player_miss()    { sfxTone(220, 0.12, 'triangle', 0.06) },
  boss_attack()    { sfxTone(120, 0.15, 'sawtooth', 0.12); sfxNoise(0.1, 0.1, 800) },
  boss_heal()      { sfxTone(330, 0.1, 'triangle', 0.1); setTimeout(() => sfxTone(440, 0.12, 'triangle', 0.1), 120) },
  // Win / lose
  victory()     { [523,659,784,1047].forEach((f, i) => setTimeout(() => sfxTone(f, 0.15, 'square', 0.12), i * 120)) },
  defeat()      { [330,262,220,165].forEach((f, i) => setTimeout(() => sfxTone(f, 0.2, 'triangle', 0.1), i * 150)) },
  level_complete() { [523,659,784,1047,784,1047].forEach((f, i) => setTimeout(() => sfxTone(f, 0.12, 'square', 0.1), i * 100)) },
  // UI
  unlock()      { sfxTone(440, 0.06, 'square', 0.08); setTimeout(() => sfxTone(880, 0.1, 'square', 0.08), 80) },
  flip()        { sfxTone(600, 0.04, 'square', 0.06) },
  click()       { sfxTone(800, 0.03, 'square', 0.05) },
}

export { SFX }

export function MusicProvider({ children }) {
  const [musicOn, setMusicOn] = useState(false)
  const [currentTrack, setCurrentTrack] = useState('map') // 'map' | 'battle' | 'rhythm' | null
  const ctxRef = useRef(null)
  const loopRef = useRef(null)
  const trackRef = useRef('map')

  const stopMusic = useCallback(() => {
    if (loopRef.current) clearInterval(loopRef.current)
    loopRef.current = null
    if (ctxRef.current && ctxRef.current.state !== 'closed') {
      ctxRef.current.close().catch(() => {})
    }
    ctxRef.current = null
  }, [])

  const startTrack = useCallback((track) => {
    stopMusic()
    trackRef.current = track

    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    ctxRef.current = ctx

    const bpm = track === 'rhythm' ? 120 : track === 'battle' ? 140 : 130
    const melody = track === 'rhythm' ? RHYTHM_MELODY : track === 'battle' ? BATTLE_MELODY : MAP_MELODY
    const bass = track === 'rhythm' ? RHYTHM_BASS : track === 'battle' ? BATTLE_BASS : MAP_BASS
    const eighth = 60 / bpm / 2
    const loopSteps = melody.length
    const loopDuration = loopSteps * eighth

    // Schedule first loop immediately
    scheduleTrack(ctx, melody, bass, bpm, ctx.currentTime + 0.1, Math.ceil(loopSteps / 8))

    // Schedule subsequent loops
    let nextSchedule = ctx.currentTime + 0.1 + loopDuration
    loopRef.current = setInterval(() => {
      if (!ctxRef.current || ctxRef.current.state === 'closed') {
        clearInterval(loopRef.current)
        return
      }
      if (ctx.currentTime > nextSchedule - 2) {
        scheduleTrack(ctx, melody, bass, bpm, nextSchedule, Math.ceil(loopSteps / 8))
        nextSchedule += loopDuration
      }
    }, 1000)
  }, [stopMusic])

  const toggleMusic = useCallback(() => {
    if (musicOn) {
      stopMusic()
      setMusicOn(false)
    } else {
      startTrack(trackRef.current)
      setMusicOn(true)
    }
  }, [musicOn, startTrack, stopMusic])

  const switchTrack = useCallback((track) => {
    trackRef.current = track
    setCurrentTrack(track)
    if (musicOn) {
      startTrack(track)
    }
  }, [musicOn, startTrack])

  // Cleanup on unmount
  useEffect(() => () => stopMusic(), [stopMusic])

  return (
    <MusicContext.Provider value={{ musicOn, toggleMusic, switchTrack, currentTrack }}>
      {children}
    </MusicContext.Provider>
  )
}

export function MusicToggle() {
  const { musicOn, toggleMusic } = useMusic()
  return (
    <button
      className="fun-btn-icon fun-music-toggle"
      onClick={toggleMusic}
      title={musicOn ? 'Musik aus' : 'Musik an'}
    >
      {musicOn ? '🔊' : '🔇'}
    </button>
  )
}
