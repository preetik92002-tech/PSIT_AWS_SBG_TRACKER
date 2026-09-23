import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { AppSidebar } from '@/components/nav/AppSidebar'
import { MobileNav } from '@/components/nav/MobileNav'
import { Topbar } from '@/components/nav/Topbar'
import { IndiaHeritageArtwork } from '@/components/ui/IndiaHeritageArtwork'

export const AppLayout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F8FAFC] text-slate-800 font-sans relative">
      {/* Decorative India Heritage Line-Art & Geometric Grid Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Subtle geometric dot grid */}
        <div
          className="absolute inset-0 opacity-[0.25]"
          style={{
            backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Ambient warm lighting */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-amber-100/30 via-orange-50/15 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 right-0 w-[500px] h-[300px] bg-gradient-to-t from-sky-100/25 to-transparent blur-3xl pointer-events-none" />

        {/* India Heritage Landmark Watermark (India Gate, Taj Mahal, Qutub Minar) */}
        <IndiaHeritageArtwork className="absolute bottom-0 inset-x-0 h-44 text-slate-400" opacity={0.07} />
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

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative z-10">
        <Topbar onOpenMobileNav={() => setMobileNavOpen(true)} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 scrollbar-thin">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
