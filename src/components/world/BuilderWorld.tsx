import React, { useRef, useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ZoomIn, ZoomOut, Maximize2, Crown, ExternalLink, Sparkles } from 'lucide-react'
import { BuilderAvatar } from '@/components/ui/BuilderAvatar'
import type { WorldMember } from './worldTypes'
import { clamp, getLevelProgress } from '@/utils/cn'

// ─── Dynamic World Layout Calculations ────────────────────────────────────────

function computeWorldBoundsAndPositions(count: number) {
  const cols = Math.max(5, Math.ceil(Math.sqrt(Math.max(1, count) * 1.8)))
  const rows = Math.max(3, Math.ceil(count / cols))

  const colW = 180
  const rowH = 175
  const paddingX = 90
  const paddingY = 80

  const worldW = Math.max(1100, cols * colW + paddingX * 2)
  const worldH = Math.max(650, rows * rowH + paddingY * 2)

  const positions = Array.from({ length: count }, (_, i) => {
    const row = Math.floor(i / cols)
    const col = i % cols
    // Staggered honeycomb offset
    const offsetX = row % 2 === 0 ? 0 : colW / 2
    return {
      x: paddingX + col * colW + offsetX,
      y: paddingY + row * rowH,
    }
  })

  return { worldW, worldH, positions }
}

// ─── Platform tile ─────────────────────────────────────────────────────────────

const Platform: React.FC<{ isHovered: boolean; isManager: boolean }> = ({
  isHovered,
  isManager,
}) => {
  const hoverColor = isManager ? '#FF9900' : '#38BDF8'
  const borderColor = isHovered ? hoverColor : isManager ? 'rgba(255, 153, 0, 0.4)' : '#1F293A'

  return (
    <div className="flex flex-col items-center select-none" style={{ marginTop: 4 }}>
      {/* Top platform face */}
      <div
        style={{
          width: 84,
          height: 16,
          background: isHovered
            ? isManager
              ? 'rgba(255, 153, 0, 0.25)'
              : 'rgba(56, 189, 248, 0.2)'
            : isManager
            ? 'rgba(255, 153, 0, 0.08)'
            : '#121824',
          border: `1px solid ${borderColor}`,
          borderBottom: 'none',
          borderRadius: '4px 4px 0 0',
          boxShadow: isHovered
            ? isManager
              ? '0 0 16px rgba(255, 153, 0, 0.4)'
              : '0 0 16px rgba(56, 189, 248, 0.3)'
            : 'none',
          transition: 'all 0.2s ease',
        }}
      />
      {/* Bottom platform edge */}
      <div
        style={{
          width: 84,
          height: 8,
          background: isManager ? 'rgba(255, 153, 0, 0.15)' : '#0E141F',
          border: `1px solid ${borderColor}`,
          borderTop: 'none',
          borderRadius: '0 0 4px 4px',
          transition: 'all 0.2s ease',
        }}
      />
    </div>
  )
}

// ─── AWS Architecture Service Nodes in World ───────────────────────────────────

const ARCH_NODES = [
  { x: 40, y: 50, label: 'λ AWS Lambda', color: '#FF9900' },
  { x: 40, y: 220, label: '□ Amazon S3', color: '#10B981' },
  { x: 40, y: 390, label: '◈ Amazon DynamoDB', color: '#38BDF8' },
  { x: 40, y: 540, label: '⬡ Amazon ECS & Fargate', color: '#8B5CF6' },
  { x: 920, y: 50, label: '⚡ Amazon API Gateway', color: '#FF9900' },
  { x: 920, y: 220, label: '◉ Amazon CloudFront', color: '#06B6D4' },
  { x: 920, y: 390, label: '⊕ AWS IAM Security', color: '#EF4444' },
  { x: 920, y: 540, label: '◎ Amazon Bedrock AI', color: '#A855F7' },
]

// ─── Compact Hover Card ────────────────────────────────────────────────────────

const CompactMemberCard: React.FC<{ member: WorldMember }> = ({ member }) => {
  const { progress } = getLevelProgress(member.xp)
  const isManager = member.role === 'manager'

  return (
    <motion.div
      className="absolute bottom-full mb-3 z-50 pointer-events-none select-none"
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 4, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      style={{ width: 230, left: '50%', marginLeft: -115 }}
    >
      <div className="bg-[#0E141F]/95 backdrop-blur-md border border-[#1F293A] rounded-xl p-3 shadow-2xl space-y-2 text-left">
        {/* Card Header with Photo */}
        <div className="flex items-center gap-2.5">
          <BuilderAvatar
            src={member.avatarUrl}
            name={member.name}
            alias={member.awsAlias}
            isManager={isManager}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="font-mono font-bold text-xs text-white truncate">
                {member.name}
              </span>
              {isManager && (
                <span title="Community Manager">
                  <Crown size={12} className="text-amber-400 shrink-0 fill-current" />
                </span>
              )}
            </div>

            {member.awsAlias ? (
              <span className="font-mono text-[10px] text-[#FF9900] block truncate">
                @{member.awsAlias}
              </span>
            ) : (
              <span className="font-mono text-[9px] text-slate-400 block truncate">
                {member.email}
              </span>
            )}
          </div>
        </div>

        {/* Institution / Role */}
        <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 pt-1 border-t border-[#1F293A]">
          <span className="truncate max-w-[140px]">
            {member.institution || 'Cloud Community'}
          </span>
          <span
            className={`px-1.5 py-0.5 rounded font-semibold uppercase ${
              isManager
                ? 'bg-amber-500/20 text-[#FF9900] border border-amber-500/30'
                : 'bg-slate-800 text-slate-300'
            }`}
          >
            {isManager ? 'Manager' : `Lv.${member.level}`}
          </span>
        </div>

        {/* XP Progress Bar */}
        <div className="space-y-0.5">
          <div className="flex justify-between text-[8px] font-mono text-slate-400">
            <span>Community XP</span>
            <span className="text-[#FF9900] font-bold">{member.xp.toLocaleString()} pts</span>
          </div>
          <div className="w-full bg-[#1A2234] h-1.5 rounded-full overflow-hidden border border-[#2D3A50]">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.max(6, progress)}%`,
                backgroundColor: isManager ? '#FF9900' : '#38BDF8',
              }}
            />
          </div>
        </div>

        {/* Action Hint */}
        <div className="text-[9px] font-mono text-sky-400 text-center flex items-center justify-center gap-1 pt-1 opacity-90">
          <span>Click to open Member Profile</span>
          <ExternalLink size={9} />
        </div>
      </div>
    </motion.div>
  )
}

// ─── Builder World Component ───────────────────────────────────────────────────

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
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 })

  // ── Filter & Search ──────────────────────────────────────────────────────────
  const visibleMembers = useMemo(() => {
    let list = members

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          (m.institution ?? '').toLowerCase().includes(q) ||
          (m.awsAlias ?? '').toLowerCase().includes(q)
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

  // Dynamic bounds and honeycomb positions based on real member count
  const { worldW, worldH, positions } = useMemo(
    () => computeWorldBoundsAndPositions(visibleMembers.length),
    [visibleMembers.length]
  )

  // ── Pan Handlers ─────────────────────────────────────────────────────────────
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('[data-char]')) return
      isDragging.current = true
      dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }
    },
    [offset]
  )

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return
    setOffset({
      x: dragStart.current.ox + (e.clientX - dragStart.current.x),
      y: dragStart.current.oy + (e.clientY - dragStart.current.y),
    })
  }, [])

  const onMouseUp = useCallback(() => {
    isDragging.current = false
  }, [])

  // ── Zoom Controls ────────────────────────────────────────────────────────────
  const onWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      setScale((s) => clamp(s * (e.deltaY > 0 ? 0.9 : 1.1), 0.45, 2.0))
    }
  }, [])

  const zoom = (dir: 1 | -1) => setScale((s) => clamp(s + dir * 0.15, 0.45, 2.0))

  const resetView = () => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }

  // ── Empty State ──────────────────────────────────────────────────────────────
  if (members.length === 0) {
    return (
      <div
        className="relative w-full flex items-center justify-center bg-[#0B0F17]"
        style={{ height: 540 }}
      >
        <div className="text-center px-8 max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-[#FF9900]/10 border border-[#FF9900]/30 flex items-center justify-center mx-auto mb-4 text-2xl">
            🌍
          </div>
          <p className="font-mono font-bold text-sm text-white mb-1">
            Builder World is ready.
          </p>
          <p className="font-mono text-xs text-slate-400 leading-relaxed">
            Invite your community members to populate the interactive chapter world.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full overflow-hidden bg-[#080B11]" style={{ height: 540 }}>
      {/* Canvas Container */}
      <div
        ref={containerRef}
        className="w-full h-full overflow-hidden select-none relative"
        style={{
          cursor: isDragging.current ? 'grabbing' : 'grab',
          backgroundImage:
            'radial-gradient(circle, #1F293A 1px, transparent 1px), radial-gradient(circle, #1F293A 1px, #080B11 1px)',
          backgroundSize: '36px 36px',
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
      >
        {/* World Inner Canvas with Transform */}
        <div
          style={{
            transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
            transformOrigin: '50% 50%',
            width: worldW,
            height: worldH,
            position: 'absolute',
            top: '50%',
            left: '50%',
            marginLeft: -worldW / 2,
            marginTop: -worldH / 2,
            willChange: 'transform',
          }}
        >
          {/* AWS Architecture Service Labels */}
          {ARCH_NODES.map((d, idx) => (
            <div
              key={idx}
              style={{
                position: 'absolute',
                left: d.x,
                top: d.y,
                color: d.color,
                fontFamily: 'monospace',
                fontSize: 10,
                fontWeight: 600,
                opacity: 0.5,
                letterSpacing: '0.05em',
                pointerEvents: 'none',
                userSelect: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              {d.label}
            </div>
          ))}

          {/* Members on Platforms */}
          {visibleMembers.map((member, i) => {
            const pos = positions[i] || { x: 100, y: 100 }
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
                  zIndex: isHovered ? 40 : 10,
                }}
                onMouseEnter={() => setHoveredId(member.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => onSelectMember(member)}
              >
                {/* Floating Member Node */}
                <div
                  className="flex flex-col items-center relative cursor-pointer group"
                  style={{
                    transform: isHovered ? 'translateY(-6px) scale(1.08)' : 'none',
                    transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }}
                >
                  {/* Compact Member Card on Hover */}
                  <AnimatePresence>
                    {isHovered && <CompactMemberCard member={member} />}
                  </AnimatePresence>

                  {/* Manager Crown Marker (Do NOT replace profile photo!) */}
                  {isManager && (
                    <div
                      className="absolute -top-4 z-30 flex items-center justify-center animate-bounce"
                      style={{ filter: 'drop-shadow(0 0 6px rgba(255, 153, 0, 0.9))' }}
                      title="Community Manager"
                    >
                      <span className="text-base">👑</span>
                    </div>
                  )}

                  {/* Profile Photo Avatar Token */}
                  <div className="relative">
                    <BuilderAvatar
                      src={member.avatarUrl}
                      name={member.name}
                      alias={member.awsAlias}
                      isManager={isManager}
                      size="lg"
                      className={`transition-all duration-200 ${
                        isHovered
                          ? 'ring-4 ring-[#FF9900] shadow-[0_0_20px_rgba(255,153,0,0.5)]'
                          : isManager
                          ? 'ring-2 ring-amber-400/80 shadow-[0_0_12px_rgba(255,153,0,0.3)]'
                          : 'ring-1 ring-[#1F293A]'
                      }`}
                    />

                    {/* Weekly active spark badge */}
                    {member.weeklyXp > 0 && !isManager && (
                      <span
                        className="absolute -top-1 -right-1 z-20 w-3.5 h-3.5 rounded-full bg-emerald-500 border border-[#080B11] flex items-center justify-center"
                        title={`+${member.weeklyXp} XP active this week`}
                      >
                        <Sparkles size={8} className="text-black" />
                      </span>
                    )}
                  </div>

                  {/* Platform Base Pedestal */}
                  <Platform isHovered={isHovered} isManager={isManager} />

                  {/* Member Name */}
                  <div
                    className={`font-mono text-[11px] font-bold mt-1 text-center truncate max-w-[130px] transition-colors ${
                      isHovered
                        ? 'text-white'
                        : isManager
                        ? 'text-[#FF9900]'
                        : 'text-slate-300'
                    }`}
                  >
                    {member.name}
                  </div>

                  {/* AWS Builder Alias (or Level) */}
                  {member.awsAlias ? (
                    <div className="font-mono text-[9px] text-[#FF9900] font-medium tracking-tight truncate max-w-[120px]">
                      @{member.awsAlias}
                    </div>
                  ) : (
                    <div className="font-mono text-[9px] text-slate-500 font-medium">
                      Lv.{member.level} · {member.xp} XP
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Floating Zoom & Reset Controls */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1.5 z-20">
        <button
          onClick={() => zoom(1)}
          className="w-8 h-8 rounded-lg bg-[#0E141F]/90 hover:bg-[#1A2234] border border-[#1F293A] text-slate-300 hover:text-white flex items-center justify-center transition-colors shadow-md"
          title="Zoom In"
        >
          <ZoomIn size={14} />
        </button>
        <button
          onClick={() => zoom(-1)}
          className="w-8 h-8 rounded-lg bg-[#0E141F]/90 hover:bg-[#1A2234] border border-[#1F293A] text-slate-300 hover:text-white flex items-center justify-center transition-colors shadow-md"
          title="Zoom Out"
        >
          <ZoomOut size={14} />
        </button>
        <button
          onClick={resetView}
          className="w-8 h-8 rounded-lg bg-[#0E141F]/90 hover:bg-[#1A2234] border border-[#1F293A] text-slate-300 hover:text-white flex items-center justify-center transition-colors shadow-md"
          title="Reset View"
        >
          <Maximize2 size={14} />
        </button>
      </div>

      {/* Scale & Guidance Indicator */}
      <div className="absolute bottom-3 left-3 text-[10px] font-mono text-slate-400 bg-[#0E141F]/80 backdrop-blur-xs px-2.5 py-1 rounded-md border border-[#1F293A] pointer-events-none z-20">
        {Math.round(scale * 100)}% · Click builder to open profile · Drag to pan
      </div>

      {/* Visible Builder Count */}
      <div className="absolute top-3 right-3 text-[10px] font-mono text-slate-400 bg-[#0E141F]/80 backdrop-blur-xs px-2.5 py-1 rounded-md border border-[#1F293A] pointer-events-none z-20">
        {visibleMembers.length} builder{visibleMembers.length !== 1 ? 's' : ''} visible
      </div>
    </div>
  )
}
