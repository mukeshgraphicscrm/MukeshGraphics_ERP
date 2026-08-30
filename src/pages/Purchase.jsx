import React, { useState, useEffect } from 'react';
import { Plus, FileDown } from 'lucide-react';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import CreatePurchaseOrderModal from '../components/CreatePurchaseOrderModal';
import AddSupplierModal from '../components/AddSupplierModal';
import AddMaterialModal from '../components/AddMaterialModal';
import api from '../lib/api';
import { useData } from '../contexts/DataContext';
import { generatePurchaseOrderPDF } from '../lib/pdfGenerator';
import toast from 'react-hot-toast';

export default function Purchase() {
  const { purchaseOrders: poData, setPurchaseOrders: setPoData, grnData, setGrnData, supplierMap: suppliers, setSuppliers, inventory, setInventory, isLoaded } = useData();
  const [isAddPOModalOpen, setIsAddPOModalOpen] = useState(false);
  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState(false);
  const [isAddMaterialModalOpen, setIsAddMaterialModalOpen] = useState(false);
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
        <button 
          onClick={(e) => { e.stopPropagation(); generatePDF(row); }}
          className="p-1.5 bg-brand-primary/10 text-brand-primary rounded-md hover:bg-brand-primary/20 transition-colors"
          title="Generate PO Document"
        >
          <FileDown className="w-4 h-4" />
        </button>
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
    </>
  );
}
