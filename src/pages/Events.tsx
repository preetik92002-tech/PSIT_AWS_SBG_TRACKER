import React, { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Calendar,
  Search,
  Filter,
  Plus,
  MapPin,
  Clock,
  Users,
  Building2,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Video,
  Edit2,
  Archive,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Radio,
} from 'lucide-react'
import { useCommunity } from '@/context/CommunityContext'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui/Avatar'
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'
import { CommunityImage } from '@/components/ui/CommunityImage'
import { Modal } from '@/components/ui/Modal'
import { EventStatus } from '@/types/database'
import { GoogleMeetConnectionCard } from '@/components/live/GoogleMeetConnectionCard'
import { CreateGoogleMeetModal } from '@/components/live/CreateGoogleMeetModal'

const EVENT_CATEGORIES = [
  'All',
  'Upcoming',
  'Live Sessions',
  'Past',
  'Drafts',
  'Workshop',
  'Hackathon',
  'Orientation',
  'Session',
  'Meetup',
  'Project Showcase',
] as const

export interface CommunityEventCard {
  id: string
  title: string
  description: string
  eventType: string
  eventDate: string
  eventDateFormatted: string
  startTime: string | null
  endTime: string | null
  location: string
  meetingUrl: string | null
  status: EventStatus
  imageUrl: string | null
  organizerName: string
  organizerAvatar: string | null
  participantCount: number
  hasUserRsvpd: boolean
  isLiveNow: boolean
}

export const Events: React.FC = () => {
  const navigate = useNavigate()
  const { activeCommunity, userRoleInActiveCommunity } = useCommunity()
  const { user } = useAuth()

  const [events, setEvents] = useState<CommunityEventCard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Controls state
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<string>('All')

  const [searchParams, setSearchParams] = useSearchParams()
  const [isCreateMeetOpen, setIsCreateMeetOpen] = useState(false)

  // Manager action modal
  const [deleteModalEvent, setDeleteModalEvent] = useState<CommunityEventCard | null>(null)
  const [isActionLoading, setIsActionLoading] = useState(false)

  const isManager = userRoleInActiveCommunity === 'manager'

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 3500)
  }

  // Handle Google OAuth callback parameters
  useEffect(() => {
    if (searchParams.get('google_connected') === 'true') {
      showToast('Google Meet OAuth connected successfully!')
      searchParams.delete('google_connected')
      setSearchParams(searchParams, { replace: true })
    } else if (searchParams.get('google_error')) {
      showToast(decodeURIComponent(searchParams.get('google_error')!), 'error')
      searchParams.delete('google_error')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams])

  // Fetch real events strictly scoped to activeCommunity.id
  const fetchEvents = async () => {
    if (!activeCommunity?.id) return

    setIsLoading(true)
    setErrorMessage(null)

    try {
      // 1. Fetch community events with organizer profiles
      const { data: rawEvents, error } = await supabase
        .from('community_events')
        .select(`
          id,
          title,
          description,
          event_type,
          event_date,
          start_time,
          end_time,
          location,
          meeting_url,
          status,
          image_url,
          created_by,
          profiles!community_events_created_by_fkey (
            id,
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('community_id', activeCommunity.id)
        .order('event_date', { ascending: false })

      if (error) throw error

      // 2. Fetch RSVPs from community_event_rsvps
      const { data: rsvps } = await supabase
        .from('community_event_rsvps')
        .select('event_id, user_id')
        .eq('community_id', activeCommunity.id)

      const rsvpCountMap = new Map<string, number>()
      const userRsvpSet = new Set<string>()

      if (rsvps) {
        for (const r of rsvps) {
          rsvpCountMap.set(r.event_id, (rsvpCountMap.get(r.event_id) || 0) + 1)
          if (user && r.user_id === user.id) {
            userRsvpSet.add(r.event_id)
          }
        }
      }

      const now = new Date().getTime()

      const list: CommunityEventCard[] = (rawEvents || []).map((ev: any) => {
        const p = ev.profiles || {}
        const count = rsvpCountMap.get(ev.id) || 0
        const hasRsvpd = userRsvpSet.has(ev.id)

        const eventTime = new Date(ev.event_date).getTime()
        const isLiveNow = ev.status === 'live' || (
          !!ev.meeting_url &&
          Math.abs(now - eventTime) < 3 * 60 * 60 * 1000 // within 3 hours of start
        )

        const formattedDate = new Date(ev.event_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })

        return {
          id: ev.id,
          title: ev.title,
          description: ev.description || '',
          eventType: ev.event_type || 'Meetup',
          eventDate: ev.event_date,
          eventDateFormatted: formattedDate,
          startTime: ev.start_time || '10:00',
          endTime: ev.end_time || '12:00',
          location: ev.location || 'Campus / Online',
          meetingUrl: ev.meeting_url || null,
          status: (ev.status || 'published') as EventStatus,
          imageUrl: ev.image_url || null,
          organizerName: p.full_name || p.email?.split('@')[0] || 'Community Lead',
          organizerAvatar: p.avatar_url || null,
          participantCount: count,
          hasUserRsvpd: hasRsvpd,
          isLiveNow,
        }
      })

      // Drafts are visible only to managers
      const visibleList = isManager ? list : list.filter((e) => e.status !== 'draft')
      setEvents(visibleList)
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to query community events.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [activeCommunity?.id, user?.id, isManager])

  // Quick RSVP Toggle Handler
  const handleToggleRsvp = async (event: CommunityEventCard, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user || !activeCommunity) return

    try {
      if (event.hasUserRsvpd) {
        await supabase
          .from('community_event_rsvps')
          .delete()
          .eq('community_id', activeCommunity.id)
          .eq('event_id', event.id)
          .eq('user_id', user.id)

        showToast(`Cancelled RSVP for "${event.title}"`)
      } else {
        await supabase.from('community_event_rsvps').insert({
          community_id: activeCommunity.id,
          event_id: event.id,
          user_id: user.id,
        })

        await supabase.from('community_activities').insert({
          community_id: activeCommunity.id,
          user_id: user.id,
          activity_type: 'joined event',
          description: `RSVP'd to event "${event.title}"`,
          metadata: { event_id: event.id },
        })

        showToast(`RSVP confirmed for "${event.title}"!`)
      }
      fetchEvents()
    } catch (err) {
      console.error(err)
      showToast('RSVP action failed', 'error')
    }
  }

  // Manager: Quick Toggle Publish / Unpublish
  const handleTogglePublish = async (event: CommunityEventCard, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isManager || !activeCommunity) return

    const newStatus: EventStatus = event.status === 'draft' ? 'published' : 'draft'
    try {
      const { error } = await supabase
        .from('community_events')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', event.id)

      if (error) throw error

      showToast(
        newStatus === 'published'
          ? `"${event.title}" is now published and visible to the community!`
          : `"${event.title}" has been unpublished and moved to drafts.`
      )
      fetchEvents()
    } catch (err) {
      console.error(err)
      showToast('Status update failed', 'error')
    }
  }

  // Manager: Archive Event
  const handleArchiveEvent = async (event: CommunityEventCard, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isManager) return

    try {
      const { error } = await supabase
        .from('community_events')
        .update({
          status: 'archived',
          updated_at: new Date().toISOString(),
        })
        .eq('id', event.id)

      if (error) throw error
      showToast(`Event "${event.title}" archived.`)
      fetchEvents()
    } catch (err) {
      console.error(err)
      showToast('Archival failed', 'error')
    }
  }

  // Manager: Confirm Delete Event
  const handleConfirmDelete = async () => {
    if (!deleteModalEvent || !isManager) return
    setIsActionLoading(true)
    try {
      const { error } = await supabase
        .from('community_events')
        .delete()
        .eq('id', deleteModalEvent.id)

      if (error) throw error
      showToast(`Event "${deleteModalEvent.title}" deleted.`)
      setDeleteModalEvent(null)
      fetchEvents()
    } catch (err) {
      console.error(err)
      showToast('Delete failed', 'error')
    } finally {
      setIsActionLoading(false)
    }
  }

  // Filter events based on search and category
  const filteredEvents = useMemo(() => {
    const now = new Date().getTime()

    return events.filter((ev) => {
      const matchesSearch =
        ev.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ev.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ev.location.toLowerCase().includes(searchTerm.toLowerCase())

      if (!matchesSearch) return false

      const evTime = new Date(ev.eventDate).getTime()

      switch (selectedType) {
        case 'All':
          return true
        case 'Upcoming':
          return evTime >= now - 24 * 60 * 60 * 1000 && ev.status !== 'draft'
        case 'Past':
          return evTime < now - 24 * 60 * 60 * 1000 || ev.status === 'completed'
        case 'Live Sessions':
          return !!ev.meetingUrl
        case 'Drafts':
          return ev.status === 'draft'
        default:
          return ev.eventType.toLowerCase() === selectedType.toLowerCase()
      }
    })
  }, [events, searchTerm, selectedType])

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto overflow-x-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl border font-mono text-xs shadow-2xl flex items-center gap-2 animate-fadeIn ${
            toastMessage.type === 'success'
              ? 'bg-[#18202E] border-emerald-500/50 text-emerald-300'
              : 'bg-[#18202E] border-rose-500/50 text-rose-300'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 size={16} className="text-emerald-400" />
          ) : (
            <AlertCircle size={16} className="text-rose-400" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header with Community Identity */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1F293A] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight font-sans">
              Events & Community Live
            </h1>
            {activeCommunity && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-orange-500/10 text-[#FF9900] border border-orange-500/30">
                <Building2 size={12} />
                {activeCommunity.short_name || activeCommunity.name}
              </span>
            )}
          </div>
          <p className="text-xs md:text-sm text-slate-400 mt-1 font-sans">
            Connect, learn, host Google Meet workshops, and attend cloud architecture meetups.
          </p>
        </div>

        {/* Top Controls: Community Badge + Create Event Button */}
        <div className="flex items-center gap-3">
          {activeCommunity && (
            <div className="hidden sm:flex items-center gap-2 p-1.5 px-3 rounded-xl bg-[#121824] border border-[#1F293A] text-xs font-sans">
              <CommunityImage
                src={activeCommunity.image_url}
                name={activeCommunity.name}
                size="sm"
              />
              <div className="truncate max-w-[160px]">
                <div className="font-bold text-white truncate text-[11px]">{activeCommunity.name}</div>
                <div className="text-[10px] text-slate-400 truncate">{activeCommunity.institution_name}</div>
              </div>
            </div>
          )}

          {isManager && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCreateMeetOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-bold text-slate-200 bg-[#18202E] hover:bg-[#222E42] border border-[#232F40] transition-all shadow-xs cursor-pointer"
                title="Create an ad-hoc Google Meet space"
              >
                <Video size={14} className="text-[#EA4335]" />
                <span>Live Meet</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/events/new')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-bold text-slate-950 bg-[#FF9900] hover:bg-[#EC7211] transition-all shadow-xs cursor-pointer"
              >
                <Plus size={14} />
                <span>Create Event</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Google Meet OAuth Connection Status Card */}
      {activeCommunity && (
        <GoogleMeetConnectionCard
          communityId={activeCommunity.id}
          isManager={isManager}
        />
      )}

      {/* Filter and Search Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search events by title, description, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs font-sans rounded-xl bg-[#121824] border border-[#1F293A] text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF9900] transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto font-mono text-xs">
            <span className="text-slate-400 text-[11px] whitespace-nowrap">
              {filteredEvents.length} event(s)
            </span>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 font-mono text-xs">
          {EVENT_CATEGORIES.map((cat) => {
            if (cat === 'Drafts' && !isManager) return null
            const isSelected = selectedType === cat
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedType(cat)}
                className={`px-3 py-1.5 rounded-xl border whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#FF9900]/15 border-[#FF9900] text-[#FF9900] font-bold'
                    : 'bg-[#18202E] border-[#1F293A] text-slate-400 hover:text-white'
                }`}
              >
                {cat === 'Live Sessions' ? '⚡ Live Sessions' : cat}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Events Grid */}
      {isLoading ? (
        <div className="py-24">
          <LoadingState message="Loading community events and live sessions..." />
        </div>
      ) : errorMessage ? (
        <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-center font-mono">
          <p className="text-xs text-red-400 font-semibold">{errorMessage}</p>
          <button
            type="button"
            onClick={fetchEvents}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-red-500/20 text-red-300 hover:bg-red-500/30 cursor-pointer"
          >
            <RefreshCw size={13} />
            <span>Retry</span>
          </button>
        </div>
      ) : filteredEvents.length === 0 ? (
        <EmptyState
          title="No events match criteria"
          description={
            events.length === 0
              ? 'No workshops, meetups, or live sessions scheduled in this community yet.'
              : 'Try selecting a different filter category or clearing your search query.'
          }
          icon={<Calendar size={24} className="text-slate-400" />}
          badge="Events"
          action={
            isManager
              ? {
                  label: 'Schedule First Event',
                  onClick: () => navigate('/events/new'),
                }
              : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEvents.map((ev) => (
            <div
              key={ev.id}
              onClick={() => navigate(`/events/${ev.id}`)}
              className="rounded-2xl border border-[#1F293A] hover:border-[#FF9900]/50 bg-[#121824] hover:bg-[#151D2C] transition-all flex flex-col justify-between overflow-hidden shadow-xs cursor-pointer group"
            >
              {/* Event Cover Image or Technical Banner */}
              <div className="relative w-full h-36 bg-[#0E141F] overflow-hidden border-b border-[#1F293A]">
                {ev.imageUrl ? (
                  <img
                    src={ev.imageUrl}
                    alt={ev.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#18202E] to-[#0E141F] text-slate-500 p-4 text-center">
                    <Calendar size={24} className="text-[#FF9900]/60 mb-1" />
                    <span className="text-[11px] font-mono uppercase tracking-wider">{ev.eventType}</span>
                  </div>
                )}

                {/* Top Badges on Banner */}
                <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-950/80 backdrop-blur-md text-[#FF9900] border border-[#FF9900]/30 uppercase">
                    {ev.eventType}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {ev.status === 'draft' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/90 text-slate-950 shadow-xs">
                        DRAFT
                      </span>
                    )}

                    {ev.meetingUrl && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold flex items-center gap-1 shadow-xs ${
                        ev.isLiveNow
                          ? 'bg-emerald-500 text-slate-950 animate-pulse'
                          : 'bg-slate-950/80 text-blue-400 border border-blue-500/30'
                      }`}>
                        <Video size={10} />
                        <span>{ev.isLiveNow ? 'LIVE' : 'Google Meet'}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Event Content Body */}
              <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  {/* Community Identity Bar (Required: shows chapter image, name, institution) */}
                  {activeCommunity && (
                    <div className="flex items-center gap-2 p-1.5 px-2 rounded-lg bg-[#0E141F] border border-[#1F293A] text-[10px] font-sans">
                      <CommunityImage
                        src={activeCommunity.image_url}
                        name={activeCommunity.name}
                        size="xs"
                      />
                      <div className="truncate">
                        <span className="font-bold text-white truncate block">{activeCommunity.name}</span>
                        <span className="text-slate-400 truncate block text-[9px]">{activeCommunity.institution_name}</span>
                      </div>
                    </div>
                  )}

                  {/* Title & Description */}
                  <h3 className="text-sm md:text-base font-bold text-white font-sans group-hover:text-[#FF9900] transition-colors line-clamp-2">
                    {ev.title}
                  </h3>

                  {ev.description && (
                    <p className="text-xs text-slate-400 font-sans line-clamp-2">
                      {ev.description}
                    </p>
                  )}
                </div>

                {/* Event Metadata: Date, Location, Participants */}
                <div className="pt-3 border-t border-[#1F293A] space-y-2 font-mono text-[11px] text-slate-400">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <Calendar size={13} className="text-[#FF9900]" />
                      <span>{ev.eventDateFormatted}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      <span>{ev.startTime}</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 truncate max-w-[180px] font-sans text-xs">
                      <MapPin size={13} className="text-[#FF9900] shrink-0" />
                      <span className="truncate">{ev.location}</span>
                    </span>

                    <span className="flex items-center gap-1 text-slate-300 shrink-0">
                      <Users size={12} className="text-blue-400" />
                      <span>{ev.participantCount} registered</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Action Footer */}
              <div className="p-3 bg-[#0E141F] border-t border-[#1F293A] flex items-center justify-between gap-2 font-mono text-xs">
                {/* RSVP Status / Button */}
                <button
                  type="button"
                  onClick={(e) => handleToggleRsvp(ev, e)}
                  className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                    ev.hasUserRsvpd
                      ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25'
                      : 'bg-[#FF9900] text-slate-950 hover:bg-[#EC7211]'
                  }`}
                >
                  {ev.hasUserRsvpd ? '✓ RSVP’d' : 'RSVP Now'}
                </button>

                {/* Manager Quick Actions: Edit, Publish/Draft, Archive, Delete */}
                {isManager && (
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => navigate(`/events/new?editEventId=${ev.id}`)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-[#18202E] hover:bg-[#222E42] border border-[#1F293A]"
                      title="Edit Event"
                    >
                      <Edit2 size={12} />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleTogglePublish(ev, e)}
                      className={`p-1.5 rounded-lg border ${
                        ev.status === 'published'
                          ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                          : 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                      }`}
                      title={ev.status === 'published' ? 'Unpublish to Draft' : 'Publish to Community'}
                    >
                      {ev.status === 'published' ? <Eye size={12} /> : <EyeOff size={12} />}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleArchiveEvent(ev, e)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-[#18202E] hover:bg-[#222E42] border border-[#1F293A]"
                      title="Archive Event"
                    >
                      <Archive size={12} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteModalEvent(ev)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 bg-[#18202E] hover:bg-rose-950/30 border border-[#1F293A]"
                      title="Delete Event"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteModalEvent}
        onClose={() => setDeleteModalEvent(null)}
        title="Delete Community Event?"
        subtitle={deleteModalEvent?.title || 'Destructive Action'}
        size="sm"
      >
        <div className="p-5 space-y-4 font-mono text-xs">
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300">
            Are you sure you want to permanently delete <strong className="text-white">{deleteModalEvent?.title}</strong>?
          </div>
          <p className="text-xs text-slate-300 font-sans leading-relaxed">
            This will permanently remove the event, participant registrations, and media records from {activeCommunity?.name}.
          </p>

          <div className="pt-3 border-t border-[#1F293A] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setDeleteModalEvent(null)}
              disabled={isActionLoading}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={isActionLoading}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isActionLoading ? 'Deleting...' : 'Delete Event'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Create Google Meet Modal */}
      {isCreateMeetOpen && activeCommunity && (
        <CreateGoogleMeetModal
          communityId={activeCommunity.id}
          onClose={() => setIsCreateMeetOpen(false)}
          onCreated={(_space) => {
            showToast('Google Meet created successfully!')
            fetchEvents()
          }}
        />
      )}
    </div>
  )
}
