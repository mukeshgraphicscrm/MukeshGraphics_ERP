import React, { useState, useEffect } from 'react';
import { Phone, MapPin, Plus, Trash2, MoreVertical, Edit2 } from 'lucide-react';
import DataTable from '../components/DataTable';
import AddCustomerModal from '../components/AddCustomerModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import toast from 'react-hot-toast';
import api from '../lib/api';

export default function Customers() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [startInEditMode, setStartInEditMode] = useState(false);

  useEffect(() => {
    const handleClickOutside = () => setOpenDropdownId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    api.get('/customers')
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching customers:', err);
        setLoading(false);
      });
  }, []);

  const confirmDeleteCustomer = (customer, e) => {
    e.stopPropagation();
    setCustomerToDelete(customer);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!customerToDelete) return;
    setIsDeleting(true);
    try {
      await api.delete(`/customers/${customerToDelete.id}`);
      setData((prev) => prev.filter(c => c.id !== customerToDelete.id));
      toast.success('Customer deleted successfully!');
      setDeleteModalOpen(false);
      setCustomerToDelete(null);
    } catch (err) {
      console.error('Error deleting customer:', err);
      toast.error('Failed to delete customer.');
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = [
    { header: 'Customer', accessor: row => row.name, render: row => {
      const initials = row.name ? row.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase() : 'NA';
      return (
        <div className="flex items-center">
          <div className="w-9 h-9 rounded-full bg-[#f1f5f9] text-[#1e3a8a] flex items-center justify-center font-bold text-xs mr-4 border border-[#e2e8f0]">
            {initials}
          </div>
          <div>
            <div className="font-bold text-gray-900 text-[13px]">{row.name}</div>
            <div className="text-gray-500 text-[12px]">{row.contactPerson}</div>
          </div>
        </div>
      );
    }},
    { header: 'Mobile', accessor: row => row.mobile, render: row => {
      let num = (row.mobile || '').replace(/\D/g, '');
      if (num.startsWith('91') && num.length === 12) num = num.substring(2);
      
      const formattedMobile = num.length === 10 
        ? `+91 ${num.substring(0, 5)} ${num.substring(5)}`
        : (row.mobile?.startsWith('+') ? row.mobile : `+91 ${row.mobile || ''}`);

      return (
        <div className="flex items-center text-gray-600 text-[13px]">
          <Phone className="w-3.5 h-3.5 mr-2 text-gray-400" />
          {formattedMobile}
        </div>
      );
    }},
    { header: 'City', accessor: row => row.city, render: row => (
      <div className="flex items-center text-gray-600 text-[13px]">
        <MapPin className="w-3.5 h-3.5 mr-2 text-gray-400" />
        {row.city}
      </div>
    )},
    { header: 'GST Number', accessor: row => row.gstNumber, render: row => (
      <span className="text-gray-500 text-[11px] tracking-wider uppercase">{row.gstNumber}</span>
    )},
    { header: 'Outstanding', accessor: row => row.outstanding, render: row => (
      <span className={row.outstanding > 0 ? "text-red-500 font-medium text-[13px]" : "text-gray-900 text-[13px]"}>
        ₹{row.outstanding?.toLocaleString('en-IN') || 0}
      </span>
    )},
    { header: 'Total Business', accessor: row => row.totalBusiness, render: row => (
      <span className="font-bold text-gray-900 text-[13px]">₹{row.totalBusiness?.toLocaleString('en-IN') || 0}</span>
    )},
    { header: 'Actions', accessor: row => row.id, render: row => (
      <div className="relative">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setOpenDropdownId(openDropdownId === row.id ? null : row.id);
          }}
          className="text-gray-400 hover:text-gray-600 p-1.5 rounded-md hover:bg-gray-100 transition-colors"
          title="More Actions"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
        {openDropdownId === row.id && (
          <div className="absolute right-0 mt-1 w-32 bg-white rounded-md shadow-lg border border-gray-100 z-50">
            <div className="py-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenDropdownId(null);
                  setStartInEditMode(true);
                  setCustomerToEdit(row);
                  setIsModalOpen(true);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
              >
                <Edit2 className="w-4 h-4 mr-2" /> Edit
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenDropdownId(null);
                  confirmDeleteCustomer(row, e);
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
              >
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </button>
            </div>
          </div>
        )}
      </div>
    )},
  ];

  if (loading) return <div className="p-8 text-center text-gray-500">Loading Customers...</div>;

  const handleCustomerAdded = (newCustomer) => {
    setData((prev) => [newCustomer, ...prev]);
  };

  const handleCustomerUpdated = (updatedCustomer) => {
    setData((prev) => prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
  };

  return (
    <div className="h-[calc(100vh-8rem)]">
      <DataTable
        title="Customers"
        subtitle="Manage clients, outstanding balances and business history."
        searchPlaceholder="Search customers, GST, city..."
        actionButton={
          <button 
            onClick={() => {
              setStartInEditMode(false);
              setCustomerToEdit(null);
              setIsModalOpen(true);
            }}
            className="btn-add"
          >
            <Plus className="w-4 h-4 mr-1" />
            <span>Add Customer</span>
          </button>
        }
        columns={columns}
        data={data}
        onRowClick={(row) => {
          setStartInEditMode(false);
          setCustomerToEdit(row);
          setIsModalOpen(true);
        }}
      />
      <AddCustomerModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setCustomerToEdit(null);
        }} 
        onCustomerAdded={handleCustomerAdded}
        onCustomerUpdated={handleCustomerUpdated}
        customerToEdit={customerToEdit}
        startInEditMode={startInEditMode}
      />
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setCustomerToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
        title="Delete Customer"
        message={
          <>
            Are you sure you want to delete <span className="font-bold">{customerToDelete?.name}</span>? This action cannot be undone.
          </>
        }
      />
    </div>
  );
}
