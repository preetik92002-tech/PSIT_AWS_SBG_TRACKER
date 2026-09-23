/**
 * Deterministic character appearance generator.
 * Given a stable user ID string, returns a CharacterAppearance that is:
 *   - Always the same for the same user
 *   - Different enough across users to be visually distinct
 */

import type {
  CharacterAppearance,
  HairStyle,
  ShirtStyle,
  PantsStyle,
  ShoeStyle,
  Accessory,
} from '@/types'

// ── Palettes ──────────────────────────────────────────────────────────────

const SKIN_COLORS = [
  '#FDDBB4', '#F5CBA7', '#E8B89A', '#D4956A', '#C68642',
  '#B06B3B', '#8D5524', '#6B3E26', '#4E2A12',
]

const HAIR_COLORS = [
  '#1A1A1A', '#2C1810', '#4A2F1A', '#6B4226', '#8B6347',
  '#B8860B', '#CD853F', '#D2691E', '#A0522D',
  '#2C3E50', '#1C3358', '#003366',
]

const TORSO_COLORS = [
  '#FF9900', '#3B82F6', '#8B5CF6', '#10B981', '#EF4444',
  '#EC4899', '#F59E0B', '#14B8A6', '#6366F1', '#84CC16',
]

const PANTS_COLORS = [
  '#1E3A5F', '#2D3748', '#374151', '#1F2937', '#111827',
  '#3D2B1F', '#1A2332', '#243342', '#2B1D0E',
]

const SHOE_COLORS = [
  '#FFFFFF', '#1A1A1A', '#FF9900', '#3B82F6', '#EF4444',
  '#8B5CF6', '#10B981', '#F59E0B',
]

const HAIR_STYLES: HairStyle[] = ['short', 'spiky', 'long', 'bob', 'bun', 'afro']
const SHIRT_STYLES: ShirtStyle[] = ['plain', 'hoodie', 'jacket', 'tshirt', 'uniform']
const PANTS_STYLES: PantsStyle[] = ['jeans', 'shorts', 'cargo', 'joggers', 'formal']
const SHOE_STYLES: ShoeStyle[] = ['sneakers', 'boots', 'slides', 'formal_shoe']
const ACCESSORIES: Accessory[] = [
  'glasses', 'cap', 'headphones', 'star', 'badge', 'scarf', null, null, null,
]

// ── Deterministic hash ────────────────────────────────────────────────────

function hashString(str: string): number {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i)
    hash = hash >>> 0 // keep unsigned 32-bit
  }
  return hash
}

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length]
}

// ── Main export ──────────────────────────────────────────────────────────

/**
 * Generate a stable, deterministic CharacterAppearance from a user ID.
 * @param userId - Any stable string (typically UUID from `community_members.user_id`)
 */
export function generateAppearance(userId: string): CharacterAppearance {
  // Derive multiple independent seeds by hashing with different salts
  const h0 = hashString(userId + ':skin')
  const h1 = hashString(userId + ':hair_color')
  const h2 = hashString(userId + ':hair_style')
  const h3 = hashString(userId + ':shirt_style')
  const h4 = hashString(userId + ':torso_color')
  const h5 = hashString(userId + ':pants_style')
  const h6 = hashString(userId + ':pants_color')
  const h7 = hashString(userId + ':shoe_style')
  const h8 = hashString(userId + ':shoe_color')
  const h9 = hashString(userId + ':accessory')
  const h10 = hashString(userId + ':torso_accent')

  return {
    skinColor:    pick(SKIN_COLORS, h0),
    hairColor:    pick(HAIR_COLORS, h1),
    hairStyle:    pick(HAIR_STYLES, h2),
    shirtStyle:   pick(SHIRT_STYLES, h3),
    torsoColor:   pick(TORSO_COLORS, h4),
    torsoAccent:  pick(TORSO_COLORS, h10),
    pantsStyle:   pick(PANTS_STYLES, h5),
    pantsColor:   pick(PANTS_COLORS, h6),
    shoeStyle:    pick(SHOE_STYLES, h7),
    shoeColor:    pick(SHOE_COLORS, h8),
    accessory:    pick(ACCESSORIES, h9),
    accessoryColor: pick(TORSO_COLORS, hashString(userId + ':acc_color')),
  }
}
