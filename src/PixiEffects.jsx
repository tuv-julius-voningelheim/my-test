import { useRef, useEffect, useCallback } from 'react'
import { Application, Container, Graphics, Text, TextStyle, Ticker } from 'pixi.js'

/* ═══════════════════════════════════════
   PARTICLE SYSTEM (Canvas overlay)
   ═══════════════════════════════════════ */

class Particle {
  constructor(x, y, opts = {}) {
    this.x = x
    this.y = y
    this.vx = opts.vx ?? (Math.random() - 0.5) * 4
    this.vy = opts.vy ?? -Math.random() * 5 - 2
    this.life = opts.life ?? 1
    this.decay = opts.decay ?? 0.015 + Math.random() * 0.01
    this.size = opts.size ?? 3 + Math.random() * 4
    this.color = opts.color ?? [0, 255, 136]
    this.gravity = opts.gravity ?? 0.08
    this.shape = opts.shape ?? 'circle' // circle, star, spark
    this.rotation = Math.random() * Math.PI * 2
    this.rotSpeed = (Math.random() - 0.5) * 0.2
  }
  update() {
    this.x += this.vx
    this.y += this.vy
    this.vy += this.gravity
    this.life -= this.decay
    this.rotation += this.rotSpeed
    this.size *= 0.995
  }
  get dead() { return this.life <= 0 }
}

function drawStar(ctx, cx, cy, spikes, outerR, innerR) {
  let rot = Math.PI / 2 * 3, step = Math.PI / spikes
  ctx.beginPath()
  ctx.moveTo(cx, cy - outerR)
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR)
    rot += step
    ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR)
    rot += step
  }
  ctx.closePath()
}

/**
 * ParticleCanvas - Lightweight canvas overlay for particle effects
 * Usage: <ParticleCanvas ref={canvasRef} /> then call canvasRef.current.burst(x, y, opts)
 */
export function useParticleSystem() {
  const canvasRef = useRef(null)
  const particles = useRef([])
  const animRef = useRef(null)
  const running = useRef(false)

  const startLoop = useCallback(() => {
    if (running.current) return
    running.current = true
    const loop = () => {
      const canvas = canvasRef.current
      if (!canvas) { running.current = false; return }
      const ctx = canvas.getContext('2d')
      canvas.width = canvas.offsetWidth * (window.devicePixelRatio || 1)
      canvas.height = canvas.offsetHeight * (window.devicePixelRatio || 1)
      ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1)
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight)

      particles.current = particles.current.filter(p => {
        p.update()
        if (p.dead) return false

        ctx.save()
        ctx.globalAlpha = p.life
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)
        const [r, g, b] = p.color

        if (p.shape === 'star') {
          ctx.fillStyle = `rgb(${r},${g},${b})`
          drawStar(ctx, 0, 0, 5, p.size, p.size * 0.4)
          ctx.fill()
        } else if (p.shape === 'spark') {
          ctx.strokeStyle = `rgb(${r},${g},${b})`
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.moveTo(-p.size, 0)
          ctx.lineTo(p.size, 0)
          ctx.stroke()
        } else {
          ctx.fillStyle = `rgb(${r},${g},${b})`
          ctx.beginPath()
          ctx.arc(0, 0, p.size, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
        return true
      })

      if (particles.current.length > 0) {
        animRef.current = requestAnimationFrame(loop)
      } else {
        running.current = false
      }
    }
    animRef.current = requestAnimationFrame(loop)
  }, [])

  const burst = useCallback((x, y, opts = {}) => {
    const count = opts.count ?? 25
    const colors = opts.colors ?? [[0, 255, 136], [255, 215, 0], [255, 0, 255]]
    const shapes = opts.shapes ?? ['circle', 'star', 'spark']
    const spread = opts.spread ?? 6
    const upward = opts.upward ?? false

    for (let i = 0; i < count; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)]
      const shape = shapes[Math.floor(Math.random() * shapes.length)]
      particles.current.push(new Particle(x, y, {
        vx: (Math.random() - 0.5) * spread,
        vy: upward ? -Math.random() * 6 - 3 : (Math.random() - 0.5) * spread,
        color, shape,
        size: opts.size ?? 3 + Math.random() * 5,
        gravity: opts.gravity ?? 0.08,
        decay: opts.decay ?? 0.012 + Math.random() * 0.012,
        life: opts.life ?? 1,
      }))
    }
    startLoop()
  }, [startLoop])

  const trail = useCallback((x, y, opts = {}) => {
    const color = opts.color ?? [0, 255, 136]
    for (let i = 0; i < 3; i++) {
      particles.current.push(new Particle(x + (Math.random() - 0.5) * 8, y, {
        vx: (Math.random() - 0.5) * 1,
        vy: -Math.random() * 1.5,
        color,
        shape: 'circle',
        size: 1.5 + Math.random() * 2,
        gravity: -0.02,
        decay: 0.03,
        life: 0.6,
      }))
    }
    startLoop()
  }, [startLoop])

  const rain = useCallback((width, opts = {}) => {
    const colors = opts.colors ?? [[255, 215, 0], [255, 180, 0]]
    const count = opts.count ?? 40
    for (let i = 0; i < count; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)]
      setTimeout(() => {
        particles.current.push(new Particle(Math.random() * width, -10, {
          vx: (Math.random() - 0.5) * 1.5,
          vy: Math.random() * 2 + 1,
          color,
          shape: 'star',
          size: 3 + Math.random() * 4,
          gravity: 0.03,
          decay: 0.006,
          life: 1,
        }))
        startLoop()
      }, i * 30)
    }
  }, [startLoop])

  useEffect(() => {
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [])

  return { canvasRef, burst, trail, rain }
}

/**
 * ParticleOverlay - Position this absolutely over the game area
 */
export function ParticleOverlay({ canvasRef }) {
  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 50
      }}
    />
  )
}

/* ═══════════════════════════════════════
   SCREEN SHAKE HOOK
   ═══════════════════════════════════════ */
export function useScreenShake() {
  const ref = useRef(null)
  const shake = useCallback((intensity = 5, duration = 300) => {
    const el = ref.current
    if (!el) return
    const start = Date.now()
    const loop = () => {
      const elapsed = Date.now() - start
      if (elapsed > duration) { el.style.transform = ''; return }
      const decay = 1 - elapsed / duration
      const x = (Math.random() - 0.5) * intensity * 2 * decay
      const y = (Math.random() - 0.5) * intensity * 2 * decay
      el.style.transform = `translate(${x}px, ${y}px)`
      requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
  }, [])
  return { shakeRef: ref, shake }
}

/* ═══════════════════════════════════════
   FLOATING DAMAGE / TEXT
   ═══════════════════════════════════════ */
export function FloatingText({ text, color = '#ffd700', x = '50%', y = '40%', onDone }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let frame = 0
    const anim = () => {
      frame++
      el.style.transform = `translate(-50%, -${frame * 1.5}px) scale(${1 + frame * 0.008})`
      el.style.opacity = Math.max(0, 1 - frame / 50)
      if (frame < 50) requestAnimationFrame(anim)
      else onDone?.()
    }
    requestAnimationFrame(anim)
  }, [onDone])

  return (
    <div ref={ref} style={{
      position: 'absolute', left: x, top: y, zIndex: 60,
      fontFamily: "'Press Start 2P', monospace", fontSize: '1.2rem',
      color, textShadow: `0 0 10px ${color}, 0 0 20px ${color}`,
      pointerEvents: 'none', whiteSpace: 'nowrap',
    }}>
      {text}
    </div>
  )
}

/* ═══════════════════════════════════════
   COMBO METER (visual bar)
   ═══════════════════════════════════════ */
export function ComboMeter({ combo, maxCombo = 10 }) {
  const pct = Math.min((combo / maxCombo) * 100, 100)
  const hot = combo >= 5
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.5rem',
      fontFamily: "'Press Start 2P', monospace", fontSize: '0.6rem',
    }}>
      <span style={{ color: hot ? '#ff4444' : '#ffd700' }}>
        🔥 {combo}x
      </span>
      <div style={{
        width: 120, height: 8, background: 'rgba(255,255,255,0.1)',
        borderRadius: 4, overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: hot
            ? 'linear-gradient(90deg, #ff4444, #ff8800, #ffff00)'
            : 'linear-gradient(90deg, #ffd700, #ffaa00)',
          transition: 'width 0.2s',
          boxShadow: hot ? '0 0 8px rgba(255,68,68,0.6)' : 'none',
        }} />
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════
   RUNNER BACKGROUND SCROLLER
   ═══════════════════════════════════════ */
export function RunnerBackground({ speed = 1, children }) {
  const ref = useRef(null)
  const offset = useRef(0)

  useEffect(() => {
    let frame
    const loop = () => {
      offset.current = (offset.current + speed) % 200
      if (ref.current) {
        ref.current.style.backgroundPosition = `${-offset.current}px 0`
      }
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [speed])

  return (
    <div ref={ref} style={{
      width: '100%', height: '100%', position: 'relative',
      backgroundImage: `
        repeating-linear-gradient(90deg, transparent 0px, transparent 198px, rgba(0,255,136,0.06) 198px, rgba(0,255,136,0.06) 200px),
        repeating-linear-gradient(0deg, transparent 0px, transparent 48px, rgba(0,255,136,0.04) 48px, rgba(0,255,136,0.04) 50px)
      `,
      backgroundSize: '200px 50px',
    }}>
      {children}
    </div>
  )
}
