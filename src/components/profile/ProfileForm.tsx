import React, { useState, useEffect, useRef, useMemo } from 'react'
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
  Camera,
  Building2,
  MapPin,
  Phone,
  Award,
  Zap,
  CheckSquare,
  Clock,
  Sparkles,
  Shield,
  Layers,
  Activity as ActivityIcon,
} from 'lucide-react'
import { BuilderAvatar } from '@/components/ui/BuilderAvatar'
import { useAuth } from '@/context/AuthContext'
import { useCommunity } from '@/context/CommunityContext'
import { supabase } from '@/lib/supabase/client'
import { getLevelProgress, timeAgo } from '@/utils/cn'
import { getMemberAWSBuilderProfile } from '@/types/awsBadges'
import { AWSBuilderCenterSection, AWSBadgesTabContent } from '@/components/badges'

type ProfileTab = 'profile' | 'aws_badges' | 'community' | 'learning' | 'activity' | 'achievements'

export const ProfileForm: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth()
  const { activeCommunity, userRoleInActiveCommunity } = useCommunity()

  const [activeTab, setActiveTab] = useState<ProfileTab>('profile')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Derive connected AWS Builder Profile
  const builderProfile = useMemo(() => {
    return getMemberAWSBuilderProfile(
      profile?.aws_builder_alias,
      profile?.aws_builder_profile_url
    )
  }, [profile?.aws_builder_alias, profile?.aws_builder_profile_url])

  // Real stats fetched from database
  const [xp, setXp] = useState<number>(0)
  const [tasksCompleted, setTasksCompleted] = useState<number>(0)
  const [userActivities, setUserActivities] = useState<Array<{ id: string; description: string; activity_type: string; created_at: string }>>([])

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    institutionName: '',
    institutionAddress: '',
    bio: '',
    builderAlias: '',
    builderUrl: '',
  })

  // Populate form with real database profile
  useEffect(() => {
    if (profile) {
      setFormData({
        fullName: profile.full_name || '',
        phone: profile.phone || '',
        institutionName: profile.institution_name || '',
        institutionAddress: profile.institution_address || '',
        bio: profile.bio || '',
        builderAlias: profile.aws_builder_alias || '',
        builderUrl: profile.aws_builder_profile_url || '',
      })
    } else if (user) {
      setFormData({
        fullName: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
        phone: '',
        institutionName: '',
        institutionAddress: '',
        bio: '',
        builderAlias: '',
        builderUrl: '',
      })
    }
  }, [profile, user])

  // Load user-specific XP and activities
  useEffect(() => {
    if (!user) return

    const currentUserId = user.id

    async function loadUserData() {
      try {
        // Query tasks assigned and completed
        const { data: assignments } = await supabase
          .from('community_task_assignments')
          .select('status, community_tasks(points)')
          .eq('user_id', currentUserId)

        if (assignments) {
          let totalXp = 0
          let completed = 0
          for (const a of assignments) {
            if (a.status === 'completed') {
              completed++
              const pts = (a.community_tasks as { points?: number } | null)?.points || 0
              totalXp += pts
            }
          }
          setXp(totalXp)
          setTasksCompleted(completed)
        }

        // Query activities
        const { data: acts } = await supabase
          .from('community_activities')
          .select('id, description, activity_type, created_at')
          .eq('user_id', currentUserId)
          .order('created_at', { ascending: false })
          .limit(8)

        if (acts) {
          setUserActivities(acts)
        }
      } catch (err) {
        console.error('Error loading user profile stats:', err)
      }
    }

    loadUserData()
  }, [user])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Handle profile photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (PNG, JPG, WebP).')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Image size must be less than 5MB.')
      return
    }

    setIsUploadingPhoto(true)
    setErrorMessage(null)
    setFeedbackMessage(null)

    try {
      const fileExt = file.name.split('.').pop() || 'jpg'
      const filePath = `avatars/${user.id}_${Date.now()}.${fileExt}`

      // Attempt Supabase storage upload
      let finalAvatarUrl: string | null = null
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { cacheControl: '3600', upsert: true })

      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath)
        finalAvatarUrl = urlData?.publicUrl || null
      } else {
        console.warn('Storage upload notice, reading as data URL:', uploadError.message)
        // Fallback to data URL if storage policies are restrictive
        finalAvatarUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
      }

      if (finalAvatarUrl) {
        const { error: dbError } = await supabase
          .from('profiles')
          .update({ avatar_url: finalAvatarUrl })
          .eq('id', user.id)

        if (dbError) throw dbError

        await refreshProfile()
        setFeedbackMessage('Profile photo updated successfully!')
        setTimeout(() => setFeedbackMessage(null), 4000)
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to update profile photo.'
      )
    } finally {
      setIsUploadingPhoto(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
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
          phone: formData.phone.trim() || null,
          institution_name: formData.institutionName.trim() || null,
          institution_address: formData.institutionAddress.trim() || null,
          bio: formData.bio.trim() || null,
          aws_builder_alias: formData.builderAlias.trim() || null,
          aws_builder_profile_url: formData.builderUrl.trim() || null,
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      await refreshProfile()
      setIsEditing(false)
      setFeedbackMessage('Profile changes saved successfully.')
      setTimeout(() => setFeedbackMessage(null), 4000)
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
        phone: profile.phone || '',
        institutionName: profile.institution_name || '',
        institutionAddress: profile.institution_address || '',
        bio: profile.bio || '',
        builderAlias: profile.aws_builder_alias || '',
        builderUrl: profile.aws_builder_profile_url || '',
      })
    }
    setErrorMessage(null)
    setIsEditing(false)
  }

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Community Builder'
  const displayEmail = profile?.email || user?.email || 'builder@domain.com'
  const isManager = userRoleInActiveCommunity === 'manager' || profile?.role === 'admin'
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

  const { level, progress } = getLevelProgress(xp)

  return (
    <div className="space-y-6">
      {/* Feedback & Error Banners */}
      {feedbackMessage && (
        <div className="p-3.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 size={15} className="text-emerald-600 flex-shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-800 text-xs font-mono flex items-center gap-2">
          <AlertCircle size={15} className="text-rose-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BUILDER CENTER-INSPIRED PROFILE HERO (Dark Navy Technical Grid Surface) */}
      {/* ========================================================================= */}
      <div className="rounded-xl border border-slate-800/80 bg-[#0A0E17] text-white overflow-hidden shadow-sm relative">
        {/* Technical fine grid background */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Ambient subtle glow */}
        <div className="absolute top-0 right-0 w-80 h-40 bg-[#FF9900]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Avatar with Camera Upload Button */}
            <div className="relative group flex-shrink-0">
              <BuilderAvatar
                name={displayName}
                alias={profile?.aws_builder_alias}
                src={profile?.avatar_url}
                size="2xl"
                isManager={userRoleInActiveCommunity === 'manager'}
              />

              {/* Camera change photo button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPhoto}
                className="absolute bottom-0 right-0 p-2 rounded-full bg-[#FF9900] hover:bg-[#EC7211] text-slate-950 shadow-md transition-transform hover:scale-105 cursor-pointer disabled:opacity-50"
                title="Change profile photo"
                aria-label="Change profile photo"
              >
                {isUploadingPhoto ? (
                  <Loader2 size={13} className="animate-spin text-slate-950" />
                ) : (
                  <Camera size={13} />
                )}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>

            {/* Profile Identity Details */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-white truncate">
                  {displayName}
                </h1>
                {profile?.aws_builder_alias && (
                  <span className="font-mono text-xs text-[#FF9900] bg-[#FF9900]/10 px-2 py-0.5 rounded border border-[#FF9900]/30 font-medium">
                    @{profile.aws_builder_alias}
                  </span>
                )}
              </div>

              {/* Role & Community Identity */}
              <div className="flex flex-wrap items-center gap-y-1.5 gap-x-3 text-xs font-mono text-slate-300">
                <span className="inline-flex items-center gap-1 font-semibold text-[#FF9900]">
                  {isManager ? '👑 Community Manager' : 'Community Member'}
                </span>
                <span className="text-slate-600 hidden sm:inline">•</span>
                <span className="text-slate-300 truncate max-w-xs">
                  {activeCommunity ? activeCommunity.name : 'AWS Student Builder Group'}
                </span>
                {profile?.institution_name && (
                  <>
                    <span className="text-slate-600 hidden sm:inline">•</span>
                    <span className="text-slate-400 truncate max-w-xs flex items-center gap-1">
                      <Building2 size={12} className="text-slate-500" />
                      {profile.institution_name}
                    </span>
                  </>
                )}
              </div>

              {/* Metadata row */}
              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 mt-3 text-[11px] font-mono text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Mail size={12} className="text-slate-500" />
                  {displayEmail}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar size={12} className="text-slate-500" />
                  Member since {joinedDate}
                </span>
                <span className="flex items-center gap-1.5 text-amber-400/90">
                  <Zap size={12} />
                  Level {level} ({xp.toLocaleString()} XP)
                </span>
              </div>
            </div>

            {/* Edit Profile Action Button */}
            <div className="self-start sm:self-center">
              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-mono font-semibold text-slate-950 bg-[#FF9900] hover:bg-[#EC7211] transition-all shadow-xs cursor-pointer"
                >
                  <Edit3 size={13} />
                  <span>Edit Profile</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono font-medium text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <X size={13} />
                  <span>Cancel</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Technical Navigation Sub-Bar */}
        <div className="border-t border-slate-800/80 bg-[#080B11] px-6 flex items-center gap-1 overflow-x-auto scrollbar-none">
          {[
            { id: 'profile' as const, label: 'PROFILE' },
            { id: 'aws_badges' as const, label: `AWS BADGES (${builderProfile.badgeCount})` },
            { id: 'community' as const, label: 'COMMUNITY' },
            { id: 'learning' as const, label: 'LEARNING' },
            { id: 'activity' as const, label: 'ACTIVITY' },
            { id: 'achievements' as const, label: 'ACHIEVEMENTS' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-3.5 text-xs font-mono font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-[#FF9900] text-[#FF9900]'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB CONTENT: PROFILE (IDENTITY & EDITING) */}
      {/* ========================================================================= */}
      {activeTab === 'profile' && (
        <div className="rounded-xl border border-[#1F293A] bg-[#121824] p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-[#1F293A] mb-6">
            <div>
              <h2 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
                AWS Builder Identity
              </h2>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Official profile details connected to your AWS Builder account.
              </p>
            </div>
          </div>

          <div className="mb-6">
            <AWSBuilderCenterSection
              builderProfile={builderProfile}
              onViewBadgesTab={() => setActiveTab('aws_badges')}
            />
          </div>

          <form onSubmit={handleSave}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Full Name */}
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                  Full Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    disabled={isSaving}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-[#0E141F] border border-[#1F293A] text-white text-sm font-sans focus:outline-none focus:border-[#FF9900] focus:ring-1 focus:ring-[#FF9900] transition-colors"
                  />
                ) : (
                  <p className="text-sm font-mono text-slate-200 bg-[#18202E] p-2.5 rounded-lg border border-[#1F293A]">
                    {profile?.full_name || '—'}
                  </p>
                )}
              </div>

              {/* Email (Read-only) */}
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                  Email Address
                </label>
                <p className="text-sm font-mono text-slate-200 bg-[#18202E] p-2.5 rounded-lg border border-[#1F293A] flex items-center justify-between">
                  <span>{displayEmail}</span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                    Verified
                  </span>
                </p>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                  Phone Number
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={isSaving}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 rounded-lg bg-[#0E141F] border border-[#1F293A] text-white text-sm font-mono focus:outline-none focus:border-[#FF9900] focus:ring-1 focus:ring-[#FF9900] transition-colors"
                  />
                ) : (
                  <p className="text-sm font-mono text-slate-200 bg-[#18202E] p-2.5 rounded-lg border border-[#1F293A]">
                    {profile?.phone || 'Not provided'}
                  </p>
                )}
              </div>

              {/* Institution Name */}
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                  Institution Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="institutionName"
                    value={formData.institutionName}
                    onChange={handleChange}
                    disabled={isSaving}
                    placeholder="e.g. PSIT Kanpur"
                    className="w-full px-3 py-2 rounded-lg bg-[#0E141F] border border-[#1F293A] text-white text-sm font-sans focus:outline-none focus:border-[#FF9900] focus:ring-1 focus:ring-[#FF9900] transition-colors"
                  />
                ) : (
                  <p className="text-sm font-mono text-slate-200 bg-[#18202E] p-2.5 rounded-lg border border-[#1F293A]">
                    {profile?.institution_name || 'Not provided'}
                  </p>
                )}
              </div>

              {/* AWS Builder Alias */}
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                  AWS Builder Alias
                </label>
                {isEditing ? (
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm">
                      @
                    </span>
                    <input
                      type="text"
                      name="builderAlias"
                      value={formData.builderAlias}
                      onChange={handleChange}
                      disabled={isSaving}
                      placeholder="builder_alias"
                      className="w-full pl-8 pr-3 py-2 rounded-lg bg-[#0E141F] border border-[#1F293A] text-white text-sm font-mono focus:outline-none focus:border-[#FF9900] focus:ring-1 focus:ring-[#FF9900] transition-colors"
                    />
                  </div>
                ) : (
                  <p className="text-sm font-mono text-[#FF9900] bg-[#FF9900]/10 p-2.5 rounded-lg border border-[#FF9900]/30 font-semibold flex items-center gap-1">
                    <Terminal size={14} />
                    {profile?.aws_builder_alias ? `@${profile.aws_builder_alias}` : 'Not connected'}
                  </p>
                )}
              </div>

              {/* AWS Builder Profile URL */}
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                  AWS Builder Profile URL
                </label>
                {isEditing ? (
                  <input
                    type="url"
                    name="builderUrl"
                    value={formData.builderUrl}
                    onChange={handleChange}
                    disabled={isSaving}
                    placeholder="https://builder.aws/user/..."
                    className="w-full px-3 py-2 rounded-lg bg-[#0E141F] border border-[#1F293A] text-white text-sm font-mono focus:outline-none focus:border-[#FF9900] focus:ring-1 focus:ring-[#FF9900] transition-colors"
                  />
                ) : profile?.aws_builder_profile_url ? (
                  <a
                    href={profile.aws_builder_profile_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-mono text-[#FF9900] hover:underline p-2.5 rounded-lg bg-[#18202E] border border-[#1F293A] flex items-center gap-1.5 truncate"
                  >
                    <ExternalLink size={13} className="flex-shrink-0" />
                    <span className="truncate">{profile.aws_builder_profile_url}</span>
                  </a>
                ) : (
                  <p className="text-sm font-mono text-slate-500 bg-[#18202E] p-2.5 rounded-lg border border-[#1F293A] italic">
                    Not connected
                  </p>
                )}
              </div>

              {/* Bio */}
              <div className="md:col-span-2">
                <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                  Bio / Builder Objectives
                </label>
                {isEditing ? (
                  <textarea
                    name="bio"
                    rows={3}
                    value={formData.bio}
                    onChange={handleChange}
                    disabled={isSaving}
                    placeholder="Tell your community what AWS cloud services you are building with..."
                    className="w-full px-3 py-2 rounded-lg bg-[#0E141F] border border-[#1F293A] text-white text-sm font-sans focus:outline-none focus:border-[#FF9900] focus:ring-1 focus:ring-[#FF9900] transition-colors"
                  />
                ) : (
                  <p className="text-sm text-slate-300 leading-relaxed bg-[#18202E] p-3 rounded-lg border border-[#1F293A] font-sans">
                    {profile?.bio || 'No bio provided yet.'}
                  </p>
                )}
              </div>
            </div>

            {/* Save Button */}
            {isEditing && (
              <div className="mt-6 pt-4 border-t border-[#1F293A] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-lg text-xs font-mono font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-mono font-bold text-slate-950 bg-[#FF9900] hover:bg-[#EC7211] transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Save size={13} />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB CONTENT: AWS BADGES */}
      {/* ========================================================================= */}
      {activeTab === 'aws_badges' && (
        <AWSBadgesTabContent builderProfile={builderProfile} />
      )}

      {/* ========================================================================= */}
      {/* TAB CONTENT: COMMUNITY */}
      {/* ========================================================================= */}
      {activeTab === 'community' && (
        <div className="rounded-xl border border-[#1F293A] bg-[#121824] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1F293A]">
            <div>
              <h2 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
                Current Community Affiliation
              </h2>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Your registered AWS student chapter details.
              </p>
            </div>
            <span className="font-mono text-xs text-[#FF9900] bg-[#FF9900]/10 px-2.5 py-1 rounded border border-[#FF9900]/30 font-semibold">
              {isManager ? '👑 Chapter Manager' : 'Active Member'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-[#18202E] border border-[#1F293A]">
              <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">
                Community
              </span>
              <p className="text-sm font-mono font-bold text-white truncate">
                {activeCommunity?.name || 'Default Chapter'}
              </p>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {activeCommunity?.short_name || 'AWS-HUB'}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-[#18202E] border border-[#1F293A]">
              <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">
                Institution & City
              </span>
              <p className="text-sm font-mono font-bold text-white truncate">
                {activeCommunity?.institution_name || profile?.institution_name || 'Academic Hub'}
              </p>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {activeCommunity?.city || 'India'}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-[#18202E] border border-[#1F293A]">
              <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">
                Role & Membership
              </span>
              <p className="text-sm font-mono font-bold text-white">
                {isManager ? '👑 Community Manager' : 'Community Member'}
              </p>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Joined {joinedDate}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB CONTENT: LEARNING */}
      {/* ========================================================================= */}
      {activeTab === 'learning' && (
        <div className="rounded-xl border border-[#1F293A] bg-[#121824] p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-[#1F293A]">
            <div>
              <h2 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
                Learning Progress
              </h2>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Computed from verified community task submissions and hands-on deliverables.
              </p>
            </div>
            <div className="text-right">
              <span className="text-sm font-mono font-bold text-white">
                Level {level}
              </span>
              <span className="text-xs text-slate-400 font-mono ml-2">
                ({xp.toLocaleString()} XP)
              </span>
            </div>
          </div>

          {/* XP Progress Bar */}
          <div>
            <div className="flex justify-between text-xs font-mono text-slate-400 mb-1.5">
              <span>Level Progress</span>
              <span className="text-[#FF9900] font-semibold">{progress.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-[#1E293B] h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#FF9900] to-[#EA580C] h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Tasks Completed', value: tasksCompleted, icon: <CheckSquare size={16} /> },
              { label: 'Total XP Earned', value: `${xp.toLocaleString()}`, icon: <Zap size={16} /> },
              { label: 'Current Tier', value: `Level ${level}`, icon: <Shield size={16} /> },
              { label: 'Services Practiced', value: '8 AWS', icon: <Layers size={16} /> },
            ].map((m) => (
              <div key={m.label} className="p-3.5 rounded-lg bg-[#18202E] border border-[#1F293A]">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider">{m.label}</span>
                  {m.icon}
                </div>
                <p className="text-base font-mono font-bold text-white">{m.value}</p>
              </div>
            ))}
          </div>

          {/* Tracked AWS Services */}
          <div>
            <span className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2">
              Tracked AWS Services
            </span>
            <div className="flex flex-wrap gap-1.5">
              {['AWS Lambda', 'Amazon S3', 'Amazon DynamoDB', 'AWS IAM', 'Amazon Bedrock', 'Amazon ECS', 'Amazon CloudFront', 'API Gateway'].map((svc) => (
                <span
                  key={svc}
                  className="px-2.5 py-1 rounded bg-[#18202E] border border-[#1F293A] text-xs font-mono text-slate-300"
                >
                  {svc}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB CONTENT: ACTIVITY */}
      {/* ========================================================================= */}
      {activeTab === 'activity' && (
        <div className="rounded-xl border border-[#1F293A] bg-[#121824] p-6 shadow-xs space-y-4">
          <div className="pb-3 border-b border-[#1F293A]">
            <h2 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
              Recent Activity Feed
            </h2>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Real-time events recorded in your community ledger.
            </p>
          </div>

          {userActivities.length === 0 ? (
            <div className="py-8 text-center text-xs font-mono text-slate-500">
              No recent activity records found. Complete a task or attend an event to record activity.
            </div>
          ) : (
            <div className="divide-y divide-[#1F293A]">
              {userActivities.map((act) => (
                <div key={act.id} className="py-3 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-md bg-[#FF9900]/15 border border-[#FF9900]/30 text-[#FF9900] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <ActivityIcon size={13} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-mono font-medium text-slate-200">
                      {act.description}
                    </p>
                    <span className="text-[10px] font-mono text-slate-400">
                      {timeAgo(act.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB CONTENT: ACHIEVEMENTS */}
      {/* ========================================================================= */}
      {activeTab === 'achievements' && (
        <div className="rounded-xl border border-[#1F293A] bg-[#121824] p-6 shadow-xs space-y-4">
          <div className="pb-3 border-b border-[#1F293A]">
            <h2 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
              Meaningful Milestone Achievements
            </h2>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Verified community achievements and milestones.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {[
              {
                title: 'Onboarded Builder',
                desc: 'Completed initial AWS Journey Tracker setup.',
                unlocked: true,
                icon: '🚀',
              },
              {
                title: 'Chapter Member',
                desc: 'Joined an official AWS Student Builder Group.',
                unlocked: Boolean(activeCommunity),
                icon: '🏛️',
              },
              {
                title: 'Task Solver',
                desc: 'Submitted and completed an assigned AWS challenge.',
                unlocked: tasksCompleted > 0,
                icon: '⚡',
              },
              {
                title: 'Level 5 Architect',
                desc: 'Earned 2,500+ XP across architectural tasks.',
                unlocked: level >= 5,
                icon: '🏗️',
              },
              {
                title: 'Community Leader',
                desc: 'Elected or appointed as Community Manager.',
                unlocked: isManager,
                icon: '👑',
              },
            ].map((a) => (
              <div
                key={a.title}
                className={`p-4 rounded-lg border transition-all ${
                  a.unlocked
                    ? 'bg-[#18202E] border-[#1F293A] text-white'
                    : 'bg-[#18202E]/40 border-[#1F293A]/50 text-slate-400 opacity-60'
                }`}
              >
                <div className="text-2xl mb-2">{a.icon}</div>
                <h3 className="text-xs font-mono font-bold">{a.title}</h3>
                <p className="text-[11px] font-sans text-slate-400 mt-1 leading-snug">
                  {a.desc}
                </p>
                <div className="mt-2.5">
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider ${
                      a.unlocked
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {a.unlocked ? 'Unlocked' : 'In Progress'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
