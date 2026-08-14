import React, { useState, useEffect } from 'react';
import { Settings, User, Calendar, Clock, AlertTriangle, Plus } from 'lucide-react';
import api from '../lib/api';
import CreateJobModal from '../components/CreateJobModal';
import ScheduleDispatchModal from '../components/ScheduleDispatchModal';
import CustomSelect from '../components/CustomSelect';
const stages = [
  { id: 1, name: 'Printing', key: 'Printing' },
  { id: 2, name: 'Lamination', key: 'Lamination' },
  { id: 3, name: 'Punching', key: 'Punching' },
  { id: 4, name: 'Striping', key: 'Striping' },
  { id: 5, name: 'Pasting', key: 'Pasting' },
  { id: 6, name: 'Ready To Dispatch', key: 'Ready To Dispatch' },
  { id: 7, name: 'Dispatched', key: 'Dispatched' },
];

export default function Production() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  
  const [isScheduleDispatchOpen, setIsScheduleDispatchOpen] = useState(false);
  const [dispatchInitialData, setDispatchInitialData] = useState(null);

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const handleEditJob = (job) => {
    setEditingJob(job);
    setIsCreateModalOpen(true);
  };

  useEffect(() => {
    api.get('/productionJobs')
      .then(res => {
        setJobs(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching production jobs:', err);
        setLoading(false);
      });
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const processedJobs = jobs.map(job => {
    let derivedStatus = job.status || 'On Schedule';
    if (job.deadline) {
      const deadlineDate = new Date(job.deadline);
      deadlineDate.setHours(0, 0, 0, 0);
      
      const diffTime = deadlineDate - today;
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0 && Number(job.progress) < 100) {
        derivedStatus = 'Delayed';
      } else if (diffDays >= 0 && diffDays <= 3 && Number(job.progress) < 90) {
        derivedStatus = 'At Risk';
      } else {
        derivedStatus = 'On Schedule';
      }
    }
    return { ...job, displayStatus: derivedStatus };
  });

  const filteredJobs = processedJobs.filter(job => {
    let match = true;
    if (statusFilter !== 'All' && job.displayStatus !== statusFilter) {
      match = false;
    }
    if (fromDate) {
      if (!job.deadline || new Date(job.deadline) < new Date(fromDate)) match = false;
    }
    if (toDate) {
      if (!job.deadline) {
        match = false;
      } else {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        if (new Date(job.deadline) > end) match = false;
      }
    }
    return match;
  });

  if (loading) return <div className="p-8 text-center text-gray-500">Loading Production Floor...</div>;

  return (
    <>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Production Floor</h2>
          <p className="text-sm text-gray-500 mt-1">Live tracking of all running job cards.</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="btn-add"
        >
          <Plus className="w-4 h-4" />
          <span>Add Job</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between border-l-4 border-l-brand-line">
          <div>
            <p className="text-xs font-medium text-gray-500">Active Jobs</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{processedJobs.length}</p>
          </div>
          <Settings className="w-6 h-6 text-brand-line opacity-20" />
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between border-l-4 border-l-green-500">
          <div>
            <p className="text-xs font-medium text-gray-500">On Schedule</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{processedJobs.filter(j => j.displayStatus === 'On Schedule').length}</p>
          </div>
          <Clock className="w-6 h-6 text-green-500 opacity-20" />
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between border-l-4 border-l-amber-500">
          <div>
            <p className="text-xs font-medium text-gray-500">At Risk</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{processedJobs.filter(j => j.displayStatus === 'At Risk').length}</p>
          </div>
          <AlertTriangle className="w-6 h-6 text-amber-500 opacity-20" />
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between border-l-4 border-l-red-500">
          <div>
            <p className="text-xs font-medium text-gray-500">Delayed</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{processedJobs.filter(j => j.displayStatus === 'Delayed').length}</p>
          </div>
          <AlertTriangle className="w-6 h-6 text-red-500 opacity-20" />
        </div>
      </div>

      {/* Production Pipeline Tiles */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 overflow-x-auto">
        <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Production Pipeline</h3>
        <div className="flex space-x-3 min-w-max">
          {stages.map((stage) => {
            const count = processedJobs.filter(j => j.stage === stage.key).length;
            return (
              <div key={stage.id} className="flex-1 min-w-[120px] bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 relative overflow-hidden">
                <div className="relative z-10">
                  <p className="font-medium text-gray-900 text-[13px] leading-tight">{stage.name}</p>
                  <p className="text-lg font-bold text-brand-accent mt-1">{count}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Active jobs</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Job Cards List */}
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 space-y-3 sm:space-y-0">
          <h3 className="text-lg font-bold text-gray-900">Active Job Cards</h3>
          <div className="flex flex-wrap items-center gap-2">
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
            <div className="w-[160px]">
              <CustomSelect 
                name="statusFilter"
                options={[
                  { label: 'All Status', value: 'All' },
                  { label: 'On Schedule', value: 'On Schedule' },
                  { label: 'At Risk', value: 'At Risk' },
                  { label: 'Delayed', value: 'Delayed' }
                ]}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="flex flex-col space-y-4">
          {filteredJobs.slice().sort((a, b) => (a.jobCardNo || '').localeCompare(b.jobCardNo || '')).map((job) => {
            const currentStageIndex = stages.findIndex(s => s.key === job.stage);
            const getInitials = (name) => {
              if (!name) return 'NA';
              return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            };

            return (
              <div 
                key={job.id} 
                onClick={() => handleEditJob(job)}
                className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md cursor-pointer transition-all p-6"
              >
                {/* Top Row */}
                <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="text-sm font-medium text-gray-500">{job.jobCardNo}</span>
                    <span className={`whitespace-nowrap px-2 py-0.5 text-xs font-semibold rounded ${
                      job.displayStatus === 'On Schedule' ? 'bg-emerald-100 text-emerald-700' :
                      job.displayStatus === 'At Risk' ? 'bg-amber-100 text-amber-700' :
                      job.displayStatus === 'Delayed' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {job.displayStatus}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold shrink-0">
                      {getInitials(job.customerName)}
                    </div>
                    <span className="whitespace-nowrap px-3 py-1 bg-red-50 text-red-500 text-xs font-medium rounded-full border border-red-100">
                      {job.stage}
                    </span>
                  </div>
                </div>
                
                {/* Title Row */}
                <div className="mb-6">
                  <h4 className="text-xl font-bold text-gray-900">
                    {job.customerName || 'Customer Name'} - {job.productName}
                  </h4>
                  <p className="text-sm text-gray-500 mt-1">
                    Printing Copies - {job.units ? job.units.toLocaleString('en-IN') : 0} · due {job.deadline ? new Date(job.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}
                  </p>
                </div>

                {/* Progress Tracker */}
                <div className="w-full">
                  {/* Continuous Progress Bar */}
                  <div className="flex items-center mb-6">
                    <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-red-500 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${job.progress || 0}%` }}
                      ></div>
                    </div>
                    <div className="ml-4 font-bold text-sm text-gray-900 w-10 text-right">
                      {job.progress}%
                    </div>
                  </div>

                  {/* Segmented Pipeline */}
                  <div className="flex space-x-1 mb-2 pr-14">
                    {stages.map((stageItem, index) => {
                      const isCompleted = index <= currentStageIndex;
                      return (
                        <div key={`bar-${stageItem.id}`} className={`flex-1 h-1 rounded-full ${isCompleted ? 'bg-red-500' : 'bg-gray-100'}`}></div>
                      );
                    })}
                  </div>
                  <div className="flex space-x-1 pr-14">
                    {stages.map((stageItem, index) => {
                      const isCurrent = index === currentStageIndex;
                      return (
                        <div key={`label-${stageItem.id}`} className={`flex-1 text-center text-[10px] sm:text-xs font-medium truncate ${isCurrent ? 'text-red-500' : 'text-gray-400'}`}>
                          {stageItem.name}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
          {filteredJobs.length === 0 && (
            <div className="py-12 text-center text-gray-500 bg-white rounded-lg border border-gray-200">
              No active job cards found matching the criteria.
            </div>
          )}
        </div>
      </div>
      </div>

      <CreateJobModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingJob(null);
        }}
        onJobAdded={(newJob) => {
          setJobs(prev => [...prev, newJob]);
          if (newJob.stage === 'Ready To Dispatch') {
            setDispatchInitialData({ customer: newJob.customerName });
            setIsScheduleDispatchOpen(true);
          }
        }}
        onJobUpdated={(updatedJob) => {
          setJobs(prev => prev.map(j => j.id === updatedJob.id ? updatedJob : j));
          if (updatedJob.stage === 'Ready To Dispatch') {
            setDispatchInitialData({ customer: updatedJob.customerName });
            setIsScheduleDispatchOpen(true);
          }
        }}
        jobs={jobs}
        jobToEdit={editingJob}
      />

      <ScheduleDispatchModal
        isOpen={isScheduleDispatchOpen}
        onClose={() => {
          setIsScheduleDispatchOpen(false);
          setDispatchInitialData(null);
        }}
        initialData={dispatchInitialData}
      />
    </>
  );
}
