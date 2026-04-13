import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useParticleSystem, ParticleOverlay, useScreenShake, FloatingText, ComboMeter, RunnerBackground } from './PixiEffects'
import { MusicProvider, MusicToggle, useMusic, RHYTHM_BEAT_PATTERN, SFX } from './ChiptuneMusic'
import { PixelAvatar } from 'pixel-avatar-lib'

const IK = 'https://ik.imagekit.io/iu69j6qea/MW/'
const IMAGES = [
  'a6f48f6b-c3b9-4f6f-8db3-5ee570efece0.avif',
  'c3909867-ea5d-487b-8438-3ffe73b50892.avif',
  'cd1c83dc-a8ff-4be0-aa04-3ba50d43743e.avif',
  '2e296b0c-451e-45f2-8563-d738c28bbd36.avif',
  '61e8fd9c-1393-49e8-8453-1c9b74c88e57.avif',
  '51b24bd1-8903-4b94-a394-56dc84561493.avif',
  'ca6f9d5b-53e8-49f2-9a64-73e8da27a510.avif',
  '963c8a0b-93ec-400f-bbed-e80442044804.avif',
  'ad58b45a-3e7b-486f-a178-50d54b7da81c.avif',
  '81f8dd35-074c-48c9-a31f-90183c48277e.avif',
  '353ddc37-b6eb-455a-abd2-11d07c317824.avif',
  '3c77e527-eaa4-4dde-bb3f-1b5f09c22ef3.avif',
  '9369310e-1ebd-4a1c-ae02-a1f52958680e.avif',
]

/* ═══════════════════════════════════════
   MAP NODES & LEVEL DATA
   ═══════════════════════════════════════ */

const MAP_NODES = [
  { id: 'hamburg',      name: 'Hamburg',         icon: '⚓', x: 25, y: 25, unlocks: ['essen'], levelType: 'charselect', label: 'Charakter & Skills' },
  { id: 'essen',        name: 'Folkwang Essen',  icon: '🎓', x: 5, y: 55, unlocks: ['bochum'], levelType: 'pitjump', label: 'Grubensprung' },
  { id: 'bochum',       name: 'Bochum',          icon: '🎪', x: 9, y: 48, unlocks: ['dortmund', 'bonus'], levelType: 'memory', label: 'Memory' },
  { id: 'bonus',        name: 'Bonus',           icon: '⭐', x: 45, y: 50, unlocks: [], levelType: 'survivor', label: 'Survival Arena (Optional)' },
  { id: 'dortmund',     name: 'Dortmund',        icon: '🎭', x: 17, y: 55, unlocks: ['saarbruecken'], levelType: 'dialog', label: 'Worträtsel' },
  { id: 'saarbruecken', name: 'Saarbrücken',     icon: '⚔️', x: 5, y: 75, unlocks: ['osnabrueck'], levelType: 'bossbattle', label: 'Boss Arena' },
  { id: 'osnabrueck',   name: 'Osnabrück',       icon: '🐴', x: 15, y: 35, unlocks: ['gdansk'], levelType: 'rhythm', label: 'Bühnen-Beat' },
  { id: 'gdansk',       name: 'Gdańsk',          icon: '🃏', x: 75, y: 25, unlocks: ['wroclaw', 'bonus2'], levelType: 'deckbuilder', label: 'Kartenkampf' },
  { id: 'bonus2',       name: 'Bonus 2',         icon: '🧱', x: 55, y: 55, unlocks: [], levelType: 'bittrip', label: 'Breakout (Optional)' },
  { id: 'wroclaw',      name: 'Wrocław',         icon: '📚', x: 65, y: 45, unlocks: [], levelType: 'finalboss', label: 'Final Boss' },
]

const MAP_PATHS = [
  ['hamburg', 'essen'], ['essen', 'bochum'], ['bochum', 'dortmund'],
  ['bochum', 'bonus'],
  ['dortmund', 'saarbruecken'],
  ['saarbruecken', 'osnabrueck'], ['osnabrueck', 'gdansk'], ['gdansk', 'wroclaw'],
  ['gdansk', 'bonus2'],
]

const getNode = (id) => MAP_NODES.find(n => n.id === id)

// SVG viewBox is 150×100 to match the 3:2 aspect ratio of the map container.
// This avoids curve distortion. CSS uses node.x% / node.y%, SVG uses node.x*1.5 / node.y.
const SVG_W = 150, SVG_H = 100
const toSvg = (node) => ({ sx: node.x * (SVG_W / 100), sy: node.y })

// Hand-tuned control points for natural-looking paths between cities.
// Each path can have 1 control point (quadratic) or 2 (cubic) for S-curves.
const PATH_CURVES = {
  'hamburg-essen':           { c1: [18, 35], c2: [8, 42] },
  'essen-bochum':            { c1: [5, 50] },
  'bochum-dortmund':         { c1: [12, 48] },
  'bochum-bonus':             { c1: [25, 45], c2: [35, 48] },
  'dortmund-saarbruecken':   { c1: [18, 63], c2: [10, 68] },
  'saarbruecken-osnabrueck': { c1: [6, 55], c2: [12, 42] },
  'osnabrueck-gdansk':       { c1: [35, 22], c2: [55, 18] },
  'gdansk-wroclaw':          { c1: [78, 32], c2: [72, 38] },
  'gdansk-bonus2':           { c1: [70, 35], c2: [62, 45] },
}

function getSvgPathD(a, b) {
  const na = getNode(a), nb = getNode(b)
  const sa = toSvg(na), sb = toSvg(nb)
  const key = `${a}-${b}`
  const curves = PATH_CURVES[key]
  if (!curves) return `M ${sa.sx} ${sa.sy} L ${sb.sx} ${sb.sy}`
  if (curves.c2) {
    const c1x = curves.c1[0] * (SVG_W / 100), c1y = curves.c1[1]
    const c2x = curves.c2[0] * (SVG_W / 100), c2y = curves.c2[1]
    return `M ${sa.sx} ${sa.sy} C ${c1x} ${c1y} ${c2x} ${c2y} ${sb.sx} ${sb.sy}`
  }
  const cx = curves.c1[0] * (SVG_W / 100), cy = curves.c1[1]
  return `M ${sa.sx} ${sa.sy} Q ${cx} ${cy} ${sb.sx} ${sb.sy}`
}

/* ═══════════════════════════════════════
   GAME DATA
   ═══════════════════════════════════════ */

const CHARACTER_STATS = [
  { label: 'Spielalter', value: '30–37', bar: 65 },
  { label: 'Größe', value: '185 cm', bar: 85 },
  { label: 'Charisma', value: '∞', bar: 100 },
  { label: 'Pferd-Skill', value: 'MAX', bar: 100 },
  { label: 'Humor', value: 'Hoch', bar: 90 },
  { label: 'Stimme', value: 'Bariton', bar: 80 },
]

const SKILL_TREE = [
  { id: 'deutsch', name: 'Deutsch', desc: 'Muttersprache', cat: 'Sprachen', cost: 0, req: [], icon: '🇩🇪' },
  { id: 'polnisch', name: 'Polnisch', desc: 'Fluent AF', cat: 'Sprachen', cost: 10, req: ['deutsch'], icon: '🇵🇱' },
  { id: 'englisch', name: 'Englisch', desc: 'Good enough', cat: 'Sprachen', cost: 10, req: ['deutsch'], icon: '🇬🇧' },
  { id: 'musical', name: 'Musical', desc: 'Bühnenreif', cat: 'Gesang', cost: 15, req: [], icon: '🎭' },
  { id: 'pop', name: 'Pop', desc: 'Duschkonzert-Level', cat: 'Gesang', cost: 15, req: ['musical'], icon: '🎤' },
  { id: 'rap', name: 'Rap', desc: 'Bariton-Bars', cat: 'Gesang', cost: 20, req: ['pop'], icon: '🎙️' },
  { id: 'fechten', name: 'Bühnenfechten', desc: 'En garde!', cat: 'Sport', cost: 20, req: [], icon: '⚔️' },
  { id: 'handball', name: 'Handball', desc: 'Nicht nur werfen', cat: 'Sport', cost: 15, req: [], icon: '🤾' },
  { id: 'tanzen', name: 'Tanzsport', desc: 'Moves hat er', cat: 'Sport', cost: 15, req: ['handball'], icon: '💃' },
  { id: 'bariton', name: 'Bariton', desc: 'Stimmlage: tief & schön', cat: 'Spezial', cost: 25, req: ['musical'], icon: '🎵' },
  { id: 'fuehrerschein', name: 'Führerschein B', desc: 'Kann Auto fahren', cat: 'Spezial', cost: 5, req: [], icon: '🚗' },
]

const DIALOG_LINES = [
  { speaker: 'System', text: '📍 Dortmund & Bochum – Die Anfänge.' },
  { speaker: 'Michi', text: 'Noch während der Ausbildung auf echten Bühnen. Schauspielhaus Bochum, Schauspiel Dortmund!' },
  { speaker: 'Regisseur', text: 'Sie spielen den Maccario. Und in der Borderline Prozession... alles.' },
  { speaker: 'Michi', text: 'Mann im Auto, Soldat, Lolita. Ja, Lolita. Frag nicht.' },
  { speaker: 'System', text: 'Die Karriere nimmt Fahrt auf. Nächster Halt: Saarbrücken!' },
  { speaker: 'Michi', text: 'Sechs Jahre voller Rollen. Hamlet, drei Mal den Tod, und ein Weihnachtsbaum.' },
  { speaker: 'System', text: '🎮 Level abgeschlossen! +30 XP' },
]

const BOSSES = [
  { id: 'hamlet', name: 'Hamlet', sprite: '💀', hp: 120,
    attacks: [
      { name: 'Sein oder Nichtsein?', dmg: [12, 22], desc: 'Existenzielle Krise', effect: 'confuse' },
      { name: 'Monolog-Attacke', dmg: [18, 28], desc: 'Endloser Redefluss' },
      { name: 'Gift im Ohr', dmg: [25, 35], desc: 'Hinterhältiger Angriff', effect: 'poison' },
      { name: 'Schwert-Duell', dmg: [15, 25], desc: 'Fechten wie Laertes' },
    ],
    reward: 'Hamlet-Versteher!', loot: 'Michi hat Hamlet am Saarl. Staatstheater unter Bettina Bruinier gespielt.' },
  { id: 'tod', name: 'Der Tod', sprite: '☠️', hp: 150,
    attacks: [
      { name: 'Sense!', dmg: [20, 35], desc: 'Ein Schnitt für alle' },
      { name: 'Stille...', dmg: [0, 0], desc: 'Heilt sich selbst', effect: 'heal' },
      { name: 'Memento Mori', dmg: [30, 40], desc: 'Erinner dich!', effect: 'fear' },
      { name: 'Unvermeidlich', dmg: [15, 20], desc: 'Langsam aber sicher', effect: 'poison' },
    ],
    reward: 'Dreifacher Tod!', loot: 'In "Spieler und Tod" und "Jedermann" – Michi IST der Tod.' },
  { id: 'pferd', name: 'Das Pferd', sprite: '🐴', hp: 100,
    attacks: [
      { name: 'Wiehern!', dmg: [10, 18], desc: 'Ohrenbetäubend', effect: 'confuse' },
      { name: 'Hufschlag!', dmg: [22, 32], desc: 'OOF!' },
      { name: 'Galopp!', dmg: [15, 25], desc: 'Überrennt alles' },
      { name: 'Pferdeblick', dmg: [8, 12], desc: 'Traurige Augen', effect: 'fear' },
    ],
    reward: 'Pferdeflüsterer!', loot: 'In "Kohlhaas" spielt Michi ein PFERD. Wieher-Technik: Folkwang-geprüft.' },
  { id: 'baum', name: 'Weihnachtsbaum', sprite: '🎄', hp: 90,
    attacks: [
      { name: 'Nadeln!', dmg: [10, 20], desc: 'Pieks pieks pieks' },
      { name: 'Lametta!', dmg: [8, 15], desc: 'Blendet dich', effect: 'confuse' },
      { name: 'O Tannenbaum!', dmg: [5, 10], desc: 'Singt sich gesund', effect: 'heal' },
      { name: 'Stern-Attacke!', dmg: [25, 35], desc: 'Stern von der Spitze!' },
    ],
    reward: 'O Tannenbaum!', loot: '"Die Bettwurst - Das Musical" – Michi als Weihnachtsbaum. Er ist stolz drauf.' },
  { id: 'gatsby', name: 'Jay Gatsby', sprite: '🥂', hp: 110,
    attacks: [
      { name: 'Champagner!', dmg: [12, 20], desc: 'Schaumig und fies' },
      { name: 'Grünes Licht!', dmg: [18, 28], desc: 'Hoffnung die schadet', effect: 'confuse' },
      { name: 'Party-Chaos!', dmg: [20, 30], desc: 'Wilde 20er!' },
      { name: 'Old Sport!', dmg: [10, 15], desc: 'Arroganter Gruß', effect: 'fear' },
    ],
    reward: 'Old Sport!', loot: 'Michi hat Gatsby UND Nick Carraway gespielt. Beide Seiten der Freundschaft!' },
]

// Player moves for RPG battle
const PLAYER_MOVES = [
  { id: 'monolog', name: '🎭 Monolog', desc: 'Sicherer Schaden', dmg: [15, 25], accuracy: 95 },
  { id: 'fechten', name: '⚔️ Bühnenfechten', desc: 'Hoher Schaden, riskant', dmg: [28, 40], accuracy: 70 },
  { id: 'impro', name: '💫 Improvisation', desc: 'Heilt 25-35 HP', heal: [25, 35], accuracy: 100 },
  { id: 'blick', name: '👁️ Kritischer Blick', desc: 'Schwächt den Gegner', dmg: [10, 18], accuracy: 85, effect: 'weaken' },
]

const RUNNER_ITEMS = [
  { emoji: '💀', type: 'good', label: 'Totenkopf', points: 10 },
  { emoji: '🥂', type: 'good', label: 'Champagner', points: 15 },
  { emoji: '⚔️', type: 'good', label: 'Schwert', points: 10 },
  { emoji: '🎭', type: 'good', label: 'Maske', points: 20 },
  { emoji: '🐴', type: 'good', label: 'Hufeisen', points: 25 },
  { emoji: '📰', type: 'bad', label: 'Schlechte Kritik', points: -30 },
  { emoji: '🧱', type: 'bad', label: 'Sandsack', points: -20 },
  { emoji: '😴', type: 'bad', label: 'Langeweile', points: -25 },
]

const MONOLOG_TEXTS = [
  { title: 'Hamlet – Sein oder Nichtsein', text: 'Sein oder Nichtsein das ist hier die Frage ob es edler im Gemüt die Pfeil und Schleudern des wütenden Geschicks erdulden oder sich waffnend gegen eine See von Plagen' },
  { title: 'Kabale und Liebe – Ferdinand', text: 'Ich ein Offizier und habe Ehre doch lieber will ich meine Geige zerschmettern und den Degen in den Leib mir jagen als der Unschuld das Herz brechen' },
  { title: 'Dantons Tod – Camille', text: 'Die Sterne sind hübsch durch den Himmel gestreut wie Tränen auf einem Leichentuch es webt sich ein feiner Schmerz im Herzen der sie zaehlt' },
]

const CONTACT_QUESTIONS = [
  { q: 'Was ist Michis Stimmlage?', opts: ['Tenor','Bariton','Bass','Sopran'], correct: 1 },
  { q: 'An welcher Uni hat Michi studiert?', opts: ['UdK Berlin','Folkwang','Otto Falckenberg','Ernst Busch'], correct: 1 },
  { q: 'Welches Tier hat Michi gespielt?', opts: ['Hund','Katze','Pferd','Papagei'], correct: 2 },
]

/* ═══════════════════════════════════════
   WORD SCRAMBLE DATA (Dortmund mini-game)
   ═══════════════════════════════════════ */
const SCRAMBLE_WORDS = [
  { word: 'MONOLOG', hint: 'Wenn einer alleine redet auf der Bühne' },
  { word: 'REGIE', hint: 'Wer sagt wo man stehen soll' },
  { word: 'APPLAUS', hint: 'Das Beste nach der Vorstellung' },
  { word: 'KULISSE', hint: 'Die Wand die keine ist' },
  { word: 'PREMIERE', hint: 'Die allererste Aufführung' },
  { word: 'MASKE', hint: 'Verwandlung vor dem Spiegel' },
  { word: 'LAMPENFIEBER', hint: 'Herzklopfen vor dem Auftritt' },
  { word: 'VORHANG', hint: 'Geht auf und zu' },
]

/* ═══════════════════════════════════════
   VIDEO INTERLUDES (after every 2nd city)
   ═══════════════════════════════════════ */
const VIDEO_INTERLUDES = {
  essen: { title: 'Mehr über Michi', subtitle: 'Die Folkwang-Jahre', videoId: 'PLACEHOLDER_1' },
  saarbruecken: { title: 'Mehr über Michi', subtitle: 'Die Saarbrücken-Ära', videoId: 'PLACEHOLDER_2' },
  gdansk: { title: 'Mehr über Michi', subtitle: 'Zwischen den Welten', videoId: 'PLACEHOLDER_3' },
}

/* ═══════════════════════════════════════
   LEVEL STORY INTROS
   ═══════════════════════════════════════ */
const LEVEL_STORIES = {
  hamburg: {
    title: '⚓ Hamburg – Der Anfang',
    lines: [
      'Hier beginnt alles. Die Hafenstadt, wo Michi Wischniowski seine ersten Schritte machte.',
      'Ein Junge aus Polen kommt in die Stadt an der Elbe. Noch ahnt niemand, was aus ihm wird...',
      'Lerne den Charakter kennen und schalte seine Skills frei!'
    ]
  },
  essen: {
    title: '🎓 Folkwang Essen – Der Sprung',
    lines: [
      'Die Folkwang Universität der Künste. Hier wagt Michi den großen Sprung.',
      'Wie weit kann er springen? Nur ein Weg um es herauszufinden...',
      'Halte die Taste und springe so weit wie möglich über die Grube!'
    ]
  },
  dortmund: {
    title: '🎭 Dortmund – Erste Bühnen',
    lines: [
      'Noch während der Ausbildung steht Michi auf echten Bühnen. Schauspiel Dortmund ruft!',
      'Maccario, Soldat, Mann im Auto... und ja, auch Lolita. Die Rollen sind wild, die Erfahrung unbezahlbar.',
      'Erlebe die Geschichte von Michis Bühnenanfängen!'
    ]
  },
  bochum: {
    title: '🎪 Bochum – Schauspielhaus',
    lines: [
      'Das Schauspielhaus Bochum – eine Legende des deutschen Theaters.',
      'Hier zeigt Michi, dass er mehr kann als nur eine Rolle. Die Borderline Prozession wird zum Wendepunkt.',
      'Teste dein Gedächtnis mit Michis Rollen und Fähigkeiten!'
    ]
  },
  bonus: {
    title: '⭐ Bonus – Survival Arena (Optional)',
    lines: [
      'Ein geheimer Ort... Die Bühne der Untoten!',
      'Horden von Theater-Gegnern stürmen auf dich zu. Überlebe so lange wie möglich!',
      'Bewege dich und sammle Upgrades. Deine Waffen feuern automatisch!'
    ]
  },
  saarbruecken: {
    title: '⚔️ Saarbrücken – Die großen Rollen',
    lines: [
      'Saarländisches Staatstheater. Sechs Jahre, die alles verändern.',
      'Hamlet, dreimal den Tod, ein Weihnachtsbaum und Jay Gatsby – Michi spielt sie ALLE.',
      'Unter Intendantin Bettina Bruinier wird er zum Publikumsliebling. Besiege seine legendären Rollen im Kampf!'
    ]
  },
  osnabrueck: {
    title: '🐴 Osnabrück – Theater am Domhof',
    lines: [
      'Osnabrück! Das Theater am Domhof wird zur neuen Heimat.',
      'Kohlhaas – und Michi spielt DAS PFERD. Wer braucht schon Würde, wenn man Applaus hat?',
      'Renne über die Bühne, sammel Requisiten und weiche den Kritikern aus!'
    ]
  },
  gdansk: {
    title: '🏠 Gdańsk – Zurück zu den Wurzeln',
    lines: [
      'Gdańsk, die Perle an der Ostsee. Michis polnische Wurzeln liegen hier.',
      'Zwischen zwei Kulturen aufgewachsen – Deutsch und Polnisch fließend, die Seele immer unterwegs.',
      'Entdecke Michis Fotogalerie und sammle alle Erinnerungen!'
    ]
  },
  bonus2: {
    title: '🧱 Bonus 2 – Breakout (Optional)',
    lines: [
      'Negative Kritiken blockieren deinen Weg!',
      'Zerstöre sie alle mit dem Ball — lass keinen übrig!',
      'Bewege dein Paddle und halte den Ball im Spiel!'
    ]
  },
  wroclaw: {
    title: '📚 Wrocław – Das Finale',
    lines: [
      'Wrocław – Breslau. Europäische Kulturhauptstadt und Endstation dieser Reise.',
      'Ein letzter Test wartet. Nur wer Michi wirklich kennt, darf ihn kontaktieren.',
      'Tippe den Monolog, beantworte die Fragen – und schalte den Kontakt frei!'
    ]
  },
}

const MEMORY_PAIRS = [
  { id: 'hamlet', emoji: '💀', label: 'Hamlet' },
  { id: 'gatsby', emoji: '🥂', label: 'Gatsby' },
  { id: 'pferd', emoji: '🐴', label: 'Pferd' },
  { id: 'tod', emoji: '☠️', label: 'Tod' },
  { id: 'baum', emoji: '🎄', label: 'Weihnachtsbaum' },
  { id: 'fechten', emoji: '⚔️', label: 'Fechten' },
  { id: 'singen', emoji: '🎤', label: 'Singen' },
  { id: 'folkwang', emoji: '🎓', label: 'Folkwang' },
]

const ACHIEVEMENTS = [
  { id: 'char_select', name: 'Charakter erstellt', desc: 'Stats aufgedeckt', icon: '🎮' },
  { id: 'skill_5', name: 'Skill-Sammler', desc: '5 Skills freigeschaltet', icon: '🌳' },
  { id: 'skill_all', name: 'Skill-Meister', desc: 'Alle Skills', icon: '⭐' },
  { id: 'boss_first', name: 'Boss besiegt', desc: 'Einen Boss besiegt', icon: '⚔️' },
  { id: 'boss_all', name: 'Endgegner', desc: 'Alle Bosse besiegt', icon: '👑' },
  { id: 'critical', name: 'CRITICAL!', desc: 'Critical Hit gelandet', icon: '💥' },
  { id: 'memory', name: 'Erinnerungskünstler', desc: 'Memory geschafft', icon: '🧠' },
  { id: 'rhythm_100', name: 'Bühnen-Virtuose', desc: '100+ Punkte im Beat-Game', icon: '🎵' },
  { id: 'scramble_win', name: 'Wortakrobat', desc: 'Alle Wörter entziffert', icon: '🔤' },
  { id: 'typer_win', name: 'Schnelltipper', desc: 'Monolog geschafft', icon: '⌨️' },
  { id: 'deckbuilder_win', name: 'Kartenkönig', desc: 'Deckbuilder-Boss besiegt', icon: '🃏' },
  { id: 'contact', name: 'Verhandler', desc: 'Kontakt freigeschaltet', icon: '📧' },
  { id: 'world_complete', name: 'Weltenbummler', desc: 'Alle Level geschafft', icon: '🗺️' },
  { id: 'konami', name: '???', desc: 'Du kennst den Code', icon: '🕹️' },
]

/* ═══════════════════════════════════════
   SAVE / LOAD
   ═══════════════════════════════════════ */
const SAVE_KEY = 'michi-fun-v3'
function loadProgress() {
  try { const s = localStorage.getItem(SAVE_KEY); if (s) return JSON.parse(s) } catch {}
  return { xp: 0, completed: [], unlocked: ['hamburg'], skills: [], bosses: [], photos: [], achievements: [], runnerHigh: 0, memoryBest: null, michiPos: 'hamburg', contactUnlocked: false }
}
function saveProgress(p) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(p)) } catch {} }

/* ═══════════════════════════════════════
   SMALL SHARED COMPONENTS
   ═══════════════════════════════════════ */

function XPBar({ xp, onTripleClick }) {
  const level = Math.floor(xp / 100) + 1
  const pct = Math.min(((xp % 100) / 100) * 100, 100)
  const clickTimes = useRef([])
  const handleClick = () => {
    const now = Date.now()
    clickTimes.current = [...clickTimes.current.filter(t => now - t < 800), now]
    if (clickTimes.current.length >= 3) { clickTimes.current = []; onTripleClick?.() }
  }
  return (
    <div className="fun-xp-wrap" onClick={handleClick} style={{ cursor: 'pointer' }}>
      <span className="fun-xp-lvl">LVL {level}</span>
      <div className="fun-xp-bar"><motion.div className="fun-xp-fill" animate={{ width: `${pct}%` }} /></div>
      <span className="fun-xp-num">{xp} XP</span>
    </div>
  )
}

function AchievementPopup({ ach, onDone }) {
  const { canvasRef, burst, rain } = useParticleSystem()
  useEffect(() => {
    const t = setTimeout(onDone, 3500)
    // Trigger celebration particles
    setTimeout(() => {
      const canvas = canvasRef.current
      if (canvas) {
        const r = canvas.getBoundingClientRect()
        burst(r.width / 2, r.height / 2, { count: 30, colors: [[255,215,0],[255,180,0],[255,255,255]], shapes: ['star','spark'], spread: 8 })
      }
    }, 200)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <motion.div className="fun-ach-popup" initial={{ x: 300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 300, opacity: 0 }} style={{ position: 'relative', overflow: 'hidden' }}>
      <ParticleOverlay canvasRef={canvasRef} />
      <span className="fun-ach-popup-icon">{ach.icon}</span>
      <div><div className="fun-ach-popup-title">🏆 Achievement!</div><div className="fun-ach-popup-name">{ach.name}</div></div>
    </motion.div>
  )
}

function LevelHeader({ node, onBack }) {
  return (
    <div className="fun-lvl-header">
      <button className="fun-btn fun-btn-small" onClick={onBack}>← Weltkarte</button>
      <div className="fun-lvl-title-row">
        <span className="fun-lvl-emoji">{node.icon}</span>
        <div>
          <h2 className="fun-lvl-name">{node.name}</h2>
          <span className="fun-lvl-label">{node.label}</span>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════
   LEVEL COMPLETE OVERLAY
   ═══════════════════════════════════════ */
function LevelCompleteOverlay({ levelId, onContinue }) {
  const node = getNode(levelId)
  const nextNode = node?.unlocks?.[0] ? getNode(node.unlocks[0]) : null
  const { canvasRef, burst, rain } = useParticleSystem()

  useEffect(() => {
    setTimeout(() => {
      const canvas = canvasRef.current
      if (canvas) {
        const r = canvas.getBoundingClientRect()
        rain(r.width, { count: 50, colors: [[255,215,0],[255,180,0],[0,255,136]] })
      }
    }, 300)
  }, [])

  return (
    <motion.div className="fun-level-complete" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <ParticleOverlay canvasRef={canvasRef} />
      <motion.div className="fun-level-complete-inner" initial={{ scale: 0.7, y: 30 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', damping: 12 }}>
        <div className="fun-level-complete-icon">⭐</div>
        <h3 className="fun-level-complete-title">Level abgeschlossen!</h3>
        <p className="fun-level-complete-city">{node?.icon} {node?.name}</p>
        {nextNode && <p className="fun-level-complete-next">Nächstes Ziel: {nextNode.icon} {nextNode.name}</p>}
        <button className="fun-btn fun-btn-primary fun-level-complete-btn" onClick={onContinue}>
          {nextNode ? `▶ Weiter zu ${nextNode.name}` : '🗺️ Zur Weltkarte'}
        </button>
      </motion.div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════
   STORY INTRO SCREEN
   ═══════════════════════════════════════ */
function StoryIntro({ levelId, onDone }) {
  const story = LEVEL_STORIES[levelId]
  const [lineIdx, setLineIdx] = useState(0)
  const [charIdx, setCharIdx] = useState(0)
  const line = story?.lines[lineIdx] || ''
  const shown = line.slice(0, charIdx)

  useEffect(() => { setCharIdx(0) }, [lineIdx])
  useEffect(() => {
    if (charIdx < line.length) { const t = setTimeout(() => setCharIdx(c => c + 1), 22); return () => clearTimeout(t) }
  }, [charIdx, line])

  if (!story) { onDone(); return null }

  const advance = () => {
    if (charIdx < line.length) { setCharIdx(line.length) }
    else if (lineIdx < story.lines.length - 1) { setLineIdx(i => i + 1) }
    else { onDone() }
  }

  return (
    <motion.div className="fun-story-intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={advance}>
      <h3 className="fun-story-title">{story.title}</h3>
      <div className="fun-story-box">
        <div className="fun-story-text">{shown}{charIdx < line.length && <span className="fun-cursor">▌</span>}</div>
      </div>
      <div className="fun-story-hint">{charIdx >= line.length ? (lineIdx < story.lines.length - 1 ? '▶ Weiter' : '▶ Level starten!') : '▶ Skip'}</div>
      <div className="fun-story-prog">{lineIdx + 1}/{story.lines.length}</div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════
   VIDEO INTERLUDE MODAL
   ═══════════════════════════════════════ */
function VideoInterlude({ data, onClose }) {
  if (!data) return null
  return (
    <motion.div className="fun-video-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="fun-video-modal" initial={{ scale: 0.8, y: 30 }} animate={{ scale: 1, y: 0 }}>
        <div className="fun-video-header">
          <div>
            <h3 className="fun-video-title">🎬 {data.title}</h3>
            <p className="fun-video-subtitle">{data.subtitle}</p>
          </div>
          <button className="fun-btn fun-btn-small" onClick={onClose}>✕ Überspringen</button>
        </div>
        <div className="fun-video-player">
          {/* Replace with actual Google Drive embed URL */}
          <div className="fun-video-placeholder">
            <span>📽️</span>
            <p>Video: {data.subtitle}</p>
            <p className="fun-video-hint">Google Drive Video wird hier eingebettet</p>
            <p className="fun-video-hint">Video-ID: {data.videoId}</p>
          </div>
        </div>
        <button className="fun-btn fun-btn-primary" onClick={onClose}>▶ Weiter zur Karte</button>
      </motion.div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════
   WORD SCRAMBLE (Dortmund mini-game)
   ═══════════════════════════════════════ */
function LevelWordScramble({ onComplete, completed }) {
  const [round, setRound] = useState(0)
  const [input, setInput] = useState('')
  const [scrambled, setScrambled] = useState('')
  const [solved, setSolved] = useState(0)
  const [wrong, setWrong] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [done, setDone] = useState(completed)
  const total = 5
  const { canvasRef, burst } = useParticleSystem()

  const scramble = useCallback((word) => {
    const arr = word.split('')
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]]
    }
    const result = arr.join('')
    return result === word ? scramble(word) : result
  }, [])

  useEffect(() => {
    if (!done && round < total) {
      setScrambled(scramble(SCRAMBLE_WORDS[round].word))
      setInput('')
      setShowHint(false)
    }
  }, [round, done, scramble])

  const check = () => {
    if (input.toUpperCase().trim() === SCRAMBLE_WORDS[round].word) {
      const newSolved = solved + 1
      SFX.correct()
      setSolved(newSolved)
      setWrong(false)
      const canvas = canvasRef.current
      if (canvas) { const r = canvas.getBoundingClientRect(); burst(r.width / 2, r.height / 2, { count: 20, colors: [[0,255,136],[255,215,0]], shapes: ['star'], spread: 6 }) }
      if (newSolved >= total) { setDone(true); onComplete() }
      else { setRound(r => r + 1) }
    } else {
      SFX.wrong()
      setWrong(true)
      setTimeout(() => setWrong(false), 800)
    }
  }

  const handleKey = (e) => { if (e.key === 'Enter') check() }

  if (done) return <div className="fun-lvl-content"><div className="fun-done-badge">✅ Alle Wörter gelöst! +30 XP</div></div>

  return (
    <div className="fun-lvl-content" style={{ position: 'relative' }}>
      <ParticleOverlay canvasRef={canvasRef} />
      <p className="fun-lvl-desc">Entziffere die Theater-Begriffe! ({solved}/{total})</p>
      <div className="fun-scramble">
        <div className="fun-scramble-word">
          {scrambled.split('').map((c, i) => (
            <motion.span key={`${round}-${i}`} className="fun-scramble-letter"
              initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.05 }}>
              {c}
            </motion.span>
          ))}
        </div>
        {showHint && <p className="fun-scramble-hint">💡 {SCRAMBLE_WORDS[round].hint}</p>}
        {!showHint && <button className="fun-btn fun-btn-small" onClick={() => setShowHint(true)}>💡 Hinweis</button>}
        <input className="fun-scramble-input" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey} placeholder="Dein Wort..." autoFocus />
        <button className="fun-btn fun-btn-primary" onClick={check}>✓ Prüfen</button>
        {wrong && <motion.p className="fun-wrong" initial={{ x: -10 }} animate={{ x: [10, -10, 5, 0] }}>❌ Falsch!</motion.p>}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════
   LEVEL: CHARACTER SELECT + SKILL TREE (combined)
   ═══════════════════════════════════════ */
function LevelCharSelect({ onComplete, completed, godMode, skills, xp, onUnlock }) {
  const [phase, setPhase] = useState('reveal') // reveal | skills
  const [revealed, setRevealed] = useState(0)
  const allRevealed = revealed >= CHARACTER_STATS.length

  const reveal = () => {
    if (!allRevealed) {
      setRevealed(r => r + 1)
      SFX.click()
      if (revealed + 1 >= CHARACTER_STATS.length) {
        setTimeout(() => setPhase('skills'), 800)
      }
    }
  }

  useEffect(() => { if (godMode && !completed) { setRevealed(CHARACTER_STATS.length); setPhase('skills') } }, [godMode])

  // Skill tree logic
  const cats = ['Sprachen','Gesang','Sport','Spezial']
  const canUnlock = s => !skills.includes(s.id) && xp >= s.cost && s.req.every(r => skills.includes(r))

  return (
    <div className="fun-lvl-content">
      {phase === 'reveal' && (
        <div className="fun-char-card">
          <div className="fun-char-avatar">
            <img src={`${IK}${IMAGES[1]}?tr=w-300,h-400,fo-face`} alt="Michi" />
            <div className="fun-char-name">MICHI WISCHNIOWSKI</div>
            <div className="fun-char-class">Schauspieler / Bariton / Pferd</div>
          </div>
          <div className="fun-char-stats">
            {CHARACTER_STATS.map((s, i) => (
              <div key={s.label} className={`fun-stat ${i < revealed ? '' : 'locked'}`}>
                <span className="fun-stat-lbl">{i < revealed ? s.label : '???'}</span>
                <div className="fun-stat-track"><motion.div className="fun-stat-fill" animate={{ width: i < revealed ? `${s.bar}%` : '0%' }} /></div>
                <span className="fun-stat-val">{i < revealed ? s.value : '??'}</span>
              </div>
            ))}
            {!allRevealed && <button className="fun-btn" onClick={reveal}>▶ Reveal ({revealed}/{CHARACTER_STATS.length})</button>}
            {allRevealed && <motion.div className="fun-done-badge" initial={{ scale: 0.8 }} animate={{ scale: 1 }}>✅ Charakter erkannt! Skills werden geladen...</motion.div>}
          </div>
        </div>
      )}
      {phase === 'skills' && (
        <>
          {!completed && <p className="fun-lvl-desc">Charakter: Michi ✅ — Jetzt Skills freischalten! (Verfügbar: {xp} XP)</p>}
          {completed && <div className="fun-done-badge" style={{ marginBottom: '1rem' }}>✅ Level abgeschlossen!</div>}
          <p className="fun-lvl-desc">Gib XP aus um Skills freizuschalten! (Verfügbar: {xp} XP)</p>
          <div className="fun-skill-grid">
            {cats.map(cat => (
              <div key={cat} className="fun-skill-cat">
                <h3>{cat}</h3>
                {SKILL_TREE.filter(s => s.cat === cat).map(s => {
                  const unlocked = skills.includes(s.id); const avail = canUnlock(s)
                  return (
                    <motion.button key={s.id} className={`fun-skill-node ${unlocked ? 'done' : avail ? 'avail' : ''}`}
                      onClick={() => avail && onUnlock(s)} whileHover={avail ? { scale: 1.05 } : {}}>
                      <span>{unlocked ? s.icon : '🔒'}</span>
                      <span className="fun-skill-nm">{unlocked ? s.name : '???'}</span>
                      {!unlocked && <span className="fun-skill-cost">{s.cost}XP</span>}
                    </motion.button>
                  )
                })}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════
   LEVEL: PIT JUMP SIDESCROLLER
   ═══════════════════════════════════════ */
function LevelPitJump({ onComplete, highScore, godMode }) {
  const [phase, setPhase] = useState('ready') // ready | scrolling | tapping | airborne | fallen | done
  const [score, setScore] = useState(0)
  const frameRef = useRef(null)
  const stateRef = useRef(null)
  const [render, setRender] = useState({ scrollX: 0, michiY: 75, showSign: false, taps: 0, maxTaps: 0, dist: 0 })
  const { canvasRef, burst } = useParticleSystem()
  const { shakeRef, shake } = useScreenShake()

  useEffect(() => { if (godMode) onComplete(100) }, [godMode])

  const GROUND_Y = 75
  const PIT_START = 500
  const SIGN_POS = 350
  const SCROLL_SPEED = 200
  const TAP_TIMEOUT = 1.0 // seconds without tapping = fall
  const TAP_POWER = 12 // distance per tap
  const GRAVITY = 120 // fall speed

  const startRun = () => {
    stateRef.current = {
      phase: 'scrolling', scrollX: 0, michiY: GROUND_Y,
      showSign: false, lastTime: performance.now(),
      taps: 0, lastTapTime: 0, dist: 0, vy: 0,
      airborneTime: 0, falling: false
    }
    setPhase('scrolling')
    setScore(0)
    frameRef.current = requestAnimationFrame(gameLoop)
  }

  const gameLoop = useCallback((now) => {
    const s = stateRef.current
    if (!s) return
    const dt = Math.min((now - s.lastTime) / 1000, 0.05)
    s.lastTime = now

    if (s.phase === 'scrolling') {
      s.scrollX += SCROLL_SPEED * dt
      if (s.scrollX >= SIGN_POS) s.showSign = true
      if (s.scrollX >= PIT_START) {
        s.phase = 'tapping'
        s.lastTapTime = now / 1000
        s.michiY = GROUND_Y - 5 // small initial hop
        s.vy = -30
        setPhase('tapping')
        SFX.player_attack()
      }
      setRender({ scrollX: s.scrollX, michiY: s.michiY, showSign: s.showSign, taps: 0, maxTaps: 0, dist: 0 })
      frameRef.current = requestAnimationFrame(gameLoop)
    } else if (s.phase === 'tapping') {
      // Check if too long since last tap
      const sinceTap = now / 1000 - s.lastTapTime
      if (sinceTap > TAP_TIMEOUT) {
        // Start falling
        s.phase = 'falling'
        s.vy = 20
        setPhase('airborne')
      } else {
        // Float with gentle bobbing based on recent taps
        s.dist += SCROLL_SPEED * 0.4 * dt
        const bob = Math.sin(now / 150) * 3
        s.michiY = GROUND_Y - 20 - (s.taps * 0.5) + bob
        s.scrollX = PIT_START + s.dist
      }
      setRender({ scrollX: s.scrollX, michiY: s.michiY, showSign: false, taps: s.taps, maxTaps: s.taps, dist: Math.round(s.dist * 0.3) })
      frameRef.current = requestAnimationFrame(gameLoop)
    } else if (s.phase === 'falling') {
      s.vy += GRAVITY * dt
      s.michiY += s.vy * dt
      s.dist += SCROLL_SPEED * 0.2 * dt
      s.scrollX = PIT_START + s.dist

      setRender({ scrollX: s.scrollX, michiY: s.michiY, showSign: false, taps: s.taps, maxTaps: s.taps, dist: Math.round(s.dist * 0.3) })

      if (s.michiY > 110) {
        // Fell into pit
        s.phase = 'done'
        const distance = Math.round(s.dist * 0.3)
        setScore(distance)
        setPhase('done')
        shake(6, 300)
        SFX.level_complete()
        const canvas = canvasRef.current
        if (canvas) {
          const r = canvas.getBoundingClientRect()
          burst(r.width * 0.5, r.height * 0.65, { count: 25, colors: [[255,215,0],[255,180,0]], shapes: ['star'], spread: 8 })
        }
        onComplete(distance)
        return
      }
      frameRef.current = requestAnimationFrame(gameLoop)
    }
  }, [onComplete, shake, burst, canvasRef])

  const handleTap = useCallback(() => {
    const s = stateRef.current
    if (!s) return
    if (s.phase === 'tapping') {
      s.taps++
      s.lastTapTime = performance.now() / 1000
      s.dist += TAP_POWER
      s.michiY = Math.max(20, s.michiY - 3) // small upward boost per tap
      SFX.click()
    }
  }, [])

  useEffect(() => {
    const down = (e) => { if (e.code === 'Space') { e.preventDefault(); handleTap() } }
    window.addEventListener('keydown', down)
    return () => { window.removeEventListener('keydown', down); cancelAnimationFrame(frameRef.current) }
  }, [handleTap])

  if (phase === 'ready') {
    return (
      <div className="fun-lvl-content">
        <div className="fun-center">
          <p className="fun-lvl-desc">Springe so weit wie möglich über die Grube!</p>
          <p className="fun-lvl-desc">Klicke LEERTASTE / tippe so schnell wie möglich!</p>
          <p className="fun-lvl-desc">Hör auf zu klicken = Michi fällt nach 1 Sekunde!</p>
          {highScore > 0 && <p className="fun-gold-text">🏆 Rekord: {highScore}m</p>}
          <button className="fun-btn fun-btn-primary" onClick={startRun}>🏃 Los!</button>
        </div>
      </div>
    )
  }

  const { scrollX, michiY, showSign, taps, dist } = render

  return (
    <div className="fun-lvl-content" style={{ position: 'relative', overflow: 'hidden' }}>
      <div ref={shakeRef} className="fun-pitjump-stage"
        onClick={handleTap}
        onTouchStart={(e) => { e.preventDefault(); handleTap() }}>
        <ParticleOverlay canvasRef={canvasRef} />

        {/* Sky decorations */}
        <div className="fun-pitjump-stars">
          {[...Array(15)].map((_, i) => (
            <div key={i} className="fun-pitjump-star" style={{ left: `${(i * 7 + 3) % 100}%`, top: `${(i * 13 + 5) % 50}%`, animationDelay: `${i * 0.3}s`, opacity: 0.3 + Math.random() * 0.5 }} />
          ))}
        </div>
        <div className="fun-pitjump-moon" />

        {/* Scrolling ground */}
        <div className="fun-pitjump-world" style={{ transform: `translateX(${-scrollX}px)` }}>
          {[0, 80, 160, 250, 380].map((x, i) => (
            <div key={i} className="fun-pitjump-tree" style={{ left: `${x + 50}px` }} />
          ))}
          <div className="fun-pitjump-ground" style={{ left: 0, width: `${PIT_START + 120}px` }} />
          {showSign && (
            <div className="fun-pitjump-sign" style={{ left: `${SIGN_POS + 100}px` }}>
              <span>⚠️ GLEICH KLICKEN!</span>
            </div>
          )}
          <div className="fun-pitjump-pit" style={{ left: `${PIT_START + 120}px`, width: '5000px' }}>
            <div className="fun-pitjump-pit-lava" />
          </div>
          <div className="fun-pitjump-ground fun-pitjump-far" style={{ left: `${PIT_START + 5120}px`, width: '500px' }} />
        </div>

        {/* Michi sprite - fixed at center screen */}
        <div className={`fun-pitjump-michi ${phase === 'scrolling' ? 'running' : 'jumping'}`}
          style={{ left: '120px', top: `${michiY}%` }}>
          <div className="fun-michi-char">
            <div className="fun-michi-head" />
            <div className="fun-michi-body" />
            <div className="fun-michi-legs">
              <div className="fun-michi-leg left" />
              <div className="fun-michi-leg right" />
            </div>
          </div>
        </div>

        {/* Tap indicator */}
        {(phase === 'tapping' || phase === 'airborne') && (
          <div className="fun-pitjump-power">
            <div className="fun-pitjump-power-label">
              {phase === 'tapping' ? '👆 SCHNELL KLICKEN!' : '💨 Fällt...'}
            </div>
            <div className="fun-pitjump-dist">{dist}m | Taps: {taps}</div>
          </div>
        )}

        {phase === 'scrolling' && <div className="fun-pitjump-hud">🏃 Laufe...</div>}
      </div>

      {phase === 'done' && (
        <motion.div className="fun-done-badge" initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
          <p>🕳️ {score}m weit gesprungen!</p>
          <p style={{ fontSize: '0.6rem', color: '#aaa' }}>Taps: {render.taps} — {score > 100 ? 'Wahnsinn!' : score > 50 ? 'Guter Sprung!' : 'Übung macht den Meister!'}</p>
          <button className="fun-btn fun-btn-small" onClick={startRun}>🔄 Nochmal</button>
        </motion.div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════
   LEVEL: SKILL TREE (standalone - kept for reference)
   ═══════════════════════════════════════ */
function LevelSkillTree({ skills, xp, onUnlock, completed, godMode }) {
  useEffect(() => { if (godMode && !completed) SKILL_TREE.forEach(s => { if (!skills.includes(s.id)) onUnlock(s) }) }, [godMode])
  const cats = ['Sprachen','Gesang','Sport','Spezial']
  const canUnlock = s => !skills.includes(s.id) && xp >= s.cost && s.req.every(r => skills.includes(r))
  return (
    <div className="fun-lvl-content">
      {completed && <div className="fun-done-badge">✅ Level abgeschlossen!</div>}
      <p className="fun-lvl-desc">Gib XP aus um Skills freizuschalten! (Verfügbar: {xp} XP)</p>
      <div className="fun-skill-grid">
        {cats.map(cat => (
          <div key={cat} className="fun-skill-cat">
            <h3>{cat}</h3>
            {SKILL_TREE.filter(s => s.cat === cat).map(s => {
              const unlocked = skills.includes(s.id); const avail = canUnlock(s)
              return (
                <motion.button key={s.id} className={`fun-skill-node ${unlocked ? 'done' : avail ? 'avail' : ''}`}
                  onClick={() => avail && onUnlock(s)} whileHover={avail ? { scale: 1.05 } : {}}>
                  <span>{unlocked ? s.icon : '🔒'}</span>
                  <span className="fun-skill-nm">{unlocked ? s.name : '???'}</span>
                  {!unlocked && <span className="fun-skill-cost">{s.cost}XP</span>}
                </motion.button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════
   LEVEL: DIALOG
   ═══════════════════════════════════════ */
function LevelDialog({ onComplete, completed }) {
  const [idx, setIdx] = useState(0)
  const [charIdx, setCharIdx] = useState(0)
  const [done, setDone] = useState(completed)
  const line = DIALOG_LINES[idx]
  const text = line?.text || ''
  const shown = text.slice(0, charIdx)

  useEffect(() => { setCharIdx(0) }, [idx])
  useEffect(() => {
    if (done) return
    if (charIdx < text.length) { const t = setTimeout(() => setCharIdx(c => c + 1), 28); return () => clearTimeout(t) }
  }, [charIdx, text, done])

  const advance = () => {
    if (done) return
    if (charIdx < text.length) { setCharIdx(text.length) }
    else if (idx < DIALOG_LINES.length - 1) { setIdx(i => i + 1) }
    else { setDone(true); onComplete() }
  }

  const color = line?.speaker === 'Michi' ? 'var(--fun-accent)' : line?.speaker === 'System' ? 'var(--fun-gold)' : 'var(--fun-pink)'
  return (
    <div className="fun-lvl-content fun-dialog-lvl">
      {done ? (
        <div className="fun-done-badge">✅ Story abgeschlossen! +30 XP</div>
      ) : (
        <div className="fun-dialog-box" onClick={advance}>
          <div className="fun-dialog-speaker" style={{ color }}>{line?.speaker}</div>
          <div className="fun-dialog-text">{shown}{charIdx < text.length && <span className="fun-cursor">▌</span>}</div>
          <div className="fun-dialog-hint">{charIdx >= text.length ? '▶ Weiter' : '▶ Skip'}</div>
          <div className="fun-dialog-prog">{idx + 1}/{DIALOG_LINES.length}</div>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════
   LEVEL: DORTMUND (Dialog + Word Scramble)
   ═══════════════════════════════════════ */
function LevelDortmund({ onDialogDone, completed, godMode }) {
  const [phase, setPhase] = useState(completed ? 'done' : 'dialog')
  useEffect(() => { if (godMode && !completed) { setPhase('done'); onDialogDone() } }, [godMode])
  return (
    <div>
      {phase === 'dialog' && <LevelDialog onComplete={() => setPhase('scramble')} completed={false} />}
      {phase === 'scramble' && <LevelWordScramble onComplete={onDialogDone} completed={false} />}
      {phase === 'done' && (
        <div className="fun-lvl-content">
          <div className="fun-done-badge">✅ Level abgeschlossen!</div>
          <div style={{ marginTop: '1rem' }}>
            <button className="fun-btn fun-btn-small" onClick={() => setPhase('dialog')}>🔄 Story nochmal</button>
            <button className="fun-btn fun-btn-small" style={{ marginLeft: '0.5rem' }} onClick={() => setPhase('scramble')}>🔄 Wörter nochmal</button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════
   LEVEL: MEMORY
   ═══════════════════════════════════════ */
function LevelMemory({ onComplete, best, godMode }) {
  const [cards, setCards] = useState([])
  const [flipped, setFlipped] = useState([])
  const [matched, setMatched] = useState([])
  const [moves, setMoves] = useState(0)
  const [started, setStarted] = useState(false)
  const [won, setWon] = useState(false)
  const lock = useRef(false)
  const { canvasRef, burst } = useParticleSystem()
  useEffect(() => { if (godMode) { setWon(true); onComplete(1) } }, [godMode])

  const start = () => {
    const deck = [...MEMORY_PAIRS, ...MEMORY_PAIRS].map((c, i) => ({ ...c, uid: i })).sort(() => Math.random() - 0.5)
    setCards(deck); setFlipped([]); setMatched([]); setMoves(0); setStarted(true); setWon(false)
  }

  const flip = (uid) => {
    if (lock.current || flipped.includes(uid)) return
    const card = cards.find(c => c.uid === uid)
    if (matched.includes(card.id)) return
    const nf = [...flipped, uid]
    setFlipped(nf)
    if (nf.length === 2) {
      lock.current = true; setMoves(m => m + 1)
      const [a, b] = nf.map(u => cards.find(c => c.uid === u))
      if (a.id === b.id) {
        SFX.match()
        const nm = [...matched, a.id]; setMatched(nm); setFlipped([]); lock.current = false
        // Particle burst on match
        const canvas = canvasRef.current
        if (canvas) { const r = canvas.getBoundingClientRect(); burst(r.width / 2, r.height / 2, { count: 15, colors: [[0,255,136],[255,215,0]], shapes: ['star'], spread: 5 }) }
        if (nm.length === MEMORY_PAIRS.length) { setWon(true); onComplete(moves + 1) }
      } else { SFX.wrong(); setTimeout(() => { setFlipped([]); lock.current = false }, 700) }
    }
  }

  return (
    <div className="fun-lvl-content" style={{ position: 'relative' }}>
      <ParticleOverlay canvasRef={canvasRef} />
      {!started ? (
        <div className="fun-center">
          {best && <p className="fun-gold-text">🏆 Best: {best} Züge</p>}
          <button className="fun-btn fun-btn-primary" onClick={start}>🧠 Start!</button>
        </div>
      ) : (
        <>
          <div className="fun-mem-stats"><span>Züge: {moves}</span><span>Paare: {matched.length}/{MEMORY_PAIRS.length}</span></div>
          <div className="fun-mem-grid">
            {cards.map(c => {
              const show = flipped.includes(c.uid) || matched.includes(c.id)
              return (
                <motion.div key={c.uid} className={`fun-mem-card ${show ? 'show' : ''} ${matched.includes(c.id) ? 'done' : ''}`}
                  onClick={() => !show && flip(c.uid)} whileHover={!show ? { scale: 1.05 } : {}}>
                  <div className="fun-mem-inner">
                    <div className="fun-mem-front">?</div>
                    <div className="fun-mem-back"><span className="fun-mem-emoji">{c.emoji}</span><span className="fun-mem-lbl">{c.label}</span></div>
                  </div>
                </motion.div>
              )
            })}
          </div>
          {won && (
            <motion.div className="fun-done-badge" initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
              🎉 {moves} Züge! <button className="fun-btn fun-btn-small" onClick={start}>Nochmal</button>
            </motion.div>
          )}
        </>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════
   LEVEL: BOSS BATTLE (RPG Turn-Based)
   ═══════════════════════════════════════ */
function LevelBossBattle({ defeated, onDefeat, completed, godMode }) {
  const [activeBoss, setActiveBoss] = useState(null)
  useEffect(() => { if (godMode && !completed) onDefeat(BOSSES[0].id, true) }, [godMode])
  return (
    <div className="fun-lvl-content">
      {!activeBoss ? (
        <div className="fun-boss-select">
          {completed && <div className="fun-done-badge" style={{ marginBottom: '1rem' }}>✅ Saarbrücken abgeschlossen! Du kannst optional weitere Bosse bekämpfen.</div>}
          <p className="fun-lvl-desc">Wähle deinen Gegner! {!completed && '(Besiege mindestens einen Boss um weiterzukommen)'}</p>
          <div className="fun-boss-list">
            {BOSSES.map(b => (
              <motion.button key={b.id} className={`fun-boss-btn ${defeated.includes(b.id) ? 'beaten' : ''}`}
                onClick={() => setActiveBoss(b)} whileHover={{ scale: 1.05 }}>
                <span className="fun-boss-sp">{b.sprite}</span>
                <div className="fun-boss-info">
                  <span>{b.name}</span>
                  <span className="fun-boss-hp">HP: {b.hp}</span>
                </div>
                {defeated.includes(b.id) && <span className="fun-boss-check">✅</span>}
              </motion.button>
            ))}
          </div>
          {defeated.length >= BOSSES.length && <div className="fun-done-badge">👑 Alle Bosse besiegt!</div>}
        </div>
      ) : (
        <RPGBattle boss={activeBoss} beaten={defeated.includes(activeBoss.id)} onWin={(crit) => { onDefeat(activeBoss.id, crit); setActiveBoss(null) }} onBack={() => setActiveBoss(null)} />
      )}
    </div>
  )
}

function RPGBattle({ boss, beaten, onWin, onBack }) {
  const [phase, setPhase] = useState(beaten ? 'won' : 'choose') // choose | playerAtk | bossAtk | won | lost
  const [pHp, setPHp] = useState(100)
  const [bHp, setBHp] = useState(boss.hp)
  const [log, setLog] = useState([`Ein wilder ${boss.name} erscheint!`])
  const [weakened, setWeakened] = useState(false)
  const [poisoned, setPoisoned] = useState(false)
  const [floats, setFloats] = useState([])
  const { canvasRef, burst } = useParticleSystem()
  const { shakeRef, shake } = useScreenShake()
  const pHpRef = useRef(100)
  const bHpRef = useRef(boss.hp)

  const addLog = (msg) => setLog(l => [...l.slice(-4), msg])

  const rollDmg = (range) => range[0] + Math.floor(Math.random() * (range[1] - range[0] + 1))

  const doBossAttack = useCallback(() => {
    setPhase('bossAtk')
    const atk = boss.attacks[Math.floor(Math.random() * boss.attacks.length)]

    setTimeout(() => {
      if (atk.effect === 'heal') {
        SFX.boss_heal()
        const heal = 15 + Math.floor(Math.random() * 20)
        const newHp = Math.min(boss.hp, bHpRef.current + heal)
        bHpRef.current = newHp
        setBHp(newHp)
        addLog(`${boss.sprite} ${atk.name} — ${boss.name} heilt sich um ${heal} HP!`)
        setFloats(f => [...f, { id: Date.now(), text: `+${heal}`, color: '#44ff44' }])
      } else {
        SFX.boss_attack()
        let dmg = rollDmg(atk.dmg)
        if (weakened) dmg = Math.floor(dmg * 0.7)
        const newHp = Math.max(0, pHpRef.current - dmg)
        pHpRef.current = newHp
        setPHp(newHp)
        addLog(`${boss.sprite} ${atk.name} — ${dmg} Schaden! ${atk.desc}`)
        setFloats(f => [...f, { id: Date.now(), text: `-${dmg}`, color: '#ff4444' }])
        shake(dmg > 25 ? 8 : 4, 300)
        if (atk.effect === 'poison') { setPoisoned(true); addLog('💀 Du bist vergiftet!') }
        if (atk.effect === 'confuse') addLog('😵 Du bist verwirrt!')
        if (atk.effect === 'fear') addLog('😰 Angst-Effekt!')

        if (newHp <= 0) {
          SFX.defeat()
          setPhase('lost')
          return
        }
      }

      // Poison tick on player
      if (poisoned && pHpRef.current > 0) {
        const poisonDmg = 5
        const afterPoison = Math.max(0, pHpRef.current - poisonDmg)
        pHpRef.current = afterPoison
        setPHp(afterPoison)
        addLog(`🤢 Gift: -${poisonDmg} HP`)
        if (afterPoison <= 0) { SFX.defeat(); setPhase('lost'); return }
      }

      setTimeout(() => setPhase('choose'), 800)
    }, 1000)
  }, [boss, weakened, poisoned, shake])

  const playerAttack = (move) => {
    setPhase('playerAtk')

    setTimeout(() => {
      // Accuracy check
      if (Math.random() * 100 > move.accuracy) {
        SFX.player_miss()
        addLog(`🎭 ${move.name} — Daneben!`)
        setFloats(f => [...f, { id: Date.now(), text: 'MISS!', color: '#7777aa' }])
        setTimeout(() => doBossAttack(), 800)
        return
      }

      if (move.heal) {
        SFX.player_heal()
        const heal = rollDmg(move.heal)
        const newHp = Math.min(100, pHpRef.current + heal)
        pHpRef.current = newHp
        setPHp(newHp)
        addLog(`💫 ${move.name} — +${heal} HP geheilt!`)
        setFloats(f => [...f, { id: Date.now(), text: `+${heal}`, color: '#00ff88' }])
        setPoisoned(false)
        const canvas = canvasRef.current
        if (canvas) {
          const r = canvas.getBoundingClientRect()
          burst(r.width / 2, r.height * 0.7, { count: 15, colors: [[0,255,136],[100,255,200]], shapes: ['star'], spread: 5 })
        }
        setTimeout(() => doBossAttack(), 800)
        return
      }

      // Damage
      let dmg = rollDmg(move.dmg)
      const isCrit = Math.random() < 0.15
      if (isCrit) { dmg = Math.floor(dmg * 1.8); SFX.player_crit() } else { SFX.player_attack() }
      const newBHp = Math.max(0, bHpRef.current - dmg)
      bHpRef.current = newBHp
      setBHp(newBHp)

      if (move.effect === 'weaken') { setWeakened(true); addLog('⬇️ Gegner geschwächt!') }

      addLog(`🎭 ${move.name} — ${isCrit ? '💥 KRITISCH! ' : ''}${dmg} Schaden!`)
      setFloats(f => [...f, { id: Date.now(), text: `${isCrit ? '💥 ' : ''}-${dmg}`, color: isCrit ? '#ff4444' : '#ffd700' }])

      const canvas = canvasRef.current
      if (canvas) {
        const r = canvas.getBoundingClientRect()
        burst(r.width / 2, r.height * 0.25, {
          count: isCrit ? 40 : 15,
          colors: isCrit ? [[255,68,68],[255,180,0]] : [[255,215,0],[255,255,255]],
          shapes: ['star', 'spark'], spread: isCrit ? 10 : 5
        })
      }
      if (isCrit) shake(10, 400); else shake(4, 200)

      if (newBHp <= 0) {
        setTimeout(() => {
          SFX.victory()
          setPhase('won')
          onWin(isCrit)
          if (canvas) {
            const r = canvas.getBoundingClientRect()
            burst(r.width / 2, r.height / 2, { count: 60, colors: [[255,215,0],[255,180,0],[255,255,255]], shapes: ['star'], spread: 12, gravity: 0.04, decay: 0.008 })
          }
        }, 600)
        return
      }

      setTimeout(() => doBossAttack(), 800)
    }, 600)
  }

  const retry = () => {
    pHpRef.current = 100; bHpRef.current = boss.hp
    setPHp(100); setBHp(boss.hp); setPhase('choose')
    setWeakened(false); setPoisoned(false)
    setLog([`Ein wilder ${boss.name} erscheint!`]); setFloats([])
  }

  return (
    <div className="fun-fight" ref={shakeRef} style={{ position: 'relative' }}>
      <ParticleOverlay canvasRef={canvasRef} />
      <button className="fun-btn fun-btn-small fun-fight-back" onClick={onBack}>← Bosse</button>

      {/* Boss display */}
      <div className="fun-rpg-arena">
        <div className="fun-rpg-boss-side">
          <motion.div className="fun-rpg-sprite"
            animate={phase === 'playerAtk' ? { x: [0, 10, -10, 0], scale: [1, 0.95, 1] } : phase === 'bossAtk' ? { x: [0, -15, 0], scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.4 }}>
            <span className="fun-rpg-boss-emoji">{boss.sprite}</span>
          </motion.div>
          <div className="fun-rpg-hp-wrap">
            <span className="fun-rpg-name">{boss.name}</span>
            <div className="fun-hptrack boss"><motion.div className="fun-hpfill boss" animate={{ width: `${(bHp / boss.hp) * 100}%` }} /></div>
            <span className="fun-rpg-hp-text">{bHp}/{boss.hp}</span>
          </div>
        </div>

        <div className="fun-rpg-player-side">
          <motion.div className="fun-rpg-sprite"
            animate={phase === 'bossAtk' ? { x: [0, -8, 8, 0] } : phase === 'playerAtk' ? { x: [0, 10, 0] } : {}}>
            <div className="fun-michi-char" style={{ transform: 'scale(1.8)' }}>
              <div className="fun-michi-head" />
              <div className="fun-michi-body" />
              <div className="fun-michi-legs">
                <div className="fun-michi-leg left" />
                <div className="fun-michi-leg right" />
              </div>
            </div>
          </motion.div>
          <div className="fun-rpg-hp-wrap">
            <span className="fun-rpg-name">Michi</span>
            <div className="fun-hptrack you"><motion.div className="fun-hpfill you" animate={{ width: `${pHp}%` }} /></div>
            <span className="fun-rpg-hp-text">{pHp}/100</span>
          </div>
        </div>
      </div>

      {/* Status effects */}
      <div className="fun-rpg-status">
        {poisoned && <span className="fun-rpg-effect">🤢 Gift</span>}
        {weakened && <span className="fun-rpg-effect">⬇️ Geschwächt</span>}
      </div>

      {/* Battle log */}
      <div className="fun-rpg-log">
        {log.map((msg, i) => <div key={i} className="fun-rpg-log-line">{msg}</div>)}
      </div>

      {/* Floating damage text */}
      {floats.map(f => <FloatingText key={f.id} text={f.text} color={f.color} onDone={() => setFloats(fl => fl.filter(x => x.id !== f.id))} />)}

      {/* Move selection */}
      {phase === 'choose' && (
        <div className="fun-rpg-moves">
          {PLAYER_MOVES.map(m => (
            <motion.button key={m.id} className="fun-rpg-move" onClick={() => playerAttack(m)}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <span className="fun-rpg-move-name">{m.name}</span>
              <span className="fun-rpg-move-desc">{m.desc}</span>
            </motion.button>
          ))}
        </div>
      )}

      {phase === 'playerAtk' && <div className="fun-rpg-wait">⚔️ Michi greift an...</div>}
      {phase === 'bossAtk' && <div className="fun-rpg-wait">{boss.sprite} {boss.name} greift an...</div>}

      {phase === 'won' && (
        <motion.div className="fun-victory" initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
          <p>🎉 VICTORY!</p>
          <p className="fun-reward">{boss.reward}</p>
          <div className="fun-loot">{boss.loot}</div>
        </motion.div>
      )}
      {phase === 'lost' && (
        <div className="fun-center">
          <p>💀 Game Over!</p>
          <button className="fun-btn" onClick={retry}>🔄 Nochmal</button>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════
   LEVEL: RHYTHM TAPPER (Guitar Hero style)
   ═══════════════════════════════════════ */
const RHYTHM_KEYS = [
  { key: 'ArrowLeft', label: '←', col: 0, color: '#ff4444' },
  { key: 'ArrowDown', label: '↓', col: 1, color: '#00ff88' },
  { key: 'ArrowUp', label: '↑', col: 2, color: '#44aaff' },
  { key: 'ArrowRight', label: '→', col: 3, color: '#ffd700' },
]

function LevelRhythm({ onComplete, highScore, godMode }) {
  const [playing, setPlaying] = useState(false)
  useEffect(() => { if (godMode) onComplete(200) }, [godMode])
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  const [notes, setNotes] = useState([])
  const [flashes, setFlashes] = useState({})
  const [hits, setHits] = useState(0)
  const [misses, setMisses] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const frameRef = useRef(null)
  const notesRef = useRef([])
  const scoreRef = useRef(0)
  const comboRef = useRef(0)
  const maxComboRef = useRef(0)
  const hitsRef = useRef(0)
  const missesRef = useRef(0)
  const lastSpawn = useRef(0)
  const totalNotes = useRef(0)
  const gameOverRef = useRef(false)
  const speedRef = useRef(2.0)
  const beatIndexRef = useRef(0)
  const gameStartRef = useRef(0)
  const { canvasRef, burst } = useParticleSystem()
  const { shakeRef, shake } = useScreenShake()

  const TARGET_Y = 85 // percentage where the hit zone is

  const startGame = () => {
    setPlaying(true); setGameOver(false); setScore(0); setCombo(0); setMaxCombo(0)
    setNotes([]); setHits(0); setMisses(0); setFlashes({}); setFeedback(null)
    scoreRef.current = 0; comboRef.current = 0; maxComboRef.current = 0
    hitsRef.current = 0; missesRef.current = 0; notesRef.current = []
    lastSpawn.current = 0; totalNotes.current = 0; gameOverRef.current = false
    speedRef.current = 2.0; beatIndexRef.current = 0; gameStartRef.current = performance.now()
    frameRef.current = requestAnimationFrame(gameLoop)
  }

  const gameLoop = (time) => {
    if (gameOverRef.current) return

    // BPM = 120, 8th note = 250ms. Spawn notes from beat pattern synced to music.
    const elapsed = time - gameStartRef.current
    const eighthMs = 250 // 120 BPM, 8th note
    const currentBeat = elapsed / eighthMs

    // Spawn notes ahead of time so they arrive at hit zone on beat
    // Notes need ~TARGET_Y / speedRef.current frames to reach target
    // At 60fps that's about (TARGET_Y / speed) * 16.67ms
    const travelTime = (TARGET_Y / speedRef.current) * 16.67
    const spawnBeat = currentBeat + travelTime / eighthMs

    while (beatIndexRef.current < RHYTHM_BEAT_PATTERN.length) {
      const beat = RHYTHM_BEAT_PATTERN[beatIndexRef.current]
      if (beat.time <= spawnBeat) {
        notesRef.current.push({ id: time + beatIndexRef.current * 0.01, col: beat.col, y: -5 })
        totalNotes.current++
        beatIndexRef.current++
      } else break
    }

    // Move notes down
    speedRef.current = 1.8 + Math.floor(totalNotes.current / 20) * 0.2
    notesRef.current = notesRef.current.map(n => ({ ...n, y: n.y + speedRef.current })).filter(n => {
      // Missed note (past hit zone)
      if (n.y > TARGET_Y + 12) {
        SFX.miss()
        missesRef.current++
        comboRef.current = 0
        setCombo(0)
        setMisses(missesRef.current)
        if (missesRef.current >= 15) {
          gameOverRef.current = true
          setGameOver(true)
          setPlaying(false)
        }
        return false
      }
      return true
    })

    // End after enough notes
    if (beatIndexRef.current >= RHYTHM_BEAT_PATTERN.length && notesRef.current.length === 0 && !gameOverRef.current) {
      gameOverRef.current = true
      setGameOver(true)
      setPlaying(false)
    }

    setNotes([...notesRef.current])
    setScore(Math.floor(scoreRef.current))

    if (!gameOverRef.current) frameRef.current = requestAnimationFrame(gameLoop)
  }

  const hitNote = useCallback((col) => {
    const hitZone = notesRef.current.filter(n => n.col === col && n.y >= TARGET_Y - 12 && n.y <= TARGET_Y + 8)
    if (hitZone.length > 0) {
      const note = hitZone[0]
      const dist = Math.abs(note.y - TARGET_Y)
      let points, label

      if (dist < 4) { points = 30; label = 'PERFECT!'; SFX.hit_perfect() }
      else if (dist < 8) { points = 15; label = 'GREAT!'; SFX.hit_great() }
      else { points = 5; label = 'OK'; SFX.hit_ok() }

      comboRef.current++
      if (comboRef.current > maxComboRef.current) maxComboRef.current = comboRef.current
      const comboBonus = Math.floor(comboRef.current / 5) * 5
      scoreRef.current += points + comboBonus
      hitsRef.current++

      setCombo(comboRef.current)
      setMaxCombo(maxComboRef.current)
      setHits(hitsRef.current)
      setFeedback({ label, col, id: Date.now() })
      setFlashes(f => ({ ...f, [col]: Date.now() }))
      setTimeout(() => setFeedback(null), 400)

      // Particles
      const canvas = canvasRef.current
      if (canvas) {
        const r = canvas.getBoundingClientRect()
        const x = r.width * (0.2 + col * 0.2)
        const y = r.height * TARGET_Y / 100
        const colors = [[...RHYTHM_KEYS[col].color.match(/\w{2}/g).map(h => parseInt(h, 16))]]
        burst(x, y, { count: dist < 4 ? 20 : 10, colors, shapes: ['star', 'spark'], spread: 4 })
      }

      notesRef.current = notesRef.current.filter(n => n.id !== note.id)
    } else {
      // Hit empty - penalty
      SFX.miss()
      missesRef.current++
      comboRef.current = 0
      setCombo(0)
      setMisses(missesRef.current)
      shake(3, 100)
    }
  }, [burst, shake])

  useEffect(() => {
    if (!playing) { cancelAnimationFrame(frameRef.current); return }
    const handleKey = (e) => {
      const k = RHYTHM_KEYS.find(r => r.key === e.key)
      if (k) { e.preventDefault(); hitNote(k.col) }
    }
    window.addEventListener('keydown', handleKey)
    return () => { window.removeEventListener('keydown', handleKey); cancelAnimationFrame(frameRef.current) }
  }, [playing, hitNote])

  useEffect(() => {
    if (gameOver && scoreRef.current > 0) onComplete(Math.floor(scoreRef.current))
  }, [gameOver])

  return (
    <div className="fun-lvl-content">
      {!playing && !gameOver && (
        <div className="fun-center">
          <p className="fun-lvl-desc">Bühnen-Beat! Triff die Pfeile im Takt!</p>
          <p className="fun-lvl-desc">← ↓ ↑ → oder tippe auf die Spalten</p>
          <p className="fun-lvl-desc">PERFECT = 30 Punkte | GREAT = 15 | OK = 5</p>
          {highScore > 0 && <p className="fun-gold-text">🏆 Highscore: {highScore}</p>}
          <button className="fun-btn fun-btn-primary" onClick={startGame}>🎵 Los!</button>
        </div>
      )}
      {(playing || gameOver) && (
        <div ref={shakeRef} className="fun-rhythm" style={{ position: 'relative' }}>
          <ParticleOverlay canvasRef={canvasRef} />
          <div className="fun-rhythm-hud">
            <span>Score: {score}</span>
            {combo > 2 && <span className="fun-rhythm-combo">🔥{combo}x</span>}
            <span>Miss: {misses}/15</span>
          </div>
          <div className="fun-rhythm-stage">
            {/* 4 columns */}
            {RHYTHM_KEYS.map((k, ci) => (
              <div key={ci} className="fun-rhythm-col" onClick={() => playing && hitNote(ci)}>
                {/* Target zone */}
                <div className="fun-rhythm-target" style={{ top: `${TARGET_Y}%`, borderColor: k.color, boxShadow: flashes[ci] && Date.now() - flashes[ci] < 200 ? `0 0 20px ${k.color}` : 'none' }}>
                  <span style={{ color: k.color }}>{k.label}</span>
                </div>
                {/* Falling notes */}
                {notes.filter(n => n.col === ci).map(n => (
                  <motion.div key={n.id} className="fun-rhythm-note" style={{ top: `${n.y}%`, background: k.color }} />
                ))}
              </div>
            ))}
            {/* Feedback */}
            {feedback && (
              <motion.div className="fun-rhythm-feedback" initial={{ opacity: 1, y: 0 }} animate={{ opacity: 0, y: -30 }}
                style={{ left: `${20 + feedback.col * 20}%`, top: `${TARGET_Y - 10}%`, color: feedback.label === 'PERFECT!' ? '#ffd700' : feedback.label === 'GREAT!' ? '#00ff88' : '#aaa' }}>
                {feedback.label}
              </motion.div>
            )}
          </div>
          {/* Mobile touch buttons */}
          <div className="fun-rhythm-touch-btns">
            {RHYTHM_KEYS.map((k, ci) => (
              <button key={ci} className="fun-rhythm-touch-btn" style={{ background: k.color }}
                onTouchStart={(e) => { e.preventDefault(); playing && hitNote(ci) }}
                onClick={() => playing && hitNote(ci)}>
                {k.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {gameOver && (
        <motion.div className="fun-done-badge" initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
          <p>🎵 {misses >= 15 ? 'Bühne vorbei!' : 'Song geschafft!'}</p>
          <p>Score: {score} | Hits: {hits} | Max Combo: {maxCombo}x</p>
          <button className="fun-btn fun-btn-small" onClick={startGame}>Nochmal</button>
        </motion.div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════
   LEVEL: DECKBUILDER CARD GAME (Slay the Spire style)
   ═══════════════════════════════════════ */
const DECK_CARDS = [
  { id: 0, name: 'Monolog-Kraft', img: IMAGES[0], type: 'attack', dmg: 12, cost: 1, trivia: 'Michi studierte Schauspiel in Bochum.', desc: '12 Schaden' },
  { id: 1, name: 'Bühnen-Präsenz', img: IMAGES[1], type: 'attack', dmg: 8, cost: 1, trivia: 'Michi stand schon in über 30 Produktionen.', desc: '8 Schaden, +4 Block' , block: 4 },
  { id: 2, name: 'Improvisation', img: IMAGES[2], type: 'attack', dmg: 18, cost: 2, trivia: 'Michi kann auch Bariton singen.', desc: '18 Schaden' },
  { id: 3, name: 'Lampenfieber', img: IMAGES[3], type: 'skill', cost: 1, block: 10, trivia: 'Typischer Trait: Lampenfieber = Fokus.', desc: '+10 Block' },
  { id: 4, name: 'Pferde-Sprint', img: IMAGES[4], type: 'attack', dmg: 6, cost: 0, trivia: 'Michi spielte tatsächlich ein Pferd auf der Bühne!', desc: '6 Schaden (kostenlos)' },
  { id: 5, name: 'Totenkopf-Monolog', img: IMAGES[5], type: 'attack', dmg: 25, cost: 3, trivia: 'Hamlet war eine seiner Paraderolle.', desc: '25 Schaden' },
  { id: 6, name: 'Kritiker-Schild', img: IMAGES[6], type: 'skill', cost: 1, block: 8, draw: 1, trivia: 'Michi bekam stets gute Kritiken.', desc: '+8 Block, +1 Karte ziehen' },
  { id: 7, name: 'Ensemblegeist', img: IMAGES[7], type: 'skill', cost: 1, heal: 8, trivia: 'Teamwork ist alles auf der Bühne.', desc: '+8 HP heilen' },
  { id: 8, name: 'Spotlight', img: IMAGES[8], type: 'attack', dmg: 10, cost: 1, vulnerable: 2, trivia: 'Im Rampenlicht fühlt Michi sich am wohlsten.', desc: '10 Schaden, 2 Verwundbar' },
  { id: 9, name: 'Vorhang zu!', img: IMAGES[9], type: 'attack', dmg: 15, cost: 2, trivia: 'Das Finale ist immer das Stärkste.', desc: '15 Schaden' },
  { id: 10, name: 'Souffleur-Hilfe', img: IMAGES[10], type: 'skill', cost: 0, draw: 2, trivia: 'Den Text vergessen? Der Souffleur hilft!', desc: '+2 Karten ziehen' },
  { id: 11, name: 'Applaus', img: IMAGES[11], type: 'skill', cost: 2, block: 15, heal: 5, trivia: 'Applaus gibt Energie und Schutz.', desc: '+15 Block, +5 HP' },
  { id: 12, name: 'Doppelrolle', img: IMAGES[12], type: 'attack', dmg: 10, cost: 1, trivia: 'Michi spielte auch mal zwei Rollen gleichzeitig.', desc: '10 Schaden ×2', hits: 2 },
]

const DECK_BOSSES = [
  {
    id: 'intendant',
    name: 'Der Intendant',
    sprite: '🎩',
    hp: 110,
    attacks: [
      { name: 'Budget-Kürzung', dmg: 12, desc: 'Streicht dein Budget!' },
      { name: 'Vernichtende Kritik', dmg: 18, desc: 'Deine Leistung wird zerrissen!' },
      { name: 'Besetzungs-Wechsel', dmg: 10, block: 12, desc: 'Blockt und greift an!' },
      { name: 'Probe ansetzen', dmg: 0, heal: 14, desc: 'Heilt sich!' },
      { name: 'Stück absetzen', dmg: 24, desc: 'HEAVY HIT! Das tut weh!' },
    ],
  },
  {
    id: 'kritiker',
    name: 'Der Kritiker',
    sprite: '🧐',
    hp: 130,
    attacks: [
      { name: 'Spitze Feder', dmg: 16, desc: 'Ein scharfes Urteil!' },
      { name: 'Verriss', dmg: 20, desc: 'Das Publikum schwankt.' },
      { name: 'Fußnote', dmg: 11, block: 14, desc: 'Kommentar plus Schutz.' },
      { name: 'Kolumne', dmg: 0, heal: 16, desc: 'Schreibt sich wieder stark.' },
      { name: 'Leitartikel', dmg: 26, desc: 'Ein vernichtender Leittext!' },
    ],
  },
  {
    id: 'dramaturgin',
    name: 'Die Dramaturgin',
    sprite: '📚',
    hp: 150,
    attacks: [
      { name: 'Strukturbruch', dmg: 18, desc: 'Der rote Faden reißt.' },
      { name: 'Textfassung', dmg: 14, block: 16, desc: 'Kürzt dich aus der Szene.' },
      { name: 'Generalprobe', dmg: 22, desc: 'Unter Druck wird es ernst.' },
      { name: 'Überarbeitung', dmg: 0, heal: 18, desc: 'Alles wird neu gesetzt.' },
      { name: 'Premierenfassung', dmg: 30, desc: 'Finale Fassung, voller Wucht!' },
    ],
  },
  {
    id: 'regisseur',
    name: 'Der Regisseur',
    sprite: '🎬',
    hp: 170,
    attacks: [
      { name: 'Noch mal!', dmg: 20, desc: 'Du musst die Szene wiederholen.' },
      { name: 'Lauter!', dmg: 24, desc: 'Direktion mit Nachdruck.' },
      { name: 'Umbesetzung', dmg: 16, block: 20, desc: 'Räumt auf und rüstet auf.' },
      { name: 'Inszenierung', dmg: 0, heal: 20, desc: 'Setzt das Bild neu.' },
      { name: 'Schlussapplaus', dmg: 34, desc: 'Die letzte Ansage sitzt.' },
    ],
  },
  {
    id: 'hausgeist',
    name: 'Der Hausgeist',
    sprite: '👻',
    hp: 190,
    attacks: [
      { name: 'Kalter Hauch', dmg: 22, desc: 'Die Bühne friert ein.' },
      { name: 'Flackerlicht', dmg: 26, desc: 'Du verlierst den Fokus.' },
      { name: 'Nachtwache', dmg: 18, block: 22, desc: 'Schützt sich im Schatten.' },
      { name: 'Echo im Saal', dmg: 0, heal: 22, desc: 'Nährt sich vom Applaus.' },
      { name: 'Mitternachtsruf', dmg: 38, desc: 'Ein geisterhafter Volltreffer!' },
    ],
  },
  {
    id: 'premierenmonster',
    name: 'Das Premierenmonster',
    sprite: '🩸',
    hp: 220,
    attacks: [
      { name: 'Panikwelle', dmg: 24, desc: 'Nervosität überall.' },
      { name: 'Totale Überforderung', dmg: 30, desc: 'Die Nerven liegen blank.' },
      { name: 'Lampenfieber-Spike', dmg: 20, block: 24, desc: 'Greift an und verhärtet sich.' },
      { name: 'Applausfresser', dmg: 0, heal: 25, desc: 'Saugt Energie aus dem Raum.' },
      { name: 'Premierenkollaps', dmg: 44, desc: 'Der härteste Schlag des Abends!' },
    ],
  },
]

function LevelDeckbuilder({ onComplete, godMode }) {
  const [phase, setPhase] = useState('draft') // draft | battle | postwin | won | lost
  const [deck, setDeck] = useState([])
  const [draftPool, setDraftPool] = useState([])
  const [draftPick, setDraftPick] = useState(0)
  const [bossStage, setBossStage] = useState(0)
  const [levelCompleted, setLevelCompleted] = useState(false)

  // Battle state
  const [hand, setHand] = useState([])
  const [drawPile, setDrawPile] = useState([])
  const [discard, setDiscard] = useState([])
  const [energy, setEnergy] = useState(3)
  const [pHp, setPHp] = useState(60)
  const [pBlock, setPBlock] = useState(0)
  const [bHp, setBHp] = useState(DECK_BOSSES[0].hp)
  const [bBlock, setBBlock] = useState(0)
  const [bVulnerable, setBVulnerable] = useState(0)
  const [bIntent, setBIntent] = useState(null)
  const [log, setLog] = useState([])
  const [turn, setTurn] = useState(0)
  const [animating, setAnimating] = useState(false)
  const [selectedCard, setSelectedCard] = useState(null)
  const { canvasRef, burst } = useParticleSystem()
  const { shakeRef, shake } = useScreenShake()

  useEffect(() => { if (godMode) onComplete() }, [godMode])

  const DECK_SIZE = 7
  const currentBoss = DECK_BOSSES[Math.min(bossStage, DECK_BOSSES.length - 1)]
  // Init draft: show 3 random cards at a time, pick DECK_SIZE total
  useEffect(() => {
    // Create pool with unique draft IDs
    const pool = [...DECK_CARDS, ...DECK_CARDS].map((c, i) => ({ ...c, draftId: i })).sort(() => Math.random() - 0.5)
    setDraftPool(pool)
  }, [])

  const draftCards = draftPool.slice(draftPick * 3, draftPick * 3 + 3)

  const pickCard = (card) => {
    SFX.click()
    const newDeck = [...deck, { ...card, uid: deck.length }]
    setDeck(newDeck)
    const nextPick = draftPick + 1
    setDraftPick(nextPick)
    if (newDeck.length >= DECK_SIZE) {
      setTimeout(() => startBattle(newDeck), 300)
    }
  }

  const shuffle = (arr) => {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
    return a
  }

  const rollBossIntent = (boss = currentBoss) => {
    const atk = boss.attacks[Math.floor(Math.random() * boss.attacks.length)]
    setBIntent(atk)
    return atk
  }

  const drawCards = (pile, disc, n) => {
    let p = [...pile], d = [...disc], h = []
    for (let i = 0; i < n; i++) {
      if (p.length === 0) { p = shuffle(d); d = [] }
      if (p.length > 0) h.push(p.pop())
    }
    return { hand: h, drawPile: p, discard: d }
  }

  const startBattle = (d, stage = bossStage) => {
    const boss = DECK_BOSSES[Math.min(stage, DECK_BOSSES.length - 1)]
    setPhase('battle')
    const shuffled = shuffle(d.map((c, i) => ({ ...c, uid: i })))
    const result = drawCards(shuffled, [], 5)
    setHand(result.hand)
    setDrawPile(result.drawPile)
    setDiscard([])
    setEnergy(3)
    setPHp(60)
    setPBlock(0)
    setBHp(boss.hp)
    setBBlock(0)
    setBVulnerable(0)
    setTurn(1)
    setLog([`${boss.sprite} ${boss.name} betritt die Bühne!`])
    rollBossIntent(boss)
  }

  const addLog = (msg) => setLog(l => [...l.slice(-4), msg])

  const playCard = (card) => {
    if (animating || card.cost > energy) return
    SFX.click()
    setEnergy(e => e - card.cost)
    setHand(h => h.filter(c => c.uid !== card.uid))
    setDiscard(d => [...d, card])
    setSelectedCard(null)

    let extraDraw = 0

    if (card.type === 'attack') {
      let totalDmg = card.dmg * (card.hits || 1)
      if (bVulnerable > 0) totalDmg = Math.floor(totalDmg * 1.5)
      // Apply to boss block first
      let remaining = totalDmg
      let newBBlock = bBlock
      if (newBBlock > 0) {
        const absorbed = Math.min(newBBlock, remaining)
        newBBlock -= absorbed
        remaining -= absorbed
      }
      const newBHp = Math.max(0, bHp - remaining)
      setBBlock(newBBlock)
      setBHp(newBHp)
      if (card.block) setPBlock(b => b + card.block)
      if (card.vulnerable) setBVulnerable(v => v + card.vulnerable)
      SFX.player_attack()
      shake(4, 200)
      addLog(`🎭 ${card.name} → ${totalDmg} Schaden!`)
      const canvas = canvasRef.current
      if (canvas) { const r = canvas.getBoundingClientRect(); burst(r.width * 0.7, r.height * 0.25, { count: 15, colors: [[255,215,0],[255,100,0]], shapes: ['star'], spread: 5 }) }
      if (newBHp <= 0) {
        SFX.victory()
        if (!levelCompleted && bossStage === 0) {
          onComplete()
          setLevelCompleted(true)
        }
        const hasNextBoss = bossStage < DECK_BOSSES.length - 1
        setPhase(hasNextBoss ? 'postwin' : 'won')
        addLog(hasNextBoss ? `🏆 ${currentBoss.name} besiegt! Optionaler Boss wartet...` : '👑 Alle optionalen Bosse besiegt!')
        if (canvas) { const r = canvas.getBoundingClientRect(); burst(r.width / 2, r.height / 2, { count: 50, colors: [[255,215,0],[255,180,0],[255,255,255]], shapes: ['star'], spread: 10 }) }
        return
      }
    } else {
      // Skill card
      if (card.block) { setPBlock(b => b + card.block); addLog(`🛡️ ${card.name} → +${card.block} Block`) }
      if (card.heal) {
        SFX.player_heal()
        setPHp(h => Math.min(60, h + card.heal))
        addLog(`💚 ${card.name} → +${card.heal} HP`)
      }
      if (!card.block && !card.heal) addLog(`✨ ${card.name}!`)
    }
    if (card.draw) extraDraw = card.draw

    if (extraDraw > 0) {
      const res = drawCards(drawPile, [...discard, card], extraDraw)
      setHand(h => [...h.filter(c => c.uid !== card.uid), ...res.hand])
      setDrawPile(res.drawPile)
      setDiscard(res.discard)
    }
  }

  const endTurn = () => {
    if (animating) return
    setAnimating(true)

    // Boss turn
    const intent = bIntent
    setTimeout(() => {
      // Boss block
      let newBBlock = 0
      if (intent.block) newBBlock = intent.block
      setBBlock(newBBlock)

      if (intent.heal) {
        SFX.boss_heal()
        setBHp(h => Math.min(currentBoss.hp, h + intent.heal))
        addLog(`🎩 ${intent.name} — heilt ${intent.heal} HP!`)
      }
      if (intent.dmg > 0) {
        SFX.boss_attack()
        let dmg = intent.dmg
        let newPBlock = pBlock
        let remaining = dmg
        if (newPBlock > 0) {
          const absorbed = Math.min(newPBlock, remaining)
          newPBlock -= absorbed
          remaining -= absorbed
        }
        const newPHp = Math.max(0, pHp - remaining)
        setPBlock(0) // block resets each turn
        setPHp(newPHp)
        shake(dmg >= 15 ? 8 : 4, 300)
        addLog(`🎩 ${intent.name} — ${dmg} Schaden! ${intent.desc}`)

        if (newPHp <= 0) {
          SFX.defeat()
          setPhase('lost')
          addLog('💀 Michi ist gescheitert...')
          setAnimating(false)
          return
        }
      } else if (!intent.heal) {
        addLog(`🎩 ${intent.name} — ${intent.desc}`)
      }

      // Vulnerable tick
      if (bVulnerable > 0) setBVulnerable(v => v - 1)

      // New player turn
      setTimeout(() => {
        setTurn(t => t + 1)
        setEnergy(3)
        setPBlock(0)
        const res = drawCards(drawPile, [...discard, ...hand], 5)
        setHand(res.hand)
        setDrawPile(res.drawPile)
        setDiscard(res.discard)
        rollBossIntent()
        setAnimating(false)
      }, 500)
    }, 800)
  }

  // Draft phase
  if (phase === 'draft') {
    return (
      <div className="fun-lvl-content">
        <p className="fun-lvl-desc">Baue dein Deck! Wähle {DECK_SIZE - deck.length} weitere Karten. ({deck.length}/{DECK_SIZE})</p>
        <div className="fun-deck-draft">
          {draftCards.map(card => (
            <motion.div key={card.draftId} className="fun-deck-card fun-deck-card-draft" onClick={() => pickCard(card)}
              whileHover={{ scale: 1.05, y: -5 }} whileTap={{ scale: 0.95 }}>
              <div className="fun-deck-card-img">
                <img src={`${IK}${card.img}?tr=w-200,h-130,fo-auto`} alt="" />
              </div>
              <div className="fun-deck-card-cost">{card.cost}</div>
              <div className="fun-deck-card-name">{card.name}</div>
              <div className="fun-deck-card-desc">{card.desc}</div>
              <div className="fun-deck-card-trivia">💡 {card.trivia}</div>
              <div className={`fun-deck-card-type ${card.type}`}>{card.type === 'attack' ? '⚔️' : '🛡️'}</div>
            </motion.div>
          ))}
        </div>
        {deck.length > 0 && (
          <div className="fun-deck-picked">
            <p>Dein Deck:</p>
            <div className="fun-deck-mini">
              {deck.map((c, i) => <span key={i} className="fun-deck-mini-card" title={c.name}>{c.type === 'attack' ? '⚔️' : '🛡️'} {c.name}</span>)}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Battle phase
  if (phase === 'battle') {
    return (
      <div className="fun-lvl-content fun-deck-battle" ref={shakeRef} style={{ position: 'relative' }}>
        <ParticleOverlay canvasRef={canvasRef} />

        {/* Boss area */}
        <div className="fun-deck-boss-area">
          <motion.div className="fun-deck-boss-sprite"
            animate={animating ? { x: [0, -10, 10, 0] } : {}}
            transition={{ duration: 0.3 }}>
            <span style={{ fontSize: '4rem' }}>{currentBoss.sprite}</span>
          </motion.div>
          <div className="fun-deck-boss-stats">
            <span className="fun-deck-boss-name">{currentBoss.name}</span>
            {bVulnerable > 0 && <span className="fun-deck-vuln">🔥 Verwundbar ({bVulnerable})</span>}
            <div className="fun-hptrack boss"><motion.div className="fun-hpfill boss" animate={{ width: `${(bHp / currentBoss.hp) * 100}%` }} /></div>
            <span className="fun-deck-hp">{bHp}/{currentBoss.hp} HP {bBlock > 0 ? ` | 🛡️${bBlock}` : ''}</span>
          </div>
          {bIntent && (
            <div className="fun-deck-intent">
              💡 Nächster Zug: <strong>{bIntent.name}</strong><br/>
              {bIntent.dmg > 0 && <span className="fun-deck-intent-dmg">⚔️ {bIntent.dmg} Schaden</span>}
              {bIntent.heal ? <span className="fun-deck-intent-heal">💚 +{bIntent.heal} HP</span> : null}
              {bIntent.block ? <span className="fun-deck-intent-block">🛡️ +{bIntent.block} Block</span> : null}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="fun-deck-divider">
          <div className="fun-deck-player-stats">
            <span>❤️ {pHp}/60</span>
            <span>🛡️ {pBlock}</span>
            <span>⚡ {energy}/3</span>
            <span>📚 {drawPile.length} | 🗑️ {discard.length}</span>
          </div>
        </div>

        {/* Battle log */}
        <div className="fun-rpg-log fun-deck-log">
          {log.map((msg, i) => <div key={i} className="fun-rpg-log-line">{msg}</div>)}
        </div>

        {/* Hand */}
        <div className="fun-deck-hand">
          {hand.map((card, i) => (
            <motion.div key={card.uid + '-' + i} className={`fun-deck-card fun-deck-card-hand ${card.cost > energy ? 'disabled' : ''} ${selectedCard?.uid === card.uid ? 'selected' : ''}`}
              onClick={() => card.cost <= energy ? (selectedCard?.uid === card.uid ? playCard(card) : setSelectedCard(card)) : null}
              whileHover={card.cost <= energy ? { y: -15, scale: 1.08 } : {}}
              initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.08 }}>
              <div className="fun-deck-card-img">
                <img src={`${IK}${card.img}?tr=w-160,h-100,fo-auto`} alt="" />
              </div>
              <div className="fun-deck-card-cost">{card.cost}</div>
              <div className="fun-deck-card-name">{card.name}</div>
              <div className="fun-deck-card-desc">{card.desc}</div>
              <div className={`fun-deck-card-type ${card.type}`}>{card.type === 'attack' ? '⚔️' : '🛡️'}</div>
            </motion.div>
          ))}
        </div>

        {selectedCard && (
          <div className="fun-deck-selected-info">
            <span>💡 {selectedCard.trivia}</span>
            <span className="fun-deck-tap-hint">Nochmal tippen zum Spielen!</span>
          </div>
        )}

        <button className="fun-btn fun-btn-primary fun-deck-end-turn" onClick={endTurn} disabled={animating}>
          Zug beenden ➜
        </button>
      </div>
    )
  }

  if (phase === 'postwin') {
    const nextBoss = DECK_BOSSES[bossStage + 1]
    return (
      <div className="fun-lvl-content">
        <motion.div className="fun-center" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <div style={{ fontSize: '3rem' }}>🏆</div>
          <h3 className="fun-gold-text">{currentBoss.name} besiegt!</h3>
          <p>Du kannst jetzt optional weitermachen: nächster Boss <strong>{nextBoss.name}</strong>.</p>
          <div className="fun-contact-btns">
            <button className="fun-btn fun-btn-primary" onClick={() => {
              const nextStage = bossStage + 1
              setBossStage(nextStage)
              startBattle(deck, nextStage)
            }}>⚔️ Weiter zum nächsten Boss</button>
            <button className="fun-btn" onClick={() => setPhase('won')}>✅ Für jetzt beenden</button>
          </div>
        </motion.div>
      </div>
    )
  }

  // Won
  if (phase === 'won') {
    return (
      <div className="fun-lvl-content" ref={shakeRef} style={{ position: 'relative' }}>
        <ParticleOverlay canvasRef={canvasRef} />
        <motion.div className="fun-center" initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
          <div style={{ fontSize: '4rem' }}>🎉</div>
          <h3 className="fun-gold-text">Kartenkampf gewonnen!</h3>
          <p>Besiegte Bosse: {bossStage + 1}/{DECK_BOSSES.length}</p>
          <button className="fun-btn fun-btn-small" onClick={() => { setPhase('draft'); setDeck([]); setDraftPick(0); setBossStage(0); setLevelCompleted(false); setDraftPool([...DECK_CARDS, ...DECK_CARDS].map((c,i) => ({...c, draftId:i})).sort(() => Math.random() - 0.5)) }}>🔄 Nochmal</button>
        </motion.div>
      </div>
    )
  }

  // Lost
  return (
    <div className="fun-lvl-content">
      <div className="fun-center">
        <div style={{ fontSize: '3rem' }}>💀</div>
        <p>{currentBoss.name} hat gewonnen...</p>
        <button className="fun-btn" onClick={() => { setPhase('draft'); setDeck([]); setDraftPick(0); setBossStage(0); setLevelCompleted(false); setDraftPool([...DECK_CARDS, ...DECK_CARDS].map((c,i) => ({...c, draftId:i})).sort(() => Math.random() - 0.5)) }}>🔄 Neues Deck versuchen</button>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════
   LEVEL: SURVIVOR ARENA (Vampire Survivors style)
   ═══════════════════════════════════════ */
// Detailed 16x16 pixel art sprites for survivor game
const SURV_SPRITES = {
  critic: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="4" y="0" width="8" height="1" fill="%23222"/><rect x="3" y="1" width="10" height="1" fill="%23333"/><rect x="4" y="2" width="8" height="4" fill="%23aaa"/><rect x="5" y="3" width="2" height="1" fill="%23111"/><rect x="9" y="3" width="2" height="1" fill="%23111"/><rect x="6" y="3" width="1" height="1" fill="%23fff"/><rect x="10" y="3" width="1" height="1" fill="%23fff"/><rect x="6" y="5" width="4" height="1" fill="%23844"/><rect x="3" y="6" width="10" height="1" fill="%23bbb"/><rect x="3" y="7" width="10" height="4" fill="%23556"/><rect x="5" y="7" width="6" height="1" fill="%23fff"/><rect x="6" y="8" width="4" height="1" fill="%23ddd"/><rect x="2" y="8" width="2" height="3" fill="%23997"/><rect x="12" y="8" width="2" height="3" fill="%23997"/><rect x="5" y="11" width="2" height="1" fill="%23556"/><rect x="9" y="11" width="2" height="1" fill="%23556"/><rect x="5" y="12" width="2" height="3" fill="%23443"/><rect x="9" y="12" width="2" height="3" fill="%23443"/><rect x="5" y="15" width="2" height="1" fill="%23222"/><rect x="9" y="15" width="2" height="1" fill="%23222"/></svg>')}`,
  heckler: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="5" y="0" width="6" height="1" fill="%23a44"/><rect x="4" y="1" width="8" height="1" fill="%23c55"/><rect x="4" y="2" width="8" height="4" fill="%23e8b070"/><rect x="5" y="3" width="2" height="2" fill="%23fff"/><rect x="9" y="3" width="2" height="2" fill="%23fff"/><rect x="6" y="3" width="1" height="1" fill="%23c22"/><rect x="10" y="3" width="1" height="1" fill="%23c22"/><rect x="5" y="5" width="6" height="1" fill="%23c22"/><rect x="6" y="5" width="1" height="1" fill="%23fff"/><rect x="9" y="5" width="1" height="1" fill="%23fff"/><rect x="4" y="6" width="8" height="5" fill="%23722"/><rect x="5" y="7" width="6" height="1" fill="%23933"/><rect x="2" y="7" width="3" height="3" fill="%23e8b070"/><rect x="11" y="7" width="3" height="3" fill="%23e8b070"/><rect x="1" y="7" width="1" height="2" fill="%23e8b070"/><rect x="14" y="7" width="1" height="2" fill="%23e8b070"/><rect x="5" y="11" width="6" height="1" fill="%23622"/><rect x="5" y="12" width="2" height="3" fill="%23446"/><rect x="9" y="12" width="2" height="3" fill="%23446"/><rect x="5" y="15" width="2" height="1" fill="%23334"/><rect x="9" y="15" width="2" height="1" fill="%23334"/></svg>')}`,
  boredom: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="3" y="0" width="10" height="2" fill="%23669" opacity="0.6"/><rect x="4" y="2" width="8" height="5" fill="%23b8bcd0"/><rect x="5" y="2" width="2" height="1" fill="%23dde"/><rect x="9" y="2" width="2" height="1" fill="%23dde"/><rect x="5" y="3" width="2" height="2" fill="%23336"/><rect x="9" y="3" width="2" height="2" fill="%23336"/><rect x="6" y="4" width="1" height="1" fill="%23fff"/><rect x="10" y="4" width="1" height="1" fill="%23fff"/><rect x="6" y="6" width="4" height="1" fill="%23669"/><rect x="7" y="6" width="2" height="1" fill="%23779"/><rect x="4" y="7" width="8" height="5" fill="%23889aaa"/><rect x="5" y="8" width="6" height="2" fill="%237889"/><rect x="3" y="8" width="2" height="3" fill="%23b8bcd0"/><rect x="11" y="8" width="2" height="3" fill="%23b8bcd0"/><rect x="5" y="12" width="2" height="3" fill="%23667788"/><rect x="9" y="12" width="2" height="3" fill="%23667788"/></svg>')}`,
  stage_fright: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="3" y="0" width="10" height="1" fill="%23606"/><rect x="2" y="1" width="12" height="1" fill="%23808"/><rect x="3" y="2" width="10" height="5" fill="%231a1a2e"/><rect x="4" y="2" width="3" height="3" fill="%23f0f"/><rect x="9" y="2" width="3" height="3" fill="%23f0f"/><rect x="5" y="3" width="1" height="1" fill="%23fff"/><rect x="10" y="3" width="1" height="1" fill="%23fff"/><rect x="6" y="5" width="4" height="2" fill="%23a0a"/><rect x="7" y="5" width="2" height="1" fill="%23c0c"/><rect x="2" y="3" width="2" height="4" fill="%231a1a2e"/><rect x="12" y="3" width="2" height="4" fill="%231a1a2e"/><rect x="3" y="7" width="10" height="5" fill="%23220044"/><rect x="4" y="8" width="8" height="2" fill="%23330055"/><rect x="5" y="12" width="2" height="3" fill="%23110022"/><rect x="9" y="12" width="2" height="3" fill="%23110022"/><rect x="3" y="1" width="1" height="5" fill="%23a0a" opacity="0.4"/><rect x="12" y="1" width="1" height="5" fill="%23a0a" opacity="0.4"/></svg>')}`,
  director: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="3" y="0" width="10" height="2" fill="%23222"/><rect x="4" y="0" width="2" height="1" fill="%23444"/><rect x="8" y="0" width="2" height="1" fill="%23444"/><rect x="4" y="2" width="8" height="5" fill="%23d4a"/><rect x="5" y="3" width="2" height="2" fill="%23fff"/><rect x="9" y="3" width="2" height="2" fill="%23fff"/><rect x="6" y="3" width="1" height="1" fill="%23ff0"/><rect x="10" y="3" width="1" height="1" fill="%23ff0"/><rect x="6" y="4" width="1" height="1" fill="%23aa0"/><rect x="10" y="4" width="1" height="1" fill="%23aa0"/><rect x="7" y="6" width="2" height="1" fill="%23a22"/><rect x="3" y="7" width="10" height="5" fill="%23111"/><rect x="4" y="7" width="8" height="1" fill="%23222"/><rect x="5" y="8" width="6" height="1" fill="%23333"/><rect x="7" y="9" width="2" height="1" fill="%23c8a000"/><rect x="1" y="8" width="3" height="3" fill="%23d4a"/><rect x="12" y="8" width="3" height="3" fill="%23d4a"/><rect x="0" y="9" width="2" height="1" fill="%23d4a"/><rect x="14" y="9" width="2" height="1" fill="%23d4a"/><rect x="5" y="12" width="2" height="3" fill="%23222"/><rect x="9" y="12" width="2" height="3" fill="%23222"/><rect x="5" y="15" width="2" height="1" fill="%23111"/><rect x="9" y="15" width="2" height="1" fill="%23111"/></svg>')}`,
  player: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="4" y="0" width="8" height="2" fill="%23543"/><rect x="5" y="0" width="2" height="1" fill="%23654"/><rect x="9" y="0" width="2" height="1" fill="%23654"/><rect x="4" y="2" width="8" height="4" fill="%23f4c08a"/><rect x="5" y="2" width="6" height="1" fill="%23e8b47a"/><rect x="5" y="3" width="2" height="2" fill="%23fff"/><rect x="9" y="3" width="2" height="2" fill="%23fff"/><rect x="6" y="3" width="1" height="1" fill="%23345"/><rect x="10" y="3" width="1" height="1" fill="%23345"/><rect x="7" y="5" width="2" height="1" fill="%23c88"/><rect x="3" y="6" width="10" height="6" fill="%23c33"/><rect x="4" y="6" width="8" height="1" fill="%23d44"/><rect x="6" y="7" width="4" height="1" fill="%23e55"/><rect x="7" y="8" width="2" height="2" fill="%23ffd700"/><rect x="2" y="7" width="2" height="4" fill="%23f4c08a"/><rect x="12" y="7" width="2" height="4" fill="%23f4c08a"/><rect x="1" y="8" width="1" height="2" fill="%23f4c08a"/><rect x="14" y="8" width="1" height="2" fill="%23f4c08a"/><rect x="5" y="12" width="2" height="3" fill="%2338a"/><rect x="9" y="12" width="2" height="3" fill="%2338a"/><rect x="5" y="15" width="2" height="1" fill="%23256"/><rect x="9" y="15" width="2" height="1" fill="%23256"/></svg>')}`,
}

// Enemy DNA strings for PixelAvatar
const ENEMY_DNAS = {
  critic: '7-5-3-8-1-4',      // grey/stern look
  heckler: '1-8-2-2-5-3',     // angry red
  boredom: '0-3-0-6-0-0',     // sleepy/plain
  stage_fright: '9-7-4-9-3-7', // spooky purple
  director: '5-6-5-1-4-9',    // fancy/boss
}

const SURVIVOR_ENEMIES = [
  { type: 'critic', sprite: SURV_SPRITES.critic, hp: 3, speed: 0.8, dmg: 5, xp: 1 },
  { type: 'heckler', sprite: SURV_SPRITES.heckler, hp: 4, speed: 1.0, dmg: 8, xp: 2 },
  { type: 'boredom', sprite: SURV_SPRITES.boredom, hp: 2, speed: 1.2, dmg: 3, xp: 1 },
  { type: 'stage_fright', sprite: SURV_SPRITES.stage_fright, hp: 6, speed: 0.6, dmg: 12, xp: 3 },
  { type: 'director', sprite: SURV_SPRITES.director, hp: 10, speed: 0.5, dmg: 15, xp: 5 },
]

const SURVIVOR_UPGRADES = [
  { id: 'monolog', name: 'Monolog-Welle', desc: 'Projektile rundherum', icon: '🎭' },
  { id: 'spotlight', name: 'Spotlight', desc: 'Schadens-Aura um dich', icon: '💡' },
  { id: 'speed', name: 'Schnelle Füße', desc: 'Laufgeschwindigkeit +25%', icon: '👟' },
  { id: 'heal', name: 'Applaus', desc: 'Heilung +25 HP', icon: '👏' },
  { id: 'dmg', name: 'Dramatik', desc: 'Schaden +40%', icon: '🔥' },
  { id: 'armor', name: 'Kostüm', desc: 'Schaden -25%', icon: '🛡️' },
  { id: 'magnet', name: 'Charme', desc: 'Pickup-Radius +80%', icon: '🧲' },
  { id: 'regen', name: 'Meditation', desc: 'Regeneration +1 HP/s', icon: '🧘' },
  { id: 'proj_speed', name: 'Wortgewalt', desc: 'Projektil-Speed +50%', icon: '💨' },
  { id: 'crit', name: 'Pointe', desc: '20% Crit-Chance (2x Schaden)', icon: '⚡' },
]

function LevelSurvivor({ onComplete, godMode }) {
  const ARENA = 500 // arena size in game units
  const FPS = 60
  const GAME_DURATION = 60 // seconds

  const [phase, setPhase] = useState('ready') // ready | playing | upgrade | dead | won
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION)
  const [score, setScore] = useState(0)
  const [playerHp, setPlayerHp] = useState(100)
  const [renderState, setRenderState] = useState(null)
  const [upgradeChoices, setUpgradeChoices] = useState([])

  const gsRef = useRef(null) // game state ref
  const frameRef = useRef(null)
  const keysRef = useRef({ up: false, down: false, left: false, right: false })
  const { canvasRef, burst } = useParticleSystem()
  const { shakeRef, shake } = useScreenShake()

  const joystickRef = useRef(null)
  const handleJoystickMove = useCallback((clientX, clientY) => {
    const base = joystickRef.current
    if (!base) return
    const rect = base.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    let dx = clientX - cx, dy = clientY - cy
    const dist = Math.sqrt(dx * dx + dy * dy)
    const RADIUS = 40
    if (dist > RADIUS) { dx = (dx / dist) * RADIUS; dy = (dy / dist) * RADIUS }
    const stick = base.querySelector('.fun-joystick-stick')
    if (stick) stick.style.transform = `translate(${dx}px, ${dy}px)`
    const threshold = 15
    keysRef.current = { left: dx < -threshold, right: dx > threshold, up: dy < -threshold, down: dy > threshold }
  }, [])
  const handleJoystickEnd = useCallback(() => {
    keysRef.current = { up: false, down: false, left: false, right: false }
    const stick = joystickRef.current?.querySelector('.fun-joystick-stick')
    if (stick) stick.style.transform = 'translate(0px, 0px)'
  }, [])

  useEffect(() => { if (godMode) onComplete(100) }, [godMode])

  const initGame = () => {
    gsRef.current = {
      px: ARENA / 2, py: ARENA / 2, hp: 100, maxHp: 100,
      enemies: [], projectiles: [], pickups: [],
      score: 0, kills: 0, level: 1, xp: 0, xpNeeded: 5,
      elapsed: 0, lastSpawn: 0, spawnInterval: 2,
      speed: 2.5, dmgMult: 1, atkCooldown: 0, atkRate: 0.8,
      upgrades: ['monolog'], auraRadius: 0, auraDmg: 0,
      iframes: 0, lastTime: performance.now()
    }
    setPhase('playing')
    setTimeLeft(GAME_DURATION)
    setScore(0)
    setPlayerHp(100)
    frameRef.current = requestAnimationFrame(loop)
  }

  const loop = useCallback((now) => {
    const gs = gsRef.current
    if (!gs) return
    const dt = Math.min((now - gs.lastTime) / 1000, 0.05)
    gs.lastTime = now
    gs.elapsed += dt

    const remaining = Math.max(0, GAME_DURATION - gs.elapsed)
    if (remaining <= 0 && gs.hp > 0) {
      setPhase('won')
      setScore(gs.score)
      onComplete(gs.score)
      SFX.victory()
      return
    }

    // Player movement
    const k = keysRef.current
    let dx = 0, dy = 0
    if (k.left) dx -= 1; if (k.right) dx += 1
    if (k.up) dy -= 1; if (k.down) dy += 1
    if (dx || dy) {
      const len = Math.sqrt(dx * dx + dy * dy)
      gs.px = Math.max(10, Math.min(ARENA - 10, gs.px + (dx / len) * gs.speed * dt * 60))
      gs.py = Math.max(10, Math.min(ARENA - 10, gs.py + (dy / len) * gs.speed * dt * 60))
    }

    // Auto-attack cooldown
    gs.atkCooldown -= dt
    if (gs.atkCooldown <= 0 && gs.upgrades.includes('monolog')) {
      gs.atkCooldown = gs.atkRate
      // Shoot in 4/8 directions
      const dirs = gs.level >= 3 ? 8 : 4
      for (let i = 0; i < dirs; i++) {
        const angle = (Math.PI * 2 * i) / dirs
        gs.projectiles.push({
          x: gs.px, y: gs.py,
          vx: Math.cos(angle) * (gs.projSpeed || 4), vy: Math.sin(angle) * (gs.projSpeed || 4),
          dmg: (gs.upgrades.includes('crit') && Math.random() < 0.2 ? 2 : 1) * gs.dmgMult * 2, life: 1.5
        })
      }
    }

    // Spotlight aura damage (gentle tick damage, not instant kill)
    if (gs.upgrades.includes('spotlight')) {
      const auraR = 35 + gs.level * 4
      gs.enemies.forEach(e => {
        const dist = Math.sqrt((e.x - gs.px) ** 2 + (e.y - gs.py) ** 2)
        if (dist < auraR) { e.hp -= 0.04 * gs.dmgMult * dt * 60 }
      })
      gs.auraRadius = auraR
    }

    // Regen
    if (gs.upgrades.includes('regen')) {
      gs.hp = Math.min(gs.maxHp, gs.hp + 1 * dt)
    }

    // Armor damage reduction is applied in enemy collision below

    // Move projectiles
    gs.projectiles.forEach(p => { p.x += p.vx * dt * 60; p.y += p.vy * dt * 60; p.life -= dt })
    gs.projectiles = gs.projectiles.filter(p => p.life > 0 && p.x > -20 && p.x < ARENA + 20 && p.y > -20 && p.y < ARENA + 20)

    // Projectile-enemy collision
    gs.projectiles.forEach(p => {
      gs.enemies.forEach(e => {
        if (e.hp <= 0) return
        const dist = Math.sqrt((e.x - p.x) ** 2 + (e.y - p.y) ** 2)
        if (dist < 15) {
          e.hp -= p.dmg
          p.life = 0
          if (e.hp <= 0) {
            gs.score += e.xp * 10
            gs.kills++
            gs.xp += e.xp
            // Drop pickup chance
            if (Math.random() < 0.15) {
              gs.pickups.push({ x: e.x, y: e.y, type: 'xp', life: 8 })
            }
          }
        }
      })
    })

    // Remove dead enemies
    gs.enemies = gs.enemies.filter(e => e.hp > 0)

    // Enemy movement + damage to player
    if (gs.iframes > 0) gs.iframes -= dt
    gs.enemies.forEach(e => {
      const dx = gs.px - e.x, dy = gs.py - e.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > 0) {
        e.x += (dx / dist) * e.speed * dt * 60
        e.y += (dy / dist) * e.speed * dt * 60
      }
      if (dist < 15 && gs.iframes <= 0) {
        const armorMult = gs.upgrades.includes('armor') ? 0.75 : 1
        gs.hp -= e.dmg * armorMult
        gs.iframes = 0.5
        shake(4, 200)
        if (gs.hp <= 0) {
          setPhase('dead')
          setScore(gs.score)
          SFX.defeat()
          return
        }
      }
    })

    // Spawn enemies
    gs.lastSpawn += dt
    const spawnRate = Math.max(0.3, gs.spawnInterval - gs.elapsed * 0.015)
    if (gs.lastSpawn >= spawnRate) {
      gs.lastSpawn = 0
      const count = 2 + Math.floor(gs.elapsed / 10)
      for (let i = 0; i < count; i++) {
        const template = SURVIVOR_ENEMIES[Math.floor(Math.random() * Math.min(SURVIVOR_ENEMIES.length, 2 + Math.floor(gs.elapsed / 12)))]
        const side = Math.floor(Math.random() * 4)
        let x, y
        if (side === 0) { x = -10; y = Math.random() * ARENA }
        else if (side === 1) { x = ARENA + 10; y = Math.random() * ARENA }
        else if (side === 2) { x = Math.random() * ARENA; y = -10 }
        else { x = Math.random() * ARENA; y = ARENA + 10 }
        const hpMult = 1 + gs.elapsed * 0.02
        gs.enemies.push({ ...template, x, y, hp: template.hp * hpMult, maxHp: template.hp * hpMult })
      }
    }

    // Pickup collection
    gs.pickups.forEach(p => {
      p.life -= dt
      const dist = Math.sqrt((p.x - gs.px) ** 2 + (p.y - gs.py) ** 2)
      const magnetR = gs.upgrades.includes('magnet') ? 36 : 20
      if (dist < magnetR) { gs.xp += 2; p.life = 0 }
    })
    gs.pickups = gs.pickups.filter(p => p.life > 0)

    // Level up
    if (gs.xp >= gs.xpNeeded) {
      gs.xp -= gs.xpNeeded
      gs.level++
      gs.xpNeeded = Math.floor(gs.xpNeeded * 1.5)
      SFX.unlock()
      // Show upgrade choices
      const choices = [...SURVIVOR_UPGRADES].sort(() => Math.random() - 0.5).slice(0, 3)
      setUpgradeChoices(choices)
      setPhase('upgrade')
      setRenderState(buildRender(gs, remaining))
      return
    }

    setPlayerHp(gs.hp)
    setTimeLeft(remaining)
    setScore(gs.score)
    setRenderState(buildRender(gs, remaining))

    if (gs.hp > 0) frameRef.current = requestAnimationFrame(loop)
  }, [onComplete, shake])

  const buildRender = (gs, timeLeft) => ({
    px: gs.px, py: gs.py, hp: gs.hp, maxHp: gs.maxHp,
    enemies: gs.enemies.map(e => ({ x: e.x, y: e.y, sprite: e.sprite, type: e.type })),
    projectiles: gs.projectiles.map(p => ({ x: p.x, y: p.y })),
    pickups: gs.pickups.map(p => ({ x: p.x, y: p.y })),
    score: gs.score, level: gs.level, xp: gs.xp, xpNeeded: gs.xpNeeded,
    timeLeft, auraRadius: gs.auraRadius, iframes: gs.iframes
  })

  const applyUpgrade = (up) => {
    const gs = gsRef.current
    if (up.id === 'speed') gs.speed *= 1.25
    else if (up.id === 'heal') gs.hp = Math.min(gs.maxHp, gs.hp + 25)
    else if (up.id === 'dmg') gs.dmgMult *= 1.4
    else if (up.id === 'proj_speed') gs.projSpeed = (gs.projSpeed || 4) * 1.5
    else if (!gs.upgrades.includes(up.id)) gs.upgrades.push(up.id)
    if (up.id === 'monolog') gs.atkRate = Math.max(0.3, gs.atkRate * 0.85)
    SFX.click()
    setPhase('playing')
    gs.lastTime = performance.now()
    frameRef.current = requestAnimationFrame(loop)
  }

  // Keyboard
  useEffect(() => {
    const keyMap = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' }
    const down = (e) => { const k = keyMap[e.key]; if (k) { keysRef.current[k] = true; e.preventDefault() } }
    const up = (e) => { const k = keyMap[e.key]; if (k) keysRef.current[k] = false }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); cancelAnimationFrame(frameRef.current) }
  }, [])

  if (phase === 'ready') {
    return (
      <div className="fun-lvl-content">
        <div className="fun-center">
          <p className="fun-lvl-desc">Überlebe 60 Sekunden auf der Bühne der Untoten!</p>
          <p className="fun-lvl-desc">WASD / Pfeiltasten zum Bewegen. Waffen feuern automatisch!</p>
          <p className="fun-lvl-desc">Besiege Gegner für XP → Level Up → wähle Upgrades!</p>
          <button className="fun-btn fun-btn-primary" onClick={initGame}>⭐ Arena betreten!</button>
        </div>
      </div>
    )
  }

  if (phase === 'upgrade') {
    return (
      <div className="fun-lvl-content">
        <div className="fun-center">
          <h3 className="fun-gold-text">⬆️ Level Up!</h3>
          <p className="fun-lvl-desc">Wähle ein Upgrade:</p>
          <div className="fun-survivor-upgrades">
            {upgradeChoices.map(up => (
              <motion.button key={up.id} className="fun-survivor-upgrade-btn" onClick={() => applyUpgrade(up)}
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <span className="fun-survivor-up-icon">{up.icon}</span>
                <span className="fun-survivor-up-name">{up.name}</span>
                <span className="fun-survivor-up-desc">{up.desc}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const r = renderState
  const scale = 100 / ARENA // convert game units to %

  if (phase === 'won' || phase === 'dead') {
    return (
      <div className="fun-lvl-content">
        <motion.div className="fun-center" initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
          <div style={{ fontSize: '3rem' }}>{phase === 'won' ? '🎉' : '💀'}</div>
          <h3 className={phase === 'won' ? 'fun-gold-text' : ''}>{phase === 'won' ? 'Überlebt!' : 'Gefallen...'}</h3>
          <p>Score: {score} | Kills: {gsRef.current?.kills || 0}</p>
          <button className="fun-btn" onClick={initGame}>🔄 Nochmal</button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="fun-lvl-content" style={{ position: 'relative' }}>
      <div ref={shakeRef} className="fun-survivor-arena">
        <ParticleOverlay canvasRef={canvasRef} />

        {/* HUD */}
        <div className="fun-survivor-hud">
          <span>⏱️ {Math.ceil(timeLeft)}s</span>
          <span>❤️ {Math.ceil(playerHp)}</span>
          <span>⭐ {score}</span>
          <span>Lv.{r?.level || 1}</span>
        </div>
        {/* XP bar */}
        <div className="fun-survivor-xpbar">
          <div className="fun-survivor-xpfill" style={{ width: `${((r?.xp || 0) / (r?.xpNeeded || 5)) * 100}%` }} />
        </div>

        {r && (
          <>
            {/* Spotlight aura */}
            {r.auraRadius > 0 && (
              <div className="fun-survivor-aura" style={{
                left: `${r.px * scale}%`, top: `${r.py * scale}%`,
                width: `${r.auraRadius * scale * 2}%`, height: `${r.auraRadius * scale * 2}%`
              }} />
            )}

            {/* Player */}
            <div className={`fun-survivor-player ${r.iframes > 0 ? 'hit' : ''}`}
              style={{ left: `${r.px * scale}%`, top: `${r.py * scale}%` }}>
              <div className="fun-michi-char" style={{ transform: 'scale(1.5)' }}>
                <div className="fun-michi-head" />
                <div className="fun-michi-body" />
                <div className="fun-michi-legs">
                  <div className="fun-michi-leg left" />
                  <div className="fun-michi-leg right" />
                </div>
              </div>
            </div>

            {/* Enemies */}
            {r.enemies.map((e, i) => (
              <div key={i} className="fun-survivor-enemy" style={{ left: `${e.x * scale}%`, top: `${e.y * scale}%` }}>
                <PixelAvatar dna={ENEMY_DNAS[e.type] || '0-0-0-0-0-0'} size={32} backgroundColor="transparent" style={{ imageRendering: 'pixelated' }} />
              </div>
            ))}

            {/* Projectiles */}
            {r.projectiles.map((p, i) => (
              <div key={i} className="fun-survivor-proj" style={{ left: `${p.x * scale}%`, top: `${p.y * scale}%` }} />
            ))}

            {/* Pickups */}
            {r.pickups.map((p, i) => (
              <div key={i} className="fun-survivor-pickup" style={{ left: `${p.x * scale}%`, top: `${p.y * scale}%` }} />
            ))}
          </>
        )}

        {/* Mobile joystick */}
        <div className="fun-survivor-mobile-hint">Joystick unten nutzen</div>
      </div>
      {/* Joystick below the arena */}
      <div className="fun-joystick-wrap"
        ref={joystickRef}
        onTouchStart={(e) => { e.preventDefault(); handleJoystickMove(e.touches[0].clientX, e.touches[0].clientY) }}
        onTouchMove={(e) => { e.preventDefault(); handleJoystickMove(e.touches[0].clientX, e.touches[0].clientY) }}
        onTouchEnd={handleJoystickEnd}
      >
        <div className="fun-joystick-base">
          <div className="fun-joystick-stick" />
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════
   LEVEL: BREAKOUT (Arkanoid-style)
   ═══════════════════════════════════════ */
const BREAKOUT_COLORS = ['#ff4466', '#ff8844', '#ffcc44', '#44ff66', '#4488ff', '#aa44ff']
const BREAKOUT_LABELS = ['Kritik', 'Absage', 'Flop', 'Langweilig', 'Zweifel', 'Lampenfieber', 'Buh!', 'Pleite']

function LevelBitTrip({ onComplete, godMode }) {
  const W = 500, H = 600
  const PADDLE_W = 80, PADDLE_H = 12, BALL_R = 6
  const BRICK_ROWS = 6, BRICK_COLS = 8, BRICK_H = 18, BRICK_GAP = 3

  const [phase, setPhase] = useState('ready')
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [renderData, setRenderData] = useState(null)

  const gsRef = useRef(null)
  const frameRef = useRef(null)
  const { canvasRef, burst } = useParticleSystem()
  const { shakeRef, shake } = useScreenShake()

  useEffect(() => { if (godMode) onComplete(100) }, [godMode])

  const buildBricks = () => {
    const bricks = []
    const brickW = (W - BRICK_GAP * (BRICK_COLS + 1)) / BRICK_COLS
    for (let r = 0; r < BRICK_ROWS; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        bricks.push({
          x: BRICK_GAP + c * (brickW + BRICK_GAP),
          y: 40 + r * (BRICK_H + BRICK_GAP),
          w: brickW, h: BRICK_H,
          color: BREAKOUT_COLORS[r % BREAKOUT_COLORS.length],
          label: BREAKOUT_LABELS[(r * BRICK_COLS + c) % BREAKOUT_LABELS.length],
          hp: r < 2 ? 2 : 1, // top 2 rows take 2 hits
          points: (BRICK_ROWS - r) * 10
        })
      }
    }
    return bricks
  }

  const initGame = () => {
    gsRef.current = {
      px: W / 2, // paddle center x
      ballX: W / 2, ballY: H - 50, ballVX: 3, ballVY: -4,
      bricks: buildBricks(), score: 0, lives: 3, launched: false,
      lastTime: performance.now(), combo: 0
    }
    setPhase('playing')
    setScore(0)
    setLives(3)
    frameRef.current = requestAnimationFrame(loop)
  }

  const loop = useCallback((now) => {
    const gs = gsRef.current
    if (!gs) return
    const dt = Math.min((now - gs.lastTime) / 1000, 0.05)
    gs.lastTime = now
    const spd = dt * 60 // normalize to 60fps

    if (!gs.launched) {
      gs.ballX = gs.px
      gs.ballY = H - 50
      setRenderData({ px: gs.px, ballX: gs.ballX, ballY: gs.ballY, bricks: gs.bricks, lives: gs.lives, combo: gs.combo })
      frameRef.current = requestAnimationFrame(loop)
      return
    }

    // Move ball
    gs.ballX += gs.ballVX * spd
    gs.ballY += gs.ballVY * spd

    // Wall bounces
    if (gs.ballX <= BALL_R) { gs.ballX = BALL_R; gs.ballVX = Math.abs(gs.ballVX) }
    if (gs.ballX >= W - BALL_R) { gs.ballX = W - BALL_R; gs.ballVX = -Math.abs(gs.ballVX) }
    if (gs.ballY <= BALL_R) { gs.ballY = BALL_R; gs.ballVY = Math.abs(gs.ballVY) }

    // Paddle collision
    const paddleTop = H - 30
    if (gs.ballVY > 0 && gs.ballY >= paddleTop - BALL_R && gs.ballY <= paddleTop + PADDLE_H &&
        gs.ballX >= gs.px - PADDLE_W / 2 && gs.ballX <= gs.px + PADDLE_W / 2) {
      gs.ballVY = -Math.abs(gs.ballVY)
      // Angle based on where ball hits paddle
      const offset = (gs.ballX - gs.px) / (PADDLE_W / 2)
      gs.ballVX = offset * 5
      gs.ballY = paddleTop - BALL_R
      gs.combo = 0
      SFX.click()
    }

    // Ball falls below
    if (gs.ballY > H + 10) {
      gs.lives--
      gs.combo = 0
      shake(5, 200)
      if (gs.lives <= 0) {
        setPhase('lost')
        setScore(gs.score)
        SFX.defeat()
        return
      }
      setLives(gs.lives)
      gs.launched = false
      gs.ballVX = 3 * (Math.random() > 0.5 ? 1 : -1)
      gs.ballVY = -4
      SFX.miss()
    }

    // Brick collision
    gs.bricks.forEach(b => {
      if (b.hp <= 0) return
      if (gs.ballX + BALL_R > b.x && gs.ballX - BALL_R < b.x + b.w &&
          gs.ballY + BALL_R > b.y && gs.ballY - BALL_R < b.y + b.h) {
        b.hp--
        gs.combo++
        if (b.hp <= 0) {
          gs.score += b.points + gs.combo * 5
          SFX.hit_perfect()
        } else {
          SFX.hit_ok()
        }
        // Determine bounce direction
        const overlapLeft = (gs.ballX + BALL_R) - b.x
        const overlapRight = (b.x + b.w) - (gs.ballX - BALL_R)
        const overlapTop = (gs.ballY + BALL_R) - b.y
        const overlapBottom = (b.y + b.h) - (gs.ballY - BALL_R)
        const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom)
        if (minOverlap === overlapTop || minOverlap === overlapBottom) gs.ballVY = -gs.ballVY
        else gs.ballVX = -gs.ballVX
        // Speed up slightly
        const speed = Math.sqrt(gs.ballVX ** 2 + gs.ballVY ** 2)
        const maxSpeed = 8
        if (speed < maxSpeed) {
          gs.ballVX *= 1.01
          gs.ballVY *= 1.01
        }
      }
    })
    gs.bricks = gs.bricks.filter(b => b.hp > 0)

    // Win condition
    if (gs.bricks.length === 0) {
      setPhase('won')
      setScore(gs.score)
      onComplete(gs.score)
      SFX.victory()
      return
    }

    setScore(gs.score)
    setRenderData({ px: gs.px, ballX: gs.ballX, ballY: gs.ballY, bricks: gs.bricks, lives: gs.lives, combo: gs.combo })
    frameRef.current = requestAnimationFrame(loop)
  }, [onComplete, shake])

  // Mouse/touch paddle control
  const moveRef = useRef(null)
  const handleMove = useCallback((clientX) => {
    const gs = gsRef.current
    if (!gs || !moveRef.current) return
    const rect = moveRef.current.getBoundingClientRect()
    const x = (clientX - rect.left) / rect.width * W
    gs.px = Math.max(PADDLE_W / 2, Math.min(W - PADDLE_W / 2, x))
  }, [])

  const handleLaunch = useCallback(() => {
    const gs = gsRef.current
    if (gs && !gs.launched) { gs.launched = true; SFX.player_attack() }
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      const gs = gsRef.current
      if (!gs) return
      if (e.key === 'ArrowLeft') gs.px = Math.max(PADDLE_W / 2, gs.px - 20)
      if (e.key === 'ArrowRight') gs.px = Math.min(W - PADDLE_W / 2, gs.px + 20)
      if (e.code === 'Space') { e.preventDefault(); handleLaunch() }
    }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); cancelAnimationFrame(frameRef.current) }
  }, [handleLaunch])

  if (phase === 'ready') {
    return (
      <div className="fun-lvl-content">
        <div className="fun-center">
          <p className="fun-lvl-desc">Zerstöre alle negativen Kritiken mit dem Ball!</p>
          <p className="fun-lvl-desc">Maus/Touch zum Bewegen, LEERTASTE/Klick zum Starten.</p>
          <p className="fun-lvl-desc">3 Leben — lass den Ball nicht fallen!</p>
          <button className="fun-btn fun-btn-primary" onClick={initGame}>🧱 Los geht's!</button>
        </div>
      </div>
    )
  }

  if (phase === 'won' || phase === 'lost') {
    return (
      <div className="fun-lvl-content">
        <motion.div className="fun-center" initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
          <div style={{ fontSize: '3rem' }}>{phase === 'won' ? '🎉' : '💔'}</div>
          <h3 className={phase === 'won' ? 'fun-gold-text' : ''}>{phase === 'won' ? 'Alle Kritiken zerstört!' : 'Game Over...'}</h3>
          <p>Score: {score}</p>
          <button className="fun-btn" onClick={initGame}>🔄 Nochmal</button>
        </motion.div>
      </div>
    )
  }

  const r = renderData
  const sx = 100 / W, sy = 100 / H

  return (
    <div className="fun-lvl-content" style={{ position: 'relative' }}>
      <div ref={(el) => { shakeRef.current = el; moveRef.current = el }} className="fun-breakout-field"
        onMouseMove={(e) => handleMove(e.clientX)}
        onTouchMove={(e) => { e.preventDefault(); handleMove(e.touches[0].clientX) }}
        onClick={handleLaunch}
        onTouchStart={(e) => { handleMove(e.touches[0].clientX); handleLaunch() }}>
        <ParticleOverlay canvasRef={canvasRef} />

        {/* HUD */}
        <div className="fun-breakout-hud">
          <span>{'❤️'.repeat(r?.lives || 0)}</span>
          <span>⭐ {score}</span>
          {r?.combo > 2 && <span className="fun-bittrip-combo">🔥 x{r.combo}</span>}
        </div>

        {r && (
          <>
            {/* Bricks */}
            {r.bricks.map((b, i) => (
              <div key={i} className="fun-breakout-brick" style={{
                left: `${b.x * sx}%`, top: `${b.y * sy}%`,
                width: `${b.w * sx}%`, height: `${b.h * sy}%`,
                background: b.hp > 1 ? `linear-gradient(135deg, ${b.color}, ${b.color}88)` : b.color,
                borderColor: b.hp > 1 ? '#fff' : b.color,
                opacity: b.hp > 1 ? 1 : 0.8
              }}>
                <span className="fun-breakout-brick-label">{b.label}</span>
              </div>
            ))}

            {/* Paddle */}
            <div className="fun-breakout-paddle" style={{
              left: `${(r.px - PADDLE_W / 2) * sx}%`, top: `${(H - 30) * sy}%`,
              width: `${PADDLE_W * sx}%`, height: `${PADDLE_H * sy}%`
            }} />

            {/* Ball */}
            <div className="fun-breakout-ball" style={{
              left: `${r.ballX * sx}%`, top: `${r.ballY * sy}%`
            }} />
          </>
        )}

        {!gsRef.current?.launched && phase === 'playing' && (
          <div className="fun-breakout-start-hint">Klicke / LEERTASTE zum Starten!</div>
        )}
      </div>
    </div>
  )
}
/* ═══════════════════════════════════════
   LEVEL: FINAL BOSS (Monolog Typer + Contact)
   ═══════════════════════════════════════ */
function LevelFinalBoss({ contactUnlocked, onComplete, godMode }) {
  const [phase, setPhase] = useState(contactUnlocked ? 'done' : 'typer')
  useEffect(() => { if (godMode && !contactUnlocked) { setPhase('done'); onComplete() } }, [godMode])
  const [monIdx] = useState(Math.floor(Math.random() * MONOLOG_TEXTS.length))
  const mon = MONOLOG_TEXTS[monIdx]
  const words = mon.text.split(' ')
  const [wordIdx, setWordIdx] = useState(0)
  const [input, setInput] = useState('')
  const [timer, setTimer] = useState(60)
  const [typerDone, setTyperDone] = useState(false)
  const [quizIdx, setQuizIdx] = useState(0)
  const [quizDone, setQuizDone] = useState(contactUnlocked)
  const [wrong, setWrong] = useState(false)
  const timerRef = useRef(null)

  // Typer timer
  useEffect(() => {
    if (phase !== 'typer' || typerDone) return
    timerRef.current = setInterval(() => setTimer(t => { if (t <= 1) { setTyperDone(true); clearInterval(timerRef.current); return 0 } return t - 1 }), 1000)
    return () => clearInterval(timerRef.current)
  }, [phase, typerDone])

  const handleType = (e) => {
    const val = e.target.value
    setInput(val)
    if (val.trim().toLowerCase() === words[wordIdx].toLowerCase()) {
      setWordIdx(w => w + 1); setInput('')
      if (wordIdx + 1 >= words.length) { setTyperDone(true); clearInterval(timerRef.current) }
    }
  }

  const proceedToQuiz = () => setPhase('quiz')

  const answer = (i) => {
    if (i === CONTACT_QUESTIONS[quizIdx].correct) {
      if (quizIdx + 1 >= CONTACT_QUESTIONS.length) { setQuizDone(true); setPhase('done'); onComplete() }
      else setQuizIdx(q => q + 1)
      setWrong(false)
    } else { setWrong(true); setTimeout(() => setWrong(false), 1200) }
  }

  return (
    <div className="fun-lvl-content">
      {phase === 'typer' && (
        <div className="fun-typer">
          <h3 className="fun-typer-title">{mon.title}</h3>
          <div className="fun-typer-timer">{timer}s</div>
          <div className="fun-typer-words">
            {words.map((w, i) => (
              <span key={i} className={`fun-typer-word ${i < wordIdx ? 'typed' : i === wordIdx ? 'current' : ''}`}>{w} </span>
            ))}
          </div>
          {!typerDone ? (
            <input className="fun-typer-input" value={input} onChange={handleType} autoFocus placeholder="Tippe das nächste Wort..." />
          ) : (
            <div className="fun-center">
              <p>{wordIdx >= words.length ? '🎉 Perfekt geschafft!' : `⏱️ Zeit um! ${wordIdx}/${words.length} Wörter`}</p>
              <button className="fun-btn" onClick={proceedToQuiz}>▶ Weiter zum Quiz</button>
            </div>
          )}
        </div>
      )}
      {phase === 'quiz' && (
        <div className="fun-quiz">
          <p className="fun-lvl-desc">Letzte Hürde: 3 Fragen!</p>
          <div className="fun-quiz-q">{CONTACT_QUESTIONS[quizIdx].q}</div>
          <div className="fun-quiz-opts">
            {CONTACT_QUESTIONS[quizIdx].opts.map((o, i) => (
              <motion.button key={i} className="fun-quiz-opt" onClick={() => answer(i)} whileHover={{ scale: 1.03 }}>{o}</motion.button>
            ))}
          </div>
          {wrong && <p className="fun-wrong">❌ Falsch!</p>}
        </div>
      )}
      {phase === 'done' && (
        <motion.div className="fun-center" initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
          <div style={{ fontSize: '4rem' }}>🏆</div>
          <h3 className="fun-gold-text">Kontakt freigeschaltet!</h3>
          <div className="fun-contact-btns">
            <a href="https://www.schauspielervideos.de/fullprofile/michi-wischniowski.html" target="_blank" rel="noopener noreferrer" className="fun-btn">📋 Profil</a>
            <a href="mailto:kontakt@michiwischniowski.de" className="fun-btn fun-btn-primary">📧 E-Mail</a>
          </div>
        </motion.div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════
   PIXEL ART MAP NODES
   ═══════════════════════════════════════ */
function PixelMapPin({ completed, unlocked, current }) {
  const baseColor = completed ? '#ffd700' : current ? '#00ff88' : unlocked ? '#44aaff' : '#555'
  const darkColor = completed ? '#b8860b' : current ? '#009955' : unlocked ? '#2266aa' : '#333'
  const roofColor = completed ? '#ff6600' : current ? '#00cc66' : unlocked ? '#3388cc' : '#444'
  const glowColor = completed ? 'rgba(255,215,0,0.6)' : current ? 'rgba(0,255,136,0.5)' : 'none'
  return (
    <svg width="40" height="44" viewBox="0 0 40 44" style={{ filter: completed || current ? `drop-shadow(0 0 8px ${glowColor})` : 'none', imageRendering: 'pixelated' }}>
      {/* Castle towers */}
      <rect x="4" y="12" width="6" height="20" fill={baseColor} />
      <rect x="30" y="12" width="6" height="20" fill={baseColor} />
      {/* Tower tops (battlements) */}
      <rect x="2" y="8" width="4" height="6" fill={roofColor} />
      <rect x="8" y="8" width="4" height="6" fill={roofColor} />
      <rect x="28" y="8" width="4" height="6" fill={roofColor} />
      <rect x="34" y="8" width="4" height="6" fill={roofColor} />
      {/* Main building */}
      <rect x="10" y="16" width="20" height="16" fill={baseColor} />
      {/* Roof / center battlement */}
      <rect x="12" y="10" width="4" height="8" fill={roofColor} />
      <rect x="18" y="6" width="4" height="12" fill={roofColor} />
      <rect x="24" y="10" width="4" height="8" fill={roofColor} />
      {/* Flag on top */}
      <rect x="19" y="0" width="2" height="6" fill={darkColor} />
      <rect x="21" y="0" width="6" height="4" fill={completed ? '#ff4444' : current ? '#44ff88' : unlocked ? '#66bbff' : '#666'} />
      {/* Gate */}
      <rect x="16" y="24" width="8" height="8" fill={darkColor} />
      <rect x="18" y="24" width="4" height="8" fill="#1a0033" />
      {/* Windows */}
      <rect x="6" y="18" width="3" height="3" fill={darkColor} />
      <rect x="31" y="18" width="3" height="3" fill={darkColor} />
      <rect x="12" y="18" width="3" height="3" fill={darkColor} />
      <rect x="25" y="18" width="3" height="3" fill={darkColor} />
      {/* Ground */}
      <rect x="0" y="32" width="40" height="4" fill="rgba(0,0,0,0.3)" />
      {/* Highlight */}
      <rect x="4" y="12" width="2" height="16" fill="rgba(255,255,255,0.2)" />
      <rect x="10" y="16" width="3" height="12" fill="rgba(255,255,255,0.15)" />
      {completed && <>
        <rect x="16" y="36" width="8" height="4" fill="#ffd700" />
        <rect x="18" y="38" width="4" height="4" fill="#ffd700" />
        <text x="20" y="42" textAnchor="middle" fontSize="6" fill="#ffd700">★</text>
      </>}
    </svg>
  )
}

/* ═══════════════════════════════════════
   WORLD MAP (FULLSCREEN HUB)
   ═══════════════════════════════════════ */
function WorldMap({ progress, onEnterLevel, michiPos, onMoveToNode, walkingTo, pathRefs }) {
  const { completed, unlocked } = progress
  const [drawingPaths, setDrawingPaths] = useState(new Set())

  // Mobile pinch-zoom & pan
  const [mapTransform, setMapTransform] = useState({ scale: 1, x: 0, y: 0 })
  const touchRef = useRef({ startDist: 0, startScale: 1, startX: 0, startY: 0, lastX: 0, lastY: 0, isPanning: false })

  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      touchRef.current.startDist = Math.sqrt(dx * dx + dy * dy)
      touchRef.current.startScale = mapTransform.scale
    } else if (e.touches.length === 1 && mapTransform.scale > 1) {
      touchRef.current.isPanning = true
      touchRef.current.lastX = e.touches[0].clientX
      touchRef.current.lastY = e.touches[0].clientY
      touchRef.current.startX = mapTransform.x
      touchRef.current.startY = mapTransform.y
    }
  }, [mapTransform])

  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 2) {
      e.preventDefault()
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const newScale = Math.max(1, Math.min(3, touchRef.current.startScale * (dist / touchRef.current.startDist)))
      setMapTransform(t => ({ ...t, scale: newScale }))
    } else if (e.touches.length === 1 && touchRef.current.isPanning) {
      e.preventDefault()
      const dx = e.touches[0].clientX - touchRef.current.lastX
      const dy = e.touches[0].clientY - touchRef.current.lastY
      setMapTransform(t => ({
        ...t,
        x: Math.max(-200, Math.min(200, touchRef.current.startX + (e.touches[0].clientX - touchRef.current.lastX + touchRef.current.startX - touchRef.current.startX))),
        y: Math.max(-200, Math.min(200, touchRef.current.startY + (e.touches[0].clientY - touchRef.current.lastY + touchRef.current.startY - touchRef.current.startY)))
      }))
      touchRef.current.startX += dx
      touchRef.current.startY += dy
      touchRef.current.lastX = e.touches[0].clientX
      touchRef.current.lastY = e.touches[0].clientY
    }
  }, [])

  const handleTouchEnd = useCallback((e) => {
    if (e.touches.length === 0) {
      touchRef.current.isPanning = false
      // Snap back if scale is ~1
      if (mapTransform.scale < 1.1) setMapTransform({ scale: 1, x: 0, y: 0 })
    }
  }, [mapTransform])

  // Double-tap to reset zoom
  const lastTap = useRef(0)
  const handleDoubleTap = useCallback((e) => {
    const now = Date.now()
    if (now - lastTap.current < 300) {
      setMapTransform({ scale: 1, x: 0, y: 0 })
    }
    lastTap.current = now
  }, [])

  // Track newly completed levels to animate their outgoing paths
  const prevCompleted = useRef(completed)
  useEffect(() => {
    const newlyDone = completed.filter(c => !prevCompleted.current.includes(c))
    if (newlyDone.length > 0) {
      const newDrawing = new Set()
      MAP_PATHS.forEach(([a, b]) => {
        if (newlyDone.includes(a)) newDrawing.add(`${a}-${b}`)
      })
      if (newDrawing.size > 0) {
        setDrawingPaths(newDrawing)
        setTimeout(() => setDrawingPaths(new Set()), 1500)
      }
    }
    prevCompleted.current = completed
  }, [completed])

  return (
    <div className="fun-map" style={{ '--map-bg': 'url(/map.png)' }}
      onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
      onClick={handleDoubleTap}>
      <div className="fun-map-inner" style={{
        transform: `translate(${mapTransform.x}px, ${mapTransform.y}px) scale(${mapTransform.scale})`,
        transformOrigin: 'center center'
      }}>
      {/* SVG overlay for curved paths between nodes */}
      <svg className="fun-map-svg" viewBox={`0 0 ${SVG_W} ${SVG_H}`} preserveAspectRatio="none">
        {MAP_PATHS.map(([a, b]) => {
          const isUnlocked = unlocked.includes(a) && unlocked.includes(b)
          const d = getSvgPathD(a, b)
          const key = `${a}-${b}`
          const isDrawing = drawingPaths.has(key)
          return (
            <path key={key} ref={el => pathRefs.current[key] = el} d={d} fill="none"
              stroke={isUnlocked ? 'rgba(255,255,100,0.85)' : 'rgba(255,255,255,0.25)'}
              strokeWidth={isUnlocked ? '2' : '1'}
              strokeDasharray={isUnlocked ? '6,3' : '3,4'}
              strokeLinecap="round"
              className={isDrawing ? 'fun-path-draw' : ''}
              filter={isUnlocked ? 'drop-shadow(0 0 3px rgba(255,255,0,0.5))' : 'none'} />
          )
        })}
      </svg>

      {/* Nodes */}
      {MAP_NODES.map(node => {
        const isUnlocked = unlocked.includes(node.id)
        const isCompleted = completed.includes(node.id)
        const isCurrent = michiPos === node.id
        return (
          <motion.button key={node.id}
            className={`fun-map-node ${isUnlocked ? 'open' : 'locked'} ${isCompleted ? 'done' : ''} ${isCurrent ? 'current' : ''}`}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
            onClick={() => isUnlocked && onMoveToNode(node.id)}
            onDoubleClick={() => isUnlocked && michiPos === node.id && onEnterLevel(node.id)}
            onTouchEnd={(e) => {
              if (!isUnlocked) return
              const now = Date.now()
              if (node._lastTap && now - node._lastTap < 350 && michiPos === node.id) {
                e.preventDefault(); onEnterLevel(node.id)
              }
              node._lastTap = now
            }}
            animate={isUnlocked && !isCompleted ? { y: [0, -3, 0] } : {}}
            transition={isUnlocked && !isCompleted ? { repeat: Infinity, duration: 2, delay: Math.random() * 2 } : {}}
          >
            <PixelMapPin completed={isCompleted} unlocked={isUnlocked} current={isCurrent} />
            <span className="fun-map-nm">{node.name}</span>
            {!isUnlocked && <span className="fun-map-lock">🔒</span>}
          </motion.button>
        )
      })}

      {/* Michi sprite – walks along curved path */}
      {(() => {
        const pos = getNode(michiPos)
        const isWalking = !!walkingTo
        return pos && (
          <div className={`fun-michi-sprite ${isWalking ? 'walking' : ''}`}
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>
            <div className={`fun-michi-bounce ${isWalking ? '' : 'idle'}`}>
              <div className="fun-michi-char">
                <div className="fun-michi-head" />
                <div className="fun-michi-body" />
                <div className="fun-michi-legs">
                  <div className="fun-michi-leg left" />
                  <div className="fun-michi-leg right" />
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Enter level prompt */}
      {(() => {
        const node = getNode(michiPos)
        if (!node) return null
        return (
          <motion.div className="fun-enter-prompt"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={michiPos}>
            <span className="fun-enter-emoji">{node.icon}</span>
            <div>
              <strong>{node.name}</strong>
              <span className="fun-enter-label">{node.label}</span>
            </div>
            <button className="fun-btn fun-btn-primary fun-btn-enter" onClick={() => onEnterLevel(node.id)}>
              {progress.completed.includes(node.id) ? '🔄 Nochmal' : '▶ Betreten'}
            </button>
          </motion.div>
        )
      })()}
      </div>
      {/* Zoom hint for mobile */}
      {mapTransform.scale > 1 && (
        <div className="fun-map-zoom-hint">Doppeltippen zum Zurücksetzen</div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════
   LEADERBOARD
   ═══════════════════════════════════════ */
function Leaderboard({ show, onClose, progress }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [name, setName] = useState(localStorage.getItem('michi-lb-name') || '')
  const [submitted, setSubmitted] = useState(false)
  const [rank, setRank] = useState(null)

  const playerScore = progress.xp
  const playerLevel = Math.floor(playerScore / 100) + 1
  const playerAchs = progress.achievements.length

  const fetchEntries = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/leaderboard')
      if (r.ok) setEntries(await r.json())
    } catch {}
    setLoading(false)
  }

  useEffect(() => { if (show) { fetchEntries(); setSubmitted(false); setRank(null) } }, [show])

  const submit = async () => {
    const safeName = name.trim()
    if (!safeName || safeName.length > 20 || submitting) return
    setSubmitting(true)
    localStorage.setItem('michi-lb-name', safeName)
    try {
      const r = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: safeName, score: playerScore, level: playerLevel, achievements: playerAchs })
      })
      if (r.ok) {
        const data = await r.json()
        setRank(data.rank)
        setSubmitted(true)
        fetchEntries()
      }
    } catch {}
    setSubmitting(false)
  }

  return (
    <AnimatePresence>
      {show && (
        <>
          <motion.div className="fun-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div className="fun-sidebar fun-leaderboard" initial={{ x: 300 }} animate={{ x: 0 }} exit={{ x: 300 }}>
            <div className="fun-sidebar-top"><h3>📊 Leaderboard</h3><button onClick={onClose}>✕</button></div>

            {/* Submit score */}
            <div className="fun-lb-submit">
              <div className="fun-lb-your-score">
                <span>Dein Score: <strong>{playerScore} XP</strong></span>
                <span>Level {playerLevel} • {playerAchs} 🏆</span>
              </div>
              {!submitted ? (
                <div className="fun-lb-form">
                  <input className="fun-lb-input" value={name} onChange={e => setName(e.target.value.slice(0, 20))}
                    placeholder="Dein Name..." maxLength={20} />
                  <button className="fun-btn fun-btn-primary fun-btn-small" onClick={submit} disabled={submitting || !name.trim()}>
                    {submitting ? '...' : '📤 Eintragen'}
                  </button>
                </div>
              ) : (
                <div className="fun-lb-submitted">
                  ✅ Eingetragen! {rank && `Platz ${rank}`}
                </div>
              )}
            </div>

            {/* Entries */}
            <div className="fun-lb-list">
              {loading ? <p style={{ textAlign: 'center', color: 'var(--fun-dim)' }}>Laden...</p> : (
                entries.length === 0 ? <p style={{ textAlign: 'center', color: 'var(--fun-dim)' }}>Noch keine Einträge!</p> : (
                  <table className="fun-lb-table">
                    <thead><tr><th>#</th><th>Name</th><th>XP</th><th>Lv</th><th>🏆</th></tr></thead>
                    <tbody>
                      {entries.map((e, i) => (
                        <tr key={i} className={i < 3 ? 'fun-lb-top' : ''}>
                          <td className="fun-lb-rank">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</td>
                          <td className="fun-lb-name">{e.name}</td>
                          <td>{e.score}</td>
                          <td>{e.level}</td>
                          <td>{e.achievements}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/* ═══════════════════════════════════════
   ACHIEVEMENTS SIDEBAR
   ═══════════════════════════════════════ */
function AchSidebar({ achs, show, onClose }) {
  return (
    <AnimatePresence>
      {show && (
        <>
          <motion.div className="fun-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div className="fun-sidebar" initial={{ x: 300 }} animate={{ x: 0 }} exit={{ x: 300 }}>
            <div className="fun-sidebar-top"><h3>🏆 Achievements</h3><button onClick={onClose}>✕</button></div>
            <div className="fun-sidebar-list">
              {ACHIEVEMENTS.map(a => (
                <div key={a.id} className={`fun-sidebar-item ${achs.includes(a.id) ? 'got' : ''}`}>
                  <span>{achs.includes(a.id) ? a.icon : '🔒'}</span>
                  <div><strong>{achs.includes(a.id) ? a.name : '???'}</strong><span>{achs.includes(a.id) ? a.desc : '...'}</span></div>
                </div>
              ))}
            </div>
            <div className="fun-sidebar-count">{achs.length}/{ACHIEVEMENTS.length}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/* ═══════════════════════════════════════
   MAIN FUN MODE
   ═══════════════════════════════════════ */
export default function FunMode(props) {
  return <MusicProvider><FunModeInner {...props} /></MusicProvider>
}

function FunModeInner({ onBack }) {
  const { switchTrack } = useMusic()
  const [progress, setProgress] = useState(loadProgress)
  const [view, setView] = useState('map') // 'map' | 'story:levelId' | levelId
  const [popup, setPopup] = useState(null)
  const [showAch, setShowAch] = useState(false)
  const [showLB, setShowLB] = useState(false)
  const [justCompleted, setJustCompleted] = useState(null)
  const [videoInterlude, setVideoInterlude] = useState(null)
  const [showCheat, setShowCheat] = useState(false)
  const [cheatInput, setCheatInput] = useState('')
  const [cheatMsg, setCheatMsg] = useState('')
  const [godMode, setGodMode] = useState(false)
  const konamiRef = useRef([])

  useEffect(() => { saveProgress(progress) }, [progress])

  // Switch music track based on current view
  useEffect(() => {
    if (view === 'saarbruecken') switchTrack('battle')
    else if (view === 'osnabrueck') switchTrack('rhythm')
    else switchTrack('map')
  }, [view, switchTrack])

  // Konami
  useEffect(() => {
    const K = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a']
    const h = e => { konamiRef.current = [...konamiRef.current, e.key].slice(-10); if (konamiRef.current.join() === K.join()) { addAch('konami'); addXp(100) } }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [])

  const addXp = useCallback((n) => setProgress(p => ({ ...p, xp: p.xp + n })), [])
  const addAch = useCallback((id) => {
    setProgress(p => {
      if (p.achievements.includes(id)) return p
      const a = ACHIEVEMENTS.find(a => a.id === id)
      if (a) setPopup(a)
      return { ...p, achievements: [...p.achievements, id] }
    })
  }, [])

  const executeCheat = (code) => {
    const c = code.trim().toUpperCase()
    if (c === 'IWIN') {
      setProgress(p => {
        const allIds = MAP_NODES.map(n => n.id)
        return { ...p, completed: allIds, unlocked: allIds, michiPos: 'wroclaw', xp: p.xp + 999, contactUnlocked: true,
          skills: SKILL_TREE.map(s => s.id), bosses: BOSSES.map(b => b.id) }
      })
      ACHIEVEMENTS.forEach(a => addAch(a.id))
      setCheatMsg('🏆 IWIN aktiviert! Alle Städte abgeschlossen.')
      setView('map')
    } else if (c === 'GODMODE') {
      setGodMode(g => !g)
      setCheatMsg(godMode ? '🛡️ GODMODE deaktiviert.' : '🛡️ GODMODE aktiviert! Alles wird beim ersten Try geschafft.')
    } else {
      setCheatMsg('❌ Unbekannter Cheat.')
    }
    setCheatInput('')
    setTimeout(() => setCheatMsg(''), 3000)
  }

  const completeLevel = useCallback((levelId) => {
    setProgress(p => {
      if (p.completed.includes(levelId)) return p
      const node = getNode(levelId)
      const newUnlocked = [...new Set([...p.unlocked, ...node.unlocks])]
      const newCompleted = [...p.completed, levelId]
      if (newCompleted.length >= MAP_NODES.length) addAch('world_complete')
      return { ...p, completed: newCompleted, unlocked: newUnlocked }
    })
    // Delay showing the overlay so player sees the level result first
    setTimeout(() => { SFX.level_complete(); setJustCompleted(levelId) }, 2500)
  }, [addAch])

  const [walkingTo, setWalkingTo] = useState(null)
  const walkAnimRef = useRef(null)
  const pathRefs = useRef({})
  const mapRef = useRef(null)

  const moveToNode = useCallback((nodeId) => {
    // Read current progress synchronously
    const p = progress
    const from = getNode(p.michiPos)
    const to = getNode(nodeId)
    if (!from || !to || from.id === to.id) {
      setProgress(prev => ({ ...prev, michiPos: nodeId }))
      return
    }

    // Find the SVG path element between these nodes
    const pathMatch = MAP_PATHS.find(([a, b]) => (a === from.id && b === to.id) || (b === from.id && a === to.id))
    if (!pathMatch) {
      setProgress(prev => ({ ...prev, michiPos: nodeId }))
      return
    }

    const key = `${pathMatch[0]}-${pathMatch[1]}`
    const svgPath = pathRefs.current[key]
    if (!svgPath) {
      setProgress(prev => ({ ...prev, michiPos: nodeId }))
      return
    }

    const reversed = pathMatch[0] !== from.id
    const totalLen = svgPath.getTotalLength()

    // Cancel any existing animation
    if (walkAnimRef.current) cancelAnimationFrame(walkAnimRef.current)

    setWalkingTo(nodeId)
    const duration = 1400
    const startTime = performance.now()
    const animate = (now) => {
      const raw = Math.min((now - startTime) / duration, 1)
      const t = raw * raw * (3 - 2 * raw) // smoothstep
      const dist = reversed ? totalLen * (1 - t) : totalLen * t
      const pt = svgPath.getPointAtLength(dist)
      // Convert SVG viewBox coords to CSS percentages
      const px = (pt.x / SVG_W) * 100
      const py = (pt.y / SVG_H) * 100
      const el = document.querySelector('.fun-michi-sprite')
      if (el) { el.style.left = `${px}%`; el.style.top = `${py}%` }
      if (raw < 1) {
        walkAnimRef.current = requestAnimationFrame(animate)
      } else {
        walkAnimRef.current = null
        setWalkingTo(null)
        setProgress(prev => ({ ...prev, michiPos: nodeId }))
      }
    }
    walkAnimRef.current = requestAnimationFrame(animate)
  }, [progress])

  // Level handlers
  const handleCharComplete = () => { addXp(50); addAch('char_select') }
  const handleSkillUnlock = (skill) => {
    setProgress(p => {
      const ns = [...p.skills, skill.id]
      if (ns.length >= 5) addAch('skill_5')
      if (ns.length >= SKILL_TREE.length) { addAch('skill_all'); completeLevel('hamburg') }
      return { ...p, skills: ns, xp: p.xp - skill.cost + 20 }
    })
  }
  const handlePitJumpDone = (dist) => {
    addXp(Math.min(dist, 50))
    setProgress(p => ({ ...p, runnerHigh: Math.max(p.runnerHigh, dist) }))
    completeLevel('essen')
  }
  const handleDialogDone = () => { addXp(30); addAch('scramble_win'); completeLevel('dortmund') }
  const handleMemoryWin = (moves) => {
    addAch('memory'); addXp(30); completeLevel('bochum')
    setProgress(p => ({ ...p, memoryBest: p.memoryBest ? Math.min(p.memoryBest, moves) : moves }))
  }
  const handleBossDefeat = (id, crit) => {
    if (crit) addAch('critical')
    setProgress(p => {
      if (p.bosses.includes(id)) return p
      const nb = [...p.bosses, id]
      addAch('boss_first')
      if (nb.length >= BOSSES.length) addAch('boss_all')
      return { ...p, bosses: nb, xp: p.xp + 40 }
    })
    // Complete Saarbrücken outside setProgress to avoid nested state update
    completeLevel('saarbruecken')
  }
  const handleRhythmDone = (score) => {
    if (score >= 100) addAch('rhythm_100')
    addXp(Math.floor(score / 5))
    if (score >= 80) completeLevel('osnabrueck')
    setProgress(p => ({ ...p, runnerHigh: Math.max(p.runnerHigh, score) }))
  }
  const handleDeckbuilderWin = () => { addXp(40); addAch('deckbuilder_win'); completeLevel('gdansk') }
  const handleSurvivorDone = (score) => { addXp(Math.min(score, 60)); completeLevel('bonus') }
  const handleBitTripDone = (score) => { addXp(Math.min(score, 60)); completeLevel('bonus2') }
  const handleFinalDone = () => { addXp(50); addAch('contact'); addAch('typer_win'); completeLevel('wroclaw'); setProgress(p => ({ ...p, contactUnlocked: true })) }

  const goMap = () => setView('map')
  const goToNextLevel = useCallback((currentLevelId) => {
    const node = getNode(currentLevelId)
    const nextId = node?.unlocks?.[0]
    // Show video interlude after certain cities
    const video = VIDEO_INTERLUDES[currentLevelId]
    if (video) {
      setVideoInterlude({ ...video, nextId })
      return
    }
    setView('map')
    if (nextId && progress.unlocked.includes(nextId)) {
      setTimeout(() => moveToNode(nextId), 600)
    }
  }, [progress.unlocked])
  const curNode = getNode(view.startsWith('story:') ? view.replace('story:', '') : view)

  return (
    <div className="fun-app">
      {/* TOP BAR */}
      <div className="fun-topbar">
        <span className="fun-logo">MW<span className="fun-dot">.</span>QUEST</span>
        <XPBar xp={progress.xp} onTripleClick={() => setShowCheat(s => !s)} />
        <div className="fun-topbar-right">
          {godMode && <span className="fun-godmode-badge">🛡️ GOD</span>}
          <MusicToggle />
          <button className="fun-btn-icon" onClick={() => setShowLB(true)}>📊</button>
          <button className="fun-btn-icon" onClick={() => setShowAch(true)}>🏆<span className="fun-badge">{progress.achievements.length}</span></button>
          <button className="fun-btn-icon" onClick={() => { if (window.confirm('Wirklich allen Fortschritt löschen?')) { localStorage.removeItem(SAVE_KEY); setProgress(loadProgress()); setView('map'); setJustCompleted(null) } }} title="Reset">🔄</button>
        </div>
      </div>

      {/* Floating back-to-normal button */}
      <button className="fun-float-back" onClick={onBack}>← Back to Normal</button>

      {/* CONTENT */}
      <div className="fun-content">
        <AnimatePresence mode="wait">
          {view === 'map' ? (
            <motion.div key="map" className="fun-map-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <WorldMap progress={progress} michiPos={progress.michiPos} onMoveToNode={moveToNode} onEnterLevel={id => setView('story:' + id)} walkingTo={walkingTo} pathRefs={pathRefs} />
            </motion.div>
          ) : view.startsWith('story:') ? (
            <motion.div key={view} className="fun-level-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <StoryIntro levelId={view.replace('story:', '')} onDone={() => setView(view.replace('story:', ''))} />
            </motion.div>
          ) : (
            <motion.div key={view} className="fun-level-wrap" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              {curNode && <LevelHeader node={curNode} onBack={goMap} />}
              {view === 'hamburg' && <LevelCharSelect onComplete={handleCharComplete} completed={progress.completed.includes('hamburg')} godMode={godMode} skills={progress.skills} xp={progress.xp} onUnlock={handleSkillUnlock} />}
              {view === 'essen' && <LevelPitJump onComplete={handlePitJumpDone} highScore={progress.runnerHigh} godMode={godMode} />}
              {view === 'dortmund' && <LevelDortmund onDialogDone={handleDialogDone} completed={progress.completed.includes('dortmund')} godMode={godMode} />}
              {view === 'bochum' && <LevelMemory onComplete={handleMemoryWin} best={progress.memoryBest} godMode={godMode} />}
              {view === 'saarbruecken' && <LevelBossBattle defeated={progress.bosses} onDefeat={handleBossDefeat} completed={progress.completed.includes('saarbruecken')} godMode={godMode} />}
              {view === 'osnabrueck' && <LevelRhythm onComplete={handleRhythmDone} highScore={progress.runnerHigh} godMode={godMode} />}
              {view === 'gdansk' && <LevelDeckbuilder onComplete={handleDeckbuilderWin} godMode={godMode} />}
              {view === 'bonus' && <LevelSurvivor onComplete={handleSurvivorDone} godMode={godMode} />}
              {view === 'bonus2' && <LevelBitTrip onComplete={handleBitTripDone} godMode={godMode} />}
              {view === 'wroclaw' && <LevelFinalBoss contactUnlocked={progress.contactUnlocked} onComplete={handleFinalDone} godMode={godMode} />}
              {justCompleted && justCompleted === view && justCompleted !== 'wroclaw' && (
                <LevelCompleteOverlay levelId={justCompleted} onContinue={() => { setJustCompleted(null); goToNextLevel(justCompleted) }} />
              )}
              {justCompleted === 'wroclaw' && view === 'wroclaw' && (
                <motion.div className="fun-level-complete" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <motion.div className="fun-level-complete-inner" initial={{ scale: 0.7, y: 30 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', damping: 12 }}>
                    <div className="fun-level-complete-icon">🏆</div>
                    <h3 className="fun-level-complete-title">Alle Level abgeschlossen!</h3>
                    <p className="fun-gold-text" style={{ fontSize: '1.1rem', margin: '1rem 0' }}>Du hast Michis Welt gemeistert!</p>
                    <div className="fun-contact-btns" style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center', flexWrap: 'wrap', margin: '1.5rem 0' }}>
                      <a href="https://www.schauspielervideos.de/fullprofile/michi-wischniowski.html" target="_blank" rel="noopener noreferrer" className="fun-btn">📋 Profil auf Schauspielervideos.de</a>
                      <a href="mailto:kontakt@michiwischniowski.de" className="fun-btn fun-btn-primary">📧 E-Mail an Michi</a>
                    </div>
                    <button className="fun-btn fun-btn-small" onClick={() => { setJustCompleted(null); setView('map') }}>🗺️ Zur Weltkarte</button>
                  </motion.div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AchSidebar achs={progress.achievements} show={showAch} onClose={() => setShowAch(false)} />
      <Leaderboard show={showLB} onClose={() => setShowLB(false)} progress={progress} />
      <div className="fun-popup-wrap">
        <AnimatePresence>{popup && <AchievementPopup key={popup.id} ach={popup} onDone={() => setPopup(null)} />}</AnimatePresence>
      </div>
      <AnimatePresence>
        {videoInterlude && <VideoInterlude data={videoInterlude} onClose={() => {
          const nextId = videoInterlude.nextId
          setVideoInterlude(null)
          setView('map')
          if (nextId) setTimeout(() => moveToNode(nextId), 600)
        }} />}
      </AnimatePresence>

      {/* Cheat Console */}
      <AnimatePresence>
        {showCheat && (
          <motion.div className="fun-cheat" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="fun-cheat-header">
              <span>🕹️ CHEAT CONSOLE</span>
              <button onClick={() => setShowCheat(false)}>✕</button>
            </div>
            <input className="fun-cheat-input" value={cheatInput} onChange={e => setCheatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') executeCheat(cheatInput) }}
              placeholder="Cheat eingeben..." autoFocus />
            <button className="fun-btn fun-btn-small" onClick={() => executeCheat(cheatInput)}>▶ Execute</button>
            {cheatMsg && <div className="fun-cheat-msg">{cheatMsg}</div>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
