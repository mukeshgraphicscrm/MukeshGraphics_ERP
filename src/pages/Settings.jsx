import React, { useState, useEffect } from 'react';
import { UserPlus, Save, Users, Trash2, Eye, EyeOff, Edit, Key, Target } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import CustomSelect from '../components/CustomSelect';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';

export default function Settings() {
  const { currentUser, changePassword } = useAuth();
  const { settings, setSettings } = useData();
  
  // Protect the route
  if (currentUser?.profile?.designation === 'Employee') {
    return <Navigate to="/" replace />;
  }
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
  const [goalSettings, setGoalSettings] = useState({
    year: new Date().getFullYear().toString(),
    salesTarget: ''
  });
  const [goalLoading, setGoalLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    password: '',
    designation: 'Employee'
  });

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
    
    // Load existing goal settings
    if (settings && settings.length > 0) {
      const goals = settings.find(s => s.type === 'goals');
      if (goals) {
        setGoalSettings({
          year: goals.year || new Date().getFullYear().toString(),
          salesTarget: goals.salesTarget || ''
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
    setFormData(prev => ({ ...prev, [name]: value }));
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
      setFormData({
        name: '',
        mobile: '',
        email: '',
        password: '',
        designation: 'Employee'
      });
      setUserToEdit(null);
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
      password: '', // Leave blank when editing
      designation: user.designation || 'Employee'
    });
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
      
      toast.success('Goals updated successfully');
    } catch (err) {
      console.error('Error saving goals:', err);
      toast.error('Failed to save goals');
    } finally {
      setGoalLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-500 mt-1">Manage users and application configurations.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add User Form */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center space-x-2 bg-gray-50/50">
              {userToEdit ? <Edit className="w-5 h-5 text-[#1b2f63]" /> : <UserPlus className="w-5 h-5 text-[#1b2f63]" />}
              <h3 className="font-bold text-gray-900">{userToEdit ? 'Edit User' : 'Add New User'}</h3>
              {userToEdit && (
                <button 
                  onClick={() => {
                    setUserToEdit(null);
                    setFormData({ name: '', mobile: '', email: '', password: '', designation: 'Employee' });
                  }}
                  className="ml-auto text-xs text-blue-600 hover:text-blue-800"
                >
                  Cancel Edit
                </button>
              )}
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors text-sm"
                  placeholder="e.g. John Doe"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number *</label>
                <input
                  type="tel"
                  name="mobile"
                  required
                  value={formData.mobile}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (val.length <= 10) {
                      setFormData(prev => ({ ...prev, mobile: val }));
                    }
                  }}
                  pattern="[0-9]{10}"
                  maxLength="10"
                  minLength="10"
                  title="Mobile number must be exactly 10 digits"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors text-sm"
                  placeholder="e.g. 9876543210"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors text-sm"
                  placeholder="e.g. john@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password {userToEdit ? '' : '*'}</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    required={!userToEdit}
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors text-sm"
                    placeholder={userToEdit ? "Leave blank to keep same" : "Enter a secure password"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Designation *</label>
                <CustomSelect
                  name="designation"
                  required
                  value={formData.designation}
                  onChange={handleChange}
                  options={[
                    { label: 'Employee', value: 'Employee' },
                    { label: 'Manager', value: 'Manager' }
                  ]}
                  placeholder="Select designation"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center space-x-2 bg-[#1b2f63] text-white px-4 py-2.5 rounded-lg hover:bg-[#12224d] transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{loading ? 'Saving...' : userToEdit ? 'Save Changes' : 'Add User'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Change Admin Password Form */}
          {(!currentUser?.profile || currentUser?.profile?.designation === 'Administrator') && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center space-x-2 bg-gray-50/50">
                <Key className="w-5 h-5 text-[#1b2f63]" />
                <h3 className="font-bold text-gray-900">Change Admin Password</h3>
              </div>
              <form onSubmit={handleAdminPasswordChange} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Password *</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors text-sm"
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password *</label>
                  <div className="relative">
                    <input
                      type={showAdminPassword ? "text" : "password"}
                      required
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors text-sm"
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showAdminPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={adminPasswordLoading}
                    className="w-full flex justify-center items-center space-x-2 bg-[#1b2f63] text-white px-4 py-2.5 rounded-lg hover:bg-[#12224d] transition-colors disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{adminPasswordLoading ? 'Updating...' : 'Update Password'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Goals Settings Form */}
          {(!currentUser?.profile || currentUser?.profile?.designation === 'Administrator') && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center space-x-2 bg-gray-50/50">
                <Target className="w-5 h-5 text-[#1b2f63]" />
                <h3 className="font-bold text-gray-900">Goals & Targets</h3>
              </div>
              <form onSubmit={handleSaveGoals} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Year *</label>
                  <input
                    type="number"
                    required
                    min="2020"
                    max="2100"
                    value={goalSettings.year}
                    onChange={(e) => setGoalSettings(prev => ({ ...prev, year: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors text-sm"
                    placeholder="e.g. 2026"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sales Target Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={goalSettings.salesTarget}
                    onChange={(e) => setGoalSettings(prev => ({ ...prev, salesTarget: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors text-sm"
                    placeholder="e.g. 1000000"
                  />
                </div>
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={goalLoading}
                    className="w-full flex justify-center items-center space-x-2 bg-[#1b2f63] text-white px-4 py-2.5 rounded-lg hover:bg-[#12224d] transition-colors disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{goalLoading ? 'Saving...' : 'Save Goals'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Users List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-[#1b2f63]" />
                <h3 className="font-bold text-gray-900">Registered Users</h3>
              </div>
              <span className="bg-[#1b2f63]/10 text-[#1b2f63] text-xs font-bold px-2.5 py-1 rounded-full">
                {users.length} Users
              </span>
            </div>
            
            <div className="flex-1 overflow-auto">
              {users.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No users added yet.
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {users.map(user => (
                    <div key={user.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">
                          {user.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{user.name}</p>
                          <div className="flex items-center space-x-2 text-xs text-gray-500 mt-0.5">
                            <span>{user.email}</span>
                            <span>•</span>
                            <span>{user.mobile}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                          user.designation === 'Manager' 
                            ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                            : 'bg-blue-100 text-blue-700 border border-blue-200'
                        }`}>
                          {user.designation}
                        </span>
                        <div className="flex items-center space-x-1 pl-2">
                          <button
                            onClick={() => handleEditClick(user)}
                            className="text-gray-400 hover:text-blue-600 transition-colors p-1"
                            title="Edit User"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(user.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors p-1"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete User"
        message="Are you sure you want to delete this user? This action cannot be undone."
        isLoading={loading}
      />
    </div>
  );
}
