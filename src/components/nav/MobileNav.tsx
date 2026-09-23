import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import { AppSidebar } from './AppSidebar'

export interface MobileNavProps {
  isOpen: boolean
  onClose: () => void
}

export const MobileNav: React.FC<MobileNavProps> = ({ isOpen, onClose }) => {
  // Prevent background scroll when mobile drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 md:hidden flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="relative flex flex-col w-72 max-w-[85vw] h-full bg-[#0B0F17] border-r border-slate-800 shadow-2xl z-10 animate-slide-right">
        {/* Mobile close button header */}
        <div className="absolute top-3.5 right-3 z-20">
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-750 transition-colors"
            aria-label="Close navigation"
          >
            <X size={15} />
          </button>
        </div>

        <div className="h-full flex-1">
          <AppSidebar
            collapsed={false}
            onToggleCollapse={onClose}
            onItemClick={onClose}
          />
        </div>
      </div>
    </div>
  )
}
