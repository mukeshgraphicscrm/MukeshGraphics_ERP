import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { 
  History, 
  Search, 
  Filter,
  ArrowUpDown,
  Trash2,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';

export default function Logs() {
  const { currentUser } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Sort states
  const [sortField, setSortField] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [logToDelete, setLogToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [viewLog, setViewLog] = useState(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && viewLog) {
        setViewLog(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    
    if (viewLog) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
    };
  }, [viewLog]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await api.get('/logs');
      setLogs(response.data);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc'); // default to desc for dates/new fields
    }
  };

  const handleDeleteClick = (logId) => {
    setLogToDelete(logId);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!logToDelete) return;
    setIsDeleting(true);
    try {
      await api.delete(`/logs/${logToDelete}`);
      setLogs(logs.filter(log => log.id !== logToDelete));
      toast.success('Log deleted successfully');
      setIsDeleteModalOpen(false);
      setLogToDelete(null);
    } catch (error) {
      console.error('Error deleting log:', error);
      toast.error('Failed to delete log');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const searchString = `${log.userName} ${log.module} ${log.action} ${log.details}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  }).sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];

    if (sortField === 'createdAt') {
      aVal = new Date(a.createdAt).getTime();
      bVal = new Date(b.createdAt).getTime();
    }

    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const getActionColor = (action) => {
    switch (action?.toLowerCase()) {
      case 'create': return 'text-emerald-600 bg-emerald-50 ring-emerald-500/20';
      case 'update': return 'text-blue-600 bg-blue-50 ring-blue-500/20';
      case 'delete': return 'text-red-600 bg-red-50 ring-red-500/20';
      default: return 'text-gray-600 bg-gray-50 ring-gray-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <History className="w-6 h-6 text-indigo-600" />
            </div>
            System Logs
          </h1>
          <p className="text-gray-500 mt-1">Audit trail of all actions performed by users.</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/50">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search logs by user, action, module..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="text-sm text-gray-500">
              Showing {filteredLogs.length} logs
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100">
                <th className="px-6 py-4 text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('createdAt')}>
                  <div className="flex items-center gap-2">
                    Date & Time
                    <ArrowUpDown className="w-4 h-4 text-gray-400" />
                  </div>
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('userName')}>
                  <div className="flex items-center gap-2">
                    User
                    <ArrowUpDown className="w-4 h-4 text-gray-400" />
                  </div>
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('module')}>
                  <div className="flex items-center gap-2">
                    Module
                    <ArrowUpDown className="w-4 h-4 text-gray-400" />
                  </div>
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('action')}>
                  <div className="flex items-center gap-2">
                    Action
                    <ArrowUpDown className="w-4 h-4 text-gray-400" />
                  </div>
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    <div className="flex justify-center items-center gap-3">
                      <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      Loading logs...
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                        <Search className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-gray-900 font-medium mb-1">No logs found</p>
                      <p className="text-sm">Try adjusting your search query</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr 
                    key={log.id} 
                    onClick={() => setViewLog(log)}
                    className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {log.createdAt ? new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(new Date(log.createdAt)) : 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {log.createdAt ? new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(log.createdAt)) : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center border border-indigo-100">
                          <span className="text-indigo-600 font-medium text-sm">
                            {log.userName ? log.userName.charAt(0).toUpperCase() : '?'}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{log.userName}</div>
                          <div className="text-xs text-gray-500">{log.userRole}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 capitalize">
                        {log.module}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ring-1 ring-inset",
                        getActionColor(log.action)
                      )}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-md truncate">
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setLogToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Log"
        message="Are you sure you want to delete this log entry? This action cannot be undone."
        isLoading={isDeleting}
      />

      {/* View Log Modal */}
      {viewLog && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) setViewLog(null); }}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg transform transition-all flex flex-col max-h-[calc(100dvh-4rem)] md:max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 shrink-0">
              <h2 className="text-lg font-bold text-gray-900">Log Details</h2>
              <button onClick={() => setViewLog(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Date & Time</label>
                <div className="text-sm text-gray-900">
                  {viewLog.createdAt ? new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(viewLog.createdAt)) : 'N/A'}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">User</label>
                <div className="text-sm text-gray-900">{viewLog.userName} ({viewLog.userRole})</div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Module</label>
                <div className="text-sm text-gray-900 capitalize">{viewLog.module}</div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Action</label>
                <span className={cn(
                  "inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ring-1 ring-inset mt-1",
                  getActionColor(viewLog.action)
                )}>
                  {viewLog.action}
                </span>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Details</label>
                <div className="text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg border border-gray-100">
                  {viewLog.details}
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100 bg-gray-50 shrink-0">
              <button
                type="button"
                onClick={() => { setViewLog(null); handleDeleteClick(viewLog.id); }}
                className="flex items-center justify-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-transparent rounded-md hover:bg-red-100 transition-colors"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Log
              </button>
              <button
                type="button"
                onClick={() => setViewLog(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
