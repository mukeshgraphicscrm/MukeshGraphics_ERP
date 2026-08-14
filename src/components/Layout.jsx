import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { cn } from '../lib/utils'; // Make sure to import cn for dynamic margin

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 font-sans relative">
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden" 
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Fixed Sidebar wrapper */}
      <div className={cn(
        "fixed top-0 left-0 h-screen z-50 transition-transform duration-300 md:translate-x-0",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <Sidebar 
          collapsed={collapsed} 
          setCollapsed={setCollapsed} 
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
        />
      </div>

      {/* Main Content wrapper with dynamic left margin */}
      <div className={cn(
        "flex flex-col min-h-screen transition-all duration-300",
        collapsed ? "md:ml-20" : "md:ml-64"
      )}>
        <Topbar onMenuClick={() => setMobileMenuOpen(true)} />

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-6 w-full max-w-full overflow-hidden">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
