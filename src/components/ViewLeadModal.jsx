import React, { useEffect } from 'react';
import { X, Edit2 } from 'lucide-react';

export default function ViewLeadModal({ isOpen, onClose, lead, onEditClick }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    if (isOpen) {
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
  }, [isOpen, onClose]);

  if (!isOpen || !lead) return null;

  const followUps = lead.followUps && lead.followUps.length > 0 
    ? lead.followUps 
    : (lead.notes || lead.date || lead.time 
        ? [{ date: lead.date || '', time: lead.time || '', notes: lead.notes || '' }] 
        : []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-white shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-[#1b2f63]/10 flex items-center justify-center text-[#1b2f63] font-bold text-lg">
              {lead.company?.charAt(0)?.toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 leading-tight">Lead Details</h2>
              <p className="text-xs text-gray-500">View information and history</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => {
                onClose();
                onEditClick();
              }}
              className="flex items-center px-3 py-1.5 text-sm font-medium text-[#1b2f63] bg-[#1b2f63]/5 hover:bg-[#1b2f63]/10 rounded-md transition-colors"
            >
              <Edit2 className="w-4 h-4 mr-1.5" />
              Edit
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
          {lead.stage === 'Lost' && lead.lostReason && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <h3 className="text-sm font-bold text-red-800 mb-1">Reason for Loss</h3>
              <p className="text-sm text-red-600 font-medium">{lead.lostReason}</p>
            </div>
          )}

          <div>
            <h3 className="text-2xl font-bold text-gray-900">{lead.company}</h3>
            <span className="inline-block mt-3 px-3 py-1 bg-[#E8A33D]/10 text-[#E8A33D] text-xs font-bold rounded-full border border-[#E8A33D]/20">
              {lead.stage}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-6 p-5 bg-gray-50 rounded-xl border border-gray-100">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Contact Person</p>
              <p className="text-base font-semibold text-gray-900">{lead.contactPerson || '-'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Mobile Number</p>
              <p className="text-base font-semibold text-gray-900">{lead.mobile || lead.phone || '-'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Email</p>
              <p className="text-base font-semibold text-gray-900">{lead.email || '-'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Location</p>
              <p className="text-base font-semibold text-gray-900">
                {[lead.city, lead.state, lead.country].filter(Boolean).join(', ') || '-'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Lead Source</p>
              <p className="text-base font-semibold text-gray-900">{lead.leadSource || '-'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Employee</p>
              <p className="text-base font-semibold text-gray-900">{lead.employee || '-'}</p>
            </div>
          </div>

          {lead.products && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Products</p>
              <div className="p-4 bg-gray-50 rounded-xl text-sm text-gray-800 border border-gray-100 whitespace-pre-wrap font-medium leading-relaxed">
                {lead.products}
              </div>
            </div>
          )}

          {followUps.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Follow-ups / Notes</p>
              <div className="space-y-3">
                {[...followUps].reverse().map((followUp, index) => {
                  const originalIndex = followUps.length - 1 - index;
                  return (
                    <div key={originalIndex} className="p-4 bg-[#FCF9F2] rounded-xl border border-[#E8A33D]/20">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-semibold text-[#1b2f63]">Note {originalIndex + 1}</span>
                        <span className="text-xs font-medium text-gray-500">
                          {followUp.date || '-'} {followUp.time ? `at ${followUp.time}` : ''}
                        </span>
                      </div>
                      {followUp.notes && (
                        <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                          {followUp.notes}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
