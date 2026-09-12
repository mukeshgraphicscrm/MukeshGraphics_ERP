import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import DeleteConfirmModal from './DeleteConfirmModal';
import { cn } from '../lib/utils';

export default function AddSupplierModal({ isOpen, onClose, onSupplierAdded, supplierToEdit, onSupplierUpdated, onSupplierDeleted }) {
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    mobile: '',
    city: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [internalSupplierToEdit, setInternalSupplierToEdit] = useState(null);
  const [supplierToDelete, setSupplierToDelete] = useState(null);

  const activeSupplierToEdit = supplierToEdit || internalSupplierToEdit;

  const fetchSuppliers = async () => {
    try {
      const res = await api.get('/suppliers');
      setSuppliers(res.data);
    } catch (err) { }
  };

  useEffect(() => {
    if (activeSupplierToEdit) {
      setFormData({
        name: activeSupplierToEdit.name || '',
        contactPerson: activeSupplierToEdit.contactPerson || '',
        mobile: activeSupplierToEdit.mobile || '',
        city: activeSupplierToEdit.city || '',
      });
    } else {
      setFormData({ name: '', contactPerson: '', mobile: '', city: '' });
    }
  }, [activeSupplierToEdit, isOpen]);

  useEffect(() => {
    if (isOpen) {
      fetchSuppliers();
      if (!supplierToEdit) {
        setInternalSupplierToEdit(null);
      }
    }
  }, [isOpen, supplierToEdit]);

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
    setFormData((prev) => ({ ...prev, [name]: value.toUpperCase() }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (activeSupplierToEdit) {
        const payload = { ...activeSupplierToEdit, ...formData };
        const res = await api.put(`/suppliers/${activeSupplierToEdit.id || activeSupplierToEdit._id}`, payload);
        if (onSupplierUpdated) onSupplierUpdated(res.data);
        setSuppliers(prev => prev.map(s => (s.id || s._id) === (activeSupplierToEdit.id || activeSupplierToEdit._id) ? res.data : s));
        setInternalSupplierToEdit(null);
        setFormData({ name: '', contactPerson: '', mobile: '', city: '' });
        toast.success('Supplier updated successfully!');
      } else {
        const payload = {
          ...formData,
          createdAt: new Date().toISOString(),
        };
        const res = await api.post('/suppliers', payload);
        if (onSupplierAdded) onSupplierAdded(res.data);
        setSuppliers(prev => [res.data, ...prev]);
        setFormData({ name: '', contactPerson: '', mobile: '', city: '' });
        toast.success('Supplier added successfully!');
      }
      if (supplierToEdit) {
        onClose();
      }
    } catch (err) {
      console.error('Error saving supplier:', err);
      setError(`Failed to ${activeSupplierToEdit ? 'update' : 'add'} supplier. Please try again.`);
      toast.error(`Failed to ${activeSupplierToEdit ? 'update' : 'add'} supplier.`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      const targetId = supplierToDelete?.id || supplierToDelete?._id || activeSupplierToEdit?.id || activeSupplierToEdit?._id;
      if (!targetId) return;
      await api.delete(`/suppliers/${targetId}`);
      if (onSupplierDeleted) onSupplierDeleted(targetId);
      setSuppliers(prev => prev.filter(s => (s.id || s._id) !== targetId));
      if (activeSupplierToEdit && (activeSupplierToEdit.id || activeSupplierToEdit._id) === targetId) {
        setInternalSupplierToEdit(null);
        setFormData({ name: '', contactPerson: '', mobile: '', city: '' });
      }
      toast.success('Supplier deleted successfully!');
      setIsDeleteModalOpen(false);
      if (supplierToEdit) onClose();
    } catch (err) {
      console.error('Error deleting supplier:', err);
      setError('Failed to delete supplier. Please try again.');
      toast.error('Failed to delete supplier.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl flex flex-col max-h-[calc(100dvh-4rem)] md:max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-lg font-bold text-gray-900">{activeSupplierToEdit ? 'Edit Supplier' : 'Add New Supplier'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex-1 overflow-y-auto custom-scrollbar">
          {error && <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name *</label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1b2f63]/50 focus:border-[#1b2f63] transition-colors"
                placeholder="e.g. Acme Materials"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
              <input
                type="text"
                name="contactPerson"
                value={formData.contactPerson}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1b2f63]/50 focus:border-[#1b2f63] transition-colors"
                placeholder="e.g. John Doe"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
                <input
                  type="text"
                  name="mobile"
                  value={formData.mobile}
                  onChange={(e) => {
                    const onlyNums = e.target.value.replace(/[^0-9]/g, '');
                    if (onlyNums.length <= 10) {
                      setFormData(prev => ({ ...prev, mobile: onlyNums }));
                    }
                  }}
                  pattern="[0-9]{10}"
                  maxLength={10}
                  title="Mobile number must be exactly 10 digits"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1b2f63]/50 focus:border-[#1b2f63] transition-colors"
                  placeholder="e.g. 9876543210"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1b2f63]/50 focus:border-[#1b2f63] transition-colors"
                  placeholder="e.g. Mumbai"
                />
              </div>
            </div>
          </div>

          {suppliers.length > 0 && !supplierToEdit && (
            <div className="mt-8">
              <label className="block text-[13px] font-semibold text-gray-700 mb-3">Existing Suppliers</label>
              <div className="flex flex-wrap gap-2">
                {suppliers.map(sup => (
                  <div
                    key={sup.id || sup._id}
                    onClick={() => { setInternalSupplierToEdit(sup); setError(null); }}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-100 hover:border-gray-300 transition-colors cursor-pointer group",
                      activeSupplierToEdit && (activeSupplierToEdit.id || activeSupplierToEdit._id) === (sup.id || sup._id) ? "bg-brand-accent/10 border-brand-accent/30 text-brand-accent" : ""
                    )}
                  >
                    <span>{sup.name}</span>
                    <X
                      className="w-3.5 h-3.5 text-gray-400 group-hover:text-red-500 hover:scale-110 transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSupplierToDelete(sup);
                        setIsDeleteModalOpen(true);
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 flex justify-between space-x-3">
            {supplierToEdit ? (
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
              >
              </button>
            ) : null}
            <div className="flex space-x-3 w-full justify-end">
              {activeSupplierToEdit && !supplierToEdit && (
                <button
                  type="button"
                  onClick={() => { setInternalSupplierToEdit(null); setFormData({ name: '', contactPerson: '', mobile: '', city: '' }); }}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 border border-gray-200 rounded-md hover:bg-gray-200 transition-colors mr-auto"
                >
                  Clear Selection
                </button>
              )}
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
                {loading ? 'Saving...' : (activeSupplierToEdit ? 'Update Supplier' : 'Add Supplier')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
    
    {(supplierToEdit || supplierToDelete) && (
      <DeleteConfirmModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Supplier"
        message="Are you sure you want to delete this supplier? This action cannot be undone."
        isDeleting={loading}
      />
    )}
    </>
  );
}
