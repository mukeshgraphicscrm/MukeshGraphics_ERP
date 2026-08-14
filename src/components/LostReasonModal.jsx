import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

export default function LostReasonModal({ isOpen, onClose, lead, onConfirm }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setReason('');
    }
  }, [isOpen]);

  if (!isOpen || !lead) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error('Please provide a reason.');
      return;
    }

    setLoading(true);
    try {
      const newStage = 'Lost';
      const updatedData = { stage: newStage, lostReason: reason.trim().toUpperCase() };
      await api.put(`/leads/${lead.id}`, updatedData);
      onConfirm(lead.id, newStage, updatedData.lostReason);
      toast.success('Lead marked as Lost');
      onClose();
    } catch (err) {
      console.error('Error updating lead to lost:', err);
      toast.error('Failed to update lead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget && typeof onClose === "function") onClose(); }}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-red-50 shrink-0">
          <h2 className="text-lg font-bold text-red-700">Mark Lead as Lost</h2>
          <button onClick={onClose} className="text-red-400 hover:text-red-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto">
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-3">
              You are moving <strong>{lead.company}</strong> to the Lost stage. Please provide a reason.
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason for Loss <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows="3"
              value={reason}
              onChange={(e) => setReason(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-colors resize-none uppercase"
              placeholder="e.g., PRICING TOO HIGH, CHOSE COMPETITOR"
            ></textarea>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !reason.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Confirm Lost'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
