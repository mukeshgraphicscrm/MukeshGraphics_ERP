import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, ShoppingCart, Factory, Truck, CheckCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { useData } from '../contexts/DataContext';

export default function ViewJobPipelineModal({ isOpen, onClose, job }) {
  const { quotations, orders, customerMap, products, dispatches } = useData();
  const [pipelineData, setPipelineData] = useState({
    quotation: null,
    order: null,
    production: null,
    dispatch: null
  });
  const [expanded, setExpanded] = useState({ quotation: true, order: true, production: true, dispatch: true });

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const customer = Object.values(customerMap || {}).find(c =>
    c.name.toLowerCase() === job?.customerName?.toLowerCase()
  );
  const customerId = customer?.id;

  const product = products.find(p =>
    p.name.toLowerCase() === job?.productName?.toLowerCase()
  );
  const productId = product?.id;

  useEffect(() => {
    if (!job || !isOpen) return;

    const jobDate = job.createdAt ? new Date(job.createdAt) : new Date();

    // Find Quotation
    let matchedQuote = null;
    if (customerId && productId) {
      const possibleQuotes = quotations.filter(q =>
        q.customerId === customerId &&
        q.items?.some(item => item.productId === productId)
      ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      matchedQuote = possibleQuotes.find(q => new Date(q.createdAt) <= jobDate) || possibleQuotes[0];
    }

    // Find Order
    let matchedOrder = null;
    if (customerId && productId) {
      const possibleOrders = orders.filter(o =>
        o.customerId === customerId &&
        (Array.isArray(o.productId) ? o.productId.includes(productId) : o.productId === productId)
      ).sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
      matchedOrder = possibleOrders.find(o => job.jobCardNo?.includes(o.orderNo))
        || possibleOrders.find(o => new Date(o.orderDate) <= jobDate)
        || possibleOrders[0];
    }

    // Find Dispatch
    let matchedDispatch = null;
    if (dispatches && dispatches.length > 0) {
      const possibleDispatches = dispatches.filter(d =>
        d.jobCardNo === job.jobCardNo ||
        d.customer === job.customerName ||
        d.customerName === job.customerName
      ).sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
      matchedDispatch = possibleDispatches[0];
    }

    setPipelineData({
      quotation: matchedQuote,
      order: matchedOrder,
      production: job,
      dispatch: matchedDispatch
    });
  }, [job, isOpen, quotations, orders, customerMap, products, dispatches, customerId, productId]);

  if (!isOpen || !job) return null;

  const fmt = (val) => (val !== null && val !== undefined && val !== '') ? val : '—';
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : null;
  const fmtAmount = (n) => (n && Number(n) > 0) ? `₹${Number(n).toLocaleString('en-IN')}` : '—';

  const getQuotationAmount = () => {
    if (!pipelineData.quotation) return 0;
    if (pipelineData.quotation.items && pipelineData.quotation.items.length > 0 && productId) {
      const item = pipelineData.quotation.items.find(i => i.productId === productId);
      if (item) return Number(item.qty || 0) * Number(item.price || 0);
    }
    return Number(
      pipelineData.quotation.totalAmount ||
      pipelineData.quotation.items?.reduce((sum, item) => sum + (Number(item.qty || 0) * Number(item.price || 0)), 0) ||
      (Number(pipelineData.quotation.price || 0) * Number(pipelineData.quotation.qty || 0)) || 0
    );
  };

  const getQuotationItem = () => {
    if (!pipelineData.quotation?.items || !productId) return null;
    return pipelineData.quotation.items.find(i => i.productId === productId);
  };

  const getOrderQty = () => {
    if (!pipelineData.order) return null;
    if (pipelineData.order.quantities && productId && pipelineData.order.quantities[productId])
      return pipelineData.order.quantities[productId];
    return pipelineData.order.quantity || null;
  };

  const getOrderAmount = () => {
    if (!pipelineData.order) return null;
    if (pipelineData.order.amounts && productId && pipelineData.order.amounts[productId])
      return pipelineData.order.amounts[productId];
    return pipelineData.order.amount || null;
  };

  const toggle = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  const Row = ({ label, value, highlight }) => (
    <div className={`flex justify-between items-start px-4 py-2.5 border-b border-gray-100 last:border-0 ${highlight ? 'bg-brand-accent/5' : ''}`}>
      <span className="text-xs text-gray-500 font-medium shrink-0 mr-4">{label}</span>
      <span className={`text-xs font-semibold text-right break-words max-w-[60%] ${highlight ? 'text-brand-accent' : 'text-gray-800'}`}>{fmt(value)}</span>
    </div>
  );

  const Section = ({ icon: Icon, title, status, date, stageKey, children }) => {
    const isCompleted = status === 'completed';
    const isActive = status === 'active';
    const isPending = status === 'pending';
    const isLast = stageKey === 'dispatch';

    return (
      <div className="relative flex gap-4 mb-2">
        {!isLast && (
          <div className={`absolute left-[19px] top-10 w-[2px] ${isCompleted ? 'bg-emerald-400' : 'bg-gray-200'}`} style={{ bottom: '-8px' }} />
        )}
        <div className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 bg-white flex-shrink-0
          ${isCompleted ? 'border-emerald-500 text-emerald-500' :
            isActive ? 'border-brand-accent text-brand-accent' :
              'border-gray-200 text-gray-300'}`}
        >
          <Icon className="w-5 h-5" />
        </div>

        <div className={`flex-1 pb-4 ${isPending ? 'opacity-45' : ''}`}>
          <button
            className="w-full flex items-start justify-between"
            onClick={() => !isPending && toggle(stageKey)}
            disabled={isPending}
          >
            <div className="text-left">
              <h4 className={`text-sm font-bold ${isCompleted || isActive ? 'text-gray-900' : 'text-gray-400'}`}>{title}</h4>
              <p className="text-[11px] text-gray-400 mt-0.5">{date || (isPending ? 'Pending' : '')}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0 mt-0.5">
              {isCompleted && (
                <span className="flex items-center text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  <CheckCircle className="w-3 h-3 mr-1" />Done
                </span>
              )}
              {isActive && (
                <span className="flex items-center text-[11px] font-medium text-brand-accent bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
                  <Clock className="w-3 h-3 mr-1" />In Progress
                </span>
              )}
              {!isPending && (
                expanded[stageKey]
                  ? <ChevronUp className="w-4 h-4 text-gray-400" />
                  : <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </div>
          </button>

          {!isPending && expanded[stageKey] && (
            <div className="mt-3 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              {children}
            </div>
          )}
        </div>
      </div>
    );
  };

  const quot = pipelineData.quotation;
  const ord = pipelineData.order;
  const prod = pipelineData.production;
  const disp = pipelineData.dispatch;
  const quotItem = getQuotationItem();
  const prodCompleted = Number(prod?.progress) === 100 || prod?.stage === 'Dispatched';
  const dispatchStatus = disp?.status ? disp.status.toUpperCase() : null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/60 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900">Job Pipeline</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Full lifecycle — Job Card <span className="font-bold text-brand-accent">{job.jobCardNo}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary banner */}
        <div className="flex justify-between items-center px-6 py-3 bg-brand-accent/5 border-b border-brand-accent/10 flex-shrink-0">
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Customer</p>
            <p className="font-bold text-gray-900 text-sm mt-0.5">{fmt(job.customerName)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Product</p>
            <p className="font-bold text-brand-accent text-sm mt-0.5">{fmt(job.productName)}</p>
          </div>
        </div>

        {/* Scrollable timeline */}
        <div className="p-5 overflow-y-auto flex-1">

          {/* 1. QUOTATION */}
          <Section icon={FileText} title="Quotation Created" stageKey="quotation"
            status={quot ? 'completed' : 'pending'} date={fmtDate(quot?.createdAt)}>
            <Row label="Quotation No." value={quot?.quotationNo} highlight />
            <Row label="Date" value={fmtDate(quot?.date || quot?.createdAt)} />
            <Row label="Company" value={quot?.companyName} />
            <Row label="Employee" value={quot?.employee} />
            <Row label="Status" value={quot?.status} />
            {quotItem ? (
              <>
                <Row label="Product" value={products.find(p => p.id === quotItem.productId)?.name} />
                <Row label="Specs / Description" value={quotItem.specs} />
                <Row label="Quantity" value={quotItem.qty ? Number(quotItem.qty).toLocaleString('en-IN') : null} />
                <Row label="Unit Price (₹)" value={quotItem.price} />
                <Row label="Total Amount" value={fmtAmount(getQuotationAmount())} highlight />
              </>
            ) : (
              <Row label="Total Amount" value={fmtAmount(getQuotationAmount())} highlight />
            )}
          </Section>

          {/* 2. ORDER */}
          <Section icon={ShoppingCart} title="Order Confirmed" stageKey="order"
            status={ord ? 'completed' : 'pending'} date={fmtDate(ord?.orderDate)}>
            <Row label="Order No." value={ord?.orderNo} highlight />
            <Row label="Order Date" value={fmtDate(ord?.orderDate)} />
            <Row label="Delivery Date" value={fmtDate(ord?.deliveryDate)} />
            <Row label="Status" value={ord?.status} />
            <Row label="Employee" value={ord?.employee} />
            <Row label="Quantity" value={getOrderQty() ? String(getOrderQty()) : null} />
            <Row label="Amount" value={fmtAmount(getOrderAmount())} highlight />
            {ord?.notes && <Row label="Notes" value={ord.notes} />}
          </Section>

          {/* 3. PRODUCTION */}
          <Section icon={Factory} title="Production Execution" stageKey="production"
            status={prodCompleted ? 'completed' : 'active'} date={fmtDate(prod?.createdAt)}>
            <Row label="Job Card No." value={prod?.jobCardNo} highlight />
            <Row label="Customer" value={prod?.customerName} />
            <Row label="Product" value={prod?.productName} />
            <Row label="Current Stage" value={prod?.stage} />
            <Row label="Progress" value={prod?.progress !== undefined ? `${prod.progress}%` : null} highlight />
            <Row label="Units" value={prod?.units ? Number(prod.units).toLocaleString('en-IN') : null} />
            <Row label="Deadline" value={fmtDate(prod?.deadline)} />
            <Row label="Employee" value={prod?.employee} />
            {prod?.notes && <Row label="Notes" value={prod.notes} />}
            {/* Stage-by-stage breakdown */}
            <div className="px-4 pt-3 pb-2">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Stage Breakdown</p>
              <div className="rounded-lg border border-gray-100 overflow-hidden">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-3 py-2 text-left font-semibold text-gray-500 w-8">#</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-500">Stage</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-500">Quantity</th>
                      <th className="px-3 py-2 text-center font-semibold text-gray-500 w-24">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {['Start','Printing','Lamination','Punching','Striping','Pasting','Ready To Dispatch','Dispatched'].map((stageName, idx) => {
                      const stageIdx = ['Start','Printing','Lamination','Punching','Striping','Pasting','Ready To Dispatch','Dispatched'].indexOf(prod?.stage);
                      const thisIdx = idx;
                      const isDone = thisIdx < stageIdx || prod?.stage === 'Dispatched';
                      const isCurrent = stageName === prod?.stage;
                      const qty = prod?.stageQuantities?.[stageName];
                      return (
                        <tr key={stageName} className={isCurrent ? 'bg-brand-accent/5' : ''}>
                          <td className="px-3 py-2 text-gray-400 font-medium">{idx + 1}</td>
                          <td className={`px-3 py-2 font-medium ${isCurrent ? 'text-brand-accent' : isDone ? 'text-gray-700' : 'text-gray-400'}`}>
                            {stageName}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-700 font-semibold">
                            {qty ? Number(qty).toLocaleString('en-IN') : '—'}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {isCurrent ? (
                              <span className="inline-flex items-center text-[10px] font-medium text-brand-accent bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">Current</span>
                            ) : isDone ? (
                              <span className="inline-flex items-center text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Done</span>
                            ) : (
                              <span className="inline-flex items-center text-[10px] font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">Pending</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </Section>

          {/* 4. DISPATCH */}
          <Section icon={Truck} title="Dispatched" stageKey="dispatch"
            status={disp ? (dispatchStatus === 'DELIVERED' ? 'completed' : 'active') : 'pending'}
            date={fmtDate(disp?.date)}>
            <Row label="Dispatch No." value={disp?.dispatchNo} highlight />
            <Row label="Dispatch Date" value={fmtDate(disp?.date)} />
            <Row label="Customer" value={disp?.customer || disp?.customerName} />
            <Row label="Transporter / Vehicle" value={disp?.vehicleNo} />
            <Row label="Driver" value={disp?.driver} />
            <Row label="Status" value={disp?.status} highlight />
          </Section>

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm transition-colors"
          >
            Close Pipeline
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
