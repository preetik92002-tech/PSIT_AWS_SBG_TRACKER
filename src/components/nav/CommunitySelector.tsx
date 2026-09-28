import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  ChevronDown,
  Plus,
  KeyRound,
  Check,
  Building2,
} from 'lucide-react'
import { useCommunity } from '@/context/CommunityContext'
import { CommunityImage } from '@/components/ui/CommunityImage'

export interface CommunitySelectorProps {
  compact?: boolean
  className?: string
}

export const CommunitySelector: React.FC<CommunitySelectorProps> = ({
  compact = false,
  className = '',
}) => {
  const navigate = useNavigate()
  const {
    userCommunities,
    activeCommunity,
    setActiveCommunity,
    isLoading,
  } = useCommunity()

  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-2 rounded-lg bg-[#131923] hover:bg-[#18202E] border border-[#222E3E] hover:border-slate-600 transition-all text-left group cursor-pointer ${
          compact ? 'px-2 py-1' : 'px-2.5 py-1.5'
        }`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <CommunityImage
          src={activeCommunity?.logo_url}
          name={activeCommunity?.name}
          shortName={activeCommunity?.short_name}
          size="xs"
        />

        <div className={`min-w-0 ${compact ? 'max-w-[110px] sm:max-w-[140px]' : 'max-w-[160px] md:max-w-[220px] lg:max-w-[280px]'}`}>
          {isLoading ? (
            <span className="text-xs text-slate-400 font-mono">Loading...</span>
          ) : activeCommunity ? (
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-white truncate group-hover:text-[#FF9900] transition-colors leading-tight">
                  {activeCommunity.name}
                </span>
                {!compact && (
                  <span
                    className={`text-[9px] font-mono px-1 py-0.2 rounded font-semibold uppercase tracking-wider flex-shrink-0 ${
                      activeCommunity.role === 'manager'
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {activeCommunity.role === 'manager' ? '👑 Head' : 'Member'}
                  </span>
                )}
              </div>
              {!compact && activeCommunity.institution_name && (
                <span className="block text-[10px] font-mono text-slate-400 truncate -mt-0.5">
                  {activeCommunity.institution_name}
                </span>
              )}
            </div>
          ) : (
            <span className="text-xs font-medium text-slate-400 italic">
              Select Community
            </span>
          )}
        </div>

        <ChevronDown
          size={12}
          className={`text-slate-400 group-hover:text-slate-200 transition-transform flex-shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 sm:w-80 rounded-xl border border-[#232F40] bg-[#131924] shadow-2xl py-2 z-50 animate-slide-up text-slate-200">
          {/* Header */}
          <div className="px-3.5 py-2 border-b border-[#1E2736] flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
              My Communities ({userCommunities.length})
            </span>
            <span className="text-[10px] font-mono text-[#FF9900] bg-[#FF9900]/10 px-1.5 py-0.5 rounded border border-[#FF9900]/30">
              Multi-Community
            </span>
          </div>

          {/* Communities List */}
          <div className="max-h-56 overflow-y-auto py-1 scrollbar-thin">
            {userCommunities.length === 0 ? (
              <div className="px-4 py-4 text-center">
                <p className="text-xs text-slate-400 font-medium mb-3">
                  You&apos;re not part of a community yet.
                </p>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false)
                      navigate('/auth/create-community')
                    }}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-950 bg-[#FF9900] hover:bg-[#EC7211] transition-colors shadow-xs"
                  >
                    <Plus size={12} />
                    <span>Create a community</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false)
                      navigate('/auth/join-community')
                    }}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-200 bg-[#18202E] hover:bg-[#202B3D] border border-slate-700/60 transition-colors"
                  >
                    <KeyRound size={12} />
                    <span>Join a community</span>
                  </button>
                </div>
              </div>
            ) : (
              userCommunities.map((comm) => {
                const isSelected = activeCommunity?.id === comm.id
                const isManager = comm.role === 'manager'
                return (
                  <button
                    key={comm.id}
                    type="button"
                    onClick={() => {
                      setActiveCommunity(comm)
                      setIsOpen(false)
                    }}
                    className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-2.5 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#18202E] text-white border-l-2 border-[#FF9900]'
                        : 'hover:bg-[#18202E]/60 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <CommunityImage
                        src={comm.logo_url}
                        name={comm.name}
                        shortName={comm.short_name}
                        size="xs"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold truncate text-white">
                            {comm.name}
                          </span>
                          <span
                            className={`text-[9px] font-mono px-1 py-0.1 rounded font-semibold uppercase tracking-wider ${
                              isManager
                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}
                          >
                            {comm.role}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                          <span className="text-slate-500 font-mono">[{comm.short_name}]</span>
                          {comm.institution_name && <span>· {comm.institution_name}</span>}
                          {comm.city && <span>· {comm.city}</span>}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <Check size={14} className="text-[#FF9900] flex-shrink-0" />
                    )}
                  </button>
                )
              })
            )}
          </div>

          {/* Action Shortcuts (when user already has communities) */}
          {userCommunities.length > 0 && (
            <div className="pt-1.5 mt-1 border-t border-[#1E2736] px-2 space-y-1">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false)
                  navigate('/auth/create-community')
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-[#18202E] transition-colors"
              >
                <div className="w-5 h-5 rounded bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-[#FF9900]">
                  <Plus size={11} />
                </div>
                <span>Create a community</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false)
                  navigate('/auth/join-community')
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-[#18202E] transition-colors"
              >
                <div className="w-5 h-5 rounded bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <KeyRound size={11} />
                </div>
                <span>Join a community</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
