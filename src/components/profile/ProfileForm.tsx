import React, { useState } from 'react'
import {
  User,
  Mail,
  Shield,
  FileText,
  Terminal,
  ExternalLink,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Edit3,
  X,
  Save,
} from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { RoleBadge } from '@/components/ui/RoleBadge'

export interface ProfileData {
  fullName: string
  email: string
  role: 'member' | 'admin' | 'builder' | 'leader'
  bio: string
  builderAlias: string
  builderUrl: string
  joinedDate: string
}

const INITIAL_PROFILE: ProfileData = {
  fullName: 'Preeti Sharma',
  email: 'preeti@builder.hub',
  role: 'member',
  bio: 'Cloud architecture enthusiast focusing on serverless patterns, event-driven pipelines, and distributed systems on AWS.',
  builderAlias: 'preeti_builds',
  builderUrl: 'https://community.aws/u/preeti_builds',
  joinedDate: 'September 2026',
}

export const ProfileForm: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<ProfileData>(INITIAL_PROFILE)
  const [persistedData, setPersistedData] = useState<ProfileData>(INITIAL_PROFILE)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()

    // ──────────────────────────────────────────────────────────────────────────
    // LEVEL 2 HOOK POINT:
    // When Supabase is connected, call:
    // await supabase.from('profiles').update(formData).eq('id', user.id)
    // ──────────────────────────────────────────────────────────────────────────
    setPersistedData(formData)
    setIsEditing(false)
    setFeedbackMessage('Profile changes saved in client memory! (Supabase persistence will be attached in Level 2)')

    setTimeout(() => {
      setFeedbackMessage(null)
    }, 5000)
  }

  const handleCancel = () => {
    setFormData(persistedData)
    setIsEditing(false)
  }

  const initials = persistedData.fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()

  return (
    <div className="space-y-6">
      {/* Feedback banner */}
      {feedbackMessage && (
        <div className="p-3.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Main Profile Card */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
        {/* Banner */}
        <div className="h-28 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800 p-6 flex items-end justify-between">
          <div className="flex items-center gap-2">
            <RoleBadge role={persistedData.role} size="md" />
            <span className="text-xs font-mono text-slate-400">
              Community Identity
            </span>
          </div>

          {!isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium text-slate-200 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 transition-colors shadow-sm cursor-pointer"
            >
              <Edit3 size={13} />
              <span>Edit Profile</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-mono text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <X size={13} />
                <span>Cancel</span>
              </button>
            </div>
          )}
        </div>

        {/* Profile Content Body */}
        <div className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 -mt-14 mb-6">
            <div className="relative">
              <Avatar initials={initials} size="xl" className="ring-4 ring-[#0B0F17]" />
            </div>
            <div className="mt-2 sm:mt-8 min-w-0 flex-1">
              <h2 className="text-xl font-bold font-mono text-slate-100 truncate">
                {persistedData.fullName}
              </h2>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1">
                  <Mail size={12} className="text-slate-400" />
                  {persistedData.email}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar size={12} className="text-slate-400" />
                  Member since {persistedData.joinedDate}
                </span>
              </div>
            </div>
          </div>

          {/* Form / Details */}
          {!isEditing ? (
            /* Read-only view */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-800/80">
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1">
                    Full Name
                  </label>
                  <p className="text-sm font-mono text-slate-200">
                    {persistedData.fullName}
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1">
                    Email Address
                  </label>
                  <p className="text-sm font-mono text-slate-200">
                    {persistedData.email}
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1">
                    Community Role
                  </label>
                  <div className="mt-0.5">
                    <RoleBadge role={persistedData.role} size="sm" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1">
                    AWS Builder Alias
                  </label>
                  <p className="text-sm font-mono text-amber-400/90 flex items-center gap-1">
                    <Terminal size={13} />
                    @{persistedData.builderAlias}
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1">
                    AWS Builder Profile URL
                  </label>
                  <a
                    href={persistedData.builderUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-mono text-amber-400 hover:text-amber-300 underline inline-flex items-center gap-1 transition-colors"
                  >
                    <span>{persistedData.builderUrl}</span>
                    <ExternalLink size={12} />
                  </a>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1">
                    Bio
                  </label>
                  <p className="text-sm text-slate-300 leading-relaxed font-sans">
                    {persistedData.bio}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Editing form */
            <form onSubmit={handleSave} className="space-y-5 pt-4 border-t border-slate-800">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 rounded-md bg-slate-950 border border-slate-750 text-slate-100 text-sm font-mono focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 rounded-md bg-slate-950 border border-slate-750 text-slate-100 text-sm font-mono focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                    AWS Builder Alias
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-500 font-mono text-sm">
                      @
                    </span>
                    <input
                      type="text"
                      name="builderAlias"
                      value={formData.builderAlias}
                      onChange={handleChange}
                      placeholder="alias"
                      className="w-full pl-7 pr-3 py-2 rounded-md bg-slate-950 border border-slate-750 text-slate-100 text-sm font-mono focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                    AWS Builder Profile URL
                  </label>
                  <input
                    type="url"
                    name="builderUrl"
                    value={formData.builderUrl}
                    onChange={handleChange}
                    placeholder="https://community.aws/u/username"
                    className="w-full px-3 py-2 rounded-md bg-slate-950 border border-slate-750 text-slate-100 text-sm font-mono focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                    Bio
                  </label>
                  <textarea
                    name="bio"
                    rows={3}
                    value={formData.bio}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-md bg-slate-950 border border-slate-750 text-slate-100 text-sm font-sans focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                  />
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-mono font-medium text-slate-900 bg-amber-500 hover:bg-amber-400 transition-colors shadow-sm cursor-pointer"
                >
                  <Save size={13} />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
