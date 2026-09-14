import React, { useEffect } from 'react';
import { X, Edit2, Trash2 } from 'lucide-react';
import { useData } from '../contexts/DataContext';

export default function ViewOrderModal({ isOpen, onClose, order, onEditClick, onDeleteClick, onWhatsappClick, preventClose }) {
  const { customerMap, productMap } = useData();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !preventClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
    };
  }, [isOpen, onClose, preventClose]);

  if (!isOpen || !order) return null;

  const customerName = customerMap?.[order.customerId]?.name || order.customerId || 'Unknown Customer';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget && !preventClose) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl flex flex-col max-h-[calc(100dvh-4rem)] md:max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-6 py-4 border-b border-gray-100 bg-white shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold text-lg uppercase">
              {customerName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900 leading-tight">Order {order.orderNo}</h2>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                  order.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                  order.status === 'Hold' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                  'bg-gray-50 text-gray-600 border-gray-200'
                }`}>
                  {order.status || 'Active'}
                </span>
              </div>
              <p className="text-xs text-gray-500">{customerName}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => onWhatsappClick(order)}
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
                onEditClick(order);
              }}
              className="flex items-center px-3 py-1.5 text-sm font-medium text-brand-primary bg-brand-primary/5 hover:bg-brand-primary/10 rounded-md transition-colors"
            >
              <Edit2 className="w-4 h-4 mr-1.5" />
              Edit
            </button>
            <button 
              onClick={() => onDeleteClick(order)}
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
          
          {/* Order Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-5 bg-gray-50 rounded-xl border border-gray-100">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Order Date</p>
              <p className="text-base font-semibold text-gray-900">
                {order.orderDate ? new Date(order.orderDate).toLocaleDateString('en-GB') : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Delivery Date</p>
              <p className="text-base font-semibold text-gray-900">
                {order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString('en-GB') : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Total Amount</p>
              <p className="text-base font-bold text-gray-900">
                ₹{order.amount ? order.amount.toLocaleString('en-IN') : '0'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Assigned Employee</p>
              <p className="text-base font-semibold text-gray-900">{order.employee || '-'}</p>
            </div>
          </div>

          {/* Products List */}
          <div>
            <h3 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wider">Products</h3>
            <div className="border border-gray-100 rounded-xl overflow-hidden bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-gray-600">Product Name</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Varieties</th>
                    <th className="px-4 py-3 font-semibold text-gray-600 text-right">Quantity</th>
                    <th className="px-4 py-3 font-semibold text-gray-600 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(Array.isArray(order.productId) ? order.productId : [order.productId]).map(id => {
                    const prodName = productMap?.[id]?.name || id;
                    const prodQty = order.quantities?.[id] || '0';
                    const prodAmount = order.amounts?.[id] || '0';
                    const vars = order.varieties?.[id] || [];
                    const hasVars = vars.some(v => v.name);
                    
                    return (
                      <tr key={id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 font-medium text-gray-900">{prodName}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">
                          {hasVars ? (
                            <div className="flex flex-col gap-1">
                              {vars.filter(v => v.name).map((v, i) => (
                                <span key={i} className="bg-white px-2 py-1 border rounded">{v.name} ({v.quantity})</span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900 text-right">{prodQty}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900 text-right">₹{prodAmount}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50 font-bold border-t border-gray-200">
                  <tr>
                    <td colSpan="2" className="px-4 py-3 text-right text-gray-600">Total</td>
                    <td className="px-4 py-3 text-right text-gray-900">{order.quantity ? order.quantity.toLocaleString('en-IN') : '0'}</td>
                    <td className="px-4 py-3 text-right text-brand-primary">₹{order.amount ? order.amount.toLocaleString('en-IN') : '0'}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Order Notes</p>
              <div className="p-4 bg-[#FCF9F2] rounded-xl border border-[#E8A33D]/20 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed font-medium">
                {order.notes}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
