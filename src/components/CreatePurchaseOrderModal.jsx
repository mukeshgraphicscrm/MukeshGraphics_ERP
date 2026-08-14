import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import CustomSelect from './CustomSelect';

export default function CreatePurchaseOrderModal({ isOpen, onClose, onPoCreated, onPoUpdated, onGrnCreated, suppliers, poToEdit, pos = [] }) {
  const [formData, setFormData] = useState({
    poNo: '',
    supplierId: '',
    material: '',
    quantity: '',
    amount: '',
    status: 'Ordered',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

  // Set form data based on edit mode or defaults
  useEffect(() => {
    if (isOpen) {
      if (poToEdit) {
        setFormData({
          poNo: poToEdit.poNo || '',
          supplierId: poToEdit.supplierId || '',
          material: poToEdit.material || '',
          quantity: poToEdit.quantity || '',
          amount: poToEdit.amount || '',
          status: poToEdit.status || 'Ordered',
        });
      } else {
        const currentYear = new Date().getFullYear();
        const prefix = `PO-${currentYear}-`;
        
        let nextNum = 1;
        if (pos && pos.length > 0) {
          const currentPos = pos.filter(p => p.poNo && p.poNo.startsWith(prefix));
          if (currentPos.length > 0) {
            const nums = currentPos.map(p => {
              const parts = p.poNo.split('-');
              return parseInt(parts[2], 10) || 0;
            });
            nextNum = Math.max(...nums) + 1;
          }
        }
        const nextPoNo = `${prefix}${String(nextNum).padStart(3, '0')}`;

        setFormData({
          poNo: nextPoNo,
          supplierId: Object.keys(suppliers).length > 0 ? Object.values(suppliers)[0].id : '',
          material: '',
          quantity: '',
          amount: '',
          status: 'Ordered',
        });
      }
    }
  }, [isOpen, suppliers, poToEdit, pos]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        ...formData,
        quantity: Number(formData.quantity),
        amount: Number(formData.amount),
      };

      if (poToEdit) {
        const res = await api.put(`/purchaseOrders/${poToEdit.id}`, payload);
        if (onPoUpdated) onPoUpdated(res.data);
        toast.success('Purchase order updated successfully!');
        
        if (payload.status === 'Received' && poToEdit.status !== 'Received') {
          try {
            const grnPayload = {
              grnNo: `GRN-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
              poId: payload.poNo, // Using payload.poNo from the new editable field
              supplierId: payload.supplierId,
              material: payload.material,
              date: new Date().toISOString()
            };
            const grnRes = await api.post('/grn', grnPayload);
            if (onGrnCreated) onGrnCreated(grnRes.data);
            toast.success('Goods Receipt Note automatically generated!');
          } catch (grnErr) {
            console.error('Error creating GRN:', grnErr);
          }
        }
      } else {
        const res = await api.post('/purchaseOrders', payload);
        if (onPoCreated) onPoCreated(res.data);
        toast.success('Purchase order created successfully!');
        
        if (payload.status === 'Received') {
          try {
            const grnPayload = {
              grnNo: `GRN-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
              poId: payload.poNo,
              supplierId: payload.supplierId,
              material: payload.material,
              date: new Date().toISOString()
            };
            const grnRes = await api.post('/grn', grnPayload);
            if (onGrnCreated) onGrnCreated(grnRes.data);
            toast.success('Goods Receipt Note automatically generated!');
          } catch (grnErr) {
            console.error('Error creating GRN:', grnErr);
          }
        }
      }

      onClose();
    } catch (err) {
      console.error('Error saving PO:', err);
      setError('Failed to save purchase order. Please try again.');
      toast.error('Failed to save purchase order.');
    } finally {
      setLoading(false);
    }
  };

  const supplierOptions = Object.values(suppliers).map(s => ({
    value: s.id,
    label: s.name
  }));

  const statusOptions = [
    { value: 'Ordered', label: 'Ordered' },
    { value: 'In Transit', label: 'In Transit' },
    { value: 'Received', label: 'Received' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto" onMouseDown={(e) => { if (e.target === e.currentTarget && typeof onClose === "function") onClose(); }}>
      <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl overflow-visible my-8">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">{poToEdit ? 'Edit Purchase Order' : 'New Purchase Order'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 space-y-0">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">PO # *</label>
              <input
                type="text"
                name="poNo"
                required
                value={formData.poNo}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors"
                placeholder="e.g. PO-2026-001"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
              {supplierOptions.length > 0 ? (
                <CustomSelect
                  name="supplierId"
                  value={formData.supplierId}
                  onChange={handleChange}
                  options={supplierOptions}
                  required
                />
              ) : (
                <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                  No suppliers found. Please add a supplier first.
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Material Description *</label>
              <input
                type="text"
                name="material"
                required
                value={formData.material}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors"
                placeholder="e.g. 350 GSM Duplex Board"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
              <input
                type="number"
                name="quantity"
                required
                min="1"
                value={formData.quantity}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors"
                placeholder="e.g. 10000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
              <input
                type="number"
                name="amount"
                required
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors"
                placeholder="e.g. 425000"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
              <CustomSelect
                name="status"
                value={formData.status}
                onChange={handleChange}
                options={statusOptions}
                required
              />
            </div>
          </div>

          <div className="mt-8 flex justify-end space-x-3 border-t border-gray-100 pt-5">
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
              disabled={loading || supplierOptions.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-brand-primarydark transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : (poToEdit ? 'Save Changes' : 'Create PO')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
