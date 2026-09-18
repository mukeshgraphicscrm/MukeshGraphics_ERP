import React, { useEffect } from 'react';
import { X, Edit2, Trash2 } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import useScrollLock from '../hooks/useScrollLock';

export default function ViewDesignModal({ isOpen, onClose, design, onEditClick, onDeleteClick, preventClose }) {
  useScrollLock(isOpen);
  const { customerMap, productMap, leads } = useData();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !preventClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, preventClose]);

  if (!isOpen || !design) return null;

  let clientName = 'Unknown Client';
  let clientInitial = 'D';
  if (design.leadId) {
    const lead = leads?.find(l => l.id === design.leadId);
    clientName = lead ? `${lead.contactPerson || ''} ${lead.company ? `(${lead.company})` : ''}`.trim() : (design.customerId || 'Unknown Lead');
    clientInitial = lead?.contactPerson?.charAt(0) || design.customerId?.charAt(0) || 'L';
  } else {
    clientName = customerMap?.[design.customerId]?.name || design.customerId || 'Unknown Customer';
    clientInitial = clientName.charAt(0);
  }

  const productName = productMap?.[design.productId]?.name || design.productId || 'Unknown Product';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget && !preventClose) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl flex flex-col max-h-[calc(100dvh-4rem)] md:max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-6 py-4 border-b border-gray-100 bg-white shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold text-lg uppercase shrink-0">
              {clientInitial}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900 leading-tight">
                  Design: {design.designType || '-'}
                </h2>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                  design.status === 'Final/Party Approve' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                  design.status === 'Hold' || design.status === 'Delay' ? 'bg-red-50 text-red-600 border-red-200' :
                  'bg-brand-accent/10 text-brand-accent border-brand-accent/20'
                }`}>
                  {design.status || 'Active'}
                </span>
                {design.leadId && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full border bg-purple-50 text-purple-600 border-purple-200">
                    LEAD
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{clientName}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {onEditClick && (
              <button 
                onClick={() => {
                  onClose();
                  onEditClick(design);
                }}
                className="flex items-center px-3 py-1.5 text-sm font-medium text-brand-primary bg-brand-primary/5 hover:bg-brand-primary/10 rounded-md transition-colors"
              >
                <Edit2 className="w-4 h-4 mr-1.5" />
                Edit
              </button>
            )}
            {onDeleteClick && (
              <button 
                onClick={() => {
                  onDeleteClick(design);
                }}
                className="flex items-center px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                Delete
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 ml-2">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-5 bg-gray-50 rounded-xl border border-gray-100 mb-6">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Start Date</p>
              <p className="text-base font-semibold text-gray-900">
                {design.startDate ? new Date(design.startDate).toLocaleDateString('en-GB') : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Deadline</p>
              <p className="text-base font-semibold text-gray-900">
                {design.deadline ? new Date(design.deadline).toLocaleDateString('en-GB') : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Employee</p>
              <p className="text-base font-semibold text-gray-900 truncate">
                {design.employee || '-'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Designer</p>
              <p className="text-base font-semibold text-gray-900 truncate">
                {design.designer || '-'}
              </p>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider border-b border-gray-100 pb-2">Design Details</h3>
            
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Variety Count</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Variety Names</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  <tr>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {productName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {(() => {
                        if (!design.variety) return '-';
                        if (!isNaN(design.variety) && !String(design.variety).includes(',')) return design.variety;
                        return String(design.variety).split(',').filter(Boolean).length;
                      })()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {(() => {
                        if (!design.variety || (!isNaN(design.variety) && !String(design.variety).includes(','))) return '-';
                        const names = String(design.variety).split(',').map(s => s.trim()).filter(Boolean);
                        if (names.length === 0) return '-';
                        return (
                          <div className="flex flex-col gap-1">
                            {names.map((name, index) => (
                              <span key={index} className="px-2 py-1 bg-gray-50 border border-gray-100 rounded-md text-xs inline-block w-fit">
                                {index + 1}. {name}
                              </span>
                            ))}
                          </div>
                        );
                      })()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {design.delayReason && (
            <div className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50">
              <h4 className="text-sm font-bold text-red-800 mb-1 flex items-center">
                Delay Reason
              </h4>
              <p className="text-sm text-red-700">{design.delayReason}</p>
            </div>
          )}

          {design.notes && (
            <div className="mb-6 p-4 rounded-xl border border-gray-200 bg-gray-50">
              <h4 className="text-sm font-bold text-gray-900 mb-1">Notes</h4>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{design.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
