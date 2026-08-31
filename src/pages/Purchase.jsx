import React, { useState, useEffect } from 'react';
import { Plus, FileDown } from 'lucide-react';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import CreatePurchaseOrderModal from '../components/CreatePurchaseOrderModal';
import AddSupplierModal from '../components/AddSupplierModal';
import AddMaterialModal from '../components/AddMaterialModal';
import AddPaperSizeModal from '../components/AddPaperSizeModal';
import api from '../lib/api';
import { useData } from '../contexts/DataContext';
import { generatePurchaseOrderPDF } from '../lib/pdfGenerator';
import toast from 'react-hot-toast';

export default function Purchase() {
  const { purchaseOrders: poData, setPurchaseOrders: setPoData, grnData, setGrnData, supplierMap: suppliers, setSuppliers, inventory, setInventory, isLoaded, paperSizes, setPaperSizes } = useData();
  const [isAddPOModalOpen, setIsAddPOModalOpen] = useState(false);
  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState(false);
  const [isAddMaterialModalOpen, setIsAddMaterialModalOpen] = useState(false);
  const [isAddPaperSizeModalOpen, setIsAddPaperSizeModalOpen] = useState(false);
  const [poToEdit, setPoToEdit] = useState(null);
  const [supplierToEdit, setSupplierToEdit] = useState(null);


  const poColumns = [
    { header: 'PO', accessor: row => row.poNo, render: row => <span className="font-bold text-[13px] text-gray-900">{row.poNo}</span> },
    { header: 'DATE', accessor: row => row.createdAt, render: row => <span className="text-[13px] text-gray-500">{row.createdAt ? new Date(row.createdAt).toLocaleDateString('en-IN') : '-'}</span> },
    { header: 'SUPPLIER', accessor: row => suppliers[row.supplierId]?.name || row.supplierId, render: row => <span className="text-[13px] text-gray-700">{suppliers[row.supplierId]?.name || row.supplierId}</span> },
    { header: 'MATERIAL', accessor: row => row.material, render: row => <span className="text-[13px] text-gray-700">{row.material}</span> },
    { header: 'QUANTITY', accessor: row => row.quantity.toLocaleString('en-IN'), render: row => <span className="text-[13px] text-gray-500">{row.quantity.toLocaleString('en-IN')}</span> },
    { header: 'AMOUNT', accessor: row => `₹${row.amount.toLocaleString('en-IN')}`, render: row => <span className="font-medium text-[13px] text-gray-900">₹{row.amount.toLocaleString('en-IN')}</span> },
    { header: 'STATUS', accessor: row => row.status, render: row => <StatusBadge status={row.status} /> },
    {
      header: 'DOCUMENT',
      accessor: 'document',
      render: row => (
        <div className="flex gap-2">
          <button 
            onClick={(e) => { e.stopPropagation(); generatePDF(row); }}
            className="p-1.5 bg-brand-primary/10 text-brand-primary rounded-md hover:bg-brand-primary/20 transition-colors"
            title="Generate PO Document"
          >
            <FileDown className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); sendWhatsapp(row); }}
            className="p-1.5 bg-green-100 text-[#25D366] rounded-md hover:bg-green-200 transition-colors"
            title="Send on WhatsApp"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
          </button>
        </div>
      )
    },
  ];

  const generatePDF = async (po) => {
    const toastId = toast.loading('Generating PDF...');
    try {
      await generatePurchaseOrderPDF(po, suppliers);
      toast.success('PO document generated!', { id: toastId });
    } catch (err) {
      console.error('Error generating PDF:', err);
      toast.error('Failed to generate PDF.', { id: toastId });
    }
  };

  const sendWhatsapp = async (po) => {
    const toastId = toast.loading('Generating PDF for WhatsApp...');
    try {
      await generatePurchaseOrderPDF(po, suppliers);
      toast.dismiss(toastId);
      
      const supplier = suppliers[po.supplierId] || Object.values(suppliers).find(s => s.id === po.supplierId);
      if (supplier && (supplier.mobile || supplier.phone)) {
        let phone = supplier.mobile || supplier.phone;
        let formattedPhone = phone.replace(/\D/g, '');
        if (formattedPhone.length === 10) {
          formattedPhone = '91' + formattedPhone;
        } else if (formattedPhone.startsWith('0')) {
           formattedPhone = '91' + formattedPhone.substring(1);
        }

        const message = `Hello ${supplier.name},\n\nPlease find the details of our Purchase Order:\n\n*PO No:* ${po.poNo}\n*Date:* ${new Date(po.createdAt || new Date()).toLocaleDateString('en-IN')}\n*Material:* ${po.material}\n*Quantity:* ${Number(po.quantity).toLocaleString('en-IN')}\n*Amount:* ₹${Number(po.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\nWe have attached the PDF for your reference.`;
        
        const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
      } else {
        toast.error('Supplier phone number not found.');
      }
    } catch (err) {
      console.error('Error generating PDF:', err);
      toast.error('Failed to generate PDF.', { id: toastId });
    }
  };

  const grnColumns = [
    { header: 'GRN', accessor: row => row.grnNo, render: row => <span className="font-bold text-[13px] text-gray-900">{row.grnNo}</span> },
    { header: 'AGAINST PO', accessor: row => row.poId, render: row => <span className="text-[13px] text-gray-700">{row.poId}</span> },
    { header: 'SUPPLIER', accessor: row => suppliers[row.supplierId]?.name || row.supplierId, render: row => <span className="text-[13px] text-gray-700">{suppliers[row.supplierId]?.name || row.supplierId}</span> },
    { header: 'MATERIAL', accessor: row => row.material, render: row => <span className="text-[13px] text-gray-700">{row.material}</span> },
    { header: 'DATE', accessor: row => new Date(row.date).toLocaleDateString('en-IN'), render: row => <span className="text-[13px] text-gray-500">{new Date(row.date).toLocaleDateString('en-IN')}</span> },
  ];



  return (
    <>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="flex justify-between items-start mb-2">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Purchase & GRN</h2>
            <p className="text-sm text-gray-500 mt-1">Manage suppliers, purchase orders and goods receipts.</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setIsAddPaperSizeModalOpen(true)}
              className="btn-add bg-gray-700 hover:bg-gray-800"
            >
              <Plus className="w-4 h-4 mr-1" /> <span>Add Paper Size</span>
            </button>
            <button
              onClick={() => setIsAddMaterialModalOpen(true)}
              className="btn-add bg-gray-700 hover:bg-gray-800"
            >
              <Plus className="w-4 h-4 mr-1" /> <span>Add Paper Material</span>
            </button>
            <button
              onClick={() => {
                setPoToEdit(null);
                setIsAddPOModalOpen(true);
              }}
              className="btn-add"
            >
              <Plus className="w-4 h-4 mr-1" /> <span>New Purchase Order</span>
            </button>
          </div>
        </div>

        {/* Approved Suppliers Chips */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Approved Suppliers</h3>
            <button
              onClick={() => {
                setSupplierToEdit(null);
                setIsAddSupplierModalOpen(true);
              }}
              className="btn-add"
            >
              <Plus className="w-4 h-4 mr-1" /> <span>Add Supplier</span>
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            {Object.values(suppliers).length > 0 ? (
              Object.values(suppliers).map(supplier => (
                <span
                  key={supplier.id}
                  onClick={() => {
                    setSupplierToEdit(supplier);
                    setIsAddSupplierModalOpen(true);
                  }}
                  className="bg-white text-gray-700 border border-gray-200 px-4 py-2 rounded-full text-[13px] font-medium shadow-sm hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  {supplier.name}
                </span>
              ))
            ) : (
              <span className="text-sm text-gray-500">No approved suppliers found.</span>
            )}
          </div>
        </div>

        {/* Paper Sizes Chips */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Paper Sizes</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            {paperSizes.length > 0 ? (
              paperSizes.map(size => (
                <span
                  key={size.id}
                  className="bg-white text-gray-700 border border-gray-200 px-4 py-2 rounded-full text-[13px] font-medium shadow-sm transition-colors"
                >
                  {size.name}
                </span>
              ))
            ) : (
              <span className="text-sm text-gray-500">No paper sizes added yet.</span>
            )}
          </div>
        </div>

        {/* PO Table */}
        <div>
          <DataTable
            isLoading={!isLoaded}
            title="Purchase Orders"
            columns={poColumns}
            data={poData}
            onRowClick={(row) => {
              setPoToEdit(row);
              setIsAddPOModalOpen(true);
            }}
          />
        </div>

        {/* GRN Table */}
        <div>
          <DataTable
            isLoading={!isLoaded}
            title="Goods Receipt Notes"
            columns={grnColumns}
            data={grnData}
          />
        </div>

      </div>
      <CreatePurchaseOrderModal
        isOpen={isAddPOModalOpen}
        onClose={() => {
          setIsAddPOModalOpen(false);
          setPoToEdit(null);
        }}
        suppliers={suppliers}
        inventory={inventory}
        pos={poData}
        onPoCreated={(newPo) => setPoData(prev => [...prev, newPo])}
        onPoUpdated={(updatedPo) => setPoData(prev => prev.map(po => po.id === updatedPo.id ? updatedPo : po))}
        onPoDeleted={(deletedId) => setPoData(prev => prev.filter(po => po.id !== deletedId))}
        onGrnCreated={(newGrn) => setGrnData(prev => [newGrn, ...prev])}
        poToEdit={poToEdit}
      />
      <AddSupplierModal
        isOpen={isAddSupplierModalOpen}
        onClose={() => {
          setIsAddSupplierModalOpen(false);
          setSupplierToEdit(null);
        }}
        supplierToEdit={supplierToEdit}
        onSupplierAdded={(newSupplier) => {
          setSuppliers(prev => [...prev, newSupplier]);
        }}
        onSupplierUpdated={(updatedSupplier) => {
          setSuppliers(prev => prev.map(s => s.id === updatedSupplier.id ? updatedSupplier : s));
        }}
        onSupplierDeleted={(deletedId) => {
          setSuppliers(prev => prev.filter(s => s.id !== deletedId));
        }}
      />
      <AddMaterialModal
        isOpen={isAddMaterialModalOpen}
        onClose={() => setIsAddMaterialModalOpen(false)}
        onMaterialAdded={(newMaterial) => {
          setInventory(prev => [...prev, newMaterial]);
        }}
      />
      <AddPaperSizeModal
        isOpen={isAddPaperSizeModalOpen}
        onClose={() => setIsAddPaperSizeModalOpen(false)}
        onPaperSizeAdded={(newSize) => {
          if (setPaperSizes) {
            setPaperSizes(prev => [...prev, newSize]);
          }
        }}
      />
    </>
  );
}
