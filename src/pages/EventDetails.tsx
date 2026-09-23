import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  Share2,
  Edit,
  Camera,
  Trophy,
  ExternalLink,
  Github,
  Film,
  Presentation,
  Check,
  Building2,
  Sparkles,
  Shield,
  CheckCircle2,
} from 'lucide-react'
import { useCommunity } from '@/context/CommunityContext'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase/client'
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'

interface EventDetailRecord {
  id: string
  title: string
  description: string
  eventType: string
  eventDate: string
  eventDateFormatted: string
  location: string
  organizerName: string
  participantCount: number
  imageUrl: string | null
  highlights: string | null
  achievements: string | null
  githubLink: string | null
  slidesLink: string | null
  recordingLink: string | null
  projectLink: string | null
  photos: string[]
  createdBy: string | null
}

export const EventDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { activeCommunity, userRoleInActiveCommunity } = useCommunity()
  const { user } = useAuth()

  const [eventData, setEventData] = useState<EventDetailRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [copiedShare, setCopiedShare] = useState(false)
  const [hasRsvpd, setHasRsvpd] = useState(false)

  const isManager = userRoleInActiveCommunity === 'manager'

  const fetchEventDetails = async () => {
    if (!id || !activeCommunity?.id) return

    setIsLoading(true)
    setErrorMessage(null)

    try {
      // 1. Fetch event record strictly scoped to activeCommunity.id
      const { data: ev, error } = await supabase
        .from('community_events')
        .select(`
          *,
          profiles!community_events_created_by_fkey (
            id,
            full_name,
            email
          )
        `)
        .eq('id', id)
        .eq('community_id', activeCommunity.id)
        .maybeSingle()

      if (error) throw error
      if (!ev) {
        setEventData(null)
        setIsLoading(false)
        return
      }

      // 2. Fetch actual RSVPs / participants count from community_activities
      const { data: eventActs } = await supabase
        .from('community_activities')
        .select('id, user_id, metadata')
        .eq('community_id', activeCommunity.id)
        .eq('activity_type', 'joined event')

      const matchingActs = (eventActs || []).filter((a: any) => !a.metadata?.event_id || a.metadata?.event_id === id)
      const participantCount = matchingActs.length
      const userRsvp = user ? matchingActs.some((r: any) => r.user_id === user.id) : false
      setHasRsvpd(!!userRsvp)

      const p: any = ev.profiles || {}

      setEventData({
        id: ev.id,
        title: ev.title,
        description: ev.description || '',
        eventType: ev.event_type || 'Workshop',
        eventDate: ev.event_date,
        eventDateFormatted: new Date(ev.event_date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        location: ev.location || 'Campus / Online',
        organizerName: p.full_name || p.email?.split('@')[0] || 'Community Lead',
        participantCount,
        imageUrl: null,
        highlights: 'Key architectural insights, live serverless deployment, and active student participation.',
        achievements: 'Certificate of completion awarded to active attendees.',
        githubLink: null,
        slidesLink: null,
        recordingLink: null,
        projectLink: null,
        photos: [],
        createdBy: ev.created_by || null,
      })
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to query event record.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchEventDetails()
  }, [id, activeCommunity?.id])

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopiedShare(true)
    setTimeout(() => setCopiedShare(false), 2000)
  }

  const handleToggleRsvp = async () => {
    if (!user || !activeCommunity?.id || !id) return
    try {
      if (hasRsvpd) {
        await supabase
          .from('community_activities')
          .delete()
          .eq('community_id', activeCommunity.id)
          .eq('user_id', user.id)
          .eq('activity_type', 'joined event')
        setHasRsvpd(false)
      } else {
        await supabase.from('community_activities').insert({
          community_id: activeCommunity.id,
          user_id: user.id,
          activity_type: 'joined event',
          description: `RSVP'd to event "${eventData?.title || 'Workshop'}"`,
          metadata: { event_id: id },
        })
        setHasRsvpd(true)
      }
      fetchEventDetails()
    } catch (err) {
      console.error('Failed to update RSVP', err)
    }
  }

  if (isLoading) {
    return (
      <div className="py-24">
        <LoadingState message="Opening community diary entry..." />
      </div>
    )
  }

  if (!eventData) {
    return (
      <div className="py-16 max-w-md mx-auto text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900 font-sans">Event Not Found</h2>
        <p className="text-xs text-slate-500 font-sans leading-relaxed">
          This event does not exist or does not belong to <strong className="text-slate-900">{activeCommunity?.name}</strong>.
        </p>
        <Link
          to="/events"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-semibold text-white bg-[#FF9900]"
        >
          <ArrowLeft size={14} />
          <span>Return to Events</span>
        </Link>
      </div>
    )
  }

  const hasAnyResources =
    eventData.githubLink || eventData.slidesLink || eventData.recordingLink || eventData.projectLink

  return (
    <div className="space-y-6 pb-20">
      {/* Back Link */}
      <div>
        <Link
          to="/events"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Events Directory</span>
        </Link>
      </div>

      {/* Header Container */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        {/* Large Event Image (Full-width on mobile) */}
        <div className="w-full h-56 sm:h-72 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 relative flex items-center justify-center overflow-hidden">
          <div className="text-center p-6 space-y-2">
            <span className="text-4xl block">☁️</span>
            <span className="text-xs font-mono text-orange-400 font-bold uppercase tracking-wider">
              {activeCommunity?.name} Official Chapter Event
            </span>
          </div>
          <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-black/60 backdrop-blur-xs text-white text-xs font-mono font-semibold">
            {eventData.eventType}
          </div>
        </div>

        {/* Title, Date, Type, Participants, Actions */}
        <div className="p-6 md:p-8 space-y-4">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 font-sans tracking-tight">
                {eventData.title}
              </h1>

              <div className="flex items-center gap-4 text-xs font-mono text-slate-500 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Calendar size={14} className="text-[#EA580C]" />
                  <span>{eventData.eventDateFormatted}</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1.5">
                  <MapPin size={14} className="text-slate-400" />
                  <span>{eventData.location}</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1.5">
                  <Users size={14} className="text-[#EA580C]" />
                  <span>{eventData.participantCount} Participants</span>
                </div>
              </div>
            </div>

            {/* Actions: Edit, Share, Add photos */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleToggleRsvp}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all shadow-xs cursor-pointer ${
                  hasRsvpd
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-[#FF9900] hover:bg-[#EA580C] text-white'
                }`}
              >
                <CheckCircle2 size={14} />
                <span>{hasRsvpd ? 'RSVP Confirmed' : 'RSVP to Event'}</span>
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
              >
                {copiedShare ? <Check size={14} className="text-emerald-600" /> : <Share2 size={14} />}
                <span>{copiedShare ? 'Copied' : 'Share'}</span>
              </button>

              {isManager && (
                <button
                  type="button"
                  onClick={() => navigate('/events/new')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                >
                  <Edit size={14} />
                  <span>Edit</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SECTIONS: Overview, Highlights, Photos, Achievements, Resources */}
      {/* Institutional Diary Layout — STRICTLY ZERO social-media UI  */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Main 2 Cols: Overview + Highlights + Community Photos */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section: Overview (What happened?) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-7 shadow-xs space-y-3">
            <h2 className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
              <Sparkles size={14} className="text-[#FF9900]" />
              <span>Overview — What Happened?</span>
            </h2>
            <p className="text-sm font-sans text-slate-700 leading-relaxed whitespace-pre-line">
              {eventData.description || 'This event was hosted for our AWS Student Builder community to foster hands-on cloud skills, serverless deployment practices, and collaborative learning.'}
            </p>
          </div>

          {/* Section: Highlights */}
          {eventData.highlights && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
              <h2 className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                <CheckCircle2 size={14} className="text-emerald-600" />
                <span>Event Highlights</span>
              </h2>
              <p className="text-xs font-sans text-slate-600 leading-relaxed">
                {eventData.highlights}
              </p>
            </div>
          )}

          {/* Section: Community Photos Gallery */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h2 className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Camera size={14} className="text-[#FF9900]" />
                <span>Community Photos & Gallery</span>
              </h2>
              {isManager && (
                <button
                  type="button"
                  onClick={() => alert('Media upload active for chapter managers.')}
                  className="text-[11px] font-mono font-semibold text-[#EA580C] hover:underline"
                >
                  + Add photos
                </button>
              )}
            </div>

            {eventData.photos.length === 0 ? (
              <div className="py-10 text-center text-xs font-mono text-slate-400 bg-slate-50/70 rounded-xl border border-dashed border-slate-200">
                Official chapter photos from this event will be preserved here in the diary.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {eventData.photos.map((src, idx) => (
                  <img
                    key={idx}
                    src={src}
                    alt={`Event capture ${idx + 1}`}
                    className="w-full h-32 object-cover rounded-xl border border-slate-200 shadow-2xs"
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Achievements + Resources + Diary Seal */}
        <div className="space-y-6">
          {/* Section: Achievements & Outcomes */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
            <h2 className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
              <Trophy size={14} className="text-purple-600" />
              <span>Achievements & Winners</span>
            </h2>
            <div className="text-xs font-sans text-slate-600 leading-relaxed">
              {eventData.achievements || 'Recognized active participants and certified builder contributors.'}
            </div>
          </div>

          {/* Section: Resources (Only renders links that exist!) */}
          {hasAnyResources ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-3 font-mono text-xs">
              <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">
                Event Resources
              </h2>
              <div className="space-y-2">
                {eventData.githubLink && (
                  <a
                    href={eventData.githubLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl border border-slate-200 hover:border-slate-300 flex items-center justify-between text-slate-800 hover:text-slate-950 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Github size={14} />
                      <span>GitHub Repository</span>
                    </span>
                    <ExternalLink size={12} className="text-slate-400" />
                  </a>
                )}

                {eventData.slidesLink && (
                  <a
                    href={eventData.slidesLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl border border-slate-200 hover:border-slate-300 flex items-center justify-between text-slate-800 hover:text-slate-950 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Presentation size={14} />
                      <span>Presentation Slides</span>
                    </span>
                    <ExternalLink size={12} className="text-slate-400" />
                  </a>
                )}

                {eventData.recordingLink && (
                  <a
                    href={eventData.recordingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl border border-slate-200 hover:border-slate-300 flex items-center justify-between text-slate-800 hover:text-slate-950 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Film size={14} />
                      <span>Session Recording</span>
                    </span>
                    <ExternalLink size={12} className="text-slate-400" />
                  </a>
                )}

                {eventData.projectLink && (
                  <a
                    href={eventData.projectLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl border border-slate-200 hover:border-slate-300 flex items-center justify-between text-slate-800 hover:text-slate-950 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <ExternalLink size={14} />
                      <span>Project Showcase</span>
                    </span>
                    <ExternalLink size={12} className="text-slate-400" />
                  </a>
                )}
              </div>
            </div>
          ) : null}

          {/* Diary Footer Card */}
          <div className="p-4 rounded-2xl bg-orange-50/70 border border-orange-200/80 font-mono text-xs text-slate-600 space-y-1">
            <span className="text-[10px] text-[#EA580C] uppercase tracking-wider font-bold block">
              Permanent Chapter Archive
            </span>
            <p className="font-semibold text-slate-800">
              Added by {activeCommunity?.name}
            </p>
            <p className="text-[11px] text-slate-500 font-sans">
              Preserved in the institutional community activity log.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
