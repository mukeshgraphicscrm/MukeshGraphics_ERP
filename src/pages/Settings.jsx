import React, { useState, useEffect } from 'react';
import { UserPlus, Save, Users, Trash2, Eye, EyeOff, Edit } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import { useAuth } from '../contexts/AuthContext';

export default function Settings() {
  const { currentUser } = useAuth();
  
  // Protect the route
  if (currentUser?.profile?.designation === 'Employee') {
    return <Navigate to="/" replace />;
  }
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [userToEdit, setUserToEdit] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    password: '',
    designation: 'Employee'
  });

  useEffect(() => {
    fetchUsers();
  }, []);

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-500 mt-1">Manage users and application configurations.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add User Form */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full">
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
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors text-sm"
                  placeholder="e.g. +91 9876543210"
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
                <div className="relative">
                  <select
                    name="designation"
                    required
                    value={formData.designation}
                    onChange={handleChange}
                    className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors text-sm appearance-none bg-white"
                  >
                    <option value="Employee">Employee</option>
                    <option value="Manager">Manager</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
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
