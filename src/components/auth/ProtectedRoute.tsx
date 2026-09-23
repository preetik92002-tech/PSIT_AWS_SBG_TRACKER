import React from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'

export const ProtectedRoute: React.FC = () => {
  const { user, isLoading, profileMissing, signOut } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen w-screen flex items-center justify-center bg-[#080B11]">
        <LoadingState message="Verifying authentication session..." />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (profileMissing) {
    return (
      <div className="min-h-screen w-screen flex items-center justify-center p-4 bg-[#080B11]">
        <div className="max-w-md w-full">
          <ErrorState
            title="Profile Record Missing"
            message="Your account authentication credentials are valid, but no matching profile record was found in the database. Please contact an administrator or sign out."
            code="ERR_AUTH_PROFILE_NOT_FOUND"
            onRetry={signOut}
          />
        </div>
      </div>
    )
  }

  return <Outlet />
}
