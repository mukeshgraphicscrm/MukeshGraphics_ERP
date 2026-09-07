import React, { useState, useEffect } from 'react';
import DataTable from '../components/DataTable';
import CustomSelect from '../components/CustomSelect';
import { Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useData } from '../contexts/DataContext';

export default function Design() {
  const { artworks: data, setArtworks: setData, customerMap: customers, products, isLoaded } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    customerId: '',
    productId: '',
    variety: '',
    notes: ''
  });


  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ customerId: '', productId: '', variety: '', notes: '' });
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

  const handleRowClick = (row) => {
    setEditingId(row.id);
    setFormData({
      customerId: row.customerId || '',
      productId: row.productId || '',
      variety: row.variety || '',
      notes: row.notes || '',
      uploadedAt: row.uploadedAt,
    });
    setIsModalOpen(true);
  };

  const columns = [
    { header: 'Customer', accessor: row => customers[row.customerId]?.name || 'UNKNOWN CUSTOMER' },
    { 
      header: 'Product', 
      accessor: row => {
        const p = products.find(prod => prod.id === row.productId);
        return p ? p.name : 'UNKNOWN PRODUCT';
      }
    },
    { header: 'Variety', accessor: row => row.variety },
    { header: 'Notes', accessor: row => row.notes },
    { header: 'Uploaded At', accessor: row => new Date(row.uploadedAt).toLocaleDateString('en-IN') },
  ];



  return (
    <div>
      {/* Data Table */}
      <div className="h-[calc(100vh-12rem)]">
        <DataTable
          isLoading={!isLoaded}
          title="Design Management"
          subtitle="Manage all customer design assets and approval statuses."
          actionButton={
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn-add"
            >
              <Plus className="w-4 h-4" />
              <span>Upload Design</span>
            </button>
          }
          columns={columns}
          data={data}
          onRowClick={handleRowClick}
        />
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">{editingId ? 'Edit Design' : 'Add New Design'}</h3>
              <button onClick={handleModalClose} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleModalSubmit} className="p-6 space-y-4">
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
    </div>
  );
}
