import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { Login } from '@/pages/Login'
import { Dashboard } from '@/pages/Dashboard'
import { Profile } from '@/pages/Profile'
import { AdminDashboard } from '@/pages/AdminDashboard'
import { AdminMembers } from '@/pages/AdminMembers'
import { BuilderWorldPage } from '@/pages/BuilderWorldPage'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Authentication Route */}
        <Route path="/login" element={<Login />} />

        {/* Protected App Shell Layout (Frontend-only in Level 1) */}
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="profile" element={<Profile />} />
          <Route path="admin/dashboard" element={<AdminDashboard />} />
          <Route path="admin/members" element={<AdminMembers />} />

          {/* Preserved Builder World Interactive View */}
          <Route path="builder-world" element={<BuilderWorldPage />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
