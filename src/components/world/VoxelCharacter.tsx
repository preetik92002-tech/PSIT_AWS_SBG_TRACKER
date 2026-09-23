import React from 'react'
import type { CharacterAppearance, HairStyle, ShirtStyle, PantsStyle, ShoeStyle, Accessory } from '@/types'
import { shadeColor } from '@/utils/cn'

// ─── Component props ──────────────────────────────────────────────────────

interface VoxelCharacterProps extends CharacterAppearance {
  width?:  number
  height?: number
  level?:  number // enables level-based internal visual effects
}

// ─── Hair renderer (all styles drawn BEFORE head so face appears on top) ──

function Hair({ style, color }: { style: HairStyle; color: string }): React.ReactElement {
  const s = shadeColor(color, -28)
  const l = shadeColor(color, 22)

  switch (style) {
    case 'short':
      return (
        <g>
          <rect x={10} y={1}  width={28} height={10} fill={color} />
          {/* Side volume */}
          <rect x={10} y={1}  width={3}  height={10} fill={s} opacity={0.45} />
          <rect x={35} y={1}  width={3}  height={10} fill={s} opacity={0.45} />
          {/* Top highlight */}
          <rect x={14} y={1}  width={12} height={3}  fill={l} opacity={0.25} />
        </g>
      )

    case 'spiky':
      return (
        <g>
          {/* Base */}
          <rect x={10} y={5}  width={28} height={8}  fill={color} />
          {/* Spikes */}
          <polygon points="12,5 16,-3 20,5" fill={color} />
          <polygon points="19,5 23,-4 27,5" fill={color} />
          <polygon points="27,5 31,-3 35,5" fill={color} />
          {/* Spike shading */}
          <polygon points="12,5 16,-3 14,5" fill={s} opacity={0.4} />
          <polygon points="19,5 23,-4 21,5" fill={s} opacity={0.4} />
          <polygon points="27,5 31,-3 29,5" fill={s} opacity={0.4} />
          {/* Side volume */}
          <rect x={10} y={5}  width={3}  height={8}  fill={s} opacity={0.4} />
          <rect x={35} y={5}  width={3}  height={8}  fill={s} opacity={0.4} />
        </g>
      )

    case 'long':
      return (
        <g>
          {/* Top band */}
          <rect x={8}  y={1}  width={32} height={10} fill={color} />
          {/* Side strands flowing down */}
          <rect x={8}  y={10} width={4}  height={18} fill={color} />
          <rect x={36} y={10} width={4}  height={18} fill={color} />
          {/* Strand tips */}
          <rect x={8}  y={26} width={4}  height={3}  fill={s} opacity={0.6} />
          <rect x={36} y={26} width={4}  height={3}  fill={s} opacity={0.6} />
          {/* Shading */}
          <rect x={8}  y={1}  width={3}  height={10} fill={s} opacity={0.4} />
          <rect x={37} y={1}  width={3}  height={10} fill={s} opacity={0.4} />
          {/* Top highlight */}
          <rect x={14} y={1}  width={10} height={3}  fill={l} opacity={0.2} />
        </g>
      )

    case 'bob':
      return (
        <g>
          {/* Wide, low-cut bob */}
          <rect x={7}  y={2}  width={34} height={17} fill={color} />
          {/* Bottom hem suggestion */}
          <rect x={7}  y={17} width={34} height={3}  fill={s} opacity={0.55} />
          {/* Side shading */}
          <rect x={7}  y={2}  width={3}  height={17} fill={s} opacity={0.5} />
          <rect x={38} y={2}  width={3}  height={17} fill={s} opacity={0.5} />
          {/* Top highlight / parting */}
          <rect x={21} y={2}  width={6}  height={4}  fill={s} opacity={0.2} />
          <rect x={14} y={2}  width={8}  height={3}  fill={l} opacity={0.2} />
        </g>
      )

    case 'bun':
      return (
        <g>
          {/* Base hair on head */}
          <rect x={10} y={4}  width={28} height={8}  fill={color} />
          {/* Bun circle */}
          <ellipse cx={24} cy={0}  rx={7}  ry={6}    fill={color} />
          {/* Bun highlight */}
          <ellipse cx={22} cy={-2} rx={3}  ry={2.5}  fill={l}     opacity={0.25} />
          {/* Bun wrap line */}
          <ellipse cx={24} cy={1}  rx={5}  ry={1.5}  fill={s}     opacity={0.35} />
        </g>
      )

    case 'afro':
      return (
        <g>
          {/* Big afro — wider than head */}
          <ellipse cx={24} cy={10} rx={21} ry={17}  fill={color} />
          {/* Texture puffs */}
          <ellipse cx={14} cy={7}  rx={7}  ry={6}   fill={l}     opacity={0.18} />
          <ellipse cx={34} cy={6}  rx={6}  ry={5}   fill={l}     opacity={0.18} />
          <ellipse cx={24} cy={3}  rx={6}  ry={5}   fill={l}     opacity={0.15} />
          <ellipse cx={11} cy={14} rx={5}  ry={4}   fill={s}     opacity={0.2} />
          <ellipse cx={37} cy={14} rx={5}  ry={4}   fill={s}     opacity={0.2} />
        </g>
      )

    default:
      return <rect x={10} y={1} width={28} height={10} fill={color} />
  }
}

// ─── Shirt / body + arms renderer ────────────────────────────────────────

function BodyAndArms({
  style,
  torsoColor,
  skinColor,
}: {
  style: ShirtStyle
  torsoColor: string
  skinColor: string
}): React.ReactElement {
  const ts  = shadeColor(torsoColor, -25)
  const ts2 = shadeColor(torsoColor, -38)
  const tl  = shadeColor(torsoColor, 22)

  switch (style) {
    // ── plain ──────────────────────────────────────────────────────
    case 'plain':
      return (
        <g>
          {/* Torso */}
          <rect x={4}  y={33} width={40} height={23} fill={torsoColor} />
          <rect x={4}  y={33} width={40} height={4}  fill={ts} />
          <rect x={4}  y={37} width={4}  height={19} fill={ts} opacity={0.38} />
          <rect x={40} y={37} width={4}  height={19} fill={ts} opacity={0.45} />
          {/* Arms */}
          <rect x={0}  y={33} width={4}  height={18} fill={torsoColor} />
          <rect x={44} y={33} width={4}  height={18} fill={torsoColor} />
          <rect x={0}  y={33} width={2}  height={18} fill={ts} opacity={0.4} />
          <rect x={46} y={33} width={2}  height={18} fill={ts} opacity={0.4} />
        </g>
      )

    // ── hoodie ─────────────────────────────────────────────────────
    case 'hoodie':
      return (
        <g>
          {/* Torso */}
          <rect x={4}  y={33} width={40} height={23} fill={torsoColor} />
          <rect x={4}  y={33} width={40} height={4}  fill={ts} />
          {/* Kangaroo pocket */}
          <rect x={14} y={46} width={20} height={10} fill={ts} />
          <rect x={23} y={47} width={2}  height={9}  fill={ts2} />
          <rect x={14} y={46} width={20} height={2}  fill={ts2} opacity={0.6} />
          {/* Side shading */}
          <rect x={4}  y={37} width={4}  height={19} fill={ts} opacity={0.38} />
          <rect x={40} y={37} width={4}  height={19} fill={ts} opacity={0.45} />
          {/* Arms */}
          <rect x={0}  y={33} width={4}  height={18} fill={torsoColor} />
          <rect x={44} y={33} width={4}  height={18} fill={torsoColor} />
          <rect x={0}  y={33} width={2}  height={18} fill={ts} opacity={0.4} />
          <rect x={46} y={33} width={2}  height={18} fill={ts} opacity={0.4} />
          {/* Cuffs */}
          <rect x={0}  y={47} width={4}  height={4}  fill={ts} opacity={0.5} />
          <rect x={44} y={47} width={4}  height={4}  fill={ts} opacity={0.5} />
        </g>
      )

    // ── jacket ─────────────────────────────────────────────────────
    case 'jacket':
      return (
        <g>
          {/* Main torso */}
          <rect x={4}  y={33} width={40} height={23} fill={torsoColor} />
          {/* Lapels (left + right panels) */}
          <rect x={4}  y={33} width={12} height={20} fill={ts} />
          <rect x={32} y={33} width={12} height={20} fill={ts} />
          {/* Collar notch (lighter V at top center) */}
          <rect x={16} y={33} width={16} height={8}  fill={tl} opacity={0.15} />
          {/* Collar band */}
          <rect x={4}  y={33} width={40} height={3}  fill={ts2} />
          {/* Button strip */}
          <rect x={21} y={37} width={6}  height={18} fill={ts} opacity={0.28} />
          <rect x={22} y={39} width={4}  height={2}  fill={tl} opacity={0.7} />
          <rect x={22} y={45} width={4}  height={2}  fill={tl} opacity={0.7} />
          <rect x={22} y={51} width={4}  height={2}  fill={tl} opacity={0.7} />
          {/* Pocket flaps on lapels */}
          <rect x={7}  y={48} width={8}  height={4}  fill={ts2} opacity={0.6} />
          <rect x={33} y={48} width={8}  height={4}  fill={ts2} opacity={0.6} />
          {/* Side shading */}
          <rect x={4}  y={36} width={4}  height={20} fill={ts} opacity={0.3} />
          <rect x={40} y={36} width={4}  height={20} fill={ts} opacity={0.35} />
          {/* Arms */}
          <rect x={0}  y={33} width={4}  height={18} fill={torsoColor} />
          <rect x={44} y={33} width={4}  height={18} fill={torsoColor} />
          <rect x={0}  y={33} width={2}  height={18} fill={ts} opacity={0.4} />
          <rect x={46} y={33} width={2}  height={18} fill={ts} opacity={0.4} />
        </g>
      )

    // ── tshirt ─────────────────────────────────────────────────────
    case 'tshirt':
      return (
        <g>
          {/* Torso */}
          <rect x={4}  y={33} width={40} height={23} fill={torsoColor} />
          {/* Round neck collar */}
          <rect x={16} y={33} width={16} height={4}  fill={ts} />
          {/* Side shading */}
          <rect x={4}  y={37} width={4}  height={19} fill={ts} opacity={0.38} />
          <rect x={40} y={37} width={4}  height={19} fill={ts} opacity={0.45} />
          {/* Short sleeves — upper arm only */}
          <rect x={0}  y={33} width={4}  height={9}  fill={torsoColor} />
          <rect x={44} y={33} width={4}  height={9}  fill={torsoColor} />
          {/* Sleeve hem */}
          <rect x={0}  y={40} width={4}  height={2}  fill={ts} />
          <rect x={44} y={40} width={4}  height={2}  fill={ts} />
          {/* Bare arms below sleeve */}
          <rect x={0}  y={42} width={4}  height={9}  fill={skinColor} />
          <rect x={44} y={42} width={4}  height={9}  fill={skinColor} />
          <rect x={0}  y={42} width={2}  height={9}  fill={shadeColor(skinColor, -15)} opacity={0.35} />
          <rect x={46} y={42} width={2}  height={9}  fill={shadeColor(skinColor, -15)} opacity={0.35} />
        </g>
      )

    // ── uniform ────────────────────────────────────────────────────
    case 'uniform':
      return (
        <g>
          {/* Main torso */}
          <rect x={4}  y={33} width={40} height={23} fill={torsoColor} />
          {/* Collar band */}
          <rect x={4}  y={33} width={40} height={3}  fill={ts2} />
          {/* Center stripe */}
          <rect x={22} y={33} width={4}  height={23} fill={tl} opacity={0.18} />
          {/* Left chest badge area */}
          <rect x={7}  y={38} width={9}  height={6}  fill={ts} opacity={0.7} />
          <rect x={8}  y={39} width={7}  height={4}  fill={shadeColor(torsoColor, 35)} opacity={0.4} />
          {/* Right chest pip row */}
          <rect x={32} y={38} width={2}  height={2}  fill={tl} opacity={0.8} />
          <rect x={35} y={38} width={2}  height={2}  fill={tl} opacity={0.8} />
          {/* Side shading */}
          <rect x={4}  y={36} width={4}  height={20} fill={ts} opacity={0.38} />
          <rect x={40} y={36} width={4}  height={20} fill={ts} opacity={0.45} />
          {/* Arms */}
          <rect x={0}  y={33} width={4}  height={18} fill={torsoColor} />
          <rect x={44} y={33} width={4}  height={18} fill={torsoColor} />
          {/* Epaulettes */}
          <rect x={0}  y={33} width={4}  height={5}  fill={ts} />
          <rect x={44} y={33} width={4}  height={5}  fill={ts} />
          <rect x={0}  y={33} width={4}  height={2}  fill={tl} opacity={0.5} />
          <rect x={44} y={33} width={4}  height={2}  fill={tl} opacity={0.5} />
          {/* Arm stripe */}
          <rect x={0}  y={33} width={2}  height={18} fill={ts} opacity={0.4} />
          <rect x={46} y={33} width={2}  height={18} fill={ts} opacity={0.4} />
        </g>
      )

    default:
      return <BodyAndArms style="plain" torsoColor={torsoColor} skinColor={skinColor} />
  }
}

// ─── Pants / legs renderer ───────────────────────────────────────────────

function Legs({
  style,
  pantsColor,
  skinColor,
}: {
  style: PantsStyle
  pantsColor: string
  skinColor: string
}): React.ReactElement {
  const ps  = shadeColor(pantsColor, -20)
  const ps2 = shadeColor(pantsColor, -35)
  const pl  = shadeColor(pantsColor, 22)

  switch (style) {
    case 'jeans':
      return (
        <g>
          <rect x={7}  y={55} width={13} height={16} fill={pantsColor} />
          <rect x={28} y={55} width={13} height={16} fill={pantsColor} />
          {/* Inner leg shading */}
          <rect x={7}  y={55} width={3}  height={16} fill={ps} opacity={0.45} />
          <rect x={38} y={55} width={2}  height={16} fill={ps} opacity={0.45} />
          {/* Knee fade */}
          <rect x={7}  y={63} width={13} height={3}  fill={ps} opacity={0.35} />
          <rect x={28} y={63} width={13} height={3}  fill={ps} opacity={0.35} />
        </g>
      )

    case 'shorts':
      return (
        <g>
          {/* Short pants — half height */}
          <rect x={7}  y={55} width={13} height={9}  fill={pantsColor} />
          <rect x={28} y={55} width={13} height={9}  fill={pantsColor} />
          {/* Hem at bottom */}
          <rect x={7}  y={62} width={13} height={2}  fill={ps} />
          <rect x={28} y={62} width={13} height={2}  fill={ps} />
          {/* Inner shading */}
          <rect x={7}  y={55} width={3}  height={9}  fill={ps} opacity={0.4} />
          <rect x={38} y={55} width={2}  height={9}  fill={ps} opacity={0.4} />
          {/* Bare skin on lower legs */}
          <rect x={7}  y={64} width={13} height={7}  fill={skinColor} opacity={0.82} />
          <rect x={28} y={64} width={13} height={7}  fill={skinColor} opacity={0.82} />
          <rect x={7}  y={64} width={3}  height={7}  fill={shadeColor(skinColor, -15)} opacity={0.3} />
          <rect x={38} y={64} width={2}  height={7}  fill={shadeColor(skinColor, -15)} opacity={0.3} />
        </g>
      )

    case 'cargo':
      return (
        <g>
          {/* Main legs */}
          <rect x={7}  y={55} width={13} height={16} fill={pantsColor} />
          <rect x={28} y={55} width={13} height={16} fill={pantsColor} />
          {/* Cargo pockets — outer sides */}
          <rect x={3}  y={60} width={5}  height={7}  fill={ps} />
          <rect x={40} y={60} width={5}  height={7}  fill={ps} />
          {/* Pocket top + bottom edges */}
          <rect x={3}  y={60} width={5}  height={1}  fill={ps2} />
          <rect x={40} y={60} width={5}  height={1}  fill={ps2} />
          <rect x={3}  y={66} width={5}  height={1}  fill={ps2} />
          <rect x={40} y={66} width={5}  height={1}  fill={ps2} />
          {/* Pocket snap */}
          <rect x={5}  y={61} width={2}  height={2}  fill={pl} opacity={0.5} />
          <rect x={42} y={61} width={2}  height={2}  fill={pl} opacity={0.5} />
          {/* Inner leg shading */}
          <rect x={7}  y={55} width={3}  height={16} fill={ps} opacity={0.4} />
          <rect x={38} y={55} width={2}  height={16} fill={ps} opacity={0.4} />
        </g>
      )

    case 'joggers':
      return (
        <g>
          {/* Main legs */}
          <rect x={7}  y={55} width={13} height={13} fill={pantsColor} />
          <rect x={28} y={55} width={13} height={13} fill={pantsColor} />
          {/* Cuffs — slightly lighter, inset */}
          <rect x={9}  y={67} width={9}  height={4}  fill={pl} />
          <rect x={30} y={67} width={9}  height={4}  fill={pl} />
          {/* Cuff band bottom */}
          <rect x={9}  y={69} width={9}  height={2}  fill={ps} />
          <rect x={30} y={69} width={9}  height={2}  fill={ps} />
          {/* Side stripe detail */}
          <rect x={7}  y={55} width={2}  height={16} fill={ps} opacity={0.35} />
          <rect x={39} y={55} width={2}  height={16} fill={ps} opacity={0.35} />
        </g>
      )

    case 'formal':
      return (
        <g>
          {/* Legs */}
          <rect x={7}  y={55} width={13} height={16} fill={pantsColor} />
          <rect x={28} y={55} width={13} height={16} fill={pantsColor} />
          {/* Pressed crease line */}
          <rect x={13} y={55} width={1}  height={16} fill={shadeColor(pantsColor, 38)} opacity={0.55} />
          <rect x={34} y={55} width={1}  height={16} fill={shadeColor(pantsColor, 38)} opacity={0.55} />
          {/* Side shading */}
          <rect x={7}  y={55} width={2}  height={16} fill={ps} opacity={0.28} />
          <rect x={39} y={55} width={2}  height={16} fill={ps} opacity={0.28} />
        </g>
      )

    default:
      return <Legs style="jeans" pantsColor={pantsColor} skinColor={skinColor} />
  }
}

// ─── Shoes renderer ───────────────────────────────────────────────────────

function Shoes({
  style,
  shoeColor,
}: {
  style: ShoeStyle
  shoeColor: string
}): React.ReactElement {
  const ss = shadeColor(shoeColor, -30)
  const sl = shadeColor(shoeColor, 24)

  switch (style) {
    case 'sneakers':
      return (
        <g>
          {/* Left */}
          <rect x={5}  y={70} width={16} height={7}  fill={shoeColor} />
          <rect x={5}  y={70} width={6}  height={7}  fill={sl}        opacity={0.22} />
          <rect x={5}  y={73} width={16} height={4}  fill={ss} />
          {/* Right */}
          <rect x={27} y={70} width={16} height={7}  fill={shoeColor} />
          <rect x={27} y={70} width={6}  height={7}  fill={sl}        opacity={0.22} />
          <rect x={27} y={73} width={16} height={4}  fill={ss} />
        </g>
      )

    case 'boots':
      return (
        <g>
          {/* Left boot — taller, covers lower leg area */}
          <rect x={6}  y={62} width={13} height={15} fill={shoeColor} />
          <rect x={6}  y={62} width={13} height={3}  fill={sl}        opacity={0.28} />
          <rect x={6}  y={62} width={13} height={3}  fill={sl}        opacity={0.15} />
          <rect x={6}  y={73} width={15} height={4}  fill={ss} />
          {/* Pull tab */}
          <rect x={11} y={62} width={3}  height={4}  fill={ss}        opacity={0.6} />
          {/* Right boot */}
          <rect x={29} y={62} width={13} height={15} fill={shoeColor} />
          <rect x={29} y={62} width={13} height={3}  fill={sl}        opacity={0.28} />
          <rect x={29} y={73} width={15} height={4}  fill={ss} />
          <rect x={34} y={62} width={3}  height={4}  fill={ss}        opacity={0.6} />
        </g>
      )

    case 'slides':
      return (
        <g>
          {/* Left slide — flat sole + strap */}
          <rect x={4}  y={73} width={18} height={4}  fill={shoeColor} />
          <rect x={6}  y={70} width={14} height={4}  fill={shadeColor(shoeColor, -12)} />
          <rect x={4}  y={75} width={18} height={2}  fill={ss} />
          {/* Right slide */}
          <rect x={26} y={73} width={18} height={4}  fill={shoeColor} />
          <rect x={28} y={70} width={14} height={4}  fill={shadeColor(shoeColor, -12)} />
          <rect x={26} y={75} width={18} height={2}  fill={ss} />
        </g>
      )

    case 'formal_shoe':
      return (
        <g>
          {/* Left — narrow, toe extension */}
          <rect x={7}  y={71} width={12} height={4}  fill={shoeColor} />
          <rect x={18} y={72} width={4}  height={3}  fill={shoeColor} />
          <rect x={7}  y={74} width={15} height={3}  fill={ss} />
          {/* Shine cap */}
          <rect x={19} y={71} width={3}  height={3}  fill={sl} opacity={0.3} />
          {/* Right */}
          <rect x={29} y={71} width={12} height={4}  fill={shoeColor} />
          <rect x={26} y={72} width={4}  height={3}  fill={shoeColor} />
          <rect x={26} y={74} width={15} height={3}  fill={ss} />
          <rect x={26} y={71} width={3}  height={3}  fill={sl} opacity={0.3} />
        </g>
      )

    default:
      return <Shoes style="sneakers" shoeColor={shoeColor} />
  }
}

// ─── Accessory renderer ───────────────────────────────────────────────────

function Accessory({
  type,
  color,
}: {
  type: Accessory
  color: string
}): React.ReactElement | null {
  if (!type) return null
  const d = shadeColor(color, -40)
  const l = shadeColor(color, 30)

  switch (type) {
    case 'glasses':
      return (
        <g>
          <rect x={12} y={14} width={9}  height={7}  rx={1} fill="rgba(100,220,255,0.12)" stroke={color} strokeWidth={1.5} />
          <rect x={27} y={14} width={9}  height={7}  rx={1} fill="rgba(100,220,255,0.12)" stroke={color} strokeWidth={1.5} />
          <line x1={21} y1={17.5} x2={27} y2={17.5} stroke={color} strokeWidth={1.5} />
          <line x1={9}  y1={17.5} x2={12} y2={17.5} stroke={color} strokeWidth={1.5} />
          <line x1={36} y1={17.5} x2={40} y2={17.5} stroke={color} strokeWidth={1.5} />
        </g>
      )

    case 'cap':
      return (
        <g>
          {/* Cap body */}
          <rect x={9}  y={-1} width={30} height={10} fill={color} />
          <rect x={9}  y={-1} width={30} height={3}  fill={l} opacity={0.25} />
          {/* Cap seam */}
          <rect x={9}  y={7}  width={30} height={2}  fill={d} opacity={0.5} />
          {/* Logo area */}
          <rect x={21} y={1}  width={6}  height={5}  fill={d} opacity={0.4} />
          {/* Brim */}
          <rect x={5}  y={8}  width={38} height={4}  fill={shadeColor(color, -18)} />
          <rect x={5}  y={8}  width={38} height={1.5} fill={l} opacity={0.3} />
        </g>
      )

    case 'headphones':
      return (
        <g>
          {/* Arc band */}
          <path d="M 6 20 Q 24 -10 42 20" stroke={color} strokeWidth={3} fill="none" strokeLinecap="round" />
          {/* Left cup */}
          <rect x={2}  y={15} width={8}  height={11} rx={2} fill={color} />
          <rect x={3}  y={16} width={6}  height={9}  rx={1} fill={d} opacity={0.45} />
          {/* Right cup */}
          <rect x={38} y={15} width={8}  height={11} rx={2} fill={color} />
          <rect x={39} y={16} width={6}  height={9}  rx={1} fill={d} opacity={0.45} />
          {/* Mic boom (small) */}
          <rect x={2}  y={25} width={1}  height={4}  fill={d} opacity={0.7} />
          <rect x={1}  y={28} width={3}  height={2}  rx={1} fill={d} />
        </g>
      )

    case 'star':
      return (
        <g transform="translate(15, 33)">
          <polygon
            points="9,0 11,6 17,6 12,9 14,15 9,11 4,15 6,9 1,6 7,6"
            fill={color}
            stroke={d}
            strokeWidth={0.5}
          />
          <polygon
            points="9,2 10.5,6.5 15,6.5 11.5,9 12.5,13 9,10.5 5.5,13 6.5,9 3,6.5 7.5,6.5"
            fill={l}
            opacity={0.3}
          />
        </g>
      )

    case 'badge': {
      const bdark = shadeColor(color, -50)
      return (
        <g>
          {/* Lanyard string */}
          <line x1={24} y1={30} x2={24} y2={44} stroke={color} strokeWidth={1.5} opacity={0.6} />
          {/* Badge card body */}
          <rect x={17} y={44} width={14} height={10} fill={bdark} />
          <rect x={18} y={45} width={12} height={8}  fill={shadeColor(color, -30)} opacity={0.5} />
          {/* Badge photo area */}
          <rect x={18} y={46} width={4}  height={4}  fill={shadeColor(color, 20)} opacity={0.35} />
          {/* Badge text lines */}
          <rect x={23} y={47} width={6}  height={1}  fill={color} opacity={0.9} />
          <rect x={23} y={50} width={4}  height={1}  fill={color} opacity={0.5} />
          {/* AWS stripe at top */}
          <rect x={17} y={44} width={14} height={2}  fill={color} opacity={0.8} />
        </g>
      )
    }

    case 'scarf':
      return (
        <g>
          {/* Back wrap */}
          <rect x={14} y={29} width={20} height={5}  fill={color} />
          <rect x={14} y={29} width={20} height={2}  fill={l} opacity={0.3} />
          {/* Front knot */}
          <rect x={19} y={32} width={10} height={5}  fill={color} />
          <rect x={20} y={33} width={8}  height={3}  fill={l} opacity={0.2} />
          {/* Left hanging end */}
          <rect x={16} y={36} width={5}  height={12} fill={shadeColor(color, -15)} />
          <rect x={17} y={46} width={3}  height={2}  fill={d} opacity={0.6} />
        </g>
      )

    default:
      return null
  }
}

// ─── Level-based internal effects ────────────────────────────────────────

function LevelDetails({ level }: { level: number }): React.ReactElement | null {
  // Lv 20 — pixel crown above head
  if (level >= 20) {
    return (
      <g>
        {/* Crown base */}
        <rect x={16} y={0}  width={16} height={3}  fill="#f59e0b" />
        {/* Three crown points */}
        <rect x={16} y={-5} width={4}  height={5}  fill="#f59e0b" />
        <rect x={22} y={-8} width={4}  height={8}  fill="#fbbf24" />
        <rect x={28} y={-5} width={4}  height={5}  fill="#f59e0b" />
        {/* Gem insets */}
        <rect x={17} y={-2} width={2}  height={2}  fill="#ef4444" />
        <rect x={23} y={-4} width={2}  height={2}  fill="#7c3aed" />
        <rect x={29} y={-2} width={2}  height={2}  fill="#22c55e" />
        {/* Crown base highlight */}
        <rect x={16} y={0}  width={16} height={1}  fill="rgba(255,255,255,0.3)" />
      </g>
    )
  }

  // Lv 15–19 — shoulder rank pips
  if (level >= 15) {
    return (
      <g>
        <rect x={0}  y={33} width={3} height={3} fill="#8b5cf6" opacity={0.85} />
        <rect x={0}  y={37} width={3} height={3} fill="#8b5cf6" opacity={0.55} />
        <rect x={45} y={33} width={3} height={3} fill="#8b5cf6" opacity={0.85} />
        <rect x={45} y={37} width={3} height={3} fill="#8b5cf6" opacity={0.55} />
      </g>
    )
  }

  // Lv 10–14 — small screen device on left hand
  if (level >= 10) {
    return (
      <g>
        {/* Device body */}
        <rect x={44} y={40} width={5}  height={4}  fill="#1e293b" />
        {/* Screen */}
        <rect x={45} y={41} width={3}  height={2}  fill="#3b82f6" opacity={0.75} />
        {/* Screen glow line */}
        <rect x={45} y={41} width={3}  height={1}  fill="rgba(255,255,255,0.25)" />
      </g>
    )
  }

  // Lv 5–9 — chest badge pip
  if (level >= 5) {
    return (
      <g>
        <rect x={32} y={37} width={5}  height={5}  fill="#22c55e" />
        <rect x={33} y={38} width={3}  height={3}  fill="rgba(255,255,255,0.5)" />
      </g>
    )
  }

  return null
}

// ─── Main component ───────────────────────────────────────────────────────

export const VoxelCharacter: React.FC<VoxelCharacterProps> = ({
  skinColor,
  hairColor,
  hairStyle,
  shirtStyle   = 'plain',
  torsoColor,
  pantsStyle   = 'jeans',
  pantsColor,
  shoeStyle    = 'sneakers',
  shoeColor,
  accessory    = null,
  accessoryColor = '#888',
  width  = 64,
  height = 96,
  level,
}) => {
  const skinShade = shadeColor(skinColor, -20)

  return (
    <svg
      viewBox="0 0 48 80"
      width={width}
      height={height}
      overflow="visible"
      xmlns="http://www.w3.org/2000/svg"
      style={{ imageRendering: 'pixelated', display: 'block' }}
    >
      {/* ── 1. Shoes (bottom layer) ── */}
      <Shoes style={shoeStyle} shoeColor={shoeColor} />

      {/* ── 2. Legs ── */}
      <Legs style={pantsStyle} pantsColor={pantsColor} skinColor={skinColor} />

      {/* ── 3. Body + Arms (shirt) ── */}
      <BodyAndArms style={shirtStyle} torsoColor={torsoColor} skinColor={skinColor} />

      {/* ── 4. Hands ── */}
      <rect x={0}  y={51} width={5} height={5} fill={skinColor} />
      <rect x={0}  y={51} width={2} height={5} fill={skinShade}  opacity={0.3} />
      <rect x={43} y={51} width={5} height={5} fill={skinColor} />
      <rect x={46} y={51} width={2} height={5} fill={skinShade}  opacity={0.3} />

      {/* ── 5. Neck ── */}
      <rect x={18} y={29} width={12} height={5}  fill={skinColor} />
      <rect x={18} y={29} width={3}  height={5}  fill={skinShade} opacity={0.35} />

      {/* ── 6. Hair (behind head) ── */}
      <Hair style={hairStyle} color={hairColor} />

      {/* ── 7. Hood behind head (hoodie only) ── */}
      {shirtStyle === 'hoodie' && (
        <rect x={14} y={26} width={20} height={7} rx={1} fill={shadeColor(torsoColor, -18)} />
      )}

      {/* ── 8. Head (on top of hair/hood) ── */}
      <rect x={10} y={7}  width={28} height={23} fill={skinColor} />
      <rect x={10} y={7}  width={4}  height={23} fill={skinShade} opacity={0.35} />
      <rect x={34} y={7}  width={4}  height={23} fill={skinShade} opacity={0.28} />
      <rect x={14} y={27} width={20} height={3}  fill={skinShade} opacity={0.18} />

      {/* ── 9. Eyes ── */}
      {/* Left */}
      <rect x={14} y={15} width={7}  height={6}  fill="white"    opacity={0.95} />
      <rect x={15} y={16} width={4}  height={4}  fill="#0a0f1a" />
      <rect x={17} y={16} width={1}  height={1}  fill="white"    opacity={0.8} />
      {/* Right */}
      <rect x={27} y={15} width={7}  height={6}  fill="white"    opacity={0.95} />
      <rect x={28} y={16} width={4}  height={4}  fill="#0a0f1a" />
      <rect x={30} y={16} width={1}  height={1}  fill="white"    opacity={0.8} />

      {/* ── 10. Mouth ── */}
      <rect x={18} y={24} width={12} height={2}  fill={skinShade} opacity={0.75} />
      <rect x={18} y={23} width={2}  height={1}  fill={skinShade} opacity={0.4} />
      <rect x={28} y={23} width={2}  height={1}  fill={skinShade} opacity={0.4} />

      {/* ── 11. Accessory (on top of face) ── */}
      <Accessory type={accessory} color={accessoryColor} />

      {/* ── 12. Level-based internal effects ── */}
      {level !== undefined && <LevelDetails level={level} />}
    </svg>
  )
}
