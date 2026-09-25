import React, { useState, useEffect } from 'react'
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
} from 'lucide-react'
import { useCommunity } from '@/context/CommunityContext'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase/client'
import { AWSLogo } from '@/components/ui/AWSLogo'
import { PageHeader } from '@/components/ui/PageHeader'
import { Avatar } from '@/components/ui/Avatar'
import { LoadingState } from '@/components/ui/LoadingState'

export const Community: React.FC = () => {
  const { activeCommunity, userRoleInActiveCommunity } = useCommunity()
  const { user } = useAuth()

  const [memberCount, setMemberCount] = useState<number>(0)
  const [managerProfile, setManagerProfile] = useState<{ fullName: string; email: string; avatarUrl: string | null } | null>(null)
  const [inviteCode, setInviteCode] = useState<string>('')
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const isManager = userRoleInActiveCommunity === 'manager'

  useEffect(() => {
    if (!activeCommunity?.id) return

    async function loadCommunityDetails() {
      setIsLoading(true)
      try {
        // 1. Fetch member count
        const { count } = await supabase
          .from('community_members')
          .select('id', { count: 'exact', head: true })
          .eq('community_id', activeCommunity!.id)

        setMemberCount(count ?? 0)

        // 2. Fetch manager profile from community record
        const { data: commData } = await supabase
          .from('communities')
          .select('manager_id')
          .eq('id', activeCommunity!.id)
          .maybeSingle()

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

        // 3. Fetch active invite code
        const { data: codeData } = await supabase
          .from('community_codes')
          .select('code')
          .eq('community_id', activeCommunity!.id)
          .eq('is_active', true)
          .maybeSingle()

        setInviteCode(codeData?.code || activeCommunity!.short_name || 'AWS-HUB')
      } catch (err) {
        console.error('Error loading community details:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadCommunityDetails()
  }, [activeCommunity])

  const inviteUrl = `${window.location.origin}/auth/join-community?code=${inviteCode}`

  const copyCode = () => {
    navigator.clipboard.writeText(inviteCode)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const copyLink = () => {
    navigator.clipboard.writeText(inviteUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  if (isLoading) {
    return <LoadingState message="Loading community information..." />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Community Overview"
        subtitle="Chapter specifications, academic affiliation, and access management."
        tag="Chapter"
        icon={<Building2 size={20} />}
        breadcrumbs={[
          { label: 'Home', to: '/dashboard' },
          { label: 'Community' },
        ]}
      />

      {/* Hero Card: Dark Navy Technical Grid */}
      <div className="rounded-xl border border-slate-800/80 bg-[#0A0E17] text-white p-6 sm:p-8 relative overflow-hidden shadow-sm">
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-700/80 flex-shrink-0">
              <AWSLogo size="sm" variant="inverted" />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#FF9900] font-bold">
                  Official AWS Student Chapter
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Active
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-mono font-bold text-white tracking-tight">
                {activeCommunity?.name || 'AWS Student Builder Chapter'}
              </h1>
              <div className="flex flex-wrap items-center gap-y-1 gap-x-3 mt-2 text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1">
                  <Building2 size={13} className="text-[#FF9900]" />
                  {activeCommunity?.institution_name || 'Academic Institution'}
                </span>
                <span className="text-slate-600">•</span>
                <span className="flex items-center gap-1">
                  <MapPin size={13} className="text-slate-500" />
                  {activeCommunity?.city || 'India'}
                </span>
                <span className="text-slate-600">•</span>
                <span className="flex items-center gap-1">
                  <Users size={13} className="text-slate-500" />
                  {memberCount} registered {memberCount === 1 ? 'member' : 'members'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2.5 self-stretch sm:self-auto justify-end">
            <button
              type="button"
              onClick={copyLink}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-mono font-semibold text-slate-950 bg-[#FF9900] hover:bg-[#EC7211] transition-all cursor-pointer shadow-xs"
            >
              {copiedLink ? <Check size={13} /> : <Share2 size={13} />}
              <span>{copiedLink ? 'Invite Link Copied!' : 'Share Chapter'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Information Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Community Information & Identity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Chapter Details Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800">
                Chapter Specifications
              </h2>
              <span className="text-[11px] font-mono text-slate-400">ID: {activeCommunity?.id?.slice(0, 8)}...</span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1">
                  Description
                </label>
                <p className="text-sm font-sans text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-lg border border-slate-100">
                  {activeCommunity?.description || 'No chapter description provided yet.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-0.5">
                    Institution
                  </span>
                  <span className="text-xs font-mono font-semibold text-slate-800">
                    {activeCommunity?.institution_name || 'Academic Institution'}
                  </span>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-0.5">
                    Location
                  </span>
                  <span className="text-xs font-mono font-semibold text-slate-800">
                    {activeCommunity?.city ? `${activeCommunity.city}, India` : 'India'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Access & Invite Codes */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800">
                Access & Onboarding Credentials
              </h2>
              <span className="text-[11px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Active Code
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">
                  Community Invite Code
                </span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-base font-mono font-bold text-slate-900 tracking-wider">
                    {inviteCode}
                  </span>
                  <button
                    type="button"
                    onClick={copyCode}
                    className="p-1.5 rounded-md hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                    title="Copy invite code"
                  >
                    {copiedCode ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">
                  Direct Join Link
                </span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs font-mono text-slate-600 truncate max-w-[180px]">
                    {inviteUrl}
                  </span>
                  <button
                    type="button"
                    onClick={copyLink}
                    className="p-1.5 rounded-md hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                    title="Copy invite link"
                  >
                    {copiedLink ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Community Manager Card */}
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800">
                Community Leadership
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-bold flex items-center gap-1">
                <Crown size={11} className="text-[#EA580C]" /> Manager
              </span>
            </div>

            <div className="flex items-center gap-3.5">
              <Avatar
                initials={managerProfile?.fullName.slice(0, 2).toUpperCase() || 'CM'}
                src={managerProfile?.avatarUrl}
                size="lg"
              />
              <div className="min-w-0">
                <p className="text-sm font-mono font-bold text-slate-900 truncate">
                  {managerProfile?.fullName || 'Community Manager'}
                </p>
                <p className="text-xs font-mono text-slate-500 truncate">
                  {managerProfile?.email || 'manager@community.hub'}
                </p>
                <span className="inline-block mt-1 text-[10px] font-mono text-[#EA580C] font-semibold">
                  👑 Chapter Lead
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 font-sans leading-relaxed">
              The Community Manager coordinates technical cohorts, assigns AWS project milestones, and verifies hands-on task deliverables.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
