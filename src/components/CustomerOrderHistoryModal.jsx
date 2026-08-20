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

  const handleSendWhatsapp = (order) => {
    let phone = customer?.mobile || customer?.phone || '';
    if (!phone) {
      alert('Customer phone number not found.');
      return;
    }
    
    const customerName = customer?.name || 'Customer';
    const contactPerson = customer?.contactPerson || 'Sir/Madam';

    let message = `Dear ${contactPerson},\n\nThank you for choosing Mukesh Graphics! We are pleased to confirm your order for *${customerName}*.\n\n*Order Details:*\n*Order No:* ${order.orderNo}\n*Order Date:* ${new Date(order.orderDate).toLocaleDateString('en-IN')}\n\n*Products:*\n`;
    let totalAmt = 0;
    
    const pIds = Array.isArray(order.productId) ? order.productId : (order.productId ? [order.productId] : []);
    pIds.forEach((prodId, index) => {
      const product = products.find(p => p.id === prodId);
      const productName = product?.name || 'Product';
      const qty = Number(((order.quantities && order.quantities[prodId]) || order.quantity || '0').toString().replace(/,/g, ''));
      const amount = Number(((order.amounts && order.amounts[prodId]) || order.amount || '0').toString().replace(/,/g, ''));
      totalAmt += amount;
      message += `${index + 1}. *${productName}*\n   Qty: ${qty.toLocaleString('en-IN')}\n   Amount: ₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
    });
    
    message += `\n*Total Amount:* ₹${totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\nWe will keep you updated on the production status. Please feel free to reach out if you have any questions.\n\nBest Regards,\n*Mukesh Graphics*`;
    
    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.length === 10) {
      formattedPhone = '91' + formattedPhone;
    } else if (formattedPhone.startsWith('0')) {
       formattedPhone = '91' + formattedPhone.substring(1);
    }
    
    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl flex flex-col max-h-[calc(100dvh-4rem)] md:max-h-[90vh] overflow-hidden">
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
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => handleSendWhatsapp(order)}
                          className="p-1.5 text-gray-400 hover:text-[#25D366] hover:bg-[#25D366]/10 rounded-md transition-colors"
                          title="Send Order Confirmation via WhatsApp"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                          </svg>
                        </button>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          order.status === 'Completed' ? 'bg-green-100 text-green-700' :
                          order.status === 'Approved' ? 'bg-blue-100 text-blue-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {order.status}
                        </span>
                      </div>
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
