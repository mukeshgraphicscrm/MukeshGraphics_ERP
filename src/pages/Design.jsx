import React, { useState, useEffect } from 'react';
import DataTable from '../components/DataTable';
import CustomSelect from '../components/CustomSelect';
import { Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';

export default function Design() {
  const { artworks: data, setArtworks: setData, customerMap: customers, products, isLoaded } = useData();
  const { currentUser } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({
    customerId: '',
    designType: '',
    productId: '',
    variety: '',
    startDate: '',
    deadline: '',
    employee: '',
    designer: '',
    status: 'Pending',
    delayReason: '',
    notes: ''
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

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ customerId: '', designType: '', productId: '', variety: '', startDate: '', deadline: '', employee: '', designer: '', status: 'Pending', delayReason: '', notes: '' });
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isModalOpen) {
        handleModalClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

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

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
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

  const isLate = (deadlineStr, status, delayReason) => {
    if (!deadlineStr || status === 'Complete' || delayReason) return false;
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
    setFormData({
      customerId: row.customerId || '',
      designType: row.designType || '',
      productId: row.productId || '',
      variety: row.variety || '',
      startDate: row.startDate || '',
      deadline: row.deadline || '',
      employee: row.employee || '',
      designer: row.designer || '',
      status: row.status || 'Pending',
      delayReason: row.delayReason || '',
      notes: row.notes || '',
      uploadedAt: row.uploadedAt,
    });
    setIsModalOpen(true);
  };

  const columns = [
    { header: 'Customer', accessor: row => customers[row.customerId]?.name || 'UNKNOWN CUSTOMER' },
    { header: 'Design', accessor: row => row.designType || '-' },
    { 
      header: 'Product', 
      accessor: row => {
        const p = products.find(prod => prod.id === row.productId);
        return p ? p.name : 'UNKNOWN PRODUCT';
      }
    },
    { header: 'Variety', accessor: row => row.variety },
    { header: 'Start Date', accessor: row => row.startDate ? new Date(row.startDate).toLocaleDateString('en-IN') : '-' },
    { header: 'Deadline', accessor: row => row.deadline ? new Date(row.deadline).toLocaleDateString('en-IN') : '-' },
    { header: 'Status', accessor: row => <span className={`px-2 py-1 text-xs font-semibold rounded-full ${row.status === 'Complete' ? 'bg-green-100 text-green-800' : row.status === 'In Progress' ? 'bg-blue-100 text-blue-800' : row.status === 'Delay' ? 'bg-red-100 text-red-800' : row.status === 'Hold' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'}`}>{row.status || 'Pending'}</span> },
    { header: 'Employee', accessor: row => row.employee || '-' },
    { header: 'Designer', accessor: row => row.designer || '-' },
    { header: 'Notes', accessor: row => row.notes },
  ];

  const filteredData = selectedStatus ? data.filter(item => item.status === selectedStatus) : data;

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
                <p className="text-lg font-bold text-brand-accent mt-1">{data.length}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">Total designs</p>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <h3 className="text-lg font-bold text-gray-900">{editingId ? 'Edit Design' : 'Add New Design'}</h3>
              <button onClick={handleModalClose} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleModalSubmit} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                  <CustomSelect
                    name="productId"
                    value={formData.productId}
                    onChange={e => setFormData({ ...formData, productId: e.target.value })}
                    options={(products || []).map(p => ({ label: p.name, value: p.id }))}
                    placeholder="Select a product"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Variety</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent text-sm"
                    placeholder="Enter variety"
                    value={formData.variety}
                    onChange={e => setFormData({ ...formData, variety: e.target.value })}
                    required
                  />
                </div>
              </div>

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
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    options={[
                      { label: 'Pending', value: 'Pending' },
                      { label: 'In Progress', value: 'In Progress' },
                      { label: 'Complete', value: 'Complete' }
                    ]}
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
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>



              <div className="flex justify-end space-x-3 mt-8 pt-4">
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
            </form>
          </div>
        </div>
      )}
      {/* Delay Reason Modal */}
      {isDelayModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="p-6">
              <h3 className="text-lg font-bold text-red-600 mb-2">Deadline Passed</h3>
              <p className="text-sm text-gray-600 mb-4">
                This design has passed its deadline. Please enter a reason for the delay to proceed.
              </p>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent text-sm min-h-[80px]"
                placeholder="Enter delay reason..."
                value={delayReasonText}
                onChange={(e) => setDelayReasonText(e.target.value)}
              />
              <div className="flex justify-end space-x-3 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsDelayModalOpen(false);
                    setPendingRow(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelaySubmit}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  Proceed
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
