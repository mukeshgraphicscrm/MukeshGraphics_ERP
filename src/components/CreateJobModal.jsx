import React, { useState, useEffect, useRef } from 'react';
import { X, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import CustomSelect from './CustomSelect';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';

const stageOptions = [
  { value: 'Printing', label: 'Printing' },
  { value: 'Lamination', label: 'Lamination' },
  { value: 'Punching', label: 'Punching' },
  { value: 'Striping', label: 'Striping' },
  { value: 'Pasting', label: 'Pasting' },
  { value: 'Ready To Dispatch', label: 'Ready To Dispatch' },
  { value: 'Dispatched', label: 'Dispatched' },
];

const statusOptions = [
  { value: 'On Schedule', label: 'On Schedule' },
  { value: 'At Risk', label: 'At Risk' },
  { value: 'Delayed', label: 'Delayed' },
];

export default function CreateJobModal({ isOpen, onClose, onJobAdded, onJobUpdated, jobs = [], jobToEdit }) {
  const { currentUser } = useAuth();
  const { customers, products } = useData();
  const [formData, setFormData] = useState({
    jobCardNo: '',
    productName: '',
    customerName: '',
    units: '',
    stage: 'Printing',
    status: 'On Schedule',
    progress: '0',
    deadline: '',
    sheetQuantity: '',
    notes: '',
    employee: currentUser?.profile?.name || '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState([]);
  const [showWhatsappMenu, setShowWhatsappMenu] = useState(false);
  const whatsappMenuRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    const handleClickOutside = (event) => {
      if (whatsappMenuRef.current && !whatsappMenuRef.current.contains(event.target)) {
        setShowWhatsappMenu(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      if (isOpen) {
        document.body.style.overflow = 'unset';
        document.documentElement.style.overflow = 'unset';
      }
    };
  }, [isOpen, onClose]);

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

      if (jobToEdit) {
        setFormData({
          jobCardNo: jobToEdit.jobCardNo || '',
          productName: jobToEdit.productName || '',
          customerName: jobToEdit.customerName || '',
          units: jobToEdit.units || '',
          stage: jobToEdit.stage || 'Printing',
          status: jobToEdit.status || 'On Schedule',
          progress: jobToEdit.progress || '0',
          deadline: jobToEdit.deadline ? new Date(jobToEdit.deadline).toISOString().split('T')[0] : '',
          sheetQuantity: jobToEdit.sheetQuantity || '',
          notes: jobToEdit.notes || '',
          employee: jobToEdit.employee || currentUser?.profile?.name || '',
        });
      } else {
        const currentYear = new Date().getFullYear();
        const prefix = `JC-${currentYear}-`;

        let nextNum = 1;
        if (jobs && jobs.length > 0) {
          const currentJobs = jobs.filter(j => j.jobCardNo && j.jobCardNo.startsWith(prefix));
          if (currentJobs.length > 0) {
            const nums = currentJobs.map(j => {
              const parts = j.jobCardNo.split('-');
              return parseInt(parts[2], 10) || 0;
            });
            nextNum = Math.max(...nums) + 1;
          }
        }
        const nextJobNo = `${prefix}${String(nextNum).padStart(3, '0')}`;

        // Reset form on open
        setFormData({
          jobCardNo: nextJobNo,
          productName: '',
          customerName: '',
          units: '',
          stage: 'Printing',
          status: 'On Schedule',
          progress: '0',
          deadline: new Date().toISOString().split('T')[0],
          sheetQuantity: '',
          notes: '',
          employee: currentUser?.profile?.name || '',
        });
      }
    }
  }, [isOpen, jobs, jobToEdit, currentUser]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Capitalize specific text fields
    const isTextLike = ['jobCardNo', 'productName', 'customerName', 'notes'].includes(name);
    const updatedValue = isTextLike ? value.toUpperCase() : value;

    const isEmployeeEditing = jobToEdit && currentUser?.profile?.designation === 'Employee';

    if (name === 'stage') {
      const stageProgressMap = {
        'Printing': 20,
        'Lamination': 40,
        'Punching': 55,
        'Striping': 70,
        'Pasting': 90,
        'Ready To Dispatch': 95,
        'Dispatched': 100,
      };
      const calculatedProgress = stageProgressMap[updatedValue] || 0;
      setFormData((prev) => {
        const autoEmployee = isEmployeeEditing ? currentUser?.profile?.name : prev.employee;
        return {
          ...prev,
          [name]: updatedValue,
          progress: calculatedProgress.toString(),
          ...(isEmployeeEditing && { employee: autoEmployee })
        };
      });
    } else {
      setFormData((prev) => {
        const autoEmployee = isEmployeeEditing ? currentUser?.profile?.name : prev.employee;
        const extraUpdates = name === 'customerName' ? { productName: '' } : {};
        return { 
          ...prev, 
          [name]: updatedValue,
          ...extraUpdates,
          ...(isEmployeeEditing && { employee: autoEmployee })
        };
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        ...formData,
        units: Number(formData.units),
        progress: Number(formData.progress),
        sheetQuantity: formData.sheetQuantity ? Number(formData.sheetQuantity) : null,
      };
      if (jobToEdit) {
        const res = await api.put(`/productionJobs/${jobToEdit.id}`, payload);
        if (onJobUpdated) onJobUpdated(res.data);
        toast.success('Job updated successfully!');
      } else {
        const res = await api.post('/productionJobs', payload);
        if (onJobAdded) onJobAdded(res.data);
        toast.success('Job created successfully!');
      }
      onClose();
    } catch (err) {
      console.error('Error saving job:', err);
      setError('Failed to save job. Please try again.');
      toast.error('Failed to save job.');
    } finally {
      setLoading(false);
    }
  };



  const customerOptions = customers ? customers.map(cust => ({
    value: cust.name,
    label: cust.name,
  })) : [];
  if (formData.customerName && !customerOptions.find(opt => opt.value === formData.customerName)) {
    customerOptions.push({
      value: formData.customerName,
      label: formData.customerName,
    });
  }

  const filteredProducts = products ? products.filter(p => p.companyName === formData.customerName) : [];
  const productOptions = filteredProducts.map(prod => ({
    value: prod.name,
    label: prod.name,
  }));
  if (formData.productName && !productOptions.find(opt => opt.value === formData.productName)) {
    productOptions.push({
      value: formData.productName,
      label: formData.productName,
    });
  }

  const handleSendWhatsapp = (stage) => {
    if (!formData.customerName) {
      toast.error('Please select a customer first.');
      return;
    }

    const customer = customers?.find(c => c.name === formData.customerName);
    if (!customer || !customer.mobile) {
      toast.error('Customer mobile number not found.');
      return;
    }

    const mobile = customer.mobile.startsWith('91') ? customer.mobile : `91${customer.mobile}`;
    const message = `Hello ${formData.customerName},\n\nYour job (Job No: ${formData.jobCardNo}) for ${formData.productName} is currently at the *${stage}* stage.\n\nRegards,\nMukesh Graphics`;
    const url = `https://wa.me/${mobile}?text=${encodeURIComponent(message)}`;
    
    window.open(url, '_blank');
    setShowWhatsappMenu(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget && typeof onClose === "function") onClose(); }}>
      <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl flex flex-col max-h-[calc(100dvh-4rem)] md:max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center px-4 sm:px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-lg font-bold text-gray-900">{jobToEdit ? 'Edit Job' : 'Create Job'}</h2>
          
          <div className="flex items-center gap-3">
            <div className="relative" ref={whatsappMenuRef}>
              <button
                type="button"
                onClick={() => setShowWhatsappMenu(!showWhatsappMenu)}
                className="flex items-center justify-center p-2 text-green-600 bg-green-50 rounded-full hover:bg-green-100 transition-colors"
                title="Send WhatsApp Update"
              >
                <MessageCircle className="w-5 h-5" />
              </button>
              
              {showWhatsappMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50 overflow-hidden">
                  <div className="py-1">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 uppercase tracking-wider">
                      Send Update For
                    </div>
                    {stageOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleSendWhatsapp(option.value)}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 flex-1 overflow-y-auto custom-scrollbar">
          {error && <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 space-y-0">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job No *</label>
              <input
                type="text"
                name="jobCardNo"
                required
                value={formData.jobCardNo}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors"
                placeholder="e.g. JC-2024-001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
              <CustomSelect
                name="customerName"
                value={formData.customerName}
                onChange={handleChange}
                options={[{ label: 'Select Customer', value: '' }, ...customerOptions]}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
              <CustomSelect
                name="productName"
                value={formData.productName}
                onChange={handleChange}
                options={[{ label: 'Select Product', value: '' }, ...productOptions]}
                required
                disabled={!formData.customerName && productOptions.length === 0}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stage *</label>
              <CustomSelect
                name="stage"
                value={formData.stage}
                onChange={handleChange}
                options={stageOptions}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sheet Quantity</label>
              <input
                type="number"
                name="sheetQuantity"
                min="0"
                value={formData.sheetQuantity || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors"
                placeholder="e.g. 500"
              />
            </div>


            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Printing Copies *</label>
              <input
                type="number"
                name="units"
                required
                min="1"
                value={formData.units}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors"
                placeholder="e.g. 10000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Progress (%) *</label>
              <input
                type="number"
                name="progress"
                required
                min="0"
                max="100"
                value={formData.progress}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Deadline *</label>
              <input
                type="date"
                name="deadline"
                required
                value={formData.deadline}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
              <CustomSelect
                name="employee"
                value={formData.employee}
                onChange={handleChange}
                disabled={!!jobToEdit && currentUser?.profile?.designation === 'Employee'}
                options={[
                  { label: 'Select Employee', value: '' },
                  ...users.map(user => ({ label: user.name, value: user.name }))
                ]}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors resize-none"
                placeholder="Enter any additional notes..."
              ></textarea>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-5">
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
              {loading ? 'Saving...' : (jobToEdit ? 'Save Changes' : 'Create Job')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
