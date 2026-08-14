import React, { useState, useEffect, useRef } from 'react';
import { Plus, MoreVertical, Edit2, Trash2, ArrowRightLeft, FileDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import ConfirmMoveModal from '../components/ConfirmMoveModal';
import CreateQuotationModal from '../components/CreateQuotationModal';
import api from '../lib/api';
import { generateQuotationPDF } from '../lib/pdfGenerator';


export default function Quotations() {
  const [data, setData] = useState([]);
  const [customers, setCustomers] = useState({});
  const [products, setProducts] = useState({});
  const [leads, setLeads] = useState({});
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [quotationToEdit, setQuotationToEdit] = useState(null);
  const [startInEditMode, setStartInEditMode] = useState(false);
  const navigate = useNavigate();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [quotationToDelete, setQuotationToDelete] = useState(null);
  
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [quotationToMove, setQuotationToMove] = useState(null);


  useEffect(() => {
    Promise.all([
      api.get('/quotations'),
      api.get('/customers'),
      api.get('/products'),
      api.get('/leads')
    ]).then(([qtnsRes, custRes, prodRes, leadsRes]) => {
      const custMap = {};
      custRes.data.forEach(c => custMap[c.id] = c);
      setCustomers(custMap);

      const prodMap = {};
      prodRes.data.forEach(p => prodMap[p.id] = p);
      setProducts(prodMap);

      const leadsMap = {};
      leadsRes.data.forEach(l => leadsMap[l.id] = l);
      setLeads(leadsMap);

      setData(qtnsRes.data);
      setLoading(false);
    }).catch(err => {
      console.error('Error fetching quotations:', err);
      setLoading(false);
    });
  }, []);

  const columns = [
    { 
      header: 'QUOTATION No.', 
      accessor: row => row.quotationNo, 
      render: row => {
        const isLost = row.leadId && leads[row.leadId]?.stage === 'Lost';
        return <span className={`font-bold text-[13px] ${isLost ? 'text-red-600' : 'text-[#1e3a8a]'}`}>{row.quotationNo}</span>;
      } 
    },
    {
      header: 'CUSTOMER',
      accessor: row => customers[row.customerId]?.name || 'DELETED CUSTOMER',
      render: row => {
        const isLost = row.leadId && leads[row.leadId]?.stage === 'Lost';
        return <span className={`font-medium text-[13px] ${isLost ? 'text-red-600' : 'text-gray-900'}`}>{customers[row.customerId]?.name || 'DELETED CUSTOMER'}</span>;
      }
    },
    {
      header: 'PRODUCT',
      accessor: row => {
        const items = row.items && row.items.length > 0 ? row.items : [{ productId: row.productId, specs: row.specs }];
        return items.map(i => products[i.productId]?.name || i.productId).join(', ');
      },
      render: row => {
        const items = row.items && row.items.length > 0 ? row.items : [{ productId: row.productId, specs: row.specs, qty: row.qty }];
        const isLost = row.leadId && leads[row.leadId]?.stage === 'Lost';
        
        return (
          <div className="min-w-[200px] max-w-[350px] flex flex-col gap-1 py-1">
            {items.map((item, idx) => {
              const productName = products[item.productId]?.name || item.productId;
              return (
                <div key={idx} className="flex items-start text-[13px]">
                  <span className={`font-medium pr-4 truncate ${isLost ? 'text-red-600' : 'text-gray-900'}`} title={productName}>{productName}</span>
                </div>
              );
            })}
          </div>
        );
      }
    },
    {
      header: 'QUANTITY',
      accessor: row => {
        const items = row.items && row.items.length > 0 ? row.items : [{ qty: row.qty }];
        return items.map(item => Number(item.qty) || 0).join(',');
      },
      render: row => {
        const items = row.items && row.items.length > 0 ? row.items : [{ qty: row.qty }];
        const isLost = row.leadId && leads[row.leadId]?.stage === 'Lost';
        return (
          <div className="flex flex-col gap-1 py-1 min-w-[60px]">
            {items.map((item, idx) => (
              <div key={idx} className={`text-[13px] tabular-nums ${isLost ? 'text-red-600' : 'text-gray-600'}`}>
                {Number(item.qty || 0).toLocaleString('en-IN')}
              </div>
            ))}
          </div>
        );
      }
    },
    {
      header: 'AMOUNT',
      accessor: row => {
        const items = row.items && row.items.length > 0 ? row.items : [{ qty: row.qty, price: row.price }];
        return items.map(item => (Number(item.qty) || 0) * (Number(item.price) || 0)).join(',');
      },
      render: row => {
        const items = row.items && row.items.length > 0 ? row.items : [{ qty: row.qty, price: row.price }];
        const isLost = row.leadId && leads[row.leadId]?.stage === 'Lost';
        return (
          <div className="flex flex-col gap-1 py-1 min-w-[80px]">
            {items.map((item, idx) => {
              const amount = (Number(item.qty) || 0) * (Number(item.price) || 0);
              return (
                <div key={idx} className={`text-[13px] tabular-nums ${isLost ? 'text-red-600' : 'text-gray-900'}`}>
                  ₹{amount.toLocaleString('en-IN')}
                </div>
              );
            })}
          </div>
        );
      }
    },
    {
      header: 'GRAND TOTAL',
      accessor: row => {
        const items = row.items && row.items.length > 0 ? row.items : [{ qty: row.qty, price: row.price }];
        return items.reduce((sum, item) => sum + (Number(item.qty) || 0) * (Number(item.price) || 0), 0);
      },
      render: row => {
        const items = row.items && row.items.length > 0 ? row.items : [{ qty: row.qty, price: row.price }];
        const total = items.reduce((sum, item) => sum + (Number(item.qty) || 0) * (Number(item.price) || 0), 0);
        const isLost = row.leadId && leads[row.leadId]?.stage === 'Lost';
        return <span className={`font-bold text-[13px] ${isLost ? 'text-red-600' : 'text-[#1e3a8a]'}`}>₹{total.toLocaleString('en-IN')}</span>;
      }
    },
    {
      header: 'DOCUMENT',
      accessor: 'document',
      render: row => (
        <button 
          onClick={(e) => { e.stopPropagation(); generatePDF(row); }}
          className="p-1.5 bg-brand-primary/10 text-brand-primary rounded-md hover:bg-brand-primary/20 transition-colors"
          title="Generate Quotation Document"
        >
          <FileDown className="w-4 h-4" />
        </button>
      )
    },
    {
      header: 'ACTION',
      accessor: 'action',
      render: row => <QuotationActions row={row} onEdit={handleEdit} onDelete={handleDeleteClick} onMoveToOrder={handleMoveToOrderClick} />
    }
  ];


  if (loading) return <div className="p-8 text-center text-gray-500">Loading Quotations...</div>;

  
  const handleEdit = (row) => {
    setQuotationToEdit(row);
    setStartInEditMode(true);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (row) => {
    setQuotationToDelete(row);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/quotations/${quotationToDelete.id}`);
      setData(data.filter(q => q.id !== quotationToDelete.id));
      toast.success('Quotation deleted successfully!');
      setIsDeleteModalOpen(false);
      setQuotationToDelete(null);
    } catch (err) {
      console.error('Error deleting quotation:', err);
      toast.error('Failed to delete quotation.');
    }
  };

  const handleMoveToOrderClick = (quote) => {
    setQuotationToMove(quote);
    setIsMoveModalOpen(true);
  };

  const confirmMoveToOrder = () => {
    if (quotationToMove) {
      navigate('/orders', { state: { convertQuote: quotationToMove } });
    }
  };

  const generatePDF = async (quote) => {
    const toastId = toast.loading('Generating PDF...');
    try {
      await generateQuotationPDF(quote, customers, products);
      toast.success('Quotation document generated!', { id: toastId });
    } catch (err) {
      console.error('Error generating PDF:', err);
      toast.error('Failed to generate PDF.', { id: toastId });
    }
  };

  const handleQuotationDeleted = (deletedQuote) => {
    setData(prev => prev.filter(q => q.id !== deletedQuote.id));
  };

  const handleQuotationAdded = (newQuotation) => {
    setData((prev) => [newQuotation, ...prev]);
  };

  const handleQuotationUpdated = (updatedQuotation) => {
    setData((prev) => prev.map(q => q.id === updatedQuotation.id ? updatedQuotation : q));
  };

  return (
    <div className="h-[calc(100vh-8rem)]">
      <DataTable
        title="Quotations"
        subtitle="Manage and send price estimations to customers."
        actionButton={
          <button
            onClick={() => {
              setQuotationToEdit(null);
              setStartInEditMode(true);
              setIsModalOpen(true);
            }}
            className="btn-add"
          >
            <Plus className="w-4 h-4 mr-1" />
            <span>Create Quotation</span>
          </button>
        }
        columns={columns}
        data={data}
        onRowClick={(row) => {
          setQuotationToEdit(row);
          setStartInEditMode(false);
          setIsModalOpen(true);
        }}
      />
      <CreateQuotationModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setQuotationToEdit(null);
        }}
        onQuotationAdded={handleQuotationAdded}
        onQuotationUpdated={handleQuotationUpdated}
        onQuotationDeleted={handleQuotationDeleted}
        quotations={data}
        quotationToEdit={quotationToEdit}
        startInEditMode={startInEditMode}
      />
      
      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setQuotationToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Quotation"
        message="Are you sure you want to delete this quotation? This action cannot be undone."
      />
      
      <ConfirmMoveModal
        isOpen={isMoveModalOpen}
        onClose={() => {
          setIsMoveModalOpen(false);
          setQuotationToMove(null);
        }}
        onConfirm={confirmMoveToOrder}
        title="Move to Order"
        message={`Are you sure you want to convert Quotation ${quotationToMove?.quotationNo || ''} into an Order?`}
      />
    </div>
  );
}

const QuotationActions = ({ row, onEdit, onDelete, onMoveToOrder }) => {
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
      setMenuPos({ top: rect.bottom + 4, left: rect.right - 192 });
    }
    setIsOpen(!isOpen);
  };

  return (
    <div onClick={e => e.stopPropagation()}>
      <button 
        ref={buttonRef}
        onClick={toggleMenu}
        className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
      >
        <MoreVertical className="w-4 h-4 text-gray-500" />
      </button>

      {isOpen && (
        <div 
          ref={menuRef}
          style={{ position: 'fixed', top: menuPos.top, left: menuPos.left }}
          className="w-48 bg-white rounded-md shadow-[0_0_15px_rgba(0,0,0,0.15)] border border-gray-100 z-[9999] py-1"
        >
          <button
            onClick={() => { setIsOpen(false); onEdit(row); }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
          >
            <Edit2 className="w-4 h-4 mr-2" /> Edit
          </button>
          <button
            onClick={() => { setIsOpen(false); onMoveToOrder(row); }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
          >
            <ArrowRightLeft className="w-4 h-4 mr-2" /> Move to Order
          </button>
          <div className="h-[1px] bg-gray-100 my-1"></div>
          <button
            onClick={() => { setIsOpen(false); onDelete(row); }}
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
          >
            <Trash2 className="w-4 h-4 mr-2" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}
