import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
} from 'lucide-react'
import { useCommunity } from '@/context/CommunityContext'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase/client'

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
  const { activeCommunity, userRoleInActiveCommunity } = useCommunity()
  const { user } = useAuth()

  // Form states
  const [title, setTitle] = useState('')
  const [eventType, setEventType] = useState<string>('Workshop')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [startTime, setStartTime] = useState('10:00')
  const [endTime, setEndTime] = useState('12:00')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [highlights, setHighlights] = useState('')
  const [achievements, setAchievements] = useState('')
  const [projectLink, setProjectLink] = useState('')
  const [githubLink, setGithubLink] = useState('')
  const [slidesLink, setSlidesLink] = useState('')
  const [recordingLink, setRecordingLink] = useState('')
  const [coverImageUrl, setCoverImageUrl] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const isManager = userRoleInActiveCommunity === 'manager'

  // Image upload handling with Supabase Storage
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    setIsUploading(true)
    setErrorMessage(null)

    try {
      const ext = file.name.split('.').pop()
      const fileName = `event-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`
      const filePath = `events/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadError) {
        // Fallback to object URL if storage bucket fails
        const localUrl = URL.createObjectURL(file)
        setCoverImageUrl(localUrl)
      } else {
        const { data: pubData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath)
        setCoverImageUrl(pubData.publicUrl)
      }
    } catch {
      const localUrl = URL.createObjectURL(file)
      setCoverImageUrl(localUrl)
    } finally {
      setIsUploading(false)
    }
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
      // 1. Insert into community_events
      const eventDateTime = date ? new Date(`${date}T${startTime || '10:00'}:00Z`).toISOString() : new Date().toISOString()

      const { data: eventRecord, error } = await supabase
        .from('community_events')
        .insert({
          community_id: activeCommunity.id,
          title: title.trim(),
          description: description.trim() || null,
          event_type: eventType,
          event_date: eventDateTime,
          location: location.trim() || 'Online / Campus',
          created_by: user.id,
        })
        .select('id')
        .single()

      if (error) throw error

      // 2. Log activity
      if (publishStatus === 'published') {
        await supabase.from('community_activities').insert({
          community_id: activeCommunity.id,
          user_id: user.id,
          activity_type: 'published event',
          description: `Published event "${title.trim()}" (${eventType})`,
        })
      }

      setSuccessMessage(
        publishStatus === 'published'
          ? 'Event successfully published to the community!'
          : 'Event draft saved successfully!'
      )

      setTimeout(() => {
        navigate('/events')
      }, 1500)
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save event.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-5">
        <div>
          <Link
            to="/events"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-500 hover:text-slate-900 transition-colors mb-2"
          >
            <ArrowLeft size={14} />
            <span>Back to Events</span>
          </Link>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 font-sans tracking-tight">
            Add community event
          </h1>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            Document and share your community's activities.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-red-700 font-mono">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800 font-mono">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* 2-Column Split: Form 70% vs Live Preview 30% (desktop), stacked on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form Container (70% on desktop) */}
        <div className="lg:col-span-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
          {/* SECTION 1: Basic Information */}
          <div className="space-y-4">
            <h2 className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
              <Calendar size={14} className="text-[#FF9900]" />
              <span>Basic Information</span>
            </h2>

            <div>
              <label className="block text-xs font-mono font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Event Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. AWS Generative AI & Bedrock Hands-on Workshop"
                className="w-full px-3.5 py-2.5 text-xs font-sans rounded-xl bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF9900] focus:ring-1 focus:ring-[#FF9900]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Event Type
                </label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-white border border-slate-300 text-slate-800 focus:outline-none focus:border-[#FF9900]"
                >
                  {EVENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-white border border-slate-300 text-slate-800 focus:outline-none focus:border-[#FF9900]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-mono font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Start Time
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-white border border-slate-300 text-slate-800 focus:outline-none focus:border-[#FF9900]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  End Time
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-white border border-slate-300 text-slate-800 focus:outline-none focus:border-[#FF9900]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Location / Online
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Auditorium B or AWS Chime"
                  className="w-full px-3 py-2 text-xs font-sans rounded-xl bg-white border border-slate-300 text-slate-800 focus:outline-none focus:border-[#FF9900]"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: Event Description */}
          <div className="space-y-4 pt-2">
            <h2 className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
              <Sparkles size={14} className="text-[#FF9900]" />
              <span>Event Description & What Happened</span>
            </h2>

            <div>
              <label className="block text-xs font-mono font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                What Happened?
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Document the agenda, key topics covered, architecture patterns demonstrated, and participant engagement..."
                className="w-full px-3.5 py-2.5 text-xs font-sans rounded-xl bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF9900]"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Highlights & Takeaways
              </label>
              <input
                type="text"
                value={highlights}
                onChange={(e) => setHighlights(e.target.value)}
                placeholder="e.g. 45 students deployed their first Claude-3 model on Bedrock"
                className="w-full px-3 py-2 text-xs font-sans rounded-xl bg-white border border-slate-300 text-slate-800 focus:outline-none focus:border-[#FF9900]"
              />
            </div>
          </div>

          {/* SECTION 3: Achievements */}
          <div className="space-y-4 pt-2">
            <h2 className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
              <Trophy size={14} className="text-purple-600" />
              <span>Achievements & Outcomes</span>
            </h2>

            <div>
              <label className="block text-xs font-mono font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Winners / Outcomes
              </label>
              <input
                type="text"
                value={achievements}
                onChange={(e) => setAchievements(e.target.value)}
                placeholder="e.g. 1st Place: Team Serverless (PSIT), 2nd: Cloud Voyagers"
                className="w-full px-3 py-2 text-xs font-sans rounded-xl bg-white border border-slate-300 text-slate-800 focus:outline-none focus:border-[#FF9900]"
              />
            </div>
          </div>

          {/* SECTION 4: Resources */}
          <div className="space-y-4 pt-2">
            <h2 className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
              <Link2 size={14} className="text-blue-600" />
              <span>Resources & Artifacts</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  GitHub Link
                </label>
                <input
                  type="url"
                  value={githubLink}
                  onChange={(e) => setGithubLink(e.target.value)}
                  placeholder="https://github.com/..."
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-white border border-slate-300 text-slate-800 focus:outline-none focus:border-[#FF9900]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Slides Link
                </label>
                <input
                  type="url"
                  value={slidesLink}
                  onChange={(e) => setSlidesLink(e.target.value)}
                  placeholder="https://slideshare.net/..."
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-white border border-slate-300 text-slate-800 focus:outline-none focus:border-[#FF9900]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Recording Link
                </label>
                <input
                  type="url"
                  value={recordingLink}
                  onChange={(e) => setRecordingLink(e.target.value)}
                  placeholder="https://youtube.com/..."
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-white border border-slate-300 text-slate-800 focus:outline-none focus:border-[#FF9900]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Project Link
                </label>
                <input
                  type="url"
                  value={projectLink}
                  onChange={(e) => setProjectLink(e.target.value)}
                  placeholder="https://myproject.aws/..."
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-white border border-slate-300 text-slate-800 focus:outline-none focus:border-[#FF9900]"
                />
              </div>
            </div>
          </div>

          {/* SECTION 5: Photos & Drag and Drop */}
          <div className="space-y-4 pt-2">
            <h2 className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
              <ImageIcon size={14} className="text-emerald-600" />
              <span>Event Photos & Media</span>
            </h2>

            <div className="relative border-2 border-dashed border-slate-300 hover:border-[#FF9900] rounded-2xl p-6 text-center transition-colors bg-slate-50/50">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#EA580C] flex items-center justify-center">
                  {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                </div>
                <div className="text-xs font-semibold text-slate-800">
                  {coverImageUrl ? 'Change event photo' : 'Drag & drop event photos or click to browse'}
                </div>
                <p className="text-[11px] text-slate-400 font-mono">PNG, JPG, or WEBP up to 5MB</p>
              </div>
            </div>
          </div>

          {/* Bottom Actions: Save draft + Publish event */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit('draft')}
              className="px-4 py-2 rounded-xl text-xs font-mono font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
            >
              Save Draft
            </button>

            <button
              type="button"
              disabled={isSubmitting || !title.trim()}
              onClick={() => handleSubmit('published')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-bold text-white bg-[#FF9900] hover:bg-[#EA580C] disabled:opacity-50 transition-all shadow-xs cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Publishing...</span>
                </>
              ) : (
                <>
                  <Calendar size={14} />
                  <span>Publish Event</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Preview Panel (30% on desktop, below on mobile) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sticky top-20">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={13} className="text-[#FF9900]" />
                <span>Live Event Preview</span>
              </span>
              <span className="text-[10px] font-mono text-[#EA580C] bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200 font-bold">
                {eventType}
              </span>
            </div>

            {/* Preview Card */}
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs space-y-3">
              {/* Event Image */}
              <div className="h-36 bg-gradient-to-r from-slate-800 to-slate-900 relative overflow-hidden flex items-center justify-center">
                {coverImageUrl ? (
                  <img src={coverImageUrl} alt="Event cover" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-4">
                    <span className="text-2xl block mb-1">☁️</span>
                    <span className="text-[11px] font-mono text-slate-400">AWS Event Banner</span>
                  </div>
                )}
                <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white text-[10px] font-mono">
                  {date || 'Upcoming'}
                </div>
              </div>

              <div className="p-4 space-y-2.5">
                <h3 className="text-xs font-bold text-slate-900 font-sans line-clamp-1">
                  {title.trim() || 'Untitled Community Event'}
                </h3>

                <p className="text-[11px] text-slate-500 font-sans line-clamp-2 leading-relaxed">
                  {description.trim() || 'Event summary will appear here as you write your event report.'}
                </p>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-500">
                  <div className="flex items-center gap-1">
                    <MapPin size={11} className="text-slate-400" />
                    <span>{location || 'Campus / Online'}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[#EA580C] font-semibold">
                    <Clock size={11} />
                    <span>{startTime} - {endTime}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
