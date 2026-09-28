import { supabase } from '@/lib/supabase/client'

export type SearchResultType = 'member' | 'task' | 'event' | 'project'

export interface GlobalSearchResult {
  id: string
  type: SearchResultType
  title: string
  subtitle: string
  imageUrl?: string | null
  communityName: string
  metadata: {
    label?: string
    badge?: string
    detail?: string
  }
  url: string
}

/**
 * Searches across authorized community resources: Members, Tasks, Events, Projects.
 * Scoped strictly to the active community and the user's authorization level.
 */
export async function searchCommunityResources(
  communityId: string,
  query: string,
  communityName: string,
  isManager: boolean
): Promise<GlobalSearchResult[]> {
  const q = query.trim()
  if (!q || !communityId) return []

  const results: GlobalSearchResult[] = []
  const pattern = `%${q}%`

  try {
    // 1. Search Members (only active members within active community)
    const { data: memberRows, error: memberErr } = await supabase
      .from('community_members')
      .select(`
        user_id,
        role,
        profiles (
          id,
          full_name,
          email,
          avatar_url,
          aws_builder_alias,
          institution_name
        )
      `)
      .eq('community_id', communityId)
      .eq('status', 'active')
      .limit(20)

    if (!memberErr && memberRows) {
      const qLower = q.toLowerCase()
      for (const row of memberRows) {
        const p = row.profiles as any
        if (!p) continue

        const nameMatch = (p.full_name || '').toLowerCase().includes(qLower)
        const emailMatch = (p.email || '').toLowerCase().includes(qLower)
        const aliasMatch = (p.aws_builder_alias || '').toLowerCase().includes(qLower)
        const instMatch = (p.institution_name || '').toLowerCase().includes(qLower)

        if (nameMatch || emailMatch || aliasMatch || instMatch) {
          results.push({
            id: row.user_id,
            type: 'member',
            title: p.full_name || p.email?.split('@')[0] || 'Community Member',
            subtitle: p.aws_builder_alias ? `@${p.aws_builder_alias}` : p.email,
            imageUrl: p.avatar_url,
            communityName,
            metadata: {
              badge: row.role === 'manager' ? '👑 Manager' : 'Member',
              detail: p.institution_name || 'Builder Cohort',
            },
            url: `/members/${row.user_id}`,
          })
        }
      }
    }

    // 2. Search Tasks (strictly within active community)
    const { data: taskRows, error: taskErr } = await supabase
      .from('community_tasks')
      .select('id, title, description, points, priority, due_date, topic')
      .eq('community_id', communityId)
      .or(`title.ilike.${pattern},description.ilike.${pattern},topic.ilike.${pattern}`)
      .limit(6)

    if (!taskErr && taskRows) {
      for (const task of taskRows) {
        results.push({
          id: task.id,
          type: 'task',
          title: task.title,
          subtitle: task.topic || task.description || 'Hands-on deliverable',
          communityName,
          metadata: {
            badge: `${task.points || 50} XP`,
            label: task.priority ? `${task.priority.toUpperCase()} PRIORITY` : undefined,
            detail: task.due_date ? `Due ${new Date(task.due_date).toLocaleDateString()}` : undefined,
          },
          url: `/tasks`,
        })
      }
    }

    // 3. Search Events (strictly within active community, non-managers only see published/live)
    let eventsQuery = supabase
      .from('community_events')
      .select('id, title, description, start_time, event_date, location, status, image_url')
      .eq('community_id', communityId)
      .or(`title.ilike.${pattern},description.ilike.${pattern},location.ilike.${pattern}`)
      .limit(6)

    if (!isManager) {
      eventsQuery = eventsQuery.neq('status', 'draft')
    }

    const { data: eventRows, error: eventErr } = await eventsQuery

    if (!eventErr && eventRows) {
      for (const event of eventRows) {
        results.push({
          id: event.id,
          type: 'event',
          title: event.title,
          subtitle: event.location || 'Online Meetup',
          imageUrl: event.image_url,
          communityName,
          metadata: {
            badge: (event.status || 'published').toUpperCase(),
            detail: event.event_date ? new Date(event.event_date).toLocaleDateString() : undefined,
          },
          url: `/events/${event.id}`,
        })
      }
    }

    // 4. Search Projects (strictly within active community)
    const { data: projectRows, error: projErr } = await supabase
      .from('community_projects')
      .select('id, title, description, status, cover_image_url, tech_tags')
      .eq('community_id', communityId)
      .or(`title.ilike.${pattern},description.ilike.${pattern}`)
      .limit(6)

    if (!projErr && projectRows) {
      for (const proj of projectRows) {
        const primaryTech = Array.isArray(proj.tech_tags) && proj.tech_tags.length > 0 ? proj.tech_tags.join(', ') : null
        results.push({
          id: proj.id,
          type: 'project',
          title: proj.title,
          subtitle: primaryTech || proj.description || 'Collaborative repository',
          imageUrl: proj.cover_image_url,
          communityName,
          metadata: {
            badge: (proj.status || 'Active').toUpperCase(),
            detail: primaryTech ? primaryTech.split(',')[0] : 'Cloud App',
          },
          url: `/projects`,
        })
      }
    }
  } catch (err) {
    console.error('[GlobalSearch] Unexpected error while searching:', err)
  }

  return results
}
