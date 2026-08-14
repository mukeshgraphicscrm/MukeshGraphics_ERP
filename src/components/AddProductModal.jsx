import React, { useState, useEffect } from 'react';
import { X, Upload, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import CustomSelect from './CustomSelect';
import ConfirmDeleteModal from './ConfirmDeleteModal';

export default function AddProductModal({ isOpen, onClose, onProductAdded, onProductUpdated, onProductDeleted, productToEdit, startInEditMode }) {
  const [formData, setFormData] = useState({
    companyName: '',
    name: '',
    category: '',
    dimensions: '',
    material: '',
    gsm: '',
    printing: '',
    unitPrice: '',
    image: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const formatIndianNumber = (numStr) => {
    if (!numStr) return '';
    const cleanStr = String(numStr).replace(/[^0-9.]/g, '');
    const parts = cleanStr.split('.');
    let intPart = parts[0];
    let decPart = parts.length > 1 ? '.' + parts[1] : '';
    if (intPart.length > 3) {
      const lastThree = intPart.substring(intPart.length - 3);
      const otherNumbers = intPart.substring(0, intPart.length - 3);
      intPart = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree;
    }
    return intPart + decPart;
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    try {
      const [catRes, custRes] = await Promise.all([
        api.get('/categories'),
        api.get('/customers')
      ]);
      setCategories(catRes.data);
      setCustomers(custRes.data);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  useEffect(() => {
    if (productToEdit) {
      setFormData({
        companyName: productToEdit.companyName || '',
        name: productToEdit.name || '',
        category: productToEdit.category || '',
        dimensions: productToEdit.dimensions || '',
        material: productToEdit.material || '',
        gsm: productToEdit.gsm || '',
        printing: productToEdit.printing || '',
        unitPrice: productToEdit.unitPrice ? formatIndianNumber(productToEdit.unitPrice) : '',
        image: productToEdit.image || '',
      });
      setIsViewMode(!startInEditMode);
    } else {
      setFormData({
        companyName: '',
        name: '',
        category: '',
        dimensions: '',
        material: '',
        gsm: '',
        printing: '',
        unitPrice: '',
        image: '',
      });
      setIsViewMode(false);
    }
  }, [productToEdit, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isDeleteModalOpen) {
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
  }, [isOpen, onClose, isDeleteModalOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'category' || name === 'companyName') {
      setFormData((prev) => ({ ...prev, [name]: value }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: typeof value === 'string' ? value.toUpperCase() : value }));
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const uploadData = new FormData();
    uploadData.append('file', file);

    try {
      const res = await api.post('/upload', uploadData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setFormData(prev => ({ ...prev, image: res.data.url }));
      toast.success('Image uploaded successfully');
    } catch (err) {
      console.error('Error uploading image:', err);
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        ...formData,
        unitPrice: Number(String(formData.unitPrice).replace(/,/g, '')),
      };

      if (productToEdit) {
        const res = await api.put(`/products/${productToEdit.id}`, payload);
        if (onProductUpdated) onProductUpdated(res.data);
        toast.success('Product updated successfully!');
      } else {
        const res = await api.post('/products', payload);
        if (onProductAdded) onProductAdded(res.data);
        toast.success('Product added successfully!');
      }

      onClose();
    } catch (err) {
      console.error('Error saving product:', err);
      setError('Failed to save product. Please try again.');
      toast.error('Failed to save product.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = () => {
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    setLoading(true);
    try {
      await api.delete(`/products/${productToEdit.id}`);
      if (onProductDeleted) onProductDeleted(productToEdit.id);
      toast.success('Product deleted successfully!');
      setIsDeleteModalOpen(false);
      onClose();
    } catch (err) {
      console.error('Error deleting product:', err);
      toast.error('Failed to delete product.');
    } finally {
      setLoading(false);
    }
  };

  const categoryOptions = categories.map(cat => ({
    value: cat.name,
    label: cat.name,
  }));

  const customerOptions = customers.map(cust => ({
    value: cust.name,
    label: cust.name + (cust.contactPerson ? ` - ${cust.contactPerson}` : ''),
  }));

  if (formData.companyName && !customerOptions.find(opt => opt.value === formData.companyName)) {
    customerOptions.push({
      value: formData.companyName,
      label: formData.companyName,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto" onMouseDown={(e) => { if (e.target === e.currentTarget && typeof onClose === "function") onClose(); }}>
      <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl overflow-hidden my-4 sm:my-8 shrink-0">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">{isViewMode ? 'View Product' : (productToEdit ? 'Edit Product' : 'Add Product')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 space-y-0">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <CustomSelect
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                options={customerOptions}
                disabled={isViewMode}
                placeholder="Select Customer..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
              <input
                type="text"
                name="name"
                required
                disabled={isViewMode}
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="e.g. Ice Cream Box"
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
                disabled={isViewMode}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dimensions</label>
              <input
                type="text"
                name="dimensions"
                disabled={isViewMode}
                value={formData.dimensions}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="e.g. 120x90x60 mm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Material *</label>
              <input
                type="text"
                name="material"
                required
                disabled={isViewMode}
                value={formData.material}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="e.g. Duplex Board"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GSM *</label>
              <input
                type="text"
                name="gsm"
                required
                disabled={isViewMode}
                value={formData.gsm}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="e.g. 350"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Printing *</label>
              <input
                type="text"
                name="printing"
                required
                disabled={isViewMode}
                value={formData.printing}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="e.g. 5 Color Offset"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price (₹) *</label>
              <input
                type="text"
                name="unitPrice"
                required
                disabled={isViewMode}
                value={formData.unitPrice}
                onChange={(e) => setFormData(prev => ({ ...prev, unitPrice: formatIndianNumber(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="e.g. 5,00,000"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Image</label>
              <div className="mt-1 flex items-center space-x-4">
                {formData.image ? (
                  <div className="relative w-20 h-20 rounded-md border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center shrink-0">
                    <img src={formData.image.startsWith('http') ? formData.image : `http://localhost:5000${formData.image}`} alt="Product" className="object-contain w-full h-full p-1" />
                    {!isViewMode && (
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                        className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-bl-md hover:bg-red-600 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-md border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 text-gray-400 shrink-0">
                    <Upload className="w-6 h-6" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage || isViewMode}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-brand-accent/10 file:text-brand-accent hover:file:bg-brand-accent/20 transition-colors disabled:opacity-50"
                  />
                  {uploadingImage && <p className="text-sm text-brand-accent mt-2">Uploading...</p>}
                </div>
              </div>
            </div>
          </div>

          <div className={`mt-8 flex flex-col-reverse sm:flex-row ${productToEdit ? 'sm:justify-between' : 'sm:justify-end'} items-stretch sm:items-center gap-3 border-t border-gray-100 pt-5`}>
            {productToEdit && (
              <button
                type="button"
                onClick={handleDeleteClick}
                disabled={loading}
                className="flex items-center justify-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-transparent rounded-md hover:bg-red-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/50 w-full sm:w-auto"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                <span className="whitespace-nowrap">Delete Product</span>
              </button>
            )}
            <div className="flex gap-3 w-full sm:w-auto">
              {isViewMode ? (
                <>
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors whitespace-nowrap"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setIsViewMode(false);
                    }}
                    className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-brand-primarydark transition-colors whitespace-nowrap"
                  >
                    Edit Product
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                    className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors whitespace-nowrap"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-brand-primarydark transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    {loading ? 'Saving...' : (productToEdit ? 'Save Changes' : 'Add Product')}
                  </button>
                </>
              )}
            </div>
          </div>
        </form>
      </div>

      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone and it will be permanently removed from the system."
        isLoading={loading}
      />
    </div>
  );
}
