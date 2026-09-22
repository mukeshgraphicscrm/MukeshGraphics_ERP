import React, { useEffect } from 'react';
import { X, Edit2, Trash2 } from 'lucide-react';
import useScrollLock from '../hooks/useScrollLock';

export default function ViewMaterialModal({ isOpen, onClose, material, onEditClick, onDeleteClick }) {
  useScrollLock(isOpen);
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    if (isOpen) {
    } else {
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !material) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[calc(100dvh-4rem)] md:max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-white shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold text-lg uppercase">
              {material.material?.charAt(0)}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 leading-tight">Material Details</h2>
              <p className="text-xs text-gray-500">View information and stock levels</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => {
                onClose();
                onEditClick();
              }}
              className="flex items-center px-3 py-1.5 text-sm font-medium text-brand-primary bg-brand-primary/5 hover:bg-brand-primary/10 rounded-md transition-colors"
            >
              <Edit2 className="w-4 h-4 mr-1.5" />
              Edit
            </button>
            <button 
              onClick={() => {
                onDeleteClick(material);
              }}
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
          <div>
            <h3 className="text-2xl font-bold text-gray-900">{material.material}</h3>
            <span className={`inline-block mt-3 px-3 py-1 text-xs font-bold rounded-full border ${
              material.status === 'In Stock' 
                ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                : 'bg-amber-50 text-amber-600 border-amber-200'
            }`}>
              {material.status || 'Active'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-6 p-5 bg-gray-50 rounded-xl border border-gray-100">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Category</p>
              <p className="text-base font-semibold text-gray-900">{material.category || '-'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Paper Size</p>
              <p className="text-base font-semibold text-gray-900">{material.paperSize || '-'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Current Stock</p>
              <p className="text-base font-bold text-gray-900">
                {material.stock != null ? material.stock.toLocaleString('en-IN') : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Unit of Measure</p>
              <p className="text-base font-semibold text-gray-900">{material.unit || '-'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Minimum Threshold</p>
              <p className="text-base font-semibold text-gray-900">
                {material.min != null ? material.min.toLocaleString('en-IN') : '-'}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Notes</p>
              <p className="text-base font-semibold text-gray-900 whitespace-pre-wrap">{material.notes || '-'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
