import React, { useState, useEffect } from 'react'
import {
  Mail,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Edit3,
  X,
  Save,
  Loader2,
  Terminal,
  ExternalLink,
} from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { RoleBadge } from '@/components/ui/RoleBadge'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase/client'

export const ProfileForm: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    fullName: '',
    bio: '',
    builderAlias: '',
    builderUrl: '',
  })

  // Populate form with real database profile
  useEffect(() => {
    if (profile) {
      setFormData({
        fullName: profile.full_name || '',
        bio: profile.bio || '',
        builderAlias: profile.aws_builder_alias || '',
        builderUrl: profile.aws_builder_profile_url || '',
      })
    } else if (user) {
      setFormData({
        fullName: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
        bio: '',
        builderAlias: '',
        builderUrl: '',
      })
    }
  }, [profile, user])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setFeedbackMessage(null)

    if (!user) {
      setErrorMessage('User session not found. Please log in again.')
      return
    }

    setIsSaving(true)
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.fullName.trim() || null,
          bio: formData.bio.trim() || null,
          aws_builder_alias: formData.builderAlias.trim() || null,
          aws_builder_profile_url: formData.builderUrl.trim() || null,
        })
        .eq('id', user.id)

      if (updateError) {
        setErrorMessage(updateError.message)
        setIsSaving(false)
        return
      }

      await refreshProfile()
      setIsEditing(false)
      setFeedbackMessage('Profile changes saved successfully to your database account.')

      setTimeout(() => {
        setFeedbackMessage(null)
      }, 5000)
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'An error occurred while saving profile changes.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    if (profile) {
      setFormData({
        fullName: profile.full_name || '',
        bio: profile.bio || '',
        builderAlias: profile.aws_builder_alias || '',
        builderUrl: profile.aws_builder_profile_url || '',
      })
    }
    setErrorMessage(null)
    setIsEditing(false)
  }

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Community Builder'
  const displayEmail = profile?.email || user?.email || 'authenticated@domain.com'
  const joinedDate = profile?.joined_at
    ? new Date(profile.joined_at).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : 'Recently Joined'

  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'AB'

  return (
    <div className="space-y-6">
      {/* Feedback & Error Banners */}
      {feedbackMessage && (
        <div className="p-3.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs font-mono flex items-center gap-2">
          <AlertCircle size={15} className="text-rose-400 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Profile Card */}
      <div className="rounded-xl border border-slate-200/90 bg-white overflow-hidden shadow-xs">
        {/* Banner */}
        <div className="h-28 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-200 p-6 flex items-end justify-between">
          <div className="flex items-center gap-2">
            <RoleBadge role={profile?.role || 'member'} size="md" />
            <span className="text-xs font-mono text-slate-300 font-medium">
              Verified Identity
            </span>
          </div>

          {!isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#FF9900] hover:bg-[#EC7211] transition-all shadow-xs cursor-pointer"
            >
              <Edit3 size={13} />
              <span>Edit Profile</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSaving}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
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
              <Avatar initials={initials} size="xl" className="ring-4 ring-white shadow-md" />
            </div>
            <div className="mt-2 sm:mt-8 min-w-0 flex-1">
              <h2 className="text-xl font-bold font-mono text-slate-900 truncate">
                {displayName}
              </h2>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-xs font-mono text-slate-500">
                <span className="flex items-center gap-1">
                  <Mail size={12} className="text-slate-400" />
                  {displayEmail}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar size={12} className="text-slate-400" />
                  Member since {joinedDate}
                </span>
              </div>
            </div>
          </div>

          {/* Form / Details */}
          {!isEditing ? (
            /* Read-only view */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-1">
                    Full Name
                  </label>
                  <p className="text-sm font-mono text-slate-800">
                    {profile?.full_name || '—'}
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-1">
                    Email Address
                  </label>
                  <p className="text-sm font-mono text-slate-800">
                    {displayEmail}
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-1">
                    Community Role
                  </label>
                  <div className="mt-0.5">
                    <RoleBadge role={profile?.role || 'member'} size="sm" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-1">
                    AWS Builder Alias
                  </label>
                  <p className="text-sm font-mono text-[#FF9900] flex items-center gap-1 font-semibold">
                    <Terminal size={13} />
                    {profile?.aws_builder_alias ? `@${profile.aws_builder_alias}` : 'Not connected'}
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-1">
                    AWS Builder Profile URL
                  </label>
                  {profile?.aws_builder_profile_url ? (
                    <a
                      href={profile.aws_builder_profile_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-mono text-[#FF9900] hover:text-[#EC7211] underline inline-flex items-center gap-1 transition-colors truncate max-w-full"
                    >
                      <span className="truncate">{profile.aws_builder_profile_url}</span>
                      <ExternalLink size={12} className="flex-shrink-0" />
                    </a>
                  ) : (
                    <p className="text-sm font-mono text-slate-400">Not provided</p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-1">
                    Bio
                  </label>
                  <p className="text-sm text-slate-700 leading-relaxed font-sans">
                    {profile?.bio || 'No bio provided yet.'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Editing form */
            <form onSubmit={handleSave} className="space-y-5 pt-4 border-t border-slate-150">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-600 mb-1.5 font-medium">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    disabled={isSaving}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm font-mono focus:outline-none focus:border-[#FF9900] focus:ring-1 focus:ring-[#FF9900] transition-colors disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-600 mb-1.5 font-medium">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={displayEmail}
                    disabled
                    title="Email address is managed by Supabase Authentication"
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 text-sm font-mono cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-600 mb-1.5 font-medium">
                    AWS Builder Alias
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-mono text-sm">
                      @
                    </span>
                    <input
                      type="text"
                      name="builderAlias"
                      value={formData.builderAlias}
                      onChange={handleChange}
                      disabled={isSaving}
                      placeholder="alias"
                      className="w-full pl-7 pr-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm font-mono focus:outline-none focus:border-[#FF9900] focus:ring-1 focus:ring-[#FF9900] transition-colors disabled:opacity-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-600 mb-1.5 font-medium">
                    AWS Builder Profile URL
                  </label>
                  <input
                    type="url"
                    name="builderUrl"
                    value={formData.builderUrl}
                    onChange={handleChange}
                    disabled={isSaving}
                    placeholder="https://community.aws/u/username"
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm font-mono focus:outline-none focus:border-[#FF9900] focus:ring-1 focus:ring-[#FF9900] transition-colors disabled:opacity-50"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-600 mb-1.5 font-medium">
                    Bio
                  </label>
                  <textarea
                    name="bio"
                    rows={3}
                    value={formData.bio}
                    onChange={handleChange}
                    disabled={isSaving}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm font-sans focus:outline-none focus:border-[#FF9900] focus:ring-1 focus:ring-[#FF9900] transition-colors disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#FF9900] hover:bg-[#EC7211] transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save size={13} />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
