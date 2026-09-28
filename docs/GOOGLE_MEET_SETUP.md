# Real Google Meet Integration — Setup & Deployment Guide

This guide details the end-to-end setup for the official **Google Meet Integration** in **AWS Community Manager**.

This integration uses the official **Google Meet REST API v2** (`meet.googleapis.com/v2/spaces` and `v2/conferenceRecords`) paired with **Supabase Edge Functions** and PostgreSQL database tables.

---

## Architecture & Security Highlights

1. **No Fake URLs / No Scraping**: Meeting links are real spaces generated via `POST https://meet.googleapis.com/v2/spaces` returning real `https://meet.google.com/xxx-xxxx-xxx` URIs.
2. **Zero Client-Side Secrets**: Google OAuth `client_secret`, `access_token`, and `refresh_token` are **never** exposed to frontend JavaScript or `VITE_*` environment variables.
3. **Cryptographically Secure State Nonce**: OAuth authorization requests generate a 256-bit cryptographically secure single-use state token stored in `public.google_oauth_states` with a 10-minute expiry to prevent CSRF and replay attacks.
4. **Token Refreshing**: The backend automatically refreshes expired access tokens using the stored refresh token when creating or syncing spaces.
5. **Decoupled Attendance & Points**: Participant duration is tracked via `meet.googleapis.com/v2/conferenceRecords/{id}/participants`. Attendance records verify member participation; points are not automatically awarded, giving chapter managers intentional discretion.

---

## Step 1: Google Cloud Console Setup

1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new Google Cloud Project (e.g. `aws-community-manager`).
3. Navigate to **APIs & Services** > **Library**.
4. Search for and enable:
   - **Google Meet API** (`meet.googleapis.com`)
   - **Google People API** or **Google Identity** (for profile information)

---

## Step 2: Configure OAuth Consent Screen

1. In Google Cloud Console, navigate to **APIs & Services** > **OAuth consent screen**.
2. Select **User Type**:
   - **Internal** (if restricted to your Google Workspace organization / university domain)
   - **External** (if community members or managers use diverse Google accounts)
3. Fill in required App details:
   - **App Name**: `AWS Community Manager`
   - **User support email**: Your administrator email
   - **Developer contact information**: Your contact email
4. Click **Save and Continue** to navigate to **Scopes**.
5. Click **Add or Remove Scopes** and add the following:
   - `https://www.googleapis.com/auth/meetings.space.created` (Create Google Meet spaces)
   - `https://www.googleapis.com/auth/meetings.space.readonly` (Read spaces and conference records)
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
6. Click **Save and Continue**. If in "Testing" publishing status, add manager email accounts as test users.

---

## Step 3: Create OAuth 2.0 Credentials

1. Navigate to **APIs & Services** > **Credentials**.
2. Click **Create Credentials** > **OAuth client ID**.
3. Select Application type: **Web application**.
4. Set **Name**: `AWS Community Manager Web Client`.
5. Under **Authorized redirect URIs**, add:
   ```
   https://<your-supabase-project-id>.supabase.co/functions/v1/google-oauth-callback
   ```
   *(For local testing with Supabase CLI: `http://localhost:54321/functions/v1/google-oauth-callback`)*
6. Click **Create**.
7. Copy and securely store:
   - **Client ID** (e.g. `123456789-abc.apps.googleusercontent.com`)
   - **Client Secret** (e.g. `GOCSPX-xxxxxx`)

---

## Step 4: Apply Database Migration

Run the database migration to create all required tables, RLS policies, and SECURITY DEFINER RPC functions:

```bash
supabase db push
# OR apply supabase/migrations/20260927000014_google_meet_integration.sql directly via Supabase SQL Editor
```

### Tables Created:
- `public.google_connections` (Locked to `service_role`; holds encrypted access & refresh tokens)
- `public.google_oauth_states` (Single-use CSRF tokens with 10-minute TTL)
- `public.google_meet_spaces` (Community-scoped spaces with live statuses)
- `public.google_meet_conferences` (Active and ended conference records)
- `public.google_meet_participants` (Synchronized participant durations)
- `public.google_meet_artifacts` (References to recordings and transcripts)

### Safe RPC Functions:
- `get_community_google_connection(p_community_id UUID)`: Safe connection status check without exposing tokens.
- `disconnect_community_google(p_community_id UUID)`: Safely revokes and deletes stored community tokens.

---

## Step 5: Configure Supabase Edge Function Secrets

Set the following secrets in your Supabase project using the Supabase CLI or Dashboard (**Project Settings** > **Edge Functions** > **Secrets**):

```bash
supabase secrets set GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
supabase secrets set GOOGLE_CLIENT_SECRET="your-client-secret"
supabase secrets set GOOGLE_REDIRECT_URI="https://<your-supabase-project-id>.supabase.co/functions/v1/google-oauth-callback"
```

*(Note: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically inside Supabase Edge Function environments).*

---

## Step 6: Deploy Edge Functions

Deploy all five Google Meet integration Edge Functions using the Supabase CLI:

```bash
supabase functions deploy google-oauth-start
supabase functions deploy google-oauth-callback
supabase functions deploy google-meet-create
supabase functions deploy google-meet-sync
supabase functions deploy google-meet-end
```

---

## Step 7: Verification & Usage Workflow

1. **Connect Google Account**:
   - Navigate to **Events** or **Dashboard**.
   - Community Managers will see the **Google Meet Integration** card.
   - Click **[ CONNECT GOOGLE → ]**.
   - Authenticate with your Google account and approve the Meet permissions.
   - You will be redirected back with status `CONNECTED`.

2. **Create a Google Meet Space**:
   - In **Events** or on any specific **Event Details** page, click **[ Live Meet ]** or **[ Create Google Meet ]**.
   - Specify meeting title (optionally attached to an event).
   - Click **Generate Google Meet**.
   - An authentic `https://meet.google.com/xxx-xxxx-xxx` room is provisioned and saved.

3. **Conduct Session & Sync Telemetry**:
   - Start the meeting and host the session.
   - Open **[ Manage Google Meet ]** from Event Details.
   - Click **[ Sync Google API ]** to retrieve live status, active conference records, and participant join/leave times.
   - Eligible attendees (>= 15 minutes) can be marked as attended for the event.
