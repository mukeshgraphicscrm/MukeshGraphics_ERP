import React, { useState, useMemo } from 'react';
import { Plus, Activity, Clock, CheckCircle2, PauseCircle } from 'lucide-react';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import CreateJobPreparationModal from '../components/CreateJobPreparationModal';
import AddSupplierModal from '../components/AddSupplierModal';
import { useData } from '../contexts/DataContext';
import { cn } from '../lib/utils';

export default function JobPreparation() {
  const { jobPreparations, setJobPreparations: setData, artworks, customerMap, isLoaded } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [jobToEdit, setJobToEdit] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);

  const data = jobPreparations || [];

  const columns = [
    { header: 'O.No', accessor: row => row.orderNo || '-', render: row => <span className="font-medium text-brand-accent">{row.orderNo || '-'}</span> },
    { header: 'Party', accessor: row => row.party || '-' },
    { header: 'JOB NO', accessor: row => row.jobNo || '-', render: row => <span className="font-medium text-gray-900">{row.jobNo || '-'}</span> },
    { header: 'Paper', accessor: row => row.paper || '-' },
    { header: 'GSM', accessor: row => row.gsm || '-' },
    { header: 'Size', accessor: row => row.size || '-' },
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

  return (
    <>
      <div className="space-y-6">

        {/* ── TOP SECTION ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-6">

          {/* LEFT: Design Status */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col" style={{ height: '220px' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100 shrink-0">
              <h3 className="text-[14px] font-semibold text-gray-800">Design Status</h3>
              <span className="text-[11px] font-medium text-brand-accent bg-brand-accent/10 px-2.5 py-1 rounded-full">
                Recent Designs
              </span>
            </div>
            {/* Scrollable table */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
              <table className="w-full text-[12px] text-left border-collapse">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    {['O.No', 'Customer', 'Design Status', 'Due Date'].map(h => (
                      <th key={h} className="px-4 py-2 text-gray-500 font-medium border-b border-gray-100 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {artworks && artworks.slice(0, 20).map((art, idx) => (
                    <tr key={art.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-2.5 font-semibold text-brand-accent whitespace-nowrap">{String(idx + 1).padStart(3, '0')}</td>
                      <td className="px-4 py-2.5 text-gray-700 font-medium max-w-[130px] truncate">{customerMap[art.customerId]?.name || art.customerId || '-'}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap"><StatusBadge status={art.status || 'Active'} /></td>
                      <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">
                        {art.deadline ? new Date(art.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '-'}
                      </td>
                    </tr>
                  ))}
                  {(!artworks || artworks.length === 0) && (
                    <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-400 text-sm">No recent designs found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* RIGHT: KPI Summary Cards */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col" style={{ height: '220px' }}>
            <h3 className="text-[14px] font-semibold text-gray-800 mb-3 shrink-0">Job Preparation Summary</h3>
            <div className="grid grid-cols-2 gap-3 flex-1">
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
                    'flex flex-col items-center justify-center rounded-xl border transition-all duration-150 cursor-pointer group',
                    statusFilter === key
                      ? `${bg} ${border} ring-1 ${ring} shadow-sm`
                      : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                  )}
                >
                  <div className={cn('p-1.5 rounded-full mb-1 group-hover:scale-110 transition-transform', iconCls)}>
                    <Icon className="w-3 h-3" strokeWidth={2} />
                  </div>
                  <span className="text-[18px] font-bold text-gray-800 leading-none">{count}</span>
                  <span className="text-[9px] font-semibold text-gray-500 uppercase tracking-widest mt-1">{key}</span>
                </button>
              ))}
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
            onRowClick={(row) => { setJobToEdit(row); setIsModalOpen(true); }}
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
                  className="flex items-center px-3 py-2 text-[13px] font-bold text-gray-700 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900 transition-all"
                >
                  <Plus className="w-4 h-4 mr-1.5 text-gray-500" strokeWidth={3} />
                  <span className="tracking-wide">Add Supplier</span>
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

      <AddSupplierModal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
      />
    </>
  );
}
