import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import CustomSelect from './CustomSelect';
import DeleteConfirmModal from './DeleteConfirmModal';
import { generatePurchaseOrderPDF } from '../lib/pdfGenerator';
import useScrollLock from '../hooks/useScrollLock';

export default function CreatePurchaseOrderModal({ isOpen, onClose, onPoCreated, onPoUpdated, onPoDeleted, onGrnCreated, suppliers, inventory = [], poToEdit, pos = [], onMaterialAdded }) {
  useScrollLock(isOpen);
  const [formData, setFormData] = useState({
    poNo: '',
    supplierId: '',
    paymentType: 'Debit',
    invoiceType: 'GST',
    orderDate: new Date().toISOString().split('T')[0],
    docDate: new Date().toISOString().split('T')[0],
    jobNo: '',
    jobName: '',
    modifiedBy: '',
    notes: '',
    status: 'Ordered',
    products: [],
    gstTotal: '',
    totalAmount: '',
  });

  const emptyProduct = {
    material: '',
    length: '',
    width: '',
    gsm: '',
    sheetPkt: '',
    quantity: '',
    weight: '',
    netWeight: '',
    rate: '',
    amount: ''
  };
  const [currentProduct, setCurrentProduct] = useState({ ...emptyProduct });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [showWhatsappPrompt, setShowWhatsappPrompt] = useState(false);
  const [whatsappInfo, setWhatsappInfo] = useState(null);
  const [isAddingNewMaterial, setIsAddingNewMaterial] = useState(false);
  const [newMaterialData, setNewMaterialData] = useState({
    material: '',
    paperSize: '',
    category: 'Paper',
    stock: '',
    unit: 'Sheets',
    min: '',
  });
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const handleNewMaterialChange = (e) => {
    let { name, value } = e.target;

    if (name === 'stock' || name === 'min') {
      value = value.replace(/,/g, '');
      value = value.replace(/[^0-9.]/g, '');
      const parts = value.split('.');
      if (parts.length > 2) {
        value = parts[0] + '.' + parts.slice(1).join('');
      }
    }

    if (name === 'category') {
      if (value === 'ADD_NEW') {
        setIsAddingNewCategory(true);
        setNewMaterialData((prev) => ({ ...prev, category: 'ADD_NEW' }));
        return;
      } else {
        setIsAddingNewCategory(false);
      }
    }

    setNewMaterialData((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    if (isOpen) {
    } else {
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Set form data based on edit mode or defaults
  useEffect(() => {
    if (isOpen) {
      if (poToEdit) {
        // Handle backward compatibility for old single-product POs
        let poProducts = poToEdit.products || [];
        if (poProducts.length === 0 && poToEdit.material) {
          poProducts = [{
            material: poToEdit.material || '',
            length: poToEdit.length || '',
            width: poToEdit.width || '',
            gsm: poToEdit.gsm || '',
            sheetPkt: poToEdit.sheetPkt || '',
            quantity: poToEdit.quantity || '',
            weight: poToEdit.weight || '',
            netWeight: poToEdit.netWeight || '',
            rate: poToEdit.rate || '',
            amount: poToEdit.amount || ''
          }];
        }

        setFormData({
          poNo: poToEdit.poNo || '',
          supplierId: poToEdit.supplierId || '',
          paymentType: poToEdit.paymentType || 'Debit',
          invoiceType: poToEdit.invoiceType || 'GST',
          orderDate: poToEdit.orderDate || new Date().toISOString().split('T')[0],
          docDate: poToEdit.docDate || new Date().toISOString().split('T')[0],
          jobNo: poToEdit.jobNo || '',
          jobName: poToEdit.jobName || '',
          modifiedBy: poToEdit.modifiedBy || '',
          notes: poToEdit.notes || '',
          status: poToEdit.status || 'Ordered',
          products: poProducts,
          gstTotal: poToEdit.gstTotal || '',
          totalAmount: poToEdit.totalAmount || '',
        });
      } else {
        const currentYear = new Date().getFullYear();
        const prefix = `PO-${currentYear}-`;

        let nextNum = 1;
        if (pos && pos.length > 0) {
          const currentPos = pos.filter(p => p.poNo && p.poNo.startsWith(prefix));
          if (currentPos.length > 0) {
            const nums = currentPos.map(p => {
              const parts = p.poNo.split('-');
              return parseInt(parts[2], 10) || 0;
            });
            nextNum = Math.max(...nums) + 1;
          }
        }
        const nextPoNo = `${prefix}${String(nextNum).padStart(3, '0')}`;

        setFormData({
          poNo: nextPoNo,
          supplierId: Object.keys(suppliers).length > 0 ? Object.values(suppliers)[0].id : '',
          paymentType: 'Debit',
          invoiceType: 'GST',
          orderDate: new Date().toISOString().split('T')[0],
          docDate: new Date().toISOString().split('T')[0],
          jobNo: '',
          jobName: '',
          modifiedBy: '',
          notes: '',
          status: 'Ordered',
          products: [],
          gstTotal: '',
          totalAmount: '',
        });
      }
      setCurrentProduct({ ...emptyProduct });
    }
  }, [isOpen, suppliers, poToEdit, pos]);

  if (!isOpen) return null;

  const formatIndianNumber = (val) => {
    if (val === null || val === undefined || val === '') return '';
    const str = val.toString();
    if (str.endsWith('.')) {
      const parsed = parseInt(str, 10);
      return isNaN(parsed) ? '0.' : `${parsed.toLocaleString('en-IN')}.`;
    }
    const [intPart, decPart] = str.split('.');
    const parsedInt = parseInt(intPart, 10);
    const formattedInt = isNaN(parsedInt) ? (str.startsWith('.') ? '0' : '') : parsedInt.toLocaleString('en-IN');
    return decPart !== undefined ? `${formattedInt}.${decPart}` : formattedInt;
  };

  const calculateTotals = (products, invoiceType) => {
    let subtotal = 0;
    products.forEach(p => {
      subtotal += parseFloat(p.amount) || 0;
    });
    
    let gstTotal = 0;
    if (invoiceType === 'GST') {
      gstTotal = subtotal * 0.18;
    }
    
    return {
      gstTotal: gstTotal.toFixed(2),
      totalAmount: (subtotal + gstTotal).toFixed(2)
    };
  };

  const handleProductChange = (e) => {
    let { name, value } = e.target;
    
    if (name === 'material') {
      if (value === 'ADD_NEW') {
        setIsAddingNewMaterial(true);
        setCurrentProduct((prev) => ({ ...prev, material: 'ADD_NEW' }));
        return;
      } else {
        setIsAddingNewMaterial(false);
      }
    }

    const numberFields = ['length', 'width', 'gsm', 'sheetPkt', 'quantity', 'weight', 'rate'];
    if (numberFields.includes(name)) {
      value = value.replace(/,/g, '');
      value = value.replace(/[^0-9.]/g, '');
      const parts = value.split('.');
      if (parts.length > 2) {
        value = parts[0] + '.' + parts.slice(1).join('');
      }
    }

    setCurrentProduct((prev) => {
      const updated = { ...prev, [name]: value };
      
      const l = parseFloat(updated.length) || 0;
      const w = parseFloat(updated.width) || 0;
      const weightVal = parseFloat(updated.weight) || 0;
      const g = parseFloat(updated.gsm) || 0;
      const s = parseFloat(updated.sheetPkt) || 0;
      const q = parseFloat(updated.quantity) || 0;
      
      let netWeight = 0;
      const multiplier = weightVal > 0 ? weightVal : w;
      
      if (l > 0 && multiplier > 0 && g > 0 && s > 0 && q > 0) {
        netWeight = (l * multiplier * g * q * s) / 10000000.0;
        updated.netWeight = netWeight.toFixed(3);
      } else {
        updated.netWeight = '';
      }

      const rate = parseFloat(updated.rate) || 0;
      const activeWeight = parseFloat(updated.netWeight) || parseFloat(updated.weight) || q || 0;
      
      if (activeWeight > 0 && rate > 0) {
        updated.amount = (activeWeight * rate).toFixed(2);
      } else {
        updated.amount = '';
      }

      return updated;
    });
  };

  const addProduct = () => {
    if (!currentProduct.material || currentProduct.material === 'ADD_NEW') {
      toast.error('Please select a material');
      return;
    }
    if (!currentProduct.quantity || parseFloat(currentProduct.quantity) <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }
    if (!currentProduct.rate || parseFloat(currentProduct.rate) <= 0) {
      toast.error('Please enter a valid rate');
      return;
    }

    setFormData(prev => {
      const newProducts = [...prev.products, currentProduct];
      const totals = calculateTotals(newProducts, prev.invoiceType);
      return {
        ...prev,
        products: newProducts,
        ...totals
      };
    });
    setCurrentProduct({ ...emptyProduct });
  };

  const removeProduct = (index) => {
    setFormData(prev => {
      const newProducts = prev.products.filter((_, i) => i !== index);
      const totals = calculateTotals(newProducts, prev.invoiceType);
      return {
        ...prev,
        products: newProducts,
        ...totals
      };
    });
  };

  const editProduct = (index) => {
    const productToEdit = formData.products[index];
    setCurrentProduct(productToEdit);
    removeProduct(index);
  };

  const handleChange = (e) => {
    let { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === 'invoiceType') {
        const totals = calculateTotals(updated.products, updated.invoiceType);
        updated.gstTotal = totals.gstTotal;
        updated.totalAmount = totals.totalAmount;
      }
      return updated;
    });
  };

  const handleSaveNewMaterial = async () => {
    if (!newMaterialData.material) {
      toast.error("Please enter the material name");
      return;
    }
    setLoading(true);
    try {
      const stockVal = Number(newMaterialData.stock.toString().replace(/,/g, '')) || 0;
      const minVal = Number(newMaterialData.min.toString().replace(/,/g, '')) || 0;
      const matPayload = {
        ...newMaterialData,
        category: newMaterialData.category === 'ADD_NEW' ? newCategoryName : newMaterialData.category,
        stock: stockVal,
        min: minVal,
        status: stockVal <= minVal ? 'Low Stock' : 'In Stock'
      };
      const matRes = await api.post('/inventory', matPayload);
      if (onMaterialAdded) onMaterialAdded(matRes.data);
      setCurrentProduct(prev => ({ ...prev, material: matRes.data.material }));
      setIsAddingNewMaterial(false);
      setNewMaterialData({
        material: '',
        paperSize: '',
        category: 'Paper',
        stock: '',
        unit: 'Sheets',
        min: '',
      });
      toast.success('Material saved successfully!');
    } catch (err) {
      console.error('Error creating material:', err);
      toast.error('Failed to create new material.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isAddingNewMaterial) {
      toast.error("Please save or cancel the new material first.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (formData.products.length === 0) {
      toast.error('Please add at least one product to the purchase order.');
      setLoading(false);
      return;
    }
    const payload = {
      ...formData,
      gstTotal: Number(formData.gstTotal) || 0,
      totalAmount: Number(formData.totalAmount) || 0,
    };

      let finalPoData = null;

      if (poToEdit) {
        const res = await api.put(`/purchaseOrders/${poToEdit.id}`, payload);
        finalPoData = res.data;
        if (onPoUpdated) onPoUpdated(res.data);
        toast.success('Purchase order updated successfully!');

        if (payload.status === 'Received' && poToEdit.status !== 'Received') {
          try {
            const grnPayload = {
              grnNo: `GRN-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
              poId: payload.poNo,
              supplierId: payload.supplierId,
              material: payload.products[0]?.material,
              date: new Date().toISOString()
            };
            const grnRes = await api.post('/grn', grnPayload);
            if (onGrnCreated) onGrnCreated(grnRes.data);
            toast.success('Goods Receipt Note automatically generated!');
          } catch (grnErr) {
            console.error('Error creating GRN:', grnErr);
          }
        }
      } else {
        const res = await api.post('/purchaseOrders', { ...payload, createdAt: new Date().toISOString() });
        finalPoData = res.data;
        if (onPoCreated) onPoCreated(res.data);
        toast.success('Purchase order created successfully!');

        if (payload.status === 'Received') {
          try {
            const grnPayload = {
              grnNo: `GRN-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
              poId: payload.poNo,
              supplierId: payload.supplierId,
              material: payload.products[0]?.material,
              date: new Date().toISOString()
            };
            const grnRes = await api.post('/grn', grnPayload);
            if (onGrnCreated) onGrnCreated(grnRes.data);
            toast.success('Goods Receipt Note automatically generated!');
          } catch (grnErr) {
            console.error('Error creating GRN:', grnErr);
          }
        }
      }

      // Generate PDF
      try {
        await generatePurchaseOrderPDF(finalPoData, suppliers);
      } catch (pdfErr) {
        console.error('Error generating PDF:', pdfErr);
        toast.error('PO saved, but failed to generate PDF.');
      }

      // WhatsApp Check
      const supplier = Object.values(suppliers).find(s => s.id === finalPoData.supplierId) || suppliers[finalPoData.supplierId];
      if (supplier && (supplier.mobile || supplier.phone)) {
        let phone = supplier.mobile || supplier.phone;
        let formattedPhone = phone.replace(/\D/g, '');
        if (formattedPhone.length === 10) {
          formattedPhone = '91' + formattedPhone;
        } else if (formattedPhone.startsWith('0')) {
           formattedPhone = '91' + formattedPhone.substring(1);
        }

        const formatNum = (val) => Number(val || 0).toLocaleString('en-IN');
        const formatAmt = (val) => Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        
        let detailsMsg = `*PO No:* ${finalPoData.poNo}\n`;
        detailsMsg += `*Date:* ${new Date(finalPoData.orderDate || finalPoData.createdAt || new Date()).toLocaleDateString('en-IN')}\n`;
        if (finalPoData.jobNo) detailsMsg += `*Job No:* ${finalPoData.jobNo}\n`;
        if (finalPoData.jobName) detailsMsg += `*Job Name:* ${finalPoData.jobName}\n`;
        detailsMsg += `*Payment Type:* ${finalPoData.paymentType}\n`;
        detailsMsg += `*Invoice Type:* ${finalPoData.invoiceType}\n\n`;

        finalPoData.products.forEach((p, i) => {
          detailsMsg += `*Item ${i + 1}:* ${p.material}\n`;
          const dims = [];
          if (p.length > 0) dims.push(`L: ${p.length}`);
          if (p.width > 0) dims.push(`W: ${p.width}`);
          if (p.gsm > 0) dims.push(`GSM: ${p.gsm}`);
          if (p.sheetPkt > 0) dims.push(`Sheet/Pkt: ${p.sheetPkt}`);
          if (dims.length > 0) detailsMsg += `*Dimensions:* ${dims.join(' | ')}\n`;
          detailsMsg += `*Quantity:* ${formatNum(p.quantity)}\n`;
          if (p.weight > 0) detailsMsg += `*Weight:* ${formatNum(p.weight)}\n`;
          if (p.netWeight > 0) detailsMsg += `*Net Weight:* ${formatNum(p.netWeight)}\n`;
          detailsMsg += `*Rate:* ₹${formatAmt(p.rate)}\n`;
          detailsMsg += `*Amount:* ₹${formatAmt(p.amount)}\n\n`;
        });
        
        if (finalPoData.invoiceType === 'GST' && finalPoData.gstTotal > 0) {
           detailsMsg += `*GST Total:* ₹${formatAmt(finalPoData.gstTotal)}\n`;
           detailsMsg += `*Bill Amount:* ₹${formatAmt(finalPoData.totalAmount)}\n`;
        }
        
        if (finalPoData.notes) {
           detailsMsg += `*Notes:* ${finalPoData.notes.toUpperCase()}\n`;
        }

        const message = `Hello ${supplier.name},\n\nPlease find the details of our Purchase Order:\n\n${detailsMsg}\nWe have attached the PDF for your reference.`;

        setWhatsappInfo({ phone: formattedPhone, message });
        setShowWhatsappPrompt(true);
        setLoading(false);
        return;
      }

      onClose();
    } catch (err) {
      console.error('Error saving PO:', err);
      setError('Failed to save purchase order. Please try again.');
      toast.error('Failed to save purchase order.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.delete(`/purchaseOrders/${poToEdit.id}`);
      if (onPoDeleted) onPoDeleted(poToEdit.id);
      toast.success('Purchase order deleted successfully!');
      setIsDeleteModalOpen(false);
      onClose();
    } catch (err) {
      console.error('Error deleting PO:', err);
      setError('Failed to delete purchase order. Please try again.');
      toast.error('Failed to delete purchase order.');
    } finally {
      setLoading(false);
    }
  };

  const supplierOptions = Object.values(suppliers).map(s => ({
    value: s.id,
    label: s.name
  }));

  const materialOptions = Array.isArray(inventory) ? inventory
    .filter(item => item.material)
    .map(item => ({
      value: item.material,
      label: item.material
    })) : [];

  materialOptions.unshift({ value: 'ADD_NEW', label: '+ ADD NEW MATERIAL', className: 'text-brand-accent font-bold bg-brand-accent/5' });

  const statusOptions = [
    { value: 'Ordered', label: 'Ordered' },
    { value: 'In Transit', label: 'In Transit' },
    { value: 'Received', label: 'Received' },
  ];

  const baseCategoryOptions = [
    { value: 'Paper', label: 'Paper' },
    { value: 'Ink', label: 'Ink' },
    { value: 'Consumables', label: 'Consumables' },
    { value: 'Tooling', label: 'Tooling' }
  ];
  const dynamicCategories = [...new Set(Array.isArray(inventory) ? inventory.map(item => item.category).filter(Boolean) : [])];
  const categoryOptions = [...baseCategoryOptions];
  dynamicCategories.forEach(cat => {
    if (cat.toLowerCase() === 'other') return;
    if (!categoryOptions.find(opt => opt.value.toLowerCase() === cat.toLowerCase())) {
      categoryOptions.push({ value: cat, label: cat });
    }
  });
  categoryOptions.unshift({ value: 'ADD_NEW', label: '+ ADD NEW CATEGORY', className: 'text-brand-accent font-bold bg-brand-accent/5' });

  const handleSendWhatsapp = () => {
    if (whatsappInfo) {
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

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto" onMouseDown={(e) => { if (e.target === e.currentTarget && typeof onClose === "function") onClose(); }}>
      <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl flex flex-col max-h-[calc(100dvh-4rem)] md:max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-lg font-bold text-gray-900">{poToEdit ? 'Edit Purchase Order' : 'New Purchase Order'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex-1 overflow-y-auto custom-scrollbar">
          {error && <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 space-y-0">
            {/* Row 1 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cash/Debit</label>
              <CustomSelect
                name="paymentType"
                value={formData.paymentType}
                onChange={handleChange}
                options={[
                  { value: 'Debit', label: 'Debit' },
                  { value: 'Cash', label: 'Cash' }
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Type</label>
              <CustomSelect
                name="invoiceType"
                value={formData.invoiceType}
                onChange={handleChange}
                options={[
                  { value: 'GST', label: 'GST' },
                  { value: 'Cash', label: 'Cash' }
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order Date</label>
              <input
                type="date"
                name="orderDate"
                value={formData.orderDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order No (PO No) *</label>
              <input
                type="text"
                name="poNo"
                required
                value={formData.poNo}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors"
              />
            </div>

            {/* Row 2 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Doc Date</label>
              <input
                type="date"
                name="docDate"
                value={formData.docDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job No</label>
              <input
                type="text"
                name="jobNo"
                value={formData.jobNo}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job Name</label>
              <input
                type="text"
                name="jobName"
                value={formData.jobName}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Modify By</label>
              <input
                type="text"
                name="modifiedBy"
                value={formData.modifiedBy}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors"
              />
            </div>

            {/* Row 3 - Supplier */}
            <div className="md:col-span-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
              {supplierOptions.length > 0 ? (
                <CustomSelect
                  name="supplierId"
                  value={formData.supplierId}
                  onChange={handleChange}
                  options={supplierOptions}
                  required
                />
              ) : (
                <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                  No suppliers found. Please add a supplier first.
                </div>
              )}
            </div>

            <div className="md:col-span-4 mt-2">
              <h3 className="text-sm font-bold text-gray-800 border-b pb-1">Product Details</h3>
            </div>

            {/* Added Products Table */}
            {formData.products && formData.products.length > 0 && (
              <div className="md:col-span-4 mb-4">
                <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {formData.products.map((p, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2 text-sm text-gray-900">{p.material}</td>
                          <td className="px-4 py-2 text-sm text-gray-500">{formatIndianNumber(p.quantity)}</td>
                          <td className="px-4 py-2 text-sm text-gray-500">₹{formatIndianNumber(p.rate)}</td>
                          <td className="px-4 py-2 text-sm text-gray-900 font-medium">₹{formatIndianNumber(p.amount)}</td>
                          <td className="px-4 py-2 text-right space-x-2">
                            <button type="button" onClick={() => editProduct(idx)} className="text-blue-500 hover:text-blue-700" title="Edit">
                              <svg className="w-4 h-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            <button type="button" onClick={() => removeProduct(idx)} className="text-red-500 hover:text-red-700" title="Remove">
                              <X className="w-4 h-4 inline" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Row 4 - Material */}
            <div className="md:col-span-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Name (Material)</label>
              {materialOptions.length > 0 ? (
                <CustomSelect
                  name="material"
                  value={currentProduct.material}
                  onChange={handleProductChange}
                  options={materialOptions}
                />
              ) : (
                <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                  No materials found. Please add a material first.
                </div>
              )}
            </div>

            {isAddingNewMaterial && (
              <div className="md:col-span-4 bg-brand-accent/5 p-4 rounded-xl border border-brand-accent/20 mb-2 space-y-4">
                <div className="flex justify-between items-center mb-2 border-b border-brand-accent/20 pb-2">
                  <h4 className="text-sm font-bold text-[#1b2f63]">Add New Material</h4>
                  <button type="button" onClick={() => { setIsAddingNewMaterial(false); setCurrentProduct(p => ({...p, material: ''})) }} className="text-gray-400 hover:text-red-500 text-xs flex items-center gap-1 transition-colors"><X className="w-4 h-4"/> Cancel</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Material Name *</label>
                    <input type="text" name="material" value={newMaterialData.material} onChange={handleNewMaterialChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm uppercase" placeholder="e.g. SBS Board 300 GSM" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Paper Size</label>
                    <input type="text" name="paperSize" value={newMaterialData.paperSize} onChange={handleNewMaterialChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm uppercase" placeholder="e.g. 20x30 inch" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Category *</label>
                    <CustomSelect
                      name="category"
                      value={newMaterialData.category}
                      onChange={handleNewMaterialChange}
                      options={categoryOptions}
                    />
                    {isAddingNewCategory && (
                      <input
                        type="text"
                        placeholder="Enter new category name"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="w-full px-3 py-2 mt-2 border border-brand-accent rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 transition-colors uppercase text-sm"
                        required
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Unit of Measure *</label>
                    <CustomSelect
                      name="unit"
                      value={newMaterialData.unit}
                      onChange={handleNewMaterialChange}
                      options={[
                        { value: 'Sheets', label: 'Sheets' },
                        { value: 'Liters', label: 'Liters' },
                        { value: 'Kgs', label: 'Kgs' },
                        { value: 'Rolls', label: 'Rolls' },
                        { value: 'Pieces', label: 'Pieces' }
                      ]}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Current Stock *</label>
                    <input type="text" name="stock" value={formatIndianNumber(newMaterialData.stock)} onChange={handleNewMaterialChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm uppercase" placeholder="e.g. 5000" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Minimum Threshold *</label>
                    <input type="text" name="min" value={formatIndianNumber(newMaterialData.min)} onChange={handleNewMaterialChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm uppercase" placeholder="e.g. 1000" />
                  </div>
                  <div className="md:col-span-2 flex justify-end mt-2 pt-2 border-t border-brand-accent/10">
                    <button
                      type="button"
                      onClick={handleSaveNewMaterial}
                      disabled={loading}
                      className="px-4 py-2 bg-brand-accent text-white font-medium rounded-lg text-sm hover:bg-brand-accent/90 transition-colors shadow-sm disabled:opacity-50"
                    >
                      {loading ? 'SAVING...' : 'SAVE MATERIAL'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Row 5 - Dimensions & Qty */}
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Length</label>
              <input
                type="text"
                name="length"
                value={formatIndianNumber(currentProduct.length)}
                onChange={handleProductChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors"
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Width</label>
              <input
                type="text"
                name="width"
                value={formatIndianNumber(currentProduct.width)}
                onChange={handleProductChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors"
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">GSM</label>
              <input
                type="text"
                name="gsm"
                value={formatIndianNumber(currentProduct.gsm)}
                onChange={handleProductChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors"
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Sheet / PKT</label>
              <input
                type="text"
                name="sheetPkt"
                value={formatIndianNumber(currentProduct.sheetPkt)}
                onChange={handleProductChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors"
              />
            </div>

            {/* Row 6 - Quantities & Amounts */}
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Qty *</label>
              <input
                type="text"
                name="quantity"
                value={formatIndianNumber(currentProduct.quantity)}
                onChange={handleProductChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors"
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Weight</label>
              <input
                type="text"
                name="weight"
                value={formatIndianNumber(currentProduct.weight)}
                onChange={handleProductChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Net Weight</label>
              <input
                type="text"
                readOnly
                value={formatIndianNumber(currentProduct.netWeight)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-500"
                placeholder="Auto-calculated"
              />
            </div>

            {/* Row 7 - Pricing */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Rate (₹) *</label>
              <input
                type="text"
                name="rate"
                value={formatIndianNumber(currentProduct.rate)}
                onChange={handleProductChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
              <input
                type="text"
                readOnly
                value={formatIndianNumber(currentProduct.amount)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-500 font-bold"
                placeholder="Auto-calculated"
              />
            </div>
            <div className="md:col-span-4 flex justify-end mt-2">
              <button type="button" onClick={addProduct} className="px-4 py-2 bg-blue-50 text-blue-600 border border-blue-200 font-medium rounded-md text-sm hover:bg-blue-100 transition-colors shadow-sm">Add Product to List</button>
            </div>

            <div className="md:col-span-4 mt-2">
              <h3 className="text-sm font-bold text-gray-800 border-b pb-1">Additional Details</h3>
            </div>

            {/* Row 8 - Footer Info */}
            <div className="md:col-span-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Narration</label>
              <textarea
                name="notes"
                rows="2"
                value={formData.notes}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors resize-none"
                placeholder="Any special notes..."
              ></textarea>
            </div>

            <div className="md:col-span-4 border-t pt-4 mt-2 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                <CustomSelect
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  options={statusOptions}
                  required
                />
              </div>
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1 text-right">GST Total (₹)</label>
                <input
                  type="text"
                  readOnly
                  value={formatIndianNumber(formData.gstTotal)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-500 text-right font-medium"
                />
              </div>
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-900 mb-1 text-right">Bill Amount (₹)</label>
                <input
                  type="text"
                  readOnly
                  value={formatIndianNumber(formData.totalAmount)}
                  className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-md text-blue-900 text-right font-bold"
                />
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-between items-center border-t border-gray-100 pt-5">
            <div>
              {poToEdit && (
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(true)}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
            <div className="flex space-x-3">
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
                disabled={loading || supplierOptions.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-brand-primarydark transition-colors disabled:opacity-50"
              >
                {loading ? 'Saving...' : (poToEdit ? 'Save Changes' : 'Create PO')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
    
    {showWhatsappPrompt && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6 text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Send on WhatsApp?</h3>
          <p className="text-sm text-gray-500 mb-6">Would you like to send this Purchase Order to the supplier on WhatsApp?</p>
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

    {poToEdit && (
      <DeleteConfirmModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Purchase Order"
        message="Are you sure you want to delete this purchase order? This action cannot be undone and it will be permanently removed from the system."
        isDeleting={loading}
      />
    )}
    </>
  );
}
