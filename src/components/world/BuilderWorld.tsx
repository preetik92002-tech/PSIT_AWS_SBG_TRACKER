import React, { useRef, useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ZoomIn, ZoomOut, Maximize2, Star } from 'lucide-react'
import { VoxelCharacter } from './VoxelCharacter'
import type { Member } from '@/types'
import { clamp, getLevelProgress } from '@/utils/cn'

// ─── World layout ──────────────────────────────────────────────────────────

const WORLD_W = 1060
const WORLD_H = 620
const COL_W   = 185
const ROW_H   = 155
const ROWS    = 4
const COLS    = 5
const ORIGIN_X = 55
const ORIGIN_Y = 40

function computePositions(count: number): Array<{ x: number; y: number }> {
  return Array.from({ length: count }, (_, i) => {
    const row = Math.floor(i / COLS)
    const col = i % COLS
    const offset = row % 2 === 0 ? 0 : COL_W / 2
    return {
      x: ORIGIN_X + col * COL_W + offset,
      y: ORIGIN_Y + row * ROW_H,
    }
  })
}

// ─── Platform tile ────────────────────────────────────────────────────────

const Platform: React.FC<{ isHovered: boolean; color?: string }> = ({ isHovered, color }) => (
  <div className="flex flex-col items-center" style={{ marginTop: 2 }}>
    {/* Top face */}
    <div
      style={{
        width: 90,
        height: 18,
        background: isHovered ? (color ?? 'var(--accent-dim)') : 'var(--world-platform)',
        border: `1px solid ${isHovered ? (color ?? 'var(--accent)') : 'var(--world-platform-border)'}`,
        borderBottom: 'none',
        transition: 'background 0.2s, border-color 0.2s',
      }}
    />
    {/* Front face */}
    <div
      style={{
        width: 90,
        height: 10,
        background: 'var(--world-platform-face)',
        border: '1px solid var(--world-platform-border)',
        borderTop: 'none',
      }}
    />
  </div>
)

// ─── AWS service decorations ──────────────────────────────────────────────

const DECORATIONS = [
  { x: 920, y: 60,  label: 'λ Lambda',    color: '#f97316' },
  { x: 920, y: 200, label: '□ S3',         color: '#22c55e' },
  { x: 920, y: 340, label: '◈ DynamoDB',   color: '#3b82f6' },
  { x: 920, y: 480, label: '⬡ ECS',        color: '#8b5cf6' },
  { x: 20,  y: 60,  label: '⚡ API GW',    color: '#f97316' },
  { x: 20,  y: 200, label: '◉ CloudFront', color: '#06b6d4' },
  { x: 20,  y: 340, label: '⊕ IAM',        color: '#ef4444' },
  { x: 20,  y: 480, label: '◎ Bedrock',    color: '#a855f7' },
]

// ─── Character tooltip ────────────────────────────────────────────────────

const CharTooltip: React.FC<{ member: Member }> = ({ member }) => {
  const { progress } = getLevelProgress(member.xp)
  return (
    <motion.div
      className="world-tooltip"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.12 }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-mono font-bold text-[11px] text-text-primary">{member.name}</span>
        <span className="level-pip">Lv.{member.level}</span>
      </div>
      <div className="font-mono text-[9px] text-text-secondary mb-2 truncate-1">
        {member.currentTopic}
      </div>
      {/* XP bar */}
      <div className="mb-1.5">
        <div className="flex justify-between mb-0.5">
          <span className="font-mono text-[8px] text-text-muted">XP</span>
          <span className="font-mono text-[8px] text-accent-bright">+{member.weeklyXp} wk</span>
        </div>
        <div className="xp-bar">
          <div className="xp-bar-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className="flex items-center gap-1">
        <span className="font-mono text-[8px] text-accent-secondary">🔥 {member.streak}d streak</span>
        {member.role === 'leader' && (
          <span className="ml-auto font-mono text-[8px] text-yellow-400">★ Leader</span>
        )}
      </div>
    </motion.div>
  )
}

// ─── Member profile modal content ─────────────────────────────────────────

export const MemberProfileContent: React.FC<{ member: Member }> = ({ member }) => {
  const { progress } = getLevelProgress(member.xp)
  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex gap-4 items-start">
        <div className="flex-shrink-0 flex flex-col items-center gap-2">
          <VoxelCharacter {...member.appearance} width={80} height={110} />
          <div className="flex flex-col items-center gap-1">
            <span className="level-pip">Lv.{member.level}</span>
            {member.role === 'leader' && (
              <span className="font-mono text-[8px] text-yellow-400 flex items-center gap-0.5">
                <Star size={8} />Leader
              </span>
            )}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-mono font-bold text-base text-text-primary">{member.name}</h3>
          <p className="font-mono text-[11px] text-accent">@{member.username}</p>
          {member.bio && (
            <p className="text-[11px] text-text-secondary mt-1.5 leading-relaxed">{member.bio}</p>
          )}
          <div className="mt-3">
            <div className="flex justify-between mb-1">
              <span className="font-mono text-[10px] text-text-muted">Level progress</span>
              <span className="font-mono text-[10px] text-accent-bright">{progress.toFixed(0)}%</span>
            </div>
            <div className="xp-bar h-[4px]">
              <div className="xp-bar-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Total XP',   value: member.totalXp.toLocaleString() },
          { label: 'Streak',     value: `${member.streak}d` },
          { label: 'Projects',   value: member.projects.length },
        ].map(s => (
          <div key={s.label} className="bg-surface-secondary border border-border p-2 text-center">
            <div className="font-mono font-bold text-sm text-text-primary">{s.value}</div>
            <div className="font-mono text-[9px] text-text-muted mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Current topic */}
      <div className="bg-surface-secondary border border-border p-3">
        <div className="font-mono text-[9px] text-text-muted uppercase tracking-wider mb-1">
          Currently learning
        </div>
        <div className="font-mono text-[12px] text-accent-bright">{member.currentTopic}</div>
      </div>

      {/* AWS Services */}
      <div>
        <div className="font-mono text-[9px] text-text-muted uppercase tracking-wider mb-2">
          AWS Services
        </div>
        <div className="flex flex-wrap gap-1.5">
          {member.awsServices.map(svc => (
            <span
              key={svc}
              className="font-mono text-[9px] px-2 py-0.5 bg-accent-secondary/10 border border-accent-secondary/20 text-accent-secondary"
            >
              {svc}
            </span>
          ))}
        </div>
      </div>

      {/* Skills */}
      <div>
        <div className="font-mono text-[9px] text-text-muted uppercase tracking-wider mb-2">
          Skills
        </div>
        <div className="space-y-2">
          {member.skills.map(skill => (
            <div key={skill.name}>
              <div className="flex justify-between mb-0.5">
                <span className="font-mono text-[10px] text-text-secondary">{skill.name}</span>
                <span className="font-mono text-[10px] text-text-muted">{skill.level}/5</span>
              </div>
              <div className="xp-bar h-[3px]">
                <div className="xp-bar-fill" style={{ width: `${(skill.level / 5) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Achievements */}
      {member.achievements.length > 0 && (
        <div>
          <div className="font-mono text-[9px] text-text-muted uppercase tracking-wider mb-2">
            Achievements
          </div>
          <div className="flex flex-wrap gap-1.5">
            {member.achievements.map(a => (
              <div
                key={a.id}
                className="flex items-center gap-1 px-2 py-1 bg-surface-secondary border border-border"
                title={a.description}
              >
                <span className="text-sm">{a.icon}</span>
                <span className="font-mono text-[9px] text-text-secondary">{a.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Builder World main component ─────────────────────────────────────────

interface BuilderWorldProps {
  members: Member[]
  onSelectMember: (member: Member) => void
}

export const BuilderWorld: React.FC<BuilderWorldProps> = ({ members, onSelectMember }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale]       = useState(1)
  const [offset, setOffset]     = useState({ x: 0, y: 0 })
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const isDragging = useRef(false)
  const dragStart  = useRef({ x: 0, y: 0, ox: 0, oy: 0 })

  const positions = useMemo(() => computePositions(members.length), [members.length])

  // ── Pan handlers ──────────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-char]')) return
    isDragging.current = true
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }
    e.currentTarget.setAttribute('data-dragging', 'true')
  }, [offset])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    setOffset({ x: dragStart.current.ox + dx, y: dragStart.current.oy + dy })
  }, [])

  const onMouseUp = useCallback((e: React.MouseEvent) => {
    isDragging.current = false
    e.currentTarget.removeAttribute('data-dragging')
  }, [])

  const onMouseLeaveContainer = useCallback(() => {
    isDragging.current = false
  }, [])

  // ── Zoom ──────────────────────────────────────────────────────────
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setScale(s => clamp(s * delta, 0.45, 2))
  }, [])

  const zoom = (dir: 1 | -1) => {
    setScale(s => clamp(s + dir * 0.15, 0.45, 2))
  }

  const resetView = () => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }

  return (
    <div className="relative w-full" style={{ height: 530 }}>
      {/* Canvas */}
      <div
        ref={containerRef}
        className="world-canvas-bg w-full h-full overflow-hidden select-none"
        style={{ cursor: isDragging.current ? 'grabbing' : 'grab' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeaveContainer}
        onWheel={onWheel}
      >
        {/* World inner canvas */}
        <div
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: '50% 50%',
            width: WORLD_W,
            height: WORLD_H,
            position: 'absolute',
            top: '50%',
            left: '50%',
            marginLeft: -WORLD_W / 2,
            marginTop: -WORLD_H / 2,
            willChange: 'transform',
          }}
        >
          {/* AWS service decorations */}
          {DECORATIONS.map((d, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: d.x,
                top:  d.y,
                color: d.color,
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 10,
                fontWeight: 600,
                opacity: 0.55,
                letterSpacing: '0.05em',
                pointerEvents: 'none',
                userSelect: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              {d.label}
            </div>
          ))}

          {/* Characters */}
          {members.map((member, i) => {
            const pos = positions[i]
            const isHovered = hoveredId === member.id

            return (
              <div
                key={member.id}
                data-char="true"
                style={{
                  position: 'absolute',
                  left: pos.x,
                  top:  pos.y,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
                onMouseEnter={() => setHoveredId(member.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => onSelectMember(member)}
              >
                <motion.div
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}
                  animate={{ scale: isHovered ? 1.07 : 1, y: isHovered ? -4 : 0 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 26 }}
                >
                  {/* Tooltip */}
                  <AnimatePresence>
                    {isHovered && <CharTooltip member={member} />}
                  </AnimatePresence>

                  {/* Weekly XP spark above character */}
                  {member.weeklyXp > 0 && (
                    <div
                      style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: 9,
                        color: 'var(--success)',
                        marginBottom: 2,
                        opacity: isHovered ? 0 : 0.8,
                        transition: 'opacity 0.15s',
                        pointerEvents: 'none',
                      }}
                    >
                      +{member.weeklyXp} XP
                    </div>
                  )}

                  {/* Character SVG */}
                  <VoxelCharacter
                    {...member.appearance}
                    width={70}
                    height={106}
                  />

                  {/* Platform */}
                  <Platform isHovered={isHovered} />

                  {/* Name label */}
                  <div
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 10,
                      fontWeight: 600,
                      color: isHovered ? 'var(--text-primary)' : 'var(--text-secondary)',
                      marginTop: 4,
                      letterSpacing: '-0.01em',
                      transition: 'color 0.15s',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {member.name}
                  </div>

                  {/* Level pip */}
                  <div className="level-pip" style={{ marginTop: 2 }}>
                    Lv.{member.level}
                  </div>

                  {/* Streak dots */}
                  <div style={{ display: 'flex', gap: 2, marginTop: 3 }}>
                    {Array.from({ length: Math.min(7, member.streak) }).map((_, j) => (
                      <div
                        key={j}
                        style={{
                          width: 4,
                          height: 4,
                          background: j < member.streak ? 'var(--accent-secondary)' : 'var(--border)',
                          opacity: j < member.streak ? 1 : 0.3,
                        }}
                      />
                    ))}
                  </div>
                </motion.div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Controls overlay ── */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1.5">
        <button className="zoom-btn" onClick={() => zoom(1)} title="Zoom in">
          <ZoomIn size={13} />
        </button>
        <button className="zoom-btn" onClick={() => zoom(-1)} title="Zoom out">
          <ZoomOut size={13} />
        </button>
        <button className="zoom-btn" onClick={resetView} title="Reset view">
          <Maximize2 size={13} />
        </button>
      </div>

      {/* Scale indicator */}
      <div
        className="absolute bottom-3 left-3"
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 9,
          color: 'var(--text-muted)',
          pointerEvents: 'none',
        }}
      >
        {(scale * 100).toFixed(0)}% · scroll to zoom · drag to pan
      </div>

      {/* Top-right: member count */}
      <div
        className="absolute top-3 right-3"
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 9,
          color: 'var(--text-muted)',
          background: 'rgba(8,10,16,0.7)',
          padding: '3px 8px',
          border: '1px solid var(--border)',
          pointerEvents: 'none',
        }}
      >
        {members.length} builders online
      </div>
    </div>
  )
}
