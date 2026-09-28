import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  Share2,
  Edit2,
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
  Video,
  Upload,
  Plus,
  Trash2,
  AlertCircle,
  Eye,
  EyeOff,
  Archive,
  Award,
  Link2,
  FileText,
  UserCheck,
  UserX,
} from 'lucide-react'
import { useCommunity } from '@/context/CommunityContext'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase/client'
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'
import { CommunityImage } from '@/components/ui/CommunityImage'
import { ImageUploadDropzone } from '@/components/ui/ImageUploadDropzone'
import { uploadEventImage } from '@/lib/storageService'
import { Modal } from '@/components/ui/Modal'
import { Avatar } from '@/components/ui/Avatar'
import { EventStatus, GoogleMeetSpace } from '@/types/database'
import { getEventMeetSpace } from '@/lib/googleMeet'
import { CreateGoogleMeetModal } from '@/components/live/CreateGoogleMeetModal'
import { ManageGoogleMeetModal } from '@/components/live/ManageGoogleMeetModal'

export interface EventDetailRecord {
  id: string
  communityId: string
  title: string
  description: string
  eventType: string
  eventDate: string
  eventDateFormatted: string
  startTime: string
  endTime: string
  location: string
  meetingUrl: string | null
  status: EventStatus
  imageUrl: string | null
  organizerName: string
  organizerAvatar: string | null
  participantCount: number
  highlights: string | null
  achievements: string | null
  githubLink: string | null
  slidesLink: string | null
  recordingLink: string | null
  projectLink: string | null
  photos: string[]
  resources: Array<{ title: string; url: string; type?: string }>
  registrationRequired: boolean
  maxCapacity: number | null
  createdBy: string | null
}

export interface ParticipantItem {
  userId: string
  fullName: string
  email: string
  avatarUrl: string | null
  rsvpDate: string
  attended: boolean
  attendedAt: string | null
}

export const EventDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { activeCommunity, userRoleInActiveCommunity } = useCommunity()
  const { user } = useAuth()

  const [eventData, setEventData] = useState<EventDetailRecord | null>(null)
  const [participants, setParticipants] = useState<ParticipantItem[]>([])
  const [hasRsvpd, setHasRsvpd] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [copiedShare, setCopiedShare] = useState(false)
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Manager Modals
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false)
  const [isUploadMediaModalOpen, setIsUploadMediaModalOpen] = useState(false)
  const [newPhotoUrl, setNewPhotoUrl] = useState('')
  const [isUploadingMedia, setIsUploadingMedia] = useState(false)
  const [isAddResourceModalOpen, setIsAddResourceModalOpen] = useState(false)
  const [newResTitle, setNewResTitle] = useState('')
  const [newResUrl, setNewResUrl] = useState('')
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [eventMeetSpace, setEventMeetSpace] = useState<GoogleMeetSpace | null>(null)
  const [isCreateMeetOpen, setIsCreateMeetOpen] = useState(false)
  const [isManageMeetOpen, setIsManageMeetOpen] = useState(false)
  const [isCoverModalOpen, setIsCoverModalOpen] = useState(false)

  const isManager = userRoleInActiveCommunity === 'manager'

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 3500)
  }

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
            email,
            avatar_url
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

      // 2. Fetch RSVPs and attendance records from community_event_rsvps
      const { data: rsvps, error: rsvpsErr } = await supabase
        .from('community_event_rsvps')
        .select(`
          user_id,
          attended,
          attended_at,
          created_at,
          profiles!community_event_rsvps_user_id_fkey (
            id,
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('event_id', id)
        .order('created_at', { ascending: true })

      if (rsvpsErr) console.warn('Could not query rsvps table', rsvpsErr.message)

      const participantsList: ParticipantItem[] = (rsvps || []).map((r: any) => ({
        userId: r.user_id,
        fullName: r.profiles?.full_name || r.profiles?.email?.split('@')[0] || 'Builder',
        email: r.profiles?.email || '',
        avatarUrl: r.profiles?.avatar_url || null,
        rsvpDate: r.created_at,
        attended: !!r.attended,
        attendedAt: r.attended_at || null,
      }))

      setParticipants(participantsList)

      const userRsvp = user ? participantsList.some((p) => p.userId === user.id) : false
      setHasRsvpd(userRsvp)

      const p: any = ev.profiles || {}

      setEventData({
        id: ev.id,
        communityId: ev.community_id || activeCommunity?.id || '',
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
        startTime: ev.start_time || '10:00',
        endTime: ev.end_time || '12:00',
        location: ev.location || 'Campus / Online',
        meetingUrl: ev.meeting_url || null,
        status: (ev.status || 'published') as EventStatus,
        imageUrl: ev.image_url || null,
        organizerName: p.full_name || p.email?.split('@')[0] || 'Community Lead',
        organizerAvatar: p.avatar_url || null,
        participantCount: participantsList.length,
        highlights: ev.highlights || null,
        achievements: ev.achievements || null,
        githubLink: ev.github_link || null,
        slidesLink: ev.slides_link || null,
        recordingLink: ev.recording_link || null,
        projectLink: ev.project_link || null,
        photos: Array.isArray(ev.photos) ? (ev.photos as unknown as string[]) : [],
        resources: Array.isArray(ev.resources) ? (ev.resources as unknown as Array<{ title: string; url: string; type?: string }>) : [],
        registrationRequired: !!ev.registration_required,
        maxCapacity: ev.max_capacity || null,
        createdBy: ev.created_by || null,
      })

      // 3. Query associated Google Meet space
      const meetSpace = await getEventMeetSpace(id)
      setEventMeetSpace(meetSpace)
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to query event record.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchEventDetails()
  }, [id, activeCommunity?.id, user?.id])

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopiedShare(true)
    setTimeout(() => setCopiedShare(false), 2000)
  }

  // Member Action: RSVP Toggle
  const handleToggleRsvp = async () => {
    if (!user || !activeCommunity?.id || !id) return
    try {
      if (hasRsvpd) {
        await supabase
          .from('community_event_rsvps')
          .delete()
          .eq('community_id', activeCommunity.id)
          .eq('event_id', id)
          .eq('user_id', user.id)

        setHasRsvpd(false)
        showToast('RSVP cancelled.')
      } else {
        await supabase.from('community_event_rsvps').insert({
          community_id: activeCommunity.id,
          event_id: id,
          user_id: user.id,
        })

        await supabase.from('community_activities').insert({
          community_id: activeCommunity.id,
          user_id: user.id,
          activity_type: 'joined event',
          description: `RSVP'd to event "${eventData?.title || 'Workshop'}"`,
          metadata: { event_id: id },
        })

        setHasRsvpd(true)
        showToast('RSVP confirmed! See you at the session.')
      }
      fetchEventDetails()
    } catch (err) {
      console.error('Failed to update RSVP', err)
      showToast('RSVP update failed', 'error')
    }
  }

  // Manager Action: Mark Attendance
  const handleToggleAttendance = async (participant: ParticipantItem) => {
    if (!eventData || !activeCommunity || !user || !isManager) return

    const newAttended = !participant.attended
    try {
      const { error: rpcErr } = await supabase.rpc('mark_event_attendance', {
        p_event_id: eventData.id,
        p_target_user_id: participant.userId,
        p_attended: newAttended,
      })

      if (rpcErr) {
        console.warn('RPC mark attendance failed, applying fallback:', rpcErr.message)
        await supabase
          .from('community_event_rsvps')
          .update({
            attended: newAttended,
            attended_at: newAttended ? new Date().toISOString() : null,
          })
          .eq('event_id', eventData.id)
          .eq('user_id', participant.userId)

        if (newAttended) {
          // Points transaction
          await supabase.from('points_transactions').insert({
            community_id: activeCommunity.id,
            user_id: participant.userId,
            points: 25,
            reason: `+25 Event attended: ${eventData.title}`,
            entity_type: 'event',
            entity_id: eventData.id,
            created_by: user.id,
          })

          // Log activity
          await supabase.from('community_activities').insert({
            community_id: activeCommunity.id,
            user_id: participant.userId,
            activity_type: 'joined event',
            description: `Attended event "${eventData.title}" (+25 XP)`,
            metadata: { event_id: eventData.id, points: 25 },
          })

          // Notification
          await supabase.from('notifications').insert({
            recipient_id: participant.userId,
            community_id: activeCommunity.id,
            type: 'event',
            title: 'Attendance Verified (+25 XP)',
            message: `Your attendance for "${eventData.title}" has been verified!`,
            entity_type: 'event',
            entity_id: eventData.id,
          })
        }
      }

      showToast(
        newAttended
          ? `Marked ${participant.fullName} as Attended (+25 XP)!`
          : `Marked ${participant.fullName} as Absent.`
      )
      fetchEventDetails()
    } catch (err) {
      console.error('Failed to update attendance', err)
      showToast('Attendance update failed', 'error')
    }
  }

  // Manager Action: Toggle Publish / Unpublish
  const handleTogglePublish = async () => {
    if (!eventData || !isManager) return
    const newStatus: EventStatus = eventData.status === 'draft' ? 'published' : 'draft'
    try {
      const { error } = await supabase
        .from('community_events')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', eventData.id)

      if (error) throw error
      showToast(
        newStatus === 'published'
          ? 'Event published to chapter!'
          : 'Event unpublished and saved to drafts.'
      )
      fetchEventDetails()
    } catch (err) {
      console.error(err)
      showToast('Status update failed', 'error')
    }
  }

  // Manager Action: Upload Media URL to Photos
  const handleAddPhoto = async () => {
    if (!newPhotoUrl.trim() || !eventData || !isManager) return
    setIsUploadingMedia(true)
    try {
      const updatedPhotos = [...eventData.photos, newPhotoUrl.trim()]
      const { error } = await supabase
        .from('community_events')
        .update({ photos: updatedPhotos as any, updated_at: new Date().toISOString() })
        .eq('id', eventData.id)

      if (error) throw error
      showToast('Recap photo added successfully!')
      setNewPhotoUrl('')
      setIsUploadMediaModalOpen(false)
      fetchEventDetails()
    } catch (err) {
      console.error(err)
      showToast('Photo addition failed', 'error')
    } finally {
      setIsUploadingMedia(false)
    }
  }

  // Manager Action: Add Custom Resource
  const handleAddResource = async () => {
    if (!newResTitle.trim() || !newResUrl.trim() || !eventData || !isManager) return
    setIsActionLoading(true)
    try {
      const updatedResources = [
        ...eventData.resources,
        { title: newResTitle.trim(), url: newResUrl.trim() },
      ]
      const { error } = await supabase
        .from('community_events')
        .update({ resources: updatedResources as any, updated_at: new Date().toISOString() })
        .eq('id', eventData.id)

      if (error) throw error
      showToast('Resource added successfully!')
      setNewResTitle('')
      setNewResUrl('')
      setIsAddResourceModalOpen(false)
      fetchEventDetails()
    } catch (err) {
      console.error(err)
      showToast('Resource addition failed', 'error')
    } finally {
      setIsActionLoading(false)
    }
  }

  // Manager Action: Confirm Delete
  const handleConfirmDelete = async () => {
    if (!eventData || !isManager) return
    setIsActionLoading(true)
    try {
      const { error } = await supabase
        .from('community_events')
        .delete()
        .eq('id', eventData.id)

      if (error) throw error
      showToast('Event permanently deleted.')
      navigate('/events')
    } catch (err) {
      console.error(err)
      showToast('Delete failed', 'error')
    } finally {
      setIsActionLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="py-24">
        <LoadingState message="Loading community event schedule..." />
      </div>
    )
  }

  if (!eventData) {
    return (
      <div className="py-16 max-w-md mx-auto text-center space-y-4 font-mono text-xs">
        <h2 className="text-xl font-bold text-white font-sans">Event Not Found</h2>
        <p className="text-slate-400">
          This event does not exist or does not belong to <strong className="text-white">{activeCommunity?.name}</strong>.
        </p>
        <Link
          to="/events"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-[#FF9900]"
        >
          <ArrowLeft size={14} />
          <span>Return to Events</span>
        </Link>
      </div>
    )
  }

  const hasAnyResources =
    eventData.githubLink ||
    eventData.slidesLink ||
    eventData.recordingLink ||
    eventData.projectLink ||
    eventData.resources.length > 0

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto overflow-x-hidden">
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

      {/* Top Nav Back Link & Chapter Scope */}
      <div className="flex items-center justify-between">
        <Link
          to="/events"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Events Directory</span>
        </Link>

        {/* Community Identity Header (Required: chapter image, chapter name, institution) */}
        {activeCommunity && (
          <div className="flex items-center gap-2 p-1.5 px-3 rounded-xl bg-[#121824] border border-[#1F293A] font-sans text-xs">
            <CommunityImage
              src={activeCommunity.image_url}
              name={activeCommunity.name}
              size="sm"
            />
            <div className="text-right">
              <span className="font-bold text-white block text-xs">{activeCommunity.name}</span>
              <span className="text-[10px] text-slate-400 block">{activeCommunity.institution_name}</span>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* EVENT HERO CARD                                              */}
      {/* ============================================================ */}
      <div className="rounded-2xl border border-[#1F293A] bg-[#121824] overflow-hidden shadow-xs">
        {/* Event Cover Image (Banner) - Event-Specific, Not Community Image */}
        {eventData.imageUrl ? (
          <div className="w-full h-64 md:h-80 bg-[#0E141F] relative overflow-hidden border-b border-[#1F293A] group">
            <img
              src={eventData.imageUrl}
              alt={eventData.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#121824] via-transparent to-transparent" />
            {isManager && (
              <button
                type="button"
                onClick={() => setIsCoverModalOpen(true)}
                className="absolute top-4 right-4 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold bg-[#0B0F17]/80 hover:bg-[#0B0F17] text-white border border-[#222E3E] hover:border-[#FF9900] transition-colors flex items-center gap-1.5 shadow-lg cursor-pointer z-10"
              >
                <Camera size={13} className="text-[#FF9900]" />
                <span>Change Event Banner</span>
              </button>
            )}
          </div>
        ) : (
          <div className="w-full h-36 bg-gradient-to-r from-[#18202E] to-[#0E141F] border-b border-[#1F293A] flex items-center justify-between px-8 text-slate-500 font-mono text-xs">
            <div className="flex items-center gap-3">
              <span className="text-slate-400 uppercase tracking-wider font-bold">{eventData.eventType} Showcase</span>
              <span className="text-[#FF9900]/60">AWS Community Session</span>
            </div>
            {isManager && (
              <button
                type="button"
                onClick={() => setIsCoverModalOpen(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-mono font-semibold bg-[#18202E] hover:bg-[#222E42] text-white border border-[#1F293A] transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Camera size={13} className="text-[#FF9900]" />
                <span>Add Event Cover Image</span>
              </button>
            )}
          </div>
        )}

        {/* Hero Content Body */}
        <div className="p-6 md:p-8 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              {/* Badges: Type, Status, Meet */}
              <div className="flex items-center gap-2 flex-wrap font-mono text-xs">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FF9900]/15 text-[#FF9900] border border-[#FF9900]/30 uppercase">
                  {eventData.eventType}
                </span>

                {eventData.status === 'draft' ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    Draft (Unpublished)
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    Published
                  </span>
                )}

                {eventData.meetingUrl && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center gap-1.5">
                    <Video size={12} />
                    <span>Google Meet Attached</span>
                  </span>
                )}
              </div>

              {/* Title & Description */}
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight font-sans">
                {eventData.title}
              </h1>

              <p className="text-sm text-slate-300 leading-relaxed font-sans">
                {eventData.description || 'No description provided for this session.'}
              </p>

              {/* Organizer & Timings */}
              <div className="pt-2 flex items-center gap-4 flex-wrap font-mono text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <Avatar
                    initials={eventData.organizerName.slice(0, 2).toUpperCase()}
                    src={eventData.organizerAvatar || undefined}
                    size="sm"
                  />
                  <span>Host: <strong className="text-white font-sans">{eventData.organizerName}</strong></span>
                </div>
                <span>•</span>
                <span className="text-slate-300 flex items-center gap-1">
                  <Users size={13} className="text-blue-400" />
                  <strong>{eventData.participantCount}</strong> registered
                </span>
              </div>
            </div>

            {/* Action Card: RSVP & Google Meet Join */}
            <div className="w-full lg:w-80 rounded-2xl bg-[#0E141F] border border-[#1F293A] p-5 space-y-4 font-mono text-xs shrink-0">
              <div className="space-y-2 border-b border-[#1F293A] pb-3">
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>Registration Status:</span>
                  <span className={hasRsvpd ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                    {hasRsvpd ? 'Registered' : 'Not Registered'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>Total RSVPs:</span>
                  <span className="text-white font-bold">{eventData.participantCount} builders</span>
                </div>
              </div>

              {/* Member RSVP Button */}
              <button
                type="button"
                onClick={handleToggleRsvp}
                className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-xs ${
                  hasRsvpd
                    ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                    : 'bg-[#FF9900] text-slate-950 hover:bg-[#EC7211]'
                }`}
              >
                {hasRsvpd ? '✓ Registered (Cancel RSVP)' : 'RSVP for Event'}
              </button>

              {/* Google Meet Space & Join Controls */}
              {eventMeetSpace ? (
                <div className="space-y-2 p-3 rounded-xl bg-[#121824] border border-[#1F293A]">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <Video size={13} className="text-[#EA4335]" />
                      <span>Google Meet</span>
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        eventMeetSpace.status === 'LIVE'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse'
                          : eventMeetSpace.status === 'SCHEDULED'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {eventMeetSpace.status}
                    </span>
                  </div>

                  <a
                    href={eventMeetSpace.meeting_uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 rounded-xl font-bold text-xs bg-emerald-400 hover:bg-emerald-300 text-slate-950 flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
                  >
                    <Video size={14} />
                    <span>{eventMeetSpace.status === 'LIVE' ? 'Join Live Google Meet →' : 'Open Google Meet'}</span>
                  </a>

                  {isManager && (
                    <button
                      type="button"
                      onClick={() => setIsManageMeetOpen(true)}
                      className="w-full py-1.5 text-[11px] font-mono font-bold text-slate-300 hover:text-white bg-[#18202E] hover:bg-[#222E42] rounded-lg border border-[#1F293A] transition-colors"
                    >
                      Manage Meeting & Attendance
                    </button>
                  )}
                </div>
              ) : eventData.meetingUrl ? (
                <a
                  href={eventData.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Video size={14} />
                  <span>Join Google Meet Session</span>
                </a>
              ) : isManager ? (
                <button
                  type="button"
                  onClick={() => setIsCreateMeetOpen(true)}
                  className="w-full py-2 rounded-xl text-xs font-mono font-bold text-slate-200 bg-[#18202E] hover:bg-[#222E42] border border-[#1F293A] flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Video size={14} className="text-[#EA4335]" />
                  <span>Create Google Meet Space</span>
                </button>
              ) : null}

              {/* Share link */}
              <button
                type="button"
                onClick={handleShare}
                className="w-full py-2 rounded-xl text-slate-300 hover:text-white bg-[#18202E] hover:bg-[#222E42] border border-[#1F293A] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Share2 size={13} />
                <span>{copiedShare ? 'Link Copied!' : 'Share Event'}</span>
              </button>
            </div>
          </div>

          {/* Details Metadata Bar: Date, Time, Location */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[#1F293A] font-mono text-xs">
            <div className="p-3.5 rounded-xl bg-[#0E141F] border border-[#1F293A] flex items-center gap-3">
              <Calendar size={18} className="text-[#FF9900] shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Date</span>
                <span className="text-white font-bold">{eventData.eventDateFormatted}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0E141F] border border-[#1F293A] flex items-center gap-3">
              <Clock size={18} className="text-[#FF9900] shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Time</span>
                <span className="text-white font-bold">{eventData.startTime} - {eventData.endTime}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0E141F] border border-[#1F293A] flex items-center gap-3">
              <MapPin size={18} className="text-[#FF9900] shrink-0" />
              <div className="truncate">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Location</span>
                <span className="text-white font-bold truncate block">{eventData.location}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Manager Action Bar (Manager Only) */}
        {isManager && (
          <div className="p-4 bg-[#0E141F] border-t border-[#1F293A] flex items-center justify-between gap-3 flex-wrap font-mono text-xs">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Shield size={13} />
                <span>Manager Operations:</span>
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Google Meet Space Action */}
              {eventMeetSpace ? (
                <button
                  type="button"
                  onClick={() => setIsManageMeetOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors cursor-pointer"
                >
                  <Video size={13} className="text-emerald-400" />
                  <span>Manage Google Meet ({eventMeetSpace.status})</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsCreateMeetOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-200 bg-[#18202E] hover:bg-[#222E42] border border-[#1F293A] transition-colors cursor-pointer"
                >
                  <Video size={13} className="text-[#EA4335]" />
                  <span>Create Google Meet</span>
                </button>
              )}

              {/* Manage Attendance Button */}
              <button
                type="button"
                onClick={() => setIsAttendanceModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors cursor-pointer"
              >
                <UserCheck size={14} />
                <span>Manage Attendance ({participants.filter((p) => p.attended).length}/{participants.length})</span>
              </button>

              {/* Upload Media */}
              <button
                type="button"
                onClick={() => setIsUploadMediaModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-200 bg-[#18202E] hover:bg-[#222E42] border border-[#1F293A] transition-colors cursor-pointer"
              >
                <Camera size={13} />
                <span>Add Photos</span>
              </button>

              {/* Add Resource */}
              <button
                type="button"
                onClick={() => setIsAddResourceModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-200 bg-[#18202E] hover:bg-[#222E42] border border-[#1F293A] transition-colors cursor-pointer"
              >
                <Plus size={13} />
                <span>Add Resource</span>
              </button>

              {/* Edit Event */}
              <button
                type="button"
                onClick={() => navigate(`/events/new?editEventId=${eventData.id}`)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-200 bg-[#18202E] hover:bg-[#222E42] border border-[#1F293A] transition-colors cursor-pointer"
              >
                <Edit2 size={13} />
                <span>Edit</span>
              </button>

              {/* Publish / Unpublish */}
              <button
                type="button"
                onClick={handleTogglePublish}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-300 bg-[#18202E] hover:bg-[#222E42] border border-amber-500/30 transition-colors cursor-pointer"
              >
                {eventData.status === 'published' ? <EyeOff size={13} /> : <Eye size={13} />}
                <span>{eventData.status === 'published' ? 'Unpublish' : 'Publish'}</span>
              </button>

              {/* Delete Event */}
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 bg-[#18202E] hover:bg-rose-950/30 border border-[#1F293A] transition-colors cursor-pointer"
                title="Delete Event"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* CONTENT SECTIONS: HIGHLIGHTS, RESOURCES, MEDIA GALLERY       */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Cols: Agenda Highlights & Deliverables */}
        <div className="lg:col-span-8 space-y-6">
          {/* Key Highlights */}
          {eventData.highlights && (
            <div className="rounded-2xl border border-[#1F293A] bg-[#121824] p-6 shadow-xs space-y-3 font-sans">
              <h2 className="text-base font-bold text-white flex items-center gap-2 font-mono uppercase tracking-wider">
                <Sparkles size={16} className="text-[#FF9900]" />
                <span>Session Highlights & Agenda</span>
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {eventData.highlights}
              </p>
            </div>
          )}

          {/* Achievements & Certification */}
          {eventData.achievements && (
            <div className="rounded-2xl border border-amber-500/30 bg-[#121824] p-6 shadow-xs space-y-2 font-sans">
              <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2 font-mono uppercase tracking-wider">
                <Trophy size={16} className="text-[#FF9900]" />
                <span>Milestones & Recognition</span>
              </h3>
              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                {eventData.achievements}
              </p>
            </div>
          )}

          {/* Event Media / Recap Photo Gallery */}
          <div className="rounded-2xl border border-[#1F293A] bg-[#121824] p-6 shadow-xs space-y-4 font-sans">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2 font-mono uppercase tracking-wider">
                <Camera size={16} className="text-[#FF9900]" />
                <span>Session Media Gallery ({eventData.photos.length})</span>
              </h2>
              {isManager && (
                <button
                  type="button"
                  onClick={() => setIsUploadMediaModalOpen(true)}
                  className="text-xs font-mono text-[#FF9900] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Plus size={12} />
                  <span>Add Photos</span>
                </button>
              )}
            </div>

            {eventData.photos.length === 0 ? (
              <div className="p-8 text-center bg-[#0E141F] rounded-xl border border-[#1F293A] text-xs font-mono text-slate-500">
                No session recap photos uploaded yet.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {eventData.photos.map((photoUrl, idx) => (
                  <a
                    key={idx}
                    href={photoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative group rounded-xl overflow-hidden border border-[#1F293A] aspect-video bg-[#0E141F]"
                  >
                    <img
                      src={photoUrl}
                      alt={`Event photo ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-mono">
                      <span>View Full Image ↗</span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 4 Cols: Event Resources & Links */}
        <div className="lg:col-span-4 space-y-6">
          {/* Resources Card */}
          <div className="rounded-2xl border border-[#1F293A] bg-[#121824] p-5 shadow-xs space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between text-slate-200">
              <h3 className="font-bold uppercase tracking-wider flex items-center gap-2">
                <FileText size={15} className="text-[#FF9900]" />
                <span>Session Resources</span>
              </h3>
              {isManager && (
                <button
                  type="button"
                  onClick={() => setIsAddResourceModalOpen(true)}
                  className="text-[11px] text-[#FF9900] hover:underline cursor-pointer"
                >
                  + Add
                </button>
              )}
            </div>

            {!hasAnyResources ? (
              <p className="text-slate-500 py-3 text-center text-xs">
                No external resources attached yet.
              </p>
            ) : (
              <div className="space-y-2">
                {eventData.slidesLink && (
                  <a
                    href={eventData.slidesLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-xl bg-[#0E141F] hover:bg-[#18202E] border border-[#1F293A] flex items-center justify-between transition-colors text-slate-200"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Presentation size={15} className="text-[#FF9900] shrink-0" />
                      <span className="font-medium truncate font-sans text-xs">Presentation Slides</span>
                    </div>
                    <ExternalLink size={13} className="text-slate-400 shrink-0" />
                  </a>
                )}

                {eventData.githubLink && (
                  <a
                    href={eventData.githubLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-xl bg-[#0E141F] hover:bg-[#18202E] border border-[#1F293A] flex items-center justify-between transition-colors text-slate-200"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Github size={15} className="text-white shrink-0" />
                      <span className="font-medium truncate font-sans text-xs">Repository & Code</span>
                    </div>
                    <ExternalLink size={13} className="text-slate-400 shrink-0" />
                  </a>
                )}

                {eventData.recordingLink && (
                  <a
                    href={eventData.recordingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-xl bg-[#0E141F] hover:bg-[#18202E] border border-[#1F293A] flex items-center justify-between transition-colors text-slate-200"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Film size={15} className="text-red-400 shrink-0" />
                      <span className="font-medium truncate font-sans text-xs">Session Recording</span>
                    </div>
                    <ExternalLink size={13} className="text-slate-400 shrink-0" />
                  </a>
                )}

                {eventData.projectLink && (
                  <a
                    href={eventData.projectLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-xl bg-[#0E141F] hover:bg-[#18202E] border border-[#1F293A] flex items-center justify-between transition-colors text-slate-200"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Sparkles size={15} className="text-amber-400 shrink-0" />
                      <span className="font-medium truncate font-sans text-xs">Architecture Showcase</span>
                    </div>
                    <ExternalLink size={13} className="text-slate-400 shrink-0" />
                  </a>
                )}

                {eventData.resources.map((res, i) => (
                  <a
                    key={i}
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-xl bg-[#0E141F] hover:bg-[#18202E] border border-[#1F293A] flex items-center justify-between transition-colors text-slate-200"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Link2 size={15} className="text-blue-400 shrink-0" />
                      <span className="font-medium truncate font-sans text-xs">{res.title}</span>
                    </div>
                    <ExternalLink size={13} className="text-slate-400 shrink-0" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODAL 1: MANAGER MANAGE ATTENDANCE                           */}
      {/* ============================================================ */}
      <Modal
        isOpen={isAttendanceModalOpen}
        onClose={() => setIsAttendanceModalOpen(false)}
        title="Manage Event Attendance"
        subtitle={`${eventData.title} (${participants.filter((p) => p.attended).length} / ${participants.length} Attended)`}
        size="md"
      >
        <div className="p-5 space-y-4 font-mono text-xs">
          <div className="p-3 rounded-xl bg-[#0E141F] border border-[#1F293A] flex items-center justify-between">
            <span className="text-slate-400">Award per verified attendee:</span>
            <span className="text-xs font-bold text-[#FF9900]">+25 XP (Event Attendance)</span>
          </div>

          <div className="text-[11px] text-slate-400 font-sans">
            Note: Attendance is verified manually by managers. Opening this page does not automatically mark attendance.
          </div>

          <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
            {participants.length === 0 ? (
              <div className="p-6 text-center text-slate-500 font-mono text-xs">
                No community builders have RSVP’d for this event yet.
              </div>
            ) : (
              participants.map((p) => (
                <div
                  key={p.userId}
                  className="p-3 rounded-xl border border-[#1F293A] bg-[#0E141F] flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar
                      initials={p.fullName.slice(0, 2).toUpperCase()}
                      src={p.avatarUrl || undefined}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <span className="font-bold text-white font-sans text-xs block truncate">
                        {p.fullName}
                      </span>
                      <span className="text-[10px] text-slate-400 block truncate font-mono">
                        RSVP’d {new Date(p.rsvpDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleAttendance(p)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      p.attended
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-rose-950/40 hover:text-rose-300 hover:border-rose-500/40'
                        : 'bg-[#18202E] hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-400 border border-[#1F293A]'
                    }`}
                  >
                    {p.attended ? (
                      <>
                        <Check size={12} />
                        <span>Attended (+25 XP)</span>
                      </>
                    ) : (
                      <>
                        <UserCheck size={12} />
                        <span>Mark Attended</span>
                      </>
                    )}
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="pt-3 border-t border-[#1F293A] flex justify-end">
            <button
              type="button"
              onClick={() => setIsAttendanceModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-[#18202E] border border-[#1F293A] cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL 2: UPLOAD RECAP PHOTO                                  */}
      {/* ============================================================ */}
      <Modal
        isOpen={isUploadMediaModalOpen}
        onClose={() => setIsUploadMediaModalOpen(false)}
        title="Add Session Media"
        subtitle="Recap Gallery Photos (Event Media Storage)"
        size="md"
      >
        <div className="p-5 space-y-4 font-mono text-xs">
          {eventData && (
            <ImageUploadDropzone
              value={newPhotoUrl}
              aspectRatio="video"
              label="Upload Session Photo"
              helperText="PNG, JPG, WebP up to 5MB. Stored in event media storage."
              onUpload={async (file) => {
                const res = await uploadEventImage(file, eventData.communityId, eventData.id)
                if (res.url) {
                  setNewPhotoUrl(res.url)
                }
                return res
              }}
              onRemove={() => setNewPhotoUrl('')}
            />
          )}

          <div>
            <label className="block text-slate-300 uppercase tracking-wider mb-1 font-bold">
              Or Enter Photo URL Manually
            </label>
            <input
              type="url"
              value={newPhotoUrl}
              onChange={(e) => setNewPhotoUrl(e.target.value)}
              placeholder="https://... photo URL"
              className="w-full px-3.5 py-2 rounded-xl bg-[#0E141F] border border-[#1F293A] text-white focus:outline-none focus:border-[#FF9900]"
            />
          </div>

          <div className="pt-3 border-t border-[#1F293A] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsUploadMediaModalOpen(false)}
              disabled={isUploadingMedia}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddPhoto}
              disabled={isUploadingMedia || !newPhotoUrl.trim()}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-[#FF9900] hover:bg-[#EC7211] transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isUploadingMedia ? 'Adding...' : 'Add to Gallery'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL 2B: CHANGE EVENT COVER IMAGE                           */}
      {/* ============================================================ */}
      <Modal
        isOpen={isCoverModalOpen}
        onClose={() => setIsCoverModalOpen(false)}
        title="Event Cover Image"
        subtitle="Event-Specific Banner (Isolated from Community Media)"
        size="md"
      >
        <div className="p-5 space-y-4 font-mono text-xs">
          <p className="text-slate-400 font-sans text-xs">
            This image is strictly specific to this event. It is stored in event media storage and will never overwrite your chapter's community identity.
          </p>

          {eventData && (
            <ImageUploadDropzone
              value={eventData.imageUrl}
              aspectRatio="video"
              label="Upload Event Cover (16:9 Banner)"
              helperText="PNG, JPG, WebP up to 5MB."
              onUpload={async (file) => {
                const res = await uploadEventImage(file, eventData.communityId, eventData.id)
                if (res.url) {
                  showToast('Event banner updated successfully!')
                  fetchEventDetails()
                  setIsCoverModalOpen(false)
                }
                return res
              }}
              onRemove={async () => {
                await supabase
                  .from('community_events')
                  .update({ image_url: null, updated_at: new Date().toISOString() })
                  .eq('id', eventData.id)
                showToast('Event cover removed.')
                fetchEventDetails()
                setIsCoverModalOpen(false)
              }}
            />
          )}

          <div className="pt-3 border-t border-[#1F293A] flex justify-end">
            <button
              type="button"
              onClick={() => setIsCoverModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-[#18202E] border border-[#1F293A] cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL 3: ADD RESOURCE                                        */}
      {/* ============================================================ */}
      <Modal
        isOpen={isAddResourceModalOpen}
        onClose={() => setIsAddResourceModalOpen(false)}
        title="Add Event Resource"
        subtitle="Supplemental Material Link"
        size="sm"
      >
        <div className="p-5 space-y-4 font-mono text-xs">
          <div>
            <label className="block text-slate-300 uppercase tracking-wider mb-1 font-bold">
              Resource Title *
            </label>
            <input
              type="text"
              required
              value={newResTitle}
              onChange={(e) => setNewResTitle(e.target.value)}
              placeholder="e.g. AWS Well-Architected Framework Whitepaper"
              className="w-full px-3.5 py-2 rounded-xl bg-[#0E141F] border border-[#1F293A] text-white focus:outline-none focus:border-[#FF9900]"
            />
          </div>

          <div>
            <label className="block text-slate-300 uppercase tracking-wider mb-1 font-bold">
              Resource URL *
            </label>
            <input
              type="url"
              required
              value={newResUrl}
              onChange={(e) => setNewResUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3.5 py-2 rounded-xl bg-[#0E141F] border border-[#1F293A] text-white focus:outline-none focus:border-[#FF9900]"
            />
          </div>

          <div className="pt-3 border-t border-[#1F293A] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsAddResourceModalOpen(false)}
              disabled={isActionLoading}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddResource}
              disabled={isActionLoading || !newResTitle.trim() || !newResUrl.trim()}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-[#FF9900] hover:bg-[#EC7211] transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isActionLoading ? 'Saving...' : 'Add Resource'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL 4: DELETE CONFIRMATION                                 */}
      {/* ============================================================ */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Community Event?"
        subtitle={eventData.title}
        size="sm"
      >
        <div className="p-5 space-y-4 font-mono text-xs">
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300">
            Are you sure you want to permanently delete this event?
          </div>
          <p className="text-xs text-slate-300 font-sans leading-relaxed">
            All registered attendee records and attached media will be permanently deleted.
          </p>

          <div className="pt-3 border-t border-[#1F293A] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
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
              {isActionLoading ? 'Deleting...' : 'Delete Permanently'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ============================================================ */}
      {/* GOOGLE MEET MODALS                                           */}
      {/* ============================================================ */}
      {isCreateMeetOpen && activeCommunity && (
        <CreateGoogleMeetModal
          communityId={activeCommunity.id}
          eventId={eventData.id}
          eventTitle={eventData.title}
          onClose={() => setIsCreateMeetOpen(false)}
          onCreated={(space) => {
            setEventMeetSpace(space)
            showToast('Google Meet space created successfully!')
            fetchEventDetails()
          }}
        />
      )}

      {isManageMeetOpen && activeCommunity && eventMeetSpace && (
        <ManageGoogleMeetModal
          communityId={activeCommunity.id}
          spaceId={eventMeetSpace.id}
          isManager={isManager}
          onClose={() => setIsManageMeetOpen(false)}
          onSpaceUpdated={(updated) => {
            setEventMeetSpace(updated)
            fetchEventDetails()
          }}
        />
      )}
    </div>
  )
}
