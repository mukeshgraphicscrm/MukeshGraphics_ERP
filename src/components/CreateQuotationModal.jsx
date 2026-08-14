import React, { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import toast from 'react-hot-toast';
import api from '../lib/api';
import CustomSelect from './CustomSelect';
import { generateQuotationPDF } from '../lib/pdfGenerator';

export default function CreateQuotationModal({ isOpen, onClose, onQuotationAdded, onQuotationUpdated, onQuotationDeleted, quotations = [], quotationToEdit, startInEditMode }) {
  const [formData, setFormData] = useState({
    quotationNo: '',
    companyName: '',
    customerId: '',
    productId: '',
    leadId: '',
    specs: '',
    qty: '',
    price: '',
    status: 'Draft',
  });

  const [activeTab, setActiveTab] = useState('Customer Quotation');
  const [savedForms, setSavedForms] = useState({});

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState(null);

  const [isViewMode, setIsViewMode] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

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
      setFetching(true);
      Promise.all([
        api.get('/customers'),
        api.get('/products'),
        api.get('/leads')
      ]).then(([custRes, prodRes, leadsRes]) => {
        setCustomers(custRes.data);
        setProducts(prodRes.data);
        setLeads(leadsRes.data);
        setFetching(false);
      }).catch(err => {
        console.error('Error fetching data:', err);
        toast.error('Failed to load customers, products, and leads.');
        setFetching(false);
      });

      setIsViewMode(!startInEditMode && !!quotationToEdit);

      if (quotationToEdit) {
        setActiveTab(quotationToEdit.quotationType || 'Customer Quotation');
        setFormData({
          quotationNo: quotationToEdit.quotationNo || '',
          companyName: quotationToEdit.companyName || '',
          customerId: quotationToEdit.customerId || '',
          leadId: quotationToEdit.leadId || '',
          productId: quotationToEdit.productId ? (Array.isArray(quotationToEdit.productId) ? quotationToEdit.productId : [quotationToEdit.productId]) : [],
          items: quotationToEdit.items || [
            {
              productId: quotationToEdit.productId,
              specs: quotationToEdit.specs || '',
              qty: formatIndianNumber(quotationToEdit.qty) || '',
              price: formatIndianNumber(quotationToEdit.price) || ''
            }
          ].filter(i => i.productId),
          status: quotationToEdit.status || 'Draft',
        });
      } else {
        setSavedForms({});
        initFreshForm('Customer Quotation');
      }
    }
  }, [isOpen, quotations, quotationToEdit, startInEditMode]);

  const initFreshForm = (tab = 'Customer Quotation') => {
    const year = new Date().getFullYear();
    let nextNum = 1;
    if (quotations && quotations.length > 0) {
      const currentYearQtns = quotations.filter(q => q.quotationNo && q.quotationNo.startsWith(`QTN-${year}-`));
      if (currentYearQtns.length > 0) {
        const nums = currentYearQtns.map(q => {
          const parts = q.quotationNo.split('-');
          return parseInt(parts[2], 10) || 0;
        });
        nextNum = Math.max(...nums) + 1;
      }
    }
    const nextQuotationNo = `QTN-${year}-${String(nextNum).padStart(3, '0')}`;

    setActiveTab(tab);
    setFormData({
      quotationNo: nextQuotationNo,
      companyName: '',
      customerId: '',
      leadId: '',
      productId: [],
      items: [],
      status: 'Draft',
    });
  };

  const handleTabSwitch = (newTab) => {
    if (newTab === activeTab) return;

    const updatedSavedForms = { ...savedForms, [activeTab]: formData };
    setSavedForms(updatedSavedForms);

    if (updatedSavedForms[newTab]) {
      setActiveTab(newTab);
      setFormData(updatedSavedForms[newTab]);
    } else {
      initFreshForm(newTab);
    }
  };

  if (!isOpen) return null;


  const handleDeleteClick = () => setIsDeleteModalOpen(true);

  const confirmDelete = async () => {
    try {
      await api.delete(`/quotations/${quotationToEdit.id}`);
      if (onQuotationDeleted) onQuotationDeleted(quotationToEdit);
      toast.success('Quotation deleted successfully!');
      setIsDeleteModalOpen(false);
      onClose();
    } catch (err) {
      console.error('Error deleting quotation:', err);
      toast.error('Failed to delete quotation.');
    }
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

    const upperValue = typeof value === 'string' && !['customerId', 'leadId'].includes(name) ? value.toUpperCase() : value;
    setFormData((prev) => {
      const newData = { ...prev, [name]: upperValue };

      // Auto-fill customer if company name is selected
      if (name === 'companyName') {
        if (activeTab === 'Customer Quotation') {
          newData.productId = [];
          newData.items = [];
        }
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
    setLoading(true);
    setError(null);
    try {
      const payload = {
        ...formData,
        items: (formData.items || []).map(item => ({
          ...item,
          qty: Number((item.qty || '0').toString().replace(/,/g, '')),
          price: Number((item.price || '0').toString().replace(/,/g, '')),
        }))
      };
      setIsViewMode(!startInEditMode && !!quotationToEdit);

      if (quotationToEdit) {
        const res = await api.put(`/quotations/${quotationToEdit.id}`, payload);
        if (onQuotationUpdated) onQuotationUpdated(res.data);
        toast.success('Quotation updated successfully!');
      } else {
        const res = await api.post('/quotations', payload);
        if (onQuotationAdded) onQuotationAdded(res.data);
        toast.success('Quotation created successfully!');

        // Automatically generate PDF for the new quotation
        const custMap = {};
        customers.forEach(c => custMap[c.id] = c);
        const prodMap = {};
        products.forEach(p => prodMap[p.id] = p);

        try {
          await generateQuotationPDF(res.data, custMap, prodMap);
        } catch (pdfErr) {
          console.error('Error generating PDF:', pdfErr);
          toast.error('Quotation created, but failed to generate PDF.');
        }
      }
      onClose();
    } catch (err) {
      console.error('Error saving quotation:', err);
      setError('Failed to save quotation. Please try again.');
      toast.error('Failed to save quotation.');
    } finally {
      setLoading(false);
    }
  };

  const statusOptions = [
    { value: 'Draft', label: 'Draft' },
    { value: 'Sent', label: 'Sent' },
    { value: 'Negotiation', label: 'Negotiation' },
    { value: 'Approved', label: 'Approved' },
    { value: 'Rejected', label: 'Rejected' },
  ];

  const customerOptions = customers.map(c => ({
    value: c.id,
    label: c.contactPerson ? `${c.contactPerson} (${c.name})` : c.name
  }));

  const companyOptions = Array.from(new Set(products.map(p => p.companyName).filter(Boolean))).map(name => ({
    value: name,
    label: name,
  }));

  const leadOptions = leads.map(l => ({
    value: l.id,
    label: `${l.contactPerson || 'Unknown Contact'} ${l.company ? `(${l.company})` : ''}`.trim()
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-lg font-bold text-gray-900">{quotationToEdit ? (isViewMode ? 'View Quotation' : 'Edit Quotation') : 'Create Quotation'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-gray-100 shrink-0">
          <button
            type="button"
            onClick={() => handleTabSwitch('Customer Quotation')}
            className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-colors ${activeTab === 'Customer Quotation' ? 'border-[#1b2f63] text-[#1b2f63]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Customer Quotation
          </button>
          <button
            type="button"
            onClick={() => handleTabSwitch('Lead Quotation')}
            className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-colors ${activeTab === 'Lead Quotation' ? 'border-[#1b2f63] text-[#1b2f63]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Lead Quotation
          </button>
        </div>

        {fetching ? (
          <div className="p-8 text-center text-gray-500">Loading form data...</div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-gray-300">
            {error && <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 space-y-0">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quotation No *</label>
                <input
                  type="text"
                  name="quotationNo"
                  readOnly
                  value={formData.quotationNo}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                {activeTab === 'Lead Quotation' ? (
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    required
                    disabled={isViewMode}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors ${isViewMode ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`}
                    placeholder="Enter Company Name"
                  />
                ) : (
                  <CustomSelect
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    options={companyOptions}
                    placeholder="Select Company"
                    required
                    disabled={isViewMode}
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
                {activeTab === 'Lead Quotation' ? (
                  <input
                    type="text"
                    name="customerId"
                    value={formData.customerId}
                    onChange={handleChange}
                    required
                    disabled={isViewMode}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors ${isViewMode ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`}
                    placeholder="Enter Customer Name"
                  />
                ) : (
                  <CustomSelect
                    name="customerId"
                    value={formData.customerId}
                    onChange={handleChange}
                    options={customerOptions}
                    placeholder="Select Customer"
                    required
                    disabled={true}
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                {activeTab === 'Lead Quotation' ? (
                  <input
                    type="text"
                    name="productNameLead"
                    value={formData.productId?.[0] || ''}
                    onChange={(e) => {
                       const val = e.target.value.toUpperCase();
                       setFormData(prev => ({
                         ...prev,
                         productId: [val],
                         items: [{ productId: val, specs: prev.items?.[0]?.specs || '', qty: prev.items?.[0]?.qty || '', price: prev.items?.[0]?.price || '' }]
                       }));
                    }}
                    required
                    disabled={isViewMode}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors ${isViewMode ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`}
                    placeholder="Enter Product Name"
                  />
                ) : (
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
                )}
              </div>

              {activeTab === 'Lead Quotation' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Link Lead (Optional)</label>
                  <CustomSelect
                    name="leadId"
                    value={formData.leadId}
                    onChange={handleChange}
                    options={leadOptions}
                    placeholder="Select a Lead to Link"
                    disabled={isViewMode}
                  />
                </div>
              )}
            </div>

            {formData.items && formData.items.length > 0 && (
              <div className="mt-6 space-y-6">
                {formData.items.map((item, index) => {
                  const productName = activeTab === 'Lead Quotation' ? (item.productId || 'Product') : (products.find(p => p.id === item.productId)?.name || 'Product');
                  return (
                    <div key={item.productId} className="border-t border-gray-100 pt-4">
                      <h3 className="text-sm font-bold text-[#E8A33D] mb-3">{productName}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 space-y-0">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Product Specs *</label>
                          <input
                            type="text"
                            required
                            value={item.specs}
                            onChange={(e) => handleItemChange(index, 'specs', e.target.value)}
                            disabled={isViewMode}
                            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors ${isViewMode ? 'bg-gray-50 border-gray-300 text-gray-500 cursor-not-allowed' : 'border-gray-300'}`}
                            placeholder="e.g. 350 GSM Duplex · 5 Color Offset"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                          <input
                            type="text"
                            required
                            min="1"
                            value={isViewMode && item.qty ? Number(item.qty).toLocaleString('en-IN') : item.qty}
                            onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                            disabled={isViewMode}
                            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors ${isViewMode ? 'bg-gray-50 border-gray-300 text-gray-500 cursor-not-allowed' : 'border-gray-300'}`}
                            placeholder="e.g. 50000"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price (₹) *</label>
                          <input
                            type="text"
                            required
                            step="0.01"
                            min="0"
                            value={isViewMode && item.price ? Number(item.price).toLocaleString('en-IN', { maximumFractionDigits: 2 }) : item.price}
                            onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                            disabled={isViewMode}
                            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors ${isViewMode ? 'bg-gray-50 border-gray-300 text-gray-500 cursor-not-allowed' : 'border-gray-300'}`}
                            placeholder="e.g. 4.20"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className={`mt-8 flex flex-col-reverse sm:flex-row ${quotationToEdit ? 'sm:justify-between' : 'sm:justify-end'} items-stretch sm:items-center gap-3 border-t border-gray-100 pt-5`}>
              {quotationToEdit && (
                <button
                  type="button"
                  onClick={handleDeleteClick}
                  disabled={loading}
                  className="flex items-center justify-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-transparent rounded-md hover:bg-red-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/50 w-full sm:w-auto"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  <span className="whitespace-nowrap">Delete Quotation</span>
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
                      Edit Quotation
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
                      {loading ? 'Saving...' : (quotationToEdit ? 'Save Changes' : 'Create Quotation')}
                    </button>
                  </>
                )}
              </div>
            </div>
          </form>
        )}
      </div>
      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Quotation"
        message="Are you sure you want to delete this quotation? This action cannot be undone."
      />
    </div>
  );
}
