import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import CreateOrderModal from '../components/CreateOrderModal';
import api from '../lib/api';

export default function Orders() {
  const [data, setData] = useState([]);
  const [customers, setCustomers] = useState({});
  const [products, setProducts] = useState({});
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState(null);
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
      // Clean up state
      navigate('/orders', { replace: true, state: {} });
    }
  }, [location, navigate]);


  useEffect(() => {
    // In a real app, you might fetch populated data from the backend. 
    // Here we fetch multiple and join.
    Promise.all([
      api.get('/orders'),
      api.get('/customers'),
      api.get('/products')
    ]).then(([ordersRes, custRes, prodRes]) => {
      const custMap = {};
      custRes.data.forEach(c => custMap[c.id] = c);
      setCustomers(custMap);

      const prodMap = {};
      prodRes.data.forEach(p => prodMap[p.id] = p);
      setProducts(prodMap);

      setData(ordersRes.data);
      setLoading(false);
    }).catch(err => {
      console.error('Error fetching orders:', err);
      setLoading(false);
    });
  }, []);

  const columns = [
    { header: 'Order No.', accessor: row => row.orderNo, render: row => <span className="font-medium text-brand-accent">{row.orderNo}</span> },
    { header: 'Customer', accessor: row => customers[row.customerId]?.name || 'DELETED CUSTOMER' },
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

  if (loading) return <div className="p-8 text-center text-gray-500">Loading Orders...</div>;

  const handleOrderAdded = (newOrder) => {
    setData(prev => [newOrder, ...prev]);
  };

  const handleOrderUpdated = (updatedOrder) => {
    setData((prev) => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
  };

  const handleOrderDeleted = (orderId) => {
    setData((prev) => prev.filter(o => o.id !== orderId));
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
    </div>
  );

  return (
    <div className="h-[calc(100vh-8rem)]">
      <DataTable
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
          setStartInEditMode(false);
          setOrderToEdit(row);
          setIsModalOpen(true);
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
    </div>
  );
}
