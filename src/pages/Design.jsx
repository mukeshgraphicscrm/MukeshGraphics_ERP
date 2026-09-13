import React, { useState, useEffect } from 'react';
import DataTable from '../components/DataTable';
import CustomSelect from '../components/CustomSelect';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import { Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';

export default function Design() {
  const { artworks: data, setArtworks: setData, customerMap: customers, products, leads, isLoaded } = useData();
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('Customer Design');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({
    customerId: '',
    designType: '',
    productId: '',
    variety: '',
    varietyCount: '',
    varietyNames: [],
    startDate: '',
    deadline: '',
    employee: '',
    designer: '',
    status: 'Active',
    delayReason: '',
    notes: '',
    leadId: ''
  });
  
  const [selectedStatus, setSelectedStatus] = useState(null);
  const designStages = [
    { id: 1, key: 'Active', name: 'Active' },
    { id: 2, key: 'In Process', name: 'In Process' },
    { id: 3, key: 'Hold', name: 'Hold' },
    { id: 4, key: 'Delay', name: 'Delay' },
    { id: 5, key: 'Final/Party Approve', name: 'Final/Party Approve' },
  ];
  
  const [isDelayModalOpen, setIsDelayModalOpen] = useState(false);
  const [delayReasonText, setDelayReasonText] = useState('');
  const [pendingRow, setPendingRow] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isStatusReasonModalOpen, setIsStatusReasonModalOpen] = useState(false);

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setActiveTab('Customer Design');
    setFormData({ customerId: '', designType: '', productId: '', variety: '', varietyCount: '', varietyNames: [], startDate: '', deadline: '', employee: '', designer: '', status: 'Active', delayReason: '', notes: '', leadId: '' });
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isDeleteModalOpen) {
          setIsDeleteModalOpen(false);
        } else if (isStatusReasonModalOpen) {
          setIsStatusReasonModalOpen(false);
        } else if (isDelayModalOpen) {
          setIsDelayModalOpen(false);
          setPendingRow(null);
        } else if (isModalOpen) {
          handleModalClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, isDeleteModalOpen, isStatusReasonModalOpen, isDelayModalOpen]);

  useEffect(() => {
    if (isModalOpen) {
      const fetchUsers = async () => {
        try {
          const res = await api.get('/users');
          setUsers(res.data);
        } catch (err) {
          console.error('Error fetching users:', err);
        }
      };
      fetchUsers();
    }
  }, [isModalOpen]);

  const confirmDelete = async () => {
    if (!editingId) return;
    
    try {
      await api.delete(`/artworks/${editingId}`);
      setData(prev => prev.filter(item => item.id !== editingId));
      toast.success('Design deleted successfully.');
      setIsDeleteModalOpen(false);
      handleModalClose();
    } catch (err) {
      console.error('Error deleting design:', err);
      toast.error('Failed to delete design.');
    }
  };

  const executeSave = async (reason = formData.delayReason) => {
    try {
      const finalVariety = formData.varietyNames.filter(n => n.trim() !== '').join(',') || formData.varietyCount;
      const { varietyCount, varietyNames, ...restFormData } = formData;
      const payload = {
        ...restFormData,
        delayReason: reason,
        variety: finalVariety,
        uploadedAt: formData.uploadedAt || new Date().toISOString(),
      };

      if (editingId) {
        const res = await api.put(`/artworks/${editingId}`, payload);
        setData(prev => prev.map(item => item.id === editingId ? res.data : item));
        toast.success(`Design updated successfully.`);
      } else {
        const res = await api.post('/artworks', payload);
        setData(prev => [res.data, ...prev]);
        toast.success(`Design saved successfully.`);
      }
      handleModalClose();
    } catch (err) {
      console.error('Error saving artwork:', err);
      toast.error('Failed to save design.');
    }
  };

  const handleModalSubmit = async (e) => {
    if (e) e.preventDefault();
    if ((formData.status === 'Hold' || formData.status === 'Delay') && !formData.delayReason) {
      setDelayReasonText('');
      setIsStatusReasonModalOpen(true);
      return;
    }
    await executeSave();
  };

  const handleStatusReasonSubmit = () => {
    if (!delayReasonText.trim()) {
      toast.error('Please provide a reason.');
      return;
    }
    setFormData(prev => ({ ...prev, delayReason: delayReasonText }));
    setIsStatusReasonModalOpen(false);
    executeSave(delayReasonText);
  };

  const isLate = (deadlineStr, status, delayReason) => {
    if (!deadlineStr || status === 'Final/Party Approve' || delayReason) return false;
    const deadlineDate = new Date(deadlineStr);
    deadlineDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return deadlineDate < today;
  };

  const handleRowClick = (row) => {
    if (isLate(row.deadline, row.status, row.delayReason)) {
      setPendingRow(row);
      setDelayReasonText('');
      setIsDelayModalOpen(true);
    } else {
      openEditModal(row);
    }
  };

  const handleDelaySubmit = () => {
    if (!delayReasonText.trim()) {
      toast.error('Please enter a reason for the delay.');
      return;
    }
    const updatedRow = { ...pendingRow, delayReason: delayReasonText };
    setIsDelayModalOpen(false);
    setPendingRow(null);
    openEditModal(updatedRow);
  };

  const openEditModal = (row) => {
    setEditingId(row.id);
    setActiveTab(row.leadId ? 'Lead Design' : 'Customer Design');
    
    let vCount = '';
    let vNames = [];
    if (row.variety) {
       if (!isNaN(row.variety) && !row.variety.includes(',')) {
          vCount = parseInt(row.variety) || '';
          vNames = Array(vCount || 0).fill('');
       } else {
          vNames = row.variety.split(',').map(s => s.trim());
          vCount = vNames.length;
       }
    }

    setFormData({
      customerId: row.customerId || '',
      designType: row.designType || '',
      productId: row.productId || '',
      variety: row.variety || '',
      varietyCount: vCount,
      varietyNames: vNames,
      startDate: row.startDate || '',
      deadline: row.deadline || '',
      employee: row.employee || '',
      designer: row.designer || '',
      status: row.status || 'Active',
      delayReason: row.delayReason || '',
      notes: row.notes || '',
      uploadedAt: row.uploadedAt,
      leadId: row.leadId || '',
    });
    setIsModalOpen(true);
  };

  const columns = [
    { 
      header: 'Customer', 
      accessor: row => (
        <div className="flex flex-col">
          <span>{customers[row.customerId]?.name || row.customerId || 'UNKNOWN CUSTOMER'}</span>
          {row.delayReason && (
            <span className="text-[11px] text-red-600 font-medium mt-0.5">Reason: {row.delayReason}</span>
          )}
        </div>
      ),
      exportAccessor: row => customers[row.customerId]?.name || row.customerId || 'UNKNOWN CUSTOMER'
    },
    { header: 'Design', accessor: row => row.designType || '-' },
    { 
      header: 'Product', 
      accessor: row => {
        const p = products.find(prod => prod.id === row.productId);
        return p ? p.name : (row.productId || 'UNKNOWN PRODUCT');
      }
    },
    { 
      header: 'Variety', 
      accessor: row => {
        if (!row.variety) return '-';
        if (!isNaN(row.variety) && !String(row.variety).includes(',')) return row.variety;
        return String(row.variety).split(',').filter(Boolean).length;
      }
    },
    { 
      header: 'Variety Name', 
      accessor: row => {
        if (!row.variety) return '-';
        if (!isNaN(row.variety) && !String(row.variety).includes(',')) return '-';
        const names = String(row.variety).split(',').map(s => s.trim()).filter(Boolean);
        return (
          <div className="flex flex-col gap-1 py-1">
            {names.map((name, i) => (
              <span key={i} className="whitespace-nowrap">{name}</span>
            ))}
          </div>
        );
      },
      exportAccessor: row => {
        if (!row.variety) return '-';
        if (!isNaN(row.variety) && !String(row.variety).includes(',')) return '-';
        return row.variety;
      }
    },
    { header: 'Start Date', accessor: row => row.startDate ? new Date(row.startDate).toLocaleDateString('en-IN') : '-' },
    { header: 'Deadline', accessor: row => row.deadline ? new Date(row.deadline).toLocaleDateString('en-IN') : '-' },
    { header: 'Status', accessor: row => <span className={`px-2 py-1 text-xs font-semibold rounded-full ${row.status === 'Final/Party Approve' ? 'bg-green-100 text-green-800' : row.status === 'In Process' ? 'bg-blue-100 text-blue-800' : row.status === 'Delay' ? 'bg-red-100 text-red-800' : row.status === 'Hold' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'}`}>{row.status || 'Active'}</span> },
    { header: 'Employee', accessor: row => row.employee || '-' },
    { header: 'Designer', accessor: row => row.designer || '-' },
    { header: 'Notes', accessor: row => row.notes },
  ];

  const activeData = data.filter(item => item.status !== 'Final/Party Approve');
  const filteredData = selectedStatus ? data.filter(item => item.status === selectedStatus) : activeData;

  return (
    <>
      <div className="space-y-4 h-full flex flex-col">
        {/* Design Pipeline Tiles */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 overflow-x-auto flex-shrink-0">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Design Pipeline</h3>
            {selectedStatus && (
              <button 
                onClick={() => setSelectedStatus(null)}
                className="text-xs font-semibold text-brand-accent hover:text-brand-primary"
              >
                Clear Filter
              </button>
            )}
          </div>
          <div className="flex space-x-3 min-w-max pb-2">
            <div 
              onClick={() => setSelectedStatus(null)}
              className={`flex-1 min-w-[120px] border rounded-lg px-3 py-2.5 relative overflow-hidden cursor-pointer transition-colors ${!selectedStatus ? 'bg-brand-accent/10 border-brand-accent shadow-sm' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
            >
              <div className="relative z-10">
                <p className="font-medium text-gray-900 text-[13px] leading-tight">View All</p>
                <p className="text-lg font-bold text-brand-accent mt-1">{activeData.length}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">Active designs</p>
              </div>
            </div>
            {designStages.map((stage) => {
              const count = data.filter(j => j.status === stage.key).length;
              return (
                <div 
                  key={stage.id} 
                  onClick={() => setSelectedStatus(stage.key)}
                  className={`flex-1 min-w-[120px] border rounded-lg px-3 py-2.5 relative overflow-hidden cursor-pointer transition-colors ${selectedStatus === stage.key ? 'bg-brand-accent/10 border-brand-accent shadow-sm' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
                >
                  <div className="relative z-10">
                    <p className="font-medium text-gray-900 text-[13px] leading-tight">{stage.name}</p>
                    <p className="text-lg font-bold text-brand-accent mt-1">{count}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Designs</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Data Table */}
        <div className="flex-1 overflow-hidden">
          <DataTable
            isLoading={!isLoaded}
            title={selectedStatus ? `Designs - ${selectedStatus}` : "Design Management"}
            subtitle="Manage all customer design assets and approval statuses."
            actionButton={
              <button
                onClick={() => setIsModalOpen(true)}
                className="btn-add"
              >
                <Plus className="w-4 h-4" />
                <span>Add Design</span>
              </button>
            }
            columns={columns}
            data={filteredData}
            onRowClick={handleRowClick}
          />
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) handleModalClose(); }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <h3 className="text-lg font-bold text-gray-900">{editingId ? 'Edit Design' : 'Add New Design'}</h3>
              <button onClick={handleModalClose} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex border-b border-gray-100 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('Customer Design')}
                className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-colors ${activeTab === 'Customer Design' ? 'border-[#1b2f63] text-[#1b2f63]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                Customer Design
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('Lead Design')}
                className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-colors ${activeTab === 'Lead Design' ? 'border-[#1b2f63] text-[#1b2f63]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                Lead Design
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="p-6 space-y-4 overflow-y-auto">
              {activeTab === 'Lead Design' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Link Lead</label>
                    <CustomSelect
                      name="leadId"
                      value={formData.leadId}
                      onChange={e => {
                        const selectedLead = leads.find(l => l.id === e.target.value);
                        setFormData({ 
                          ...formData, 
                          leadId: e.target.value,
                          customerId: selectedLead ? (selectedLead.contactPerson || '').toUpperCase() : formData.customerId
                        });
                      }}
                      options={(leads || []).map(l => ({
                        label: `${l.contactPerson || 'Unknown Contact'} ${l.company ? `(${l.company})` : ''}`.trim(),
                        value: l.id
                      }))}
                      placeholder="Select a Lead to Link"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent text-sm"
                      placeholder="Enter customer name"
                      value={formData.customerId}
                      onChange={e => setFormData({ ...formData, customerId: e.target.value.toUpperCase() })}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {activeTab === 'Customer Design' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                    <CustomSelect
                      name="customerId"
                      value={formData.customerId}
                      onChange={e => setFormData({ ...formData, customerId: e.target.value })}
                      options={Object.values(customers).map(c => ({ label: c.name, value: c.id }))}
                      placeholder="Select a customer"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Design</label>
                  <CustomSelect
                    name="designType"
                    value={formData.designType}
                    onChange={e => setFormData({ ...formData, designType: e.target.value })}
                    options={[
                      { label: 'Old', value: 'Old' },
                      { label: 'New', value: 'New' },
                      { label: 'Changes', value: 'Changes' }
                    ]}
                    placeholder="Select Design"
                    required
                  />
                </div>

                {activeTab === 'Lead Design' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent text-sm"
                      placeholder="Enter product name"
                      value={formData.productId}
                      onChange={e => setFormData({ ...formData, productId: e.target.value.toUpperCase() })}
                      required
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {activeTab === 'Customer Design' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                    <CustomSelect
                      name="productId"
                      value={formData.productId}
                      onChange={e => setFormData({ ...formData, productId: e.target.value })}
                      options={(products || [])
                        .filter(p => !formData.customerId || p.companyName === customers[formData.customerId]?.name)
                        .map(p => ({ label: p.name, value: p.id }))}
                      placeholder="Select a product"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Variety (Count)</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent text-sm"
                    placeholder="Enter number of varieties"
                    value={formData.varietyCount}
                    onChange={e => {
                      const count = parseInt(e.target.value) || 0;
                      setFormData(prev => {
                        const newNames = [...prev.varietyNames];
                        if (count > newNames.length) {
                          for (let i = newNames.length; i < count; i++) newNames.push('');
                        } else if (count < newNames.length) {
                          newNames.splice(count);
                        }
                        return { ...prev, varietyCount: e.target.value, varietyNames: newNames };
                      });
                    }}
                    required
                  />
                </div>
              </div>

              {formData.varietyNames.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  {formData.varietyNames.map((name, index) => (
                    <div key={index}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Variety {index + 1} Name</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent text-sm"
                        placeholder={`Enter variety ${index + 1}`}
                        value={name}
                        onChange={e => {
                          const newNames = [...formData.varietyNames];
                          newNames[index] = e.target.value.toUpperCase();
                          setFormData({ ...formData, varietyNames: newNames });
                        }}
                        required
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent text-sm"
                    value={formData.startDate}
                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deadline *</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent text-sm"
                    value={formData.deadline}
                    onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                  <CustomSelect
                    name="employee"
                    value={formData.employee}
                    onChange={e => setFormData({ ...formData, employee: e.target.value })}
                    options={[
                      { label: 'Select Employee', value: '' },
                      ...users.map(user => ({ label: user.name, value: user.name }))
                    ]}
                    placeholder="Select employee"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Designer</label>
                  <CustomSelect
                    name="designer"
                    value={formData.designer}
                    onChange={e => setFormData({ ...formData, designer: e.target.value })}
                    options={[
                      { label: 'Select Designer', value: '' },
                      ...users.map(user => ({ label: user.name, value: user.name }))
                    ]}
                    placeholder="Select designer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <CustomSelect
                    name="status"
                    value={formData.status}
                    onChange={e => {
                      const newStatus = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        status: newStatus,
                        delayReason: (newStatus === 'Hold' || newStatus === 'Delay') ? prev.delayReason : ''
                      }));
                    }}
                    options={designStages.map(stage => ({ label: stage.name, value: stage.key }))}
                    required
                  />
                </div>
              </div>

              {formData.delayReason && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Delay Reason</label>
                  <div className="w-full px-3 py-2 border border-red-300 bg-red-50 text-red-700 rounded-lg text-sm">
                    {formData.delayReason}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent text-sm min-h-[100px]"
                  placeholder="Enter any additional notes..."
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value.toUpperCase() })}
                />
              </div>



              <div className="flex justify-between items-center mt-8 pt-4">
                <div>
                  {editingId && (
                    <button
                      type="button"
                      onClick={() => setIsDeleteModalOpen(true)}
                      className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
                    >
                      Delete Design
                    </button>
                  )}
                </div>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={handleModalClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-[#0f172a] hover:bg-[#1e293b] rounded-lg transition-colors"
                  >
                    {editingId ? 'Update Design' : 'Save Design'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Design"
        message="Are you sure you want to delete this design? This action cannot be undone."
      />

      {/* Delay Reason Modal */}
      {isDelayModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) { setIsDelayModalOpen(false); setPendingRow(null); } }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md flex flex-col max-h-[calc(100dvh-4rem)] md:max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-red-50 shrink-0">
              <h2 className="text-lg font-bold text-red-700">Deadline Passed</h2>
              <button onClick={() => { setIsDelayModalOpen(false); setPendingRow(null); }} className="text-red-400 hover:text-red-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-3">
                  This design has passed its deadline. Please enter a reason for the delay to proceed.
                </p>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delay Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-colors resize-none uppercase text-sm"
                  rows="3"
                  placeholder="Enter delay reason..."
                  value={delayReasonText}
                  onChange={(e) => setDelayReasonText(e.target.value.toUpperCase())}
                  required
                />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsDelayModalOpen(false);
                    setPendingRow(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelaySubmit}
                  disabled={!delayReasonText.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  Proceed
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Reason Modal */}
      {isStatusReasonModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) setIsStatusReasonModalOpen(false); }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md flex flex-col max-h-[calc(100dvh-4rem)] md:max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-red-50 shrink-0">
              <h2 className="text-lg font-bold text-red-700">Provide Reason</h2>
              <button onClick={() => setIsStatusReasonModalOpen(false)} className="text-red-400 hover:text-red-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-3">
                  You are marking this design as <strong>{formData.status}</strong>. Please provide a reason.
                </p>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-colors resize-none uppercase text-sm"
                  rows="3"
                  placeholder="e.g., AWAITING CLIENT APPROVAL"
                  value={delayReasonText}
                  onChange={(e) => setDelayReasonText(e.target.value.toUpperCase())}
                  required
                />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsStatusReasonModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStatusReasonSubmit}
                  disabled={!delayReasonText.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
