import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2 } from 'lucide-react';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import toast from 'react-hot-toast';
import api from '../lib/api';
import CustomSelect from './CustomSelect';
import { generateQuotationPDF } from '../lib/pdfGenerator';
import { useAuth } from '../contexts/AuthContext';

export default function CreateInvoiceModal({ isOpen, onClose, onInvoiceCreated, onInvoiceUpdated, onInvoiceDeleted, invoices = [], invoiceToEdit, startInEditMode }) {
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState({
    invoiceNo: '',
    companyName: '',
    customerId: '',
    productId: [],
    items: [],
    status: 'Pending',
    date: new Date().toISOString().split('T')[0],
    employee: currentUser?.profile?.name || '',
    amount: 0,
    gst: 0,
    dueDate: new Date().toISOString().split('T')[0], // keep for compatibility
    advanceDate: '',
    advanceAmount: ''
  });

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
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

  const handleOpenWhatsappFromView = async () => {
    const customer = customers.find(c => c.id === formData.customerId);
    const phone = customer?.mobile || customer?.phone || '';

    if (!phone) {
      toast.error('Customer phone number not found.');
      return;
    }

    const custMap = {};
    customers.forEach(c => custMap[c.id] = c);
    const prodMap = {};
    products.forEach(p => prodMap[p.id] = p);

    try {
      const pdfInvoice = { ...invoiceToEdit, quotationNo: invoiceToEdit.invoiceNo };
      await generateQuotationPDF(pdfInvoice, custMap, prodMap);
    } catch (pdfErr) {
      console.error('Error generating PDF:', pdfErr);
      toast.error('Failed to generate PDF.');
    }

    let message = `Hello, here are the details for your Final Estimate:\n\n*Estimate No:* ${formData.invoiceNo}\n*Date:* ${new Date(formData.date).toLocaleDateString('en-IN')}\n*Company:* ${formData.companyName}\n\n*Items:*\n`;
    let totalAmount = 0;
    (formData.items || []).forEach((item, index) => {
      const productName = products.find(p => p.id === item.productId)?.name || 'Product';
      const qty = Number((item.qty || '0').toString().replace(/,/g, ''));
      const price = Number((item.price || '0').toString().replace(/,/g, ''));
      const amount = (qty * price);
      totalAmount += amount;
      message += `${index + 1}. *${productName}*\n   Specs: ${item.specs}\n   Qty: ${qty.toLocaleString('en-IN')}\n   Price: ₹${price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n   Amount: ₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
    });
    message += `\n*Total Amount:* ₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\nPlease find the attached PDF for more details.`;

    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.length === 10) formattedPhone = '91' + formattedPhone;
    else if (formattedPhone.startsWith('0')) formattedPhone = '91' + formattedPhone.substring(1);
    
    setWhatsappInfo({ phone: formattedPhone, message });
    setShowWhatsappPrompt(true);
  };

  useEffect(() => {
    if (isOpen) {
      setFetching(true);
      Promise.all([
        api.get('/customers'),
        api.get('/products'),
        api.get('/users')
      ]).then(([custRes, prodRes, usersRes]) => {
        setCustomers(custRes.data);
        setProducts(prodRes.data);
        setUsers(usersRes.data);
        setFetching(false);
      }).catch(err => {
        console.error('Error fetching data:', err);
        toast.error('Failed to load data.');
        setFetching(false);
      });

      setIsViewMode(!startInEditMode && !!invoiceToEdit);

      if (invoiceToEdit) {
        setFormData({
          invoiceNo: invoiceToEdit.invoiceNo || '',
          date: invoiceToEdit.date ? new Date(invoiceToEdit.date).toISOString().split('T')[0] : (invoiceToEdit.createdAt ? new Date(invoiceToEdit.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
          companyName: invoiceToEdit.companyName || '',
          customerId: invoiceToEdit.customerId || '',
          productId: invoiceToEdit.productId ? (Array.isArray(invoiceToEdit.productId) ? invoiceToEdit.productId : [invoiceToEdit.productId]) : [],
          items: invoiceToEdit.items || [],
          status: invoiceToEdit.status || 'Pending',
          employee: invoiceToEdit.employee || currentUser?.profile?.name || '',
          amount: invoiceToEdit.amount || 0,
          gst: invoiceToEdit.gst || 0,
          dueDate: invoiceToEdit.dueDate || new Date().toISOString().split('T')[0],
          advanceDate: invoiceToEdit.advanceDate || '',
          advanceAmount: invoiceToEdit.advanceAmount || ''
        });
      } else {
        initFreshForm();
      }
    }
  }, [isOpen, invoices, invoiceToEdit, startInEditMode, currentUser]);

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
      employee: currentUser?.profile?.name || '',
      amount: 0,
      gst: 0,
      dueDate: new Date().toISOString().split('T')[0],
      advanceDate: '',
      advanceAmount: ''
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'productId') {
      setFormData(prev => {
        const newItems = value.map(id => {
          const existing = (prev.items || []).find(item => item.productId === id);
          if (existing) return existing;
          const product = products.find(p => p.id === id);
          const defaultPrice = product?.unitPrice ? formatIndianNumber(product.unitPrice) : '';
          return { productId: id, specs: '', qty: '', price: defaultPrice };
        });
        return { ...prev, productId: value, items: newItems };
      });
      return;
    }

    let upperValue = value;
    if (typeof value === 'string' && !['date', 'dueDate', 'employee'].includes(name)) {
      if (name === 'customerId') upperValue = value;
      else upperValue = value.toUpperCase();
    }
    
    setFormData((prev) => {
      const newData = { ...prev, [name]: upperValue };
      if (name === 'companyName') {
        newData.productId = [];
        newData.items = [];
        if (upperValue) {
          const matchedCustomer = customers.find(c => (c.name || '').toUpperCase() === upperValue);
          if (matchedCustomer) newData.customerId = matchedCustomer.id;
        }
      }
      return newData;
    });
  };

  const handleItemChange = (index, field, value) => {
    setFormData(prev => {
      const newItems = [...(prev.items || [])];
      if (field === 'qty' || field === 'price') {
        newItems[index] = { ...newItems[index], [field]: formatIndianNumber(value) };
      } else {
        newItems[index] = { ...newItems[index], [field]: typeof value === 'string' ? value.toUpperCase() : value };
      }
      return { ...prev, items: newItems };
    });
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
      let totalCalculatedAmount = 0;
      const parsedItems = formData.items.map(item => {
        const q = Number((item.qty || '0').toString().replace(/,/g, ''));
        const p = Number((item.price || '0').toString().replace(/,/g, ''));
        totalCalculatedAmount += (q * p);
        return { ...item, qty: q, price: p };
      });

      const payload = {
        ...formData,
        items: parsedItems,
        amount: totalCalculatedAmount,
        dueDate: formData.date, // Sync dueDate to date so Accounts logic holds
        advanceAmount: formData.advanceAmount ? Number(formData.advanceAmount.toString().replace(/,/g, '')) : 0,
        advanceDate: formData.advanceDate || null
      };

      if (invoiceToEdit) {
        const res = await api.put(`/invoices/${invoiceToEdit.id}`, payload);
        if (onInvoiceUpdated) onInvoiceUpdated(res.data);
        toast.success('Final Estimate updated successfully!');
      } else {
        const res = await api.post('/invoices', payload);
        if (onInvoiceCreated) onInvoiceCreated(res.data);
        toast.success('Final Estimate created successfully!');

        // PDF and WhatsApp Logic
        const custMap = {};
        customers.forEach(c => custMap[c.id] = c);
        const prodMap = {};
        products.forEach(p => prodMap[p.id] = p);

        try {
          const pdfInvoice = { ...res.data, quotationNo: res.data.invoiceNo };
          await generateQuotationPDF(pdfInvoice, custMap, prodMap);
        } catch (pdfErr) {
          console.error('Error generating PDF:', pdfErr);
        }

        const customer = customers.find(c => c.id === formData.customerId);
        const phone = customer?.mobile || customer?.phone || '';

        if (phone) {
          let message = `Hello, here are the details for your Final Estimate:\n\n*Estimate No:* ${res.data.invoiceNo}\n*Date:* ${new Date(res.data.date).toLocaleDateString()}\n*Company:* ${res.data.companyName}\n\n*Items:*\n`;
          let totalAmount = 0;
          parsedItems.forEach((item, index) => {
            const productName = products.find(p => p.id === item.productId)?.name || 'Product';
            const amount = (item.qty * item.price);
            totalAmount += amount;
            message += `${index + 1}. *${productName}*\n   Specs: ${item.specs}\n   Qty: ${Number(item.qty).toLocaleString('en-IN')}\n   Price: ₹${Number(item.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n   Amount: ₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
          });
          message += `\n*Total Amount:* ₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\nPlease find the attached PDF for more details.`;

          let formattedPhone = phone.replace(/\D/g, '');
          if (formattedPhone.length === 10) formattedPhone = '91' + formattedPhone;
          else if (formattedPhone.startsWith('0')) formattedPhone = '91' + formattedPhone.substring(1);
          
          setWhatsappInfo({ phone: formattedPhone, message });
          setShowWhatsappPrompt(true);
          setLoading(false);
          return;
        }
      }
      onClose();
    } catch (err) {
      console.error('Error saving:', err);
      toast.error('Failed to save Final Estimate.');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    // Delete logic omitted, as delete happens from Accounts page, not inside modal, but if you want:
    setIsDeleteModalOpen(false);
  };

  const customerOptions = customers.map(c => ({
    value: c.id,
    label: c.contactPerson ? `${c.contactPerson} (${c.name})` : c.name
  }));

  const companyOptions = Array.from(new Set(customers.map(c => c.name).filter(Boolean))).map(name => ({
    value: name,
    label: name,
  }));

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl flex flex-col max-h-[calc(100dvh-4rem)] md:max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-lg font-bold text-gray-900">{invoiceToEdit ? (isViewMode ? 'View Final Estimate' : 'Edit Final Estimate') : 'Create Final Estimate'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {fetching ? (
          <div className="p-8 text-center text-gray-500">Loading form data...</div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="p-6 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-gray-300">
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
                  disabled={isViewMode}
                  options={[
                    { label: 'Select Employee', value: '' },
                    ...users.map(user => ({ label: user.name, value: user.name }))
                  ]}
                />
              </div>
            </div>

            {formData.items && formData.items.length > 0 && (
              <div className="mt-6 space-y-6">
                {formData.items.map((item, index) => {
                  const productName = products.find(p => p.id === item.productId)?.name || 'Product';
                  return (
                    <div key={index} className="border-t border-gray-100 pt-4 relative group">
                      <h3 className="text-sm font-bold text-[#E8A33D] mb-3">{productName}</h3>
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
              <div className="mt-6 pt-5 border-t border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Grand Total (₹)</label>
                    <div className="text-lg font-bold text-gray-900 mt-2">
                      ₹{formData.items.reduce((sum, item) => sum + (Number((item.qty || '0').toString().replace(/,/g, '')) * Number((item.price || '0').toString().replace(/,/g, ''))), 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Advance Date</label>
                    <input
                      type="date"
                      name="advanceDate"
                      value={formData.advanceDate || ''}
                      onChange={handleChange}
                      disabled={isViewMode}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#1b2f63]/50 focus:border-[#1b2f63] transition-colors ${isViewMode ? 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed' : 'border-gray-300 bg-white'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Advance Amount (₹)</label>
                    <input
                      type="text"
                      name="advanceAmount"
                      value={isViewMode && formData.advanceAmount ? Number(formData.advanceAmount).toLocaleString('en-IN') : formData.advanceAmount}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData(prev => ({ ...prev, advanceAmount: formatIndianNumber(val) }));
                      }}
                      disabled={isViewMode}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#1b2f63]/50 focus:border-[#1b2f63] transition-colors ${isViewMode ? 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed' : 'border-gray-300 bg-white'}`}
                      placeholder="e.g. 5000"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className={`mt-8 flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-3 border-t border-gray-100 pt-5`}>
              <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full sm:w-auto justify-center sm:justify-end">
                {isViewMode ? (
                  <>
                    <button
                      type="button"
                      onClick={handleOpenWhatsappFromView}
                      className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-[#25D366] rounded-md hover:bg-[#20b858] transition-colors whitespace-nowrap"
                    >
                      WhatsApp
                    </button>
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
                      Edit Final Estimate
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
                      {loading ? 'Saving...' : (invoiceToEdit ? 'Save Changes' : 'Create Final Estimate')}
                    </button>
                  </>
                )}
              </div>
            </div>
          </form>
        )}
      </div>

      {showWhatsappPrompt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6 text-center">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Send on WhatsApp?</h3>
            <p className="text-sm text-gray-500 mb-6">Would you like to send this to the client on WhatsApp?</p>
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
    </div>
  );

  return createPortal(modalContent, document.body);
}
