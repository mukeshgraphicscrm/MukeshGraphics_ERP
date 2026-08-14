import React, { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import CustomSelect from './CustomSelect';
import ConfirmDeleteModal from './ConfirmDeleteModal';

export default function CreateOrderModal({ isOpen, onClose, onOrderAdded, onOrderUpdated, onOrderDeleted, orders = [], orderToEdit, startInEditMode, initialData }) {
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
  });

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState(null);
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
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isDeleteModalOpen]);

  useEffect(() => {
    if (isOpen) {
      setFetching(true);
      Promise.all([
        api.get('/customers'),
        api.get('/products')
      ]).then(([custRes, prodRes]) => {
        setCustomers(custRes.data);
        setProducts(prodRes.data);
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
        });

        setIsViewMode(false);
      }
    }
  }, [isOpen, orders, orderToEdit, startInEditMode, initialData]);

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

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'notes') {
      setFormData((prev) => ({ ...prev, [name]: typeof value === 'string' ? value.toUpperCase() : value }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    const formatted = formatIndianNumber(value);
    setFormData((prev) => ({ ...prev, [name]: formatted }));
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
      <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl overflow-hidden my-8 flex flex-col max-h-[90vh]">
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

                              return { ...prev, quantities: newQuantities, amounts: newAmounts };
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
                            setFormData(prev => ({ ...prev, amounts: { ...prev.amounts, [id]: formatted } }));
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
