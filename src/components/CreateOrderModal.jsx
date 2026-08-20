import React, { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import CustomSelect from './CustomSelect';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import { useAuth } from '../contexts/AuthContext';

export default function CreateOrderModal({ isOpen, onClose, onOrderAdded, onOrderUpdated, onOrderDeleted, orders = [], orderToEdit, startInEditMode, initialData }) {
  const { currentUser } = useAuth();
  const [isViewMode, setIsViewMode] = useState(false);
  const [formData, setFormData] = useState({
    orderNo: '',
    orderNo: '',
    customerId: '',
    productId: [],
    quantities: {},
    amounts: {},
    orderDate: '',
    deliveryDate: '',
    notes: '',
    status: 'Approved',
    employee: currentUser?.profile?.name || '',
  });

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [showWhatsappPrompt, setShowWhatsappPrompt] = useState(false);
  const [whatsappInfo, setWhatsappInfo] = useState({ phone: '', message: '' });

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
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isDeleteModalOpen]);

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
        toast.error('Failed to load customers and products.');
        setFetching(false);
      });
      setIsViewMode(!startInEditMode && !!orderToEdit);

      if (orderToEdit) {
        const pIds = Array.isArray(orderToEdit.productId) ? orderToEdit.productId : (orderToEdit.productId ? [orderToEdit.productId] : []);
        const initQuantities = orderToEdit.quantities || {};
        const initAmounts = orderToEdit.amounts || {};

        // Backward compatibility for old single-product orders
        if (!orderToEdit.quantities && pIds.length > 0) {
          initQuantities[pIds[0]] = formatIndianNumber(orderToEdit.quantity || '');
        }
        if (!orderToEdit.amounts && pIds.length > 0) {
          initAmounts[pIds[0]] = formatIndianNumber(orderToEdit.amount || '');
        }

        setFormData({
          orderNo: orderToEdit.orderNo || '',
          customerId: orderToEdit.customerId || '',
          productId: pIds,
          quantities: initQuantities,
          amounts: initAmounts,
          orderDate: orderToEdit.orderDate ? new Date(orderToEdit.orderDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          deliveryDate: orderToEdit.deliveryDate ? new Date(orderToEdit.deliveryDate).toISOString().split('T')[0] : '',
          notes: orderToEdit.notes || '',
          status: orderToEdit.status || 'Approved',
          employee: orderToEdit.employee || currentUser?.profile?.name || '',
        });
      } else {
        let nextNum = 1;
        if (orders && orders.length > 0) {
          const currentOrders = orders.filter(o => o.orderNo && o.orderNo.startsWith(`ORD-`));
          if (currentOrders.length > 0) {
            const nums = currentOrders.map(o => {
              const parts = o.orderNo.split('-');
              return parseInt(parts[1], 10) || 0;
            });
            nextNum = Math.max(...nums) + 1;
          }
        }
        const nextOrderNo = `ORD-${String(nextNum).padStart(3, '0')}`;

        let pIds = [];
        const initQuantities = {};
        const initAmounts = {};
        let initialNotes = '';

        if (initialData?.items && initialData.items.length > 0) {
          initialData.items.forEach(item => {
            if (item.productId) {
              pIds.push(item.productId);
              initQuantities[item.productId] = formatIndianNumber(item.qty || '');
              const calculatedAmount = (Number(item.qty) || 0) * (Number(item.price) || 0);
              initAmounts[item.productId] = formatIndianNumber(calculatedAmount ? Number(calculatedAmount.toFixed(2)) : '');
            }
          });
          initialNotes = initialData.items.map(item => item.specs ? `Specs: ${item.specs}` : '').filter(Boolean).join('\n');
        } else if (initialData?.productId) {
          pIds.push(initialData.productId);
          initQuantities[initialData.productId] = formatIndianNumber(initialData?.qty || '');
          const calculatedAmount = (Number(initialData?.qty) || 0) * (Number(initialData?.price) || 0);
          initAmounts[initialData.productId] = formatIndianNumber(calculatedAmount ? Number(calculatedAmount.toFixed(2)) : '');
          initialNotes = initialData?.specs ? `Specs: ${initialData.specs}` : '';
        }

        // Reset form on open
        setFormData({
          orderNo: nextOrderNo,
          customerId: initialData?.customerId || '',
          productId: pIds,
          quantities: initQuantities,
          amounts: initAmounts,
          orderDate: new Date().toISOString().split('T')[0],
          deliveryDate: new Date().toISOString().split('T')[0],
          notes: initialNotes,
          status: 'Approved',
          employee: currentUser?.profile?.name || '',
        });

        setIsViewMode(false);
      }
    }
  }, [isOpen, orders, orderToEdit, startInEditMode, initialData, currentUser]);

  useEffect(() => {
    if (formData.customerId && formData.productId && formData.productId.length > 0) {
      const selectedCustomer = customers.find(c => c.id === formData.customerId);
      if (selectedCustomer) {
        const productIds = Array.isArray(formData.productId) ? formData.productId : [formData.productId];
        let hasInvalid = false;
        productIds.forEach(id => {
          const product = products.find(p => p.id === id);
          if (product && (!product.companyName || product.companyName !== selectedCustomer.name)) {
            hasInvalid = true;
          }
        });
        if (hasInvalid) {
          setFormData(prev => ({ ...prev, productId: [] }));
        }
      }
    }
  }, [formData.customerId, formData.productId, customers, products]);

  const productHistories = React.useMemo(() => {
    if (!orders || orders.length === 0 || !formData.productId || formData.productId.length === 0) return [];
    
    const histories = [];
    
    formData.productId.forEach(prodId => {
      // Find all orders containing this product, excluding the one currently being edited (if any)
      const matchingOrders = orders.filter(o => {
        if (orderToEdit && o.id === orderToEdit.id) return false;
        return o.productId === prodId || (Array.isArray(o.productId) && o.productId.includes(prodId));
      });
      
      if (matchingOrders.length > 0) {
        // Sort by orderDate descending
        matchingOrders.sort((a, b) => new Date(b.orderDate || b.createdAt || 0) - new Date(a.orderDate || a.createdAt || 0));
        const lastOrder = matchingOrders[0];
        
        const qty = (lastOrder.quantities && lastOrder.quantities[prodId]) || lastOrder.quantity || '0';
        const amount = (lastOrder.amounts && lastOrder.amounts[prodId]) || lastOrder.amount || '0';
        
        histories.push({
          productId: prodId,
          orderNo: lastOrder.orderNo,
          date: lastOrder.orderDate || lastOrder.createdAt,
          qty: qty,
          amount: amount,
          status: lastOrder.status,
          notes: lastOrder.notes
        });
      }
    });
    
    return histories;
  }, [formData.productId, orders, orderToEdit]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const isEmployeeEditing = orderToEdit && currentUser?.profile?.designation === 'Employee';
      const autoEmployee = isEmployeeEditing ? currentUser?.profile?.name : prev.employee;
      if (name === 'notes') {
        return { ...prev, [name]: typeof value === 'string' ? value.toUpperCase() : value, ...(isEmployeeEditing && { employee: autoEmployee }) };
      } else if (name === 'employee') {
        return { ...prev, [name]: value, ...(isEmployeeEditing && { employee: autoEmployee }) };
      } else {
        return { ...prev, [name]: value, ...(isEmployeeEditing && { employee: autoEmployee }) };
      }
    });
  };

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    const formatted = formatIndianNumber(value);
    setFormData((prev) => {
      const isEmployeeEditing = orderToEdit && currentUser?.profile?.designation === 'Employee';
      const autoEmployee = isEmployeeEditing ? currentUser?.profile?.name : prev.employee;
      return { ...prev, [name]: formatted, ...(isEmployeeEditing && { employee: autoEmployee }) };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const totalQuantity = formData.productId.reduce((sum, id) => sum + Number((formData.quantities[id] || '0').toString().replace(/,/g, '')), 0);
      const totalAmount = formData.productId.reduce((sum, id) => sum + Number((formData.amounts[id] || '0').toString().replace(/,/g, '')), 0);

      const payload = {
        ...formData,
        quantity: totalQuantity,
        amount: totalAmount,
      };
      if (orderToEdit) {
        const res = await api.put(`/orders/${orderToEdit.id}`, payload);
        if (onOrderUpdated) onOrderUpdated(res.data);
        toast.success('Order updated successfully!');
      } else {
        const res = await api.post('/orders', payload);
        if (onOrderAdded) onOrderAdded(res.data);
        toast.success('Order created successfully!');

        // WhatsApp Check
        const customer = customers.find(c => c.id === formData.customerId);
        let phone = customer?.mobile || customer?.phone || '';

        if (phone) {
          const customerName = customer?.name || 'Customer';
          const contactPerson = customer?.contactPerson || 'Sir/Madam';

          let message = `Dear ${contactPerson},\n\nThank you for choosing Mukesh Graphics! We are pleased to confirm your order for *${customerName}*.\n\n*Order Details:*\n*Order No:* ${res.data.orderNo}\n*Order Date:* ${new Date(res.data.orderDate).toLocaleDateString('en-IN')}\n\n*Products:*\n`;
          let totalAmt = 0;
          (res.data.productId || []).forEach((prodId, index) => {
            const product = products.find(p => p.id === prodId);
            const productName = product?.name || 'Product';
            const qty = Number((res.data.quantities?.[prodId] || res.data.quantity || '0').toString().replace(/,/g, ''));
            const amount = Number((res.data.amounts?.[prodId] || res.data.amount || '0').toString().replace(/,/g, ''));
            totalAmt += amount;
            message += `${index + 1}. *${productName}*\n   Qty: ${qty.toLocaleString('en-IN')}\n   Amount: ₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
          });
          message += `\n*Total Amount:* ₹${totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\nWe will keep you updated on the production status. Please feel free to reach out if you have any questions.\n\nBest Regards,\n*Mukesh Graphics*`;
          
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
      console.error('Error saving order:', err);
      setError('Failed to save order. Please try again.');
      toast.error('Failed to save order.');
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
      await api.delete(`/orders/${orderToEdit.id}`);
      if (onOrderDeleted) onOrderDeleted(orderToEdit.id);
      toast.success('Order deleted successfully!');
      setIsDeleteModalOpen(false);
      onClose();
    } catch (err) {
      console.error('Error deleting order:', err);
      toast.error('Failed to delete order.');
    } finally {
      setLoading(false);
    }
  };

  const statusOptions = [
    { value: 'Approved', label: 'Approved' },
    { value: 'Job Preparation', label: 'Job Preparation' },
    { value: 'Printing', label: 'Printing' },
    { value: 'In Production', label: 'In Production' },
    { value: 'Ready For Dispatch', label: 'Ready For Dispatch' },
    { value: 'Dispatched', label: 'Dispatched' },
    { value: 'Completed', label: 'Completed' },
  ];

  const selectedCustomer = customers.find(c => c.id === formData.customerId);
  const filteredProducts = selectedCustomer
    ? products.filter(p => p.companyName && p.companyName === selectedCustomer.name)
    : products;

  const customerOptions = customers.map(c => ({ value: c.id, label: c.name }));
  const productOptions = filteredProducts.map(p => ({ value: p.id, label: p.name }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto" onMouseDown={(e) => { if (e.target === e.currentTarget && typeof onClose === "function") onClose(); }}>
      <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl flex flex-col max-h-[calc(100dvh-4rem)] md:max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900">
            {isViewMode ? 'View Order' : (orderToEdit ? 'Edit Order' : 'Create Order')}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {fetching ? (
          <div className="p-8 text-center text-gray-500 flex-1">Loading form data...</div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 flex-1">
              {error && <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 space-y-0">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Order No *</label>
                  <input
                    type="text"
                    name="orderNo"
                    readOnly
                    value={formData.orderNo}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                  <CustomSelect
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    options={statusOptions}
                    disabled={isViewMode}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
                  <CustomSelect
                    name="customerId"
                    value={formData.customerId}
                    onChange={handleChange}
                    options={customerOptions}
                    placeholder="Select Customer"
                    disabled={isViewMode}
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product *</label>
                  <CustomSelect
                    name="productId"
                    value={formData.productId}
                    onChange={handleChange}
                    options={productOptions}
                    placeholder="Select Product"
                    disabled={isViewMode || !formData.customerId}
                    isMulti={true}
                    required
                  />
                </div>

                {productHistories.length > 0 && (
                  <div className="md:col-span-2 mt-2 p-4 bg-[#E8A33D]/10 border border-[#E8A33D]/30 rounded-lg">
                    <h4 className="text-sm font-bold text-[#E8A33D] mb-3 flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Previous Order History
                    </h4>
                    <div className="space-y-3">
                      {productHistories.map((history, idx) => {
                        const productName = products.find(p => p.id === history.productId)?.name || 'Unknown Product';
                        return (
                          <div key={idx} className="text-sm text-gray-700 bg-white p-3 rounded-md border border-[#E8A33D]/20 shadow-sm">
                            <div className="font-bold text-gray-900 mb-2 flex justify-between items-center">
                              <span>{productName}</span>
                              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">{history.orderNo}</span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                              <div><span className="text-gray-500 block text-xs">Date</span> <span className="font-medium">{history.date ? new Date(history.date).toLocaleDateString() : 'N/A'}</span></div>
                              <div><span className="text-gray-500 block text-xs">Quantity</span> <span className="font-medium">{history.qty}</span></div>
                              <div><span className="text-gray-500 block text-xs">Amount</span> <span className="font-medium">₹{history.amount}</span></div>
                              <div><span className="text-gray-500 block text-xs">Status</span> <span className="font-medium">{history.status}</span></div>
                              {history.notes && (
                                <div className="col-span-2 md:col-span-4 mt-1 pt-2 border-t border-gray-100">
                                  <span className="text-gray-500 block text-xs">Notes / Specs</span>
                                  <span className="font-medium whitespace-pre-wrap text-xs">{history.notes}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {formData.productId.length > 0 && formData.productId.map((id, index) => {
                  const product = products.find(p => p.id === id);
                  return (
                    <div key={id} className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-200">
                      <div className="md:col-span-2 font-bold text-gray-900 text-sm border-b border-gray-200 pb-2 mb-2">
                        {index + 1}. {product?.name || 'Unknown Product'}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                        <input
                          type="text"
                          name={`quantity_${id}`}
                          required
                          value={formData.quantities[id] || ''}
                          onChange={(e) => {
                            const formatted = formatIndianNumber(e.target.value);
                            setFormData(prev => {
                              const newQuantities = { ...prev.quantities, [id]: formatted };
                              const newAmounts = { ...prev.amounts };

                              const quantityVal = Number(formatted.replace(/,/g, ''));
                              if (product && product.unitPrice) {
                                const price = Number(product.unitPrice.toString().replace(/,/g, ''));
                                if (!isNaN(price) && !isNaN(quantityVal)) {
                                  const calculatedAmount = quantityVal * price;
                                  const roundedAmount = Math.round(calculatedAmount * 100) / 100;
                                  newAmounts[id] = formatIndianNumber(roundedAmount);
                                }
                              }

                              const isEmployeeEditing = orderToEdit && currentUser?.profile?.designation === 'Employee';
                              const autoEmployee = isEmployeeEditing ? currentUser?.profile?.name : prev.employee;
                              return { ...prev, quantities: newQuantities, amounts: newAmounts, ...(isEmployeeEditing && { employee: autoEmployee }) };
                            });
                          }}
                          disabled={isViewMode}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors ${isViewMode ? 'bg-gray-50 border-gray-300 text-gray-500 cursor-not-allowed' : 'border-gray-300 bg-white'
                            }`}
                          placeholder="e.g. 50,000"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
                        <input
                          type="text"
                          name={`amount_${id}`}
                          required
                          value={formData.amounts[id] || ''}
                          onChange={(e) => {
                            const formatted = formatIndianNumber(e.target.value);
                            setFormData(prev => {
                              const isEmployeeEditing = orderToEdit && currentUser?.profile?.designation === 'Employee';
                              const autoEmployee = isEmployeeEditing ? currentUser?.profile?.name : prev.employee;
                              return { ...prev, amounts: { ...prev.amounts, [id]: formatted }, ...(isEmployeeEditing && { employee: autoEmployee }) };
                            });
                          }}
                          disabled={isViewMode}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors ${isViewMode ? 'bg-gray-50 border-gray-300 text-gray-500 cursor-not-allowed' : 'border-gray-300 bg-white'
                            }`}
                          placeholder="e.g. 25,000"
                        />
                      </div>
                    </div>
                  );
                })}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Order Date *</label>
                  <input
                    type="date"
                    name="orderDate"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={formData.orderDate}
                    onChange={handleChange}
                    disabled={isViewMode}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors ${isViewMode ? 'bg-gray-50 border-gray-300 text-gray-500 cursor-not-allowed' : 'border-gray-300'
                      }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Date *</label>
                  <input
                    type="date"
                    name="deliveryDate"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={formData.deliveryDate}
                    onChange={handleChange}
                    disabled={isViewMode}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors ${isViewMode ? 'bg-gray-50 border-gray-300 text-gray-500 cursor-not-allowed' : 'border-gray-300'
                      }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                  <CustomSelect
                    name="employee"
                    value={formData.employee}
                    onChange={handleChange}
                    disabled={isViewMode || (!!orderToEdit && currentUser?.profile?.designation === 'Employee')}
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
                    disabled={isViewMode}
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors resize-none ${isViewMode ? 'bg-gray-50 border-gray-300 text-gray-500 cursor-not-allowed' : 'border-gray-300'
                      }`}
                    placeholder="Enter any additional notes or instructions..."
                  />
                </div>
              </div>
            </div>

            <div className={`px-6 py-4 flex flex-col-reverse sm:flex-row ${orderToEdit ? 'sm:justify-between' : 'sm:justify-end'} items-stretch sm:items-center gap-3 border-t border-gray-100 bg-gray-50 flex-shrink-0`}>
              {orderToEdit && (
                <button
                  type="button"
                  onClick={handleDeleteClick}
                  disabled={loading}
                  className="flex items-center justify-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-transparent rounded-md hover:bg-red-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/50 w-full sm:w-auto"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  <span className="whitespace-nowrap">Delete Order</span>
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
                      Edit Order
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
                      {loading ? 'Saving...' : (orderToEdit ? 'Save Changes' : 'Create Order')}
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
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Send Order Confirmation?</h3>
            <p className="text-sm text-gray-500 mb-6">Would you like to send this order confirmation to the client on WhatsApp?</p>
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
        title="Delete Order"
        message="Are you sure you want to delete this order? This action cannot be undone and it will be permanently removed from the system."
        isLoading={loading}
      />
    </div>
  );
}
