import React, { useState, useEffect } from 'react';
import { Layers, AlertTriangle, FileText, Droplet, Plus, Download, Upload, Package, Box, Boxes } from 'lucide-react';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import AddMaterialModal from '../components/AddMaterialModal';
import api from '../lib/api';

export default function Inventory() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [materialToEdit, setMaterialToEdit] = useState(null);

  useEffect(() => {
    api.get('/inventory')
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching inventory:', err);
        setLoading(false);
      });
  }, []);

  const lowStockItems = data.filter(item => item.status === 'Low Stock');

  const columns = [
    { header: 'MATERIAL', accessor: row => row.material, render: row => <span className="font-bold text-gray-900 text-[13px]">{row.material}</span> },
    { header: 'CATEGORY', accessor: row => row.category, render: row => <span className="text-[13px] text-gray-600">{row.category}</span> },
    {
      header: 'STOCK',
      accessor: row => row.stock,
      render: row => (
        <span className="font-bold text-gray-900 text-[13px]">
          {row.stock.toLocaleString('en-IN')}
        </span>
      )
    },
    { header: 'UNIT', accessor: row => row.unit, render: row => <span className="text-gray-500 text-[13px]">{row.unit}</span> },
    { header: 'MIN', accessor: row => row.min, render: row => <span className="text-gray-500 text-[13px]">{row.min.toLocaleString('en-IN')}</span> },
    { header: 'STATUS', accessor: row => row.status, render: row => <StatusBadge status={row.status} /> },
  ];

  if (loading) return <div className="p-8 text-center text-gray-500">Loading Inventory...</div>;

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Inventory</h2>
          <p className="text-sm text-gray-500 mt-1">Materials, ink, consumables and tooling — live stock levels.</p>
        </div>
        <div className="flex space-x-3">
          <button className="flex items-center space-x-2 bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-lg text-[13px] font-medium hover:bg-gray-50 transition-colors shadow-sm">
            <Download className="w-4 h-4" />
            <span>Stock In</span>
          </button>
          <button className="flex items-center space-x-2 bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-lg text-[13px] font-medium hover:bg-gray-50 transition-colors shadow-sm">
            <Upload className="w-4 h-4" />
            <span>Stock Out</span>
          </button>
          <button
            onClick={() => {
              setMaterialToEdit(null);
              setIsAddModalOpen(true);
            }}
            className="btn-add"
          >
            <Plus className="w-4 h-4 mr-1" /> <span>Add Material</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col h-[116px]">
          <div className="flex justify-between items-center">
            <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total SKUs</h3>
            <div className="w-8 h-8 rounded-full bg-[#f1f5f9] text-[#475569] flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900">{data.length}</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col h-[116px]">
          <div className="flex justify-between items-center">
            <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Low Stock Alerts</h3>
            <div className="w-8 h-8 rounded-full bg-[#fff7ed] text-[#ea580c] flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900">{lowStockItems.length}</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col h-[116px]">
          <div className="flex justify-between items-center">
            <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Paper Sheets</h3>
            <div className="w-8 h-8 rounded-full bg-[#eff6ff] text-[#2563eb] flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-gray-900 leading-none">
              {data.filter(d => d.category === 'Paper').reduce((a, b) => a + b.stock, 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-gray-400 mt-1">across {data.filter(d => d.category === 'Paper').length} SKUs</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col h-[116px]">
          <div className="flex justify-between items-center">
            <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Ink (Liters)</h3>
            <div className="w-8 h-8 rounded-full bg-[#fefce8] text-[#ca8a04] flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {data.filter(d => d.category === 'Ink').reduce((a, b) => a + b.stock, 0).toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Warning Banner */}
      {lowStockItems.length > 0 && (
        <div className="bg-[#fffdf0] border border-[#fde68a] p-4 rounded-xl flex flex-col justify-center shadow-sm">
          <div className="flex items-center mb-1">
            <AlertTriangle className="h-4 w-4 text-gray-900 mr-2" />
            <h3 className="text-[14px] font-bold text-gray-900">Low stock alerts</h3>
          </div>
          <p className="text-[13px] text-gray-500 ml-6">
            {lowStockItems.map(i => i.material).join(' · ')} are below minimum threshold. Consider raising a PO.
          </p>
        </div>
      )}

      {/* Table */}
      <div className="h-[500px]">
        <DataTable
          title=""
          searchPlaceholder="Search materials, categories..."
          columns={columns}
          data={data}
          onRowClick={(row) => {
            setMaterialToEdit(row);
            setIsAddModalOpen(true);
          }}
        />
      </div>
    </div>
    <AddMaterialModal
      isOpen={isAddModalOpen}
      onClose={() => {
        setIsAddModalOpen(false);
        setMaterialToEdit(null);
      }}
      onMaterialAdded={(newMaterial) => {
        setData([newMaterial, ...data]);
      }}
      onMaterialUpdated={(updatedMaterial) => {
        setData(data.map(m => m.id === updatedMaterial.id ? updatedMaterial : m));
      }}
      materialToEdit={materialToEdit}
    />
    </>
  );
}
