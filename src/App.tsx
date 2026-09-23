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
              <Route path="/auth/join-community" element={<JoinCommunity />} />
              <Route path="/auth/create-community" element={<CreateCommunity />} />
            </Route>

          {/* Main Authenticated Application Dashboard (uses AppLayout with Sidebar & Topbar) */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="profile" element={<Profile />} />
              <Route path="builder-world" element={<BuilderWorldPage />} />

              {/* Admin Console (Restricted strictly to role = 'admin') */}
              <Route element={<AdminRoute />}>
                <Route path="admin/dashboard" element={<AdminDashboard />} />
                <Route path="admin/members" element={<AdminMembers />} />
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
