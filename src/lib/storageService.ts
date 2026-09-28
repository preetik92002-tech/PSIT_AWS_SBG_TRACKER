import { supabase } from '@/lib/supabase/client'

// ==============================================================================
// AWS COMMUNITY MANAGER - FEATURE 20: SUPABASE STORAGE & IMAGE SERVICE
// ==============================================================================

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

export interface ImageValidationResult {
  valid: boolean
  error?: string
}

export interface UploadImageResult {
  url: string | null
  error: string | null
}

/**
 * Validates image file type and size.
 */
export function validateImageFile(
  file: File,
  maxSizeBytes: number = MAX_IMAGE_SIZE_BYTES
): ImageValidationResult {
  if (!file) {
    return { valid: false, error: 'No file selected.' }
  }

  // File type validation
  const fileType = file.type?.toLowerCase()
  const fileExt = file.name.split('.').pop()?.toLowerCase() || ''
  const validExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif']

  const isTypeAllowed = ALLOWED_IMAGE_TYPES.includes(fileType)
  const isExtAllowed = validExtensions.includes(fileExt)

  if (!isTypeAllowed && !isExtAllowed) {
    return {
      valid: false,
      error: `Invalid file format (${file.type || fileExt}). Please upload PNG, JPG, WebP, or GIF.`,
    }
  }

  // File size validation
  if (file.size > maxSizeBytes) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
    const maxMB = (maxSizeBytes / (1024 * 1024)).toFixed(0)
    return {
      valid: false,
      error: `File is too large (${sizeMB} MB). Maximum allowed size is ${maxMB} MB.`,
    }
  }

  return { valid: true }
}

/**
 * Appends a cache-busting timestamp or custom version to the URL to prevent stale browser cache.
 */
export function addCacheBuster(url: string, version: number | string = Date.now()): string {
  if (!url) return url
  try {
    const urlObj = new URL(url, window.location.origin)
    urlObj.searchParams.set('v', String(version))
    return urlObj.toString()
  } catch {
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}v=${version}`
  }
}

/**
 * Normalizes and formats error messages from Supabase Storage and network failures.
 */
function handleUploadError(err: unknown): string {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 'Network failure: You appear to be offline. Please verify your internet connection.'
  }

  if (err instanceof Error) {
    if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
      return 'Network failure: Unable to reach the storage server. Please try again.'
    }
    if (err.message.includes('security policy') || err.message.includes('row-level security')) {
      return 'Permission denied: You do not have authorization to modify this media.'
    }
    if (err.message.includes('Payload too large') || err.message.includes('413')) {
      return 'Upload failed: Image file exceeds storage server limits.'
    }
    return err.message
  }

  return 'An unexpected error occurred during image upload.'
}

// ------------------------------------------------------------------------------
// 1. PROFILE IMAGE (Bucket: avatars, Path: {userId}/avatar_{timestamp}.{ext})
//    Updates: profiles.avatar_url
// ------------------------------------------------------------------------------

export async function uploadProfileAvatar(
  file: File,
  userId: string
): Promise<UploadImageResult> {
  const validation = validateImageFile(file)
  if (!validation.valid) {
    return { url: null, error: validation.error || 'Validation failed.' }
  }

  try {
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const fileName = `avatar_${Date.now()}.${fileExt}`
    // Strictly formatted for RLS: (storage.foldername(name))[1] = auth.uid()::text
    const filePath = `${userId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      })

    if (uploadError) {
      throw uploadError
    }

    const { data: pubData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)

    if (!pubData?.publicUrl) {
      throw new Error('Failed to retrieve public URL for uploaded profile avatar.')
    }

    const versionedUrl = addCacheBuster(pubData.publicUrl)

    // Update profiles.avatar_url
    const { error: dbError } = await supabase
      .from('profiles')
      .update({
        avatar_url: versionedUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (dbError) {
      throw dbError
    }

    return { url: versionedUrl, error: null }
  } catch (err) {
    return { url: null, error: handleUploadError(err) }
  }
}

// ------------------------------------------------------------------------------
// 2. COMMUNITY IMAGE (Bucket: community-media, Path: communities/{communityId}/...)
//    Updates: communities.image_url & communities.logo_url
// ------------------------------------------------------------------------------

export async function uploadCommunityImage(
  file: File,
  communityId: string
): Promise<UploadImageResult> {
  const validation = validateImageFile(file)
  if (!validation.valid) {
    return { url: null, error: validation.error || 'Validation failed.' }
  }

  try {
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png'
    const fileName = `image_${Date.now()}.${fileExt}`
    const filePath = `communities/${communityId}/${fileName}`

    // Attempt upload to 'community-media' bucket, with fallback to 'avatars' if pending migration
    let bucketName = 'community-media'
    let { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      })

    if (uploadError && uploadError.message.includes('Bucket not found')) {
      bucketName = 'avatars'
      const fallbackPath = `${communityId}/community_${fileName}`
      const retry = await supabase.storage
        .from(bucketName)
        .upload(fallbackPath, file, {
          cacheControl: '3600',
          upsert: true,
        })
      uploadError = retry.error
    }

    if (uploadError) {
      throw uploadError
    }

    const { data: pubData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath)

    if (!pubData?.publicUrl) {
      throw new Error('Failed to retrieve public URL for community media.')
    }

    const versionedUrl = addCacheBuster(pubData.publicUrl)

    // Update communities.image_url and communities.logo_url
    const { error: dbError } = await supabase
      .from('communities')
      .update({
        image_url: versionedUrl,
        logo_url: versionedUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', communityId)

    if (dbError) {
      throw dbError
    }

    return { url: versionedUrl, error: null }
  } catch (err) {
    return { url: null, error: handleUploadError(err) }
  }
}

// ------------------------------------------------------------------------------
// 3. EVENT IMAGE (Bucket: community-media, Path: events/{communityId}/{eventId}/...)
//    Event-specific image. Do not replace with community image.
//    Updates: community_events.image_url (if eventId is provided)
// ------------------------------------------------------------------------------

export async function uploadEventImage(
  file: File,
  communityId: string,
  eventId?: string
): Promise<UploadImageResult> {
  const validation = validateImageFile(file)
  if (!validation.valid) {
    return { url: null, error: validation.error || 'Validation failed.' }
  }

  try {
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const fileName = `cover_${Date.now()}.${fileExt}`
    const eventFolder = eventId || 'new'
    const filePath = `events/${communityId}/${eventFolder}/${fileName}`

    let bucketName = 'community-media'
    let { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      })

    if (uploadError && uploadError.message.includes('Bucket not found')) {
      bucketName = 'avatars'
      const fallbackPath = `${communityId}/event_${fileName}`
      const retry = await supabase.storage
        .from(bucketName)
        .upload(fallbackPath, file, {
          cacheControl: '3600',
          upsert: true,
        })
      uploadError = retry.error
    }

    if (uploadError) {
      throw uploadError
    }

    const { data: pubData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath)

    if (!pubData?.publicUrl) {
      throw new Error('Failed to retrieve public URL for event image.')
    }

    const versionedUrl = addCacheBuster(pubData.publicUrl)

    // If event exists in database, persist image_url to the specific event record
    if (eventId) {
      const { error: dbError } = await supabase
        .from('community_events')
        .update({
          image_url: versionedUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', eventId)

      if (dbError) {
        throw dbError
      }
    }

    return { url: versionedUrl, error: null }
  } catch (err) {
    return { url: null, error: handleUploadError(err) }
  }
}
