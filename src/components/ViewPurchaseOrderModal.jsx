import React, { useEffect } from 'react';
import { X, FileDown, Edit2, Trash2 } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import useScrollLock from '../hooks/useScrollLock';

export default function ViewPurchaseOrderModal({ isOpen, onClose, po, onWhatsappClick, onGeneratePDFClick, onEditClick, onDeleteClick, preventClose }) {
  useScrollLock(isOpen);
  const { supplierMap } = useData();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !preventClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, preventClose]);

  if (!isOpen || !po) return null;

  const supplierName = supplierMap?.[po.supplierId]?.name || po.supplierId || 'Unknown Supplier';

  const formatIndianNumber = (val) => {
    if (val === null || val === undefined || val === '') return '';
    const num = Number(val);
    if (isNaN(num)) return val;
    return num.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  };

  const formatAmount = (val) => {
    if (val === null || val === undefined || val === '') return '0.00';
    const num = Number(val);
    if (isNaN(num)) return '0.00';
    return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const products = po.products && po.products.length > 0 ? po.products : [{
    material: po.material,
    length: po.length,
    width: po.width,
    gsm: po.gsm,
    sheetPkt: po.sheetPkt,
    quantity: po.quantity,
    weight: po.weight,
    netWeight: po.netWeight,
    rate: po.rate,
    amount: po.amount,
  }];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget && !preventClose) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl flex flex-col max-h-[calc(100dvh-4rem)] md:max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-6 py-4 border-b border-gray-100 bg-white shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold text-lg uppercase">
              {supplierName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900 leading-tight">PO {po.poNo}</h2>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                  po.status === 'Received' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                  po.status === 'Ordered' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                  'bg-gray-50 text-gray-600 border-gray-200'
                }`}>
                  {po.status || 'Active'}
                </span>
              </div>
              <p className="text-xs text-gray-500">{supplierName}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => onGeneratePDFClick && onGeneratePDFClick(po)}
              className="flex items-center px-3 py-1.5 text-sm font-medium text-brand-primary bg-brand-primary/10 hover:bg-brand-primary/20 rounded-md transition-colors"
            >
              <FileDown className="w-4 h-4 mr-1.5" />
              PDF
            </button>
            <button 
              onClick={() => onWhatsappClick && onWhatsappClick(po)}
              className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-[#25D366] hover:bg-[#20b858] rounded-md transition-colors"
            >
              <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              WhatsApp
            </button>
            <button 
              onClick={() => {
                onClose();
                onEditClick && onEditClick(po);
              }}
              className="flex items-center px-3 py-1.5 text-sm font-medium text-brand-primary bg-brand-primary/5 hover:bg-brand-primary/10 rounded-md transition-colors"
            >
              <Edit2 className="w-4 h-4 mr-1.5" />
              Edit
            </button>
            <button 
              onClick={() => onDeleteClick && onDeleteClick(po)}
              className="flex items-center px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Delete
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
          
          {/* Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-5 bg-gray-50 rounded-xl border border-gray-100">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Order Date</p>
              <p className="text-base font-semibold text-gray-900">
                {po.orderDate ? new Date(po.orderDate).toLocaleDateString('en-GB') : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Doc Date</p>
              <p className="text-base font-semibold text-gray-900">
                {po.docDate ? new Date(po.docDate).toLocaleDateString('en-GB') : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Delivery Date</p>
              <p className="text-base font-semibold text-gray-900">
                {po.deliveryDate ? new Date(po.deliveryDate).toLocaleDateString('en-GB') : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Delivery Place</p>
              <p className="text-base font-semibold text-gray-900">{po.deliveryPlace || '-'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Job No</p>
              <p className="text-sm font-semibold text-gray-900">{po.jobNo || '-'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Job Name</p>
              <p className="text-sm font-semibold text-gray-900">{po.jobName || '-'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Invoice Type</p>
              <p className="text-sm font-semibold text-gray-900">{po.invoiceType || '-'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Cash/Debit</p>
              <p className="text-sm font-semibold text-gray-900">{po.paymentType || '-'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Modify By</p>
              <p className="text-sm font-semibold text-gray-900">{po.modifiedBy || '-'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Bill Amount</p>
              <p className="text-lg font-bold text-brand-primary">
                ₹{formatAmount(po.totalAmount)}
              </p>
            </div>
          </div>

          {/* Products List */}
          <div>
            <h3 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wider">Products</h3>
            <div className="border border-gray-100 rounded-xl overflow-x-auto bg-white">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-gray-600">Material Name</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Size (L x W)</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">GSM</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Sheet/PKT</th>
                    <th className="px-4 py-3 font-semibold text-gray-600 text-right">Qty</th>
                    <th className="px-4 py-3 font-semibold text-gray-600 text-right">Net Wt</th>
                    <th className="px-4 py-3 font-semibold text-gray-600 text-right">Rate</th>
                    <th className="px-4 py-3 font-semibold text-gray-600 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.map((p, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <div>{p.material || '-'}</div>
                        {p.notes && <div className="text-xs text-gray-500 font-normal mt-0.5 whitespace-pre-wrap">{p.notes}</div>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{p.length && p.width ? `${p.length} x ${p.width}` : '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{p.gsm || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{p.sheetPkt || '-'}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900 text-right">{formatIndianNumber(p.quantity)}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900 text-right">{formatIndianNumber(p.netWeight) || '-'}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900 text-right">₹{formatAmount(p.rate)}</td>
                      <td className="px-4 py-3 font-bold text-gray-900 text-right">₹{formatAmount(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t border-gray-200">
                  {Number(po.freightAmount) > 0 && (
                    <tr>
                      <td colSpan="7" className="px-4 py-2 text-right text-gray-600 text-xs font-semibold uppercase">Freight Amount</td>
                      <td className="px-4 py-2 text-right text-gray-900 font-medium">₹{formatAmount(po.freightAmount)}</td>
                    </tr>
                  )}
                  {po.invoiceType === 'GST' && (
                    <tr>
                      <td colSpan="7" className="px-4 py-2 text-right text-gray-600 text-xs font-semibold uppercase">GST (18%)</td>
                      <td className="px-4 py-2 text-right text-gray-900 font-medium">₹{formatAmount(po.gstTotal)}</td>
                    </tr>
                  )}
                  <tr>
                    <td colSpan="7" className="px-4 py-3 text-right text-gray-800 text-sm font-bold uppercase tracking-wide">Total Bill Amount</td>
                    <td className="px-4 py-3 text-right text-brand-primary font-bold text-base">₹{formatAmount(po.totalAmount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Notes */}
          {po.notes && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Notes / Narration</p>
              <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed font-medium">
                {po.notes}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
