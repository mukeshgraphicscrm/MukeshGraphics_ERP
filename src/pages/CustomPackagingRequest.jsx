import React, { useState } from 'react';
import { Search, User, MapPin, Building, Calendar, Phone, Mail, Package, FileText, ClipboardList } from 'lucide-react';
import { useData } from '../contexts/DataContext';

export default function CustomPackagingRequest() {
  const { customPackages, isLoaded } = useData();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRequests = (customPackages || []).filter(req => {
    const term = searchTerm.toLowerCase();
    return (
      (req.fullName || '').toLowerCase().includes(term) ||
      (req.company || '').toLowerCase().includes(term) ||
      (req.email || '').toLowerCase().includes(term)
    );
  });

  const renderDate = (dateVal) => {
    if (!dateVal) return 'N/A';
    if (dateVal._seconds !== undefined) {
      return new Date(dateVal._seconds * 1000).toLocaleString();
    }
    if (dateVal.seconds !== undefined) {
      return new Date(dateVal.seconds * 1000).toLocaleString();
    }
    const dateObj = new Date(dateVal);
    return isNaN(dateObj.getTime()) ? 'Invalid Date' : dateObj.toLocaleString();
  };

  const renderSpecValue = (val) => {
    if (typeof val === 'object' && val !== null) {
      if (val.length !== undefined && val.width !== undefined) {
        return `${val.length} x ${val.width} ${val.height ? `x ${val.height}` : ''} ${val.unit || ''}`.trim();
      }
      return Object.entries(val).map(([k, v]) => `${k}: ${v}`).join(', ');
    }
    return String(val);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Customize Packaging Requests</h2>
          <p className="text-sm text-gray-500 mt-1">Manage packaging requests from customers.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search requests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-accent"
            />
          </div>
        </div>
      </div>

      {/* Requests Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {!isLoaded ? (
          <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-xl border border-gray-200 animate-pulse">
            Loading requests...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-xl border border-gray-200">
            No packaging requests found.
          </div>
        ) : (
          filteredRequests.map((req) => (
            <div key={req.id} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow relative group">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{req.fullName || 'Unknown Name'}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> 
                      {renderDate(req.createdAt)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 mb-4">
                <div className="flex items-center text-sm text-gray-600 gap-2">
                  <Building className="w-4 h-4 text-gray-400" /> {req.company || 'N/A'}
                </div>
                <div className="flex items-center text-sm text-gray-600 gap-2">
                  <Mail className="w-4 h-4 text-gray-400" /> 
                  <a href={`mailto:${req.email}`} className="hover:text-brand-accent">{req.email || 'N/A'}</a>
                </div>
                <div className="flex items-center text-sm text-gray-600 gap-2">
                  <Phone className="w-4 h-4 text-gray-400" /> 
                  <a href={`tel:${req.phone}`} className="hover:text-brand-accent">{req.phone || 'N/A'}</a>
                </div>
                <div className="flex items-center text-sm text-gray-600 gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" /> {req.deliveryLocation || 'N/A'}
                </div>
                <div className="flex items-center text-sm text-gray-600 gap-2">
                  <Package className="w-4 h-4 text-gray-400" /> Qty: {req.quantity || 'N/A'}
                </div>
              </div>

              {req.specifications && Object.keys(req.specifications).length > 0 && (
                <div className="mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                    <ClipboardList className="w-4 h-4" /> Specifications
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {Object.entries(req.specifications).map(([key, value]) => (
                      <li key={key}><span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span> {renderSpecValue(value)}</li>
                    ))}
                  </ul>
                </div>
              )}

              {req.notes && (
                <div className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <h4 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1">
                    <FileText className="w-4 h-4" /> Notes
                  </h4>
                  {req.notes}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
