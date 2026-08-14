import React, { useState, useEffect } from 'react';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import { MapPin, FileText, Truck, Plus, Trash2 } from 'lucide-react';
import ScheduleDispatchModal from '../components/ScheduleDispatchModal';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function Dispatch() {
  const [data, setData] = useState([]);
  const [customers, setCustomers] = useState({});
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dispatchToEdit, setDispatchToEdit] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [dispatchToDelete, setDispatchToDelete] = useState(null);

  const handleDeleteDispatch = async () => {
    try {
      await api.delete(`/dispatches/${dispatchToDelete.id}`);
      setData(prev => prev.filter(d => d.id !== dispatchToDelete.id));
      toast.success('Dispatch deleted successfully!');
    } catch (err) {
      console.error('Error deleting dispatch:', err);
      toast.error('Failed to delete dispatch.');
    } finally {
      setIsDeleteModalOpen(false);
      setDispatchToDelete(null);
    }
  };

  useEffect(() => {
    Promise.all([
      api.get('/dispatches'),
      api.get('/customers'),
    ]).then(([dspRes, custRes]) => {
      const custMap = {};
      custRes.data.forEach(c => custMap[c.id] = c);
      setCustomers(custMap);
      setData(dspRes.data || []);
      setLoading(false);
    }).catch(err => {
      console.error('Error fetching dispatches:', err);
      setLoading(false);
    });
  }, []);

  const columns = [
    { header: 'DISPATCH No.', accessor: row => row.dispatchNo, render: row => <span className="font-bold text-gray-900 text-[13px]">{row.dispatchNo}</span> },
    { header: 'CUSTOMER', accessor: row => row.customer || customers[row.customerId]?.name || 'DELETED CUSTOMER', render: row => <span className="text-[13px] text-gray-700 font-medium">{row.customer || customers[row.customerId]?.name || 'DELETED CUSTOMER'}</span> },
    {
      header: 'TRANSPORTER', accessor: row => row.vehicleNo, render: row => (
        <div className="flex items-center text-gray-600 text-[13px]">
          <Truck className="w-4 h-4 mr-2 text-gray-400" />
          <span className="font-mono">{row.vehicleNo}</span>
        </div>
      )
    },
    { header: 'BOOKING LOCATION', accessor: row => row.driver, render: row => <span className="text-[13px] text-gray-700">{row.driver}</span> },
    { header: 'DATE', accessor: row => new Date(row.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), render: row => <span className="text-[13px] text-gray-500">{new Date(row.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span> },
    { header: 'STATUS', accessor: row => row.status, render: row => <StatusBadge status={row.status} /> },
    {
      header: 'ACTIONS',
      accessor: () => null,
      render: (row) => (
        <div className="flex space-x-3">
          <button className="text-gray-400 hover:text-[#1b2f63] transition-colors" title="View Challan" onClick={(e) => e.stopPropagation()}>
            <FileText className="w-4 h-4" />
          </button>
          <button className="text-[#1b2f63] hover:text-[#112046] transition-colors bg-blue-50 p-1 rounded" title="View Map Location" onClick={(e) => e.stopPropagation()}>
            <MapPin className="w-4 h-4" />
          </button>
          <button
            className="text-red-400 hover:text-red-600 transition-colors bg-red-50 p-1 rounded"
            title="Delete Dispatch"
            onClick={(e) => {
              e.stopPropagation();
              setDispatchToDelete(row);
              setIsDeleteModalOpen(true);
            }}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    },
  ];

  if (loading) return <div className="p-8 text-center text-gray-500">Loading Dispatch Schedule...</div>;

  return (
    <>
      <div className="h-[calc(100vh-8rem)]">
        <DataTable
          title="Dispatch"
          subtitle="Transporters, locations and delivery challans — every shipment tracked."
          searchPlaceholder="Search dispatch no., transporter, location..."
          actionButton={
            <button
              onClick={() => {
                setDispatchToEdit(null);
                setIsModalOpen(true);
              }}
              className="btn-add"
            >
              <Plus className="w-4 h-4 mr-1" /> <span>Schedule Dispatch</span>
            </button>
          }
          columns={columns}
          data={data}
          onRowClick={(row) => {
            setDispatchToEdit(row);
            setIsModalOpen(true);
          }}
        />
      </div>

      <ScheduleDispatchModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setDispatchToEdit(null);
        }}
        onDispatchScheduled={(newDispatch) => {
          setData(prev => [newDispatch, ...prev]);
        }}
        onDispatchUpdated={(updatedDispatch) => {
          setData(prev => prev.map(d => d.id === updatedDispatch.id ? updatedDispatch : d));
        }}
        dispatchToEdit={dispatchToEdit}
      />

      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDispatchToDelete(null);
        }}
        onConfirm={handleDeleteDispatch}
        title="Delete Dispatch"
        message={`Are you sure you want to delete dispatch ${dispatchToDelete?.dispatchNo}? This action cannot be undone.`}
      />
    </>
  );
}
