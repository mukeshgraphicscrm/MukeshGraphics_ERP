import React, { useMemo, useState } from 'react';
import DataTable from '../components/DataTable';
import { useData } from '../contexts/DataContext';
import { Eye } from 'lucide-react';
import ViewJobPipelineModal from '../components/ViewJobPipelineModal';

export default function Jobcard() {
  const { productionJobs: jobs, isLoaded } = useData();
  const [selectedJob, setSelectedJob] = useState(null);
  const [isPipelineModalOpen, setIsPipelineModalOpen] = useState(false);

  // Filter for jobs that are 100% complete
  const completedJobs = useMemo(() => {
    return jobs.filter(job => Number(job.progress) === 100);
  }, [jobs]);

  const columns = [
    { header: 'Job Card No.', accessor: row => row.jobCardNo, render: row => <span className="font-bold text-brand-accent">{row.jobCardNo}</span> },
    { header: 'Date', accessor: row => row.createdAt ? new Date(row.createdAt).toLocaleDateString('en-IN') : '-' },
    { header: 'Customer Name', accessor: row => row.customerName },
    { header: 'Product Name', accessor: row => row.productName },
    { header: 'Units', accessor: row => row.units ? row.units.toLocaleString('en-IN') : '0' },
    { header: 'Progress', accessor: row => row.progress, render: row => (
      <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-xs font-bold rounded border border-emerald-100">
        {row.progress}%
      </span>
    )},
    { header: 'Stage', accessor: row => row.stage, render: row => (
      <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-xs font-bold rounded border border-emerald-100 uppercase tracking-wider">
        {row.stage}
      </span>
    )},
    { header: 'Deadline', accessor: row => row.deadline ? new Date(row.deadline).toLocaleDateString('en-IN') : '-' },
    {
      header: 'Pipeline',
      accessor: row => row.id,
      render: row => (
        <button
          onClick={() => {
            setSelectedJob(row);
            setIsPipelineModalOpen(true);
          }}
          className="p-1.5 text-gray-400 hover:text-brand-accent hover:bg-orange-50 rounded-lg transition-colors flex items-center gap-1.5 border border-transparent hover:border-orange-100 text-xs font-medium"
          title="View Pipeline"
        >
          <Eye className="w-3.5 h-3.5" /> View
        </button>
      )
    }
  ];

  return (
    <div className="h-[calc(100vh-8rem)]">
      <DataTable
        isLoading={!isLoaded}
        title="Completed Job Data"
        subtitle="Records of all 100% completed production jobs."
        columns={columns}
        data={completedJobs}
      />
      
      {isPipelineModalOpen && (
        <ViewJobPipelineModal
          isOpen={isPipelineModalOpen}
          onClose={() => {
            setIsPipelineModalOpen(false);
            setSelectedJob(null);
          }}
          job={selectedJob}
        />
      )}
    </div>
  );
}
