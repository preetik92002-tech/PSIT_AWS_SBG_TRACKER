import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  LucideIcon,
  Building2,
  KeyRound,
  Users,
  Award,
  Calendar,
  Bell,
  Cpu,
  AlertTriangle,
  Shield,
  ShieldAlert,
  Copy,
  Check,
  RefreshCw,
  Save,
  ExternalLink,
  Crown,
  Camera,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Video,
  Sparkles,
} from 'lucide-react'
import { useCommunity } from '@/context/CommunityContext'
import { PageHeader } from '@/components/ui/PageHeader'
import { LoadingState } from '@/components/ui/LoadingState'
import { BuilderAvatar } from '@/components/ui/BuilderAvatar'
import { CommunityImage } from '@/components/ui/CommunityImage'
import { ImageUploadDropzone } from '@/components/ui/ImageUploadDropzone'
import { uploadCommunityImage } from '@/lib/storageService'
import {
  loadCommunitySettings,
  saveCommunitySettings,
  rotateJoinCode,
  archiveCommunitySafely,
  FullCommunitySettingsData,
  CommunityIdentityData,
  CommunitySettingsPayload,
} from '@/lib/communitySettings'

type SettingsTab =
  | 'identity'
  | 'membership'
  | 'manager'
  | 'points'
  | 'events'
  | 'notifications'
  | 'integrations'
  | 'danger'

export const CommunitySettings: React.FC = () => {
  const navigate = useNavigate()
  const { activeCommunity, isManagerOfActiveCommunity, refreshUserCommunities, isLoading: isCommunityLoading } = useCommunity()

  const [activeTab, setActiveTab] = useState<SettingsTab>('identity')
  const [data, setData] = useState<FullCommunitySettingsData | null>(null)
  const [identityForm, setIdentityForm] = useState<CommunityIdentityData>({
    name: '',
    short_name: '',
    institution: '',
    institution_name: '',
    city: '',
    description: '',
    logo_url: null,
  })
  const [settingsForm, setSettingsForm] = useState<CommunitySettingsPayload | null>(null)
  const [currentJoinCode, setCurrentJoinCode] = useState<string>('')

  // State indicators
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isRotating, setIsRotating] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Danger zone state
  const [archiveConfirmText, setArchiveConfirmText] = useState('')
  const [isArchiving, setIsArchiving] = useState(false)
  const [archiveModalOpen, setArchiveModalOpen] = useState(false)

  const loadData = useCallback(async () => {
    if (!activeCommunity?.id || !isManagerOfActiveCommunity) return

    setIsLoading(true)
    setErrorMessage(null)

    try {
      const fullData = await loadCommunitySettings(activeCommunity.id)
      setData(fullData)
      setIdentityForm(fullData.identity)
      setSettingsForm(fullData.settings)
      setCurrentJoinCode(fullData.join_code)
    } catch (err: any) {
      console.error('[CommunitySettings] Load error:', err)
      setErrorMessage(err?.message || 'Failed to load community configuration.')
    } finally {
      setIsLoading(false)
    }
  }, [activeCommunity?.id, isManagerOfActiveCommunity])

  useEffect(() => {
    if (!isCommunityLoading && isManagerOfActiveCommunity && activeCommunity?.id) {
      loadData()
    }
  }, [isCommunityLoading, isManagerOfActiveCommunity, activeCommunity?.id, loadData])

  // Copy helpers
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(currentJoinCode)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    } catch {
      // ignore
    }
  }

  const handleCopyJoinLink = async () => {
    try {
      const joinUrl = `${window.location.origin}/auth/join-community?code=${currentJoinCode}`
      await navigator.clipboard.writeText(joinUrl)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    } catch {
      // ignore
    }
  }

  // Rotate join code
  const handleRotateCode = async () => {
    if (!activeCommunity?.id) return
    setIsRotating(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const newCode = await rotateJoinCode(activeCommunity.id)
      setCurrentJoinCode(newCode)
      setSuccessMessage(`New join code generated: ${newCode}`)
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to rotate join code.')
    } finally {
      setIsRotating(false)
    }
  }

  // Save Settings
  const handleSaveAll = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!activeCommunity?.id || !settingsForm) return

    setIsSaving(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      await saveCommunitySettings(activeCommunity.id, identityForm, settingsForm)
      await refreshUserCommunities()
      setSuccessMessage('Community settings saved successfully.')
      setTimeout(() => setSuccessMessage(null), 3500)
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save settings. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  // Handle Archive Community
  const handleArchiveCommunity = async () => {
    if (!activeCommunity?.id) return

    if (archiveConfirmText.trim().toLowerCase() !== activeCommunity.short_name.toLowerCase()) {
      setErrorMessage(`Confirmation failed. You must type "${activeCommunity.short_name}" to archive.`)
      return
    }

    setIsArchiving(true)
    setErrorMessage(null)

    try {
      await archiveCommunitySafely(activeCommunity.id, archiveConfirmText.trim())
      await refreshUserCommunities()
      setArchiveModalOpen(false)
      navigate('/dashboard', { replace: true })
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to archive community.')
      setIsArchiving(false)
    }
  }

  // 1. Loading permission check
  if (isCommunityLoading) {
    return <LoadingState message="Verifying community manager credentials..." />
  }

  // 2. Strict Security Check: Managers & Admins only
  if (!isManagerOfActiveCommunity) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Community Settings"
          subtitle="Manager configuration and chapter governance."
          tag="Settings"
          icon={<Building2 size={20} />}
          breadcrumbs={[
            { label: 'Home', to: '/dashboard' },
            { label: 'Community', to: '/community' },
            { label: 'Settings' },
          ]}
        />

        <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-8 text-center max-w-2xl mx-auto my-12">
          <div className="w-14 h-14 rounded-full bg-red-900/30 border border-red-700/50 flex items-center justify-center mx-auto mb-4 text-red-400">
            <ShieldAlert size={28} />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Manager Access Required</h2>
          <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed mb-6">
            Community settings, membership governance, point configurations, and danger zone controls
            are restricted exclusively to authorized Community Managers.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/community"
              className="px-4 py-2 bg-[#FF9900] hover:bg-[#FF9900]/90 text-black font-semibold text-xs rounded-lg transition-colors inline-flex items-center gap-1.5"
            >
              Back to Chapter Hub
            </Link>
            <Link
              to="/dashboard"
              className="px-4 py-2 bg-[#1A2234] hover:bg-[#232F42] border border-[#2D3A50] text-slate-200 font-semibold text-xs rounded-lg transition-colors inline-flex items-center gap-1.5"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading || !data || !settingsForm) {
    return <LoadingState message="Loading community configuration..." />
  }

  const TABS: Array<{
    id: SettingsTab
    label: string
    icon: LucideIcon
    danger?: boolean
  }> = [
    { id: 'identity', label: 'Community Identity', icon: Building2 },
    { id: 'membership', label: 'Membership & Join Code', icon: KeyRound },
    { id: 'manager', label: 'Manager Controls', icon: Crown },
    { id: 'points', label: 'Points Configuration', icon: Award },
    { id: 'events', label: 'Event Defaults', icon: Calendar },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'integrations', label: 'Integrations', icon: Cpu },
    { id: 'danger', label: 'Danger Zone', icon: AlertTriangle, danger: true },
  ]

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <PageHeader
          title="Community Settings"
          subtitle={`Governance, identity specifications, and access rules for ${activeCommunity?.name}.`}
          tag="Manager Console"
          icon={<Building2 size={20} />}
          breadcrumbs={[
            { label: 'Home', to: '/dashboard' },
            { label: 'Community', to: '/community' },
            { label: 'Settings' },
          ]}
        />

        <div className="flex items-center gap-3">
          <Link
            to="/community"
            className="px-3.5 py-2 rounded-xl text-xs font-mono font-medium text-slate-300 bg-[#121824] hover:bg-[#1A2234] border border-[#1F293A] transition-colors inline-flex items-center gap-1.5"
          >
            <ArrowLeft size={13} />
            <span>Chapter Hub</span>
          </Link>

          <button
            onClick={() => handleSaveAll()}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl text-xs font-mono font-bold text-black bg-[#FF9900] hover:bg-[#FF9900]/90 transition-all disabled:opacity-50 inline-flex items-center gap-1.5 shadow-sm"
          >
            {isSaving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
            <span>{isSaving ? 'SAVING...' : 'SAVE CHANGES'}</span>
          </button>
        </div>
      </div>

      {/* Success / Error Banners */}
      {successMessage && (
        <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-4 flex items-center gap-3 text-emerald-300 text-xs font-mono">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-4 flex items-center justify-between gap-3 text-red-300 text-xs font-mono">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Settings Layout (Sidebar Navigation + Tab Content) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-3 rounded-xl border border-[#1F293A] bg-[#121824] p-2 space-y-1">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-mono transition-colors text-left ${
                  isActive
                    ? tab.danger
                      ? 'bg-rose-950/50 text-rose-300 border border-rose-800 font-semibold'
                      : 'bg-[#FF9900]/15 text-[#FF9900] border border-[#FF9900]/30 font-semibold'
                    : tab.danger
                    ? 'text-rose-400 hover:bg-rose-950/30'
                    : 'text-slate-300 hover:text-white hover:bg-[#1A2234]'
                }`}
              >
                <Icon size={14} className={tab.danger ? 'text-rose-400' : isActive ? 'text-[#FF9900]' : 'text-slate-400'} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Tab Content Panel */}
        <div className="lg:col-span-9 rounded-xl border border-[#1F293A] bg-[#121824] p-6 shadow-xs space-y-6">
          {/* ============================================================= */}
          {/* 1. COMMUNITY IDENTITY                                         */}
          {/* ============================================================= */}
          {activeTab === 'identity' && (
            <div className="space-y-6">
              <div className="pb-3 border-b border-[#1F293A]">
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                  Community Identity
                </h2>
                <p className="text-xs text-slate-400 font-sans mt-0.5">
                  Official name, academic campus affiliation, and chapter branding.
                </p>
              </div>

              {/* Logo / Cover Image */}
              <div className="p-4 rounded-xl bg-[#0E141F] border border-[#1F293A] space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <CommunityImage
                    src={identityForm.logo_url}
                    name={identityForm.name}
                    shortName={identityForm.short_name}
                    size="xl"
                    className="ring-2 ring-[#FF9900]/40 shrink-0"
                  />
                  <div className="space-y-1 flex-1 min-w-0">
                    <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                      Community Branding & Icon
                    </h3>
                    <p className="text-[11px] font-sans text-slate-400">
                      Upload an official community logo or banner to represent your chapter across Builder World, Events, and Leaderboards.
                    </p>
                  </div>
                </div>

                {activeCommunity?.id && (
                  <ImageUploadDropzone
                    value={identityForm.logo_url}
                    aspectRatio="banner"
                    label="Upload Image (Community Media Storage)"
                    helperText="PNG, JPG, WebP up to 5MB. Stored in isolated community storage."
                    onUpload={async (file) => {
                      const res = await uploadCommunityImage(file, activeCommunity.id)
                      if (res.url) {
                        setIdentityForm((prev) => ({ ...prev, logo_url: res.url }))
                      }
                      return res
                    }}
                    onRemove={() => setIdentityForm((prev) => ({ ...prev, logo_url: null }))}
                  />
                )}

                <div className="space-y-1.5 pt-2 border-t border-[#1A2332]">
                  <label className="block text-xs font-mono text-slate-400 font-medium">
                    Or Enter Image URL Manually
                  </label>
                  <input
                    type="url"
                    value={identityForm.logo_url || ''}
                    onChange={(e) =>
                      setIdentityForm((prev) => ({ ...prev, logo_url: e.target.value || null }))
                    }
                    placeholder="https://..."
                    className="w-full bg-[#121824] border border-[#1F293A] px-3 py-2 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-[#FF9900]"
                  />
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                <div className="space-y-1.5">
                  <label className="block text-slate-300 font-semibold">Official Chapter Name *</label>
                  <input
                    type="text"
                    required
                    value={identityForm.name}
                    onChange={(e) => setIdentityForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full bg-[#0E141F] border border-[#1F293A] px-3 py-2 rounded-lg text-white focus:outline-none focus:border-[#FF9900]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-slate-300 font-semibold">Short Name / Chapter Tag *</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={identityForm.short_name}
                    onChange={(e) =>
                      setIdentityForm((p) => ({ ...p, short_name: e.target.value.toUpperCase() }))
                    }
                    className="w-full bg-[#0E141F] border border-[#1F293A] px-3 py-2 rounded-lg text-white focus:outline-none focus:border-[#FF9900]"
                  />
                  <span className="text-[10px] text-slate-500">Used as code prefix (e.g. PSIT)</span>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-slate-300 font-semibold">Affiliated Institution *</label>
                  <input
                    type="text"
                    required
                    value={identityForm.institution}
                    onChange={(e) =>
                      setIdentityForm((p) => ({
                        ...p,
                        institution: e.target.value,
                        institution_name: e.target.value,
                      }))
                    }
                    className="w-full bg-[#0E141F] border border-[#1F293A] px-3 py-2 rounded-lg text-white focus:outline-none focus:border-[#FF9900]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-slate-300 font-semibold">Campus City *</label>
                  <input
                    type="text"
                    required
                    value={identityForm.city}
                    onChange={(e) => setIdentityForm((p) => ({ ...p, city: e.target.value }))}
                    className="w-full bg-[#0E141F] border border-[#1F293A] px-3 py-2 rounded-lg text-white focus:outline-none focus:border-[#FF9900]"
                  />
                </div>
              </div>

              <div className="space-y-1.5 font-mono text-xs">
                <label className="block text-slate-300 font-semibold">Chapter Description & Mission</label>
                <textarea
                  rows={3}
                  value={identityForm.description}
                  onChange={(e) => setIdentityForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Describe the chapter focus, cloud domains, and hands-on tracks..."
                  className="w-full bg-[#0E141F] border border-[#1F293A] px-3 py-2 rounded-lg text-white focus:outline-none focus:border-[#FF9900] font-sans text-xs"
                />
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* 2. MEMBERSHIP & JOIN CODE                                     */}
          {/* ============================================================= */}
          {activeTab === 'membership' && (
            <div className="space-y-6">
              <div className="pb-3 border-b border-[#1F293A]">
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                  Membership & Join Code
                </h2>
                <p className="text-xs text-slate-400 font-sans mt-0.5">
                  Control how builders discover and join this community.
                </p>
              </div>

              {/* Active Join Code Card */}
              <div className="p-5 rounded-xl bg-[#0E141F] border border-[#1F293A] space-y-3">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
                  Active Chapter Join Code
                </span>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="px-4 py-2.5 rounded-lg bg-[#121824] border border-[#2D3A50] font-mono font-bold text-lg text-[#FF9900] tracking-wider text-center select-all">
                    {currentJoinCode}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="px-3 py-2 rounded-lg text-xs font-mono font-semibold text-slate-200 bg-[#161F2E] hover:bg-[#1E293B] border border-[#2D3A50] transition-colors flex items-center gap-1.5"
                    >
                      {copiedCode ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                      <span>{copiedCode ? 'COPIED!' : 'COPY CODE'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyJoinLink}
                      className="px-3 py-2 rounded-lg text-xs font-mono font-semibold text-slate-200 bg-[#161F2E] hover:bg-[#1E293B] border border-[#2D3A50] transition-colors flex items-center gap-1.5"
                    >
                      {copiedLink ? <Check size={13} className="text-emerald-400" /> : <ExternalLink size={13} />}
                      <span>{copiedLink ? 'LINK COPIED!' : 'COPY JOIN LINK'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleRotateCode}
                      disabled={isRotating}
                      className="px-3 py-2 rounded-lg text-xs font-mono font-semibold text-slate-200 bg-[#161F2E] hover:bg-[#1E293B] border border-[#2D3A50] transition-colors flex items-center gap-1.5"
                      title="Deactivate old code and generate new code"
                    >
                      <RefreshCw size={13} className={isRotating ? 'animate-spin' : ''} />
                      <span>ROTATE CODE</span>
                    </button>
                  </div>
                </div>
                <p className="text-[11px] font-mono text-slate-500">
                  Rotating will invalidate prior printed/shared codes. Existing members remain unaffected.
                </p>
              </div>

              {/* Membership Rules */}
              <div className="space-y-4 pt-2">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                  Membership Access Rules
                </h3>

                <div className="space-y-3 font-mono text-xs">
                  <label className="flex items-center justify-between p-3.5 rounded-lg bg-[#0E141F] border border-[#1F293A] cursor-pointer">
                    <div>
                      <span className="text-white font-medium block">Auto-approve members</span>
                      <span className="text-[11px] text-slate-400 font-sans">
                        Builders who enter the valid join code are instantly enrolled as chapter members.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settingsForm.membership_rules.auto_approve}
                      onChange={(e) =>
                        setSettingsForm((p) =>
                          p
                            ? {
                                ...p,
                                membership_rules: {
                                  ...p.membership_rules,
                                  auto_approve: e.target.checked,
                                },
                              }
                            : p
                        )
                      }
                      className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-[#FF9900] focus:ring-[#FF9900]"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3.5 rounded-lg bg-[#0E141F] border border-[#1F293A] cursor-pointer">
                    <div>
                      <span className="text-white font-medium block">Allow code-based onboarding</span>
                      <span className="text-[11px] text-slate-400 font-sans">
                        Permit new builders to register by entering the chapter code during signup.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settingsForm.membership_rules.allow_code_join}
                      onChange={(e) =>
                        setSettingsForm((p) =>
                          p
                            ? {
                                ...p,
                                membership_rules: {
                                  ...p.membership_rules,
                                  allow_code_join: e.target.checked,
                                },
                              }
                            : p
                        )
                      }
                      className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-[#FF9900] focus:ring-[#FF9900]"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3.5 rounded-lg bg-[#0E141F] border border-[#1F293A] cursor-pointer">
                    <div>
                      <span className="text-white font-medium block">Restrict to institutional email domain</span>
                      <span className="text-[11px] text-slate-400 font-sans">
                        Require builders to have an email matching the college domain.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settingsForm.membership_rules.require_institutional_email}
                      onChange={(e) =>
                        setSettingsForm((p) =>
                          p
                            ? {
                                ...p,
                                membership_rules: {
                                  ...p.membership_rules,
                                  require_institutional_email: e.target.checked,
                                },
                              }
                            : p
                        )
                      }
                      className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-[#FF9900] focus:ring-[#FF9900]"
                    />
                  </label>

                  {settingsForm.membership_rules.require_institutional_email && (
                    <div className="p-3.5 rounded-lg bg-[#0E141F] border border-[#1F293A] space-y-1.5">
                      <label className="block text-slate-300 font-medium">Allowed Institutional Domain</label>
                      <input
                        type="text"
                        placeholder="e.g. psit.ac.in"
                        value={settingsForm.membership_rules.allowed_email_domain}
                        onChange={(e) =>
                          setSettingsForm((p) =>
                            p
                              ? {
                                  ...p,
                                  membership_rules: {
                                    ...p.membership_rules,
                                    allowed_email_domain: e.target.value.toLowerCase(),
                                  },
                                }
                              : p
                          )
                        }
                        className="w-full bg-[#121824] border border-[#1F293A] px-3 py-2 rounded-lg text-white focus:outline-none focus:border-[#FF9900]"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* 3. MANAGER CONTROLS                                           */}
          {/* ============================================================= */}
          {activeTab === 'manager' && (
            <div className="space-y-6">
              <div className="pb-3 border-b border-[#1F293A]">
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                  Manager Governance
                </h2>
                <p className="text-xs text-slate-400 font-sans mt-0.5">
                  Current chapter manager and leadership controls.
                </p>
              </div>

              {/* Current Primary Manager */}
              <div className="p-4 rounded-xl bg-[#0E141F] border border-[#1F293A] space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
                  Lead Community Manager
                </span>
                <div className="flex items-center gap-3 pt-1">
                  <BuilderAvatar
                    src={data.manager?.avatar_url}
                    name={data.manager?.full_name || 'Manager'}
                    alias={data.manager?.aws_builder_alias}
                    isManager={true}
                    size="lg"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-white">
                        {data.manager?.full_name || 'Community Manager'}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-[#FF9900] border border-amber-500/40 text-[9px] font-mono font-bold uppercase">
                        👑 Primary Lead
                      </span>
                    </div>
                    <span className="font-mono text-xs text-slate-400 block truncate">
                      {data.manager?.email}
                    </span>
                    {data.manager?.aws_builder_alias && (
                      <span className="font-mono text-[10px] text-[#FF9900] block">
                        @{data.manager.aws_builder_alias}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Co-Managers List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                    Co-Managers ({data.co_managers.length})
                  </h3>
                  <Link
                    to="/members"
                    className="text-xs font-mono text-[#FF9900] hover:underline flex items-center gap-1 font-semibold"
                  >
                    <span>Manage Roles in Members Roster</span>
                    <ExternalLink size={11} />
                  </Link>
                </div>

                {data.co_managers.length === 0 ? (
                  <p className="text-xs font-mono text-slate-500 p-4 rounded-lg bg-[#0E141F] border border-[#1F293A]">
                    No co-managers assigned. You can promote active builders to manager in the Members page.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {data.co_managers.map((cm) => (
                      <div
                        key={cm.user_id}
                        className="flex items-center justify-between p-3 rounded-lg bg-[#0E141F] border border-[#1F293A]"
                      >
                        <div className="flex items-center gap-2.5">
                          <BuilderAvatar src={cm.avatar_url} name={cm.full_name} isManager={true} size="sm" />
                          <div>
                            <span className="font-mono text-xs font-bold text-white block">
                              {cm.full_name}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400 block">
                              {cm.email}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          Co-Manager
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* 4. POINTS CONFIGURATION                                       */}
          {/* ============================================================= */}
          {activeTab === 'points' && (
            <div className="space-y-6">
              <div className="pb-3 border-b border-[#1F293A]">
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                  Points Rules & XP Configuration
                </h2>
                <p className="text-xs text-slate-400 font-sans mt-0.5">
                  Audited XP awarded when chapter milestones are completed.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
                <div className="p-4 rounded-xl bg-[#0E141F] border border-[#1F293A] space-y-2">
                  <label className="block text-slate-300 font-semibold">
                    Task Deliverable Completion (XP)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={1000}
                    value={settingsForm.points_rules.task_completion}
                    onChange={(e) =>
                      setSettingsForm((p) =>
                        p
                          ? {
                              ...p,
                              points_rules: {
                                ...p.points_rules,
                                task_completion: Number(e.target.value) || 0,
                              },
                            }
                          : p
                      )
                    }
                    className="w-full bg-[#121824] border border-[#1F293A] px-3 py-2 rounded-lg text-white font-bold focus:outline-none focus:border-[#FF9900]"
                  />
                  <p className="text-[10px] text-slate-500 font-sans">
                    Default points for completing technical cohort tasks.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#0E141F] border border-[#1F293A] space-y-2">
                  <label className="block text-slate-300 font-semibold">
                    Event Attendance Verification (XP)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={1000}
                    value={settingsForm.points_rules.event_attendance}
                    onChange={(e) =>
                      setSettingsForm((p) =>
                        p
                          ? {
                              ...p,
                              points_rules: {
                                ...p.points_rules,
                                event_attendance: Number(e.target.value) || 0,
                              },
                            }
                          : p
                      )
                    }
                    className="w-full bg-[#121824] border border-[#1F293A] px-3 py-2 rounded-lg text-white font-bold focus:outline-none focus:border-[#FF9900]"
                  />
                  <p className="text-[10px] text-slate-500 font-sans">
                    Awarded upon marking attendance at workshops & meetups.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#0E141F] border border-[#1F293A] space-y-2">
                  <label className="block text-slate-300 font-semibold">
                    Approved Peer Contribution (XP)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={1000}
                    value={settingsForm.points_rules.peer_contribution}
                    onChange={(e) =>
                      setSettingsForm((p) =>
                        p
                          ? {
                              ...p,
                              points_rules: {
                                ...p.points_rules,
                                peer_contribution: Number(e.target.value) || 0,
                              },
                            }
                          : p
                      )
                    }
                    className="w-full bg-[#121824] border border-[#1F293A] px-3 py-2 rounded-lg text-white font-bold focus:outline-none focus:border-[#FF9900]"
                  />
                  <p className="text-[10px] text-slate-500 font-sans">
                    Awarded when a manager approves a peer-help milestone.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#0E141F] border border-[#1F293A] space-y-2">
                  <label className="block text-slate-300 font-semibold">
                    Project Collaboration (XP)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={1000}
                    value={settingsForm.points_rules.project_collaboration}
                    onChange={(e) =>
                      setSettingsForm((p) =>
                        p
                          ? {
                              ...p,
                              points_rules: {
                                ...p.points_rules,
                                project_collaboration: Number(e.target.value) || 0,
                              },
                            }
                          : p
                      )
                    }
                    className="w-full bg-[#121824] border border-[#1F293A] px-3 py-2 rounded-lg text-white font-bold focus:outline-none focus:border-[#FF9900]"
                  />
                  <p className="text-[10px] text-slate-500 font-sans">
                    Points for delivering collaborative cloud repositories.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* 5. DEFAULT EVENT BEHAVIOR                                     */}
          {/* ============================================================= */}
          {activeTab === 'events' && (
            <div className="space-y-6">
              <div className="pb-3 border-b border-[#1F293A]">
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                  Event Defaults
                </h2>
                <p className="text-xs text-slate-400 font-sans mt-0.5">
                  Default parameters populated when creating new chapter events.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
                <div className="p-4 rounded-xl bg-[#0E141F] border border-[#1F293A] space-y-2">
                  <label className="block text-slate-300 font-semibold">
                    Default Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min={15}
                    max={480}
                    value={settingsForm.events_defaults.default_duration_minutes}
                    onChange={(e) =>
                      setSettingsForm((p) =>
                        p
                          ? {
                              ...p,
                              events_defaults: {
                                ...p.events_defaults,
                                default_duration_minutes: Number(e.target.value) || 60,
                              },
                            }
                          : p
                      )
                    }
                    className="w-full bg-[#121824] border border-[#1F293A] px-3 py-2 rounded-lg text-white font-bold focus:outline-none focus:border-[#FF9900]"
                  />
                </div>

                <div className="p-4 rounded-xl bg-[#0E141F] border border-[#1F293A] space-y-2">
                  <label className="block text-slate-300 font-semibold">
                    Default RSVP Capacity
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10000}
                    value={settingsForm.events_defaults.default_capacity}
                    onChange={(e) =>
                      setSettingsForm((p) =>
                        p
                          ? {
                              ...p,
                              events_defaults: {
                                ...p.events_defaults,
                                default_capacity: Number(e.target.value) || 100,
                              },
                            }
                          : p
                      )
                    }
                    className="w-full bg-[#121824] border border-[#1F293A] px-3 py-2 rounded-lg text-white font-bold focus:outline-none focus:border-[#FF9900]"
                  />
                </div>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <label className="flex items-center justify-between p-3.5 rounded-lg bg-[#0E141F] border border-[#1F293A] cursor-pointer">
                  <div>
                    <span className="text-white font-medium block">Require RSVP registration by default</span>
                    <span className="text-[11px] text-slate-400 font-sans">
                      Ensures only registered participants can access event materials.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settingsForm.events_defaults.registration_required}
                    onChange={(e) =>
                      setSettingsForm((p) =>
                        p
                          ? {
                              ...p,
                              events_defaults: {
                                ...p.events_defaults,
                                registration_required: e.target.checked,
                              },
                            }
                          : p
                      )
                    }
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-[#FF9900] focus:ring-[#FF9900]"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-lg bg-[#0E141F] border border-[#1F293A] cursor-pointer">
                  <div>
                    <span className="text-white font-medium block">Auto-generate Google Meet link</span>
                    <span className="text-[11px] text-slate-400 font-sans">
                      Automatically generate authenticated Google Meet links for published events.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settingsForm.events_defaults.auto_create_meet}
                    onChange={(e) =>
                      setSettingsForm((p) =>
                        p
                          ? {
                              ...p,
                              events_defaults: {
                                ...p.events_defaults,
                                auto_create_meet: e.target.checked,
                              },
                            }
                          : p
                      )
                    }
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-[#FF9900] focus:ring-[#FF9900]"
                  />
                </label>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* 6. COMMUNITY NOTIFICATIONS                                    */}
          {/* ============================================================= */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="pb-3 border-b border-[#1F293A]">
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                  Community Notifications
                </h2>
                <p className="text-xs text-slate-400 font-sans mt-0.5">
                  Configure automated dispatch channels for chapter members.
                </p>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <label className="flex items-center justify-between p-3.5 rounded-lg bg-[#0E141F] border border-[#1F293A] cursor-pointer">
                  <div>
                    <span className="text-white font-medium block">Broadcast Community Announcements</span>
                    <span className="text-[11px] text-slate-400 font-sans">
                      Send in-app notifications to all chapter members when announcements are posted.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settingsForm.notifications.broadcast_announcements}
                    onChange={(e) =>
                      setSettingsForm((p) =>
                        p
                          ? {
                              ...p,
                              notifications: {
                                ...p.notifications,
                                broadcast_announcements: e.target.checked,
                              },
                            }
                          : p
                      )
                    }
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-[#FF9900] focus:ring-[#FF9900]"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-lg bg-[#0E141F] border border-[#1F293A] cursor-pointer">
                  <div>
                    <span className="text-white font-medium block">Task Assignment & Review Alerts</span>
                    <span className="text-[11px] text-slate-400 font-sans">
                      Notify members when new tasks are assigned and when submissions are approved/rejected.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settingsForm.notifications.task_alerts}
                    onChange={(e) =>
                      setSettingsForm((p) =>
                        p
                          ? {
                              ...p,
                              notifications: {
                                ...p.notifications,
                                task_alerts: e.target.checked,
                              },
                            }
                          : p
                      )
                    }
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-[#FF9900] focus:ring-[#FF9900]"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-lg bg-[#0E141F] border border-[#1F293A] cursor-pointer">
                  <div>
                    <span className="text-white font-medium block">Event Reminders & Live Stream Alerts</span>
                    <span className="text-[11px] text-slate-400 font-sans">
                      Send alerts when registered workshops or Google Meet sessions are starting.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settingsForm.notifications.event_reminders}
                    onChange={(e) =>
                      setSettingsForm((p) =>
                        p
                          ? {
                              ...p,
                              notifications: {
                                ...p.notifications,
                                event_reminders: e.target.checked,
                              },
                            }
                          : p
                      )
                    }
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-[#FF9900] focus:ring-[#FF9900]"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-lg bg-[#0E141F] border border-[#1F293A] cursor-pointer">
                  <div>
                    <span className="text-white font-medium block">Peer Contribution Recognition</span>
                    <span className="text-[11px] text-slate-400 font-sans">
                      Send congratulatory notifications when peer assistance is verified and XP is awarded.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settingsForm.notifications.peer_contributions}
                    onChange={(e) =>
                      setSettingsForm((p) =>
                        p
                          ? {
                              ...p,
                              notifications: {
                                ...p.notifications,
                                peer_contributions: e.target.checked,
                              },
                            }
                          : p
                      )
                    }
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-[#FF9900] focus:ring-[#FF9900]"
                  />
                </label>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* 7. INTEGRATIONS                                               */}
          {/* ============================================================= */}
          {activeTab === 'integrations' && (
            <div className="space-y-6">
              <div className="pb-3 border-b border-[#1F293A]">
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                  Ecosystem Integrations
                </h2>
                <p className="text-xs text-slate-400 font-sans mt-0.5">
                  External services, Google Workspace Meet, and AWS Builder status.
                </p>
              </div>

              {/* Google Meet Card */}
              <div className="p-5 rounded-xl bg-[#0E141F] border border-[#1F293A] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <Video size={18} />
                    </div>
                    <div>
                      <h3 className="font-mono text-xs font-bold text-white">
                        Google Meet API Integration
                      </h3>
                      <p className="text-[11px] font-sans text-slate-400">
                        Official OAuth connection for real Google Meet link provisioning.
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                      data.google_meet_connected
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {data.google_meet_connected ? 'CONNECTED' : 'NOT CONNECTED'}
                  </span>
                </div>

                <div className="pt-2 flex items-center justify-between text-xs font-mono border-t border-[#1F293A]">
                  <span className="text-slate-400 text-[11px]">
                    {data.google_meet_connected
                      ? 'Authorized: Ready to auto-generate workshop rooms.'
                      : 'Connect your manager Google Workspace account to generate video links.'}
                  </span>
                  <Link
                    to="/events"
                    className="text-[#FF9900] hover:underline flex items-center gap-1 font-semibold"
                  >
                    <span>Manage Live Connection</span>
                    <ExternalLink size={11} />
                  </Link>
                </div>
              </div>

              {/* AWS Builder Center Status Card */}
              <div className="p-5 rounded-xl bg-[#0E141F] border border-[#1F293A] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-[#FF9900]/15 border border-[#FF9900]/30 flex items-center justify-center text-[#FF9900]">
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <h3 className="font-mono text-xs font-bold text-white">
                        AWS Builder Center & Badges
                      </h3>
                      <p className="text-[11px] font-sans text-slate-400">
                        Official AWS Builder ID identity mapping (builder.aws.com).
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 font-semibold">
                    ACTIVE IDENTIFIERS
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-[#121824] border border-[#1F293A] text-xs font-mono text-slate-300 space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                    <Shield size={13} />
                    <span>Badge Synchronization Status: Badge synchronization is not connected.</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans">
                    AWS Journey Tracker uses official AWS Builder aliases. No credentials or passwords are ever stored.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-between text-xs font-mono border-t border-[#1F293A]">
                  <span className="text-slate-400 text-[11px]">
                    Members can connect their @alias in their Profile.
                  </span>
                  <a
                    href="https://builder.aws.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#FF9900] hover:underline flex items-center gap-1 font-semibold"
                  >
                    <span>Visit builder.aws.com</span>
                    <ExternalLink size={11} />
                  </a>
                </div>
              </div>

              {/* Analytics Telemetry */}
              <div className="p-5 rounded-xl bg-[#0E141F] border border-[#1F293A] space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-bold">Community Analytics & Cohort Telemetry</h3>
                    <p className="text-[11px] text-slate-400 font-sans">
                      Tracks real-time task completion, attendance velocity, and peer contributions.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settingsForm.analytics_tracking}
                    onChange={(e) =>
                      setSettingsForm((p) => (p ? { ...p, analytics_tracking: e.target.checked } : p))
                    }
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-[#FF9900] focus:ring-[#FF9900]"
                  />
                </div>
                <div className="pt-2 flex items-center justify-between border-t border-[#1F293A]">
                  <span className="text-slate-400 text-[11px]">
                    Protected: Accessible exclusively to community managers.
                  </span>
                  <Link
                    to="/analytics"
                    className="text-[#FF9900] hover:underline flex items-center gap-1 font-semibold"
                  >
                    <span>View Chapter Analytics</span>
                    <ExternalLink size={11} />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* 8. DANGER ZONE: ARCHIVE COMMUNITY                             */}
          {/* ============================================================= */}
          {activeTab === 'danger' && (
            <div className="space-y-6">
              <div className="pb-3 border-b border-rose-900/50">
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
                  <AlertTriangle size={15} />
                  Danger Zone: Chapter Lifecycle
                </h2>
                <p className="text-xs text-slate-400 font-sans mt-0.5">
                  High-impact operational actions. Proceed with caution.
                </p>
              </div>

              <div className="p-5 rounded-xl border border-rose-900/60 bg-rose-950/20 space-y-4">
                <div className="space-y-1">
                  <h3 className="font-mono text-sm font-bold text-rose-300">
                    Archive This Community
                  </h3>
                  <p className="text-xs font-sans text-slate-300 leading-relaxed">
                    Archiving deactivates this chapter and immediately revokes all active join codes.
                    Members will no longer be able to submit tasks or register for events.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-[#0E141F] border border-rose-900/40 text-xs font-mono text-slate-400 space-y-1.5">
                  <span className="text-rose-400 font-bold block">Important Security Notice:</span>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                    <li>This operation does NOT delete historical records.</li>
                    <li>All tasks, points transactions, event attendance, and project data are preserved.</li>
                    <li>Community state is safely marked as deactivated in the database.</li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => setArchiveModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl font-mono text-xs font-bold text-white bg-rose-700 hover:bg-rose-600 transition-colors shadow-sm inline-flex items-center gap-2"
                >
                  <AlertTriangle size={14} />
                  <span>ARCHIVE COMMUNITY...</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Archiving Community */}
      {archiveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-live-fade-in">
          <div className="w-full max-w-md bg-[#0E141F] border border-rose-800 rounded-2xl p-6 shadow-2xl space-y-4 text-left font-mono">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-950/80 border border-rose-700/60 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">Confirm Chapter Archiving</h3>
                <span className="text-[11px] text-slate-400">Irreversible operational action</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              Are you sure you want to archive <strong>{activeCommunity?.name}</strong>? To confirm,
              please type the chapter short name <strong className="text-rose-400 font-mono">"{activeCommunity?.short_name}"</strong> below:
            </p>

            <div className="space-y-1.5">
              <input
                type="text"
                autoFocus
                placeholder={`Type ${activeCommunity?.short_name} to confirm`}
                value={archiveConfirmText}
                onChange={(e) => setArchiveConfirmText(e.target.value)}
                className="w-full bg-[#121824] border border-rose-900/80 px-3 py-2 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-rose-500 uppercase"
              />
            </div>

            {errorMessage && (
              <p className="text-[11px] text-rose-400 font-sans">{errorMessage}</p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setArchiveModalOpen(false)
                  setArchiveConfirmText('')
                  setErrorMessage(null)
                }}
                disabled={isArchiving}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-[#161F2E] hover:bg-[#1E293B] border border-[#2D3A50] transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleArchiveCommunity}
                disabled={
                  isArchiving ||
                  archiveConfirmText.trim().toLowerCase() !== activeCommunity?.short_name.toLowerCase()
                }
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-700 hover:bg-rose-600 disabled:opacity-40 transition-colors shadow-sm inline-flex items-center gap-1.5"
              >
                {isArchiving ? <RefreshCw size={13} className="animate-spin" /> : <AlertTriangle size={13} />}
                <span>{isArchiving ? 'ARCHIVING...' : 'YES, ARCHIVE COMMUNITY'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CommunitySettings
