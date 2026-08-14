import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import CustomSelect from './CustomSelect';

export default function AddMaterialModal({ isOpen, onClose, onMaterialAdded, onMaterialUpdated, materialToEdit }) {
  const [formData, setFormData] = useState({
    material: '',
    category: 'Paper',
    stock: '',
    unit: 'Sheets',
    min: '',
    min: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (materialToEdit) {
      setFormData({
        material: materialToEdit.material || '',
        category: materialToEdit.category || 'Paper',
        stock: materialToEdit.stock !== undefined ? materialToEdit.stock : '',
        unit: materialToEdit.unit || 'Sheets',
        min: materialToEdit.min !== undefined ? materialToEdit.min : '',
      });
    } else {
      setFormData({
        material: '',
        category: 'Paper',
        stock: '',
        unit: 'Sheets',
        min: '',
      });
    }
  }, [materialToEdit, isOpen]);

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
    setLoading(true);
    setError(null);
    try {
      const stockVal = Number(formData.stock);
      const minVal = Number(formData.min);

      const payload = {
        ...formData,
        stock: stockVal,
        min: minVal,
        status: stockVal <= minVal ? 'Low Stock' : 'In Stock'
      };

      if (materialToEdit) {
        const res = await api.put(`/inventory/${materialToEdit.id}`, payload);
        if (onMaterialUpdated) onMaterialUpdated(res.data);
        toast.success('Material updated successfully!');
      } else {
        const res = await api.post('/inventory', payload);
        if (onMaterialAdded) onMaterialAdded(res.data);
        toast.success('Material added successfully!');
      }
      
      onClose();
    } catch (err) {
      console.error('Error saving material:', err);
      setError('Failed to save material. Please try again.');
      toast.error('Failed to save material.');
    } finally {
      setLoading(false);
    }
  };

  const categoryOptions = [
    { value: 'Paper', label: 'Paper' },
    { value: 'Ink', label: 'Ink' },
    { value: 'Consumables', label: 'Consumables' },
    { value: 'Tooling', label: 'Tooling' },
    { value: 'Other', label: 'Other' },
  ];

  const unitOptions = [
    { value: 'Sheets', label: 'Sheets' },
    { value: 'Liters', label: 'Liters' },
    { value: 'Kgs', label: 'Kgs' },
    { value: 'Rolls', label: 'Rolls' },
    { value: 'Pieces', label: 'Pieces' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto" onMouseDown={(e) => { if (e.target === e.currentTarget && typeof onClose === "function") onClose(); }}>
      <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl overflow-hidden my-8">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">{materialToEdit ? 'Edit Material' : 'Add Material'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 space-y-0">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Material Name *</label>
              <input
                type="text"
                name="material"
                required
                value={formData.material}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors"
                placeholder="e.g. SBS Board 300 GSM"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <CustomSelect
                name="category"
                value={formData.category}
                onChange={handleChange}
                options={categoryOptions}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit of Measure *</label>
              <CustomSelect
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                options={unitOptions}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Stock *</label>
              <input
                type="number"
                name="stock"
                required
                min="0"
                value={formData.stock}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors"
                placeholder="e.g. 5000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Threshold *</label>
              <input
                type="number"
                name="min"
                required
                min="0"
                value={formData.min}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors"
                placeholder="e.g. 1000"
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
              {loading ? 'Saving...' : (materialToEdit ? 'Save Changes' : 'Add Material')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
