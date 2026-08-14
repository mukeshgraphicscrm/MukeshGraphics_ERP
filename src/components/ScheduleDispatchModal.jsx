import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

export default function ScheduleDispatchModal({ isOpen, onClose, onDispatchScheduled, onDispatchUpdated, dispatchToEdit, initialData }) {
  const [formData, setFormData] = useState({
    dispatchNo: '',
    customer: '',
    vehicleNo: '',
    driver: '',
    date: '',
    status: 'Scheduled',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      if (dispatchToEdit) {
        setFormData({
          dispatchNo: dispatchToEdit.dispatchNo || '',
          customer: dispatchToEdit.customer || '',
          vehicleNo: dispatchToEdit.vehicleNo || '',
          driver: dispatchToEdit.driver || '',
          date: dispatchToEdit.date || '',
          status: dispatchToEdit.status || 'Scheduled',
        });
      } else {
        api.get('/dispatches').then(res => {
          const dispatches = res.data || [];
          let nextNum = 1;
          const prefix = 'DSP-';
          const dspDispatches = dispatches.filter(d => d.dispatchNo && d.dispatchNo.startsWith(prefix));
          if (dspDispatches.length > 0) {
            const nums = dspDispatches.map(d => parseInt(d.dispatchNo.split('-')[1], 10) || 0);
            nextNum = Math.max(...nums) + 1;
          }
          const nextDispatchNo = `${prefix}${String(nextNum).padStart(3, '0')}`;
          
          setFormData({
            dispatchNo: nextDispatchNo,
            customer: initialData ? initialData.customer || '' : '',
            vehicleNo: '',
            driver: '',
            date: new Date().toISOString().split('T')[0],
            status: 'Scheduled',
          });
        }).catch(err => {
          console.error('Error fetching dispatches for sequence:', err);
          // Fallback if error
          setFormData({
            dispatchNo: 'DSP-001',
            customer: initialData ? initialData.customer || '' : '',
            vehicleNo: '',
            driver: '',
            date: new Date().toISOString().split('T')[0],
            status: 'Scheduled',
          });
        });
      }
    }
  }, [isOpen, dispatchToEdit]);

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
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (isOpen) {
        document.body.style.overflow = 'unset';
        document.documentElement.style.overflow = 'unset';
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    const upperValue = typeof value === 'string' && name !== 'date' ? value.toUpperCase() : value;
    setFormData((prev) => ({ ...prev, [name]: upperValue }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        ...(dispatchToEdit || {}),
        ...formData,
      };
      
      if (!dispatchToEdit) {
        payload.createdAt = new Date().toISOString();
      }

      if (dispatchToEdit) {
        const res = await api.put(`/dispatches/${dispatchToEdit.id}`, payload);
        if (onDispatchUpdated) onDispatchUpdated(res.data);
        toast.success('Dispatch updated successfully!');
      } else {
        const res = await api.post('/dispatches', payload);
        if (onDispatchScheduled) onDispatchScheduled(res.data);
        toast.success('Dispatch scheduled successfully!');
      }

      setFormData({ dispatchNo: '', customer: '', vehicleNo: '', driver: '', date: '', status: 'Scheduled' });
      onClose();
    } catch (err) {
      console.error('Error saving dispatch:', err);
      setError('Failed to save dispatch. Please try again.');
      toast.error('Failed to save dispatch.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">{dispatchToEdit ? 'Edit Dispatch' : 'Schedule Dispatch'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          {error && <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>}
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dispatch No</label>
                <input
                  type="text"
                  name="dispatchNo"
                  required
                  value={formData.dispatchNo}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1b2f63]/50 focus:border-[#1b2f63] transition-colors"
                  placeholder="e.g. DSP-001"
                  readOnly={!!dispatchToEdit}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                <input
                  type="text"
                  name="customer"
                  required
                  value={formData.customer}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1b2f63]/50 focus:border-[#1b2f63] transition-colors"
                  placeholder="e.g. Amul Foods"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transporter</label>
                <input
                  type="text"
                  name="vehicleNo"
                  required
                  value={formData.vehicleNo}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1b2f63]/50 focus:border-[#1b2f63] transition-colors uppercase"
                  placeholder="e.g. VRL Logistics"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Booking Location</label>
                <input
                  type="text"
                  name="driver"
                  required
                  value={formData.driver}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1b2f63]/50 focus:border-[#1b2f63] transition-colors"
                  placeholder="e.g. Mumbai Hub"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  name="date"
                  required
                  value={formData.date}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1b2f63]/50 focus:border-[#1b2f63] transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1b2f63]/50 focus:border-[#1b2f63] transition-colors"
                >
                  <option value="Scheduled">Scheduled</option>
                  <option value="Loading">Loading</option>
                  <option value="Out For Delivery">Out For Delivery</option>
                  <option value="Delivered">Delivered</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="mt-8 flex justify-end space-x-3">
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
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-[#1b2f63] rounded-md hover:bg-[#112046] transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : (dispatchToEdit ? 'Save Changes' : 'Schedule Dispatch')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
