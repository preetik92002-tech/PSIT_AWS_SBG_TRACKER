import React, { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
} from 'lucide-react'
import { useCommunity } from '@/context/CommunityContext'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui/Avatar'
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'

const EVENT_CATEGORIES = [
  'All',
  'Workshop',
  'Hackathon',
  'Orientation',
  'Session',
  'Meetup',
  'Project Showcase',
] as const

interface CommunityEventCard {
  id: string
  title: string
  description: string
  eventType: string
  eventDate: string
  eventDateFormatted: string
  location: string
  organizerName: string
  organizerAvatar: string | null
  participantCount: number
  imageUrl: string | null
}

export const Events: React.FC = () => {
  const navigate = useNavigate()
  const { activeCommunity, userRoleInActiveCommunity } = useCommunity()
  const { user } = useAuth()

  const [events, setEvents] = useState<CommunityEventCard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Controls state
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<string>('All')

  const isManager = userRoleInActiveCommunity === 'manager'

  // Fetch real events strictly scoped to activeCommunity.id
  const fetchEvents = async () => {
    if (!activeCommunity?.id) return

    setIsLoading(true)
    setErrorMessage(null)

    try {
      // 1. Fetch community events with profiles join for organizer
      const { data: rawEvents, error } = await supabase
        .from('community_events')
        .select(`
          id,
          title,
          description,
          event_type,
          event_date,
          location,
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

      // 2. Fetch RSVPs to calculate actual participant count (NO FAKE COUNTS)
      const { data: rsvps } = await supabase
        .from('community_activities')
        .select('metadata')
        .eq('community_id', activeCommunity.id)
        .eq('activity_type', 'joined event')

      const rsvpCountMap = new Map<string, number>()
      if (rsvps) {
        for (const r of (rsvps as any[])) {
          const evId = r.metadata?.event_id
          if (evId) {
            rsvpCountMap.set(evId, (rsvpCountMap.get(evId) || 0) + 1)
          }
        }
      }

      const list: CommunityEventCard[] = (rawEvents || []).map((ev: any) => {
        const p = ev.profiles || {}
        const count = rsvpCountMap.get(ev.id) || 0

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
          location: ev.location || 'Campus / Online',
          organizerName: p.full_name || p.email?.split('@')[0] || 'Community Lead',
          organizerAvatar: p.avatar_url || null,
          participantCount: count,
          imageUrl: null,
        }
      })

      setEvents(list)
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to query community events.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [activeCommunity?.id])

  // Filter events by search & type
  const filteredEvents = useMemo(() => {
    let result = [...events]

    if (selectedType !== 'All') {
      result = result.filter(
        (ev) => ev.eventType.toLowerCase() === selectedType.toLowerCase()
      )
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim()
      result = result.filter(
        (ev) =>
          ev.title.toLowerCase().includes(q) ||
          ev.description.toLowerCase().includes(q) ||
          ev.location.toLowerCase().includes(q)
      )
    }

    return result
  }, [events, selectedType, searchTerm])

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight font-sans">
              Events
            </h1>
            {activeCommunity && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-orange-50 text-[#EA580C] border border-orange-200">
                <Building2 size={12} />
                {activeCommunity.name}
              </span>
            )}
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1 font-sans">
            Record and preserve your community's activities.
          </p>
        </div>

        {/* Add Event CTA */}
        {isManager && (
          <button
            type="button"
            onClick={() => navigate('/events/new')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-bold text-white bg-[#FF9900] hover:bg-[#EA580C] transition-all shadow-xs cursor-pointer self-start sm:self-auto"
          >
            <Plus size={14} />
            <span>Add Event</span>
          </button>
        )}
      </div>

      {/* Controls: Search + Filter by type */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search events by title or keywords..."
              className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-xl bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF9900] focus:ring-1 focus:ring-[#FF9900] transition-colors shadow-2xs"
            />
          </div>
        </div>

        {/* Categories Pills: Workshop, Hackathon, Orientation, Session, Meetup, Project Showcase */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none font-mono text-xs">
          {EVENT_CATEGORIES.map((cat) => {
            const isSelected = selectedType === cat
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedType(cat)}
                className={`px-3 py-1.5 rounded-full border transition-all shrink-0 cursor-pointer shadow-2xs ${
                  isSelected
                    ? 'bg-[#FF9900] text-white font-bold border-[#FF9900] shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {cat}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Content: Responsive Grid (4 cols desktop, 2 cols tablet, 1 col mobile) */}
      {isLoading ? (
        <div className="py-24">
          <LoadingState message="Loading community events directory..." />
        </div>
      ) : errorMessage ? (
        <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-center font-mono">
          <p className="text-xs text-red-700">{errorMessage}</p>
          <button
            type="button"
            onClick={fetchEvents}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-red-100 text-red-800 hover:bg-red-200"
          >
            <RefreshCw size={13} />
            <span>Retry</span>
          </button>
        </div>
      ) : filteredEvents.length === 0 ? (
        <EmptyState
          title="No events yet"
          description="Document your community workshops, hackathons, and learning sessions."
          icon={<Calendar size={24} className="text-slate-400" />}
          badge="Events"
          action={
            isManager
              ? {
                  label: 'Add your first event',
                  onClick: () => navigate('/events/new'),
                }
              : undefined
          }
        />
      ) : (
        /* Responsive Grid: 4 columns desktop (xl:grid-cols-4), 2 tablet (md:grid-cols-2), 1 mobile (grid-cols-1) */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredEvents.map((ev) => (
            <div
              key={ev.id}
              onClick={() => navigate(`/events/${ev.id}`)}
              className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs hover:border-orange-300 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                {/* Event Image Banner */}
                <div className="h-36 bg-gradient-to-br from-slate-800 to-slate-950 relative overflow-hidden flex items-center justify-center">
                  <div className="text-center p-3">
                    <span className="text-2xl block mb-1">🚀</span>
                    <span className="text-[10px] font-mono text-slate-400 tracking-wider uppercase">
                      AWS Chapter Event
                    </span>
                  </div>
                  <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white text-[10px] font-mono font-semibold">
                    {ev.eventDateFormatted}
                  </div>
                  <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-[#FF9900] text-white text-[10px] font-mono font-bold shadow-xs">
                    {ev.eventType}
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-4 space-y-2">
                  <h3 className="text-xs font-bold text-slate-900 font-sans group-hover:text-[#EA580C] transition-colors line-clamp-2">
                    {ev.title}
                  </h3>

                  <p className="text-[11px] text-slate-500 font-sans line-clamp-2 leading-relaxed">
                    {ev.description || 'Community gathering and cloud architectural walkthrough.'}
                  </p>

                  <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400 pt-1">
                    <MapPin size={11} className="text-slate-400 shrink-0" />
                    <span className="truncate">{ev.location}</span>
                  </div>
                </div>
              </div>

              {/* Card Footer: Participants + Organizer + View Details */}
              <div className="p-4 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono">
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Users size={12} className="text-[#EA580C]" />
                  <span>{ev.participantCount} builders</span>
                </div>

                <div className="text-xs font-semibold text-[#EA580C] flex items-center gap-1 group-hover:underline">
                  <span>View details</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
