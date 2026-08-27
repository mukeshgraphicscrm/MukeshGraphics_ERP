import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Briefcase, MapPin, Building, Calendar } from 'lucide-react';
import AddJobModal from '../components/AddJobModal';
import EditJobModal from '../components/EditJobModal';

// Mock data for initial state
const initialJobs = [
  {
    id: '1',
    title: 'Senior Press Operator',
    department: 'Production',
    location: 'Mumbai Facility',
    type: 'Full-time',
    experience: '5+ Years',
    salary: '₹4,00,000 - ₹6,00,000',
    status: 'Active',
    description: 'We are looking for an experienced Press Operator to manage our advanced printing machinery...',
    postedDate: '2026-08-15',
  },
  {
    id: '2',
    title: 'Sales Executive',
    department: 'Sales',
    location: 'Remote / Field',
    type: 'Full-time',
    experience: '2-4 Years',
    salary: '₹3,00,000 - ₹5,00,000 + Commission',
    status: 'Active',
    description: 'Looking for a driven sales professional with B2B experience in printing and packaging solutions.',
    postedDate: '2026-08-20',
  },
];

export default function JobInquiry() {
  const [jobs, setJobs] = useState(initialJobs);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredJobs = jobs.filter(job => 
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    job.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddJob = (newJob) => {
    const jobWithId = { ...newJob, id: Date.now().toString(), postedDate: new Date().toISOString().split('T')[0] };
    setJobs([jobWithId, ...jobs]);
    setIsAddModalOpen(false);
  };

  const handleUpdateJob = (updatedJob) => {
    setJobs(jobs.map(job => job.id === updatedJob.id ? updatedJob : job));
    setIsEditModalOpen(false);
  };

  const handleDeleteJob = (id) => {
    if (window.confirm('Are you sure you want to delete this job posting?')) {
      setJobs(jobs.filter(job => job.id !== id));
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Closed': return 'bg-gray-100 text-gray-800';
      case 'Draft': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Job Inquiry Management</h2>
          <p className="text-sm text-gray-500 mt-1">Manage job postings for the Careers page.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search jobs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-accent"
            />
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="btn-add w-full sm:w-auto justify-center"
          >
            <Plus className="w-4 h-4 mr-1" /> <span>Create Posting</span>
          </button>
        </div>
      </div>

      {/* Jobs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredJobs.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-xl border border-gray-200">
            No job postings found.
          </div>
        ) : (
          filteredJobs.map((job) => (
            <div key={job.id} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow relative group">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{job.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                      {job.status}
                    </span>
                    <span className="text-xs text-gray-500">Posted on {job.postedDate}</span>
                  </div>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => { setEditingJob(job); setIsEditModalOpen(true); }}
                    className="p-1.5 text-gray-500 hover:text-brand-accent hover:bg-brand-50 rounded"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteJob(job.id)}
                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600 gap-2">
                  <Building className="w-4 h-4 text-gray-400" /> {job.department}
                </div>
                <div className="flex items-center text-sm text-gray-600 gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" /> {job.location}
                </div>
                <div className="flex items-center text-sm text-gray-600 gap-2">
                  <Briefcase className="w-4 h-4 text-gray-400" /> {job.type} · {job.experience}
                </div>
                {job.salary && (
                  <div className="flex items-center text-sm text-gray-600 gap-2">
                    <span className="w-4 h-4 text-gray-400 flex items-center justify-center font-bold text-xs">₹</span> {job.salary}
                  </div>
                )}
              </div>

              <p className="text-sm text-gray-600 line-clamp-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                {job.description}
              </p>
            </div>
          ))
        )}
      </div>

      <AddJobModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onAdd={handleAddJob} 
      />
      
      {editingJob && (
        <EditJobModal 
          isOpen={isEditModalOpen} 
          onClose={() => { setIsEditModalOpen(false); setEditingJob(null); }} 
          job={editingJob}
          onUpdate={handleUpdateJob}
        />
      )}
    </div>
  );
}
