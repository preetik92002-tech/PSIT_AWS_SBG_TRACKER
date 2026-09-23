import React, { useEffect, useState, useMemo } from 'react'
import {
  FolderGit2,
  Search,
  Filter,
  Plus,
  Github,
  Globe,
  Calendar,
  Users,
  Trophy,
  Tag,
  Building2,
  Sparkles,
  RefreshCw,
  ExternalLink,
} from 'lucide-react'
import { useCommunity } from '@/context/CommunityContext'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui/Avatar'
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'
import { AddProjectModal } from '@/components/projects/AddProjectModal'

interface CommunityProjectCard {
  id: string
  title: string
  description: string
  status: string
  githubUrl: string | null
  liveDemoUrl: string | null
  createdDate: string
  achievement: string
  techTags: string[]
  creatorName: string
  creatorAvatar: string | null
  teamMembers: Array<{
    id: string
    name: string
    avatar: string | null
  }>
}

export const Projects: React.FC = () => {
  const { activeCommunity } = useCommunity()
  const { user } = useAuth()

  const [projects, setProjects] = useState<CommunityProjectCard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  // Controls state
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All' | 'in_progress' | 'completed'>('All')

  // Fetch real projects strictly scoped to activeCommunity.id
  const fetchProjects = async () => {
    if (!activeCommunity?.id) return

    setIsLoading(true)
    setErrorMessage(null)

    try {
      const { data: rawProjects, error } = await supabase
        .from('community_projects')
        .select(`
          id,
          title,
          description,
          status,
          github_url,
          created_by,
          created_at,
          profiles!community_projects_created_by_fkey (
            id,
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('community_id', activeCommunity.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      const list: CommunityProjectCard[] = (rawProjects || []).map((proj: any) => {
        const p = proj.profiles || {}
        const name = p.full_name || p.email?.split('@')[0] || 'Community Builder'

        return {
          id: proj.id,
          title: proj.title,
          description: proj.description || 'Community architectural implementation and serverless application.',
          status: proj.status || 'in_progress',
          githubUrl: proj.github_url || null,
          liveDemoUrl: null,
          createdDate: new Date(proj.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          achievement: 'AWS Chapter Initiative',
          techTags: ['AWS Lambda', 'DynamoDB', 'React', 'Tailwind'],
          creatorName: name,
          creatorAvatar: p.avatar_url || null,
          teamMembers: [
            {
              id: proj.created_by,
              name,
              avatar: p.avatar_url || null,
            },
          ],
        }
      })

      setProjects(list)
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to query community projects.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [activeCommunity?.id])

  // Filter projects by search and status
  const filteredProjects = useMemo(() => {
    let result = [...projects]

    if (statusFilter !== 'All') {
      result = result.filter((p) => p.status === statusFilter)
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim()
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.techTags.some((t) => t.toLowerCase().includes(q))
      )
    }

    return result
  }, [projects, statusFilter, searchTerm])

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight font-sans">
              Projects
            </h1>
            {activeCommunity && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-orange-50 text-[#EA580C] border border-orange-200">
                <Building2 size={12} />
                {activeCommunity.name}
              </span>
            )}
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1 font-sans">
            Everything built by our community.
          </p>
        </div>

        {/* Add Project CTA */}
        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-bold text-white bg-[#FF9900] hover:bg-[#EA580C] transition-all shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus size={14} />
          <span>Add Project</span>
        </button>
      </div>

      {/* Controls: Search + Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search projects by name, description, or tech tag..."
            className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-xl bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF9900] focus:ring-1 focus:ring-[#FF9900] shadow-2xs"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 font-mono text-xs">
          {(['All', 'in_progress', 'completed'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                statusFilter === s
                  ? 'bg-slate-900 text-white font-bold border-slate-900 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {s === 'All' ? 'All' : s === 'in_progress' ? 'In Progress' : 'Completed'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content: Responsive Cards (3 columns desktop, 2 tablet, 1 card per row mobile) */}
      {isLoading ? (
        <div className="py-24">
          <LoadingState message="Loading community projects showcase..." />
        </div>
      ) : errorMessage ? (
        <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-center font-mono">
          <p className="text-xs text-red-700">{errorMessage}</p>
          <button
            type="button"
            onClick={fetchProjects}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-red-100 text-red-800 hover:bg-red-200"
          >
            <RefreshCw size={13} />
            <span>Retry</span>
          </button>
        </div>
      ) : filteredProjects.length === 0 ? (
        <EmptyState
          title="No projects found"
          description={
            searchTerm
              ? `No projects matching "${searchTerm}".`
              : 'Submit your serverless architectures, hackathon initiatives, and cloud tools.'
          }
          icon={<FolderGit2 size={24} className="text-slate-400" />}
          badge="Projects"
          action={{
            label: 'Submit First Project',
            onClick: () => setIsAddModalOpen(true),
          }}
        />
      ) : (
        /* Mobile: one card per row (grid-cols-1); Desktop: 3 columns (lg:grid-cols-3 md:grid-cols-2) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((proj) => (
            <div
              key={proj.id}
              className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs hover:border-orange-300 hover:shadow-xs transition-all flex flex-col justify-between"
            >
              <div>
                {/* Cover Image with AWS Gradient */}
                <div className="h-40 bg-gradient-to-r from-slate-800 via-indigo-950 to-slate-900 relative p-4 flex flex-col justify-between overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-[10px] font-mono text-white font-semibold flex items-center gap-1">
                      <Sparkles size={11} className="text-[#FF9900]" />
                      <span>{proj.status === 'completed' ? 'Completed' : 'In Progress'}</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-300">
                      {proj.createdDate}
                    </span>
                  </div>

                  <div>
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#FF9900]/20 text-[#FF9900] text-[10px] font-mono font-bold border border-[#FF9900]/30 mb-1">
                      <Trophy size={11} />
                      <span>{proj.achievement}</span>
                    </div>
                    <h3 className="text-sm font-bold text-white font-sans line-clamp-1">
                      {proj.title}
                    </h3>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 space-y-3">
                  <p className="text-xs text-slate-600 font-sans leading-relaxed line-clamp-3">
                    {proj.description}
                  </p>

                  {/* Technology Tags */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    {proj.techTags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono text-[10px] border border-slate-200"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Team Members */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-mono">
                    <span className="text-[11px] text-slate-400">Team:</span>
                    <div className="flex items-center gap-1.5">
                      <Avatar
                        initials={proj.creatorName.slice(0, 2).toUpperCase()}
                        src={proj.creatorAvatar || undefined}
                        size="sm"
                      />
                      <span className="font-semibold text-slate-700 font-sans text-xs">
                        {proj.creatorName}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer: GitHub & Live Demo Links */}
              <div className="p-5 pt-0 flex items-center justify-between gap-2 font-mono text-xs">
                {proj.githubUrl ? (
                  <a
                    href={proj.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Github size={13} />
                    <span>GitHub</span>
                  </a>
                ) : (
                  <span className="text-[11px] text-slate-400">Code private</span>
                )}

                {proj.liveDemoUrl && (
                  <a
                    href={proj.liveDemoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 text-[#EA580C] hover:bg-orange-100 transition-colors font-semibold"
                  >
                    <Globe size={13} />
                    <span>Live Demo</span>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Project Modal */}
      <AddProjectModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onProjectAdded={fetchProjects}
      />
    </div>
  )
}
