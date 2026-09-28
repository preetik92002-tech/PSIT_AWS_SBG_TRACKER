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
  Award,
  Edit2,
  Archive,
  Trash2,
  ArrowRight,
  Shield,
  Layers,
} from 'lucide-react'
import { useCommunity } from '@/context/CommunityContext'
import { useAuth } from '@/context/AuthContext'
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'
import { CommunityImage, BuilderAvatar } from '@/components/ui'
import { Avatar } from '@/components/ui/Avatar'
import { AddProjectModal } from '@/components/projects/AddProjectModal'
import { ProjectDetailsModal } from '@/components/projects/ProjectDetailsModal'
import { ContributionsList } from '@/components/contributions/ContributionsList'
import { CreateContributionModal } from '@/components/contributions/CreateContributionModal'
import {
  listCommunityProjects,
  deleteProject,
  archiveProject,
  type ProjectWithTeam,
} from '@/lib/projects'
import type { ProjectStatus } from '@/types/database'

export const Projects: React.FC = () => {
  const { activeCommunity, userRoleInActiveCommunity } = useCommunity()
  const { user } = useAuth()

  const isManager = userRoleInActiveCommunity === 'manager'

  // Top Section Mode: 'projects' vs 'contributions'
  const [activeView, setActiveView] = useState<'projects' | 'contributions'>('projects')

  // Projects State
  const [projects, setProjects] = useState<ProjectWithTeam[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All' | ProjectStatus>('All')

  // Modals State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [projectToEdit, setProjectToEdit] = useState<ProjectWithTeam | null>(null)
  const [selectedProjectForDetails, setSelectedProjectForDetails] = useState<ProjectWithTeam | null>(null)

  // Contribution from project trigger
  const [isContributionModalOpen, setIsContributionModalOpen] = useState(false)
  const [contributionInitialTitle, setContributionInitialTitle] = useState('')

  const fetchProjects = async () => {
    if (!activeCommunity?.id) return

    setIsLoading(true)
    setErrorMessage(null)

    try {
      const list = await listCommunityProjects(activeCommunity.id)
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
          (p.description && p.description.toLowerCase().includes(q)) ||
          (Array.isArray(p.tech_tags) && p.tech_tags.some((t) => t.toLowerCase().includes(q)))
      )
    }

    return result
  }, [projects, statusFilter, searchTerm])

  const handleOpenEdit = (proj: ProjectWithTeam, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setProjectToEdit(proj)
    setIsAddModalOpen(true)
  }

  const handleArchive = async (projId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!window.confirm('Archive this project?')) return
    try {
      await archiveProject(projId)
      fetchProjects()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (projId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!window.confirm('Are you sure you want to permanently delete this project?')) return
    try {
      await deleteProject(projId)
      fetchProjects()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto overflow-x-hidden">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1F293A] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight font-sans">
              Projects &amp; Contributions
            </h1>
            {activeCommunity && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-[#FF9900]/10 text-[#FF9900] border border-[#FF9900]/30">
                <Building2 size={12} />
                <span>{activeCommunity.short_name || activeCommunity.name}</span>
              </span>
            )}
          </div>
          <p className="text-xs md:text-sm text-slate-400 mt-1 font-sans">
            Build serverless architectures, collaborate on cloud initiatives, and track verified peer contributions.
          </p>
        </div>

        {/* Top Controls: Add Project CTA */}
        {activeView === 'projects' && (
          <button
            type="button"
            onClick={() => {
              setProjectToEdit(null)
              setIsAddModalOpen(true)
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-bold text-slate-950 bg-[#FF9900] hover:bg-[#EC7211] transition-all shadow-xs cursor-pointer self-start sm:self-auto shrink-0"
          >
            <Plus size={14} />
            <span>Register Project</span>
          </button>
        )}
      </div>

      {/* Main Feature Tabs Switcher: Projects vs Peer Contributions */}
      <div className="flex items-center gap-2 p-1 rounded-xl bg-[#0D121B] border border-[#1E2736] w-fit font-mono text-xs">
        <button
          type="button"
          onClick={() => setActiveView('projects')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-colors cursor-pointer ${
            activeView === 'projects'
              ? 'bg-[#18202E] text-white border border-[#232F40] shadow-2xs'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FolderGit2 size={14} className={activeView === 'projects' ? 'text-[#FF9900]' : ''} />
          <span>Projects &amp; Initiatives ({projects.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveView('contributions')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-colors cursor-pointer ${
            activeView === 'contributions'
              ? 'bg-[#18202E] text-white border border-[#232F40] shadow-2xs'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Award size={14} className={activeView === 'contributions' ? 'text-[#FF9900]' : ''} />
          <span>Peer Contributions &amp; Help</span>
        </button>
      </div>

      {/* VIEW A: PROJECTS & SHOWCASE */}
      {activeView === 'projects' && (
        <div className="space-y-6">
          {/* Controls: Search + Status Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search projects by title, description, or technology tag..."
                className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-xl bg-[#121824] border border-[#1F293A] text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF9900] shadow-2xs"
              />
            </div>

            {/* Status Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 font-mono text-xs">
              {(['All', 'Planning', 'Active', 'Completed', 'Archived'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-xl border whitespace-nowrap transition-all cursor-pointer ${
                    statusFilter === s
                      ? 'bg-[#FF9900] text-slate-950 font-bold border-[#FF9900] shadow-xs'
                      : 'bg-[#121824] text-slate-400 border-[#1F293A] hover:bg-[#18202E] hover:text-slate-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Main Grid */}
          {isLoading ? (
            <div className="py-24">
              <LoadingState message="Loading community projects showcase..." />
            </div>
          ) : errorMessage ? (
            <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center font-mono">
              <p className="text-xs text-rose-400">{errorMessage}</p>
              <button
                type="button"
                onClick={fetchProjects}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition-colors"
              >
                <RefreshCw size={13} />
                <span>Retry</span>
              </button>
            </div>
          ) : filteredProjects.length === 0 ? (
            <EmptyState
              title="No projects match criteria"
              description={
                searchTerm
                  ? `No projects matching "${searchTerm}".`
                  : 'Submit your serverless architectures, hackathon initiatives, and cloud tools.'
              }
              icon={<FolderGit2 size={24} className="text-slate-400" />}
              badge="Projects"
              action={{
                label: 'Register First Project',
                onClick: () => {
                  setProjectToEdit(null)
                  setIsAddModalOpen(true)
                },
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((proj) => {
                const team = proj.team_members || []
                const isAssigned = team.some((m) => m.user_id === user?.id)
                const isCreator = proj.created_by === user?.id
                const canEdit = isManager || isCreator

                return (
                  <div
                    key={proj.id}
                    onClick={() => setSelectedProjectForDetails(proj)}
                    className="rounded-2xl border border-[#1F293A] bg-[#121824] overflow-hidden shadow-2xs hover:border-[#FF9900]/50 hover:bg-[#151D2C] transition-all flex flex-col justify-between cursor-pointer text-slate-100 group"
                  >
                    <div>
                      {/* Image / Header Gradient */}
                      {proj.cover_image_url ? (
                        <div className="w-full h-36 bg-[#0E141F] relative overflow-hidden border-b border-[#1F293A]">
                          <img
                            src={proj.cover_image_url}
                            alt={proj.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#121824] via-transparent to-transparent" />
                          <span
                            className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold shadow-xs uppercase ${
                              proj.status === 'Active'
                                ? 'bg-emerald-500/90 text-white'
                                : proj.status === 'Completed'
                                ? 'bg-blue-600/90 text-white'
                                : proj.status === 'Planning'
                                ? 'bg-purple-600/90 text-white'
                                : 'bg-slate-700/90 text-slate-300'
                            }`}
                          >
                            {proj.status}
                          </span>
                        </div>
                      ) : (
                        <div className="w-full h-20 bg-gradient-to-r from-[#18202E] via-[#121824] to-[#1F2B3E] border-b border-[#1F293A] p-4 flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <FolderGit2 size={14} className="text-purple-400" />
                            <span>Architecture</span>
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                              proj.status === 'Active'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : proj.status === 'Completed'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                : proj.status === 'Planning'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {proj.status}
                          </span>
                        </div>
                      )}

                      <div className="p-5 space-y-3">
                        {/* Title & Description */}
                        <div>
                          <h3 className="font-mono text-sm font-bold text-white group-hover:text-[#FF9900] transition-colors leading-snug">
                            {proj.title}
                          </h3>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2 font-sans">
                            {proj.description || 'Community architectural implementation and serverless application.'}
                          </p>
                        </div>

                        {/* Tech Stack Pills */}
                        {Array.isArray(proj.tech_tags) && proj.tech_tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {proj.tech_tags.slice(0, 3).map((tag, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-[#18202E] border border-[#232F40] text-slate-300"
                              >
                                {tag}
                              </span>
                            ))}
                            {proj.tech_tags.length > 3 && (
                              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-[#18202E] text-slate-500">
                                +{proj.tech_tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Team Roster Avatars */}
                        <div className="pt-2 border-t border-[#1F293A] flex items-center justify-between text-xs font-mono">
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                            Team ({team.length}):
                          </span>
                          <div className="flex items-center -space-x-1.5 overflow-hidden">
                            {team.slice(0, 4).map((m) => (
                              <Avatar
                                key={m.id}
                                initials={(m.user?.full_name || 'B').slice(0, 2).toUpperCase()}
                                src={m.user?.avatar_url || undefined}
                                size="xs"
                              />
                            ))}
                            {team.length > 4 && (
                              <div className="w-5 h-5 rounded-full bg-slate-800 text-[9px] font-bold text-slate-300 border border-slate-700 flex items-center justify-center">
                                +{team.length - 4}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer: External links & Manager Actions */}
                    <div className="p-5 pt-0 flex items-center justify-between gap-2 font-mono text-xs border-t border-[#1F293A]/50 mt-2 pt-3">
                      <div className="flex items-center gap-2">
                        {proj.github_url && (
                          <a
                            href={proj.github_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded-lg border border-[#232F40] bg-[#18202E] text-slate-300 hover:text-white hover:bg-[#222E42] transition-colors"
                            title="GitHub Repository"
                          >
                            <Github size={13} />
                          </a>
                        )}

                        {proj.live_demo_url && (
                          <a
                            href={proj.live_demo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                            title="Live Demo Application"
                          >
                            <Globe size={13} />
                          </a>
                        )}
                      </div>

                      {canEdit && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => handleOpenEdit(proj, e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#18202E] transition-colors"
                            title="Edit Project"
                          >
                            <Edit2 size={13} />
                          </button>

                          {proj.status !== 'Archived' && (
                            <button
                              type="button"
                              onClick={(e) => handleArchive(proj.id, e)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-[#18202E] transition-colors"
                              title="Archive Project"
                            >
                              <Archive size={13} />
                            </button>
                          )}

                          {isManager && (
                            <button
                              type="button"
                              onClick={(e) => handleDelete(proj.id, e)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-[#18202E] transition-colors"
                              title="Delete Project"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW B: PEER CONTRIBUTIONS */}
      {activeView === 'contributions' && activeCommunity && (
        <ContributionsList
          communityId={activeCommunity.id}
          isManager={isManager}
          currentUserId={user?.id}
        />
      )}

      {/* Create / Edit Project Modal */}
      {isAddModalOpen && (
        <AddProjectModal
          isOpen={isAddModalOpen}
          projectToEdit={projectToEdit}
          onClose={() => {
            setIsAddModalOpen(false)
            setProjectToEdit(null)
          }}
          onProjectAdded={fetchProjects}
        />
      )}

      {/* Project Details Modal */}
      {selectedProjectForDetails && (
        <ProjectDetailsModal
          project={selectedProjectForDetails}
          isManager={isManager}
          currentUserId={user?.id}
          onClose={() => setSelectedProjectForDetails(null)}
          onProjectUpdated={() => {
            fetchProjects()
          }}
          onEditClick={() => {
            const p = selectedProjectForDetails
            setSelectedProjectForDetails(null)
            handleOpenEdit(p)
          }}
          onOpenContribution={(title) => {
            setContributionInitialTitle(`Contribution to project: ${title}`)
            setIsContributionModalOpen(true)
          }}
        />
      )}

      {/* Contribution Modal from Project */}
      {isContributionModalOpen && activeCommunity && (
        <CreateContributionModal
          isOpen={isContributionModalOpen}
          initialTitle={contributionInitialTitle}
          onClose={() => setIsContributionModalOpen(false)}
          onSuccess={() => {
            setActiveView('contributions')
          }}
        />
      )}
    </div>
  )
}
