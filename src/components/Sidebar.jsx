import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, GitBranch, FileText,
  ShoppingCart, Package, Factory,
  Boxes, Truck, ShoppingBag, IndianRupee, ChevronLeft,
  Settings, Layers, ChevronDown, ClipboardList
} from 'lucide-react';
import { cn } from '../lib/utils';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Leads', path: '/leads', icon: GitBranch },
  { name: 'Customers', path: '/customers', icon: Users },
  { name: 'Products', path: '/products', icon: Package },
  { name: 'Quotations', path: '/quotations', icon: FileText },
  { name: 'Orders', path: '/orders', icon: ShoppingCart },
  { name: 'Jobcard', path: '/jobcard', icon: ClipboardList },
  { name: 'Production', path: '/production', icon: Factory },
  { name: 'Dispatch', path: '/dispatch', icon: Truck },
  {
    name: 'Other',
    icon: Layers,
    subItems: [
      { name: 'Inventory', path: '/inventory', icon: Boxes },
      { name: 'Purchase', path: '/purchase', icon: ShoppingBag },
      { name: 'Accounts', path: '/accounts', icon: IndianRupee },
    ]
  },
  { name: 'Settings', path: '/settings', icon: Settings },
];

import { useAuth } from '../contexts/AuthContext';

export default function Sidebar({ collapsed, setCollapsed, mobileMenuOpen, setMobileMenuOpen }) {
  const [openSubmenus, setOpenSubmenus] = useState({});
  const location = useLocation();
  const { currentUser } = useAuth();
  
  const isEmployee = currentUser?.profile?.designation === 'Employee';
  const visibleNavItems = navItems.filter(item => {
    if (item.name === 'Settings' && isEmployee) return false;
    return true;
  });

  const toggleSubmenu = (name) => {
    setOpenSubmenus(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  const handleLinkClick = () => {
    if (window.innerWidth < 768 && setMobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  };

  const isSubItemActive = (subItems) => {
    return subItems?.some(item => location.pathname === item.path);
  };

  return (
    <div className={cn(
      "h-screen bg-[#0F172A] border-r border-[#EA580C]/20 transition-all duration-300 flex flex-col shadow-[4px_0_24px_-4px_rgba(15,23,42,0.4)] relative z-10",
      collapsed ? "w-20" : "w-[260px]"
    )}>
      {/* Logo Area */}
      <div className="h-16 flex items-center justify-center border-b border-white/5 bg-[#0B1120]/50">
        <div className="flex items-center space-x-3 w-full px-6">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0 overflow-hidden p-0.5 shadow-[0_0_15px_rgba(232,163,61,0.2)] border border-[#EA580C]/30">
            <img src="/logo.png" alt="MG Logo" className="w-full h-full object-contain" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-[15px] leading-tight text-white whitespace-nowrap tracking-wide">Mukesh Graphics</span>
              <span className="text-[11px] text-[#94A3B8] font-medium whitespace-nowrap uppercase tracking-wider mt-0.5">Printing & Packaging</span>
            </div>
          )}
        </div>
      </div>

      {/* Nav Items */}
      <div className="flex-1 overflow-y-auto py-4 space-y-1.5 pr-2">
        {visibleNavItems.map((item) => {
          if (item.subItems) {
            const isOpen = openSubmenus[item.name];
            const isChildActive = isSubItemActive(item.subItems);
            return (
              <div key={item.name}>
                <button
                  onClick={() => {
                    if (collapsed) setCollapsed(false);
                    toggleSubmenu(item.name);
                  }}
                  className={cn(
                    "flex items-center w-full px-4 py-[12px] mx-4 rounded-xl transition-all duration-300 gap-4 group cursor-pointer max-w-[calc(100%-32px)]",
                    isChildActive && !isOpen
                      ? "bg-gradient-to-r from-[#F07E19]/20 to-[#F07E19]/5 border border-[#F07E19]/30 shadow-[inset_3px_0_0_0_#F07E19]"
                      : "hover:bg-white/5 border border-transparent"
                  )}
                >
                  <item.icon
                    className={cn(
                      "w-[22px] h-[22px] flex-shrink-0 transition-all duration-300",
                      isChildActive ? "text-[#E8A33D] drop-shadow-[0_0_8px_rgba(240,126,25,0.5)]" : "text-[#94A3B8] group-hover:text-white"
                    )}
                    strokeWidth={1.5}
                  />
                  {!collapsed && (
                    <>
                      <span className={cn(
                        "font-medium text-[14px] transition-colors flex-1 text-left",
                        isChildActive ? "text-white" : "text-[#CBD5E1] group-hover:text-white"
                      )}>
                        {item.name}
                      </span>
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 transition-all duration-300",
                          isOpen ? "rotate-180 text-white" : "text-[#64748B] group-hover:text-white"
                        )}
                      />
                    </>
                  )}
                </button>
                {!collapsed && isOpen && (
                  <div className="mt-1.5 space-y-1 mb-2">
                    {item.subItems.map((subItem) => (
                      <NavLink
                        key={subItem.name}
                        to={subItem.path}
                        onClick={handleLinkClick}
                        className={({ isActive }) => cn(
                          "flex items-center pl-[52px] pr-4 py-[10px] mx-4 rounded-xl transition-all duration-300 gap-3 group max-w-[calc(100%-32px)]",
                          isActive
                            ? "bg-gradient-to-r from-[#F07E19]/15 to-transparent text-[#E8A33D] shadow-[inset_2px_0_0_0_#F07E19]"
                            : "text-[#94A3B8] hover:bg-white/5 hover:text-white"
                        )}
                      >
                        {({ isActive }) => (
                          <>
                            {subItem.icon && (
                              <subItem.icon
                                className={cn(
                                  "w-[18px] h-[18px] flex-shrink-0 transition-all duration-300",
                                  isActive ? "text-[#E8A33D]" : "text-[#64748B] group-hover:text-white"
                                )}
                                strokeWidth={1.5}
                              />
                            )}
                            <span className="font-medium text-[13px]">{subItem.name}</span>
                          </>
                        )}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={handleLinkClick}
              className={({ isActive }) => cn(
                "flex items-center px-4 py-[12px] mx-4 rounded-xl transition-all duration-300 gap-4 group max-w-[calc(100%-32px)]",
                isActive
                  ? "bg-gradient-to-r from-[#F07E19]/20 to-[#F07E19]/5 border border-[#F07E19]/30 shadow-[inset_3px_0_0_0_#F07E19]"
                  : "hover:bg-white/5 border border-transparent"
              )}
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={cn(
                      "w-[22px] h-[22px] flex-shrink-0 transition-all duration-300",
                      isActive ? "text-[#EA580C] drop-shadow-[0_0_8px_rgba(240,126,25,0.5)]" : "text-[#94A3B8] group-hover:text-white"
                    )}
                    strokeWidth={1.5}
                  />
                  {!collapsed && (
                    <span className={cn(
                      "font-medium text-[14px] transition-colors",
                      isActive ? "text-white" : "text-[#CBD5E1] group-hover:text-white"
                    )}>
                      {item.name}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Collapse Toggle */}
      <div className="p-4 mb-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "flex items-center w-full px-4 py-3 rounded-xl transition-colors border border-transparent gap-4 group",
            "hover:bg-white/5"
          )}
        >
          <ChevronLeft className={cn(
            "w-[22px] h-[22px] flex-shrink-0 transition-all text-[#64748B] group-hover:text-white",
            collapsed ? "rotate-180 mx-auto" : ""
          )} strokeWidth={1.5} />
          {!collapsed && <span className="font-medium text-[14px] text-[#94A3B8] group-hover:text-white">Collapse Sidebar</span>}
        </button>
      </div>
    </div>
  );
}
