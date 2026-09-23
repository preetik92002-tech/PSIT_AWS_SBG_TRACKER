import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext'
import type { UserCommunityItem, CommunityMemberRole } from '@/types/database'

const ACTIVE_COMMUNITY_STORAGE_KEY = 'aws_builder_active_community_id'

export interface CommunityContextType {
  userCommunities: UserCommunityItem[]
  activeCommunity: UserCommunityItem | null
  userRoleInActiveCommunity: CommunityMemberRole | null
  isManagerOfActiveCommunity: boolean
  isLoading: boolean
  setActiveCommunity: (community: UserCommunityItem | null) => void
  switchCommunityById: (communityId: string) => void
  refreshUserCommunities: () => Promise<UserCommunityItem[]>
}

const CommunityContext = createContext<CommunityContextType | undefined>(undefined)

export const CommunityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, role: platformRole } = useAuth()
  const [userCommunities, setUserCommunities] = useState<UserCommunityItem[]>([])
  const [activeCommunity, setActiveCommunityState] = useState<UserCommunityItem | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const refreshUserCommunities = useCallback(async (): Promise<UserCommunityItem[]> => {
    if (!user) {
      setUserCommunities([])
      setActiveCommunityState(null)
      setIsLoading(false)
      return []
    }

    try {
      setIsLoading(true)
      const { data, error } = await supabase.rpc('get_user_communities')

      if (error) {
        console.error('[CommunityContext] Error loading user communities:', error.message)
        setUserCommunities([])
        setActiveCommunityState(null)
        return []
      }

      const communities = (data as UserCommunityItem[]) || []
      setUserCommunities(communities)

      // Determine active community
      const savedActiveId = localStorage.getItem(ACTIVE_COMMUNITY_STORAGE_KEY)
      let resolvedActive: UserCommunityItem | null = null

      if (savedActiveId) {
        resolvedActive = communities.find((c) => c.id === savedActiveId) || null
      }

      // Default to the first available community if none matches or saved
      if (!resolvedActive && communities.length > 0) {
        resolvedActive = communities[0]
      }

      setActiveCommunityState(resolvedActive)
      if (resolvedActive) {
        localStorage.setItem(ACTIVE_COMMUNITY_STORAGE_KEY, resolvedActive.id)
      } else {
        localStorage.removeItem(ACTIVE_COMMUNITY_STORAGE_KEY)
      }

      return communities
    } catch (err) {
      console.error('[CommunityContext] Unexpected error:', err)
      return []
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    refreshUserCommunities()
  }, [refreshUserCommunities])

  const setActiveCommunity = useCallback((community: UserCommunityItem | null) => {
    setActiveCommunityState(community)
    if (community) {
      localStorage.setItem(ACTIVE_COMMUNITY_STORAGE_KEY, community.id)
    } else {
      localStorage.removeItem(ACTIVE_COMMUNITY_STORAGE_KEY)
    }
  }, [])

  const switchCommunityById = useCallback((communityId: string) => {
    const found = userCommunities.find((c) => c.id === communityId)
    if (found) {
      setActiveCommunity(found)
    }
  }, [userCommunities, setActiveCommunity])

  const userRoleInActiveCommunity: CommunityMemberRole | null = activeCommunity?.role ?? null
  
  // Platform admins also have manager authority across communities
  const isManagerOfActiveCommunity: boolean =
    platformRole === 'admin' || userRoleInActiveCommunity === 'manager'

  return (
    <CommunityContext.Provider
      value={{
        userCommunities,
        activeCommunity,
        userRoleInActiveCommunity,
        isManagerOfActiveCommunity,
        isLoading,
        setActiveCommunity,
        switchCommunityById,
        refreshUserCommunities,
      }}
    >
      {children}
    </CommunityContext.Provider>
  )
}

export const useCommunity = (): CommunityContextType => {
  const context = useContext(CommunityContext)
  if (!context) {
    throw new Error('useCommunity must be used within a CommunityProvider')
  }
  return context
}
