import React from 'react';
import { Bell, CheckCircle, Clock, Trash2 } from 'lucide-react';
import api from '../lib/api';
import { useData } from '../contexts/DataContext';

export default function NotificationsDropdown({ isOpen, onClose }) {
  const { notifications, setNotifications } = useData();

  if (!isOpen) return null;

  const handleMarkAsRead = async (e, notification) => {
    e.stopPropagation();
    if (notification.read) return;

    try {
      // Optimistic update
      setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n));
      await api.put(`/notifications/${notification.id}`, { read: true });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      // Revert optimistic update
      setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: false } : n));
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      // Optimistic update
      setNotifications(prev => prev.filter(n => n.id !== id));
      await api.delete(`/notifications/${id}`);
    } catch (error) {
      console.error('Failed to delete notification:', error);
      // In a real scenario we might revert or refetch, but typically optimistic is enough here
      const { refetch } = useData();
      if (refetch) refetch();
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      <div className="fixed left-4 right-4 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-80 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden sm:origin-top-right">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/80">
          <h3 className="font-semibold text-gray-900">Notifications</h3>
          {unreadCount > 0 && (
            <span className="bg-brand-accent/10 text-brand-accent text-xs font-medium px-2 py-0.5 rounded-full">
              {unreadCount} New
            </span>
          )}
        </div>

        <div className="max-h-[235px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">You have no notifications.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .map(notification => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 transition-colors relative group cursor-pointer ${!notification.read ? 'bg-blue-50/30' : ''}`}
                    onClick={(e) => handleMarkAsRead(e, notification)}
                  >
                    {!notification.read && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-accent rounded-r" />
                    )}
                    <div className="flex justify-between items-start">
                      <div className="pr-4">
                        <h4 className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                          {notification.title}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center text-xs text-gray-400 mt-2">
                          <Clock className="w-3 h-3 mr-1" />
                          {new Date(notification.createdAt).toLocaleDateString()} at {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {!notification.read && (
                          <button
                            onClick={(e) => handleMarkAsRead(e, notification)}
                            className="text-gray-400 hover:text-brand-accent opacity-0 group-hover:opacity-100 transition-opacity p-1"
                            title="Mark as read"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDelete(e, notification.id)}
                          className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                          title="Delete notification"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
