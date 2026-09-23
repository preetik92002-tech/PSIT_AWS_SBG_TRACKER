// ─── Core domain types ────────────────────────────────────────────────────

export type HairStyle   = 'short' | 'spiky' | 'long' | 'bob' | 'bun' | 'afro'
export type ShirtStyle  = 'plain' | 'hoodie' | 'jacket' | 'tshirt' | 'uniform'
export type PantsStyle  = 'jeans' | 'shorts' | 'cargo' | 'joggers' | 'formal'
export type ShoeStyle   = 'sneakers' | 'boots' | 'slides' | 'formal_shoe'
export type Accessory   = 'glasses' | 'cap' | 'headphones' | 'star' | 'badge' | 'scarf' | null

/** Visual tier driven by member level */
export type LevelTier = 'rookie' | 'builder' | 'developer' | 'senior' | 'master'

export function getLevelTier(level: number): LevelTier {
  if (level >= 20) return 'master'
  if (level >= 15) return 'senior'
  if (level >= 10) return 'developer'
  if (level >= 5)  return 'builder'
  return 'rookie'
}

export interface CharacterAppearance {
  skinColor:    string
  hairColor:    string
  hairStyle:    HairStyle
  shirtStyle?:  ShirtStyle   // defaults to 'plain'
  torsoColor:   string
  torsoAccent?: string
  pantsStyle?:  PantsStyle   // defaults to 'jeans'
  pantsColor:   string
  shoeStyle?:   ShoeStyle    // defaults to 'sneakers'
  shoeColor:    string
  accessory:    Accessory
  accessoryColor?: string
}

export interface Skill {
  name: string
  level: number // 1-5
  category: 'cloud' | 'frontend' | 'backend' | 'devops' | 'ai' | 'data' | 'security'
}

export interface Project {
  id: string
  name: string
  description: string
  stack: string[]
  status: 'active' | 'completed' | 'paused'
  xpReward: number
}

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  unlockedAt?: string
}

export interface WeeklyLog {
  week: string // ISO date of week start
  xpEarned: number
  topicsLearned: string[]
  hoursLogged: number
  projectsWorked: string[] // project IDs
}

export interface Member {
  id: string
  name: string
  username: string
  avatarInitials: string
  role: 'leader' | 'builder' | 'learner'
  level: number
  xp: number
  weeklyXp: number
  totalXp: number
  streak: number // current streak in days
  longestStreak: number
  currentTopic: string
  awsServices: string[]
  skills: Skill[]
  projects: Project[]
  achievements: Achievement[]
  weeklyLogs: WeeklyLog[]
  appearance: CharacterAppearance
  joinedAt: string
  lastActiveAt: string
  bio?: string
}

export interface ActivityItem {
  id: string
  memberId: string
  memberName: string
  action: string
  detail?: string
  xpGained: number
  timestamp: string
  type: 'learning' | 'project' | 'achievement' | 'streak' | 'deployment'
}

// ─── Supabase-ready (future) ──────────────────────────────────────────────
export interface DatabaseMember {
  id: string
  name: string
  username: string
  role: string
  level: number
  xp: number
  streak: number
  current_topic: string
  appearance: CharacterAppearance
  created_at: string
  updated_at: string
}
