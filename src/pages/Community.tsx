import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2,
  MapPin,
  Users,
  ShieldCheck,
  Copy,
  Check,
  Share2,
  Calendar,
  Sparkles,
  ExternalLink,
  Edit,
  KeyRound,
  Crown,
  QrCode,
  Camera,
  ArrowRight,
  Settings,
} from 'lucide-react'
import { useCommunity } from '@/context/CommunityContext'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase/client'
import { AWSLogo } from '@/components/ui/AWSLogo'
import { PageHeader } from '@/components/ui/PageHeader'
import { CommunityImage } from '@/components/ui/CommunityImage'
import { BuilderAvatar } from '@/components/ui/BuilderAvatar'
import { LoadingState } from '@/components/ui/LoadingState'
import { ShareCommunityModal } from '@/components/community/ShareCommunityModal'
import { EditCommunityModal, EditCommunityData } from '@/components/community/EditCommunityModal'
import { ChangeImageModal } from '@/components/community/ChangeImageModal'
import { CommunitySettingsModal } from '@/components/community/CommunitySettingsModal'

export const Community: React.FC = () => {
  const navigate = useNavigate()
  const { activeCommunity, userRoleInActiveCommunity, refreshUserCommunities, isManagerOfActiveCommunity } = useCommunity()
  const { user } = useAuth()

  const [memberCount, setMemberCount] = useState<number>(0)
  const [managerProfile, setManagerProfile] = useState<{ fullName: string; email: string; avatarUrl: string | null } | null>(null)
  const [inviteCode, setInviteCode] = useState<string>('')
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showQrBox, setShowQrBox] = useState(false)

  // Modals state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isChangeImageModalOpen, setIsChangeImageModalOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)

  // Local community logo state for instant UI updates
  const [communityLogoUrl, setCommunityLogoUrl] = useState<string | null>(activeCommunity?.logo_url || null)

  const isManager = isManagerOfActiveCommunity || userRoleInActiveCommunity === 'manager'

  useEffect(() => {
    if (!activeCommunity?.id) return

    setCommunityLogoUrl(activeCommunity.logo_url || null)

    async function loadCommunityDetails() {
      setIsLoading(true)
      try {
        // 1. Fetch member count from community_members table
        const { count } = await supabase
          .from('community_members')
          .select('id', { count: 'exact', head: true })
          .eq('community_id', activeCommunity!.id)

        setMemberCount(count ?? 0)

        // 2. Fetch manager profile & verified community record
        const { data: commData } = await supabase
          .from('communities')
          .select('manager_id, logo_url, institution_name, institution, city, description, is_active')
          .eq('id', activeCommunity!.id)
          .maybeSingle()

        if (commData?.logo_url) {
          setCommunityLogoUrl(commData.logo_url)
        }

        if (commData?.manager_id) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('full_name, email, avatar_url')
            .eq('id', commData.manager_id)
            .maybeSingle()

          if (prof) {
            setManagerProfile({
              fullName: prof.full_name || 'Community Manager',
              email: prof.email,
              avatarUrl: prof.avatar_url,
            })
          }
        }

        // 3. Fetch active join code from community_codes table
        const { data: codeData } = await supabase
          .from('community_codes')
          .select('code')
          .eq('community_id', activeCommunity!.id)
          .maybeSingle()

        setInviteCode(codeData?.code || activeCommunity!.short_name || 'PSIT-AWS-2026')
      } catch (err) {
        console.error('Error loading community details:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadCommunityDetails()
  }, [activeCommunity])

  const inviteUrl = `${window.location.origin}/auth/join-community?code=${inviteCode}`

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    } catch {
      // Fallback
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    } catch {
      // Fallback
    }
  }

  const handleSaveCommunity = async (updated: EditCommunityData) => {
    if (!activeCommunity?.id) return

    if (updated.logoUrl !== undefined) {
      setCommunityLogoUrl(updated.logoUrl)
    }

    const { error } = await supabase
      .from('communities')
      .update({
        name: updated.name,
        short_name: updated.shortName,
        institution: updated.institution,
        institution_name: updated.institution,
        city: updated.city,
        description: updated.description,
        logo_url: updated.logoUrl,
      })
      .eq('id', activeCommunity.id)

    if (error) throw error
    await refreshUserCommunities()
  }

  const handleImageUpdated = async (newImageUrl: string) => {
    if (!activeCommunity?.id) return

    setCommunityLogoUrl(newImageUrl)

    const { error } = await supabase
      .from('communities')
      .update({ logo_url: newImageUrl })
      .eq('id', activeCommunity.id)

    if (error) throw error
    await refreshUserCommunities()
  }

  if (isLoading) {
    return <LoadingState message="Loading community information..." />
  }

  return (
    <div className="space-y-6 pb-12 animate-live-fade-in font-sans">
      <PageHeader
        title="Community Management"
        subtitle="Chapter specifications, academic affiliation, and access controls."
        tag="Chapter"
        icon={<Building2 size={20} />}
        breadcrumbs={[
          { label: 'Home', to: '/dashboard' },
          { label: 'Community' },
        ]}
      />

      {/* ================================================================ */}
      {/* 1. TOP COMMUNITY IDENTITY BANNER                                 */}
      {/* ================================================================ */}
      <div className="rounded-2xl border border-slate-800 bg-[#0A0E17] text-white p-6 sm:p-8 relative overflow-hidden shadow-xl">
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Community Image */}
            <div className="relative group">
              <CommunityImage
                src={communityLogoUrl}
                name={activeCommunity?.name}
                shortName={activeCommunity?.short_name}
                size="2xl"
                className="border-2 border-slate-700/80 shadow-lg"
              />
              {isManager && (
                <button
                  type="button"
                  onClick={() => setIsChangeImageModalOpen(true)}
                  className="absolute inset-0 bg-slate-950/60 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white font-mono text-[10px]"
                >
                  <Camera size={16} className="text-[#FF9900]" />
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#FF9900] font-bold">
                  COMMUNITY CHAPTER
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-[10px] font-mono text-slate-400">
                  One Tracker Per Campus Rule
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active Chapter
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-mono font-bold text-white tracking-tight leading-tight">
                {activeCommunity?.name || 'AWS Student Builder Group PSIT Kanpur'}
              </h1>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs font-mono text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Building2 size={13} className="text-[#FF9900]" />
                  {activeCommunity?.institution_name || 'Pranveer Singh Institute of Technology'}
                </span>
                <span className="text-slate-600">•</span>
                <span className="flex items-center gap-1.5">
                  <MapPin size={13} className="text-slate-400" />
                  {activeCommunity?.city ? `${activeCommunity.city}, India` : 'Kanpur, India'}
                </span>
                <span className="text-slate-600">•</span>
                <span className="flex items-center gap-1.5 text-orange-300 font-semibold">
                  <Users size={13} className="text-[#FF9900]" />
                  {memberCount} registered {memberCount === 1 ? 'builder' : 'builders'}
                </span>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* PRIMARY BUTTON ACTION BAR                                    */}
          {/* Manager: All 6 buttons; Member: Safe read-only actions       */}
          {/* ============================================================ */}
          <div className="flex flex-wrap items-center gap-2 self-stretch lg:self-auto justify-start lg:justify-end border-t lg:border-t-0 border-slate-800 pt-4 lg:pt-0">
            {isManager ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 transition-all cursor-pointer shadow-xs"
                >
                  <Edit size={13} className="text-[#FF9900]" />
                  <span>EDIT COMMUNITY</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsChangeImageModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 transition-all cursor-pointer shadow-xs"
                >
                  <Camera size={13} className="text-[#FF9900]" />
                  <span>CHANGE IMAGE</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 transition-all cursor-pointer shadow-xs"
                >
                  {copiedCode ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} className="text-[#FF9900]" />}
                  <span>{copiedCode ? 'COPIED!' : 'COPY JOIN CODE'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsShareModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-bold text-slate-950 bg-[#FF9900] hover:bg-[#EC7211] transition-all cursor-pointer shadow-sm"
                >
                  <Share2 size={13} />
                  <span>SHARE COMMUNITY</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/members')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 transition-all cursor-pointer shadow-xs"
                >
                  <Users size={13} className="text-[#FF9900]" />
                  <span>VIEW MEMBERS</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/community/settings')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 transition-all cursor-pointer shadow-xs"
                  title="Community Settings"
                >
                  <Settings size={13} className="text-[#FF9900]" />
                  <span>COMMUNITY SETTINGS</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 transition-all cursor-pointer shadow-xs"
                >
                  {copiedCode ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} className="text-[#FF9900]" />}
                  <span>{copiedCode ? 'COPIED!' : 'COPY JOIN CODE'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsShareModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-bold text-slate-950 bg-[#FF9900] hover:bg-[#EC7211] transition-all cursor-pointer shadow-sm"
                >
                  <Share2 size={13} />
                  <span>SHARE COMMUNITY</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/members')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 transition-all cursor-pointer shadow-xs"
                >
                  <Users size={13} className="text-[#FF9900]" />
                  <span>VIEW MEMBERS</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* 2. SPECIFICATIONS & JOIN CODE / QR ROW                           */}
      {/* ================================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Chapter Mission & Access Credentials */}
        <div className="lg:col-span-2 space-y-6">
          {/* Chapter Details Card */}
          <div className="rounded-2xl border border-slate-800 bg-[#0F172A] p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Sparkles size={14} className="text-[#FF9900]" />
                <span>Chapter Specifications</span>
              </h2>
              <span className="text-[11px] font-mono text-slate-400">
                Chapter Tag: <strong className="text-white">{activeCommunity?.short_name || 'AWS'}</strong>
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1 font-bold">
                  Chapter Mission & Description
                </label>
                <p className="text-sm font-sans text-slate-300 leading-relaxed bg-[#0A0E17] p-4 rounded-xl border border-slate-800">
                  {activeCommunity?.description ||
                    'Founding chapter for cloud architects, builders, and developers at PSIT Kanpur. Hands-on architectural challenges, serverless workshops, and student peer mentoring.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 font-mono text-xs">
                <div className="p-4 rounded-xl bg-[#0A0E17] border border-slate-800">
                  <span className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                    Affiliated Institution
                  </span>
                  <span className="text-sm font-bold text-white block truncate">
                    {activeCommunity?.institution_name || 'Pranveer Singh Institute of Technology'}
                  </span>
                  <span className="text-[11px] text-slate-400 font-sans mt-0.5 block">
                    One Community Rule: Enforced Unique
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-[#0A0E17] border border-slate-800">
                  <span className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                    Geographic Region
                  </span>
                  <span className="text-sm font-bold text-white block">
                    {activeCommunity?.city ? `${activeCommunity.city}, India` : 'Kanpur, India'}
                  </span>
                  <span className="text-[11px] text-slate-400 font-sans mt-0.5 block">
                    AWS Region: ap-south-1 (Asia Pacific)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Access Credentials & QR Section */}
          <div className="rounded-2xl border border-slate-800 bg-[#0F172A] p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <KeyRound size={14} className="text-[#FF9900]" />
                  <span>Access Credentials & Chapter QR</span>
                </h2>
                <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                  Share these credentials with students at your institution to onboard them directly into this tracker.
                </p>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30 font-semibold">
                ACTIVE CODE
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Join Code Box */}
              <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 space-y-2">
                <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-300 font-bold">
                  Chapter Join Code
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-mono font-bold text-white tracking-wider">
                    {inviteCode}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold text-slate-950 bg-[#FF9900] hover:bg-[#EC7211] transition-all cursor-pointer shadow-2xs"
                    >
                      {copiedCode ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowQrBox((prev) => !prev)}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 transition-colors cursor-pointer"
                      title="Toggle Chapter QR"
                    >
                      <QrCode size={14} className="text-[#FF9900]" />
                    </button>
                  </div>
                </div>
                <p className="text-[10px] font-mono text-slate-400">
                  Safe human-readable join code. Never exposes internal DB UUIDs.
                </p>
              </div>

              {/* Direct Join Link Box */}
              <div className="p-4 rounded-xl bg-[#0A0E17] border border-slate-800 space-y-2">
                <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                  Direct Join Link
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-300 truncate max-w-[170px]" title={inviteUrl}>
                    {inviteUrl}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer shadow-2xs"
                    >
                      {copiedLink ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsShareModalOpen(true)}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer"
                      title="Share modal"
                    >
                      <Share2 size={13} className="text-[#FF9900]" />
                    </button>
                  </div>
                </div>
                <p className="text-[10px] font-mono text-slate-400">
                  Pre-fills code in the member onboarding experience.
                </p>
              </div>
            </div>

            {/* Inline Chapter QR Display */}
            {showQrBox && (
              <div className="p-4 rounded-xl bg-[#0A0E17] border border-slate-800 text-center space-y-3 animate-live-fade-in">
                <span className="text-[10px] font-mono text-[#FF9900] uppercase font-bold tracking-wider block">
                  OFFICIAL CHAPTER QR CODE
                </span>
                <div className="w-36 h-36 mx-auto bg-white p-2.5 rounded-xl shadow-md flex items-center justify-center">
                  <svg className="w-full h-full text-slate-950" viewBox="0 0 100 100" fill="currentColor">
                    <rect x="0" y="0" width="30" height="30" rx="3" />
                    <rect x="6" y="6" width="18" height="18" fill="white" rx="1" />
                    <rect x="10" y="10" width="10" height="10" rx="1" />

                    <rect x="70" y="0" width="30" height="30" rx="3" />
                    <rect x="76" y="6" width="18" height="18" fill="white" rx="1" />
                    <rect x="80" y="10" width="10" height="10" rx="1" />

                    <rect x="0" y="70" width="30" height="30" rx="3" />
                    <rect x="6" y="76" width="18" height="18" fill="white" rx="1" />
                    <rect x="10" y="80" width="10" height="10" rx="1" />

                    <rect x="36" y="6" width="6" height="6" />
                    <rect x="46" y="6" width="6" height="6" />
                    <rect x="56" y="6" width="6" height="6" />
                    <rect x="36" y="18" width="6" height="6" />
                    <rect x="48" y="18" width="6" height="6" />
                    <rect x="56" y="24" width="6" height="6" />

                    <rect x="6" y="36" width="6" height="6" />
                    <rect x="18" y="36" width="6" height="6" />
                    <rect x="24" y="44" width="6" height="6" />
                    <rect x="36" y="36" width="6" height="6" />
                    <rect x="48" y="40" width="6" height="6" />
                    <rect x="60" y="36" width="6" height="6" />
                    <rect x="72" y="36" width="6" height="6" />
                    <rect x="84" y="36" width="6" height="6" />

                    <rect x="36" y="72" width="6" height="6" />
                    <rect x="48" y="72" width="6" height="6" />
                    <rect x="60" y="72" width="6" height="6" />
                    <rect x="72" y="80" width="6" height="6" />
                    <rect x="84" y="72" width="6" height="6" />
                    <rect x="60" y="88" width="6" height="6" />
                  </svg>
                </div>
                <p className="text-[11px] font-mono text-slate-400">
                  Scan to connect to <code className="text-white">{activeCommunity?.name}</code>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Community Leadership & Security */}
        <div className="space-y-6">
          {/* Leadership Card */}
          <div className="rounded-2xl border border-slate-800 bg-[#0F172A] p-6 shadow-md space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                Chapter Leadership
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-orange-500/15 text-[#FF9900] border border-orange-500/30 font-bold flex items-center gap-1">
                <Crown size={11} className="text-[#FF9900]" /> MANAGER
              </span>
            </div>

            <div className="flex items-center gap-4">
              <BuilderAvatar
                src={managerProfile?.avatarUrl}
                name={managerProfile?.fullName || 'Community Manager'}
                isManager={true}
                size="lg"
              />
              <div className="min-w-0">
                <p className="text-sm font-mono font-bold text-white truncate">
                  {managerProfile?.fullName || 'Community Manager'}
                </p>
                <p className="text-xs font-mono text-slate-400 truncate">
                  {managerProfile?.email || 'manager@community.hub'}
                </p>
                <span className="inline-block mt-1 text-[11px] font-mono text-[#FF9900] font-semibold">
                  👑 Chapter Lead & Organizer
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0A0E17] border border-slate-800 text-xs text-slate-400 font-sans leading-relaxed space-y-2">
              <p>
                The Community Manager coordinates technical cohorts, assigns AWS project milestones, hosts Community Live sessions, and verifies builder task completions.
              </p>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => navigate('/members')}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono font-bold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 transition-colors cursor-pointer"
              >
                <span>View All Chapter Members</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>

          {/* Duplicate Prevention & Integrity Card */}
          <div className="rounded-2xl border border-slate-800 bg-[#0F172A] p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <ShieldCheck size={14} className="text-emerald-400" />
                <span>Chapter Integrity Rule</span>
              </h2>
              <span className="text-[10px] font-mono text-slate-400">Strict</span>
            </div>

            <div className="p-4 rounded-xl bg-[#0A0E17] border border-slate-800 font-mono space-y-2 text-xs">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
                One Community Rule
              </span>
              <p className="text-slate-300 font-sans leading-relaxed">
                There is strictly one community tracker per educational institution or builder group. Members must join this tracker rather than creating duplicate instances.
              </p>
              <div className="pt-2 flex items-center gap-2 text-emerald-400 text-[11px]">
                <ShieldCheck size={13} />
                <span>Database-enforced institution uniqueness</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Share Community Modal */}
      {isShareModalOpen && (
        <ShareCommunityModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          community={{
            id: activeCommunity?.id || '',
            name: activeCommunity?.name || 'AWS Student Builder Group PSIT Kanpur',
            shortName: activeCommunity?.short_name || 'PSIT',
            institutionName: activeCommunity?.institution_name || 'Pranveer Singh Institute of Technology',
            city: activeCommunity?.city || 'Kanpur',
            code: inviteCode,
            imageUrl: communityLogoUrl,
            memberCount,
          }}
        />
      )}

      {/* Edit Community Modal */}
      {isEditModalOpen && (
        <EditCommunityModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleSaveCommunity}
          initialData={{
            communityId: activeCommunity?.id,
            name: activeCommunity?.name || '',
            shortName: activeCommunity?.short_name || 'PSIT',
            institutionName: activeCommunity?.institution_name || '',
            city: activeCommunity?.city || '',
            description: activeCommunity?.description || '',
            logoUrl: communityLogoUrl,
          }}
        />
      )}

      {/* Change Image Modal */}
      {isChangeImageModalOpen && (
        <ChangeImageModal
          isOpen={isChangeImageModalOpen}
          onClose={() => setIsChangeImageModalOpen(false)}
          community={{
            id: activeCommunity?.id || '',
            name: activeCommunity?.name || 'AWS Student Builder Group',
            shortName: activeCommunity?.short_name || 'AWS',
            currentImageUrl: communityLogoUrl,
          }}
          onImageUpdated={handleImageUpdated}
        />
      )}

      {/* Community Settings Modal */}
      {isSettingsModalOpen && (
        <CommunitySettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          community={{
            id: activeCommunity?.id || '',
            name: activeCommunity?.name || 'AWS Student Builder Group',
            shortName: activeCommunity?.short_name || 'AWS',
            code: inviteCode,
          }}
          onCodeRotated={(newCode) => setInviteCode(newCode)}
        />
      )}
    </div>
  )
}

export default Community
