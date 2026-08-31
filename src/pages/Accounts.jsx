import React, { useState, useEffect, useRef } from 'react';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import { Wallet, AlertCircle, TrendingUp, Plus, MoreVertical, Edit2, Eye, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import CreateInvoiceModal from '../components/CreateInvoiceModal';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useData } from '../contexts/DataContext';

export default function Accounts() {
  const { invoices, setInvoices, customerMap: customers, isLoaded } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [invoiceToEdit, setInvoiceToEdit] = useState(null);
  const [modalMode, setModalMode] = useState('create');
  const totalOutstanding = invoices
    .filter(i => i.status !== 'Paid')
    .reduce((sum, i) => sum + (i.amount || 0) + (i.gst || 0) - (i.advancePaymentAmount || 0), 0);

  const outstandingCustomersCount = new Set(
    invoices.filter(i => i.status !== 'Paid' && ((i.amount || 0) + (i.gst || 0) - (i.advancePaymentAmount || 0)) > 0).map(i => i.customerId)
  ).size;

  const overduePayments = invoices
    .filter(i => i.status === 'Overdue')
    .reduce((sum, i) => sum + (i.amount || 0) + (i.gst || 0) - (i.advancePaymentAmount || 0), 0);

  const overdueInvoicesCount = invoices.filter(i => i.status === 'Overdue').length;

  const collectionsThisMonth = invoices.reduce((sum, i) => {
    if (i.status === 'Paid') {
      return sum + (i.amount || 0) + (i.gst || 0);
    } else {
      return sum + (i.advancePaymentAmount || 0);
    }
  }, 0);

  const columns = [
    { header: 'INVOICE', accessor: row => row.invoiceNo, render: row => <span className="font-bold text-[13px] text-[#1b2f63]">{row.invoiceNo}</span> },
    { header: 'CUSTOMER', accessor: row => customers[row.customerId]?.name || 'DELETED CUSTOMER', render: row => <span className="font-medium text-[13px] text-gray-900">{customers[row.customerId]?.name || 'DELETED CUSTOMER'}</span> },
    { header: 'AMOUNT', accessor: row => `₹${row.amount.toLocaleString('en-IN')}`, render: row => <span className="font-bold text-[13px] text-gray-900">₹{row.amount.toLocaleString('en-IN')}</span> },
    { header: 'GST', accessor: row => `₹${row.gst.toLocaleString('en-IN')}`, render: row => <span className="text-[13px] text-gray-500">₹{row.gst.toLocaleString('en-IN')}</span> },
    { header: 'DUE', accessor: row => new Date(row.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), render: row => <span className="text-[13px] text-gray-500">{new Date(row.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span> },
    { header: 'STATUS', accessor: row => row.status, render: row => <InteractiveStatusBadge row={row} onStatusChange={handleStatusChange} /> },
    {
      header: 'ACTIONS', accessor: row => row.id, render: row => (
        <AccountActions
          row={row}
          onEdit={(r) => {
            setInvoiceToEdit(r);
            setModalMode('edit');
            setIsModalOpen(true);
          }}
          onView={(r) => {
            setInvoiceToEdit(r);
            setModalMode('view');
            setIsModalOpen(true);
          }}
        />
      )
    },
  ];

  // Calculate customer ledger (group by customer, sum outstanding)
  const outstandingMap = {};
  const totalBusinessMap = {};
  
  invoices.forEach(i => {
    const custId = i.customerId;
    if (!custId) return;

    const invTotal = (i.amount || 0) + (i.gst || 0);
    const advance = (i.advancePaymentAmount || 0);

    if (!totalBusinessMap[custId]) totalBusinessMap[custId] = 0;
    totalBusinessMap[custId] += invTotal;

    if (i.status !== 'Paid') {
      if (!outstandingMap[custId]) outstandingMap[custId] = 0;
      outstandingMap[custId] += (invTotal - advance);
    }
  });

  const ledgerEntries = Object.keys(totalBusinessMap).map(custId => {
    const cust = customers[custId];
    const contactPerson = cust?.contactPerson;
    const city = cust?.city;
    const contactCity = contactPerson && city ? `${contactPerson}, ${city}` : (contactPerson || city || 'Unknown');

    return {
      customerId: custId,
      customerName: cust?.name || custId,
      contactCity: contactCity,
      outstanding: outstandingMap[custId] || 0,
      totalBusiness: totalBusinessMap[custId] || 0,
    };
  }).sort((a, b) => b.outstanding - a.outstanding);

  const handleStatusChange = async (row, newStatus) => {
    const toastId = toast.loading('Updating status...');
    try {
      const res = await api.put(`/invoices/${row.id}`, { ...row, status: newStatus });
      setInvoices(prev => prev.map(inv => inv.id === row.id ? res.data : inv));
      toast.success(`Status updated to ${newStatus}`, { id: toastId });
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Failed to update status', { id: toastId });
    }
  };



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Accounts & Payments</h2>
          <p className="text-sm text-gray-500 mt-1">Invoices, GST, collections and customer ledgers.</p>
        </div>
        <button
          onClick={() => {
            setInvoiceToEdit(null);
            setModalMode('create');
            setIsModalOpen(true);
          }}
          className="btn-add"
        >
          <Plus className="w-4 h-4 mr-1" />
          <span>Final Estimate</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-[140px]">
          <div className="flex justify-between items-center">
            <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">TOTAL OUTSTANDING</h3>
            <div className="w-8 h-8 rounded-full bg-[#fffbeb] flex items-center justify-center text-[#d97706]">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-gray-900 leading-none mb-1">₹{totalOutstanding.toLocaleString('en-IN')}</div>
            <div className="text-[11px] text-gray-500">Across {outstandingCustomersCount} customers</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-[140px]">
          <div className="flex justify-between items-center">
            <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">OVERDUE PAYMENTS</h3>
            <div className="w-8 h-8 rounded-full bg-[#fef2f2] flex items-center justify-center text-[#dc2626]">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-gray-900 leading-none mb-1">₹{overduePayments.toLocaleString('en-IN')}</div>
            <div className="text-[11px] text-gray-500">{overdueInvoicesCount} invoices past due</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-[140px]">
          <div className="flex justify-between items-center">
            <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">COLLECTIONS (MONTH)</h3>
            <div className="w-8 h-8 rounded-full bg-[#f0fdf4] flex items-center justify-center text-[#16a34a]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-gray-900 leading-none mb-1">₹{collectionsThisMonth.toLocaleString('en-IN')}</div>
            <div className="text-[11px] text-gray-500">{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-[70%] h-[500px]">
          <DataTable
            isLoading={!isLoaded}
            title="Invoices"
            searchPlaceholder="Search invoices..."
            columns={columns}
            data={invoices}
          />
        </div>

        <div className="lg:w-[30%]">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm h-[500px] flex flex-col">
            <h3 className="text-[15px] font-bold text-gray-900">Customer Ledger</h3>
            <p className="text-[12px] text-gray-500 mb-6">Outstanding balances by customer</p>

            <div className="space-y-5 overflow-y-auto pr-2 flex-grow">
              {ledgerEntries.length > 0 ? ledgerEntries.map(entry => (
                <div key={entry.customerId} className="flex justify-between items-start">
                  <div>
                    <p className="text-[13px] font-bold text-gray-900">{entry.customerName}</p>
                    <p className="text-[11px] text-gray-500 uppercase">{entry.contactCity}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-bold text-[#dc2626]">₹{entry.outstanding.toLocaleString('en-IN')}</p>
                    <p className="text-[11px] text-gray-400">of ₹{entry.totalBusiness.toLocaleString('en-IN')}</p>
                  </div>
                </div>
              )) : (
                <div className="text-center text-sm text-gray-500 py-10">No outstanding balances.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <CreateInvoiceModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setInvoiceToEdit(null);
        }}
        initialViewMode={modalMode === 'view'}
        customers={customers}
        onInvoiceCreated={(newInvoice) => {
          setInvoices(prev => [...prev, newInvoice]);
        }}
        onInvoiceUpdated={(updatedInvoice) => {
          setInvoices(prev => prev.map(inv => inv.id === updatedInvoice.id ? updatedInvoice : inv));
        }}
        onInvoiceDeleted={(deletedId) => {
          setInvoices(prev => prev.filter(inv => inv.id !== deletedId));
        }}
        invoiceToEdit={invoiceToEdit}
      />
    </div>
  );
}

const InteractiveStatusBadge = ({ row, onStatusChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const badgeRef = useRef(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current && !menuRef.current.contains(event.target) &&
        badgeRef.current && !badgeRef.current.contains(event.target)
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

  const toggleMenu = () => {
    if (!isOpen && badgeRef.current) {
      const rect = badgeRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, left: rect.left });
    }
    setIsOpen(!isOpen);
  };

  return (
    <div onClick={e => e.stopPropagation()}>
      <div 
        ref={badgeRef}
        onClick={toggleMenu} 
        className="cursor-pointer hover:opacity-80 transition-opacity inline-flex items-center gap-1"
        title="Click to change status"
      >
        <StatusBadge status={row.status} />
      </div>
      
      {isOpen && (
        <div 
          ref={menuRef}
          className="w-32 bg-white rounded-md shadow-lg border border-gray-100 z-[9999] py-1" 
          style={{ position: 'fixed', top: menuPos.top, left: menuPos.left }}
        >
          {['Pending', 'Paid', 'Overdue'].map(status => (
            row.status !== status && (
              <button
                key={status}
                onClick={() => { setIsOpen(false); onStatusChange(row, status); }}
                className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center transition-colors"
              >
                <StatusBadge status={status} />
              </button>
            )
          ))}
        </div>
      )}
    </div>
  );
};

const AccountActions = ({ row, onEdit, onView }) => {
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

  const toggleMenu = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, left: rect.right - 128 });
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
          className="w-32 bg-white rounded-md shadow-lg border border-gray-100 z-50 py-1"
        >
          <button
            onClick={() => { setIsOpen(false); onEdit(row); }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
          >
            <Edit2 className="w-4 h-4 mr-2" /> Edit
          </button>
          <button
            onClick={() => { setIsOpen(false); onView(row); }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
          >
            <Eye className="w-4 h-4 mr-2" /> View
          </button>
        </div>
      )}
    </div>
  );
};

