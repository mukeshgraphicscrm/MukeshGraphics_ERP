import React, { useState, useEffect, useRef } from 'react';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import { Wallet, AlertCircle, TrendingUp, Plus, MoreVertical, Edit2, Eye } from 'lucide-react';
import CreateInvoiceModal from '../components/CreateInvoiceModal';
import api from '../lib/api';
import { useData } from '../contexts/DataContext';

export default function Accounts() {
  const { invoices, setInvoices, customerMap: customers, isLoaded } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [invoiceToEdit, setInvoiceToEdit] = useState(null);
  const totalOutstanding = invoices
    .filter(i => i.status !== 'Paid')
    .reduce((sum, i) => sum + i.amount + i.gst, 0);

  const outstandingCustomersCount = new Set(
    invoices.filter(i => i.status !== 'Paid').map(i => i.customerId)
  ).size;

  const overduePayments = invoices
    .filter(i => i.status === 'Overdue')
    .reduce((sum, i) => sum + i.amount + i.gst, 0);

  const overdueInvoicesCount = invoices.filter(i => i.status === 'Overdue').length;

  const collectionsThisMonth = invoices
    .filter(i => i.status === 'Paid')
    .reduce((sum, i) => sum + i.amount + i.gst, 0);

  const columns = [
    { header: 'INVOICE', accessor: row => row.invoiceNo, render: row => <span className="font-bold text-[13px] text-[#1b2f63]">{row.invoiceNo}</span> },
    { header: 'CUSTOMER', accessor: row => customers[row.customerId]?.name || 'DELETED CUSTOMER', render: row => <span className="font-medium text-[13px] text-gray-900">{customers[row.customerId]?.name || 'DELETED CUSTOMER'}</span> },
    { header: 'AMOUNT', accessor: row => `₹${row.amount.toLocaleString('en-IN')}`, render: row => <span className="font-bold text-[13px] text-gray-900">₹{row.amount.toLocaleString('en-IN')}</span> },
    { header: 'GST', accessor: row => `₹${row.gst.toLocaleString('en-IN')}`, render: row => <span className="text-[13px] text-gray-500">₹{row.gst.toLocaleString('en-IN')}</span> },
    { header: 'DUE', accessor: row => new Date(row.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), render: row => <span className="text-[13px] text-gray-500">{new Date(row.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span> },
    { header: 'STATUS', accessor: row => row.status, render: row => <StatusBadge status={row.status} /> },
    {
      header: 'ACTIONS', accessor: row => row.id, render: row => (
        <AccountActions
          row={row}
          onEdit={(r) => {
            setInvoiceToEdit(r);
            setIsModalOpen(true);
          }}
          onView={(r) => {
            setInvoiceToEdit(r);
            setIsModalOpen(true);
          }}
        />
      )
    },
  ];

  // Calculate customer ledger (group by customer, sum outstanding)
  const ledgerMap = {};
  invoices.forEach(i => {
    if (i.status !== 'Paid') {
      if (!ledgerMap[i.customerId]) ledgerMap[i.customerId] = 0;
      ledgerMap[i.customerId] += (i.amount + i.gst);
    }
  });

  const ledgerEntries = Object.keys(ledgerMap).map(custId => {
    return {
      customerId: custId,
      customerName: customers[custId]?.name || custId,
      city: customers[custId]?.city || 'Unknown',
      outstanding: ledgerMap[custId],
      totalBusiness: customers[custId]?.totalBusiness || 0,
    };
  }).sort((a, b) => b.outstanding - a.outstanding);



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
            <div className="text-[11px] text-gray-500">June 2026</div>
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
                    <p className="text-[11px] text-gray-500">{entry.city}</p>
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
        customers={customers}
        onInvoiceCreated={(newInvoice) => {
          setInvoices(prev => [...prev, newInvoice]);
        }}
        onInvoiceUpdated={(updatedInvoice) => {
          setInvoices(prev => prev.map(inv => inv.id === updatedInvoice.id ? updatedInvoice : inv));
        }}
        invoiceToEdit={invoiceToEdit}
      />
    </div>
  );
}

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

