/**
 * Community utilities: normalization, duplicate detection, and join code helpers.
 */
import { supabase } from '@/lib/supabase/client'

/**
 * Standardizes an institution string into a normalized comparison key.
 * Removes common academic words, punctuation, and extra whitespace.
 * e.g., "Pranveer Singh Institute of Technology, Kanpur" -> "psit kanpur" or "pranveer singh"
 */
export function normalizeInstitutionName(raw: string): string {
  if (!raw) return ''

  return raw
    .toLowerCase()
    .trim()
    // Replace punctuation with spaces
    .replace(/[^a-z0-9\s]/g, ' ')
    // Normalize common academic words
    .replace(/\b(institute|technology|engineering|university|college|campus|group|school|of|and|the|in|at)\b/g, '')
    // Collapse multiple whitespace
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Checks whether an official chapter already exists for the given institution.
 * Uses both direct ILIKE on institution name and normalized matching.
 */
export async function findDuplicateInstitutionCommunity(
  institution: string,
  excludeCommunityId?: string
): Promise<{ exists: boolean; existingCommunity?: any }> {
  const trimmed = institution.trim()
  if (trimmed.length < 3) return { exists: false }

  const normalized = normalizeInstitutionName(trimmed)

  try {
    let query = supabase
      .from('communities')
      .select('id, name, short_name, institution, city, logo_url')

    if (excludeCommunityId) {
      query = query.neq('id', excludeCommunityId)
    }

    // Check direct substring
    const { data, error } = await query.ilike('institution', `%${trimmed}%`).limit(5)

    if (error) {
      console.warn('[Community] Error checking duplicate institution:', error.message)
      return { exists: false }
    }

    if (data && data.length > 0) {
      return { exists: true, existingCommunity: data[0] }
    }

    // Secondary check with normalized terms if multiple words exist
    if (normalized.length >= 3) {
      const words = normalized.split(' ').filter((w) => w.length >= 3)
      for (const word of words) {
        let wordQuery = supabase
          .from('communities')
          .select('id, name, short_name, institution, city, logo_url')
          .ilike('institution', `%${word}%`)

        if (excludeCommunityId) {
          wordQuery = wordQuery.neq('id', excludeCommunityId)
        }

        const { data: wordData } = await wordQuery.limit(1)
        if (wordData && wordData.length > 0) {
          return { exists: true, existingCommunity: wordData[0] }
        }
      }
    }

    return { exists: false }
  } catch (err) {
    console.warn('[Community] Duplicate check exception:', err)
    return { exists: false }
  }
}
