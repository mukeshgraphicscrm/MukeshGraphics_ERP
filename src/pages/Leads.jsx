import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, ChevronDown } from 'lucide-react';
import api from '../lib/api';
import AddLeadModal from '../components/AddLeadModal';
import EditLeadModal from '../components/EditLeadModal';
import ViewLeadModal from '../components/ViewLeadModal';
import LostReasonModal from '../components/LostReasonModal';
const columnsConfig = [
  { id: 'New Inquiry', label: 'New Inquiry', color: 'bg-blue-500' },
  { id: 'Follow Up', label: 'Follow Up', color: 'bg-amber-500' },
  { id: 'Quotation Sent', label: 'Quotation Sent', color: 'bg-brand-navy' },
  { id: 'Won', label: 'Won', color: 'bg-green-500' },
  { id: 'Lost', label: 'Lost', color: 'bg-red-500' },
];

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isLostReasonModalOpen, setIsLostReasonModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [viewingLead, setViewingLead] = useState(null);
  const [pendingLostLead, setPendingLostLead] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLeads = async () => {
    try {
      const res = await api.get('/leads');
      setLeads(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching leads:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();

    const intervalId = setInterval(() => {
      fetchLeads();
    }, 6000);

    return () => clearInterval(intervalId);
  }, []);

  const [expandedStages, setExpandedStages] = useState({
    'New Inquiry': true,
  });
  const [activeDropdownLeadId, setActiveDropdownLeadId] = useState(null);

  useEffect(() => {
    const handleClickOutside = () => setActiveDropdownLeadId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const toggleStage = (stageId) => {
    setExpandedStages(prev => ({
      ...prev,
      [stageId]: !prev[stageId]
    }));
  };

  const handleLeadClick = (lead) => {
    setViewingLead(lead);
    setIsViewModalOpen(true);
  };

  const handleLeadUpdated = (updatedLead) => {
    setLeads(prev => prev.map(lead =>
      lead.id === updatedLead.id ? updatedLead : lead
    ));
  };

  const handleLeadDeleted = (deletedLeadId) => {
    setLeads(prev => prev.filter(lead => lead.id !== deletedLeadId));
  };



  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Lead Pipeline</h2>
          <p className="text-sm text-gray-500 mt-1">Drag and drop leads through the sales pipeline.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 lg:w-96 pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-accent transition-all"
            />
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="btn-add w-full sm:w-auto justify-center"
          >
            <Plus className="w-4 h-4 mr-1" /> <span>Add Lead</span>
          </button>
        </div>
      </div>

      {/* Vertical Accordion List */}
      <div className="flex-1 overflow-y-auto pb-4 px-1 space-y-4">
        {columnsConfig.map(col => {
          const filteredLeads = leads.filter(lead => {
            if (!searchTerm) return true;
            const search = searchTerm.toLowerCase();
            return (
              lead.company?.toLowerCase().includes(search) ||
              lead.contactPerson?.toLowerCase().includes(search) ||
              lead.mobile?.toLowerCase().includes(search) ||
              lead.phone?.toLowerCase().includes(search) ||
              lead.email?.toLowerCase().includes(search) ||
              lead.city?.toLowerCase().includes(search) ||
              lead.state?.toLowerCase().includes(search) ||
              lead.products?.toLowerCase().includes(search) ||
              lead.notes?.toLowerCase().includes(search)
            );
          });
          const columnLeads = filteredLeads.filter(l => l.stage === col.id);
          const isExpanded = expandedStages[col.id];

          return (
            <div key={col.id} className="bg-white rounded-lg border border-gray-200 shadow-sm relative">
              {/* Stage Header */}
              <div
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors rounded-t-lg"
                onClick={() => toggleStage(col.id)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${col.color}`}></div>
                  <h3 className="font-bold text-gray-800 text-base">{col.label}</h3>
                  <span className="bg-[#E8A33D]/10 text-[#E8A33D] px-2.5 py-0.5 rounded-full text-sm font-bold border border-[#E8A33D]/20">
                    {columnLeads.length} Leads
                  </span>
                </div>
                <div className="flex items-center gap-6">
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t border-gray-100 bg-gray-50/50 p-4">
                  {columnLeads.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">No leads in this stage</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {columnLeads.map(lead => (
                        <div
                          key={lead.id}
                          className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:border-[#E8A33D] transition-all cursor-pointer hover:shadow-md"
                          onClick={() => handleLeadClick(lead)}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-gray-900 text-base leading-tight pr-2">{lead.company}</h4>
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDropdownLeadId(activeDropdownLeadId === lead.id ? null : lead.id);
                                }}
                                className="flex items-center gap-1.5 text-xs font-medium border border-gray-200 rounded-md text-gray-700 py-1 pl-2.5 pr-2 bg-gray-50 hover:bg-gray-100 hover:border-gray-300 transition-colors"
                              >
                                {columnsConfig.find(c => c.id === lead.stage)?.label}
                                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                              </button>

                              {activeDropdownLeadId === lead.id && (
                                <div
                                  className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-100 rounded-lg shadow-lg z-50 py-1.5 flex flex-col"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {columnsConfig.map(c => (
                                    <button
                                      key={c.id}
                                      onClick={() => {
                                        const newStage = c.id;
                                        if (newStage === 'Lost') {
                                          setPendingLostLead(lead);
                                          setIsLostReasonModalOpen(true);
                                        } else {
                                          setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, stage: newStage } : l));
                                          api.put(`/leads/${lead.id}`, { stage: newStage }).catch(console.error);
                                        }
                                        setActiveDropdownLeadId(null);
                                      }}
                                      className={`w-full text-left px-3 py-2 text-xs transition-colors ${lead.stage === c.id
                                          ? 'bg-[#E8A33D]/10 text-[#E8A33D] font-bold'
                                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                        }`}
                                    >
                                      {c.label}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-sm text-gray-500 mb-3 flex flex-col gap-1">
                            <span className="flex items-center gap-1.5">
                              <span className="font-medium text-gray-700">{lead.contactPerson}</span>
                              {(lead.city || lead.mobile || lead.phone) && <span className="text-gray-300">•</span>}
                              {lead.city || lead.mobile || lead.phone}
                            </span>
                          </div>

                          {lead.products && (
                            <div className="bg-gray-50 p-2.5 rounded-lg text-xs text-gray-700 border border-gray-100 line-clamp-2 mb-2 font-medium">
                              {lead.products}
                            </div>
                          )}

                          {lead.notes && (
                            <div className="bg-[#FCF9F2] p-2.5 rounded-lg text-xs text-gray-600 border border-[#E8A33D]/10 line-clamp-2">
                              {lead.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <AddLeadModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onLeadAdded={(newLead) => setLeads(prev => [newLead, ...prev])}
      />
      <EditLeadModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingLead(null);
        }}
        onLeadUpdated={handleLeadUpdated}
        onLeadDeleted={handleLeadDeleted}
        lead={editingLead}
      />
      <ViewLeadModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        lead={viewingLead}
        onEditClick={() => {
          setEditingLead(viewingLead);
          setIsEditModalOpen(true);
        }}
      />
      <LostReasonModal
        isOpen={isLostReasonModalOpen}
        onClose={() => {
          setIsLostReasonModalOpen(false);
          setPendingLostLead(null);
        }}
        lead={pendingLostLead}
        onConfirm={(leadId, stage, lostReason) => {
          setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage, lostReason } : l));
        }}
      />
    </div>
  );
}
