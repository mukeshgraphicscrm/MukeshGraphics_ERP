import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import { Wallet, AlertCircle, TrendingUp, Plus, MoreVertical, Edit2, Eye, CheckCircle, Clock, AlertTriangle, Download, X } from 'lucide-react';
import CreateInvoiceModal from '../components/CreateInvoiceModal';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useData } from '../contexts/DataContext';
import { generateInvoicePDF } from '../lib/pdfGenerator';

export default function Accounts() {
  const { invoices, setInvoices, customerMap: customers, products, isLoaded } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [invoiceToEdit, setInvoiceToEdit] = useState(null);
  const [modalMode, setModalMode] = useState('create');
  
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);

  // Payment Modal State
  const [selectedLedgerCustomer, setSelectedLedgerCustomer] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isPaymentModalOpen && !isProcessingPayment) {
        setIsPaymentModalOpen(false);
      }
    };

    if (isPaymentModalOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPaymentModalOpen, isProcessingPayment]);

  // Filter invoices based on date range
  const filteredInvoices = invoices.filter(i => {
    if (!fromDate && !toDate) return true;
    const invDateStr = i.date || i.createdAt || i.dueDate;
    if (!invDateStr) return true;
    
    const invDate = new Date(invDateStr);
    invDate.setHours(0,0,0,0);
    
    if (fromDate) {
      const fd = new Date(fromDate);
      fd.setHours(0,0,0,0);
      if (invDate < fd) return false;
    }
    if (toDate) {
      const td = new Date(toDate);
      td.setHours(0,0,0,0);
      if (invDate > td) return false;
    }
    return true;
  });

  // Calculate customer ledger (group by customer, sum outstanding)
  const outstandingMap = {};
  const totalBusinessMap = {};

  filteredInvoices.forEach(i => {
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

  const totalOutstanding = Object.values(outstandingMap).reduce((sum, val) => sum + val, 0);
  const outstandingCustomersCount = Object.values(outstandingMap).filter(val => val > 0).length;

  const overduePayments = filteredInvoices
    .filter(i => i.status === 'Overdue')
    .reduce((sum, i) => sum + (i.amount || 0) + (i.gst || 0) - (i.advancePaymentAmount || 0), 0);

  const overdueInvoicesCount = filteredInvoices.filter(i => i.status === 'Overdue').length;

  const collectionsThisMonth = filteredInvoices.reduce((sum, i) => {
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
          onDownload={async (r) => {
            try {
              const toastId = toast.loading('Generating PDF...');
              const prodMap = {};
              products.forEach(p => prodMap[p.id] = p);
              await generateInvoicePDF(r, customers, prodMap);
              toast.success('PDF downloaded successfully', { id: toastId });
            } catch (err) {
              console.error(err);
              toast.error('Failed to generate PDF');
            }
          }}
        />
      )
    },
  ];




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

  const openPaymentModal = (customerId) => {
    setSelectedLedgerCustomer(customerId);
    setPaymentAmount('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedLedgerCustomer || !paymentAmount) return;

    const amountToPay = parseFloat(paymentAmount);
    if (isNaN(amountToPay) || amountToPay <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const customerOutstanding = outstandingMap[selectedLedgerCustomer] || 0;
    if (amountToPay > customerOutstanding) {
      toast.error(`Amount exceeds total outstanding balance (₹${customerOutstanding.toLocaleString('en-IN')})`);
      return;
    }

    setIsProcessingPayment(true);
    const toastId = toast.loading('Processing payment...');

    try {
      // 1. Get unpaid invoices for this customer
      let unpaidInvoices = invoices.filter(
        i => i.customerId === selectedLedgerCustomer && i.status !== 'Paid'
      );

      // 2. Sort from oldest to newest (by dueDate, then createdAt)
      unpaidInvoices.sort((a, b) => {
        const dateA = new Date(a.dueDate || a.createdAt || a.date);
        const dateB = new Date(b.dueDate || b.createdAt || b.date);
        return dateA - dateB;
      });

      let remainingPayment = amountToPay;
      const updatedInvoicesData = [];

      // 3. Distribute payment
      for (const inv of unpaidInvoices) {
        if (remainingPayment <= 0) break;

        const invTotal = (inv.amount || 0) + (inv.gst || 0);
        const currentAdvance = (inv.advancePaymentAmount || 0);
        const balanceDue = invTotal - currentAdvance;

        if (balanceDue <= 0) continue;

        let amountAppliedToThisInvoice = 0;
        let newStatus = inv.status;

        if (remainingPayment >= balanceDue) {
          // Pay this invoice in full
          amountAppliedToThisInvoice = balanceDue;
          newStatus = 'Paid';
        } else {
          // Pay partially
          amountAppliedToThisInvoice = remainingPayment;
        }

        const newAdvance = currentAdvance + amountAppliedToThisInvoice;
        remainingPayment -= amountAppliedToThisInvoice;

        // Prepare updated invoice data
        const updatedInvoice = {
          ...inv,
          advancePaymentAmount: newAdvance,
          status: newStatus
        };
        updatedInvoicesData.push(updatedInvoice);
      }

      // 4. API Calls
      const apiPromises = updatedInvoicesData.map(inv => 
        api.put(`/invoices/${inv.id}`, inv)
      );
      
      const responses = await Promise.all(apiPromises);
      const updatedInvoicesFromServer = responses.map(res => res.data);

      // 5. Update local state
      setInvoices(prev => {
        const newInvoices = [...prev];
        updatedInvoicesFromServer.forEach(updated => {
          const index = newInvoices.findIndex(i => i.id === updated.id);
          if (index !== -1) {
            newInvoices[index] = updated;
          }
        });
        return newInvoices;
      });

      toast.success('Payment applied successfully', { id: toastId });
      setIsPaymentModalOpen(false);
      setSelectedLedgerCustomer(null);
    } catch (error) {
      console.error('Payment processing error:', error);
      toast.error('Failed to process payment', { id: toastId });
    } finally {
      setIsProcessingPayment(false);
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
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm text-sm">
            <div className="flex items-center gap-1">
              <span className="text-gray-500 font-medium">From:</span>
              <input 
                type="date" 
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="border-none bg-transparent focus:ring-0 p-0 text-gray-700 font-medium w-28 cursor-pointer"
              />
            </div>
            <div className="h-4 w-px bg-gray-300"></div>
            <div className="flex items-center gap-1">
              <span className="text-gray-500 font-medium">To:</span>
              <input 
                type="date" 
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="border-none bg-transparent focus:ring-0 p-0 text-gray-700 font-medium w-28 cursor-pointer"
              />
            </div>
            {(fromDate || toDate) && (
              <>
                <div className="h-4 w-px bg-gray-300"></div>
                <button 
                  onClick={() => { setFromDate(''); setToDate(''); }}
                  className="text-gray-400 hover:text-red-500 transition-colors p-1"
                  title="Clear Dates"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
          <button
            onClick={() => {
              setInvoiceToEdit(null);
              setModalMode('create');
              setIsModalOpen(true);
            }}
            className="btn-add whitespace-nowrap"
          >
            <Plus className="w-4 h-4 mr-1" />
            <span>Final Estimate</span>
          </button>
        </div>
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
            data={filteredInvoices}
          />
        </div>

        <div className="lg:w-[30%]">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm h-[500px] flex flex-col">
            <h3 className="text-[15px] font-bold text-gray-900">Customer Ledger</h3>
            <p className="text-[12px] text-gray-500 mb-6">Outstanding balances by customer</p>

            <div className="space-y-5 overflow-y-auto pr-2 flex-grow">
              {ledgerEntries.length > 0 ? ledgerEntries.map(entry => (
                <div 
                  key={entry.customerId} 
                  className="flex justify-between items-start cursor-pointer hover:bg-gray-50 p-2 -mx-2 rounded-lg transition-colors"
                  onClick={() => openPaymentModal(entry.customerId)}
                  title="Click to add payment"
                >
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

      {/* Payment Modal */}
      {isPaymentModalOpen && createPortal(
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4"
          onClick={() => !isProcessingPayment && setIsPaymentModalOpen(false)}
        >
          <div 
            className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-900">Add Payment</h3>
              <button 
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isProcessingPayment}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handlePaymentSubmit} className="p-5 space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Customer</p>
                <p className="font-bold text-gray-900">{customers[selectedLedgerCustomer]?.name}</p>
                <p className="text-xs text-[#dc2626] mt-1 font-medium">
                  Outstanding: ₹{(outstandingMap[selectedLedgerCustomer] || 0).toLocaleString('en-IN')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={e => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1b2f63]/50 focus:border-[#1b2f63] text-sm transition-colors"
                  disabled={isProcessingPayment}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                <input
                  type="number"
                  required
                  min="1"
                  step="0.01"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1b2f63]/50 focus:border-[#1b2f63] text-sm transition-colors"
                  disabled={isProcessingPayment}
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={isProcessingPayment}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingPayment || !paymentAmount}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[#1b2f63] rounded-lg hover:bg-opacity-90 disabled:opacity-50"
                >
                  {isProcessingPayment ? 'Processing...' : 'Apply Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

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

const AccountActions = ({ row, onEdit, onView, onDownload }) => {
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
          <button
            onClick={() => { setIsOpen(false); if (onDownload) onDownload(row); }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
          >
            <Download className="w-4 h-4 mr-2" /> Download PDF
          </button>
        </div>
      )}
    </div>
  );
};

