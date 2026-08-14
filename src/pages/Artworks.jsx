import React, { useState, useEffect } from 'react';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import CustomSelect from '../components/CustomSelect';
import { Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

export default function Artworks() {
  const [data, setData] = useState([]);
  const [customers, setCustomers] = useState({});
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    fileName: '',
    customerId: '',
    version: 'v1.0',
    status: 'Under Review'
  });
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/artworks'),
      api.get('/customers'),
    ]).then(([artRes, custRes]) => {
      const custMap = {};
      custRes.data.forEach(c => custMap[c.id] = c);
      setCustomers(custMap);
      setData(artRes.data);
      setLoading(false);
    }).catch(err => {
      console.error('Error fetching artworks:', err);
      setLoading(false);
    });
  }, []);

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ fileName: '', customerId: '', version: 'v1.0', status: 'Under Review' });
    setSelectedFile(null);
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
      let fileUrl = '';
      if (selectedFile) {
        const formDataUpload = new FormData();
        formDataUpload.append('file', selectedFile);
        const uploadRes = await api.post('/upload', formDataUpload, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        fileUrl = uploadRes.data.url;
      }

      const payload = {
        ...formData,
        fileUrl: fileUrl || formData.fileUrl,
        uploadedAt: formData.uploadedAt || new Date().toISOString(),
      };
      
      if (editingId) {
        const res = await api.put(`/artworks/${editingId}`, payload);
        setData(prev => prev.map(item => item.id === editingId ? res.data : item));
        toast.success(`Artwork "${formData.fileName}" updated successfully.`);
      } else {
        const res = await api.post('/artworks', payload);
        setData(prev => [res.data, ...prev]);
        toast.success(`Artwork "${formData.fileName}" saved successfully.`);
      }
      handleModalClose();
    } catch (err) {
      console.error('Error saving artwork:', err);
      toast.error('Failed to save artwork.');
    }
  };

  const handleRowClick = (row) => {
    setEditingId(row.id);
    setFormData({
      fileName: row.fileName,
      customerId: row.customerId,
      version: row.version,
      status: row.status,
      fileUrl: row.fileUrl,
      uploadedAt: row.uploadedAt,
    });
    setIsModalOpen(true);
  };

  const columns = [
    { 
      header: 'File Name', 
      accessor: row => row.fileName, 
      render: row => {
        const baseUrl = api.defaults.baseURL.replace(/\/api$/, '');
        return row.fileUrl ? (
          <a 
            href={`${baseUrl}${row.fileUrl}`} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="font-medium text-brand-line hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {row.fileName}
          </a>
        ) : (
          <span className="font-medium text-brand-line">{row.fileName}</span>
        );
      }
    },
    { header: 'Customer', accessor: row => customers[row.customerId]?.name || 'DELETED CUSTOMER' },
    { header: 'Version', accessor: row => row.version, render: row => <span className="text-gray-500">{row.version}</span> },
    { header: 'Uploaded At', accessor: row => new Date(row.uploadedAt).toLocaleDateString('en-IN') },
    { header: 'Status', accessor: row => row.status, render: row => <StatusBadge status={row.status} /> },
  ];

  if (loading) return <div className="p-8 text-center text-gray-500">Loading Artworks...</div>;

  return (
    <div>
      {/* Data Table */}
      <div className="h-[calc(100vh-12rem)]">
        <DataTable
          title="Artwork Management"
          subtitle="Manage all customer artwork assets and approval statuses."
          actionButton={
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn-add"
            >
              <Plus className="w-4 h-4" />
              <span>Upload Artwork</span>
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
              <h3 className="text-lg font-bold text-gray-900">{editingId ? 'Edit Artwork' : 'Add New Artwork'}</h3>
              <button onClick={handleModalClose} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleModalSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Artwork File</label>
                <input
                  type="file"
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100 border border-gray-300 rounded-lg"
                  onChange={e => {
                    const file = e.target.files[0];
                    setSelectedFile(file);
                    if (file) {
                      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
                      setFormData(prev => ({ ...prev, fileName: nameWithoutExt }));
                    }
                  }}
                  accept=".pdf,.ai,.psd,.indd,image/*"
                  required={!editingId}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">File Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent text-sm"
                  required
                  placeholder="e.g., IceCream_Box_v2"
                  value={formData.fileName}
                  onChange={e => setFormData({ ...formData, fileName: e.target.value })}
                />
              </div>

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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent text-sm"
                    required
                    placeholder="e.g., v1.0"
                    value={formData.version}
                    onChange={e => setFormData({ ...formData, version: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <CustomSelect
                    name="status"
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    options={[
                      { label: 'Under Review', value: 'Under Review' },
                      { label: 'Approved', value: 'Approved' },
                      { label: 'Correction Required', value: 'Correction Required' },
                      { label: 'Production Released', value: 'Production Released' }
                    ]}
                    required
                  />
                </div>
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
                  {editingId ? 'Update Artwork' : 'Save Artwork'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
