import React, { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { AppSidebar } from '@/components/nav/AppSidebar'
import { MobileNav } from '@/components/nav/MobileNav'
import { MobileBottomNav } from '@/components/nav/MobileBottomNav'
import { Topbar } from '@/components/nav/Topbar'
import { GlobalSearchModal } from '@/components/nav/GlobalSearchModal'
import { IndiaHeritageArtwork } from '@/components/ui/IndiaHeritageArtwork'

export const AppLayout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [searchModalOpen, setSearchModalOpen] = useState(false)

  // Global Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchModalOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0B0F17] text-slate-100 font-sans relative">
      {/* Decorative India Heritage Line-Art & Technical Grid Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Subtle technical dot grid */}
        <div
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage: 'radial-gradient(#475569 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Ambient atmospheric builder lighting */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-[#FF9900]/10 via-[#EC7211]/05 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 right-0 w-[500px] h-[300px] bg-gradient-to-t from-[#A855F7]/08 to-transparent blur-3xl pointer-events-none" />

        {/* India Heritage Landmark Watermark (India Gate, Taj Mahal, Qutub Minar) */}
        <IndiaHeritageArtwork className="absolute bottom-0 inset-x-0 h-44 text-slate-700" opacity={0.06} />
      </div>

      {/* Desktop Sidebar (hidden on mobile, visible md and up) */}
      <div className="hidden md:flex flex-shrink-0 z-20">
        <AppSidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
        />
      </div>

      {/* Mobile Navigation Drawer */}
      <MobileNav
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative z-10">
        <Topbar
          onOpenMobileNav={() => setMobileNavOpen(true)}
          onOpenSearch={() => setSearchModalOpen(true)}
        />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 pb-20 md:pb-8 scrollbar-thin">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>

        {/* Mobile Bottom Navigation Bar (visible < md) */}
        <MobileBottomNav
          onOpenDrawer={() => setMobileNavOpen(true)}
          onOpenSearch={() => setSearchModalOpen(true)}
        />
      </div>
    </div>
  )
}
