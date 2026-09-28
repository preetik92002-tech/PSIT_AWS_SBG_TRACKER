import { supabase } from './supabase'
import type {
  CommunityProject,
  CommunityProjectInsert,
  ProjectStatus,
  ProjectMemberRole,
  CommunityProjectMember,
} from '@/types/database'

export interface ProjectWithTeam extends CommunityProject {
  creator?: {
    id: string
    full_name: string | null
    email: string
    avatar_url: string | null
    aws_builder_alias?: string | null
  } | null
  team_members?: Array<{
    id: string
    user_id: string
    role: ProjectMemberRole
    created_at: string
    user?: {
      id: string
      full_name: string | null
      email: string
      avatar_url: string | null
      aws_builder_alias?: string | null
    } | null
  }>
}

/**
 * Lists all projects for a specific community, with team members and creator profiles.
 */
export async function listCommunityProjects(communityId: string): Promise<ProjectWithTeam[]> {
  try {
    const { data: projectsData, error: projErr } = await supabase
      .from('community_projects')
      .select(`
        *,
        creator:profiles!community_projects_created_by_fkey (
          id,
          full_name,
          email,
          avatar_url,
          aws_builder_alias
        ),
        community_project_members (
          id,
          user_id,
          role,
          created_at,
          user:profiles!community_project_members_user_id_fkey (
            id,
            full_name,
            email,
            avatar_url,
            aws_builder_alias
          )
        )
      `)
      .eq('community_id', communityId)
      .order('created_at', { ascending: false })

    if (projErr) {
      console.error('Failed to list projects:', projErr.message)
      // Fallback query if relationships not resolved in cache
      const { data: fallbackProjects, error: fbErr } = await supabase
        .from('community_projects')
        .select('*')
        .eq('community_id', communityId)
        .order('created_at', { ascending: false })

      if (fbErr) throw fbErr
      return (fallbackProjects as unknown as ProjectWithTeam[]) || []
    }

    return (projectsData as unknown as ProjectWithTeam[]) || []
  } catch (err) {
    console.error('listCommunityProjects unexpected error:', err)
    return []
  }
}

/**
 * Retrieves full details for a single project.
 */
export async function getProjectDetails(projectId: string): Promise<ProjectWithTeam | null> {
  const { data, error } = await supabase
    .from('community_projects')
    .select(`
      *,
      creator:profiles!community_projects_created_by_fkey (
        id,
        full_name,
        email,
        avatar_url,
        aws_builder_alias
      ),
      community_project_members (
        id,
        user_id,
        role,
        created_at,
        user:profiles!community_project_members_user_id_fkey (
          id,
          full_name,
          email,
          avatar_url,
          aws_builder_alias
        )
      )
    `)
    .eq('id', projectId)
    .maybeSingle()

  if (error) {
    console.error('Failed to fetch project details:', error.message)
    return null
  }

  return (data as unknown as ProjectWithTeam) || null
}

/**
 * Creates a project with authorization checks and optional initial team members.
 */
export async function createProject(params: {
  communityId: string
  title: string
  description?: string
  status?: ProjectStatus
  coverImageUrl?: string
  techTags?: string[]
  githubUrl?: string
  liveDemoUrl?: string
  startDate?: string
  endDate?: string
  initialTeamMembers?: Array<{ userId: string; role: ProjectMemberRole }>
}): Promise<CommunityProject> {
  const { data: userRes } = await supabase.auth.getUser()
  const userId = userRes?.user?.id

  const { data: project, error: insertErr } = await supabase
    .from('community_projects')
    .insert({
      community_id: params.communityId,
      title: params.title.trim(),
      description: params.description?.trim() || null,
      status: params.status || 'Planning',
      cover_image_url: params.coverImageUrl || null,
      tech_tags: params.techTags || [],
      github_url: params.githubUrl?.trim() || null,
      live_demo_url: params.liveDemoUrl?.trim() || null,
      start_date: params.startDate || null,
      end_date: params.endDate || null,
      created_by: userId || null,
    })
    .select()
    .single()

  if (insertErr || !project) {
    throw new Error(insertErr?.message || 'Failed to create project')
  }

  // Add creator as project lead if not explicitly in initial team
  const membersToAdd = [...(params.initialTeamMembers || [])]
  if (userId && !membersToAdd.some((m) => m.userId === userId)) {
    membersToAdd.unshift({ userId, role: 'lead' })
  }

  // Assign team members
  for (const m of membersToAdd) {
    await supabase.rpc('add_project_member', {
      p_project_id: project.id,
      p_user_id: m.userId,
      p_role: m.role || 'collaborator',
    })
  }

  // Publish activity log
  if (userId) {
    await supabase.from('community_activities').insert({
      community_id: params.communityId,
      user_id: userId,
      activity_type: 'created project',
      description: `Launched new project: "${project.title}"`,
      metadata: { project_id: project.id, status: project.status },
    })
  }

  return project
}

/**
 * Updates project fields.
 */
export async function updateProject(
  projectId: string,
  updates: Partial<CommunityProjectInsert>
): Promise<CommunityProject> {
  const { data, error } = await supabase
    .from('community_projects')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId)
    .select()
    .single()

  if (error || !data) {
    throw new Error(error?.message || 'Failed to update project')
  }

  return data
}

/**
 * Archives a project.
 */
export async function archiveProject(projectId: string): Promise<void> {
  await updateProject(projectId, { status: 'Archived' })
}

/**
 * Permanently deletes a project.
 */
export async function deleteProject(projectId: string): Promise<void> {
  const { error } = await supabase
    .from('community_projects')
    .delete()
    .eq('id', projectId)

  if (error) {
    throw new Error(error.message || 'Failed to delete project')
  }
}

/**
 * Adds a community member to the project team with authorization check.
 */
export async function addProjectMember(
  projectId: string,
  userId: string,
  role: ProjectMemberRole = 'collaborator'
): Promise<void> {
  const { data, error } = await supabase.rpc('add_project_member', {
    p_project_id: projectId,
    p_user_id: userId,
    p_role: role,
  })

  if (error) {
    throw new Error(error.message || 'Failed to add project member')
  }

  const res = data as any
  if (res && res.error) {
    throw new Error(res.error)
  }

  // Dispatch notification to newly added collaborator
  try {
    const { data: proj } = await supabase
      .from('community_projects')
      .select('title, community_id')
      .eq('id', projectId)
      .single()

    if (proj) {
      await supabase.from('notifications').insert({
        recipient_id: userId,
        community_id: proj.community_id,
        type: 'project',
        title: 'Added to Project Team',
        message: `You have been added to the project "${proj.title}".`,
        entity_type: 'project',
        entity_id: projectId,
      })
    }
  } catch (notifErr) {
    console.warn('Could not dispatch project member notification:', notifErr)
  }
}

/**
 * Removes a member from the project team.
 */
export async function removeProjectMember(
  projectId: string,
  userId: string
): Promise<void> {
  const { data, error } = await supabase.rpc('remove_project_member', {
    p_project_id: projectId,
    p_user_id: userId,
  })

  if (error) {
    throw new Error(error.message || 'Failed to remove project member')
  }

  const res = data as any
  if (res && res.error) {
    throw new Error(res.error)
  }
}
