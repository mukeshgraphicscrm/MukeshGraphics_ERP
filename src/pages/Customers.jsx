import React, { useState, useEffect, useRef } from 'react';
import { Phone, MapPin, Plus, Trash2, MoreVertical, Edit2, Package } from 'lucide-react';
import DataTable from '../components/DataTable';
import AddCustomerModal from '../components/AddCustomerModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import CustomerOrderHistoryModal from '../components/CustomerOrderHistoryModal';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useData } from '../contexts/DataContext';

export default function Customers() {
  const { customers: data, orders = [], products = [], setCustomers: setData, isLoaded } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [customerForHistory, setCustomerForHistory] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [startInEditMode, setStartInEditMode] = useState(false);

  const customerBusinessMap = React.useMemo(() => {
    const map = {};
    orders.forEach(o => {
      if (o.customerId) {
        map[o.customerId] = (map[o.customerId] || 0) + (Number(o.amount) || 0);
      }
    });
    return map;
  }, [orders]);

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
    { header: 'Total Business', accessor: row => customerBusinessMap[row.id] || 0, render: row => (
      <span className="font-bold text-gray-900 text-[13px]">₹{(customerBusinessMap[row.id] || 0).toLocaleString('en-IN')}</span>
    )},
    { header: 'Actions', accessor: row => row.id, render: row => (
      <CustomerActions 
        row={row}
        onEdit={(r) => {
          setStartInEditMode(true);
          setCustomerToEdit(r);
          setIsModalOpen(true);
        }}
        onViewHistory={(r) => {
          setCustomerForHistory(r);
          setHistoryModalOpen(true);
        }}
        onDelete={(r, e) => confirmDeleteCustomer(r, e)}
      />
    )},
  ];



  const handleCustomerAdded = (newCustomer) => {
    setData((prev) => [newCustomer, ...prev]);
  };

  const handleCustomerUpdated = (updatedCustomer) => {
    setData((prev) => prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
  };

  return (
    <div className="h-[calc(100vh-8rem)]">
      <DataTable
        isLoading={!isLoaded}
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
      <CustomerOrderHistoryModal
        isOpen={historyModalOpen}
        onClose={() => {
          setHistoryModalOpen(false);
          setCustomerForHistory(null);
        }}
        customer={customerForHistory}
        orders={orders}
        products={products}
      />
    </div>
  );
}

const CustomerActions = ({ row, onEdit, onViewHistory, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current && !menuRef.current.contains(event.target) &&
        buttonRef.current && !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    
    const handleScroll = () => {
      if (isOpen) setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  const toggleMenu = (e) => {
    e.stopPropagation();
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, left: rect.right - 192 }); // w-48 is 192px
    }
    setIsOpen(!isOpen);
  };

  return (
    <div onClick={e => e.stopPropagation()}>
      <button 
        ref={buttonRef}
        onClick={toggleMenu}
        className="text-gray-400 hover:text-gray-600 p-1.5 rounded-md hover:bg-gray-100 transition-colors"
        title="More Actions"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && (
        <div 
          ref={menuRef}
          style={{ position: 'fixed', top: menuPos.top, left: menuPos.left }}
          className="w-48 bg-white rounded-md shadow-[0_0_15px_rgba(0,0,0,0.15)] border border-gray-100 z-[9999] py-1"
        >
          <button
            onClick={(e) => { e.stopPropagation(); setIsOpen(false); onEdit(row); }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
          >
            <Edit2 className="w-4 h-4 mr-2" /> Edit
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setIsOpen(false); onViewHistory(row); }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
          >
            <Package className="w-4 h-4 mr-2" /> View Order History
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setIsOpen(false); onDelete(row, e); }}
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
          >
            <Trash2 className="w-4 h-4 mr-2" /> Delete
          </button>
        </div>
      )}
    </div>
  );
};

