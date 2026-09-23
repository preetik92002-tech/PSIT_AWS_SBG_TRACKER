import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { CommunityProvider } from '@/context/CommunityContext'
import { AppLayout } from '@/layouts/AppLayout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AdminRoute } from '@/components/auth/AdminRoute'
import { PublicOnlyRoute } from '@/components/auth/PublicOnlyRoute'
import { Login } from '@/pages/Login'
import { ForgotPassword } from '@/pages/ForgotPassword'
import { ResetPassword } from '@/pages/ResetPassword'
import { VerifyEmail } from '@/pages/auth/VerifyEmail'
import { SetupProfile } from '@/pages/auth/SetupProfile'
import { CommunityDecision } from '@/pages/auth/CommunityDecision'
import { CreateCommunity } from '@/pages/auth/CreateCommunity'
import { JoinCommunity } from '@/pages/auth/JoinCommunity'
import { Dashboard } from '@/pages/Dashboard'
import { Profile } from '@/pages/Profile'
import { Members } from '@/pages/Members'
import { MemberProfile } from '@/pages/MemberProfile'
import { Tasks } from '@/pages/Tasks'
import { AssignTask } from '@/pages/AssignTask'
import { Leaderboard } from '@/pages/Leaderboard'
import { Events } from '@/pages/Events'
import { AddEvent } from '@/pages/AddEvent'
import { EventDetails } from '@/pages/EventDetails'
import { Projects } from '@/pages/Projects'
import { AdminDashboard } from '@/pages/AdminDashboard'
import { AdminMembers } from '@/pages/AdminMembers'
import { BuilderWorldPage } from '@/pages/BuilderWorldPage'

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CommunityProvider>
          <Routes>
            {/* Guest / Public-Only Routes (redirects to dashboard if already authenticated) */}
            <Route element={<PublicOnlyRoute />}>
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
            </Route>

            {/* Email Verification (Step 2) */}
            <Route path="/auth/verify-email" element={<VerifyEmail />} />

            {/* Password Recovery Route (accessible via Supabase recovery email token) */}
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Standalone Onboarding Routes (Requires valid session) */}
            <Route element={<ProtectedRoute />}>
              <Route path="/auth/setup-profile" element={<SetupProfile />} />
              <Route path="/auth/community-decision" element={<CommunityDecision />} />
              <Route path="/auth/community-usage" element={<CommunityDecision />} />
              <Route path="/auth/join-community" element={<JoinCommunity />} />
              <Route path="/auth/create-community" element={<CreateCommunity />} />
            </Route>

            {/* Main Authenticated Application (uses AppLayout with persistent Sidebar & Topbar) */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="members" element={<Members />} />
                <Route path="members/:id" element={<MemberProfile />} />
                <Route path="tasks" element={<Tasks />} />
                <Route path="tasks/assign" element={<AssignTask />} />
                <Route path="leaderboard" element={<Leaderboard />} />
                <Route path="events" element={<Events />} />
                <Route path="events/new" element={<AddEvent />} />
                <Route path="events/:id" element={<EventDetails />} />
                <Route path="projects" element={<Projects />} />
                <Route path="profile" element={<Profile />} />
                <Route path="builder-world" element={<BuilderWorldPage />} />

                {/* Legacy redirect for bookmark compatibility */}
                <Route path="admin/members" element={<Navigate to="/members" replace />} />

                {/* Platform Admin Console */}
                <Route element={<AdminRoute />}>
                  <Route path="admin/dashboard" element={<AdminDashboard />} />
                </Route>
              </Route>
            </Route>

            {/* Catch-all fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </CommunityProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
