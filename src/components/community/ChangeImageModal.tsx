import React, { useState, useRef } from 'react'
import {
  X,
  Camera,
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Check,
} from 'lucide-react'
import { CommunityImage } from '@/components/ui/CommunityImage'
import { supabase } from '@/lib/supabase/client'
import { uploadCommunityImage } from '@/lib/storageService'

export interface ChangeImageModalProps {
  isOpen: boolean
  onClose: () => void
  community: {
    id: string
    name: string
    shortName: string
    currentImageUrl?: string | null
  }
  onImageUpdated: (newImageUrl: string) => Promise<void>
}

export const ChangeImageModal: React.FC<ChangeImageModalProps> = ({
  isOpen,
  onClose,
  community,
  onImageUpdated,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(community.currentImageUrl || null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 3 * 1024 * 1024) {
      setErrorMessage('Image file must be under 3MB.')
      return
    }

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (PNG, JPG, WebP).')
      return
    }

    setSelectedFile(file)
    const localUrl = URL.createObjectURL(file)
    setSelectedImage(localUrl)
    setErrorMessage(null)
  }

  const handleUploadAndSave = async () => {
    if (!selectedFile && selectedImage === community.currentImageUrl) {
      onClose()
      return
    }

    setIsUploading(true)
    setErrorMessage(null)

    try {
      let finalUrl = selectedImage

      if (selectedFile) {
        const { url, error } = await uploadCommunityImage(selectedFile, community.id)
        if (error) {
          throw new Error(error)
        }
        if (url) {
          finalUrl = url
        }
      }

      if (finalUrl) {
        await onImageUpdated(finalUrl)
      }

      setStatusMessage('Community image successfully updated!')
      setTimeout(() => {
        onClose()
      }, 900)
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to update community image.'
      )
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-live-fade-in"
      onClick={(e) => e.target === e.currentTarget && !isUploading && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-[#0D121D] border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-live-modal-in text-slate-100 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0A0E17] text-white">
          <div className="flex items-center gap-2">
            <Camera size={16} className="text-[#FF9900]" />
            <h3 className="text-sm font-mono font-bold tracking-tight">Change Community Image</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 font-mono text-xs">
          {errorMessage && (
            <div className="p-3 rounded-xl border border-rose-800 bg-rose-950/40 text-rose-300 flex items-start gap-2 shadow-xs">
              <AlertCircle size={15} className="text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {statusMessage && (
            <div className="p-3 rounded-xl border border-emerald-800 bg-emerald-950/40 text-emerald-300 flex items-start gap-2 shadow-xs">
              <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
              <span>{statusMessage}</span>
            </div>
          )}

          <div className="text-center space-y-3">
            <CommunityImage
              src={selectedImage}
              name={community.name}
              shortName={community.shortName}
              size="2xl"
              className="mx-auto border-2 border-slate-700 shadow-md"
            />

            <div>
              <h4 className="text-sm font-bold text-white">{community.name}</h4>
              <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                PNG, JPG or WebP up to 3MB
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleFileSelect}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer"
            >
              <Upload size={13} className="text-[#FF9900]" />
              <span>Browse Image File</span>
            </button>
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUploadAndSave}
              disabled={isUploading || !selectedFile}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-bold text-slate-950 bg-[#FF9900] hover:bg-[#EC7211] shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 size={13} className="animate-spin text-slate-950" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Check size={13} />
                  <span>Save Image</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChangeImageModal
