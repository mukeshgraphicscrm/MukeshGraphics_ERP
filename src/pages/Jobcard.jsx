import React, { useMemo, useState } from 'react';
import DataTable from '../components/DataTable';
import { useData } from '../contexts/DataContext';
import ViewJobPipelineModal from '../components/ViewJobPipelineModal';

export default function Jobcard() {
  const { productionJobs: jobs, isLoaded, orders, customerMap, products, dispatches } = useData();
  const [selectedJob, setSelectedJob] = useState(null);
  const [isPipelineModalOpen, setIsPipelineModalOpen] = useState(false);

  // Filter for jobs that are 100% complete and compute if they are late
  const completedJobs = useMemo(() => {
    return jobs.filter(job => Number(job.progress) === 100).map(job => {
      // Logic to check if job is late
      let isLate = false;
      const customer = Object.values(customerMap || {}).find(c =>
        c?.name?.toLowerCase() === job?.customerName?.toLowerCase()
      );
      const customerId = customer?.id;
      const product = products.find(p =>
        p?.name?.toLowerCase() === job?.productName?.toLowerCase()
      );
      const productId = product?.id;
      const jobDate = job.createdAt ? new Date(job.createdAt) : new Date();

      let matchedOrder = null;
      if (orders && orders.length > 0) {
        const possibleOrders = orders.filter(o => 
          o.customerId === customerId &&
          (Array.isArray(o.productId) ? o.productId.includes(productId) : o.productId === productId)
        ).sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
        matchedOrder = possibleOrders.find(o => job.jobCardNo?.includes(o.orderNo))
          || possibleOrders.find(o => new Date(o.orderDate) <= jobDate)
          || possibleOrders[0];
      }

      let matchedDispatch = null;
      if (dispatches && dispatches.length > 0) {
        const possibleDispatches = dispatches.filter(d =>
          d.jobCardNo === job.jobCardNo ||
          d.customer === job.customerName ||
          d.customerName === job.customerName
        ).sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
        matchedDispatch = possibleDispatches[0];
      }

      const dispatchStatus = matchedDispatch?.status ? matchedDispatch.status.toUpperCase() : null;
      
      if (matchedOrder && matchedOrder.deliveryDate) {
        const deliveryDate = new Date(matchedOrder.deliveryDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        deliveryDate.setHours(0, 0, 0, 0);
        
        if (deliveryDate < today && dispatchStatus !== 'DELIVERED') {
          isLate = true;
        }
      }

      return { ...job, isLate };
    });
  }, [jobs, orders, customerMap, products, dispatches]);

  const columns = [
    { header: 'Job Card No.', accessor: row => row.jobCardNo, render: row => <span className={row.isLate ? "font-bold text-red-600" : "font-bold text-brand-accent"}>{row.jobCardNo}</span> },
    { header: 'Date', accessor: row => row.createdAt ? new Date(row.createdAt).toLocaleDateString('en-IN') : '-' },
    { header: 'Customer Name', accessor: row => row.customerName },
    { header: 'Product Name', accessor: row => row.productName },
    { header: 'Units', accessor: row => row.units ? row.units.toLocaleString('en-IN') : '0' },
    { header: 'Progress', accessor: row => row.progress, render: row => (
      <span className={`px-2 py-1 text-xs font-bold rounded border ${row.isLate ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
        {row.progress}%
      </span>
    )},
    { header: 'Stage', accessor: row => row.stage, render: row => (
      <span className={`px-2 py-1 text-xs font-bold rounded border uppercase tracking-wider ${row.isLate ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
        {row.stage}
      </span>
    )},
    { header: 'Deadline', accessor: row => row.deadline ? new Date(row.deadline).toLocaleDateString('en-IN') : '-' },
  ];

  return (
    <div className="h-[calc(100vh-8rem)]">
      <DataTable
        isLoading={!isLoaded}
        title="Completed Job Data"
        subtitle="Records of all 100% completed production jobs."
        columns={columns}
        data={completedJobs}
        rowClassName={(row) => row.isLate ? 'text-red-600 font-bold' : ''}
        onRowClick={(row) => {
          setSelectedJob(row);
          setIsPipelineModalOpen(true);
        }}
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
