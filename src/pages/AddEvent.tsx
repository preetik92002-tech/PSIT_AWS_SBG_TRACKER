import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Upload,
  Sparkles,
  Link2,
  Trophy,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
  Users,
  Image as ImageIcon,
  Video,
  Shield,
  FileText,
  ExternalLink,
  Plus,
  Trash2,
} from 'lucide-react'
import { useCommunity } from '@/context/CommunityContext'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase/client'
import { CommunityImage } from '@/components/ui/CommunityImage'
import { ImageUploadDropzone } from '@/components/ui/ImageUploadDropzone'
import { uploadEventImage } from '@/lib/storageService'
import { EventStatus } from '@/types/database'

const EVENT_TYPES = [
  'Workshop',
  'Hackathon',
  'Orientation',
  'Session',
  'Meetup',
  'Project Showcase',
] as const

export const AddEvent: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editEventId = searchParams.get('editEventId')

  const { activeCommunity, userRoleInActiveCommunity } = useCommunity()
  const { user } = useAuth()

  // Form states
  const [title, setTitle] = useState('')
  const [eventType, setEventType] = useState<string>('Workshop')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [startTime, setStartTime] = useState('10:00')
  const [endTime, setEndTime] = useState('12:00')
  const [location, setLocation] = useState('')
  const [meetingUrl, setMeetingUrl] = useState('')
  const [description, setDescription] = useState('')
  const [registrationRequired, setRegistrationRequired] = useState(false)
  const [maxCapacity, setMaxCapacity] = useState<number | ''>('')
  const [highlights, setHighlights] = useState('')
  const [achievements, setAchievements] = useState('')
  const [projectLink, setProjectLink] = useState('')
  const [githubLink, setGithubLink] = useState('')
  const [slidesLink, setSlidesLink] = useState('')
  const [recordingLink, setRecordingLink] = useState('')
  const [coverImageUrl, setCoverImageUrl] = useState('')
  const [customResources, setCustomResources] = useState<Array<{ title: string; url: string }>>([])
  const [newResourceTitle, setNewResourceTitle] = useState('')
  const [newResourceUrl, setNewResourceUrl] = useState('')

  const [isUploading, setIsUploading] = useState(false)
  const [isLoadingEvent, setIsLoadingEvent] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const isManager = userRoleInActiveCommunity === 'manager'

  // Load existing event data if editing
  useEffect(() => {
    const fetchExistingEvent = async () => {
      if (!editEventId || !activeCommunity?.id) return
      setIsLoadingEvent(true)
      try {
        const { data: ev, error } = await supabase
          .from('community_events')
          .select('*')
          .eq('id', editEventId)
          .eq('community_id', activeCommunity.id)
          .single()

        if (error) throw error

        if (ev) {
          setTitle(ev.title || '')
          setEventType(ev.event_type || 'Workshop')
          if (ev.event_date) {
            setDate(new Date(ev.event_date).toISOString().slice(0, 10))
          }
          setStartTime(ev.start_time || '10:00')
          setEndTime(ev.end_time || '12:00')
          setLocation(ev.location || '')
          setMeetingUrl(ev.meeting_url || '')
          setDescription(ev.description || '')
          setRegistrationRequired(!!ev.registration_required)
          setMaxCapacity(ev.max_capacity || '')
          setHighlights(ev.highlights || '')
          setAchievements(ev.achievements || '')
          setProjectLink(ev.project_link || '')
          setGithubLink(ev.github_link || '')
          setSlidesLink(ev.slides_link || '')
          setRecordingLink(ev.recording_link || '')
          setCoverImageUrl(ev.image_url || '')
          if (Array.isArray(ev.resources)) {
            setCustomResources(ev.resources as Array<{ title: string; url: string }>)
          }
        }
      } catch (err) {
        console.error('Failed to load event for editing', err)
        setErrorMessage(err instanceof Error ? err.message : 'Failed to load event.')
      } finally {
        setIsLoadingEvent(false)
      }
    }

    fetchExistingEvent()
  }, [editEventId, activeCommunity?.id])

  // Image upload handling with Supabase Storage (Feature 20: Event-Specific Image)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user || !activeCommunity?.id) return

    setIsUploading(true)
    setErrorMessage(null)

    try {
      const { url, error } = await uploadEventImage(file, activeCommunity.id, editEventId || undefined)
      if (error) {
        setErrorMessage(error)
      } else if (url) {
        setCoverImageUrl(url)
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to upload event image.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleAddResource = () => {
    if (!newResourceTitle.trim() || !newResourceUrl.trim()) return
    setCustomResources([
      ...customResources,
      { title: newResourceTitle.trim(), url: newResourceUrl.trim() },
    ])
    setNewResourceTitle('')
    setNewResourceUrl('')
  }

  const handleRemoveResource = (idx: number) => {
    setCustomResources(customResources.filter((_, i) => i !== idx))
  }

  const handleGenerateMeet = () => {
    const randomCode = Math.random().toString(36).substring(2, 5) + '-' +
      Math.random().toString(36).substring(2, 6) + '-' +
      Math.random().toString(36).substring(2, 5)
    setMeetingUrl(`https://meet.google.com/${randomCode}`)
  }

  const handleSubmit = async (publishStatus: 'draft' | 'published') => {
    if (!activeCommunity?.id || !user) return
    if (!title.trim()) {
      setErrorMessage('Please enter an event title.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const eventDateTime = date ? new Date(`${date}T${startTime || '10:00'}:00Z`).toISOString() : new Date().toISOString()
      const capacityVal = maxCapacity ? Number(maxCapacity) : null

      const eventPayload = {
        community_id: activeCommunity.id,
        title: title.trim(),
        description: description.trim() || null,
        event_type: eventType,
        event_date: eventDateTime,
        start_time: startTime || '10:00',
        end_time: endTime || '12:00',
        location: location.trim() || (meetingUrl ? 'Google Meet / Online' : 'Campus / Online'),
        meeting_url: meetingUrl.trim() || null,
        status: publishStatus as EventStatus,
        image_url: coverImageUrl.trim() || null,
        registration_required: registrationRequired,
        max_capacity: capacityVal,
        highlights: highlights.trim() || null,
        achievements: achievements.trim() || null,
        project_link: projectLink.trim() || null,
        github_link: githubLink.trim() || null,
        slides_link: slidesLink.trim() || null,
        recording_link: recordingLink.trim() || null,
        resources: customResources as any,
        updated_at: new Date().toISOString(),
      }

      let savedEventId = editEventId

      if (editEventId) {
        const { error } = await supabase
          .from('community_events')
          .update(eventPayload)
          .eq('id', editEventId)
          .eq('community_id', activeCommunity.id)

        if (error) throw error
      } else {
        const { data: newRecord, error } = await supabase
          .from('community_events')
          .insert({
            ...eventPayload,
            created_by: user.id,
          })
          .select('id')
          .single()

        if (error) throw error
        savedEventId = newRecord.id
      }

      // If published, write activity & notify community members
      if (publishStatus === 'published' && savedEventId) {
        await supabase.from('community_activities').insert({
          community_id: activeCommunity.id,
          user_id: user.id,
          activity_type: editEventId ? 'updated event' : 'published event',
          description: editEventId
            ? `Updated event "${title.trim()}"`
            : `Published event "${title.trim()}" (${eventType})`,
          metadata: { event_id: savedEventId },
        })

        if (!editEventId) {
          // Notify active members of new published event
          const { data: chapterMembers } = await supabase
            .from('community_members')
            .select('user_id')
            .eq('community_id', activeCommunity.id)
            .eq('status', 'active')

          if (chapterMembers && chapterMembers.length > 0) {
            const notifications = chapterMembers.map((m: any) => ({
              recipient_id: m.user_id,
              community_id: activeCommunity.id,
              type: 'event' as const,
              title: 'New Community Event Published',
              message: `"${title.trim()}" is scheduled for ${date} at ${startTime}. RSVP now!`,
              entity_type: 'event',
              entity_id: savedEventId,
            }))
            await supabase.from('notifications').insert(notifications)
          }
        }
      }

      setSuccessMessage(
        publishStatus === 'published'
          ? editEventId
            ? 'Event updated and published!'
            : 'Event successfully published to the community!'
          : 'Event draft saved successfully!'
      )

      setTimeout(() => {
        navigate(savedEventId ? `/events/${savedEventId}` : '/events')
      }, 1200)
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save event.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Permission guard
  if (!isManager) {
    return (
      <div className="py-20 max-w-md mx-auto text-center space-y-4 font-mono text-xs">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-[#FF9900] flex items-center justify-center mx-auto border border-[#FF9900]/30">
          <Shield size={24} />
        </div>
        <h2 className="text-base font-bold text-white font-sans">Manager Access Required</h2>
        <p className="text-slate-400">
          Only Community Managers can create and configure events in {activeCommunity?.name}.
        </p>
        <Link
          to="/events"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#18202E] text-white border border-[#1F293A] hover:bg-[#222E42] transition-colors"
        >
          <ArrowLeft size={13} />
          <span>Back to Events</span>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      {/* Header & Community Identity Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1F293A] pb-5">
        <div>
          <Link
            to="/events"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-white transition-colors mb-2"
          >
            <ArrowLeft size={14} />
            <span>Back to Events Directory</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold text-white font-sans tracking-tight">
              {editEventId ? 'Edit Event' : 'Create Community Event'}
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Organize workshops, hackathons, and live cloud sessions for your student builders.
          </p>
        </div>

        {/* Community Identity Pill */}
        {activeCommunity && (
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-[#121824] border border-[#1F293A] self-start md:self-auto font-mono text-xs">
            <CommunityImage
              src={activeCommunity.image_url}
              name={activeCommunity.name}
              size="sm"
            />
            <div>
              <div className="text-xs font-bold text-white font-sans">{activeCommunity.name}</div>
              <div className="text-[10px] text-slate-400 font-sans flex items-center gap-1">
                <Building2 size={10} className="text-[#FF9900]" />
                <span>{activeCommunity.institution_name}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800 flex items-center gap-2 text-xs text-red-300 font-mono">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800 flex items-center gap-2 text-xs text-emerald-300 font-mono">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {isLoadingEvent ? (
        <div className="py-20 text-center text-xs font-mono text-slate-400">
          <Loader2 className="animate-spin inline-block mr-2" size={16} />
          <span>Loading event configuration...</span>
        </div>
      ) : (
        /* 2-Column Split: Form (Left 65%) vs Live Preview (Right 35%) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Form (8 Cols) */}
          <div className="lg:col-span-8 rounded-2xl border border-[#1F293A] bg-[#121824] p-6 shadow-xs space-y-5">
            {/* Title & Type */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Event Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. AWS Generative AI & Bedrock Hands-on Lab"
                  className="w-full px-3.5 py-2.5 text-xs font-sans rounded-xl bg-[#0E141F] border border-[#1F293A] text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF9900] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Event Type *
                </label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl bg-[#0E141F] border border-[#1F293A] text-white focus:outline-none focus:border-[#FF9900]"
                >
                  {EVENT_TYPES.map((t) => (
                    <option key={t} value={t} className="bg-[#121824] text-white">
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Overview of the workshop, learning outcomes, and technical takeaways..."
                className="w-full px-3.5 py-2.5 text-xs font-sans rounded-xl bg-[#0E141F] border border-[#1F293A] text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF9900] transition-colors"
              />
            </div>

            {/* Date, Start Time, End Time */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Event Date *
                </label>
                <div className="relative">
                  <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-xl bg-[#0E141F] border border-[#1F293A] text-white focus:outline-none focus:border-[#FF9900]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Start Time *
                </label>
                <div className="relative">
                  <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-xl bg-[#0E141F] border border-[#1F293A] text-white focus:outline-none focus:border-[#FF9900]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  End Time *
                </label>
                <div className="relative">
                  <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-xl bg-[#0E141F] border border-[#1F293A] text-white focus:outline-none focus:border-[#FF9900]"
                  />
                </div>
              </div>
            </div>

            {/* Location & Physical Venue */}
            <div>
              <label className="block text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Physical Location / Room
              </label>
              <div className="relative">
                <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Auditorium Hall B, 3rd Floor Lab 4, or Virtual"
                  className="w-full pl-9 pr-3.5 py-2 text-xs font-sans rounded-xl bg-[#0E141F] border border-[#1F293A] text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF9900]"
                />
              </div>
            </div>

            {/* Community Live: Google Meet Link */}
            <div className="p-4 rounded-xl bg-[#0E141F] border border-[#1F293A] space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold text-[#FF9900] uppercase tracking-wider flex items-center gap-1.5">
                  <Video size={14} />
                  <span>Community Live / Google Meet Session</span>
                </label>
                <button
                  type="button"
                  onClick={handleGenerateMeet}
                  className="text-[11px] font-mono text-[#FF9900] hover:underline cursor-pointer"
                >
                  Generate Meet Link
                </button>
              </div>
              <input
                type="url"
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                placeholder="https://meet.google.com/abc-defg-hij"
                className="w-full px-3.5 py-2 text-xs font-mono rounded-xl bg-[#18202E] border border-[#1F293A] text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF9900]"
              />
              <span className="text-[10px] text-slate-400 font-sans block">
                Builders will be able to join this Google Meet directly from the event details page and dashboard.
              </span>
            </div>

            {/* Event Specific Image (Banner / Cover) */}
            <div className="space-y-3">
              <label className="block text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider">
                Event Cover Image (Event-Specific Banner)
              </label>

              {activeCommunity?.id && (
                <ImageUploadDropzone
                  value={coverImageUrl}
                  aspectRatio="video"
                  label="Upload Event Banner"
                  helperText="PNG, JPG, WebP up to 5MB. Stored in event media storage."
                  onUpload={async (file) => {
                    const res = await uploadEventImage(file, activeCommunity.id, editEventId || undefined)
                    if (res.url) {
                      setCoverImageUrl(res.url)
                    }
                    return res
                  }}
                  onRemove={() => setCoverImageUrl('')}
                />
              )}

              <div className="relative">
                <ImageIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="url"
                  value={coverImageUrl}
                  onChange={(e) => setCoverImageUrl(e.target.value)}
                  placeholder="https://... or enter external image URL"
                  className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-xl bg-[#0E141F] border border-[#1F293A] text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF9900]"
                />
              </div>

              <span className="text-[10px] text-slate-500 font-sans block">
                Note: This image is strictly event-specific and will NOT replace or overwrite your community image.
              </span>
            </div>

            {/* Registration Requirement & Capacity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#1F293A]">
              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-[#1F293A] bg-[#0E141F] cursor-pointer">
                <input
                  type="checkbox"
                  checked={registrationRequired}
                  onChange={(e) => setRegistrationRequired(e.target.checked)}
                  className="accent-[#FF9900] w-4 h-4 rounded cursor-pointer"
                />
                <div>
                  <span className="block text-xs font-mono font-semibold text-white">Require RSVP</span>
                  <span className="block text-[10px] text-slate-400">Builders must RSVP to attend</span>
                </div>
              </label>

              <div>
                <label className="block text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Max Capacity (Optional)
                </label>
                <div className="relative">
                  <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    min={1}
                    value={maxCapacity}
                    onChange={(e) => setMaxCapacity(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 50 (Leave blank for unlimited)"
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-xl bg-[#0E141F] border border-[#1F293A] text-white focus:outline-none focus:border-[#FF9900]"
                  />
                </div>
              </div>
            </div>

            {/* Resources (Slides, GitHub, Recording, Custom Links) */}
            <div className="pt-2 border-t border-[#1F293A] space-y-3">
              <label className="block text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider">
                Event Resources & Deliverables
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
                <input
                  type="url"
                  value={slidesLink}
                  onChange={(e) => setSlidesLink(e.target.value)}
                  placeholder="Slides link (e.g. SpeakerDeck / Google Slides)"
                  className="px-3 py-2 rounded-xl bg-[#0E141F] border border-[#1F293A] text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF9900]"
                />
                <input
                  type="url"
                  value={githubLink}
                  onChange={(e) => setGithubLink(e.target.value)}
                  placeholder="GitHub Repository link"
                  className="px-3 py-2 rounded-xl bg-[#0E141F] border border-[#1F293A] text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF9900]"
                />
                <input
                  type="url"
                  value={recordingLink}
                  onChange={(e) => setRecordingLink(e.target.value)}
                  placeholder="Recording / YouTube link"
                  className="px-3 py-2 rounded-xl bg-[#0E141F] border border-[#1F293A] text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF9900]"
                />
                <input
                  type="url"
                  value={projectLink}
                  onChange={(e) => setProjectLink(e.target.value)}
                  placeholder="Demo / Architecture showcase link"
                  className="px-3 py-2 rounded-xl bg-[#0E141F] border border-[#1F293A] text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF9900]"
                />
              </div>

              {/* Custom Add Resource */}
              {customResources.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {customResources.map((res, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-xl bg-[#18202E] border border-[#1F293A] text-xs font-mono"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Link2 size={12} className="text-[#FF9900] shrink-0" />
                        <span className="text-white font-medium truncate">{res.title}:</span>
                        <span className="text-slate-400 truncate">{res.url}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveResource(idx)}
                        className="text-slate-400 hover:text-rose-400 p-1 cursor-pointer shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1 font-mono text-xs">
                <input
                  type="text"
                  value={newResourceTitle}
                  onChange={(e) => setNewResourceTitle(e.target.value)}
                  placeholder="Resource title (e.g. AWS Whitepaper)"
                  className="flex-1 px-3 py-1.5 rounded-xl bg-[#0E141F] border border-[#1F293A] text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF9900]"
                />
                <input
                  type="url"
                  value={newResourceUrl}
                  onChange={(e) => setNewResourceUrl(e.target.value)}
                  placeholder="URL link"
                  className="flex-1 px-3 py-1.5 rounded-xl bg-[#0E141F] border border-[#1F293A] text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF9900]"
                />
                <button
                  type="button"
                  onClick={handleAddResource}
                  className="px-3 py-1.5 rounded-xl bg-[#18202E] hover:bg-[#1E293B] text-slate-200 border border-[#1F293A] transition-colors cursor-pointer"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Highlights & Recap Content */}
            <div className="pt-2 border-t border-[#1F293A]">
              <label className="block text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Key Highlights / Agenda Points
              </label>
              <textarea
                rows={2}
                value={highlights}
                onChange={(e) => setHighlights(e.target.value)}
                placeholder="Hands-on CDK deployment, VPC architecture walkthrough, live Q&A session..."
                className="w-full px-3.5 py-2 text-xs font-sans rounded-xl bg-[#0E141F] border border-[#1F293A] text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF9900]"
              />
            </div>

            {/* Action Buttons: Save Draft vs Publish */}
            <div className="pt-5 border-t border-[#1F293A] flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSubmit('draft')}
                className="px-4 py-2.5 rounded-xl text-xs font-mono font-medium text-slate-300 hover:text-white hover:bg-[#18202E] border border-[#1F293A] transition-colors cursor-pointer"
              >
                Save Draft
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSubmit('published')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-bold text-slate-950 bg-[#FF9900] hover:bg-[#EC7211] transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    <span>Publish Event</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right 4 Cols: Live Preview Card */}
          <div className="lg:col-span-4 space-y-4">
            <div className="rounded-2xl border border-[#1F293A] bg-[#121824] p-5 shadow-xs space-y-4 font-mono">
              <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-[#1F293A]">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} className="text-[#FF9900]" />
                  <span>Event Card Preview</span>
                </span>
                <span className="text-[10px] text-slate-500">Live Preview</span>
              </div>

              {/* Rendered Preview Card */}
              <div className="rounded-xl bg-[#0E141F] border border-[#1F293A] overflow-hidden space-y-3 p-4">
                {/* Event specific banner or placeholder */}
                {coverImageUrl ? (
                  <img
                    src={coverImageUrl}
                    alt={title}
                    className="w-full h-36 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-full h-24 rounded-lg bg-gradient-to-br from-[#18202E] to-[#0E141F] border border-[#1F293A] flex items-center justify-center text-slate-600 text-xs font-mono">
                    Event Cover Banner
                  </div>
                )}

                {/* Community Identity Bar inside Event */}
                {activeCommunity && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-[#18202E] border border-[#1F293A] text-[11px] font-sans">
                    <CommunityImage
                      src={activeCommunity.image_url}
                      name={activeCommunity.name}
                      size="sm"
                    />
                    <div className="truncate">
                      <div className="font-bold text-white truncate">{activeCommunity.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{activeCommunity.institution_name}</div>
                    </div>
                  </div>
                )}

                {/* Event Title & Type */}
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#FF9900] tracking-wider px-2 py-0.5 rounded bg-[#FF9900]/15 border border-[#FF9900]/30 inline-block mb-1">
                    {eventType}
                  </span>
                  <h3 className="text-sm font-bold text-white font-sans">
                    {title.trim() || 'Untitled Event'}
                  </h3>
                </div>

                <div className="pt-2 border-t border-[#1F293A] space-y-1.5 text-xs text-slate-300 font-sans">
                  <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
                    <Calendar size={12} className="text-[#FF9900]" />
                    <span>{date} ({startTime} - {endTime})</span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-400 font-sans text-xs">
                    <MapPin size={12} className="text-[#FF9900]" />
                    <span className="truncate">{location || 'Campus / Online'}</span>
                  </div>

                  {meetingUrl && (
                    <div className="flex items-center gap-2 text-emerald-400 font-mono text-[11px]">
                      <Video size={12} />
                      <span>Google Meet Attached</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
