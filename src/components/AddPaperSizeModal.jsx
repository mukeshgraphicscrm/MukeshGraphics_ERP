import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import CustomSelect from './CustomSelect';

export default function AddPaperSizeModal({ isOpen, onClose, onPaperSizeAdded, onPaperSizeUpdated, paperSizeToEdit }) {
  const [formData, setFormData] = useState({
    name: '',
    length: '',
    width: '',
    height: '',
    unit: 'Inches',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (paperSizeToEdit) {
      setFormData({
        name: paperSizeToEdit.name || '',
        length: paperSizeToEdit.length !== undefined ? paperSizeToEdit.length : '',
        width: paperSizeToEdit.width !== undefined ? paperSizeToEdit.width : '',
        height: paperSizeToEdit.height !== undefined ? paperSizeToEdit.height : '',
        unit: paperSizeToEdit.unit || 'Inches',
      });
    } else {
      setFormData({
        name: '',
        length: '',
        width: '',
        height: '',
        unit: 'Inches',
      });
    }
  }, [paperSizeToEdit, isOpen]);

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

  // Auto-generate name based on length, width, and height
  useEffect(() => {
    if (!paperSizeToEdit && formData.length && formData.width) {
      if (formData.height) {
        setFormData(prev => ({ ...prev, name: `${prev.length}x${prev.width}x${prev.height}` }));
      } else {
        setFormData(prev => ({ ...prev, name: `${prev.length}x${prev.width}` }));
      }
    }
  }, [formData.length, formData.width, formData.height, paperSizeToEdit]);

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
        length: Number(formData.length),
        width: Number(formData.width),
        height: formData.height ? Number(formData.height) : null,
      };

      if (paperSizeToEdit) {
        const res = await api.put(`/paperSizes/${paperSizeToEdit.id}`, payload);
        if (onPaperSizeUpdated) onPaperSizeUpdated(res.data);
        toast.success('Paper Size updated successfully!');
      } else {
        const res = await api.post('/paperSizes', payload);
        if (onPaperSizeAdded) onPaperSizeAdded(res.data);
        toast.success('Paper Size added successfully!');
      }
      
      onClose();
    } catch (err) {
      console.error('Error saving paper size:', err);
      setError('Failed to save paper size. Please try again.');
      toast.error('Failed to save paper size.');
    } finally {
      setLoading(false);
    }
  };

  const unitOptions = [
    { value: 'Inches', label: 'Inches' },
    { value: 'cm', label: 'cm' },
    { value: 'mm', label: 'mm' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto" onMouseDown={(e) => { if (e.target === e.currentTarget && typeof onClose === "function") onClose(); }}>
      <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl flex flex-col max-h-[calc(100dvh-4rem)] md:max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-lg font-bold text-gray-900">{paperSizeToEdit ? 'Edit Paper Size' : 'Add Paper Size'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex-1 overflow-y-auto custom-scrollbar">
          {error && <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 space-y-0">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Length *</label>
              <input
                type="number"
                name="length"
                required
                step="any"
                min="0"
                value={formData.length}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors"
                placeholder="e.g. 18"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Width *</label>
              <input
                type="number"
                name="width"
                required
                step="any"
                min="0"
                value={formData.width}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors"
                placeholder="e.g. 23"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Height (Optional)</label>
              <input
                type="number"
                name="height"
                step="any"
                min="0"
                value={formData.height}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors"
                placeholder="e.g. 5"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit of Measurement *</label>
              <CustomSelect
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                options={unitOptions}
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Size Name *</label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors"
                placeholder="e.g. 18x23 or A4"
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
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-brand-primarydark transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : (paperSizeToEdit ? 'Save Changes' : 'Add Paper Size')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
