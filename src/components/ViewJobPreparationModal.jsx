import React, { useEffect } from 'react';
import { X, Edit2, Trash2, Printer } from 'lucide-react';
import useScrollLock from '../hooks/useScrollLock';

export default function ViewJobPreparationModal({ isOpen, onClose, job, onEditClick, onDeleteClick, preventClose }) {
  useScrollLock(isOpen);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !preventClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, preventClose]);

  if (!isOpen || !job) return null;

  const partyName = job.linkedOrders?.length > 0 
    ? job.linkedOrders.map(l => l.party).filter(Boolean).join(', ') 
    : job.party || 'Unknown Customer';

  const orderNumbers = job.linkedOrders?.length > 0
    ? job.linkedOrders.map(l => l.orderNo).filter(Boolean).join(', ')
    : job.orderNo || '-';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget && !preventClose) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl flex flex-col max-h-[calc(100dvh-4rem)] md:max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-6 py-4 border-b border-gray-100 bg-white shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold text-lg uppercase">
              {partyName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900 leading-tight">Job {job.jobNo || '-'}</h2>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                  job.status === 'Done' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                  job.status === 'Hold' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                  job.status === 'Delay' ? 'bg-red-50 text-red-600 border-red-200' :
                  'bg-blue-50 text-blue-600 border-blue-200'
                }`}>
                  {job.status || 'Active'}
                </span>
              </div>
              <p className="text-xs text-gray-500 truncate max-w-xs" title={partyName}>{partyName}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => {
                onClose();
                onEditClick(job);
              }}
              className="flex items-center px-3 py-1.5 text-sm font-medium text-brand-primary bg-brand-primary/5 hover:bg-brand-primary/10 rounded-md transition-colors"
            >
              <Edit2 className="w-4 h-4 mr-1.5" />
              Edit
            </button>
            <button 
              onClick={() => onDeleteClick(job)}
              className="flex items-center px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Delete
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
          
          {/* Main Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-5 bg-gray-50 rounded-xl border border-gray-100">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Order Numbers</p>
              <p className="text-sm font-semibold text-gray-900">{orderNumbers}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">PO Number</p>
              <p className="text-sm font-semibold text-gray-900">{job.poNo || '-'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Supplier</p>
              <p className="text-sm font-semibold text-gray-900">{job.supplier || '-'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Sheet Count</p>
              <p className="text-sm font-semibold text-gray-900">{job.sheetCount || '-'}</p>
            </div>
          </div>

          {/* Paper Details */}
          <div>
            <h3 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wider">Paper Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-5 bg-white rounded-xl border border-gray-100">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Paper Name</p>
                <p className="text-sm font-semibold text-gray-900">{job.paper || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">GSM</p>
                <p className="text-sm font-semibold text-gray-900">{job.gsm || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Paper Size</p>
                <p className="text-sm font-semibold text-gray-900">{job.paperSize || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Job Size</p>
                <p className="text-sm font-semibold text-gray-900">{job.jobSize || '-'}</p>
              </div>
            </div>
          </div>

          {/* Linked Orders Table (if explicitly given as multiple) */}
          {job.linkedOrders && job.linkedOrders.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wider">Linked Orders</h3>
              <div className="border border-gray-100 rounded-xl overflow-hidden bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-gray-600">Order No</th>
                      <th className="px-4 py-3 font-semibold text-gray-600">Party Name</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {job.linkedOrders.map((lo, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 font-medium text-gray-900">{lo.orderNo || '-'}</td>
                        <td className="px-4 py-3 text-gray-600">{lo.party || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Notes */}
          {job.note && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Job Notes / Reason</p>
              <div className="p-4 bg-[#FCF9F2] rounded-xl border border-[#E8A33D]/20 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed font-medium">
                {job.note}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
