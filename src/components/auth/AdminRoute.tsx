import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { LoadingState } from '@/components/ui/LoadingState'

export const AdminRoute: React.FC = () => {
  const { user, profile, role, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen w-screen flex items-center justify-center bg-[#080B11]">
        <LoadingState message="Verifying administrative privileges..." />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Enforce strictly: only role === 'admin' can access admin routes.
  // Standard members attempting to access /admin/* are redirected to /dashboard.
  if (role !== 'admin' || profile?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
