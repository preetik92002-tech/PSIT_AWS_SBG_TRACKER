import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LucideIcon,
  Search,
  X,
  Users,
  CheckSquare,
  Calendar,
  FolderGit2,
  ArrowRight,
  ExternalLink,
  Command,
  Building2,
  Sparkles,
} from 'lucide-react'
import { BuilderAvatar } from '@/components/ui/BuilderAvatar'
import { useCommunity } from '@/context/CommunityContext'
import {
  searchCommunityResources,
  GlobalSearchResult,
  SearchResultType,
} from '@/lib/globalSearch'

export interface GlobalSearchModalProps {
  isOpen: boolean
  onClose: () => void
}

const CATEGORY_TABS: Array<{ id: 'all' | SearchResultType; label: string; icon: LucideIcon }> = [
  { id: 'all', label: 'All Results', icon: Search },
  { id: 'member', label: 'Members', icon: Users },
  { id: 'task', label: 'Tasks', icon: CheckSquare },
  { id: 'event', label: 'Events', icon: Calendar },
  { id: 'project', label: 'Projects', icon: FolderGit2 },
]

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate()
  const { activeCommunity, isManagerOfActiveCommunity } = useCommunity()

  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<'all' | SearchResultType>('all')
  const [results, setResults] = useState<GlobalSearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setSelectedIndex(0)
    } else {
      setQuery('')
      setResults([])
    }
  }, [isOpen])

  // Perform search with debounce
  useEffect(() => {
    if (!isOpen || !activeCommunity?.id) return

    const trimmed = query.trim()
    if (!trimmed) {
      setResults([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    const timer = setTimeout(async () => {
      try {
        const found = await searchCommunityResources(
          activeCommunity.id,
          trimmed,
          activeCommunity.name,
          isManagerOfActiveCommunity
        )
        setResults(found)
        setSelectedIndex(0)
      } finally {
        setIsLoading(false)
      }
    }, 180)

    return () => clearTimeout(timer)
  }, [query, isOpen, activeCommunity, isManagerOfActiveCommunity])

  // Filtered results
  const filteredResults = activeCategory === 'all'
    ? results
    : results.filter((r) => r.type === activeCategory)

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (filteredResults.length > 0 ? (prev + 1) % filteredResults.length : 0))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) =>
          filteredResults.length > 0 ? (prev - 1 + filteredResults.length) % filteredResults.length : 0
        )
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filteredResults[selectedIndex]) {
          const item = filteredResults[selectedIndex]
          onClose()
          navigate(item.url)
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    },
    [filteredResults, selectedIndex, onClose, navigate]
  )

  if (!isOpen) return null

  const getTypeIcon = (type: SearchResultType) => {
    switch (type) {
      case 'member':
        return <Users size={12} className="text-amber-400" />
      case 'task':
        return <CheckSquare size={12} className="text-emerald-400" />
      case 'event':
        return <Calendar size={12} className="text-sky-400" />
      case 'project':
        return <FolderGit2 size={12} className="text-indigo-400" />
    }
  }

  const getTypeBadgeClass = (type: SearchResultType) => {
    switch (type) {
      case 'member':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30'
      case 'task':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
      case 'event':
        return 'bg-sky-500/15 text-sky-300 border-sky-500/30'
      case 'project':
        return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-live-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#0E141F] border border-[#232F42] rounded-2xl shadow-2xl overflow-hidden font-mono text-left flex flex-col max-h-[85vh] animate-slide-up"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-[#1E2736] bg-[#121824]">
          <Search size={16} className="text-[#FF9900] shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search members, tasks, events, and projects..."
            className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none font-mono"
          />

          {isLoading ? (
            <div className="w-4 h-4 border-2 border-[#FF9900] border-t-transparent rounded-full animate-spin shrink-0 ml-2" />
          ) : query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 rounded text-slate-500 hover:text-white shrink-0 ml-2"
            >
              <X size={14} />
            </button>
          ) : (
            <div className="hidden sm:flex items-center gap-1 text-[10px] text-slate-500 bg-[#0E141F] px-2 py-0.5 rounded border border-[#1E2736]">
              <span>ESC to exit</span>
            </div>
          )}
        </div>

        {/* Category Filters */}
        <div className="px-4 py-2 bg-[#0E141F] border-b border-[#1E2736] flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {CATEGORY_TABS.map((tab) => {
            const Icon = tab.icon
            const isTabActive = activeCategory === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveCategory(tab.id)
                  setSelectedIndex(0)
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors flex items-center gap-1.5 shrink-0 ${
                  isTabActive
                    ? 'bg-[#FF9900]/20 text-[#FF9900] border border-[#FF9900]/40 font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-[#1A2234]'
                }`}
              >
                <Icon size={12} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#1E2736]/60 p-2 scrollbar-thin">
          {!query.trim() ? (
            <div className="py-12 px-6 text-center text-slate-400 space-y-2">
              <div className="w-10 h-10 rounded-full bg-[#1A2234] border border-[#2D3A50] flex items-center justify-center mx-auto text-[#FF9900]">
                <Search size={18} />
              </div>
              <p className="text-xs font-semibold text-slate-300">
                Search community resources
              </p>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto font-sans">
                Quickly locate registered chapter builders, assigned tasks, scheduled meetups, and open cloud projects.
              </p>
            </div>
          ) : filteredResults.length === 0 && !isLoading ? (
            <div className="py-12 px-6 text-center text-slate-400 space-y-2">
              <div className="w-10 h-10 rounded-full bg-[#1A2234] border border-[#2D3A50] flex items-center justify-center mx-auto text-slate-500">
                <X size={18} />
              </div>
              <p className="text-xs font-semibold text-slate-300">
                No matching results found for "{query}"
              </p>
              <p className="text-[11px] text-slate-500 font-sans">
                Try searching for a builder name, AWS topic, event location, or technology stack.
              </p>
            </div>
          ) : (
            filteredResults.map((item, idx) => {
              const isSelected = idx === selectedIndex

              return (
                <div
                  key={`${item.type}-${item.id}`}
                  onClick={() => {
                    onClose()
                    navigate(item.url)
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-3 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-[#182232] border border-[#FF9900]/40 shadow-xs'
                      : 'hover:bg-[#121824] border border-transparent'
                  }`}
                >
                  {/* Left: Avatar / Visual Token + Content */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Visual Media Token */}
                    <div className="shrink-0">
                      {item.type === 'member' ? (
                        <BuilderAvatar
                          src={item.imageUrl}
                          name={item.title}
                          alias={item.subtitle.startsWith('@') ? item.subtitle.slice(1) : undefined}
                          size="md"
                        />
                      ) : item.type === 'event' ? (
                        <div className="w-10 h-10 rounded-xl bg-sky-950/50 border border-sky-800/60 flex items-center justify-center text-sky-400">
                          <Calendar size={18} />
                        </div>
                      ) : item.type === 'project' ? (
                        <div className="w-10 h-10 rounded-xl bg-indigo-950/50 border border-indigo-800/60 flex items-center justify-center text-indigo-400">
                          <FolderGit2 size={18} />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-emerald-950/50 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
                          <CheckSquare size={18} />
                        </div>
                      )}
                    </div>

                    {/* Titles and Subtitles */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.2 rounded border uppercase font-bold flex items-center gap-1 ${getTypeBadgeClass(
                            item.type
                          )}`}
                        >
                          {getTypeIcon(item.type)}
                          <span>{item.type}</span>
                        </span>

                        <span className="font-mono font-bold text-xs text-white truncate">
                          {item.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 mt-0.5 truncate">
                        <span className="truncate">{item.subtitle}</span>
                        {item.metadata.detail && (
                          <>
                            <span className="text-slate-600">•</span>
                            <span className="text-slate-500 truncate">{item.metadata.detail}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Community + Metadata Badge */}
                  <div className="flex items-center gap-2 shrink-0">
                    {item.metadata.badge && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">
                        {item.metadata.badge}
                      </span>
                    )}

                    <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-slate-500">
                      <Building2 size={10} className="text-[#FF9900]" />
                      <span className="truncate max-w-[100px]">{item.communityName}</span>
                    </div>

                    <ArrowRight
                      size={14}
                      className={`transition-transform ${
                        isSelected ? 'text-[#FF9900] translate-x-0.5' : 'text-slate-600'
                      }`}
                    />
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-[#0A0E17] border-t border-[#1E2736] flex items-center justify-between text-[10px] font-mono text-slate-500">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>

          <div className="flex items-center gap-1 text-slate-400">
            <Building2 size={11} className="text-[#FF9900]" />
            <span>{activeCommunity?.name}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
