import React, { useState, useRef } from 'react'
import {
  X,
  Building2,
  MapPin,
  FileText,
  Loader2,
  Save,
  Upload,
  Check,
  AlertCircle,
  CheckCircle2,
  Camera,
  Hash,
} from 'lucide-react'
import { CommunityImage } from '@/components/ui/CommunityImage'
import { supabase } from '@/lib/supabase/client'
import { findDuplicateInstitutionCommunity } from '@/utils/community'
import { uploadCommunityImage } from '@/lib/storageService'

export interface EditCommunityData {
  name: string
  shortName: string
  institution: string
  city: string
  description: string
  logoUrl?: string | null
}

export interface EditCommunityModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (updatedData: EditCommunityData) => Promise<void>
  initialData: {
    communityId?: string
    name: string
    shortName: string
    institutionName: string
    city: string
    description: string
    logoUrl?: string | null
  }
}

export const EditCommunityModal: React.FC<EditCommunityModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [name, setName] = useState(initialData.name)
  const [shortName, setShortName] = useState(initialData.shortName)
  const [institution, setInstitution] = useState(initialData.institutionName)
  const [city, setCity] = useState(initialData.city)
  const [description, setDescription] = useState(initialData.description)
  const [logoUrl, setLogoUrl] = useState<string | null>(initialData.logoUrl || null)

  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 3 * 1024 * 1024) {
      setErrorMessage('Community image must be less than 3MB.')
      return
    }

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please upload a valid image (PNG, JPG, WebP).')
      return
    }

    setIsUploadingImage(true)
    setErrorMessage(null)

    try {
      const commId = initialData.communityId || 'new'
      const { url, error } = await uploadCommunityImage(file, commId)
      if (error) {
        throw new Error(error)
      }
      if (url) {
        setLogoUrl(url)
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Image upload failed.')
    } finally {
      setIsUploadingImage(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    if (!name.trim()) {
      setErrorMessage('Community name is required.')
      return
    }

    if (!shortName.trim()) {
      setErrorMessage('Community short name is required.')
      return
    }

    if (!institution.trim()) {
      setErrorMessage('Institution name is required.')
      return
    }

    if (!city.trim()) {
      setErrorMessage('City is required.')
      return
    }

    // Duplicate check if institution changed
    if (institution.trim().toLowerCase() !== initialData.institutionName.toLowerCase()) {
      const dup = await findDuplicateInstitutionCommunity(institution.trim(), initialData.communityId)
      if (dup.exists) {
        setErrorMessage(
          `Another community tracker already exists for "${dup.existingCommunity.name}". Each campus must have only one tracker.`
        )
        return
      }
    }

    setIsSaving(true)
    setSaveStatus('saving')

    try {
      await onSave({
        name: name.trim(),
        shortName: shortName.trim().toUpperCase(),
        institution: institution.trim(),
        city: city.trim(),
        description: description.trim(),
        logoUrl,
      })

      setSaveStatus('success')
      setSuccessMessage('Community specifications updated successfully!')

      // Close modal after success feedback display
      setTimeout(() => {
        onClose()
      }, 1000)
    } catch (err) {
      setSaveStatus('error')
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to update community specifications.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-live-fade-in"
      onClick={(e) => e.target === e.currentTarget && !isSaving && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-[#0D121D] border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-live-modal-in text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0A0E17] text-white">
          <div className="flex items-center gap-2.5">
            <Building2 size={16} className="text-[#FF9900]" />
            <h3 className="text-sm font-mono font-bold tracking-tight">Edit Community Chapter</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* Alerts */}
          {errorMessage && (
            <div className="p-3 rounded-xl border border-rose-800 bg-rose-950/40 text-rose-300 text-xs font-mono flex items-start gap-2 shadow-xs">
              <AlertCircle size={15} className="text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-snug">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl border border-emerald-800 bg-emerald-950/40 text-emerald-300 text-xs font-mono flex items-start gap-2 shadow-xs">
              <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
              <div className="leading-snug">{successMessage}</div>
            </div>
          )}

          {/* Community Image Upload */}
          <div className="p-4 rounded-xl bg-[#0A0E17] border border-slate-800 flex items-center gap-4">
            <CommunityImage
              src={logoUrl}
              name={name}
              shortName={shortName}
              size="xl"
              className="border border-slate-700 shrink-0"
            />
            <div className="space-y-1.5 flex-1 min-w-0">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-bold">
                Community Image
              </span>
              <p className="text-[11px] text-slate-400 font-sans leading-tight">
                Stored in Supabase Storage. Reusable across dashboard, events, and Builder World.
              </p>
              <div className="pt-1 flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImage || isSaving}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer"
                >
                  {isUploadingImage ? (
                    <Loader2 size={12} className="animate-spin text-[#FF9900]" />
                  ) : (
                    <Camera size={12} className="text-[#FF9900]" />
                  )}
                  <span>{isUploadingImage ? 'Uploading...' : 'Change Image'}</span>
                </button>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => setLogoUrl(null)}
                    disabled={isSaving}
                    className="text-[11px] font-mono text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Community Name & Short Name */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 font-bold mb-1">
                Community Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="AWS Student Builder Group PSIT Kanpur"
                disabled={isSaving}
                className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-[#0A0E17] border border-slate-800 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF9900] focus:ring-1 focus:ring-[#FF9900]"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 font-bold mb-1">
                Short Name
              </label>
              <div className="relative">
                <Hash size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={shortName}
                  onChange={(e) => setShortName(e.target.value.toUpperCase())}
                  placeholder="PSIT"
                  disabled={isSaving}
                  className="w-full pl-7 pr-3 py-2 text-xs font-mono font-bold uppercase rounded-xl bg-[#0A0E17] border border-slate-800 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF9900] focus:ring-1 focus:ring-[#FF9900]"
                />
              </div>
            </div>
          </div>

          {/* Affiliated Institution */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 font-bold mb-1">
              Affiliated Institution
            </label>
            <div className="relative">
              <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input
                type="text"
                required
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="Pranveer Singh Institute of Technology"
                disabled={isSaving}
                className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-xl bg-[#0A0E17] border border-slate-800 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF9900] focus:ring-1 focus:ring-[#FF9900]"
              />
            </div>
            <span className="text-[10px] font-mono text-slate-500 mt-1 block">
              Enforced unique: Each campus is limited to one official tracker.
            </span>
          </div>

          {/* City */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 font-bold mb-1">
              City / Campus Location
            </label>
            <div className="relative">
              <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Kanpur"
                disabled={isSaving}
                className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-xl bg-[#0A0E17] border border-slate-800 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF9900] focus:ring-1 focus:ring-[#FF9900]"
              />
            </div>
          </div>

          {/* Mission & Description */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 font-bold mb-1">
              Chapter Mission & Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell builders what your chapter focuses on (e.g. serverless architectures, cloud certifications)..."
              disabled={isSaving}
              className="w-full px-3 py-2 text-xs font-sans rounded-xl bg-[#0A0E17] border border-slate-800 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF9900] focus:ring-1 focus:ring-[#FF9900]"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-mono font-bold text-slate-950 bg-[#FF9900] hover:bg-[#EC7211] shadow-md transition-all cursor-pointer disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99]"
            >
              {isSaving ? (
                <>
                  <Loader2 size={13} className="animate-spin text-slate-950" />
                  <span>Saving Changes...</span>
                </>
              ) : saveStatus === 'success' ? (
                <>
                  <Check size={13} />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save size={13} />
                  <span>Save Specifications</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditCommunityModal
