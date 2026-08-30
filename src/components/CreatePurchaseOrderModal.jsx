import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import CustomSelect from './CustomSelect';
import DeleteConfirmModal from './DeleteConfirmModal';
import { generatePurchaseOrderPDF } from '../lib/pdfGenerator';

export default function CreatePurchaseOrderModal({ isOpen, onClose, onPoCreated, onPoUpdated, onPoDeleted, onGrnCreated, suppliers, inventory = [], poToEdit, pos = [] }) {
  const [formData, setFormData] = useState({
    poNo: '',
    supplierId: '',
    material: '',
    quantity: '',
    rate: '',
    amount: '',
    status: 'Ordered',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [showWhatsappPrompt, setShowWhatsappPrompt] = useState(false);
  const [whatsappInfo, setWhatsappInfo] = useState(null);

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

  // Set form data based on edit mode or defaults
  useEffect(() => {
    if (isOpen) {
      if (poToEdit) {
        setFormData({
          poNo: poToEdit.poNo || '',
          supplierId: poToEdit.supplierId || '',
          material: poToEdit.material || '',
          quantity: poToEdit.quantity || '',
          rate: poToEdit.rate || '',
          amount: poToEdit.amount || '',
          status: poToEdit.status || 'Ordered',
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
          material: '',
          quantity: '',
          rate: '',
          amount: '',
          status: 'Ordered',
        });
      }
    }
  }, [isOpen, suppliers, poToEdit, pos]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === 'quantity' || name === 'rate') {
        const q = parseFloat(updated.quantity) || 0;
        const r = parseFloat(updated.rate) || 0;
        if (updated.quantity && updated.rate) {
          updated.amount = q * r;
        } else if (name === 'quantity' || name === 'rate') {
          updated.amount = '';
        }
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        ...formData,
        quantity: Number(formData.quantity) || 0,
        rate: Number(formData.rate) || 0,
        amount: Number(formData.amount) || 0,
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
              material: payload.material,
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
              material: payload.material,
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

        const message = `Hello ${supplier.name},\n\nPlease find the details of our Purchase Order:\n\n*PO No:* ${finalPoData.poNo}\n*Date:* ${new Date(finalPoData.createdAt || new Date()).toLocaleDateString('en-IN')}\n*Material:* ${finalPoData.material}\n*Quantity:* ${Number(finalPoData.quantity).toLocaleString('en-IN')}\n*Amount:* ₹${Number(finalPoData.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\nWe have attached the PDF for your reference.`;

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

  const statusOptions = [
    { value: 'Ordered', label: 'Ordered' },
    { value: 'In Transit', label: 'In Transit' },
    { value: 'Received', label: 'Received' },
  ];

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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 space-y-0">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">PO *</label>
              <input
                type="text"
                name="poNo"
                required
                value={formData.poNo}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors"
                placeholder="e.g. PO-2026-001"
              />
            </div>

            <div className="md:col-span-2">
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

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Material Description *</label>
              {materialOptions.length > 0 ? (
                <CustomSelect
                  name="material"
                  value={formData.material}
                  onChange={handleChange}
                  options={materialOptions}
                  required
                />
              ) : (
                <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                  No materials found. Please add a material first.
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
              <input
                type="number"
                name="quantity"
                required
                min="1"
                value={formData.quantity}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors"
                placeholder="e.g. 10000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rate (₹) *</label>
              <input
                type="number"
                name="rate"
                required
                min="0"
                step="0.01"
                value={formData.rate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors"
                placeholder="e.g. 42.50"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
              <input
                type="number"
                name="amount"
                required
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors"
                placeholder="e.g. 425000"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
              <CustomSelect
                name="status"
                value={formData.status}
                onChange={handleChange}
                options={statusOptions}
                required
              />
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
