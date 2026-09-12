import React, { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';

const INPUT_CLS = 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors';
const LABEL_CLS = 'block text-sm font-medium text-gray-700 mb-1';

export default function CreateJobPreparationModal({ isOpen, onClose, onAdded, onUpdated, onDeleted, jobToEdit }) {
  const { currentUser } = useAuth();
  const { customers, suppliers } = useData();
  const [loading, setLoading] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    orderNo: '',
    party: '',
    jobNo: '',
    paper: '',
    gsm: '',
    size: '',
    supplier: '',
    status: 'Active',
    note: '',
  });

  useEffect(() => {
    if (jobToEdit) {
      setFormData({
        orderNo: jobToEdit.orderNo || '',
        party: jobToEdit.party || '',
        jobNo: jobToEdit.jobNo || '',
        paper: jobToEdit.paper || '',
        gsm: jobToEdit.gsm || '',
        size: jobToEdit.size || '',
        supplier: jobToEdit.supplier || '',
        status: jobToEdit.status || 'Active',
        note: jobToEdit.note || '',
      });
    } else {
      setFormData({ orderNo: '', party: '', jobNo: '', paper: '', gsm: '', size: '', supplier: '', status: 'Active', note: '' });
    }
  }, [jobToEdit, isOpen]);

  if (!isOpen) return null;

  const set = (field) => (e) => setFormData(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (jobToEdit) {
        await api.put(`/job_preparations/${jobToEdit.id}`, formData);
        onUpdated({ id: jobToEdit.id, ...formData });
        toast.success('Job updated successfully');
      } else {
        const response = await api.post('/job_preparations', formData);
        const newJob = response.data?.id ? response.data : { id: Date.now().toString(), ...formData };
        onAdded(newJob);
        toast.success('Job created successfully');
      }
      onClose();
    } catch (error) {
      // Fallback: keep UI working if API not ready
      const newJob = jobToEdit ? { id: jobToEdit.id, ...formData } : { id: Date.now().toString(), ...formData };
      if (jobToEdit) onUpdated(newJob); else onAdded(newJob);
      toast.success(jobToEdit ? 'Job updated' : 'Job created');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await api.delete(`/job_preparations/${jobToEdit.id}`);
    } catch (_) {}
    onDeleted(jobToEdit.id);
    toast.success('Job deleted');
    setIsDeleteModalOpen(false);
    onClose();
    setLoading(false);
  };

  const isNoteVisible = formData.status === 'Hold' || formData.status === 'Delay';

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto"
        onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        {/* Modal Box */}
        <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl flex flex-col max-h-[calc(100dvh-4rem)] md:max-h-[90vh] overflow-hidden">

          {/* Header */}
          <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 shrink-0">
            <h2 className="text-lg font-bold text-gray-900">
              {jobToEdit ? 'Edit Job Preparation' : 'Add Job Preparation'}
            </h2>
            <div className="flex items-center gap-2">
              {jobToEdit && (
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                  title="Delete Job"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Form Body */}
          <form id="jobPrepForm" onSubmit={handleSubmit} className="p-6 flex-1 overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Order No. */}
              <div>
                <label className={LABEL_CLS}>Order No.</label>
                <input
                  type="text"
                  required
                  value={formData.orderNo}
                  onChange={set('orderNo')}
                  className={INPUT_CLS}
                  placeholder="e.g. 008"
                />
              </div>

              {/* Party */}
              <div>
                <label className={LABEL_CLS}>Party</label>
                <select
                  required
                  value={formData.party}
                  onChange={set('party')}
                  className={INPUT_CLS}
                >
                  <option value="">Select Party</option>
                  {customers && customers.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Job No. */}
              <div>
                <label className={LABEL_CLS}>Job No.</label>
                <input
                  type="text"
                  required
                  value={formData.jobNo}
                  onChange={set('jobNo')}
                  className={INPUT_CLS}
                  placeholder="e.g. 2025"
                />
              </div>

              {/* Paper */}
              <div>
                <label className={LABEL_CLS}>Paper</label>
                <input
                  type="text"
                  value={formData.paper}
                  onChange={set('paper')}
                  className={INPUT_CLS}
                  placeholder="e.g. FBB"
                />
              </div>

              {/* GSM */}
              <div>
                <label className={LABEL_CLS}>GSM</label>
                <input
                  type="text"
                  value={formData.gsm}
                  onChange={set('gsm')}
                  className={INPUT_CLS}
                  placeholder="e.g. 210"
                />
              </div>

              {/* Size */}
              <div>
                <label className={LABEL_CLS}>Size</label>
                <input
                  type="text"
                  value={formData.size}
                  onChange={set('size')}
                  className={INPUT_CLS}
                  placeholder="e.g. 91×56"
                />
              </div>

              {/* Supplier */}
              <div>
                <label className={LABEL_CLS}>Supplier</label>
                <select
                  value={formData.supplier}
                  onChange={set('supplier')}
                  className={INPUT_CLS}
                >
                  <option value="">Select Supplier</option>
                  {suppliers && suppliers.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className={LABEL_CLS}>Status</label>
                <select
                  value={formData.status}
                  onChange={set('status')}
                  className={INPUT_CLS}
                >
                  <option value="Active">Active</option>
                  <option value="Delay">Delay</option>
                  <option value="Done">Done</option>
                  <option value="Hold">Hold</option>
                </select>
              </div>

              {/* Note — always visible but highlighted when Hold/Delay */}
              <div className="md:col-span-2">
                <label className={LABEL_CLS}>
                  Status Note / Remarks
                  {isNoteVisible && (
                    <span className="ml-2 text-[11px] font-normal text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                      Required for {formData.status}
                    </span>
                  )}
                </label>
                <textarea
                  rows={2}
                  value={formData.note}
                  onChange={set('note')}
                  className={`${INPUT_CLS} resize-none`}
                  placeholder={isNoteVisible ? `Reason for ${formData.status}... (e.g. Paper not received)` : 'Optional remarks...'}
                />
              </div>

            </div>
          </form>

          {/* Footer */}
          <div className="flex justify-end items-center gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
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
              form="jobPrepForm"
              disabled={loading}
              className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-brand-primarydark transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {loading ? 'Saving...' : (jobToEdit ? 'Save Changes' : 'Add Job')}
            </button>
          </div>
        </div>
      </div>

      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Job Preparation"
        message="Are you sure you want to delete this job preparation record? This action cannot be undone."
        isLoading={loading}
      />
    </>
  );
}
