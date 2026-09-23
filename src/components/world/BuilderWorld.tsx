import React, { useRef, useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ZoomIn, ZoomOut, Maximize2, Crown } from 'lucide-react'
import { VoxelCharacter } from './VoxelCharacter'
import type { WorldMember } from './worldTypes'
import { clamp, getLevelProgress } from '@/utils/cn'

// ─── World layout ──────────────────────────────────────────────────────────

const WORLD_W  = 1060
const WORLD_H  = 620
const COL_W    = 185
const ROW_H    = 155
const COLS     = 5
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

// ─── Platform tile ─────────────────────────────────────────────────────────

const Platform: React.FC<{ isHovered: boolean; isManager: boolean }> = ({
  isHovered,
  isManager,
}) => {
  const hoverColor  = isManager ? '#FF9900' : undefined
  const borderColor = isHovered
    ? (hoverColor ?? 'var(--accent)')
    : 'var(--world-platform-border)'

  return (
    <div className="flex flex-col items-center" style={{ marginTop: 2 }}>
      <div
        style={{
          width: 90,
          height: 18,
          background: isHovered
            ? isManager
              ? 'rgba(255,153,0,0.18)'
              : 'var(--accent-dim)'
            : 'var(--world-platform)',
          border: `1px solid ${borderColor}`,
          borderBottom: 'none',
          transition: 'background 0.2s, border-color 0.2s',
        }}
      />
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
}

// ─── AWS service decorations ───────────────────────────────────────────────

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

// ─── Character tooltip ──────────────────────────────────────────────────────

const CharTooltip: React.FC<{ member: WorldMember }> = ({ member }) => {
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
        <span className="font-mono font-bold text-[11px] text-text-primary">
          {member.name}
        </span>
        <span className="level-pip">Lv.{member.level}</span>
      </div>

      {member.institution && (
        <div className="font-mono text-[9px] text-text-secondary mb-1 truncate">
          {member.institution}
        </div>
      )}

      {/* XP bar */}
      <div className="mb-1.5">
        <div className="flex justify-between mb-0.5">
          <span className="font-mono text-[8px] text-text-muted">XP</span>
          <span className="font-mono text-[8px] text-accent-bright">
            {member.xp.toLocaleString()} total
          </span>
        </div>
        <div className="xp-bar">
          <div className="xp-bar-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="flex items-center gap-1">
        {member.weeklyXp > 0 && (
          <span className="font-mono text-[8px] text-success">
            +{member.weeklyXp} XP this week
          </span>
        )}
        {member.role === 'manager' && (
          <span className="ml-auto font-mono text-[8px] text-yellow-400 flex items-center gap-0.5">
            <Crown size={8} /> Manager
          </span>
        )}
      </div>
    </motion.div>
  )
}

// ─── Builder World main component ──────────────────────────────────────────

interface BuilderWorldProps {
  members: WorldMember[]
  onSelectMember: (member: WorldMember) => void
  filter: string
  search: string
}

export const BuilderWorld: React.FC<BuilderWorldProps> = ({
  members,
  onSelectMember,
  filter,
  search,
}) => {
  const containerRef  = useRef<HTMLDivElement>(null)
  const [scale, setScale]           = useState(1)
  const [offset, setOffset]         = useState({ x: 0, y: 0 })
  const [hoveredId, setHoveredId]   = useState<string | null>(null)
  const isDragging = useRef(false)
  const dragStart  = useRef({ x: 0, y: 0, ox: 0, oy: 0 })

  // ── Filter & Search ────────────────────────────────────────────────────

  const visibleMembers = useMemo(() => {
    let list = members

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          (m.institution ?? '').toLowerCase().includes(q) ||
          (m.awsAlias ?? '').toLowerCase().includes(q),
      )
    }

    if (filter === 'Manager') {
      list = list.filter((m) => m.role === 'manager')
    } else if (filter === 'Active') {
      list = list.filter((m) => m.weeklyXp > 0)
    } else if (filter === 'Needs Attention') {
      list = list.filter((m) => m.weeklyXp === 0)
    }

    return list
  }, [members, filter, search])

  const positions = useMemo(
    () => computePositions(visibleMembers.length),
    [visibleMembers.length],
  )

  // ── Pan handlers ────────────────────────────────────────────────────────

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('[data-char]')) return
      isDragging.current = true
      dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }
      e.currentTarget.setAttribute('data-dragging', 'true')
    },
    [offset],
  )

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return
    setOffset({
      x: dragStart.current.ox + (e.clientX - dragStart.current.x),
      y: dragStart.current.oy + (e.clientY - dragStart.current.y),
    })
  }, [])

  const onMouseUp = useCallback((e: React.MouseEvent) => {
    isDragging.current = false
    e.currentTarget.removeAttribute('data-dragging')
  }, [])

  const onMouseLeaveContainer = useCallback(() => {
    isDragging.current = false
  }, [])

  // ── Zoom ─────────────────────────────────────────────────────────────────

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setScale((s) => clamp(s * (e.deltaY > 0 ? 0.9 : 1.1), 0.4, 2.2))
  }, [])

  const zoom = (dir: 1 | -1) =>
    setScale((s) => clamp(s + dir * 0.15, 0.4, 2.2))

  const resetView = () => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }

  // ── Empty state ───────────────────────────────────────────────────────────

  if (members.length === 0) {
    return (
      <div
        className="relative w-full flex items-center justify-center"
        style={{ height: 530 }}
      >
        <div className="text-center px-8 max-w-sm">
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent)' }}
          >
            <span className="text-2xl">🌍</span>
          </div>
          <p className="font-mono font-bold text-sm text-text-primary mb-1">
            Your Builder World is waiting.
          </p>
          <p className="font-mono text-[11px] text-text-muted leading-relaxed">
            Invite your first community members to bring the world to life.
          </p>
        </div>
      </div>
    )
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
                top: d.y,
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
          {visibleMembers.map((member, i) => {
            const pos       = positions[i]
            const isHovered = hoveredId === member.id
            const isManager = member.role === 'manager'

            return (
              <div
                key={member.id}
                data-char="true"
                style={{
                  position: 'absolute',
                  left: pos.x,
                  top: pos.y,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
                onMouseEnter={() => setHoveredId(member.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => onSelectMember(member)}
              >
                <motion.div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    position: 'relative',
                  }}
                  animate={{ scale: isHovered ? 1.07 : 1, y: isHovered ? -4 : 0 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 26 }}
                >
                  {/* Tooltip */}
                  <AnimatePresence>
                    {isHovered && <CharTooltip member={member} />}
                  </AnimatePresence>

                  {/* Manager crown */}
                  {isManager && (
                    <div
                      style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: 14,
                        marginBottom: 2,
                        filter: 'drop-shadow(0 0 4px rgba(255,153,0,0.8))',
                      }}
                    >
                      👑
                    </div>
                  )}

                  {/* Weekly XP spark above character (when no crown) */}
                  {!isManager && member.weeklyXp > 0 && (
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
                  <VoxelCharacter {...member.appearance} width={70} height={106} />

                  {/* Platform */}
                  <Platform isHovered={isHovered} isManager={isManager} />

                  {/* Name label */}
                  <div
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 10,
                      fontWeight: 600,
                      color: isHovered
                        ? 'var(--text-primary)'
                        : isManager
                        ? '#FF9900'
                        : 'var(--text-secondary)',
                      marginTop: 4,
                      letterSpacing: '-0.01em',
                      transition: 'color 0.15s',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {member.name.split(' ')[0]}
                  </div>

                  {/* Role / Level pip */}
                  {isManager ? (
                    <div
                      style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: 8,
                        fontWeight: 700,
                        color: '#FF9900',
                        marginTop: 2,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase' as const,
                      }}
                    >
                      MANAGER
                    </div>
                  ) : (
                    <div className="level-pip" style={{ marginTop: 2 }}>
                      Lv.{member.level}
                    </div>
                  )}
                </motion.div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Controls overlay */}
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

      {/* Top-right: visible count */}
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
        {visibleMembers.length} builder{visibleMembers.length !== 1 ? 's' : ''} visible
      </div>
    </div>
  )
}
