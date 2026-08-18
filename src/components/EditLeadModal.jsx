import React, { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import CustomSelect from './CustomSelect';
import { useAuth } from '../contexts/AuthContext';
import { countries } from '../lib/countries';

export default function EditLeadModal({ isOpen, onClose, onLeadUpdated, onLeadDeleted, lead }) {
  const { currentUser } = useAuth();

  const [formData, setFormData] = useState({
    company: '',
    contactPerson: '',
    mobile: '',
    email: '',
    city: '',
    state: '',
    country: 'India',
    leadSource: '',
    products: '',
    employee: '',
    stage: 'New Inquiry',
    lostReason: '',
    followUps: [{ date: '', time: '', notes: '' }],
  });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    if (lead) {
      setFormData({
        company: lead.company || '',
        contactPerson: lead.contactPerson || '',
        mobile: lead.mobile || lead.phone || '',
        email: lead.email || '',
        city: lead.city || '',
        state: lead.state || '',
        country: lead.country || 'India',
        leadSource: lead.leadSource || '',
        products: lead.products || '',
        employee: lead.employee || currentUser?.profile?.name || '',
        stage: lead.stage || 'New Inquiry',
        lostReason: lead.lostReason || '',
        followUps: lead.followUps && lead.followUps.length > 0 
          ? lead.followUps 
          : (lead.notes || lead.date || lead.time 
              ? [{ date: lead.date || '', time: lead.time || '', notes: lead.notes || '' }] 
              : [{ date: '', time: '', notes: '' }]),
      });
    }
  }, [lead, currentUser]);

  useEffect(() => {
    if (isOpen) {
      const fetchUsers = async () => {
        try {
          const res = await api.get('/users');
          setUsers(res.data);
        } catch (err) {
          console.error('Error fetching users:', err);
        }
      };
      fetchUsers();
    }
  }, [isOpen]);

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

  if (!isOpen || !lead) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'mobile') {
      const numericValue = value.replace(/\D/g, '').slice(0, 10);
      setFormData(prev => ({ ...prev, [name]: numericValue }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: (name === 'stage' || name === 'employee' || name === 'date' || name === 'time' || name === 'leadSource' || name === 'email' || name === 'country') ? value : value.toUpperCase()
    }));
  };

  const handleFollowUpChange = (index, field, value) => {
    const newFollowUps = [...formData.followUps];
    newFollowUps[index][field] = (field === 'date' || field === 'time') ? value : value.toUpperCase();
    setFormData(prev => ({ ...prev, followUps: newFollowUps }));
  };

  const addFollowUp = () => {
    setFormData(prev => ({
      ...prev,
      followUps: [...prev.followUps, { date: '', time: '', notes: '' }]
    }));
  };

  const removeFollowUp = (index) => {
    const newFollowUps = formData.followUps.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, followUps: newFollowUps }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.put(`/leads/${lead.id}`, formData);
      if (onLeadUpdated) onLeadUpdated(res.data);
      toast.success('Lead updated successfully!');
      onClose();
    } catch (err) {
      console.error('Error updating lead:', err);
      setError('Failed to update lead. Please try again.');
      toast.error('Failed to update lead.');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = () => {
    setIsDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await api.delete(`/leads/${lead.id}`);
      if (onLeadDeleted) onLeadDeleted(lead.id);
      toast.success('Lead deleted successfully!');
      onClose();
    } catch (err) {
      console.error('Error deleting lead:', err);
      toast.error('Failed to delete lead.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-lg font-bold text-gray-900">Edit Lead</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex-1 overflow-y-auto custom-scrollbar">
          {error && <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>}

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="company"
                  required
                  autoFocus
                  value={formData.company}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1b2f63]/50 focus:border-[#1b2f63] transition-colors"
                  placeholder="e.g. ABC Corp"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="contactPerson"
                  required
                  value={formData.contactPerson}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1b2f63]/50 focus:border-[#1b2f63] transition-colors"
                  placeholder="e.g. John Doe"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                <input
                  type="tel"
                  name="mobile"
                  pattern="[0-9]{10}"
                  title="Please enter a valid 10-digit mobile number"
                  value={formData.mobile}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1b2f63]/50 focus:border-[#1b2f63] transition-colors"
                  placeholder="e.g. 9876543210"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1b2f63]/50 focus:border-[#1b2f63] transition-colors"
                  placeholder="e.g. john@example.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1b2f63]/50 focus:border-[#1b2f63] transition-colors"
                  placeholder="e.g. Maharashtra"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <CustomSelect
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  options={countries}
                  searchable
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lead Source <span className="text-red-500">*</span></label>
                <CustomSelect
                  name="leadSource"
                  value={formData.leadSource}
                  onChange={handleChange}
                  required
                  options={[
                    { label: 'Website', value: 'Website' },
                    { label: 'Digital Marketing', value: 'Digital Marketing' },
                    { label: 'Call', value: 'Call' },
                    { label: 'Email', value: 'Email' },
                    { label: 'WhatsApp', value: 'WhatsApp' },
                    { label: 'Referral', value: 'Referral' },
                    { label: 'Social Media', value: 'Social Media' },
                    { label: 'Walk-in', value: 'Walk-in' },
                    { label: 'Other', value: 'Other' }
                  ]}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stage <span className="text-red-500">*</span></label>
              <CustomSelect
                name="stage"
                value={formData.stage}
                onChange={handleChange}
                options={[
                  { label: 'New Inquiry', value: 'New Inquiry' },
                  { label: 'Follow Up', value: 'Follow Up' },
                  { label: 'Quotation Sent', value: 'Quotation Sent' },
                  { label: 'Won', value: 'Won' },
                  { label: 'Lost', value: 'Lost' }
                ]}
              />
            </div>

            {formData.stage === 'Lost' && (
              <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                <label className="block text-sm font-medium text-red-700 mb-1">
                  Reason for Loss <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="lostReason"
                  required
                  rows="2"
                  value={formData.lostReason}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-red-200 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-colors resize-none uppercase"
                  placeholder="e.g., PRICING TOO HIGH"
                ></textarea>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Products</label>
              <textarea
                name="products"
                rows="3"
                value={formData.products}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1b2f63]/50 focus:border-[#1b2f63] transition-colors resize-none"
                placeholder="e.g. 53MM LID GREY BACK 350GSM PAPER"
              ></textarea>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employees</label>
              <CustomSelect
                name="employee"
                value={formData.employee}
                onChange={handleChange}
                options={[
                  { label: 'Select Employee', value: '' },
                  ...users.map(user => ({ label: user.name, value: user.name }))
                ]}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <label className="block text-sm font-semibold text-[#1b2f63]">Follow-ups / Notes</label>
                <button type="button" onClick={addFollowUp} className="text-sm text-[#E8A33D] font-medium hover:underline">
                  + Add Note
                </button>
              </div>
              
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {formData.followUps.map((followUp, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-100 relative">
                    {formData.followUps.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => removeFollowUp(index)} 
                        className="absolute top-3 right-3 text-red-400 hover:text-red-600 transition-colors p-1"
                        title="Remove note"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
                        <input
                          type="date"
                          value={followUp.date}
                          onChange={(e) => handleFollowUpChange(index, 'date', e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#1b2f63] focus:border-[#1b2f63] transition-colors text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Time</label>
                        <input
                          type="time"
                          value={followUp.time}
                          onChange={(e) => handleFollowUpChange(index, 'time', e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#1b2f63] focus:border-[#1b2f63] transition-colors text-gray-900"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
                      <textarea
                        rows="2"
                        value={followUp.notes}
                        onChange={(e) => handleFollowUpChange(index, 'notes', e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#1b2f63] focus:border-[#1b2f63] transition-colors resize-none"
                        placeholder="Add any relevant notes or requirements..."
                      ></textarea>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col-reverse sm:flex-row sm:justify-between items-stretch sm:items-center gap-3 border-t border-gray-100 pt-5">
            <button
              type="button"
              onClick={confirmDelete}
              disabled={loading}
              className="flex items-center justify-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-100 rounded-md hover:bg-red-100 transition-colors w-full sm:w-auto"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              <span className="whitespace-nowrap">Delete Lead</span>
            </button>
            <div className="flex gap-3 w-full sm:w-auto">
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
                className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-white bg-[#1b2f63] rounded-md hover:bg-[#112046] transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {loading ? 'Updating...' : 'Update Lead'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget && typeof onClose === "function") onClose(); }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Lead</h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to delete <strong>{lead.company}</strong>? This action cannot be undone.
            </p>
            <div className="flex space-x-3 justify-center">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors w-full"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 w-full"
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
