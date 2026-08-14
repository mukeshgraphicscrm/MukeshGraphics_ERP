import React, { useState, useEffect } from 'react';
import { X, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

export default function AddCustomerModal({ isOpen, onClose, onCustomerAdded, onCustomerUpdated, customerToEdit, startInEditMode }) {
  const [formData, setFormData] = useState({
    name: '',
    brandName: '',
    contactPerson: '',
    mobile: '',
    city: '',
    state: '',
    country: '',
    gstNumber: '',
    notes: '',
    rating: 0,
  });
  const [isViewMode, setIsViewMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (customerToEdit) {
      setFormData({
        name: customerToEdit.name || '',
        brandName: customerToEdit.brandName || '',
        contactPerson: customerToEdit.contactPerson || '',
        mobile: customerToEdit.mobile || '',
        city: customerToEdit.city || '',
        state: customerToEdit.state || '',
        country: customerToEdit.country || '',
        gstNumber: customerToEdit.gstNumber || '',
        notes: customerToEdit.notes || '',
        rating: customerToEdit.rating || 0,
      });
      setIsViewMode(!startInEditMode);
    } else {
      setFormData({ name: '', brandName: '', contactPerson: '', mobile: '', city: '', state: '', country: '', gstNumber: '', notes: '', rating: 0 });
      setIsViewMode(false);
    }
  }, [customerToEdit, isOpen]);

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
      if (customerToEdit) {
        const payload = { ...formData };
        const res = await api.put(`/customers/${customerToEdit.id}`, payload);
        if (onCustomerUpdated) onCustomerUpdated(res.data);
        toast.success('Customer updated successfully!');
      } else {
        const payload = {
          ...formData,
          outstanding: 0,
          totalBusiness: 0,
          createdAt: new Date().toISOString(),
        };
        const res = await api.post('/customers', payload);
        if (onCustomerAdded) onCustomerAdded(res.data);
        toast.success('Customer added successfully!');
      }
      onClose();
    } catch (err) {
      console.error('Error saving customer:', err);
      setError('Failed to save customer. Please try again.');
      toast.error('Failed to save customer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/50 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget && typeof onClose === "function") onClose(); }}>
      <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-lg font-bold text-gray-900">
            {isViewMode ? 'View Customer' : (customerToEdit ? 'Edit Customer' : 'Add New Customer')}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto">
          {error && <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-md shrink-0">{error}</div>}
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company / Customer Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="name"
                required
                disabled={isViewMode}
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="e.g. Acme Corp"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand Name</label>
              <input
                type="text"
                name="brandName"
                disabled={isViewMode}
                value={formData.brandName}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="e.g. Acme Brands"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
              <input
                type="text"
                name="contactPerson"
                disabled={isViewMode}
                value={formData.contactPerson}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="e.g. John Doe"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
                <input
                  type="text"
                  name="mobile"
                  disabled={isViewMode}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                  placeholder="e.g. 9876543210"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  name="city"
                  disabled={isViewMode}
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                  placeholder="e.g. Mumbai"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <input
                  type="text"
                  name="state"
                  disabled={isViewMode}
                  value={formData.state}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                  placeholder="e.g. Maharashtra"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <input
                  type="text"
                  name="country"
                  disabled={isViewMode}
                  value={formData.country}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                  placeholder="e.g. India"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GST Number</label>
              <input
                type="text"
                name="gstNumber"
                disabled={isViewMode}
                value={formData.gstNumber}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="e.g. 27AADCB2230M1Z2"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                name="notes"
                disabled={isViewMode}
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="Add any additional notes here..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    disabled={isViewMode}
                    onClick={() => setFormData(prev => ({ ...prev, rating: star }))}
                    className={`p-1 focus:outline-none transition-colors ${
                      star <= formData.rating ? 'text-yellow-400' : 'text-gray-300'
                    } ${!isViewMode && star > formData.rating ? 'hover:text-gray-400' : ''} ${isViewMode ? 'cursor-default' : ''}`}
                  >
                    <Star className="w-6 h-6" fill={star <= formData.rating ? "currentColor" : "none"} />
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="mt-8 flex justify-end space-x-3">
            {isViewMode ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsViewMode(false);
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-brand-primarydark transition-colors"
                >
                  Edit Customer
                </button>
              </>
            ) : (
              <>
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
                  {loading ? 'Saving...' : (customerToEdit ? 'Save Changes' : 'Add Customer')}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
