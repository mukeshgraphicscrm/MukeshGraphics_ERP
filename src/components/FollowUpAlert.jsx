import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Target, X, Clock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function FollowUpAlert() {
  const { leads, isLoaded } = useData();
  const { currentUser } = useAuth();
  const [urgentLeads, setUrgentLeads] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [dismissedLeadIds, setDismissedLeadIds] = useState(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoaded || !currentUser) return;
    
    // Only for employees
    if (currentUser?.profile?.designation !== 'Employee') return;
    
    const employeeName = currentUser?.profile?.name;
    if (!employeeName) return;

    // Check periodically to catch leads entering the 2-hour window
    const checkLeads = () => {
      const now = new Date();
      const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

      const urgent = [];

      leads.forEach(lead => {
        // Skip closed leads
        if (lead.stage === 'Closed Won' || lead.stage === 'Closed Lost') return;
        // Skip leads not assigned to this employee
        if (lead.employee !== employeeName) return;
        // Skip if already dismissed
        if (dismissedLeadIds.has(lead.id)) return;

        const followUps = lead.followUps && lead.followUps.length > 0 
          ? lead.followUps 
          : (lead.notes || lead.date || lead.time 
              ? [{ date: lead.date || '', time: lead.time || '', notes: lead.notes || '' }] 
              : []);
        
        if (followUps.length === 0) return;

        const lastFollowUp = followUps[followUps.length - 1];
        if (lastFollowUp.date) {
          let targetDateStr = lastFollowUp.date;
          if (lastFollowUp.time) {
            targetDateStr += `T${lastFollowUp.time}:00`;
          } else {
            targetDateStr += 'T00:00:00'; 
          }

          const targetDate = new Date(targetDateStr);
          
          if (!isNaN(targetDate.getTime())) {
            // Check if it's within 2 hours or overdue
            if (targetDate <= twoHoursFromNow) {
              urgent.push({
                ...lead,
                targetDate,
                timeRemaining: targetDate.getTime() - now.getTime()
              });
            }
          }
        }
      });

      if (urgent.length > 0) {
        setUrgentLeads(urgent);
        setIsOpen(true);
      }
    };

    // Check immediately
    checkLeads();
    
    // And check every minute
    const intervalId = setInterval(checkLeads, 60000);
    return () => clearInterval(intervalId);

  }, [isLoaded, currentUser, leads, dismissedLeadIds]);

  const handleDismiss = () => {
    setIsOpen(false);
    const newDismissed = new Set(dismissedLeadIds);
    urgentLeads.forEach(l => newDismissed.add(l.id));
    setDismissedLeadIds(newDismissed);
  };

  if (!isOpen || urgentLeads.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="bg-red-600 px-6 py-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 animate-pulse" />
            <h2 className="text-xl font-bold">Urgent Follow-ups</h2>
          </div>
          <button onClick={handleDismiss} className="text-red-100 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
          <p className="text-gray-600 mb-4 font-medium">
            You have {urgentLeads.length} lead{urgentLeads.length > 1 ? 's' : ''} requiring immediate attention (due within 2 hours or overdue).
          </p>
          
          <div className="space-y-3">
            {urgentLeads.map(lead => {
              const isOverdue = lead.timeRemaining < 0;
              return (
                <div key={lead.id} className="border border-red-100 bg-red-50/50 rounded-xl p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-gray-900">{lead.company}</h3>
                      <p className="text-sm text-gray-600">{lead.contactPerson}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${isOverdue ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                      {isOverdue ? 'Overdue' : 'Approaching'}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-gray-800 flex items-center gap-1.5 mt-2">
                    <Clock className="w-4 h-4 text-red-500" />
                    Due: {lead.targetDate.toLocaleString('en-IN')}
                  </div>
                  <button 
                    onClick={() => {
                      handleDismiss();
                      navigate(`/leads?view=my&expand=${encodeURIComponent(lead.stage)}`);
                    }}
                    className="mt-3 w-full py-2 bg-white border border-red-200 text-red-700 font-semibold rounded-lg text-sm flex justify-center items-center gap-1.5 hover:bg-red-50 transition-colors"
                  >
                    View Lead <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button 
            onClick={handleDismiss}
            className="px-6 py-2 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors"
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
}
