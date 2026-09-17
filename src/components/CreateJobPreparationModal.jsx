import React, { useState, useEffect, useCallback } from 'react';
import { X, Trash2, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import CustomSelect from './CustomSelect';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import useScrollLock from '../hooks/useScrollLock';

const INPUT_CLS_FN = (disabled) => `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors ${disabled ? 'bg-gray-50 border-gray-300 text-gray-500 cursor-not-allowed' : 'border-gray-300'}`;
const LABEL_CLS = 'block text-sm font-medium text-gray-700 mb-1';

export default function CreateJobPreparationModal({ isOpen, onClose, onAdded, onUpdated, onDeleted, jobToEdit }) {
  useScrollLock(isOpen);
  const { currentUser } = useAuth();
  const { customers, suppliers, orders, artworks, products } = useData();
  const [loading, setLoading] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    linkedOrders: [{ orderNo: '', party: '' }],
    orderNo: '',
    poNo: '',
    party: '',
    jobNo: '',
    paper: '',
    gsm: '',
    paperSize: '',
    jobSize: '',
    supplier: '',
    designId: '',
    status: 'Active',
    note: '',
  });

  useEffect(() => {
    setIsViewMode(!!jobToEdit);
    if (jobToEdit) {
      setFormData({
        linkedOrders: jobToEdit.linkedOrders && jobToEdit.linkedOrders.length > 0
          ? jobToEdit.linkedOrders
          : [{ orderNo: jobToEdit.orderNo || '', party: jobToEdit.party || '' }],
        orderNo: jobToEdit.orderNo || '',
        poNo: jobToEdit.poNo || '',
        party: jobToEdit.party || '',
        jobNo: jobToEdit.jobNo || '',
        paper: jobToEdit.paper || '',
        gsm: jobToEdit.gsm || '',
        paperSize: jobToEdit.paperSize || '',
        jobSize: jobToEdit.jobSize || '',
        supplier: jobToEdit.supplier || '',
        designId: jobToEdit.designId || '',
        status: jobToEdit.status || 'Active',
        note: jobToEdit.note || '',
      });
    } else {
      setFormData({ linkedOrders: [{ orderNo: '', party: '' }], orderNo: '', poNo: '', party: '', jobNo: '', paper: '', gsm: '', paperSize: '', jobSize: '', supplier: '', designId: '', status: 'Active', note: '' });
    }
  }, [jobToEdit, isOpen]);

  // Close on Escape key + lock body scroll
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => { if (e.key === 'Escape' && !isDeleteModalOpen) onClose(); };
    document.addEventListener('keydown', handleKeyDown);
    // Prevent background scroll
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, isDeleteModalOpen]);

  if (!isOpen) return null;

  const set = (field) => (e) => setFormData(prev => ({ ...prev, [field]: e.target.value.toUpperCase() }));
  const setDirect = (field) => (e) => setFormData(prev => ({ ...prev, [field]: (e.target.value || '').toUpperCase() }));
  const setPreserveCase = (field) => (e) => setFormData(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isNoteVisible && !formData.note.trim()) {
      toast.error('Reason (Note) is required for Delay or Hold status.');
      return;
    }
    setLoading(true);
    
    const submitData = { ...formData };
    if (submitData.linkedOrders && submitData.linkedOrders.length > 0) {
      submitData.orderNo = submitData.linkedOrders[0].orderNo;
      submitData.party = submitData.linkedOrders[0].party;
    }

    try {
      if (jobToEdit) {
        await api.put(`/job_preparations/${jobToEdit.id}`, submitData);
        onUpdated({ id: jobToEdit.id, ...submitData });
        toast.success('Job updated successfully');
      } else {
        const response = await api.post('/job_preparations', submitData);
        const newJob = response.data?.id ? response.data : { id: Date.now().toString(), ...submitData };
        onAdded(newJob);
        toast.success('Job created successfully');
      }
      onClose();
    } catch (error) {
      const newJob = jobToEdit ? { id: jobToEdit.id, ...submitData } : { id: Date.now().toString(), ...submitData };
      if (jobToEdit) onUpdated(newJob); else onAdded(newJob);
      toast.success(jobToEdit ? 'Job updated' : 'Job created');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try { await api.delete(`/job_preparations/${jobToEdit.id}`); } catch (_) { }
    onDeleted(jobToEdit.id);
    toast.success('Job deleted');
    setIsDeleteModalOpen(false);
    onClose();
    setLoading(false);
  };

  const isNoteVisible = formData.status === 'Hold' || formData.status === 'Delay';

  const customerOptions = [
    ...(customers || []).map(c => ({ label: c.name, value: c.name }))
  ];

  const supplierOptions = [
    ...(suppliers || []).map(s => ({ label: s.name, value: s.name }))
  ];

  const orderOptions = [
    ...(orders || []).map(o => ({ label: o.orderNo, value: o.orderNo }))
  ];

  const statusOptions = [
    { label: 'Active', value: 'Active' },
    { label: 'Delay', value: 'Delay' },
    { label: 'Done', value: 'Done' },
    { label: 'Hold', value: 'Hold' },
  ];

  const designOptions = [
    ...(artworks || [])
      .filter(art => art.status?.toUpperCase() === 'FINAL/PARTY APPROVE')
      .map(art => {
        const customerName = customers?.find(c => c.id === art.customerId)?.name || art.customerId;
        const productName = products?.find(p => p.id === art.productId)?.name || art.productId || 'Unknown Product';
        return { label: `${customerName} - ${productName}`, value: art.id };
      })
  ];

  const getFilteredOrderOptions = (partyName) => {
    if (!partyName) return orderOptions; // If no customer selected, show all orders
    const customer = customers?.find(c => c.name === partyName);
    if (!customer) return orderOptions;
    
    return (orders || [])
      .filter(o => o.customerId === customer.id)
      .map(o => ({ label: o.orderNo, value: o.orderNo }));
  };

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
              {isViewMode ? 'View Job Preparation' : (jobToEdit ? 'Edit Job Preparation' : 'Add Job Preparation')}
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Form Body */}
          <form id="jobPrepForm" onSubmit={handleSubmit} className="p-6 flex-1 overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {formData.linkedOrders && formData.linkedOrders.map((linkedItem, idx) => (
                <React.Fragment key={idx}>
                  {/* Order No. */}
                  <div>
                    <label className={LABEL_CLS}>Order No. {formData.linkedOrders.length > 1 ? `#${idx + 1}` : ''} <span className="text-red-500">*</span></label>
                    <CustomSelect
                      name={`orderNo-${idx}`}
                      value={linkedItem.orderNo}
                      onChange={(e) => {
                        const val = e.target.value;
                        const newLinkedOrders = [...formData.linkedOrders];
                        const order = orders?.find(o => o.orderNo === val);
                        if (order) {
                          const customer = customers?.find(c => c.id === order.customerId);
                          newLinkedOrders[idx] = { orderNo: val, party: customer?.name || newLinkedOrders[idx].party };
                          
                          if (idx === 0) {
                            setFormData(prev => ({
                              ...prev,
                              linkedOrders: newLinkedOrders,
                              poNo: order.poNo || prev.poNo,
                              paper: order.paper || prev.paper,
                              gsm: order.gsm || prev.gsm,
                              paperSize: order.paperSize || prev.paperSize,
                              jobSize: order.jobSize || prev.jobSize
                            }));
                            return;
                          }
                        } else {
                          newLinkedOrders[idx] = { ...newLinkedOrders[idx], orderNo: val };
                        }
                        setFormData(prev => ({ ...prev, linkedOrders: newLinkedOrders }));
                      }}
                      options={getFilteredOrderOptions(linkedItem.party)}
                      placeholder="Select Order..."
                      required
                      searchable={true}
                      disabled={isViewMode}
                    />
                  </div>

                  {/* Customer */}
                  <div>
                    <label className={LABEL_CLS}>Customer {formData.linkedOrders.length > 1 ? `#${idx + 1}` : ''} <span className="text-red-500">*</span></label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <CustomSelect
                          name={`party-${idx}`}
                          value={linkedItem.party}
                          onChange={(e) => {
                            const newLinkedOrders = [...formData.linkedOrders];
                            newLinkedOrders[idx] = { ...newLinkedOrders[idx], party: e.target.value };
                            setFormData(prev => ({ ...prev, linkedOrders: newLinkedOrders }));
                          }}
                          options={customerOptions}
                          placeholder="Select Customer..."
                          required
                          searchable={true}
                          disabled={isViewMode}
                        />
                      </div>
                      {idx > 0 && !isViewMode && (
                        <button
                          type="button"
                          onClick={() => {
                            const newLinkedOrders = formData.linkedOrders.filter((_, i) => i !== idx);
                            setFormData(prev => ({ ...prev, linkedOrders: newLinkedOrders }));
                          }}
                          className="mt-1 flex items-center justify-center p-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors shrink-0"
                          title="Remove Customer"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              ))}

              {!isViewMode && (
                <div className="col-span-1 md:col-span-2 flex justify-start mb-2 mt-[-0.5rem]">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, linkedOrders: [...prev.linkedOrders, { orderNo: '', party: '' }] }));
                    }}
                    className="text-sm font-medium text-[#1b2f63] hover:text-[#112046] flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add Another Customer/Order
                  </button>
                </div>
              )}

              {/* Design */}
              <div>
                <label className={LABEL_CLS}>Design</label>
                <CustomSelect
                  name="designId"
                  value={formData.designId}
                  onChange={(e) => setFormData(prev => ({ ...prev, designId: e.target.value }))}
                  options={designOptions}
                  placeholder="Select Design..."
                  searchable={true}
                  disabled={isViewMode}
                />
              </div>

              {/* PO No. */}
              <div>
                <label className={LABEL_CLS}>PO No.</label>
                <input
                  type="text"
                  value={formData.poNo}
                  onChange={set('poNo')}
                  disabled={isViewMode}
                  className={INPUT_CLS_FN(isViewMode)}
                  placeholder="e.g. PO-123"
                />
              </div>

              {/* Job No. */}
              <div>
                <label className={LABEL_CLS}>Job No. <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={formData.jobNo}
                  onChange={set('jobNo')}
                  disabled={isViewMode}
                  className={INPUT_CLS_FN(isViewMode)}
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
                  disabled={isViewMode}
                  className={INPUT_CLS_FN(isViewMode)}
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
                  disabled={isViewMode}
                  className={INPUT_CLS_FN(isViewMode)}
                  placeholder="e.g. 210"
                />
              </div>

              {/* Paper Size */}
              <div>
                <label className={LABEL_CLS}>Paper Size</label>
                <input
                  type="text"
                  value={formData.paperSize}
                  onChange={setPreserveCase('paperSize')}
                  disabled={isViewMode}
                  className={INPUT_CLS_FN(isViewMode)}
                  placeholder="e.g. 24x36 inch"
                />
              </div>

              {/* Job Size */}
              <div>
                <label className={LABEL_CLS}>Job Size</label>
                <input
                  type="text"
                  value={formData.jobSize}
                  onChange={setPreserveCase('jobSize')}
                  disabled={isViewMode}
                  className={INPUT_CLS_FN(isViewMode)}
                  placeholder="e.g. 10x15 cm"
                />
              </div>

              {/* Supplier */}
              <div>
                <label className={LABEL_CLS}>Supplier</label>
                <CustomSelect
                  name="supplier"
                  value={formData.supplier}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
                  options={supplierOptions}
                  placeholder="Select Supplier..."
                  searchable={true}
                  disabled={isViewMode}
                />
              </div>

              {/* Status */}
              <div>
                <label className={LABEL_CLS}>Status</label>
                <CustomSelect
                  name="status"
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  options={statusOptions}
                  placeholder="Select Status..."
                  disabled={isViewMode}
                />
              </div>

              {/* Note */}
              <div className="md:col-span-2">
                <label className={LABEL_CLS}>
                  Status Note / Remarks
                  {isNoteVisible && (
                    <span className="ml-2 text-[11px] font-normal text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                      Reason for {formData.status}
                    </span>
                  )}
                </label>
                <textarea
                  rows={2}
                  value={formData.note}
                  onChange={set('note')}
                  disabled={isViewMode}
                  className={`${INPUT_CLS_FN(isViewMode)} resize-none`}
                  placeholder={isViewMode ? '' : (isNoteVisible ? `Reason for ${formData.status}... (e.g. Paper not received)` : 'Optional remarks...')}
                />
              </div>

            </div>
          </form>

          {/* Footer */}
          <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100 shrink-0">
            <div>
              {jobToEdit && (
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(true)}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                >
                  Delete Job
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
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
                    Edit Job
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
                    form="jobPrepForm"
                    disabled={loading}
                    className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-brand-primarydark transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    {loading ? 'Saving...' : (jobToEdit ? 'Save Changes' : 'Add Job')}
                  </button>
                </>
              )}
            </div>
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
