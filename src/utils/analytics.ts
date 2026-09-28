// ==============================================================================
// AWS COMMUNITY MANAGER — ANALYTICS DISPATCHER
// ==============================================================================
// Prepares telemetry hooks for key user journeys.
// CRITICAL: NEVER pass passwords, tokens, or sensitive personal data.
// ==============================================================================

export type AnalyticsEventName =
  | 'landing_page_view'
  | 'hero_cta_clicked'
  | 'create_profile_clicked'
  | 'create_community_clicked'
  | 'join_community_clicked'
  | 'profile_story_viewed'
  | 'community_story_viewed'
  | 'learning_story_viewed'
  | 'build_story_viewed'
  | 'contribution_story_viewed'
  | 'events_story_viewed'
  | 'builder_world_opened'
  | 'community_live_opened'
  | 'google_meet_connect_clicked'
  | 'google_meet_created'
  | 'google_meet_joined_from_manager'
  | 'live_session_create_clicked'
  | 'signup_started'
  | 'signup_completed'

export interface AnalyticsPayload {
  [key: string]: string | number | boolean | null | undefined
}

export function trackEvent(name: AnalyticsEventName, payload?: AnalyticsPayload): void {
  try {
    const timestamp = new Date().toISOString()
    const sanitizedPayload = payload ? { ...payload } : {}

    // Security check: strip any accidental password/token fields
    delete sanitizedPayload.password
    delete sanitizedPayload.token
    delete sanitizedPayload.accessToken
    delete sanitizedPayload.secret

    if (import.meta.env.DEV) {
      console.log(`[Analytics] 📊 ${name}`, { timestamp, ...sanitizedPayload })
    }

    // Dispatch custom DOM event for potential global listeners
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('aws_builder_analytics', {
          detail: { event: name, timestamp, payload: sanitizedPayload },
        })
      )
    }
  } catch (err) {
    console.debug('[Analytics] Failed to track event:', err)
  }
}
