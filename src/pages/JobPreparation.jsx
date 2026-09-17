import React, { useState, useMemo } from 'react';
import { Plus, Activity, Clock, CheckCircle2, PauseCircle } from 'lucide-react';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import CreateJobPreparationModal from '../components/CreateJobPreparationModal';
import ViewJobPreparationModal from '../components/ViewJobPreparationModal';
import AddSupplierModal from '../components/AddSupplierModal';
import { useData } from '../contexts/DataContext';
import { cn } from '../lib/utils';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function JobPreparation() {
  const { jobPreparations, setJobPreparations: setData, artworks, customerMap, isLoaded, inventory, setInventory } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [jobToEdit, setJobToEdit] = useState(null);
  const [jobToView, setJobToView] = useState(null);
  const [statusFilter, setStatusFilter] = useState('Active');

  const data = jobPreparations || [];

  const columns = [
    { 
      header: 'O.No', 
      accessor: row => row.linkedOrders?.length > 0 ? row.linkedOrders.map(l => l.orderNo).filter(Boolean).join(', ') : row.orderNo || '-',
      render: row => (
        <div className="flex flex-col gap-1">
          {row.linkedOrders?.length > 0 
            ? row.linkedOrders.map((l, i) => <span key={i} className="font-medium text-brand-accent whitespace-nowrap">{l.orderNo || '-'}</span>)
            : <span className="font-medium text-brand-accent whitespace-nowrap">{row.orderNo || '-'}</span>
          }
        </div>
      )
    },
    { 
      header: 'Party', 
      accessor: row => row.linkedOrders?.length > 0 ? row.linkedOrders.map(l => l.party).filter(Boolean).join(', ') : row.party || '-',
      render: row => (
        <div className="flex flex-col gap-1">
          {row.linkedOrders?.length > 0
            ? row.linkedOrders.map((l, i) => <span key={i} className="whitespace-nowrap truncate max-w-[150px] block" title={l.party}>{l.party || '-'}</span>)
            : <span className="whitespace-nowrap truncate max-w-[150px] block" title={row.party}>{row.party || '-'}</span>
          }
        </div>
      )
    },
    { header: 'JOB NO', accessor: row => row.jobNo || '-', render: row => <span className="font-medium text-gray-900">{row.jobNo || '-'}</span> },
    { header: 'Paper Size', accessor: row => row.paperSize || '-' },
    { header: 'Job Size', accessor: row => row.jobSize || '-' },
    { header: 'Supplier', accessor: row => row.supplier || '-' },
    {
      header: 'Status',
      accessor: row => row.status || 'Active',
      render: row => (
        <div className="flex flex-col gap-1.5 items-start max-w-[160px]">
          <StatusBadge status={row.status || 'Active'} />
          {row.note && (
            <div className="text-[11px] text-gray-600 border border-gray-200 rounded px-1.5 py-0.5 bg-gray-50 break-words w-full">
              {row.note}
            </div>
          )}
        </div>
      )
    },
  ];

  const handleJobAdded = (newJob) => setData(prev => [newJob, ...(prev || [])]);
  const handleJobUpdated = (updatedJob) => setData(prev => (prev || []).map(j => j.id === updatedJob.id ? updatedJob : j));
  const handleJobDeleted = (jobId) => setData(prev => (prev || []).filter(j => j.id !== jobId));

  const stats = useMemo(() => ({
    active: data.filter(d => d.status === 'Active').length,
    delay: data.filter(d => d.status === 'Delay').length,
    done: data.filter(d => d.status === 'Done').length,
    hold: data.filter(d => d.status === 'Hold').length,
  }), [data]);

  const filteredData = useMemo(() => {
    if (!statusFilter) return data;
    return data.filter(d => d.status === statusFilter);
  }, [data, statusFilter]);

  const recentArtworks = useMemo(() => {
    if (!artworks || !customerMap) return [];
    
    const filtered = artworks.filter(art => {
      if (art.status?.toUpperCase() !== 'FINAL/PARTY APPROVE') return false;

      // Exclude this design if it's already assigned to a job preparation
      const isDesignUsed = (jobPreparations || []).some(j => j.designId === art.id);
      if (isDesignUsed) return false;

      const customerName = customerMap[art.customerId]?.name || art.customerId;
      if (!customerName) return true;
      
      const customerJobs = (jobPreparations || []).filter(
        j => j.party?.trim().toLowerCase() === customerName.trim().toLowerCase()
      );
      if (customerJobs.length === 0) return true;
      
      // Logic to remove if ANY job for this customer is 'Done' was removed per request.
      
      return true;
    });

    return filtered.slice(0, 20);
  }, [artworks, customerMap, jobPreparations]);

  return (
    <>
      <div className="space-y-6">

        {/* ── TOP SECTION ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          
          {/* TOP: KPI Summary Cards */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-2.5 flex flex-col md:flex-row items-center gap-4">
            <h3 className="text-sm font-bold text-gray-800 shrink-0 px-2 whitespace-nowrap">Job Preparation Summary</h3>
            <div className="grid grid-cols-4 gap-3 flex-1 w-full">
              {[
                { key: 'Active', count: stats.active, Icon: Activity, bg: 'bg-blue-50', border: 'border-blue-200', ring: 'ring-blue-400', iconCls: 'bg-blue-100 text-blue-600' },
                { key: 'Delay', count: stats.delay, Icon: Clock, bg: 'bg-red-50', border: 'border-red-200', ring: 'ring-red-400', iconCls: 'bg-red-100 text-red-600' },
                { key: 'Hold', count: stats.hold, Icon: PauseCircle, bg: 'bg-amber-50', border: 'border-amber-200', ring: 'ring-amber-400', iconCls: 'bg-amber-100 text-amber-600' },
                { key: 'Done', count: stats.done, Icon: CheckCircle2, bg: 'bg-emerald-50', border: 'border-emerald-200', ring: 'ring-emerald-400', iconCls: 'bg-emerald-100 text-emerald-600' },
              ].map(({ key, count, Icon, bg, border, ring, iconCls }) => (
                <button
                  key={key}
                  onClick={() => setStatusFilter(statusFilter === key ? null : key)}
                  className={cn(
                    'flex items-center justify-between rounded-lg border transition-all duration-150 cursor-pointer group px-3 py-1.5',
                    statusFilter === key
                      ? `${bg} ${border} ring-1 ${ring} shadow-sm`
                      : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className={cn('p-1 rounded-md group-hover:scale-110 transition-transform', iconCls)}>
                      <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </div>
                    <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">{key}</span>
                  </div>
                  <span className="text-base font-bold text-gray-800 leading-none">{count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* BOTTOM: Design Status */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col" style={{ height: '240px' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-gray-50 border-b border-gray-100 shrink-0">
              <h3 className="text-base font-bold text-gray-800">Design Status</h3>
              <span className="text-xs font-semibold text-brand-accent bg-brand-accent/10 px-3 py-1.5 rounded-full">
                Recent Designs
              </span>
            </div>
            {/* Scrollable table */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    {['O.No', 'Customer', 'Design Status', 'Due Date'].map(h => (
                      <th key={h} className="px-5 py-3 text-gray-500 font-semibold border-b border-gray-100 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {!isLoaded ? (
                    [...Array(4)].map((_, i) => (
                      <tr key={`skel-${i}`} className="border-b border-gray-50">
                        <td className="px-5 py-4"><div className="h-4 bg-gray-200 animate-pulse rounded w-10"></div></td>
                        <td className="px-5 py-4"><div className="h-4 bg-gray-200 animate-pulse rounded w-32"></div></td>
                        <td className="px-5 py-4"><div className="h-5 bg-gray-200 animate-pulse rounded-full w-20"></div></td>
                        <td className="px-5 py-4"><div className="h-4 bg-gray-200 animate-pulse rounded w-16"></div></td>
                      </tr>
                    ))
                  ) : recentArtworks.length > 0 ? (
                    recentArtworks.map((art, idx) => (
                      <tr key={art.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                        <td className="px-5 py-3.5 font-bold text-brand-accent whitespace-nowrap">{String(idx + 1).padStart(3, '0')}</td>
                        <td className="px-5 py-3.5 text-gray-700 font-medium max-w-[160px] truncate">{customerMap[art.customerId]?.name || art.customerId || '-'}</td>
                        <td className="px-5 py-3.5 whitespace-nowrap"><StatusBadge status={art.status || 'Active'} /></td>
                        <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">
                          {art.deadline ? new Date(art.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '-'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={4} className="px-5 py-10 text-center text-gray-400 text-sm">No recent designs found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── MAIN JOB TABLE ──────────────────────────────────────── */}
        <div>
          <DataTable
            isLoading={!isLoaded}
            title={statusFilter ? `Job Preparations — ${statusFilter}` : 'All Job Preparations'}
            subtitle="Manage paper, sizes, and statuses for pending jobs."
            columns={columns}
            data={filteredData}
            onRowClick={(row) => { setJobToView(row); setIsViewModalOpen(true); }}
            actionButton={
              <div className="flex items-center gap-2">
                {statusFilter && (
                  <button
                    onClick={e => { e.stopPropagation(); setStatusFilter(null); }}
                    className="text-[13px] font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg transition-colors"
                  >
                    Clear: {statusFilter} ×
                  </button>
                )}
                <button
                  onClick={e => { e.stopPropagation(); setIsSupplierModalOpen(true); }}
                  className="btn-add"
                >
                  <Plus className="w-4 h-4 mr-1.5" strokeWidth={3} />
                  <span className="font-bold tracking-wide">Add Supplier</span>
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setJobToEdit(null); setIsModalOpen(true); }}
                  className="btn-add"
                >
                  <Plus className="w-4 h-4 mr-1.5" strokeWidth={3} />
                  <span className="font-bold tracking-wide">New Job</span>
                </button>
              </div>
            }
          />
        </div>
      </div>

      <CreateJobPreparationModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setJobToEdit(null); }}
        onAdded={handleJobAdded}
        onUpdated={handleJobUpdated}
        onDeleted={handleJobDeleted}
        jobToEdit={jobToEdit}
      />

      <ViewJobPreparationModal
        isOpen={isViewModalOpen}
        onClose={() => { setIsViewModalOpen(false); setJobToView(null); }}
        job={jobToView}
        onEditClick={(job) => {
          setIsViewModalOpen(false);
          setJobToEdit(job);
          setIsModalOpen(true);
        }}
        onDeleteClick={async (job) => {
          if (window.confirm('Are you sure you want to delete this job preparation?')) {
            try {
              if (job.materialId && job.sheetCount) {
                const invItem = inventory?.find(i => i.id === job.materialId);
                if (invItem) {
                  const newStock = Number(invItem.stock || 0) + Number(job.sheetCount);
                  const updatedItem = { ...invItem, stock: newStock };
                  await api.put(`/inventory/${invItem.id}`, updatedItem);
                  if (setInventory) {
                    setInventory(prev => prev.map(item => item.id === invItem.id ? updatedItem : item));
                  }
                }
              }
              await api.delete(`/job_preparations/${job.id}`);
              handleJobDeleted(job.id);
              setIsViewModalOpen(false);
              setJobToView(null);
              toast.success('Job deleted successfully');
            } catch (err) {
              console.error(err);
              toast.error('Failed to delete job');
            }
          }
        }}
      />

      <AddSupplierModal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
      />
    </>
  );
}
