import React, { useState, useEffect, useMemo } from 'react';
import {
  UserPlus, Save, Users, Trash2, Eye, EyeOff, Edit, Key, Target, X,
  Settings as SettingsIcon, Shield, BarChart3, ChevronRight, Phone, Mail,
  Building2, Search, TrendingUp, Award
} from 'lucide-react';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import CustomSelect from '../components/CustomSelect';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { createPortal } from 'react-dom';
import useScrollLock from '../hooks/useScrollLock';

const AVAILABLE_MODULES = [
  'Dashboard', 'Leads', 'Customers', 'Products', 'Quotations',
  'Orders', 'Lid Rate', 'Design', 'Job Preparation', 'Production', 'Dispatch', 'Inventory',
  'Purchase', 'Accounts', 'Job Data', 'Tasks', 'Daily Work',
  'Customize Packaging Request', 'Job Inquiry'
];

const DESG_COLORS = [
  { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500', avatar: 'bg-blue-100 text-blue-700', ring: 'ring-blue-200' },
  { bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500', avatar: 'bg-purple-100 text-purple-700', ring: 'ring-purple-200' },
  { bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', avatar: 'bg-emerald-100 text-emerald-700', ring: 'ring-emerald-200' },
  { bg: 'bg-orange-50', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500', avatar: 'bg-orange-100 text-orange-700', ring: 'ring-orange-200' },
  { bg: 'bg-pink-50', border: 'border-pink-200', badge: 'bg-pink-100 text-pink-700', dot: 'bg-pink-500', avatar: 'bg-pink-100 text-pink-700', ring: 'ring-pink-200' },
  { bg: 'bg-cyan-50', border: 'border-cyan-200', badge: 'bg-cyan-100 text-cyan-700', dot: 'bg-cyan-500', avatar: 'bg-cyan-100 text-cyan-700', ring: 'ring-cyan-200' },
  { bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500', avatar: 'bg-amber-100 text-amber-700', ring: 'ring-amber-200' },
];

const TABS = [
  { id: 'users', label: 'Team & Users', icon: Users },
  { id: 'goals', label: 'Goals & Targets', icon: Target },
  { id: 'security', label: 'Security', icon: Shield },
];

export default function Settings() {
  const { currentUser, changePassword } = useAuth();
  const { settings, setSettings, setDashboardData } = useData();

  // Protect the route
  if (currentUser?.profile?.designation?.toUpperCase() === 'EMPLOYEE') {
    return <Navigate to="/" replace />;
  }

  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminPasswordLoading, setAdminPasswordLoading] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [userToEdit, setUserToEdit] = useState(null);
  const [userSearch, setUserSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [goalSettings, setGoalSettings] = useState({
    year: new Date().getFullYear().toString(),
    salesTarget: '',
    profitMargin: '15'
  });
  const [goalLoading, setGoalLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    password: '',
    designation: 'EMPLOYEE',
    accessibleModules: []
  });

  const [customDesignations, setCustomDesignations] = useState([]);
  const [designationModalOpen, setDesignationModalOpen] = useState(false);
  const [designationInput, setDesignationInput] = useState('');
  const [editingOldDesignation, setEditingOldDesignation] = useState(null);
  const [designationToDelete, setDesignationToDelete] = useState(null);

  useScrollLock(designationModalOpen || isFormOpen);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (designationModalOpen) setDesignationModalOpen(false);
        if (isFormOpen) { setIsFormOpen(false); setUserToEdit(null); }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [designationModalOpen, isFormOpen]);

  const designationOptions = useMemo(() => {
    const existing = users.map(u => u.designation).filter(Boolean).map(d => d.toUpperCase());
    const allUnique = Array.from(new Set(['EMPLOYEE', ...existing, ...customDesignations.map(d => d.toUpperCase())]));
    const options = allUnique
      .filter(d => d !== 'ADMINISTRATOR')
      .map(d => ({
        label: d,
        value: d,
        actions: d !== 'EMPLOYEE' ? (closeDropdown) => (
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault(); e.stopPropagation();
                if (closeDropdown) closeDropdown();
                setEditingOldDesignation(d);
                setDesignationInput(d);
                setDesignationModalOpen(true);
              }}
              className="p-1 text-gray-400 hover:bg-gray-200 hover:text-blue-600 rounded transition-colors"
              title="Edit"
            >
              <Edit className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault(); e.stopPropagation();
                if (closeDropdown) closeDropdown();
                setDesignationToDelete(d);
              }}
              className="p-1 text-gray-400 hover:bg-gray-200 hover:text-red-600 rounded transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ) : null
      }));
    options.push({ label: '+ Add New Designation', value: 'ADD_NEW', className: 'text-brand-accent font-bold bg-brand-primary/5' });
    return options;
  }, [users, customDesignations, formData.designation]);

  // Designation-wise grouping
  const designationGroups = useMemo(() => {
    const grouped = {};
    users.forEach(u => {
      const desg = (u.designation || 'Unassigned').toUpperCase();
      if (!grouped[desg]) grouped[desg] = [];
      grouped[desg].push(u);
    });
    return Object.entries(grouped).sort((a, b) => b[1].length - a[1].length);
  }, [users]);

  // Filtered users for list view
  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users;
    const q = userSearch.toLowerCase();
    return users.filter(u =>
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.designation?.toLowerCase().includes(q)
    );
  }, [users, userSearch]);

  const handleAdminPasswordChange = async (e) => {
    e.preventDefault();
    if (!currentPassword) return toast.error('Current password is required');
    if (!adminPassword) return toast.error('New password is required');
    if (currentPassword === adminPassword) return toast.error('New password cannot be the same as the current password');
    setAdminPasswordLoading(true);
    try {
      await changePassword(currentPassword, adminPassword);
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setAdminPassword('');
    } catch (err) {
      console.error('Error changing password:', err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        toast.error('Incorrect current password.');
      } else if (err.code === 'auth/requires-recent-login') {
        toast.error('Please log out and log in again to change password.');
      } else {
        toast.error('Failed to change password');
      }
    } finally {
      setAdminPasswordLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    if (settings && settings.length > 0) {
      const goals = settings.find(s => s.type === 'goals');
      if (goals) {
        setGoalSettings({
          year: goals.year || new Date().getFullYear().toString(),
          salesTarget: goals.salesTarget || '',
          profitMargin: goals.profitMargin || '15'
        });
      }
    }
  }, [settings]);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'designation' && value === 'ADD_NEW') {
      setDesignationInput('');
      setEditingOldDesignation(null);
      setDesignationModalOpen(true);
      return;
    }
    
    let finalValue = value;
    if (name !== 'password' && name !== 'email') {
      finalValue = value.toUpperCase();
    }

    setFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (userToEdit) {
        await api.put(`/users/${userToEdit.id}`, formData);
        toast.success('User updated successfully');
      } else {
        await api.post('/users', formData);
        toast.success('User added successfully');
      }
      setFormData({ name: '', mobile: '', email: '', password: '', designation: 'Employee', accessibleModules: [] });
      setUserToEdit(null);
      setIsFormOpen(false);
      fetchUsers();
    } catch (err) {
      console.error('Error saving user:', err);
      toast.error(userToEdit ? 'Failed to update user' : 'Failed to add user');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (user) => {
    setUserToEdit(user);
    setFormData({
      name: user.name || '',
      mobile: user.mobile || '',
      email: user.email || '',
      password: '',
      designation: user.designation ? user.designation.toUpperCase() : 'EMPLOYEE',
      accessibleModules: user.accessibleModules || []
    });
    setIsFormOpen(true);
  };

  const handleDeleteClick = (id) => {
    setUserToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    setLoading(true);
    try {
      await api.delete(`/users/${userToDelete}`);
      toast.success('User deleted');
      fetchUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
      toast.error('Failed to delete user');
    } finally {
      setLoading(false);
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
    }
  };

  const handleSaveGoals = async (e) => {
    e.preventDefault();
    setGoalLoading(true);
    try {
      const existingGoals = settings.find(s => s.type === 'goals');
      const payload = { type: 'goals', ...goalSettings };
      let res;
      if (existingGoals && existingGoals.id) {
        res = await api.put(`/settings/${existingGoals.id}`, payload);
        setSettings(prev => prev.map(s => s.id === res.data.id ? res.data : s));
      } else {
        res = await api.post('/settings', payload);
        setSettings(prev => [...prev, res.data]);
      }
      
      try {
        const dashRes = await api.get('/dashboard/kpi');
        if (setDashboardData) setDashboardData(dashRes.data);
      } catch (err) {
        console.error('Error refetching dashboard data:', err);
      }

      toast.success('Goals updated successfully');
    } catch (err) {
      console.error('Error saving goals:', err);
      toast.error('Failed to save goals');
    } finally {
      setGoalLoading(false);
    }
  };

  const isAdmin = !currentUser?.profile || currentUser?.profile?.designation?.toUpperCase() === 'ADMINISTRATOR';

  return (
    <div className="space-y-0 pb-12">
      {/* ── Page Header ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1b2f63] via-[#1e3575] to-[#12224d] mb-8 p-8 shadow-xl">
        {/* Decorative circles */}
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-12 -left-6 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute top-4 right-32 w-16 h-16 rounded-full bg-white/5 pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm">
                <SettingsIcon className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
            </div>
            <p className="text-blue-200/80 text-sm">Manage your team, goals & application configuration</p>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{users.length}</div>
              <div className="text-[11px] text-blue-200/70 uppercase tracking-wider font-medium">Total Users</div>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{designationGroups.length}</div>
              <div className="text-[11px] text-blue-200/70 uppercase tracking-wider font-medium">Designations</div>
            </div>
          </div>
        </div>

        {/* Tab bar inside header */}
        <div className="relative z-10 mt-6 flex gap-1 bg-white/10 backdrop-blur-sm rounded-xl p-1 w-fit">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  active
                    ? 'bg-white text-[#1b2f63] shadow-md'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab: Team & Users ── */}
      {activeTab === 'users' && (
        <div className="space-y-8">
          {/* Designation-wise Cards */}
          {designationGroups.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Team by Designation</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {users.length} registered users across {designationGroups.length} designation{designationGroups.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="hidden sm:flex flex-wrap gap-2">
                  {designationGroups.map(([desg, members], i) => {
                    const c = DESG_COLORS[i % DESG_COLORS.length];
                    return (
                      <span key={desg} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${c.badge} border ${c.border}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                        {desg} · {members.length}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {designationGroups.map(([desg, members], i) => {
                  const c = DESG_COLORS[i % DESG_COLORS.length];
                  return (
                    <div key={desg} className={`rounded-2xl border ${c.border} ${c.bg} overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 group`}>
                      {/* Card Header */}
                      <div className={`px-4 py-3.5 flex items-center justify-between border-b ${c.border} bg-white/40`}>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${c.dot}`} />
                          <h3 className="font-bold text-gray-800 text-sm truncate">{desg}</h3>
                        </div>
                        <span className={`ml-2 flex-shrink-0 text-xs font-bold px-2.5 py-0.5 rounded-full ${c.badge}`}>
                          {members.length} {members.length === 1 ? 'user' : 'users'}
                        </span>
                      </div>
                      {/* User List */}
                      <div className="p-3 space-y-2 max-h-56 overflow-y-auto">
                        {members.map(u => (
                          <div
                            key={u._id || u.email}
                            className="flex items-center gap-3 bg-white/70 hover:bg-white/90 rounded-xl px-3 py-2.5 border border-white/80 transition-colors cursor-pointer group/user"
                            onClick={() => handleEditClick(u)}
                            title="Click to edit"
                          >
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${c.avatar} ring-2 ${c.ring}`}>
                              {(u.name || '?').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-gray-800 truncate leading-tight">{u.name}</p>
                              <p className="text-[11px] text-gray-500 truncate leading-tight">{u.email}</p>
                            </div>
                            <Edit className="w-3.5 h-3.5 text-gray-300 group-hover/user:text-gray-500 flex-shrink-0 transition-colors" />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Registered Users List */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* List Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/60">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#1b2f63]" />
                <h3 className="font-bold text-gray-900">Registered Users</h3>
                <span className="bg-[#1b2f63]/10 text-[#1b2f63] text-xs font-bold px-2.5 py-0.5 rounded-full ml-1">
                  {users.length}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1b2f63]/20 focus:border-[#1b2f63] transition-colors w-52"
                  />
                </div>
                {/* Add user button */}
                <button
                  onClick={() => {
                    setUserToEdit(null);
                    setFormData({ name: '', mobile: '', email: '', password: '', designation: 'EMPLOYEE', accessibleModules: [] });
                    setIsFormOpen(true);
                  }}
                  className="flex items-center gap-2 bg-[#1b2f63] hover:bg-[#12224d] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  Add User
                </button>
              </div>
            </div>

            {/* List Body */}
            <div className="divide-y divide-gray-100">
              {filteredUsers.length === 0 ? (
                <div className="py-16 text-center">
                  <Users className="w-12 h-12 mx-auto text-gray-200 mb-3" />
                  <p className="text-gray-400 font-medium">
                    {userSearch ? 'No users match your search' : 'No users added yet'}
                  </p>
                  {!userSearch && (
                    <button
                      onClick={() => { setIsFormOpen(true); }}
                      className="mt-3 text-sm text-[#1b2f63] font-semibold hover:underline"
                    >
                      Add your first user →
                    </button>
                  )}
                </div>
              ) : (
                filteredUsers.map((user, idx) => {
                  const desgIdx = designationGroups.findIndex(([d]) => d === (user.designation || 'Unassigned').toUpperCase());
                  const c = DESG_COLORS[desgIdx >= 0 ? desgIdx % DESG_COLORS.length : 0];
                  return (
                    <div key={user.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/80 transition-colors group">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${c.avatar} ring-2 ${c.ring}`}>
                          {user.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 text-sm truncate">{user.name}</p>
                          <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Mail className="w-3 h-3" />{user.email}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Phone className="w-3 h-3" />{user.mobile}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                        <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider border ${c.badge} ${c.border}`}>
                          {user.designation}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEditClick(user)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit User"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(user.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Goals & Targets ── */}
      {activeTab === 'goals' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Goals Form */}
          {isAdmin && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3 bg-gradient-to-r from-gray-50 to-white">
                <div className="p-2 bg-[#1b2f63]/10 rounded-xl">
                  <Target className="w-5 h-5 text-[#1b2f63]" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Goals & Targets</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Set your annual sales targets</p>
                </div>
              </div>
              <form onSubmit={handleSaveGoals} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Target Year *</label>
                  <input
                    type="number"
                    required
                    min="2020"
                    max="2100"
                    value={goalSettings.year}
                    onChange={(e) => setGoalSettings(prev => ({ ...prev, year: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1b2f63]/20 focus:border-[#1b2f63] transition-colors text-sm bg-gray-50/50"
                    placeholder="e.g. 2026"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Sales Target Amount (₹) *</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-sm">₹</span>
                    <input
                      type="text"
                      required
                      value={goalSettings.salesTarget ? Number(goalSettings.salesTarget).toLocaleString('en-IN') : ''}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setGoalSettings(prev => ({ ...prev, salesTarget: val }));
                      }}
                      className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1b2f63]/20 focus:border-[#1b2f63] transition-colors text-sm bg-gray-50/50"
                      placeholder="e.g. 1,00,00,000"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Estimated Profit Margin (%) *</label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min="0"
                      max="100"
                      step="0.1"
                      value={goalSettings.profitMargin}
                      onChange={(e) => setGoalSettings(prev => ({ ...prev, profitMargin: e.target.value }))}
                      className="w-full px-4 pr-10 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1b2f63]/20 focus:border-[#1b2f63] transition-colors text-sm bg-gray-50/50"
                      placeholder="e.g. 15"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-sm">%</span>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={goalLoading}
                  className="w-full flex justify-center items-center gap-2 bg-[#1b2f63] hover:bg-[#12224d] text-white px-4 py-2.5 rounded-xl font-semibold transition-colors disabled:opacity-50 shadow-sm mt-2"
                >
                  <Save className="w-4 h-4" />
                  {goalLoading ? 'Saving...' : 'Save Goals'}
                </button>
              </form>
            </div>
          )}

          {/* Goals Preview Card */}
          {goalSettings.salesTarget && (
            <div className="bg-gradient-to-br from-[#1b2f63] to-[#12224d] rounded-2xl shadow-xl p-7 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-5 opacity-10">
                <Target className="w-28 h-28" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-6">
                  <div className="p-2 bg-white/10 rounded-xl">
                    <Target className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold">{goalSettings.year} Targets Preview</h3>
                </div>
                <div className="space-y-4">
                  <div className="bg-white/10 rounded-xl p-4">
                    <p className="text-blue-200/70 text-xs font-semibold uppercase tracking-wider mb-1">Sales Target</p>
                    <p className="text-3xl font-bold">₹{Number(goalSettings.salesTarget).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/10 rounded-xl p-4">
                      <p className="text-blue-200/70 text-xs font-semibold uppercase tracking-wider mb-1">Profit Margin</p>
                      <p className="text-2xl font-bold">{goalSettings.profitMargin}%</p>
                    </div>
                    <div className="bg-white/10 rounded-xl p-4">
                      <p className="text-blue-200/70 text-xs font-semibold uppercase tracking-wider mb-1">Est. Profit</p>
                      <p className="text-2xl font-bold">₹{Math.round(Number(goalSettings.salesTarget) * Number(goalSettings.profitMargin) / 100).toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Security ── */}
      {activeTab === 'security' && (
        <div className="max-w-lg">
          {isAdmin ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3 bg-gradient-to-r from-gray-50 to-white">
                <div className="p-2 bg-red-50 rounded-xl">
                  <Key className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Change Admin Password</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Update your administrator password</p>
                </div>
              </div>
              <form onSubmit={handleAdminPasswordChange} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Current Password *</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full pl-4 pr-10 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1b2f63]/20 focus:border-[#1b2f63] transition-colors text-sm bg-gray-50/50"
                      placeholder="Enter current password"
                    />
                    <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">New Password *</label>
                  <div className="relative">
                    <input
                      type={showAdminPassword ? 'text' : 'password'}
                      required
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full pl-4 pr-10 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1b2f63]/20 focus:border-[#1b2f63] transition-colors text-sm bg-gray-50/50"
                      placeholder="Enter new password"
                    />
                    <button type="button" onClick={() => setShowAdminPassword(!showAdminPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                      {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-center">
                  <p className="text-xs text-amber-700 font-medium">⚠️ Make sure to remember your new password. You will be required to use it on your next login.</p>
                </div>
                <button
                  type="submit"
                  disabled={adminPasswordLoading}
                  className="w-full flex justify-center items-center gap-2 bg-[#1b2f63] hover:bg-[#12224d] text-white px-4 py-2.5 rounded-xl font-semibold transition-colors disabled:opacity-50 shadow-sm"
                >
                  <Key className="w-4 h-4" />
                  {adminPasswordLoading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>
          ) : (
            <div className="py-16 text-center bg-white rounded-2xl border border-gray-200">
              <Shield className="w-12 h-12 mx-auto text-gray-200 mb-3" />
              <p className="text-gray-400">Security settings are only available for administrators.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Add / Edit User Modal ── */}
      {isFormOpen && createPortal(
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) { setIsFormOpen(false); setUserToEdit(null); }
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[95vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#1b2f63]/10 rounded-xl">
                  {userToEdit ? <Edit className="w-5 h-5 text-[#1b2f63]" /> : <UserPlus className="w-5 h-5 text-[#1b2f63]" />}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{userToEdit ? 'Edit User' : 'Add New User'}</h3>
                  <p className="text-xs text-gray-500">{userToEdit ? `Editing ${userToEdit.name}` : 'Fill in user details below'}</p>
                </div>
              </div>
              <button
                onClick={() => { setIsFormOpen(false); setUserToEdit(null); }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Name *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1b2f63]/20 focus:border-[#1b2f63] transition-colors text-sm bg-gray-50/50"
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mobile *</label>
                  <input
                    type="tel"
                    name="mobile"
                    required
                    value={formData.mobile}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      if (val.length <= 10) setFormData(prev => ({ ...prev, mobile: val }));
                    }}
                    pattern="[0-9]{10}"
                    maxLength="10"
                    minLength="10"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1b2f63]/20 focus:border-[#1b2f63] transition-colors text-sm bg-gray-50/50"
                    placeholder="9876543210"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Designation *</label>
                  <CustomSelect
                    name="designation"
                    required
                    value={formData.designation}
                    onChange={handleChange}
                    options={designationOptions}
                    placeholder="Select designation"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address *</label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    style={{ textTransform: 'none' }}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1b2f63]/20 focus:border-[#1b2f63] transition-colors text-sm bg-gray-50/50 normal-case"
                    placeholder="e.g. john@example.com"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Password {userToEdit ? <span className="text-gray-400 font-normal">(leave blank to keep unchanged)</span> : '*'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      required={!userToEdit}
                      value={formData.password}
                      onChange={handleChange}
                      style={{ textTransform: 'none' }}
                      className="w-full pl-4 pr-10 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1b2f63]/20 focus:border-[#1b2f63] transition-colors text-sm bg-gray-50/50 normal-case"
                      placeholder={userToEdit ? 'Leave blank to keep same' : 'Enter a secure password'}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {formData.designation !== 'ADMINISTRATOR' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Module Access</label>
                  <div className="bg-gray-50 rounded-xl border border-gray-200 p-3 max-h-52 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-1">
                      {AVAILABLE_MODULES.map(mod => (
                        <label key={mod} className="flex items-center gap-2.5 cursor-pointer p-2 hover:bg-white rounded-lg transition-colors group">
                          <input
                            type="checkbox"
                            checked={formData.accessibleModules?.includes(mod) || false}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData(prev => ({ ...prev, accessibleModules: [...(prev.accessibleModules || []), mod] }));
                              } else {
                                setFormData(prev => ({ ...prev, accessibleModules: (prev.accessibleModules || []).filter(m => m !== mod) }));
                              }
                            }}
                            className="w-4 h-4 text-[#1b2f63] rounded border-gray-300 focus:ring-[#1b2f63]"
                          />
                          <span className="text-xs text-gray-700 font-medium group-hover:text-gray-900">{mod}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsFormOpen(false); setUserToEdit(null); }}
                  className="flex-1 py-2.5 text-gray-700 font-semibold hover:bg-gray-50 rounded-xl transition-colors border border-gray-200 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex justify-center items-center gap-2 bg-[#1b2f63] hover:bg-[#12224d] text-white py-2.5 rounded-xl font-semibold transition-colors disabled:opacity-50 shadow-sm text-sm"
                >
                  <Save className="w-4 h-4" />
                  {loading ? 'Saving...' : userToEdit ? 'Save Changes' : 'Add User'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => { setIsDeleteModalOpen(false); setUserToDelete(null); }}
        onConfirm={confirmDelete}
        title="Delete User"
        message="Are you sure you want to delete this user? This action cannot be undone."
        isLoading={loading}
      />
      <ConfirmDeleteModal
        isOpen={!!designationToDelete}
        onClose={() => setDesignationToDelete(null)}
        onConfirm={() => {
          if (!designationToDelete) return;
          const d = designationToDelete.toUpperCase();
          setCustomDesignations(prev => prev.filter(x => x !== d));
          if (formData.designation.toUpperCase() === d) {
            setFormData(prev => ({ ...prev, designation: 'EMPLOYEE' }));
          }
          toast.success(`Designation "${d}" deleted`);
          setDesignationToDelete(null);
        }}
        title="Delete Designation"
        message={`Are you sure you want to delete designation "${designationToDelete}"?`}
        isLoading={false}
      />

      {designationModalOpen && createPortal(
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setDesignationModalOpen(false); }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
              <h3 className="font-bold text-gray-900">{editingOldDesignation ? 'Edit Designation' : 'Add New Designation'}</h3>
              <button onClick={() => setDesignationModalOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!designationInput.trim()) return;
              const trimmed = designationInput.trim().toUpperCase();
              if (editingOldDesignation) {
                setCustomDesignations(prev => prev.map(d => d === editingOldDesignation ? trimmed : d));
                if (formData.designation === editingOldDesignation) setFormData(prev => ({ ...prev, designation: trimmed }));
                toast.success('Designation updated successfully');
              } else {
                setCustomDesignations(prev => Array.from(new Set([...prev, trimmed])));
                setFormData(prev => ({ ...prev, designation: trimmed }));
                toast.success('Designation added successfully');
              }
              setDesignationModalOpen(false);
            }} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Designation Name *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={designationInput}
                  onChange={e => setDesignationInput(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1b2f63]/20 focus:border-[#1b2f63] transition-colors text-sm bg-gray-50/50"
                  placeholder="e.g. MANAGER"
                />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setDesignationModalOpen(false)} className="flex-1 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-xl border border-gray-200 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 text-sm font-semibold text-white bg-[#1b2f63] hover:bg-[#12224d] rounded-xl transition-colors shadow-sm">Save</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
