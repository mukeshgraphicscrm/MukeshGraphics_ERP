import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, ShoppingCart, Factory, Truck, CheckCircle, Clock } from 'lucide-react';
import { useData } from '../contexts/DataContext';

export default function ViewJobPipelineModal({ isOpen, onClose, job }) {
  const { quotations, orders, customerMap, products, dispatches } = useData();
  const [pipelineData, setPipelineData] = useState({
    quotation: null,
    order: null,
    production: null,
    dispatch: null
  });

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
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

  const getQuotationAmount = () => {
    if (!pipelineData.quotation) return 0;
    if (pipelineData.quotation.items && pipelineData.quotation.items.length > 0 && productId) {
      const item = pipelineData.quotation.items.find(i => i.productId === productId);
      if (item) {
        return (Number(item.qty || 0) * Number(item.price || 0));
      }
    }
    return Number(pipelineData.quotation.totalAmount || (pipelineData.quotation.items?.reduce((sum, item) => sum + (Number(item.qty || 0) * Number(item.price || 0)), 0)) || (Number(pipelineData.quotation.price || 0) * Number(pipelineData.quotation.qty || 0)) || 0);
  };

  const getOrderUnits = () => {
    if (!pipelineData.order) return 0;
    if (pipelineData.order.quantities && productId && pipelineData.order.quantities[productId]) {
      return Number(pipelineData.order.quantities[productId].toString().replace(/,/g, ''));
    }
    return Number(pipelineData.order.quantity || 0);
  };

  const TimelineNode = ({ icon: Icon, title, status, date, isLast, details }) => {
    const isCompleted = status === 'completed';
    const isActive = status === 'active';

    return (
      <div className="relative flex gap-4">
        {!isLast && (
          <div className={`absolute left-[19px] top-10 bottom-[-16px] w-[2px] ${isCompleted ? 'bg-emerald-500' : 'bg-gray-200'}`} />
        )}

        <div className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 bg-white flex-shrink-0 transition-colors
          ${isCompleted ? 'border-emerald-500 text-emerald-500' :
            isActive ? 'border-brand-accent text-brand-accent' :
              'border-gray-200 text-gray-400'}`}
        >
          <Icon className="w-5 h-5" />
        </div>

        <div className={`flex-1 pb-8 ${!isCompleted && !isActive ? 'opacity-60' : ''}`}>
          <div className="flex items-start justify-between">
            <div>
              <h4 className={`text-sm font-bold ${isCompleted || isActive ? 'text-gray-900' : 'text-gray-500'}`}>{title}</h4>
              <p className="text-xs text-gray-500 mt-1">{date || 'Pending'}</p>
            </div>
            {isCompleted && (
              <span className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                <CheckCircle className="w-3 h-3 mr-1" />
                Done
              </span>
            )}
            {isActive && (
              <span className="flex items-center text-xs font-medium text-brand-accent bg-orange-50 px-2 py-1 rounded-full border border-orange-100">
                <Clock className="w-3 h-3 mr-1" />
                In Progress
              </span>
            )}
          </div>

          {details && (
            <div className="mt-3 bg-gray-50 border border-gray-100 rounded-lg p-3 text-sm space-y-1.5">
              {details.map((detail, idx) => (
                <div key={idx} className="flex justify-between">
                  <span className="text-gray-500">{detail.label}</span>
                  <span className="font-medium text-gray-900">{detail.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Job Pipeline</h2>
            <p className="text-sm text-gray-500 mt-0.5">Tracking lifecycle for Job Card <span className="font-bold text-brand-accent">{job.jobCardNo}</span></p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">

          <div className="mb-6 pb-6 border-b border-gray-100 flex justify-between items-center bg-brand-accent/5 p-4 rounded-lg border border-brand-accent/20">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Customer</p>
              <p className="font-bold text-gray-900 mt-1">{job.customerName}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Product</p>
              <p className="font-bold text-brand-accent mt-1">{job.productName}</p>
            </div>
          </div>

          <div className="px-2">
            {/* 1. Quotation */}
            <TimelineNode
              icon={FileText}
              title="Quotation Created"
              status={pipelineData.quotation ? 'completed' : 'pending'}
              date={pipelineData.quotation?.createdAt ? new Date(pipelineData.quotation.createdAt).toLocaleDateString('en-IN') : null}
              details={pipelineData.quotation ? [
                { label: 'Quotation No:', value: pipelineData.quotation.quotationNo },
                { label: 'Amount:', value: `₹${getQuotationAmount().toLocaleString('en-IN')}` }
              ] : null}
            />

            {/* 2. Order */}
            <TimelineNode
              icon={ShoppingCart}
              title="Order Confirmed"
              status={pipelineData.order ? 'completed' : 'pending'}
              date={pipelineData.order?.orderDate ? new Date(pipelineData.order.orderDate).toLocaleDateString('en-IN') : null}
              details={pipelineData.order ? [
                { label: 'Order No:', value: pipelineData.order.orderNo },
                { label: 'Units:', value: getOrderUnits().toLocaleString('en-IN') }
              ] : null}
            />

            {/* 3. Production */}
            <TimelineNode
              icon={Factory}
              title="Production execution"
              status={Number(pipelineData.production?.progress) === 100 ? 'completed' : 'active'}
              date={pipelineData.production?.createdAt ? new Date(pipelineData.production.createdAt).toLocaleDateString('en-IN') : null}
              details={[
                { label: 'Job Card No:', value: pipelineData.production?.jobCardNo },
                { label: 'Progress:', value: `${pipelineData.production?.progress}%` },
                { label: 'Current Stage:', value: pipelineData.production?.stage }
              ]}
            />

            {/* 4. Dispatch */}
            <TimelineNode
              icon={Truck}
              title="Dispatched"
              status={pipelineData.dispatch ? (pipelineData.dispatch.status === 'DELIVERED' ? 'completed' : 'active') : (Number(pipelineData.production?.progress) === 100 ? 'pending' : 'pending')}
              date={pipelineData.dispatch?.date ? new Date(pipelineData.dispatch.date).toLocaleDateString('en-IN') : null}
              isLast={true}
              details={pipelineData.dispatch ? [
                { label: 'Dispatch No:', value: pipelineData.dispatch.dispatchNo || 'N/A' },
                { label: 'Transporter:', value: pipelineData.dispatch.vehicleNo || 'N/A' },
                { label: 'Status:', value: pipelineData.dispatch.status || 'N/A' }
              ] : null}
            />
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-800 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm transition-colors"
          >
            Close Pipeline
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
