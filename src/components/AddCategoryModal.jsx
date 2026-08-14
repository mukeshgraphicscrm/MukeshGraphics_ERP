import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import ConfirmDeleteModal from './ConfirmDeleteModal';

export default function AddCategoryModal({ isOpen, onClose, onCategoryAdded, onCategoryUpdated, onCategoryDeleted }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [fetchingCategories, setFetchingCategories] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setCategoryToEdit(null);
      setError(null);
      fetchCategories();
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    setFetchingCategories(true);
    try {
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setFetchingCategories(false);
    }
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Category name is required');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (categoryToEdit) {
        const res = await api.put(`/categories/${categoryToEdit.id || categoryToEdit._id}`, { name });
        if (onCategoryUpdated) onCategoryUpdated(res.data);
        setCategories(prev => prev.map(c => (c.id || c._id) === (categoryToEdit.id || categoryToEdit._id) ? res.data : c));
        setName('');
        setCategoryToEdit(null);
        toast.success('Category updated successfully!');
      } else {
        const res = await api.post('/categories', { name });
        if (onCategoryAdded) onCategoryAdded(res.data);
        setCategories(prev => [res.data, ...prev]);
        setName('');
        toast.success('Category added successfully!');
      }
    } catch (err) {
      console.error('Error saving category:', err);
      setError('Failed to save category. Please try again.');
      toast.error('Failed to save category.');
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    const cat = categoryToDelete;
    try {
      await api.delete(`/categories/${cat.id || cat._id}`);
      if (onCategoryDeleted) onCategoryDeleted(cat.id || cat._id);
      setCategories(prev => prev.filter(c => (c.id || c._id) !== (cat.id || cat._id)));
      if (categoryToEdit && (categoryToEdit.id || categoryToEdit._id) === (cat.id || cat._id)) {
        setCategoryToEdit(null);
        setName('');
      }
      toast.success('Category deleted successfully!');
    } catch (err) {
      console.error('Error deleting category:', err);
      toast.error('Failed to delete category.');
    } finally {
      setIsDeleteModalOpen(false);
      setCategoryToDelete(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">{categoryToEdit ? 'Edit Category' : 'Add New Category'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name Of Category *</label>
              <input
                type="text"
                name="name"
                required
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors"
                placeholder="e.g. FOOD PACKAGING"
              />
            </div>

            <div className="pt-4 border-t border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-2">Existing Categories</label>
              {fetchingCategories ? (
                <p className="text-sm text-gray-500">Loading...</p>
              ) : categories.length === 0 ? (
                <p className="text-sm text-gray-500">No categories found.</p>
              ) : (
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
                  {categories.map(cat => (
                    <div
                      key={cat.id || cat._id}
                      className="inline-flex items-center bg-gray-100 border border-gray-200 text-gray-800 text-xs font-semibold rounded-full hover:bg-gray-200 transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setCategoryToEdit(cat);
                          setName(cat.name);
                        }}
                        className="px-3 py-1 cursor-pointer"
                        title="Click to edit"
                      >
                        {cat.name}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCategoryToDelete(cat);
                          setIsDeleteModalOpen(true);
                        }}
                        className="pr-2 py-1 text-gray-400 hover:text-red-500 transition-colors"
                        title="Delete category"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
              className="px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-brand-primarydark transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : categoryToEdit ? 'Save Changes' : 'Add Category'}
            </button>
          </div>
        </form>
      </div>

      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setCategoryToDelete(null);
        }}
        onConfirm={confirmDeleteCategory}
        title="Delete Category"
        message={`Are you sure you want to delete the category "${categoryToDelete?.name}"? This action cannot be undone.`}
      />
    </div>
  );
}
