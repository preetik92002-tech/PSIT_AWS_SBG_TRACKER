import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { LoadingState } from '@/components/ui/LoadingState'

export const PublicOnlyRoute: React.FC = () => {
  const { user, role, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen w-screen flex items-center justify-center bg-[#080B11]">
        <LoadingState message="Checking session state..." />
      </div>
    )
  }

  if (user) {
    // Redirect authenticated users to appropriate dashboard
    const target = role === 'admin' ? '/admin/dashboard' : '/dashboard'
    return <Navigate to={target} replace />
  }

  return <Outlet />
}
