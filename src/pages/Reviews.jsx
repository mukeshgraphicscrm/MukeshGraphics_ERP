import React, { useState } from 'react';
import { Star, Plus, Trash2, Edit2, X, Save, Quote } from 'lucide-react';
import api from '../lib/api';
import { useData } from '../contexts/DataContext';
import toast from 'react-hot-toast';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import useScrollLock from '../hooks/useScrollLock';

const STAR_OPTIONS = [5, 4, 3, 2, 1];

function StarRating({ value = 5, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange && onChange(star)}
          className="focus:outline-none"
        >
          <Star
            className={`w-6 h-6 transition-colors ${star <= value ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`}
          />
        </button>
      ))}
    </div>
  );
}

function ReviewModal({ isOpen, onClose, onSaved, reviewToEdit, reviews }) {
  useScrollLock(isOpen);
  const [formData, setFormData] = useState({
    customerName: '',
    company: '',
    rating: 5,
    review: '',
    designation: '',
  });
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (reviewToEdit) {
      setFormData({
        customerName: reviewToEdit.customerName || '',
        company: reviewToEdit.company || '',
        rating: reviewToEdit.rating || 5,
        review: reviewToEdit.review || '',
        designation: reviewToEdit.designation || '',
      });
    } else {
      setFormData({ customerName: '', company: '', rating: 5, review: '', designation: '' });
    }
  }, [reviewToEdit, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (reviewToEdit) {
        const res = await api.put(`/reviews/${reviewToEdit.id}`, formData);
        onSaved(res.data, 'update');
        toast.success('Review updated successfully!');
      } else {
        const res = await api.post('/reviews', formData);
        onSaved(res.data, 'add');
        toast.success('Review added successfully!');
      }
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save review.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-xl shadow-lg w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">{reviewToEdit ? 'Edit Review' : 'Add New Review'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
              <input
                type="text"
                name="customerName"
                required
                value={formData.customerName}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors text-sm"
                placeholder="E.G. RAHUL SHAH"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company / Business</label>
              <input
                type="text"
                name="company"
                value={formData.company}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors text-sm"
                placeholder="E.G. MODI PLAST"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Designation / Role</label>
            <input
              type="text"
              name="designation"
              value={formData.designation}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors text-sm"
              placeholder="E.G. PURCHASE MANAGER"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Rating *</label>
            <StarRating value={formData.rating} onChange={(val) => setFormData(prev => ({ ...prev, rating: val }))} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Review *</label>
            <textarea
              name="review"
              required
              rows={4}
              value={formData.review}
              onChange={handleChange}
              style={{ textTransform: 'none' }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors text-sm resize-none normal-case"
              placeholder="Write customer's review here..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
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
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-brand-primarydark transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : reviewToEdit ? 'Save Changes' : 'Add Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Reviews() {
  const { reviews, setReviews, isLoaded } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reviewToEdit, setReviewToEdit] = useState(null);
  const [reviewToDelete, setReviewToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterRating, setFilterRating] = useState('all');

  const filteredReviews = (reviews || []).filter(r => {
    const matchSearch = !searchText ||
      r.customerName?.toLowerCase().includes(searchText.toLowerCase()) ||
      r.company?.toLowerCase().includes(searchText.toLowerCase()) ||
      r.review?.toLowerCase().includes(searchText.toLowerCase());
    const matchRating = filterRating === 'all' || String(r.rating) === String(filterRating);
    return matchSearch && matchRating;
  });

  const avgRating = reviews?.length
    ? (reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / reviews.length).toFixed(1)
    : '—';

  const handleSaved = (data, type) => {
    if (type === 'add') {
      setReviews(prev => [data, ...(prev || [])]);
    } else {
      setReviews(prev => (prev || []).map(r => r.id === data.id ? data : r));
    }
  };

  const handleDelete = async () => {
    if (!reviewToDelete) return;
    setIsDeleting(true);
    try {
      await api.delete(`/reviews/${reviewToDelete.id}`);
      setReviews(prev => (prev || []).filter(r => r.id !== reviewToDelete.id));
      setReviewToDelete(null);
      toast.success('Review deleted!');
    } catch {
      toast.error('Failed to delete review.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Reviews</h2>
            <p className="text-sm text-gray-500 mt-1">Manage customer reviews displayed on your public website.</p>
          </div>
          <button
            onClick={() => { setReviewToEdit(null); setIsModalOpen(true); }}
            className="btn-add"
          >
            <Plus className="w-4 h-4 mr-1" />
            <span>Add Review</span>
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Reviews', value: reviews?.length ?? 0, color: 'blue' },
            { label: 'Avg. Rating', value: avgRating, color: 'amber' },
            { label: '5 Star', value: (reviews || []).filter(r => r.rating === 5).length, color: 'green' },
            { label: 'Below 4 Star', value: (reviews || []).filter(r => r.rating < 4).length, color: 'red' },
          ].map(kpi => (
            <div key={kpi.label} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{kpi.label}</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="SEARCH REVIEWS, CUSTOMERS..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent"
          />
          <select
            value={filterRating}
            onChange={e => setFilterRating(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent bg-white"
          >
            <option value="all">ALL RATINGS</option>
            {STAR_OPTIONS.map(s => <option key={s} value={s}>{s} STAR</option>)}
          </select>
        </div>

        {/* Reviews Grid */}
        {!isLoaded ? (
          <div className="text-center py-16 text-gray-400">Loading reviews...</div>
        ) : filteredReviews.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <Quote className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No reviews found.</p>
            <p className="text-gray-400 text-sm mt-1">Click "Add Review" to add your first customer review.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredReviews.map(review => (
              <div key={review.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} className={`w-4 h-4 ${s <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setReviewToEdit(review); setIsModalOpen(true); }}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setReviewToDelete(review)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-gray-700 text-sm leading-relaxed flex-1 line-clamp-4">
                  "{review.review}"
                </p>

                <div className="border-t border-gray-100 pt-3">
                  <p className="font-bold text-gray-900 text-sm">{review.customerName}</p>
                  {(review.designation || review.company) && (
                    <p className="text-gray-500 text-xs mt-0.5">
                      {[review.designation, review.company].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ReviewModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setReviewToEdit(null); }}
        onSaved={handleSaved}
        reviewToEdit={reviewToEdit}
        reviews={reviews}
      />

      <ConfirmDeleteModal
        isOpen={!!reviewToDelete}
        onClose={() => setReviewToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Review"
        message={`Are you sure you want to delete ${reviewToDelete?.customerName}'s review? This will also remove it from your public website.`}
        isLoading={isDeleting}
      />
    </>
  );
}
