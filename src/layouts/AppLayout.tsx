import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { AppSidebar } from '@/components/nav/AppSidebar'
import { MobileNav } from '@/components/nav/MobileNav'
import { Topbar } from '@/components/nav/Topbar'

export const AppLayout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#080B11] text-slate-100 font-sans">
      {/* Desktop Sidebar (hidden on mobile, visible md and up) */}
      <div className="hidden md:flex flex-shrink-0">
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
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar onOpenMobileNav={() => setMobileNavOpen(true)} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 scrollbar-thin">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
