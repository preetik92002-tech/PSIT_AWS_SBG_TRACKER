import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  ChevronDown,
  Plus,
  KeyRound,
  Check,
  Building,
} from 'lucide-react'
import { useCommunity } from '@/context/CommunityContext'

export const CommunitySelector: React.FC = () => {
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
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 shadow-xs transition-all text-left group cursor-pointer"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="w-6 h-6 rounded-md bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[#EA580C] flex-shrink-0">
          <Users size={13} />
        </div>

        <div className="min-w-0 max-w-[160px] sm:max-w-[220px]">
          {isLoading ? (
            <span className="text-xs text-slate-400 font-mono">Loading...</span>
          ) : activeCommunity ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-900 truncate group-hover:text-[#EA580C] transition-colors">
                {activeCommunity.name}
              </span>
              <span
                className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold uppercase tracking-wider flex-shrink-0 ${
                  activeCommunity.role === 'manager'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {activeCommunity.role}
              </span>
            </div>
          ) : (
            <span className="text-xs font-medium text-slate-500 italic">
              Select / Join Community
            </span>
          )}
          {activeCommunity?.institution_name && (
            <span className="block text-[10px] text-slate-500 truncate -mt-0.5">
              {activeCommunity.institution_name}
            </span>
          )}
        </div>

        <ChevronDown
          size={13}
          className={`text-slate-400 group-hover:text-slate-600 transition-transform flex-shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 sm:w-80 rounded-xl border border-slate-200 bg-white shadow-2xl py-2 z-50 animate-slide-up text-slate-800">
          {/* Header */}
          <div className="px-3.5 py-2 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
              My Communities ({userCommunities.length})
            </span>
            <span className="text-[10px] font-mono text-[#EA580C] bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200">
              Multi-Community
            </span>
          </div>

          {/* Communities List */}
          <div className="max-h-56 overflow-y-auto py-1 scrollbar-thin">
            {userCommunities.length === 0 ? (
              <div className="px-4 py-4 text-center">
                <p className="text-xs text-slate-600 font-medium mb-3">
                  You&apos;re not part of a community yet.
                </p>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false)
                      navigate('/auth/create-community')
                    }}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#FF9900] hover:bg-[#EA580C] transition-colors shadow-xs"
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
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
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
                        ? 'bg-amber-50/70 text-slate-900 border-l-2 border-[#FF9900]'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold truncate text-slate-900">
                          {comm.name}
                        </span>
                        <span
                          className={`text-[9px] font-mono px-1 py-0.1 rounded font-semibold uppercase tracking-wider ${
                            isManager
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {comm.role}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                        <span className="text-slate-600 font-mono">[{comm.short_name}]</span>
                        {comm.institution_name && <span>· {comm.institution_name}</span>}
                        {comm.city && <span>· {comm.city}</span>}
                      </div>
                    </div>

                    {isSelected && (
                      <Check size={14} className="text-[#EA580C] flex-shrink-0" />
                    )}
                  </button>
                )
              })
            )}
          </div>

          {/* Action Shortcuts (when user already has communities) */}
          {userCommunities.length > 0 && (
            <div className="pt-1.5 mt-1 border-t border-slate-100 px-2 space-y-1">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false)
                  navigate('/auth/create-community')
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors"
              >
                <div className="w-5 h-5 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[#EA580C]">
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
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors"
              >
                <div className="w-5 h-5 rounded bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-600">
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
