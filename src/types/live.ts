// ==============================================================================
// COMMUNITY LIVE — TYPE DEFINITIONS
// ==============================================================================
// Clean UI abstraction so the backend can be connected later without redesigning
// components. Replace the mock service with the real Supabase/Google Meet service.
// ==============================================================================

export type LiveSessionProvider = 'google_meet'

export type LiveSessionStatus = 'scheduled' | 'live' | 'ended' | 'cancelled'

export interface LiveSession {
  /** Unique identifier (will be the event's meeting_external_id when connected) */
  id: string
  /** The provider used to host the meeting */
  provider: LiveSessionProvider
  /** Display title for the session */
  title: string
  /** Optional description */
  description?: string | null
  /** ISO-8601 scheduled start time */
  scheduledAt: string | null
  /** The shareable meeting URL — null until backend is connected */
  meetingUrl: string | null
  /** Current status of the session */
  status: LiveSessionStatus
  /** User ID of whoever created the session */
  createdBy: string | null
  /** ISO-8601 creation timestamp */
  createdAt: string | null
}

export interface CreateLiveSessionInput {
  title: string
  description?: string
  provider: LiveSessionProvider
  scheduledAt: string
}

// ==============================================================================
// Development / pending-backend state types
// ==============================================================================

/** Represents the state of the Google Meet backend connection */
export type MeetBackendStatus =
  | 'not_configured' // Google Cloud credentials not yet set up
  | 'pending'        // Configuration in progress
  | 'connected'      // Fully operational

/** Used by UI components to distinguish what's possible at this phase */
export interface LiveFeatureFlags {
  backendStatus: MeetBackendStatus
  canCreateMeeting: boolean
  canJoinMeeting: boolean
}

export const LIVE_FEATURE_FLAGS: LiveFeatureFlags = {
  backendStatus: 'not_configured', // ← flip to 'connected' once backend is wired
  canCreateMeeting: false,         // ← will be true when Edge Function is deployed
  canJoinMeeting: false,           // ← will be true when meeting_url is real
}
