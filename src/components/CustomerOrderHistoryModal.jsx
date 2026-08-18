import React, { useEffect } from 'react';
import { X, Calendar, Package, FileText, IndianRupee } from 'lucide-react';

export default function CustomerOrderHistoryModal({ isOpen, onClose, customer, orders = [], products = [] }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !customer) return null;

  // Filter and sort orders for this customer
  const customerOrders = orders
    .filter(o => o.customerId === customer.id)
    .sort((a, b) => new Date(b.orderDate || 0) - new Date(a.orderDate || 0));

  const formatIndianNumber = (num) => {
    if (num === null || num === undefined) return '0';
    return Number(num).toLocaleString('en-IN');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Order History</h2>
            <p className="text-sm text-gray-500">{customer.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 flex-1 bg-gray-50/50">
          {customerOrders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No order history found for this customer.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {customerOrders.map(order => {
                // Get product details
                const pIds = Array.isArray(order.productId) ? order.productId : (order.productId ? [order.productId] : []);
                
                return (
                  <div key={order.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                      <div className="flex items-center space-x-4">
                        <span className="font-bold text-[#1b2f63]">{order.orderNo}</span>
                        <span className="text-sm text-gray-500 flex items-center">
                          <Calendar className="w-3.5 h-3.5 mr-1" />
                          {order.orderDate ? new Date(order.orderDate).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        order.status === 'Completed' ? 'bg-green-100 text-green-700' :
                        order.status === 'Approved' ? 'bg-blue-100 text-blue-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    
                    <div className="p-5">
                      <div className="space-y-3">
                        {pIds.map(pid => {
                          const product = products.find(p => p.id === pid);
                          const qty = (order.quantities && order.quantities[pid]) || order.quantity || '0';
                          const amt = (order.amounts && order.amounts[pid]) || order.amount || '0';
                          
                          return (
                            <div key={pid} className="flex justify-between items-start text-sm pb-3 border-b border-gray-50 last:border-0 last:pb-0">
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">{product ? product.name : 'Unknown Product'}</div>
                                {order.notes && <div className="text-gray-500 text-xs mt-1 flex items-start"><FileText className="w-3.5 h-3.5 mr-1 mt-0.5 shrink-0"/> <span className="line-clamp-2">{order.notes}</span></div>}
                              </div>
                              <div className="text-right ml-4">
                                <div className="text-gray-900 font-medium">{qty} <span className="text-gray-500 text-xs font-normal">QTY</span></div>
                                <div className="text-brand-primary font-bold mt-0.5">₹{amt}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-500">Total Order Amount</span>
                        <span className="text-base font-bold text-gray-900 flex items-center">
                          <IndianRupee className="w-4 h-4 mr-0.5 text-gray-400" />
                          {formatIndianNumber(order.amount)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
