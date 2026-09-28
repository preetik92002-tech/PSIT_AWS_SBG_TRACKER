import React, { useState } from 'react'
import {
  X,
  FolderGit2,
  Github,
  Globe,
  Users,
  Calendar,
  Tag,
  CheckCircle2,
  Clock,
  Archive,
  Trash2,
  Edit2,
  ShieldCheck,
  PlusCircle,
  ExternalLink,
  Loader2,
  AlertCircle,
  Award,
} from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { BuilderAvatar } from '@/components/ui/BuilderAvatar'
import type { ProjectWithTeam } from '@/lib/projects'
import { updateProject, archiveProject, deleteProject } from '@/lib/projects'
import type { ProjectStatus } from '@/types/database'

interface ProjectDetailsModalProps {
  project: ProjectWithTeam
  isManager: boolean
  currentUserId?: string
  onClose: () => void
  onProjectUpdated: () => void
  onEditClick: () => void
  onOpenContribution?: (projectTitle: string) => void
}

export const ProjectDetailsModal: React.FC<ProjectDetailsModalProps> = ({
  project,
  isManager,
  currentUserId,
  onClose,
  onProjectUpdated,
  onEditClick,
  onOpenContribution,
}) => {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const isAssigned = (project.team_members || []).some((m) => m.user_id === currentUserId)
  const isLead =
    project.created_by === currentUserId ||
    (project.team_members || []).some((m) => m.user_id === currentUserId && m.role === 'lead')

  const canManage = isManager || isLead

  const handleStatusChange = async (newStatus: ProjectStatus) => {
    try {
      setIsUpdatingStatus(true)
      setErrorMsg(null)
      await updateProject(project.id, { status: newStatus })
      setSuccessMsg(`Status updated to ${newStatus}`)
      onProjectUpdated()
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update status')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleArchive = async () => {
    if (!window.confirm('Archive this project? It will remain visible in the archives filter.')) return
    try {
      setIsUpdatingStatus(true)
      await archiveProject(project.id)
      onProjectUpdated()
      onClose()
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to archive project')
      setIsUpdatingStatus(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to permanently delete this project?')) return
    try {
      setIsDeleting(true)
      await deleteProject(project.id)
      onProjectUpdated()
      onClose()
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete project')
      setIsDeleting(false)
    }
  }

  const team = project.team_members || []

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fadeIn"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl rounded-2xl bg-[#121824] border border-[#232F40] shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        {/* Cover Image or Cloud Gradient */}
        {project.cover_image_url ? (
          <div className="w-full h-44 sm:h-52 bg-[#0E141F] relative overflow-hidden border-b border-[#1F293A]">
            <img
              src={project.cover_image_url}
              alt={project.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#121824] via-transparent to-transparent" />
          </div>
        ) : (
          <div className="w-full h-24 bg-gradient-to-r from-[#18202E] via-[#121824] to-[#1F2B3E] border-b border-[#1F293A] flex items-center justify-between px-6">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <FolderGit2 size={16} className="text-purple-400" />
              Community Architecture Project
            </span>
          </div>
        )}

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#1E2736] flex items-start justify-between bg-[#0D121B] flex-shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base sm:text-lg font-mono font-bold text-white tracking-wide">
                {project.title}
              </h2>
              <span
                className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                  project.status === 'Active'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : project.status === 'Completed'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    : project.status === 'Planning'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {project.status}
              </span>
            </div>
            {project.creator && (
              <p className="text-[11px] font-mono text-slate-400">
                Initiated by{' '}
                <span className="text-slate-200 font-bold">
                  {project.creator.full_name || project.creator.email.split('@')[0]}
                </span>
                {project.creator.aws_builder_alias && (
                  <span className="text-[#FF9900] ml-1">@{project.creator.aws_builder_alias}</span>
                )}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1E2736] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 font-sans text-xs">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 font-mono text-xs flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-xs flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <h4 className="text-[11px] font-mono uppercase tracking-widest text-slate-400 font-bold">
              Project Overview
            </h4>
            <p className="text-sm text-slate-200 leading-relaxed font-sans">
              {project.description || 'No description provided for this community project.'}
            </p>
          </div>

          {/* Tech Stack Tags */}
          {Array.isArray(project.tech_tags) && project.tech_tags.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-[11px] font-mono uppercase tracking-widest text-slate-400 font-bold flex items-center gap-1.5">
                <Tag size={12} className="text-[#FF9900]" />
                <span>Technologies & AWS Services</span>
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {project.tech_tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-mono bg-[#18202E] border border-[#232F40] text-slate-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* External Links Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {project.github_url && (
              <a
                href={project.github_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-xl bg-[#0D121B] border border-[#232F40] hover:border-slate-500 flex items-center justify-between text-slate-200 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <Github size={16} className="text-white" />
                  <div>
                    <span className="block font-mono text-[10px] text-slate-400 uppercase">
                      Source Code
                    </span>
                    <span className="font-mono text-xs font-bold text-white group-hover:text-[#FF9900] transition-colors truncate max-w-[180px] block">
                      GitHub Repository
                    </span>
                  </div>
                </div>
                <ExternalLink size={14} className="text-slate-400 group-hover:text-white" />
              </a>
            )}

            {project.live_demo_url && (
              <a
                href={project.live_demo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-xl bg-[#0D121B] border border-[#232F40] hover:border-slate-500 flex items-center justify-between text-slate-200 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <Globe size={16} className="text-emerald-400" />
                  <div>
                    <span className="block font-mono text-[10px] text-slate-400 uppercase">
                      Live Application
                    </span>
                    <span className="font-mono text-xs font-bold text-white group-hover:text-emerald-300 transition-colors truncate max-w-[180px] block">
                      Architecture / Demo
                    </span>
                  </div>
                </div>
                <ExternalLink size={14} className="text-slate-400 group-hover:text-white" />
              </a>
            )}
          </div>

          {/* Timeline */}
          {(project.start_date || project.end_date) && (
            <div className="p-3.5 rounded-xl bg-[#0D121B] border border-[#1E2736] flex items-center gap-3 font-mono text-xs text-slate-300">
              <Calendar size={16} className="text-[#FF9900] shrink-0" />
              <div className="flex items-center gap-2 flex-wrap">
                {project.start_date && (
                  <span>
                    Started: <strong>{new Date(project.start_date).toLocaleDateString()}</strong>
                  </span>
                )}
                {project.start_date && project.end_date && <span>•</span>}
                {project.end_date && (
                  <span>
                    Target: <strong>{new Date(project.end_date).toLocaleDateString()}</strong>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Team Roster */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-mono uppercase tracking-widest text-slate-400 font-bold flex items-center gap-1.5">
              <Users size={14} className="text-[#FF9900]" />
              <span>Project Team Roster ({team.length})</span>
            </h4>

            {team.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#0D121B] border border-[#1E2736] text-center text-xs font-mono text-slate-500">
                No team members assigned yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {team.map((m) => {
                  const u = m.user
                  const name = u?.full_name || u?.email?.split('@')[0] || 'Builder'
                  return (
                    <div
                      key={m.id}
                      className="p-3 rounded-xl bg-[#0D121B] border border-[#1E2736] flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar initials={name.slice(0, 2).toUpperCase()} src={u?.avatar_url || undefined} size="sm" />
                        <div className="min-w-0">
                          <span className="block font-bold text-white text-xs truncate">{name}</span>
                          {u?.aws_builder_alias ? (
                            <span className="text-[10px] font-mono text-[#FF9900] block truncate">
                              @{u.aws_builder_alias}
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-slate-400 block truncate">
                              {u?.email}
                            </span>
                          )}
                        </div>
                      </div>
                      <span
                        className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded-md font-bold ${
                          m.role === 'lead'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-[#18202E] text-slate-300 border border-[#232F40]'
                        }`}
                      >
                        {m.role}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Member Action: Log Contribution from this Project */}
          {isAssigned && onOpenContribution && (
            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="font-mono text-xs font-bold text-purple-300 flex items-center gap-1.5">
                  <Award size={14} />
                  <span>You are a team contributor on this project</span>
                </span>
                <p className="text-[11px] text-slate-400">
                  Did you assist a teammate or implement a key architectural milestone? Record a contribution!
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenContribution(project.title)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-slate-950 bg-[#FF9900] hover:bg-[#EC7211] transition-colors cursor-pointer shrink-0"
              >
                <PlusCircle size={13} />
                <span>Log Contribution</span>
              </button>
            </div>
          )}
        </div>

        {/* Manager & Lead Controls Footer */}
        {canManage && (
          <div className="px-6 py-3.5 border-t border-[#1F293A] bg-[#0D121B] flex items-center justify-between gap-3 flex-wrap flex-shrink-0">
            {/* Quick Status Toggles */}
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <span className="text-slate-400 mr-1">Status:</span>
              {(['Planning', 'Active', 'Completed'] as ProjectStatus[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  disabled={isUpdatingStatus || project.status === st}
                  onClick={() => handleStatusChange(st)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-colors cursor-pointer disabled:opacity-40 ${
                    project.status === st
                      ? 'bg-white text-slate-950'
                      : 'bg-[#18202E] text-slate-300 hover:text-white border border-[#232F40]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Actions: Edit, Archive, Delete */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onEditClick}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-slate-200 bg-[#18202E] hover:bg-[#222E42] border border-[#232F40] transition-colors cursor-pointer"
              >
                <Edit2 size={13} />
                <span>Edit</span>
              </button>

              {project.status !== 'Archived' && (
                <button
                  type="button"
                  onClick={handleArchive}
                  disabled={isUpdatingStatus}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-amber-300 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-colors cursor-pointer"
                >
                  <Archive size={13} />
                  <span>Archive</span>
                </button>
              )}

              {isManager && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 bg-[#18202E] hover:bg-rose-950/30 border border-[#232F40] transition-colors cursor-pointer"
                  title="Delete project permanently"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
