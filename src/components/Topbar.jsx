import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, Bell, Menu, LogOut, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Topbar({ onMenuClick }) {
  const { currentUser, logout } = useAuth();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  
  const name = currentUser?.displayName || currentUser?.profile?.name || 'Mukesh Patel';
  const designation = currentUser?.profile?.designation || 'Administrator';
  
  const handleLogout = async () => {
    try {
      await logout();
      setIsLogoutModalOpen(false);
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const getInitials = (nameStr) => {
    if (!nameStr) return '?';
    const parts = nameStr.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return nameStr.substring(0, 2).toUpperCase();
  };

  return (
    <>
      <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6">
        <div className="flex items-center flex-1 max-w-xl">
          {/* Hamburger Menu (Mobile Only) */}
          <button 
            onClick={onMenuClick}
            className="mr-4 text-gray-500 hover:text-gray-700 md:hidden focus:outline-none"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Search Bar */}
          <div className="relative flex-1 hidden sm:block">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-brand-accent focus:border-brand-accent sm:text-sm transition-colors"
              placeholder="Search orders, customers, invoices..."
            />
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center space-x-4 md:space-x-6">
          {/* Profile */}
          <div className="flex items-center space-x-3 border-l border-gray-200 pl-4 md:pl-6">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-gray-900 leading-none">{name}</div>
              <div className="text-xs text-gray-500 mt-1">{designation}</div>
            </div>
            <div className="h-9 w-9 rounded-full bg-brand-primary flex items-center justify-center text-white font-bold text-sm">
              {getInitials(name)}
            </div>
            <button 
              onClick={() => setIsLogoutModalOpen(true)}
              className="ml-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors flex items-center justify-center focus:outline-none"
              title="Log Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {isLogoutModalOpen && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) setIsLogoutModalOpen(false); }}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm overflow-hidden flex flex-col transform transition-all">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center text-gray-900 space-x-2">
                <LogOut className="w-5 h-5 text-gray-500" />
                <h2 className="text-lg font-bold">Confirm Logout</h2>
              </div>
              <button onClick={() => setIsLogoutModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 text-gray-600">
              Are you sure you want to log out of your account?
            </div>
            <div className="flex justify-end space-x-3 border-t border-gray-100 px-6 py-4 shrink-0 bg-gray-50">
              <button
                type="button"
                onClick={() => setIsLogoutModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
