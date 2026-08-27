import React, { useEffect, useState } from 'react';
import { X, Users, MapPin, Building, Calendar, Phone, Mail, FileText } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function ViewApplicationsModal({ isOpen, onClose, job }) {
  const { applicationsReceived, refetch } = useData();
  const [updatingId, setUpdatingId] = useState(null);

  const handleStatusChange = async (appId, newStatus) => {
    try {
      setUpdatingId(appId);
      await api.put(`/application_received/${appId}`, { status: newStatus });
      await refetch();
      toast.success('Status updated');
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !job) return null;

  const jobApplications = applicationsReceived.filter(app => 
    app.jobId === job.id || app.jobTitle === job.title
  );

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex justify-between items-center z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Applications for {job.title}</h2>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span className="flex items-center gap-1"><Building className="w-4 h-4" /> {job.department}</span>
              <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {job.location}</span>
              <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {jobApplications.length} Applicants</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          {jobApplications.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p className="text-lg">No applications received yet for this position.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {jobApplications.map((app) => (
                <div key={app.id} className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                    <div className="flex items-center gap-4">
                      <h3 className="text-lg font-bold text-gray-900">{app.fullName}</h3>
                      <select
                        value={app.status || 'Pending'}
                        onChange={(e) => handleStatusChange(app.id, e.target.value)}
                        disabled={updatingId === app.id}
                        className="px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1b2f63]/50 focus:border-[#1b2f63] transition-colors text-sm text-gray-700 bg-white cursor-pointer"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Reviewed">Reviewed</option>
                        <option value="On Hold">On Hold</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>
                    <span className="text-sm text-gray-500 flex items-center gap-1">
                      <Calendar className="w-4 h-4" /> 
                      {new Date(app.appliedAt || app.createdAt).toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <a href={`mailto:${app.email}`} className="hover:text-brand-accent hover:underline">{app.email}</a>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <a href={`tel:${app.phone}`} className="hover:text-brand-accent hover:underline">{app.phone}</a>
                    </div>
                  </div>

                  {app.coverLetter && (
                    <div className="mt-4 bg-white p-4 rounded-lg border border-gray-100">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <FileText className="w-4 h-4" /> Cover Letter
                      </h4>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{app.coverLetter}</p>
                    </div>
                  )}

                  {app.resumeUrl && (
                    <div className="mt-4">
                      <a 
                        href={app.resumeUrl}
                        target="_blank"
                        rel="noopener noreferrer" 
                        className="inline-flex items-center gap-2 px-4 py-2 bg-brand-50 text-brand-700 rounded-md text-sm font-medium hover:bg-brand-100 transition-colors"
                      >
                        <FileText className="w-4 h-4" /> View Resume
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
