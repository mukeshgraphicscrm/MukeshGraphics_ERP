import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Download } from 'lucide-react';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import CreateOrderModal from '../components/CreateOrderModal';
import ViewOrderModal from '../components/ViewOrderModal';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import api from '../lib/api';
import { useData } from '../contexts/DataContext';
import { generateOrdersListPDF } from '../lib/pdfGenerator';
import toast from 'react-hot-toast';

export default function Orders() {
  const { orders: data, setOrders: setData, customerMap: customers, productMap: products, isLoaded } = useData();
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState(null);
  const [orderToView, setOrderToView] = useState(null);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [startInEditMode, setStartInEditMode] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const [initialData, setInitialData] = useState(null);

  useEffect(() => {
    if (location.state?.convertQuote) {
      setInitialData(location.state.convertQuote);
      setIsModalOpen(true);
      navigate('/orders', { replace: true, state: {} });
    }
  }, [location, navigate]);


  const columns = [
    { header: 'Order No.', accessor: row => row.orderNo, render: row => <span className="font-medium text-brand-accent">{row.orderNo}</span> },
    { 
      header: 'Customer', 
      accessor: row => customers[row.customerId]?.name || 'DELETED CUSTOMER',
      render: row => {
        const c = customers[row.customerId];
        if (!c) return <span className="text-gray-500">DELETED CUSTOMER</span>;
        const initials = c.name ? c.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'NA';
        return (
          <div className="flex items-center py-1">
            <div className="w-9 h-9 rounded-full bg-[#f1f5f9] text-[#1e3a8a] flex items-center justify-center font-bold text-xs mr-4 border border-[#e2e8f0] shrink-0">
              {initials}
            </div>
            <div>
              <div className="font-bold text-gray-900 text-[13px]">{c.brandName || c.name}</div>
              <div className="text-gray-700 text-[12px]">{c.name}</div>
            </div>
          </div>
        );
      }
    },
    { 
      header: 'Product', 
      accessor: row => {
        if (Array.isArray(row.productId)) {
          return row.productId.map(id => products[id]?.name || id).join(', ');
        }
        return products[row.productId]?.name || row.productId;
      },
      exportAccessor: row => {
        if (Array.isArray(row.productId)) {
          return row.productId.map(id => products[id]?.name || id);
        }
        return products[row.productId]?.name || row.productId;
      },
      render: row => {
        if (Array.isArray(row.productId)) {
          return (
            <div className="flex flex-col gap-1">
              {row.productId.map((id) => (
                <div key={id} className="whitespace-nowrap text-sm font-medium text-gray-900">{products[id]?.name || id}</div>
              ))}
            </div>
          );
        }
        return <span className="whitespace-nowrap font-medium text-gray-900">{products[row.productId]?.name || row.productId}</span>;
      }
    },
    { 
      header: 'Quantity', 
      accessor: row => row.quantity.toLocaleString('en-IN'),
      exportAccessor: row => {
        if (Array.isArray(row.productId) && row.quantities) {
          return row.productId.map(id => (row.quantities[id] || '0').toString());
        }
        return row.quantity.toLocaleString('en-IN');
      },
      render: row => {
        if (Array.isArray(row.productId) && row.quantities) {
          return (
            <div className="flex flex-col gap-1">
              {row.productId.map(id => (
                <div key={id} className="whitespace-nowrap text-sm text-gray-600">{row.quantities[id] || '0'}</div>
              ))}
            </div>
          );
        }
        return <span className="text-gray-600">{row.quantity.toLocaleString('en-IN')}</span>;
      }
    },
    { 
      header: 'Amount', 
      accessor: row => `₹${row.amount.toLocaleString('en-IN')}`,
      exportAccessor: row => {
        if (Array.isArray(row.productId) && row.amounts) {
          return row.productId.map(id => `₹${row.amounts[id] || '0'}`);
        }
        return `₹${row.amount.toLocaleString('en-IN')}`;
      },
      render: row => {
        if (Array.isArray(row.productId) && row.amounts) {
          return (
            <div className="flex flex-col gap-1">
              {row.productId.map(id => (
                <div key={id} className="whitespace-nowrap text-sm text-gray-600">₹{row.amounts[id] || '0'}</div>
              ))}
            </div>
          );
        }
        return <span className="text-gray-600">₹{row.amount.toLocaleString('en-IN')}</span>;
      }
    },
    { header: 'Order Date', accessor: row => row.orderDate ? new Date(row.orderDate).toLocaleDateString('en-IN') : '-' },
    { header: 'Delivery Date', accessor: row => new Date(row.deliveryDate).toLocaleDateString('en-IN') },
    { header: 'Status', accessor: row => row.status, render: row => <StatusBadge status={row.status} /> },
  ];

  const filteredOrders = useMemo(() => {
    let result = data;
    if (fromDate) {
      result = result.filter(o => o.orderDate && new Date(o.orderDate) >= new Date(fromDate));
    }
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter(o => o.orderDate && new Date(o.orderDate) <= end);
    }
    return result;
  }, [data, fromDate, toDate]);



  const handleOrderAdded = (newOrder) => {
    setData(prev => [newOrder, ...prev]);
  };

  const handleOrderUpdated = (updatedOrder) => {
    setData((prev) => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
  };

  const handleOrderDeleted = (orderId) => {
    setData((prev) => prev.filter(o => o.id !== orderId));
  };

  const handleDownloadPDF = async () => {
    try {
      if (filteredOrders.length === 0) {
        toast.error('No orders found to export!');
        return;
      }
      await generateOrdersListPDF(filteredOrders, customers, products, fromDate, toDate);
      toast.success('PDF generated successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    }
  };

  const dateFilterToolbar = (
    <div className="flex items-center space-x-2">
      <input 
        type="date" 
        className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent shadow-sm"
        value={fromDate}
        onChange={(e) => setFromDate(e.target.value)}
      />
      <span className="text-gray-400 font-medium">-</span>
      <input 
        type="date" 
        className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent shadow-sm"
        value={toDate}
        onChange={(e) => setToDate(e.target.value)}
      />
      <button 
        onClick={handleDownloadPDF} 
        className="flex items-center space-x-2 px-4 py-2 border border-gray-200 rounded-lg bg-white text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm ml-2"
        title="Download PDF"
      >
        <Download className="w-4 h-4" />
        <span className="hidden sm:inline">Export PDF</span>
      </button>
    </div>
  );

  return (
    <div className="h-[calc(100vh-8rem)]">
      <DataTable
        isLoading={!isLoaded}
        title="Order Management"
        subtitle="Track and manage all customer orders."
        toolbarExtra={dateFilterToolbar}
        actionButton={
          <button 
            onClick={() => {
              setStartInEditMode(true);
              setOrderToEdit(null);
              setIsModalOpen(true);
            }}
            className="btn-add"
          >
            <Plus className="w-4 h-4 mr-1" />
            <span>New Order</span>
          </button>
        }
        columns={columns}
        data={filteredOrders}
        onRowClick={(row) => {
          setOrderToView(row);
          setIsViewModalOpen(true);
        }}
      />
      <CreateOrderModal
        initialData={initialData}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setInitialData(null);
          setOrderToEdit(null);
        }}
        onOrderAdded={handleOrderAdded}
        onOrderUpdated={handleOrderUpdated}
        onOrderDeleted={handleOrderDeleted}
        orders={data} 
        orderToEdit={orderToEdit}
        startInEditMode={startInEditMode}
      />
      <ViewOrderModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setOrderToView(null);
        }}
        order={orderToView}
        onEditClick={(order) => {
          setOrderToEdit(order);
          setIsModalOpen(true);
        }}
        onDeleteClick={(order) => {
          setOrderToDelete(order);
          setIsDeleteModalOpen(true);
        }}
        onWhatsappClick={(order) => {
          const customer = customers[order.customerId];
          if (customer && (customer.mobile || customer.phone)) {
            const phone = customer.mobile || customer.phone;
            let productsText = "";
            if (Array.isArray(order.productId)) {
              productsText = order.productId.map((id, index) => {
                const productName = (products[id]?.name || id).toString().trim();
                const qty = order.quantities?.[id] || 0;
                const amt = order.amounts?.[id] || 0;
                return `${index + 1}. *${productName}*\n   Qty: ${qty.toLocaleString('en-IN')}\n   Amount: ₹${amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
              }).join('\n\n');
            } else {
              const productName = (products[order.productId]?.name || order.productId).toString().trim();
              const qty = order.quantity || 0;
              const amt = order.amount || 0;
              productsText = `1. *${productName}*\n   Qty: ${qty.toLocaleString('en-IN')}\n   Amount: ₹${amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
            }

            const orderDate = order.orderDate ? new Date(order.orderDate).toLocaleDateString('en-GB') : '-';
            const customerName = (customer.contactPerson || customer.name || 'Customer').toString().trim();
            const companyName = (customer.name || 'your company').toString().trim();

            const message = `Dear *${customerName}*,\n\nThank you for choosing Mukesh Graphics! We are pleased to confirm your order for *${companyName}*.\n\n*Order Details:*\n*Order No:* ${order.orderNo}\n*Order Date:* ${orderDate}\n\n*Products:*\n${productsText}\n\n*Total Amount:* ₹${order.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n\nWe will keep you updated on the production status. Please feel free to reach out if you have any questions.\n\nBest Regards,\n*Mukesh Graphics*`;

            const url = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
            window.open(url, '_blank');
          } else {
            alert('No phone number found for this customer.');
          }
        }}
        preventClose={isDeleteModalOpen}
      />
      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setOrderToDelete(null);
        }}
        onConfirm={async () => {
          if (!orderToDelete) return;
          setIsDeleting(true);
          try {
            await api.delete(`/orders/${orderToDelete.id}`);
            setData(prev => prev.filter(o => o.id !== orderToDelete.id));
            setIsDeleteModalOpen(false);
            setOrderToDelete(null);
            setIsViewModalOpen(false);
            toast.success('Order deleted successfully!');
          } catch (err) {
            console.error('Error deleting order:', err);
            toast.error('Failed to delete order. Please try again.');
          } finally {
            setIsDeleting(false);
          }
        }}
        title="Delete Order"
        message="Are you sure you want to delete this order? This action cannot be undone."
        isLoading={isDeleting}
      />
    </div>
  );
}
