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
} from 'lucide-react'
import { useCommunity } from '@/context/CommunityContext'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui/Avatar'

export interface AddProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onProjectAdded?: () => void
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
}) => {
  const { activeCommunity } = useCommunity()
  const { user } = useAuth()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [liveDemoUrl, setLiveDemoUrl] = useState('')
  const [techTagsInput, setTechTagsInput] = useState('AWS Lambda, DynamoDB, React, Tailwind')
  const [achievement, setAchievement] = useState('Community Initiative')
  const [selectedTeamMemberIds, setSelectedTeamMemberIds] = useState<string[]>([])

  const [communityMembers, setCommunityMembers] = useState<ChapterBuilderOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Fetch only members of current active community for team member selection
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
        if (user?.id && !selectedTeamMemberIds.includes(user.id)) {
          setSelectedTeamMemberIds([user.id])
        }
      } catch (err) {
        console.error('Failed to load roster', err)
      }
    }

    fetchRoster()
  }, [isOpen, activeCommunity?.id, user?.id])

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
      const selectedMembersData = communityMembers
        .filter((m) => selectedTeamMemberIds.includes(m.userId))
        .map((m) => ({ id: m.userId, name: m.name, avatar: m.avatarUrl }))

      const tags = techTagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)

      // Insert into community_projects strictly scoped to activeCommunity.id
      const { error } = await supabase.from('community_projects').insert({
        community_id: activeCommunity.id,
        title: title.trim(),
        description: description.trim() || null,
        github_url: githubUrl.trim() || null,
        status: 'in_progress',
        created_by: user.id,
      })

      if (error) throw error

      // Log activity
      await supabase.from('community_activities').insert({
        community_id: activeCommunity.id,
        user_id: user.id,
        activity_type: 'created project',
        description: `Registered new community project "${title.trim()}"`,
      })

      setSuccessMessage('Project successfully submitted to the chapter showcase!')
      setTimeout(() => {
        onProjectAdded?.()
        onClose()
      }, 1000)
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to register project.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
              <FolderGit2 size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 font-mono">Register Community Project</h2>
              <p className="text-[11px] text-slate-500">{activeCommunity.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto font-sans">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 size={15} className="shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-mono font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Project Name *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. AWS Cloud Cost Optimizer & Idle Detector"
              className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-[#FF9900]"
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this project do and how does it use AWS services?"
              className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-[#FF9900]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono font-semibold text-slate-700 uppercase tracking-wider mb-1">
                GitHub Repository
              </label>
              <div className="relative">
                <Github size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="url"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/..."
                  className="w-full pl-8 pr-3 py-2 text-xs font-mono rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-[#FF9900]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Live Demo Link
              </label>
              <div className="relative">
                <Globe size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="url"
                  value={liveDemoUrl}
                  onChange={(e) => setLiveDemoUrl(e.target.value)}
                  placeholder="https://demo.app"
                  className="w-full pl-8 pr-3 py-2 text-xs font-mono rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-[#FF9900]"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Technology Tags (comma-separated)
            </label>
            <input
              type="text"
              value={techTagsInput}
              onChange={(e) => setTechTagsInput(e.target.value)}
              placeholder="AWS Lambda, DynamoDB, Bedrock, React"
              className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-[#FF9900]"
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Achievement Tag
            </label>
            <input
              type="text"
              value={achievement}
              onChange={(e) => setAchievement(e.target.value)}
              placeholder="e.g. AWS Hackathon 1st Place or Production Ready"
              className="w-full px-3 py-2 text-xs font-sans rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-[#FF9900]"
            />
          </div>

          {/* Team Members Selector (Strictly current community) */}
          <div>
            <label className="block text-xs font-mono font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Credit Team Members (From this Chapter)
            </label>
            <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50/50 space-y-1">
              {communityMembers.map((m) => {
                const isSelected = selectedTeamMemberIds.includes(m.userId)
                return (
                  <label
                    key={m.userId}
                    className={`flex items-center justify-between p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                      isSelected ? 'bg-orange-50 text-[#EA580C] font-semibold' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Avatar initials={m.name.slice(0, 2).toUpperCase()} src={m.avatarUrl || undefined} size="sm" />
                      <span>{m.name}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleMember(m.userId)}
                      className="accent-[#FF9900] w-3.5 h-3.5"
                    />
                  </label>
                )
              })}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading || !title.trim()}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-mono font-bold text-white bg-[#FF9900] hover:bg-[#EA580C] disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <FolderGit2 size={14} />
                  <span>Register Project</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
