import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import api from '../lib/api';
import { Calendar, User, History, Search, ClipboardList } from 'lucide-react';
import { cn } from '../lib/utils';

export default function DailyWork() {
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [selectedUser, setSelectedUser] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch Users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get('/users');
        const filteredUsers = res.data.filter(u => !u.designation?.toLowerCase().includes('admin'));
        setUsers(filteredUsers);
      } catch (err) {
        console.error('Error fetching users:', err);
      }
    };
    fetchUsers();
  }, []);

  // Fetch Logs based on Date
  useEffect(() => {
    setLoading(true);
    
    // Create Date objects for start and end of selected date
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const q = query(
      collection(db, 'logs'),
      where('createdAt', '>=', startOfDay.toISOString()),
      where('createdAt', '<=', endOfDay.toISOString()),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLogs(logsData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching daily logs:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedDate]);

  const getActionColor = (action) => {
    switch (action?.toLowerCase()) {
      case 'create': return 'text-emerald-600 bg-emerald-50 ring-emerald-500/20';
      case 'update': return 'text-blue-600 bg-blue-50 ring-blue-500/20';
      case 'delete': return 'text-red-600 bg-red-50 ring-red-500/20';
      default: return 'text-gray-600 bg-gray-50 ring-gray-500/20';
    }
  };

  // Filter logs based on user, search term, and exclude admins/notifications
  const filteredLogs = logs.filter(log => {
    // Exclude logs from administrators and notification module
    if (log.userRole?.toLowerCase().includes('admin')) return false;
    if (log.module === 'notifications') return false;

    const matchesUser = selectedUser === 'All' || log.userName === selectedUser;
    const searchString = `${log.module} ${log.action} ${log.details}`.toLowerCase();
    const matchesSearch = searchString.includes(searchTerm.toLowerCase());
    return matchesUser && matchesSearch;
  });

  // Group logs by userName
  const groupedLogs = filteredLogs.reduce((acc, log) => {
    const user = log.userName || 'Unknown User';
    if (!acc[user]) {
      acc[user] = [];
    }
    acc[user].push(log);
    return acc;
  }, {});

  const renderFullDetails = (details) => {
    if (!details || typeof details !== 'object') return null;
    
    const formatValue = (v) => {
      if (v === null || v === undefined || v === '') return '(empty)';
      if (Array.isArray(v)) {
        if (v.length === 0) return '(empty)';
        const formatted = v.map(item => {
          if (typeof item === 'object' && item !== null) {
            return Object.entries(item)
              .filter(([_, val]) => val !== '' && val !== null && val !== undefined)
              .map(([k, val]) => `${k}: ${val}`)
              .join(', ');
          }
          return String(item);
        }).filter(item => item !== '');
        return formatted.length > 0 ? formatted.join(' | ') : '(empty)';
      }
      if (typeof v === 'object') {
        if (Object.keys(v).length === 0) return '(empty)';
        return Object.entries(v)
          .filter(([_, val]) => val !== '' && val !== null && val !== undefined)
          .map(([k, val]) => `${k}: ${val}`)
          .join(', ');
      }
      return String(v);
    };

    return (
      <div className="mt-3 space-y-2 bg-gray-50/50 p-3 rounded-lg border border-gray-100">
        {Object.entries(details).map(([key, value]) => {
          // Format camelCase key to capitalized text
          const formattedKey = key.replace(/([A-Z])/g, ' $1').trim();
          const displayKey = formattedKey.charAt(0).toUpperCase() + formattedKey.slice(1);
          
          // Check if it's an update object with from/to
          if (value && typeof value === 'object' && ('from' in value || 'to' in value)) {
            const fromStr = formatValue(value.from);
            const toStr = formatValue(value.to);
            if (fromStr === '(empty)' && toStr === '(empty)') return null;

            return (
              <div key={key} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm border-b border-gray-100/50 pb-2 last:border-0 last:pb-0">
                <span className="font-medium text-gray-600 min-w-[120px]">{displayKey}</span>
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="bg-red-50 text-red-600 px-2 py-1 rounded-md line-through max-w-full sm:max-w-xs break-words">{fromStr}</span>
                  <span className="text-gray-400 font-medium">→</span>
                  <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md font-medium max-w-full sm:max-w-xs break-words">{toStr}</span>
                </div>
              </div>
            );
          } 
          // For create/delete logs or nested objects
          else {
            // Ignore system fields
            if (key === 'createdAt' || key === 'updatedAt' || key === 'id') return null;
            
            const valStr = formatValue(value);
            if (valStr === '(empty)' || valStr === '') return null; // Skip rendering empty fields

            return (
              <div key={key} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 text-sm border-b border-gray-100/50 pb-2 last:border-0 last:pb-0">
                <span className="font-medium text-gray-600 min-w-[120px]">{displayKey}</span>
                <span className="text-gray-800 bg-white border border-gray-100 px-2 py-1 rounded-md text-xs break-words shadow-sm max-w-full sm:max-w-md">{valStr}</span>
              </div>
            );
          }
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <ClipboardList className="w-6 h-6 text-indigo-600" />
            </div>
            Daily Work Tracker
          </h1>
          <p className="text-gray-500 mt-1">Monitor employee activity and work progress across all modules.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search activities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors bg-white"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-gray-400" />
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors bg-white min-w-[180px]"
            >
              <option value="All">All Employees</option>
              {users.map(user => (
                <option key={user.id} value={user.name}>{user.name} ({user.designation})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {loading ? (
          <div className="py-12 text-center text-gray-500 flex flex-col items-center bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
            Loading daily work...
          </div>
        ) : Object.keys(groupedLogs).length === 0 ? (
          <div className="py-12 text-center text-gray-500 bg-white rounded-xl border border-gray-100 shadow-sm">
            <History className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-lg font-medium text-gray-900">No activity found</p>
            <p className="text-sm mt-1">No work progress recorded for the selected filters.</p>
          </div>
        ) : (
          Object.entries(groupedLogs).map(([userName, userLogs]) => (
            <div key={userName} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center border border-indigo-200">
                    <span className="text-indigo-700 font-bold text-sm">
                      {userName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{userName}</h3>
                    <p className="text-xs text-gray-500">{userLogs.length} actions today</p>
                  </div>
                </div>
              </div>
              
              <div className="divide-y divide-gray-100">
                {userLogs.map((log) => (
                  <div key={log.id} className="p-4 hover:bg-gray-50/50 transition-colors flex flex-col sm:flex-row gap-4 sm:items-center">
                    <div className="w-full sm:w-24 shrink-0 text-sm font-medium text-gray-500">
                      {new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(log.createdAt))}
                    </div>
                    
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-gray-100 text-gray-700 capitalize border border-gray-200">
                          {log.module}
                        </span>
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ring-1 ring-inset",
                          getActionColor(log.action)
                        )}>
                          {log.action}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mt-1">
                        {log.details}
                      </p>
                      {log.fullDetails && renderFullDetails(log.fullDetails)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
