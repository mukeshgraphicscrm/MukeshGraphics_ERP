import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2 } from 'lucide-react';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import toast from 'react-hot-toast';
import api from '../lib/api';
import CustomSelect from './CustomSelect';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';

export default function CreateInvoiceModal({ isOpen, onClose, customers: customerMap, onInvoiceCreated, onInvoiceUpdated, invoiceToEdit }) {
  const { currentUser } = useAuth();
  const { invoices, products, users, customers } = useData();

  const [formData, setFormData] = useState({
    invoiceNo: '',
    companyName: '',
    customerId: '',
    productId: [],
    items: [],
    status: 'Pending',
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    employee: currentUser?.profile?.name || '',
    advancePaymentDate: '',
    advancePaymentAmount: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [isViewMode, setIsViewMode] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [showWhatsappPrompt, setShowWhatsappPrompt] = useState(false);
  const [whatsappInfo, setWhatsappInfo] = useState({ phone: '', message: '' });

  const formatIndianNumber = (numStr) => {
    if (!numStr) return '';
    const numericOnly = numStr.toString().replace(/[^0-9.]/g, '');
    const parts = numericOnly.split('.');
    let integerPart = parts[0];
    const decimalPart = parts.length > 1 ? '.' + parts[1] : '';

    if (integerPart.length > 3) {
      const lastThree = integerPart.substring(integerPart.length - 3);
      const otherNumbers = integerPart.substring(0, integerPart.length - 3);
      integerPart = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
    }
    return integerPart + decimalPart;
  };

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
    } else {
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
    };
  }, [isOpen, onClose, isDeleteModalOpen]);

  useEffect(() => {
    if (isOpen) {
      setIsViewMode(!!invoiceToEdit);

      if (invoiceToEdit) {
        setFormData({
          invoiceNo: invoiceToEdit.invoiceNo || '',
          date: invoiceToEdit.date ? new Date(invoiceToEdit.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          dueDate: invoiceToEdit.dueDate ? new Date(invoiceToEdit.dueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          companyName: invoiceToEdit.companyName || '',
          customerId: invoiceToEdit.customerId || '',
          productId: invoiceToEdit.productId ? (Array.isArray(invoiceToEdit.productId) ? invoiceToEdit.productId : [invoiceToEdit.productId]) : [],
          items: invoiceToEdit.items || [],
          status: invoiceToEdit.status || 'Pending',
          employee: invoiceToEdit.employee || currentUser?.profile?.name || '',
          advancePaymentDate: invoiceToEdit.advancePaymentDate ? new Date(invoiceToEdit.advancePaymentDate).toISOString().split('T')[0] : '',
          advancePaymentAmount: invoiceToEdit.advancePaymentAmount ? formatIndianNumber(invoiceToEdit.advancePaymentAmount.toString()) : '',
        });
      } else {
        initFreshForm();
      }
    }
  }, [isOpen, invoiceToEdit, currentUser, invoices]);

  const initFreshForm = () => {
    const year = new Date().getFullYear();
    let nextNum = 1;
    if (invoices && invoices.length > 0) {
      const currentYearInvs = invoices.filter(i => i.invoiceNo && i.invoiceNo.startsWith(`INV-${year}-`));
      if (currentYearInvs.length > 0) {
        const nums = currentYearInvs.map(i => {
          const parts = i.invoiceNo.split('-');
          return parseInt(parts[2], 10) || 0;
        });
        nextNum = Math.max(...nums) + 1;
      }
    }
    const nextInvoiceNo = `INV-${year}-${String(nextNum).padStart(3, '0')}`;

    setFormData({
      invoiceNo: nextInvoiceNo,
      companyName: '',
      customerId: '',
      productId: [],
      items: [],
      status: 'Pending',
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      employee: currentUser?.profile?.name || '',
      advancePaymentDate: '',
      advancePaymentAmount: '',
    });
  };

  const productHistories = React.useMemo(() => {
    if (!invoices || invoices.length === 0 || !formData.items || formData.items.length === 0) return [];

    const histories = [];
    const currentProductIds = [...new Set(formData.items.map(item => item.productId).filter(Boolean))];

    currentProductIds.forEach(prodId => {
      const matchingInvoices = invoices.filter(i => {
        if (invoiceToEdit && i.id === invoiceToEdit.id) return false;

        if (i.items && i.items.length > 0) {
          return i.items.some(item => item.productId === prodId);
        }
        return false;
      });

      if (matchingInvoices.length > 0) {
        matchingInvoices.sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
        const lastInvoice = matchingInvoices[0];

        let lastItemDetails = null;
        if (lastInvoice.items && lastInvoice.items.length > 0) {
          lastItemDetails = lastInvoice.items.find(item => item.productId === prodId);
        }

        if (lastItemDetails) {
          histories.push({
            productId: prodId,
            invoiceNo: lastInvoice.invoiceNo,
            date: lastInvoice.date || lastInvoice.createdAt,
            specs: lastItemDetails.specs,
            qty: lastItemDetails.qty,
            price: lastItemDetails.price,
            fullInvoice: lastInvoice
          });
        }
      }
    });

    return histories;
  }, [formData.items, invoices, invoiceToEdit]);

  if (!isOpen) return null;

  const handleDeleteClick = () => setIsDeleteModalOpen(true);

  const confirmDelete = async () => {
    try {
      await api.delete(`/invoices/${invoiceToEdit.id}`);
      toast.success('Estimate deleted successfully!');
      setIsDeleteModalOpen(false);
      onClose();
    } catch (err) {
      console.error('Error deleting invoice:', err);
      toast.error('Failed to delete estimate.');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'productId') {
      setFormData(prev => {
        const isEmployeeEditing = invoiceToEdit && currentUser?.profile?.designation === 'Employee';
        const autoEmployee = isEmployeeEditing ? currentUser?.profile?.name : prev.employee;

        const newItems = value.map(id => {
          const existing = (prev.items || []).find(item => item.productId === id);
          if (existing) return existing;

          const product = products.find(p => p.id === id);
          const defaultPrice = product?.unitPrice ? formatIndianNumber(product.unitPrice) : '';

          return { productId: id, specs: '', qty: '', price: defaultPrice };
        });
        return { ...prev, productId: value, items: newItems, ...(isEmployeeEditing && { employee: autoEmployee }) };
      });
      return;
    }

    let upperValue = value;
    if (typeof value === 'string' && !['date', 'dueDate', 'employee'].includes(name)) {
      if (name === 'customerId') {
        upperValue = value;
      } else {
        upperValue = value.toUpperCase();
      }
    }

    setFormData((prev) => {
      const isEmployeeEditing = invoiceToEdit && currentUser?.profile?.designation === 'Employee';
      const autoEmployee = isEmployeeEditing ? currentUser?.profile?.name : prev.employee;
      const newData = { ...prev, [name]: upperValue, ...(isEmployeeEditing && { employee: autoEmployee }) };

      if (name === 'companyName') {
        newData.productId = [];
        newData.items = [];
        if (upperValue) {
          const matchedCustomer = customers.find(c => (c.name || '').toUpperCase() === upperValue);
          if (matchedCustomer) {
            newData.customerId = matchedCustomer.id;
          }
        }
      }

      return newData;
    });
  };

  const handleItemChange = (index, field, value) => {
    setFormData(prev => {
      const isEmployeeEditing = invoiceToEdit && currentUser?.profile?.designation === 'Employee';
      const autoEmployee = isEmployeeEditing ? currentUser?.profile?.name : prev.employee;
      const newItems = [...(prev.items || [])];

      if (field === 'qty' || field === 'price') {
        newItems[index] = { ...newItems[index], [field]: formatIndianNumber(value) };
      } else {
        newItems[index] = { ...newItems[index], [field]: typeof value === 'string' ? value.toUpperCase() : value };
      }

      return { ...prev, items: newItems, ...(isEmployeeEditing && { employee: autoEmployee }) };
    });
  };

  const handleSendWhatsapp = () => {
    if (whatsappInfo.phone) {
      const url = `https://wa.me/${whatsappInfo.phone}?text=${encodeURIComponent(whatsappInfo.message)}`;
      window.open(url, '_blank');
    }
    setShowWhatsappPrompt(false);
    onClose();
  };

  const handleSkipWhatsapp = () => {
    setShowWhatsappPrompt(false);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.companyName || !formData.customerId || !formData.productId || formData.productId.length === 0 || !formData.date) {
      toast.error('Please fill in all required fields.');
      return;
    }

    if (!formData.items || formData.items.length === 0) {
      toast.error('Please add at least one product.');
      return;
    }

    const invalidItems = formData.items.some(item => !item.productId || !item.specs || !item.qty || !item.price);
    if (invalidItems) {
      toast.error('Please complete all product details.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let totalAmount = 0;
      const processedItems = (formData.items || []).map(item => {
        const qty = Number((item.qty || '0').toString().replace(/,/g, ''));
        const price = Number((item.price || '0').toString().replace(/,/g, ''));
        totalAmount += (qty * price);
        return {
          ...item,
          qty,
          price
        };
      });

      const payload = {
        ...formData,
        dueDate: formData.date, // Match due date to date since UI no longer has due date
        status: 'Pending',
        items: processedItems,
        amount: totalAmount,
        advancePaymentAmount: formData.advancePaymentAmount ? Number(formData.advancePaymentAmount.toString().replace(/,/g, '')) : 0,
        gst: 0,
      };

      setIsViewMode(false);

      if (!invoiceToEdit) {
        payload.createdAt = new Date().toISOString();
      }

      if (invoiceToEdit) {
        const res = await api.put(`/invoices/${invoiceToEdit.id}`, payload);
        if (onInvoiceUpdated) onInvoiceUpdated(res.data);
        toast.success('Estimate updated successfully!');
      } else {
        const res = await api.post('/invoices', payload);
        if (onInvoiceCreated) onInvoiceCreated(res.data);
        toast.success('Estimate created successfully!');

        let phone = '';
        let message = `Hello, here are the details for your Final Estimate:\n\n*Estimate No:* ${res.data.invoiceNo}\n*Date:* ${new Date(res.data.date).toLocaleDateString()}\n*Company:* ${res.data.companyName}\n\n*Items:*\n`;
        (res.data.items || []).forEach((item, index) => {
          const productName = products.find(p => p.id === item.productId)?.name || 'Product';
          const amount = (item.qty * item.price);
          message += `${index + 1}. *${productName}*\n   Specs: ${item.specs}\n   Qty: ${Number(item.qty).toLocaleString('en-IN')}\n   Price: ₹${Number(item.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n   Amount: ₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
        });
        message += `\n*Total Amount:* ₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        if (payload.advancePaymentAmount > 0) {
          message += `\n*Advance Amount:* ₹${payload.advancePaymentAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          if (payload.advancePaymentDate) {
            message += `\n*Received Date:* ${new Date(payload.advancePaymentDate).toLocaleDateString('en-IN')}`;
          }
          const remainingAmount = totalAmount - payload.advancePaymentAmount;
          message += `\n*Remaining Amount:* ₹${remainingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }

        const customer = customers.find(c => c.id === formData.customerId);
        phone = customer?.mobile || customer?.phone || '';

        if (phone) {
          let formattedPhone = phone.replace(/\D/g, '');
          if (formattedPhone.length === 10) {
            formattedPhone = '91' + formattedPhone;
          } else if (formattedPhone.startsWith('0')) {
            formattedPhone = '91' + formattedPhone.substring(1);
          }
          setWhatsappInfo({ phone: formattedPhone, message });
          setShowWhatsappPrompt(true);
          setLoading(false);
          return;
        }
      }
      onClose();
    } catch (err) {
      console.error('Error saving invoice:', err);
      setError('Failed to save estimate. Please try again.');
      toast.error('Failed to save estimate.');
    } finally {
      setLoading(false);
    }
  };

  const customerOptions = (customers || []).map(c => ({
    value: c.id,
    label: c.contactPerson ? `${c.contactPerson} (${c.name})` : c.name
  }));

  const companyOptions = Array.from(new Set((customers || []).map(c => c.name).filter(Boolean))).map(name => ({
    value: name,
    label: name,
  }));

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget && typeof onClose === "function") onClose(); }}>
      <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl flex flex-col max-h-[calc(100dvh-4rem)] md:max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-lg font-bold text-gray-900">{invoiceToEdit ? (isViewMode ? 'View Final Estimate' : 'Edit Final Estimate') : 'Create Final Estimate'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {error && <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 space-y-0">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estimate No <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="invoiceNo"
                readOnly
                value={formData.invoiceNo}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name <span className="text-red-500">*</span></label>
              <CustomSelect
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                options={companyOptions}
                placeholder="Select Company"
                required
                disabled={isViewMode}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer <span className="text-red-500">*</span></label>
              <CustomSelect
                name="customerId"
                value={formData.customerId}
                onChange={handleChange}
                options={customerOptions}
                placeholder="Select Customer"
                required
                disabled={true}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Name <span className="text-red-500">*</span></label>
              <CustomSelect
                name="productId"
                value={formData.productId}
                onChange={handleChange}
                options={(formData.companyName ? products.filter(p => p.companyName === formData.companyName) : products).map(p => ({ value: p.id, label: p.name }))}
                placeholder="Select Products"
                required
                disabled={isViewMode || !formData.companyName}
                isMulti={true}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date <span className="text-red-500">*</span></label>
              <input
                type="date"
                name="date"
                value={formData.date || ''}
                onChange={handleChange}
                required
                disabled={isViewMode}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#1b2f63]/50 focus:border-[#1b2f63] transition-colors ${isViewMode ? 'bg-gray-50 border-gray-300 text-gray-500 cursor-not-allowed' : 'border-gray-300'}`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
              <CustomSelect
                name="employee"
                value={formData.employee}
                onChange={handleChange}
                disabled={isViewMode || (!!invoiceToEdit && currentUser?.profile?.designation === 'Employee')}
                options={[
                  { label: 'Select Employee', value: '' },
                  ...(users || []).map(user => ({ label: user.name, value: user.name }))
                ]}
              />
            </div>
          </div>

          {productHistories.length > 0 && (
            <div className="mt-4 p-4 bg-[#1b2f63]/10 border border-[#1b2f63]/30 rounded-lg">
              <h4 className="text-sm font-bold text-[#1b2f63] mb-3 flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Previous Estimate History
              </h4>
              <div className="space-y-3">
                {productHistories.map((history, idx) => {
                  const productName = products.find(p => p.id === history.productId)?.name || history.productId;
                  return (
                    <div key={idx} className="text-sm text-gray-700 bg-white p-3 rounded-md border border-[#1b2f63]/20 shadow-sm">
                      <div className="font-bold text-gray-900 mb-2 flex justify-between items-center">
                        <span>{productName}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">{history.invoiceNo}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div><span className="text-gray-500 block text-xs">Date</span> <span className="font-medium">{new Date(history.date).toLocaleDateString()}</span></div>
                        <div><span className="text-gray-500 block text-xs">Quantity</span> <span className="font-medium">{history.qty}</span></div>
                        <div><span className="text-gray-500 block text-xs">Unit Price</span> <span className="font-medium">₹{history.price}</span></div>
                        <div className="col-span-2 md:col-span-4"><span className="text-gray-500 block text-xs">Product Specs</span> <span className="font-medium">{history.specs || 'N/A'}</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {formData.items && formData.items.length > 0 && (
            <div className="mt-6 space-y-6">
              {formData.items.map((item, index) => {
                const productName = products.find(p => p.id === item.productId)?.name || 'Product';
                return (
                  <div key={index} className="border-t border-gray-100 pt-4 relative group">
                    <h3 className="text-sm font-bold text-[#E8A33D] mb-3 uppercase">{productName}</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 space-y-0">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Product Specs <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          required
                          value={item.specs}
                          onChange={(e) => handleItemChange(index, 'specs', e.target.value)}
                          disabled={isViewMode}
                          className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1b2f63]/50 focus:border-[#1b2f63] transition-colors ${isViewMode ? 'bg-gray-50 border-gray-300 text-gray-500 cursor-not-allowed' : 'border-gray-300'}`}
                          placeholder="e.g. 350 GSM Duplex · 5 Color Offset"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Quantity <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          required
                          min="1"
                          value={isViewMode && item.qty ? Number(item.qty).toLocaleString('en-IN') : item.qty}
                          onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                          disabled={isViewMode}
                          className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1b2f63]/50 focus:border-[#1b2f63] transition-colors ${isViewMode ? 'bg-gray-50 border-gray-300 text-gray-500 cursor-not-allowed' : 'border-gray-300'}`}
                          placeholder="e.g. 50000"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price (₹) <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          required
                          step="0.01"
                          min="0"
                          value={isViewMode && item.price ? Number(item.price).toLocaleString('en-IN', { maximumFractionDigits: 2 }) : item.price}
                          onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                          disabled={isViewMode}
                          className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1b2f63]/50 focus:border-[#1b2f63] transition-colors ${isViewMode ? 'bg-gray-50 border-gray-300 text-gray-500 cursor-not-allowed' : 'border-gray-300'}`}
                          placeholder="e.g. 4.20"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {formData.items && formData.items.length > 0 && (
            <div className="mt-6 border-t border-gray-200 pt-6 space-y-4">
              <div className="flex justify-between items-center text-lg font-bold text-gray-900">
                <span>Grand Total</span>
                <span>₹{formData.items.reduce((sum, item) => {
                  const q = Number((item.qty || '0').toString().replace(/,/g, ''));
                  const p = Number((item.price || '0').toString().replace(/,/g, ''));
                  return sum + (q * p);
                }, 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Advance Payment Date</label>
                  <input
                    type="date"
                    name="advancePaymentDate"
                    value={formData.advancePaymentDate || ''}
                    onChange={handleChange}
                    disabled={isViewMode}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#1b2f63]/50 focus:border-[#1b2f63] transition-colors ${isViewMode ? 'bg-gray-50 border-gray-300 text-gray-500 cursor-not-allowed' : 'border-gray-300'}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Advance Payment Amount (₹)</label>
                  <input
                    type="text"
                    name="advancePaymentAmount"
                    value={isViewMode && formData.advancePaymentAmount ? Number(formData.advancePaymentAmount.toString().replace(/,/g, '')).toLocaleString('en-IN') : formData.advancePaymentAmount || ''}
                    onChange={(e) => {
                      const val = formatIndianNumber(e.target.value);
                      setFormData(prev => ({ ...prev, advancePaymentAmount: val }));
                    }}
                    disabled={isViewMode}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1b2f63]/50 focus:border-[#1b2f63] transition-colors ${isViewMode ? 'bg-gray-50 border-gray-300 text-gray-500 cursor-not-allowed' : 'border-gray-300'}`}
                    placeholder="e.g. 10000"
                  />
                </div>
              </div>
            </div>
          )}

          <div className={`mt-8 flex flex-col-reverse sm:flex-row ${invoiceToEdit ? 'sm:justify-between' : 'sm:justify-end'} items-stretch sm:items-center gap-3 border-t border-gray-100 pt-5`}>
            {invoiceToEdit && (
              <button
                type="button"
                onClick={handleDeleteClick}
                disabled={loading}
                className="flex items-center justify-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-transparent rounded-md hover:bg-red-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/50 w-full sm:w-auto"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                <span className="whitespace-nowrap">Delete Estimate</span>
              </button>
            )}
            <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full sm:w-auto justify-center sm:justify-end">
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
                    className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-white bg-[#1b2f63] rounded-md hover:bg-[#112046] transition-colors whitespace-nowrap"
                  >
                    Edit Estimate
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
                    className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-white bg-[#1b2f63] rounded-md hover:bg-[#112046] transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    {loading ? 'Saving...' : (invoiceToEdit ? 'Save Changes' : 'Create Estimate')}
                  </button>
                </>
              )}
            </div>
          </div>
        </form>
      </div>

      {showWhatsappPrompt && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Send on WhatsApp?</h3>
            <p className="text-sm text-gray-500 mb-6">Would you like to send this estimate to the client on WhatsApp?</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleSkipWhatsapp}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                No, Skip
              </button>
              <button
                onClick={handleSendWhatsapp}
                className="px-4 py-2 text-sm font-medium text-white bg-[#25D366] rounded-md hover:bg-[#20b858] transition-colors flex items-center"
              >
                Yes, Send
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Estimate"
        message="Are you sure you want to delete this estimate? This action cannot be undone."
      />
    </div>
  );

  return createPortal(modalContent, document.body);
}
