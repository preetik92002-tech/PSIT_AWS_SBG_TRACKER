import React, { useState, useEffect } from 'react'
import {
  X,
  FolderGit2,
  Github,
  Globe,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Users,
  Tag,
  Calendar,
  Image,
} from 'lucide-react'
import { useCommunity } from '@/context/CommunityContext'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui/Avatar'
import { createProject, updateProject, type ProjectWithTeam } from '@/lib/projects'
import type { ProjectStatus, ProjectMemberRole } from '@/types/database'

export interface AddProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onProjectAdded?: () => void
  projectToEdit?: ProjectWithTeam | null
}

interface ChapterBuilderOption {
  userId: string
  name: string
  avatarUrl: string | null
}

export const AddProjectModal: React.FC<AddProjectModalProps> = ({
  isOpen,
  onClose,
  onProjectAdded,
  projectToEdit,
}) => {
  const { activeCommunity } = useCommunity()
  const { user } = useAuth()

  const isEditing = Boolean(projectToEdit)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [coverImageUrl, setCoverImageUrl] = useState('')
  const [status, setStatus] = useState<ProjectStatus>('Planning')
  const [githubUrl, setGithubUrl] = useState('')
  const [liveDemoUrl, setLiveDemoUrl] = useState('')
  const [techTagsInput, setTechTagsInput] = useState('AWS Lambda, DynamoDB, React, Tailwind')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedTeamMemberIds, setSelectedTeamMemberIds] = useState<string[]>([])

  const [communityMembers, setCommunityMembers] = useState<ChapterBuilderOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Populate form if editing
  useEffect(() => {
    if (projectToEdit) {
      setTitle(projectToEdit.title || '')
      setDescription(projectToEdit.description || '')
      setCoverImageUrl(projectToEdit.cover_image_url || '')
      setStatus((projectToEdit.status as ProjectStatus) || 'Active')
      setGithubUrl(projectToEdit.github_url || '')
      setLiveDemoUrl(projectToEdit.live_demo_url || '')
      setTechTagsInput(
        Array.isArray(projectToEdit.tech_tags) && projectToEdit.tech_tags.length > 0
          ? projectToEdit.tech_tags.join(', ')
          : ''
      )
      setStartDate(
        projectToEdit.start_date ? new Date(projectToEdit.start_date).toISOString().split('T')[0] : ''
      )
      setEndDate(
        projectToEdit.end_date ? new Date(projectToEdit.end_date).toISOString().split('T')[0] : ''
      )
      const existingMemberIds = (projectToEdit.team_members || []).map((m) => m.user_id)
      setSelectedTeamMemberIds(existingMemberIds)
    } else {
      setTitle('')
      setDescription('')
      setCoverImageUrl('')
      setStatus('Planning')
      setGithubUrl('')
      setLiveDemoUrl('')
      setTechTagsInput('AWS Lambda, DynamoDB, React, Tailwind')
      setStartDate('')
      setEndDate('')
      if (user?.id) {
        setSelectedTeamMemberIds([user.id])
      }
    }
  }, [projectToEdit, isOpen, user?.id])

  // Fetch only active members of current community
  useEffect(() => {
    if (!isOpen || !activeCommunity?.id) return

    const fetchRoster = async () => {
      try {
        const { data } = await supabase
          .from('community_members')
          .select(`
            user_id,
            profiles!community_members_user_id_fkey (
              id,
              full_name,
              email,
              avatar_url
            )
          `)
          .eq('community_id', activeCommunity.id)
          .eq('status', 'active')

        const list: ChapterBuilderOption[] = (data || []).map((m: any) => ({
          userId: m.user_id,
          name: m.profiles?.full_name || m.profiles?.email?.split('@')[0] || 'Builder',
          avatarUrl: m.profiles?.avatar_url || null,
        }))

        setCommunityMembers(list)
      } catch (err) {
        console.error('Failed to load roster', err)
      }
    }

    fetchRoster()
  }, [isOpen, activeCommunity?.id])

  if (!isOpen || !activeCommunity) return null

  const handleToggleMember = (uid: string) => {
    if (selectedTeamMemberIds.includes(uid)) {
      setSelectedTeamMemberIds(selectedTeamMemberIds.filter((id) => id !== uid))
    } else {
      setSelectedTeamMemberIds([...selectedTeamMemberIds, uid])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !user) return

    setIsLoading(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const tags = techTagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)

      if (isEditing && projectToEdit) {
        await updateProject(projectToEdit.id, {
          title: title.trim(),
          description: description.trim() || null,
          cover_image_url: coverImageUrl.trim() || null,
          status,
          tech_tags: tags,
          github_url: githubUrl.trim() || null,
          live_demo_url: liveDemoUrl.trim() || null,
          start_date: startDate ? new Date(startDate).toISOString() : null,
          end_date: endDate ? new Date(endDate).toISOString() : null,
        })
        setSuccessMessage('Project updated successfully!')
      } else {
        const initialMembers = selectedTeamMemberIds.map((uid) => ({
          userId: uid,
          role: (uid === user.id ? 'lead' : 'collaborator') as ProjectMemberRole,
        }))

        await createProject({
          communityId: activeCommunity.id,
          title: title.trim(),
          description: description.trim() || undefined,
          status,
          coverImageUrl: coverImageUrl.trim() || undefined,
          techTags: tags,
          githubUrl: githubUrl.trim() || undefined,
          liveDemoUrl: liveDemoUrl.trim() || undefined,
          startDate: startDate ? new Date(startDate).toISOString() : undefined,
          endDate: endDate ? new Date(endDate).toISOString() : undefined,
          initialTeamMembers: initialMembers,
        })
        setSuccessMessage('Project created successfully!')
      }

      setTimeout(() => {
        onProjectAdded?.()
        onClose()
      }, 700)
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save project.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-xl rounded-2xl bg-[#121824] border border-[#232F40] shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1F293A] bg-[#0E141F] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center justify-center">
              <FolderGit2 size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wide">
                {isEditing ? 'Edit Community Project' : 'Register Community Project'}
              </h2>
              <p className="text-[11px] font-sans text-slate-400">{activeCommunity.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1E2736] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 font-sans text-xs">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-2 font-mono">
              <AlertCircle size={15} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-2 font-mono">
              <CheckCircle2 size={15} className="shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Project Name */}
          <div className="space-y-1">
            <label className="block font-mono text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
              Project Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. AWS Cloud Resume Challenge API"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0D121B] border border-[#232F40] text-white focus:outline-none focus:border-[#FF9900] font-mono text-xs"
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="block font-mono text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the architectural objectives, AWS services utilized, and problem solved..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0D121B] border border-[#232F40] text-white focus:outline-none focus:border-[#FF9900] text-xs resize-none"
            />
          </div>

          {/* Status & Technology */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="block font-mono text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                Project Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0D121B] border border-[#232F40] text-white focus:outline-none focus:border-[#FF9900] font-mono text-xs"
              >
                <option value="Planning">Planning</option>
                <option value="Active">Active</option>
                <option value="Completed">Completed</option>
                <option value="Archived">Archived</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block font-mono text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                Technology / Services
              </label>
              <input
                type="text"
                value={techTagsInput}
                onChange={(e) => setTechTagsInput(e.target.value)}
                placeholder="Lambda, DynamoDB, CDK, React"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0D121B] border border-[#232F40] text-white focus:outline-none focus:border-[#FF9900] font-mono text-xs"
              />
            </div>
          </div>

          {/* Cover Image URL */}
          <div className="space-y-1">
            <label className="block font-mono text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
              Cover Image URL (Optional)
            </label>
            <div className="relative">
              <Image size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="url"
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#0D121B] border border-[#232F40] text-white focus:outline-none focus:border-[#FF9900] font-mono text-xs"
              />
            </div>
          </div>

          {/* GitHub & Demo URLs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="block font-mono text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                GitHub Repository
              </label>
              <div className="relative">
                <Github size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="url"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/..."
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#0D121B] border border-[#232F40] text-white focus:outline-none focus:border-[#FF9900] font-mono text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block font-mono text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                Live Demo / Architecture URL
              </label>
              <div className="relative">
                <Globe size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="url"
                  value={liveDemoUrl}
                  onChange={(e) => setLiveDemoUrl(e.target.value)}
                  placeholder="https://project.example.com"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#0D121B] border border-[#232F40] text-white focus:outline-none focus:border-[#FF9900] font-mono text-xs"
                />
              </div>
            </div>
          </div>

          {/* Timeline: Start & End Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="block font-mono text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0D121B] border border-[#232F40] text-white focus:outline-none focus:border-[#FF9900] font-mono text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-mono text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                Target / Completion Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0D121B] border border-[#232F40] text-white focus:outline-none focus:border-[#FF9900] font-mono text-xs"
              />
            </div>
          </div>

          {/* Team Members Section (Only Community Members Can Be Added) */}
          <div className="space-y-2 pt-1 border-t border-[#1F293A]">
            <div className="flex items-center justify-between">
              <label className="font-mono text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Users size={14} className="text-[#FF9900]" />
                <span>Project Team Members ({selectedTeamMemberIds.length})</span>
              </label>
              <span className="text-[10px] font-mono text-slate-400">
                Only {activeCommunity.short_name} members
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-1 bg-[#0D121B] rounded-xl border border-[#232F40]">
              {communityMembers.map((member) => {
                const isSelected = selectedTeamMemberIds.includes(member.userId)
                return (
                  <button
                    key={member.userId}
                    type="button"
                    onClick={() => handleToggleMember(member.userId)}
                    className={`flex items-center gap-2 p-2 rounded-lg text-left transition-colors cursor-pointer border ${
                      isSelected
                        ? 'bg-purple-500/15 border-purple-500/50 text-purple-200'
                        : 'bg-[#121824] border-[#1F293A] text-slate-400 hover:text-white'
                    }`}
                  >
                    <Avatar initials={member.name.slice(0, 2).toUpperCase()} src={member.avatarUrl || undefined} size="xs" />
                    <span className="truncate text-[11px] font-medium">{member.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Submit Actions */}
          <div className="pt-3 border-t border-[#1F293A] flex items-center justify-end gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !title.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-bold text-slate-950 bg-[#FF9900] hover:bg-[#EC7211] transition-all cursor-pointer shadow-md disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin text-slate-900" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{isEditing ? 'Save Changes' : 'Register Project'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
