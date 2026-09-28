import React, { useState, useRef } from 'react'
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  RefreshCw,
  Image as ImageIcon,
} from 'lucide-react'
import { validateImageFile, MAX_IMAGE_SIZE_BYTES } from '@/lib/storageService'

export interface ImageUploadDropzoneProps {
  value?: string | null
  onUpload: (file: File) => Promise<{ url: string | null; error: string | null }>
  onRemove?: () => void
  aspectRatio?: 'square' | 'video' | 'banner'
  label?: string
  helperText?: string
  maxSizeBytes?: number
  disabled?: boolean
  className?: string
}

export const ImageUploadDropzone: React.FC<ImageUploadDropzoneProps> = ({
  value,
  onUpload,
  onRemove,
  aspectRatio = 'square',
  label,
  helperText = 'PNG, JPG, WebP or GIF up to 5MB',
  maxSizeBytes = MAX_IMAGE_SIZE_BYTES,
  disabled = false,
  className = '',
}) => {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(value || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Keep internal preview in sync with external value
  React.useEffect(() => {
    setPreviewUrl(value || null)
  }, [value])

  const processFile = async (file: File) => {
    // 1. Client-side validation
    const validation = validateImageFile(file, maxSizeBytes)
    if (!validation.valid) {
      setStatus('error')
      setErrorMessage(validation.error || 'Invalid file.')
      return
    }

    // 2. Create local object URL for instant visual responsiveness
    const localUrl = URL.createObjectURL(file)
    setPreviewUrl(localUrl)
    setStatus('uploading')
    setErrorMessage(null)

    // 3. Perform upload via provided handler
    try {
      const result = await onUpload(file)
      if (result.error) {
        setStatus('error')
        setErrorMessage(result.error)
      } else {
        setStatus('success')
        if (result.url) {
          setPreviewUrl(result.url)
        }
        setTimeout(() => setStatus('idle'), 3000)
      }
    } catch (err) {
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'Network or server error during upload.')
    } finally {
      URL.revokeObjectURL(localUrl)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    }
    // Reset file input value so user can re-upload same file if desired
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled && status !== 'uploading') {
      setIsDragOver(true)
    }
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (disabled || status === 'uploading') return

    const file = e.dataTransfer.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    setPreviewUrl(null)
    setStatus('idle')
    setErrorMessage(null)
    onRemove?.()
  }

  const getAspectClass = () => {
    switch (aspectRatio) {
      case 'video':
        return 'aspect-video'
      case 'banner':
        return 'aspect-[3/1]'
      case 'square':
      default:
        return 'aspect-square'
    }
  }

  return (
    <div className={`space-y-2 font-mono ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            {label}
          </label>
          {previewUrl && onRemove && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={disabled || status === 'uploading'}
              className="text-[11px] text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <X size={12} />
              <span>Remove</span>
            </button>
          )}
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={handleFileChange}
        disabled={disabled || status === 'uploading'}
        className="hidden"
      />

      {/* Dropzone Container */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && status !== 'uploading' && fileInputRef.current?.click()}
        className={`relative w-full ${getAspectClass()} rounded-xl overflow-hidden border-2 border-dashed transition-all cursor-pointer group flex flex-col items-center justify-center p-4 text-center ${
          isDragOver
            ? 'border-[#FF9900] bg-[#FF9900]/10 scale-[1.01]'
            : status === 'error'
            ? 'border-rose-500/60 bg-rose-950/20'
            : status === 'success'
            ? 'border-emerald-500/60 bg-emerald-950/20'
            : 'border-[#222E3E] bg-[#101622] hover:border-[#FF9900]/60 hover:bg-[#141C2A]'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {/* If Image Preview Exists */}
        {previewUrl && (
          <img
            src={previewUrl}
            alt="Uploaded preview"
            className="absolute inset-0 w-full h-full object-cover z-0 transition-transform duration-300 group-hover:scale-105"
            onError={() => {
              // Graceful error fallback
              setPreviewUrl(null)
            }}
          />
        )}

        {/* Overlay Tint when image is present */}
        {previewUrl && (
          <div className="absolute inset-0 bg-[#0B0F17]/60 group-hover:bg-[#0B0F17]/40 transition-colors z-1" />
        )}

        {/* Content Layer */}
        <div className="relative z-10 flex flex-col items-center gap-2">
          {status === 'uploading' ? (
            <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-[#0B0F17]/90 border border-[#FF9900]/40 backdrop-blur-xs">
              <Loader2 size={24} className="text-[#FF9900] animate-spin" />
              <span className="text-xs font-bold text-slate-200">Uploading image...</span>
              <span className="text-[10px] text-slate-400">Syncing with Supabase Storage</span>
            </div>
          ) : status === 'success' ? (
            <div className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-[#0B0F17]/90 border border-emerald-500/40 backdrop-blur-xs">
              <CheckCircle2 size={24} className="text-emerald-400" />
              <span className="text-xs font-bold text-emerald-300">Upload Successful!</span>
              <span className="text-[10px] text-slate-400">Click or drag to replace</span>
            </div>
          ) : previewUrl ? (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center gap-1.5 p-2.5 rounded-lg bg-[#0B0F17]/90 border border-slate-700 backdrop-blur-xs">
              <RefreshCw size={18} className="text-[#FF9900]" />
              <span className="text-xs font-bold text-slate-200">Change Image</span>
              <span className="text-[10px] text-slate-400">Click or drop file</span>
            </div>
          ) : (
            <>
              <div className="w-10 h-10 rounded-xl bg-[#1A2332] border border-[#2B3A4F] flex items-center justify-center text-[#FF9900] group-hover:border-[#FF9900]/50 group-hover:scale-110 transition-all shadow-inner">
                <Upload size={18} />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-200">
                  <span className="text-[#FF9900]">Click to upload</span> or drag and drop
                </p>
                <p className="text-[10px] text-slate-500">{helperText}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Error Alert Display with Retry */}
      {status === 'error' && errorMessage && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs animate-shake">
          <AlertCircle size={15} className="text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{errorMessage}</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-1 text-[11px] underline text-rose-200 hover:text-white"
            >
              Try another file
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
