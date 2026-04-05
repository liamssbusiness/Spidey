'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Globe, Pause, Play, FastForward } from 'lucide-react'

// World dimensions
const COLS = 200
const ROWS = 100
const TILE = 8

// Time: 1 real minute = 1000 game years
const GAME_YEARS_PER_TICK = 1000 / 3600 // per second at 60fps

const GAME_START = -10000

const ERAS = [
  { name: 'Prehistoric',  start: -10000, color: '#6b4c2a' },
  { name: 'Neolithic',    start: -8000,  color: '#7a6a3a' },
  { name: 'Bronze Age',   start: -3000,  color: '#b08030' },
  { name: 'Iron Age',     start: -1200,  color: '#808080' },
  { name: 'Classical',    start: -500,   color: '#c8a840' },
  { name: 'Medieval',     start: 500,    color: '#5a7a3a' },
  { name: 'Renaissance',  start: 1300,   color: '#c07840' },
  { name: 'Industrial',   start: 1760,   color: '#606070' },
  { name: 'Modern',       start: 1900,   color: '#4080c0' },
  { name: 'Digital',      start: 1970,   color: '#4040c0' },
  { name: 'Spacefaring',  start: 2050,   color: '#40a0e0' },
  { name: 'Post-Human',   start: 2200,   color: '#a040e0' },
  { name: 'Transcendent', start: 2500,   color: '#ff80ff' },
]

const CIV_NAMES = [
  'Solari','Umbra','Veran','Koreth','Aelun','Dravik',
  'Myrra','Thane','Orvex','Selik','Fynar','Zydon',
]

const CIV_COLORS = [
  '#e84040','#4080e8','#40c840','#e8a000','#a040e8',
  '#e84080','#00c8c8','#e86020','#80e840','#c840c8',
  '#00a0e8','#e8e040',
]

function getSeason(): 'spring' | 'summer' | 'autumn' | 'winter' {
  const m = new Date().getMonth()
  if (m >= 2 && m <= 4) return 'spring'
  if (m >= 5 && m <= 7) return 'summer'
  if (m >= 8 && m <= 10) return 'autumn'
  return 'winter'
}

function getEra(year: number) {
  for (let i = ERAS.length - 1; i >= 0; i--) {
    if (year >= ERAS[i].start) return ERAS[i]
  }
  return ERAS[0]
}

function hash(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) | 0
  h = (h ^ (h >> 13)) | 0
  h = (Math.imul(h, 1274126177)) | 0
  return (h ^ (h >> 16)) & 0x7fffffff
}

function generateHeightmap(): Float32Array {
  const map = new Float32Array(COLS * ROWS)
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      let v = 0
      v += Math.sin(x * 0.04 + 1.2) * Math.cos(y * 0.05 + 0.7) * 0.5
      v += Math.sin(x * 0.09 + 2.3) * Math.cos(y * 0.11 + 1.1) * 0.25
      v += Math.sin(x * 0.18 + 0.5) * Math.cos(y * 0.22 + 2.0) * 0.125
      v += Math.sin(x * 0.35 + 3.1) * Math.cos(y * 0.41 + 0.3) * 0.0625
      v += (hash(x, y) / 0x7fffffff - 0.5) * 0.15
      // continent bias: pull edges toward water
      const ex = Math.abs(x / COLS - 0.5) * 2
      const ey = Math.abs(y / ROWS - 0.5) * 2
      v -= Math.max(ex, ey) * 0.4
      map[y * COLS + x] = v
    }
  }
  return map
}

interface Particle {
  x: number; y: number; vx: number; vy: number
  life: number; maxLife: number; color: string; size: number
}

interface Event {
  year: number; text: string; color: string
}

interface Civ {
  id: number; name: string; color: string
  x: number; y: number; pop: number; alive: boolean
  era: number; techs: number; gold: number
  warWith: number | null; warTimer: number
  goldenAge: number; collapseTimer: number
}

export default function CivSimWidget() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef({
    heightmap: generateHeightmap(),
    civs: [] as Civ[],
    particles: [] as Particle[],
    events: [] as Event[],
    gameYear: GAME_START,
    paused: false,
    speed: 1,
    camX: 0,
    camY: 0,
    dragging: false,
    dragStart: { x: 0, y: 0, camX: 0, camY: 0 },
    frame: 0,
    nextCivId: 0,
    terrainCache: null as ImageData | null,
    lastSeason: getSeason(),
  })
  const rafRef = useRef<number>(0)
  const [displayYear, setDisplayYear] = useState(GAME_START)
  const [displayEra, setDisplayEra] = useState(ERAS[0].name)
  const [displayEvents, setDisplayEvents] = useState<Event[]>([])
  const [paused, setPaused] = useState(false)
  const [speed, setSpeed] = useState(1)

  // Spawn a new civ at a habitable land tile
  const spawnCiv = useCallback((s: typeof stateRef.current) => {
    if (s.civs.filter(c => c.alive).length >= 12) return
    const id = s.nextCivId++
    const name = CIV_NAMES[id % CIV_NAMES.length]
    const color = CIV_COLORS[id % CIV_COLORS.length]
    // find a valid land tile not too close to others
    for (let attempt = 0; attempt < 200; attempt++) {
      const x = Math.floor(Math.random() * COLS)
      const y = Math.floor(Math.random() * ROWS)
      const h = s.heightmap[y * COLS + x]
      if (h < 0.05) continue // water
      const tooClose = s.civs.some(c => c.alive && Math.hypot(c.x - x, c.y - y) < 15)
      if (tooClose) continue
      s.civs.push({ id, name, color, x, y, pop: 10 + Math.random() * 20, alive: true, era: 0, techs: 0, gold: 0, warWith: null, warTimer: 0, goldenAge: 0, collapseTimer: 0 })
      addEvent(s, s.gameYear, `${name} founded`, color)
      return
    }
  }, [])

  function addEvent(s: typeof stateRef.current, year: number, text: string, color: string) {
    s.events.unshift({ year: Math.round(year), text, color })
    if (s.events.length > 8) s.events.length = 8
  }

  function spawnParticles(s: typeof stateRef.current, x: number, y: number, color: string, count: number, type: 'war' | 'tech' | 'golden' | 'collapse') {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const spd = type === 'war' ? 1.5 + Math.random() : 0.5 + Math.random() * 0.8
      s.particles.push({
        x: x * TILE + TILE / 2,
        y: y * TILE + TILE / 2,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: 1, maxLife: 1,
        color,
        size: type === 'war' ? 2 : 1.5,
      })
    }
  }

  function buildTerrainCache(s: typeof stateRef.current, width: number, height: number): ImageData {
    const data = new ImageData(width, height)
    const season = getSeason()
    const { heightmap } = s

    for (let ty = 0; ty < ROWS; ty++) {
      for (let tx = 0; tx < COLS; tx++) {
        const h = heightmap[ty * COLS + tx]
        let r: number, g: number, b: number

        if (h < -0.1) { r=20; g=40; b=120 }          // deep ocean
        else if (h < 0.05) { r=30; g=60; b=150 }      // shallow water
        else if (h < 0.12) {                            // beach
          r=210; g=190; b=140
        } else if (h < 0.5) {                           // land — season tint
          if (season === 'spring') { r=80; g=160; b=60 }
          else if (season === 'summer') { r=60; g=140; b=40 }
          else if (season === 'autumn') { r=160; g=100; b=30 }
          else { r=180; g=190; b=210 } // winter
        } else if (h < 0.7) {                           // highlands
          r=100; g=90; b=70
        } else {                                         // mountains
          if (season === 'winter') { r=230; g=235; b=240 }
          else { r=180; g=175; b=170 }
        }

        const px = tx * TILE
        const py = ty * TILE
        for (let dy = 0; dy < TILE; dy++) {
          for (let dx = 0; dx < TILE; dx++) {
            const i = ((py + dy) * width + (px + dx)) * 4
            data.data[i] = r
            data.data[i+1] = g
            data.data[i+2] = b
            data.data[i+3] = 255
          }
        }
      }
    }
    return data
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const s = stateRef.current

    // Init civs
    for (let i = 0; i < 3; i++) spawnCiv(s)

    function tick(dt: number) {
      if (s.paused) return
      const years = GAME_YEARS_PER_TICK * dt * s.speed
      s.gameYear += years
      s.frame++

      const aliveCivs = s.civs.filter(c => c.alive)

      // Spawn new civs occasionally
      const eraIdx = ERAS.findIndex(e => e.name === getEra(s.gameYear).name)
      const maxCivs = Math.min(3 + Math.floor(eraIdx * 1.2), 12)
      if (aliveCivs.length < maxCivs && Math.random() < 0.002 * s.speed) {
        spawnCiv(s)
      }

      // Update civs
      for (const civ of s.civs) {
        if (!civ.alive) continue

        // Growth
        const baseGrowth = 0.002 * (1 + civ.techs * 0.1)
        civ.pop += civ.pop * baseGrowth * s.speed
        civ.gold += 0.1 * s.speed

        // Tech discoveries
        if (Math.random() < 0.0003 * s.speed) {
          civ.techs++
          civ.goldenAge = 300
          addEvent(s, s.gameYear, `${civ.name}: new discovery`, civ.color)
          spawnParticles(s, civ.x, civ.y, '#ffff80', 8, 'tech')
        }

        // Golden age
        if (civ.goldenAge > 0) {
          civ.goldenAge -= s.speed
          civ.pop += 0.05 * s.speed
          if (s.frame % 3 === 0) spawnParticles(s, civ.x, civ.y, civ.color, 1, 'golden')
        }

        // Wander slowly
        if (Math.random() < 0.001 * s.speed) {
          civ.x = Math.max(1, Math.min(COLS - 2, civ.x + Math.round((Math.random() - 0.5) * 3)))
          civ.y = Math.max(1, Math.min(ROWS - 2, civ.y + Math.round((Math.random() - 0.5) * 3)))
        }

        // War
        if (civ.warWith === null && Math.random() < 0.0002 * s.speed) {
          const targets = aliveCivs.filter(c => c.id !== civ.id && c.warWith === null && Math.hypot(c.x - civ.x, c.y - civ.y) < 50)
          if (targets.length > 0) {
            const target = targets[Math.floor(Math.random() * targets.length)]
            civ.warWith = target.id
            target.warWith = civ.id
            civ.warTimer = 200 + Math.random() * 400
            target.warTimer = civ.warTimer
            addEvent(s, s.gameYear, `${civ.name} vs ${target.name}`, '#ff4040')
          }
        }

        if (civ.warWith !== null) {
          civ.warTimer -= s.speed
          const enemy = s.civs.find(c => c.id === civ.warWith)
          if (enemy && enemy.alive) {
            // war damage
            civ.pop -= 0.005 * s.speed
            enemy.pop -= 0.005 * s.speed
            if (s.frame % 5 === 0) {
              const mx = (civ.x + enemy.x) / 2
              const my = (civ.y + enemy.y) / 2
              spawnParticles(s, mx, my, '#ff2020', 2, 'war')
            }
            // resolve war
            if (civ.warTimer <= 0) {
              const winner = civ.pop > enemy.pop ? civ : enemy
              const loser = winner === civ ? enemy : civ
              addEvent(s, s.gameYear, `${winner.name} defeated ${loser.name}`, winner.color)
              winner.gold += loser.gold * 0.5
              winner.pop += loser.pop * 0.2
              loser.pop *= 0.3
              civ.warWith = null
              enemy.warWith = null
              if (loser.pop < 5) {
                loser.alive = false
                loser.collapseTimer = 60
                addEvent(s, s.gameYear, `${loser.name} collapsed`, '#888')
                spawnParticles(s, loser.x, loser.y, '#888888', 12, 'collapse')
              }
            }
          } else {
            civ.warWith = null
          }
        }

        // Collapse from overpopulation or stagnation
        if (civ.pop > 5000) civ.pop = 5000
        if (civ.pop < 1 && civ.alive) {
          civ.alive = false
          addEvent(s, s.gameYear, `${civ.name} fell`, '#666')
          spawnParticles(s, civ.x, civ.y, '#666666', 10, 'collapse')
        }
      }

      // Update particles
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i]
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.02
        p.life -= 0.025 * s.speed
        if (p.life <= 0) s.particles.splice(i, 1)
      }
    }

    function draw(ctx: CanvasRenderingContext2D) {
      const canvas = canvasRef.current
      if (!canvas) return
      const width = canvas.width
      const height = canvas.height

      // Rebuild terrain cache if season changed or not built
      const season = getSeason()
      if (!s.terrainCache || season !== s.lastSeason) {
        s.terrainCache = buildTerrainCache(s, COLS * TILE, ROWS * TILE)
        s.lastSeason = season
      }

      ctx.clearRect(0, 0, width, height)

      // Camera clamp
      const maxCamX = COLS * TILE - width
      const maxCamY = ROWS * TILE - height
      s.camX = Math.max(0, Math.min(maxCamX > 0 ? maxCamX : 0, s.camX))
      s.camY = Math.max(0, Math.min(maxCamY > 0 ? maxCamY : 0, s.camY))

      ctx.save()
      ctx.translate(-s.camX, -s.camY)

      // Draw terrain from cache
      const offscreen = document.createElement('canvas')
      offscreen.width = COLS * TILE
      offscreen.height = ROWS * TILE
      const offCtx = offscreen.getContext('2d')!
      offCtx.putImageData(s.terrainCache, 0, 0)
      ctx.drawImage(offscreen, 0, 0)

      // Era overlay tint (very subtle)
      const era = getEra(s.gameYear)
      ctx.fillStyle = era.color + '18'
      ctx.fillRect(0, 0, COLS * TILE, ROWS * TILE)

      // Draw civilizations
      for (const civ of s.civs) {
        const px = civ.x * TILE
        const py = civ.y * TILE
        const radius = Math.max(3, Math.min(30, Math.sqrt(civ.pop) * 0.8))

        if (civ.alive) {
          // Glow for golden age
          if (civ.goldenAge > 0) {
            ctx.beginPath()
            ctx.arc(px + TILE/2, py + TILE/2, radius + 6, 0, Math.PI * 2)
            ctx.fillStyle = civ.color + '40'
            ctx.fill()
          }

          // Main circle
          ctx.beginPath()
          ctx.arc(px + TILE/2, py + TILE/2, radius, 0, Math.PI * 2)
          ctx.fillStyle = civ.color + 'cc'
          ctx.fill()
          ctx.strokeStyle = '#ffffff40'
          ctx.lineWidth = 1
          ctx.stroke()

          // War indicator
          if (civ.warWith !== null) {
            const enemy = s.civs.find(c => c.id === civ.warWith)
            if (enemy && enemy.alive) {
              ctx.beginPath()
              ctx.moveTo(px + TILE/2, py + TILE/2)
              ctx.lineTo(enemy.x * TILE + TILE/2, enemy.y * TILE + TILE/2)
              ctx.strokeStyle = '#ff202060'
              ctx.lineWidth = 1
              ctx.setLineDash([4, 4])
              ctx.stroke()
              ctx.setLineDash([])
            }
          }

          // Name label (only when zoomed in enough or large civ)
          if (radius > 8) {
            ctx.fillStyle = '#ffffffcc'
            ctx.font = `bold ${Math.min(9, radius * 0.7)}px monospace`
            ctx.textAlign = 'center'
            ctx.fillText(civ.name, px + TILE/2, py + TILE/2 - radius - 2)
          }
        }
      }

      // Draw particles
      for (const p of s.particles) {
        const alpha = Math.floor(p.life * 255).toString(16).padStart(2, '0')
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2)
        ctx.fillStyle = p.color + alpha
        ctx.fill()
      }

      ctx.restore()
    }

    let last = performance.now()
    function loop(now: number) {
      const dt = Math.min((now - last) / 1000, 0.1) * 60 // normalize to 60fps units
      last = now
      tick(dt)
      draw(ctx as CanvasRenderingContext2D)

      // Update React state every ~30 frames to avoid too many re-renders
      if (s.frame % 30 === 0) {
        setDisplayYear(Math.round(s.gameYear))
        setDisplayEra(getEra(s.gameYear).name)
        setDisplayEvents([...s.events])
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [spawnCiv])

  // Canvas resize observer
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        canvas.width = entry.contentRect.width
        canvas.height = entry.contentRect.height
        stateRef.current.terrainCache = null // invalidate cache on resize
      }
    })
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [])

  // Mouse pan
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const s = stateRef.current
    s.dragging = true
    s.dragStart = { x: e.clientX, y: e.clientY, camX: s.camX, camY: s.camY }
  }, [])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const s = stateRef.current
    if (!s.dragging) return
    s.camX = s.dragStart.camX - (e.clientX - s.dragStart.x)
    s.camY = s.dragStart.camY - (e.clientY - s.dragStart.y)
  }, [])

  const onMouseUp = useCallback(() => {
    stateRef.current.dragging = false
  }, [])

  const togglePause = () => {
    stateRef.current.paused = !stateRef.current.paused
    setPaused(p => !p)
  }

  const cycleSpeed = () => {
    const speeds = [1, 2, 5]
    const next = speeds[(speeds.indexOf(stateRef.current.speed) + 1) % speeds.length]
    stateRef.current.speed = next
    setSpeed(next)
  }

  const yearLabel = (y: number) => {
    if (y < 0) return `${Math.abs(y).toLocaleString()} BC`
    return `${y.toLocaleString()} AD`
  }

  const era = getEra(displayYear)

  return (
    <div className="glass rounded-xl flex flex-col overflow-hidden h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border shrink-0">
        <div className="w-5 h-5 rounded-md bg-gold/10 flex items-center justify-center">
          <Globe size={11} className="text-gold" />
        </div>
        <span className="text-xs font-semibold text-text tracking-wide">Civilization</span>
        <div className="flex-1" />
        <span className="text-[10px] font-mono text-gold">{yearLabel(displayYear)}</span>
        <span
          className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
          style={{ background: era.color + '30', color: era.color }}
        >
          {displayEra}
        </span>
        <button
          onClick={togglePause}
          className="w-6 h-6 rounded flex items-center justify-center text-text-dim hover:text-text transition-colors"
          title={paused ? 'Play' : 'Pause'}
        >
          {paused ? <Play size={11} /> : <Pause size={11} />}
        </button>
        <button
          onClick={cycleSpeed}
          className="flex items-center gap-0.5 text-[10px] text-text-dim hover:text-gold transition-colors px-1.5 py-0.5 rounded"
          title="Speed"
        >
          <FastForward size={10} />
          {speed}x
        </button>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden min-h-0">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ cursor: 'grab', display: 'block' }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        />

        {/* Event log overlay */}
        <div className="absolute bottom-2 left-2 flex flex-col gap-0.5 pointer-events-none">
          {displayEvents.slice(0, 5).map((ev, i) => (
            <div
              key={i}
              className="text-[9px] font-mono px-1.5 py-0.5 rounded"
              style={{
                background: '#00000080',
                color: ev.color,
                opacity: 1 - i * 0.18,
              }}
            >
              {yearLabel(ev.year)} · {ev.text}
            </div>
          ))}
        </div>

        {/* Season badge */}
        <div className="absolute top-2 right-2 text-[10px] text-text-dim bg-black/40 px-2 py-0.5 rounded font-mono pointer-events-none">
          {getSeason()}
        </div>
      </div>
    </div>
  )
}
