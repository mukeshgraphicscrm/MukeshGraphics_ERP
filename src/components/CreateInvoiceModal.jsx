import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

export default function CreateInvoiceModal({ isOpen, onClose, customers, onInvoiceCreated, onInvoiceUpdated, invoiceToEdit }) {
  const [formData, setFormData] = useState({
    invoiceNo: '',
    customerId: '',
    amount: '',
    gst: '',
    dueDate: '',
    status: 'Pending',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      if (invoiceToEdit) {
        setFormData({
          invoiceNo: invoiceToEdit.invoiceNo || '',
          customerId: invoiceToEdit.customerId || '',
          amount: invoiceToEdit.amount || '',
          gst: invoiceToEdit.gst || '',
          dueDate: invoiceToEdit.dueDate || '',
          status: invoiceToEdit.status || 'Pending',
        });
      } else {
        const randomNum = Math.floor(100 + Math.random() * 900);
        const initialCustomer = Object.values(customers).length > 0 ? Object.values(customers)[0].id : '';
        setFormData({
          invoiceNo: `INV-${randomNum}`,
          customerId: initialCustomer,
          amount: '',
          gst: '',
          dueDate: new Date().toISOString().split('T')[0],
          status: 'Pending',
        });
      }
    }
  }, [isOpen, customers, invoiceToEdit]);

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

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.customerId) {
      setError('Please select a customer.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const payload = {
        ...(invoiceToEdit || {}),
        ...formData,
        amount: Number(formData.amount),
        gst: Number(formData.gst),
      };

      if (!invoiceToEdit) {
        payload.createdAt = new Date().toISOString();
      }

      if (invoiceToEdit) {
        const res = await api.put(`/invoices/${invoiceToEdit.id}`, payload);
        if (onInvoiceUpdated) onInvoiceUpdated(res.data);
        toast.success('Invoice updated successfully!');
      } else {
        const res = await api.post('/invoices', payload);
        if (onInvoiceCreated) onInvoiceCreated(res.data);
        toast.success('Invoice created successfully!');
      }

      setFormData({ invoiceNo: '', customerId: '', amount: '', gst: '', dueDate: '', status: 'Pending' });
      onClose();
    } catch (err) {
      console.error('Error saving invoice:', err);
      setError('Failed to save invoice. Please try again.');
      toast.error('Failed to save invoice.');
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget && typeof onClose === "function") onClose(); }}>
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">{invoiceToEdit ? 'Edit Invoice' : 'Create Invoice'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          {error && <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>}
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
              {Object.values(customers).length > 0 ? (
                <select
                  name="customerId"
                  required
                  value={formData.customerId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1b2f63]/50 focus:border-[#1b2f63] transition-colors"
                >
                  {Object.values(customers).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              ) : (
                <div className="text-sm text-red-500 p-2 bg-red-50 rounded border border-red-100">
                  No customers available. Please add a customer first.
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Taxable Amount (₹)</label>
                <input
                  type="number"
                  name="amount"
                  required
                  min="0"
                  value={formData.amount}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1b2f63]/50 focus:border-[#1b2f63] transition-colors"
                  placeholder="e.g. 50000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">GST (₹)</label>
                <input
                  type="number"
                  name="gst"
                  required
                  min="0"
                  value={formData.gst}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1b2f63]/50 focus:border-[#1b2f63] transition-colors"
                  placeholder="e.g. 9000"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input
                  type="date"
                  name="dueDate"
                  required
                  value={formData.dueDate}
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
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                  <option value="Overdue">Overdue</option>
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
              disabled={loading || Object.values(customers).length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-[#1b2f63] rounded-md hover:bg-[#112046] transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : (invoiceToEdit ? 'Save Changes' : 'Create Invoice')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
