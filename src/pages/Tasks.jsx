import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Edit, Trash2, CheckSquare, Clock, CheckCircle } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import CustomSelect from '../components/CustomSelect';

export default function Tasks() {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.profile?.designation === 'Administrator';

  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedTo: '',
    priority: 'Medium',
    status: 'Pending',
    dueDate: ''
  });
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTasks();
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchTasks = async () => {
    try {
      const res = await api.get('/tasks');
      let fetchedTasks = res.data;
      if (!isAdmin) {
        fetchedTasks = fetchedTasks.filter(t => 
          t.assignedTo === currentUser?.profile?.name || 
          t.assignedToEmail === currentUser?.email
        );
      }
      // Sort tasks by date, newest first
      fetchedTasks.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setTasks(fetchedTasks);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const handleOpenModal = (task = null) => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        assignedTo: task.assignedTo || '',
        priority: task.priority || 'Medium',
        status: task.status || 'Pending',
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''
      });
      setEditingId(task.id);
    } else {
      setFormData({
        title: '',
        description: '',
        assignedTo: '',
        priority: 'Medium',
        status: 'Pending',
        dueDate: ''
      });
      setEditingId(null);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const payload = {
        ...formData,
        assignedBy: currentUser?.profile?.name || 'Admin'
      };

      if (editingId) {
        await api.put(`/tasks/${editingId}`, payload);
        toast.success('Task updated successfully');
      } else {
        await api.post('/tasks', payload);
        toast.success('Task created successfully');
      }
      setIsModalOpen(false);
      fetchTasks();
    } catch (err) {
      console.error('Error saving task:', err);
      toast.error('Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!taskToDelete) return;
    try {
      await api.delete(`/tasks/${taskToDelete}`);
      toast.success('Task deleted');
      fetchTasks();
    } catch (err) {
      console.error('Error deleting task:', err);
      toast.error('Failed to delete task');
    } finally {
      setIsDeleteModalOpen(false);
      setTaskToDelete(null);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await api.put(`/tasks/${taskId}`, { status: newStatus });
      toast.success('Status updated');
      fetchTasks();
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Failed to update status');
    }
  };

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = (t.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (t.assignedTo || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch(status) {
      case 'Completed': return 'bg-green-100 text-green-700';
      case 'In Progress': return 'bg-blue-100 text-blue-700';
      case 'Pending': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };
  
  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'High': return 'text-red-600 bg-red-50 ring-red-500/20';
      case 'Medium': return 'text-yellow-600 bg-yellow-50 ring-yellow-500/20';
      case 'Low': return 'text-green-600 bg-green-50 ring-green-500/20';
      default: return 'text-gray-600 bg-gray-50 ring-gray-500/20';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-[#1b2f63]/10 rounded-lg">
              <CheckSquare className="w-6 h-6 text-[#1b2f63]" />
            </div>
            {isAdmin ? 'Assign Task' : 'Assigned Tasks'}
          </h1>
          <p className="text-gray-500 mt-1">
            {isAdmin ? 'Manage and assign tasks to your team.' : 'View and update tasks assigned to you.'}
          </p>
        </div>
        
        {isAdmin && (
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center space-x-2 bg-[#1b2f63] text-white px-4 py-2.5 rounded-xl hover:bg-[#12224d] transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span>Create Task</span>
          </button>
        )}
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1b2f63]/50 focus:border-[#1b2f63] transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1b2f63]/50 focus:border-[#1b2f63] transition-colors bg-white min-w-[150px]"
          >
            <option value="All">All Status</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Tasks List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-gray-500 flex flex-col items-center">
            <div className="w-8 h-8 border-4 border-[#1b2f63] border-t-transparent rounded-full animate-spin mb-4" />
            Loading tasks...
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-xl border border-gray-100 border-dashed">
            <CheckSquare className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-lg font-medium text-gray-900">No tasks found</p>
            <p className="text-sm mt-1">
              {isAdmin ? "Create a new task to get started." : "You're all caught up! No tasks assigned to you right now."}
            </p>
          </div>
        ) : (
          filteredTasks.map(task => (
            <div key={task.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <span className={`px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wider ${getStatusColor(task.status)}`}>
                  {task.status}
                </span>
                {isAdmin && (
                  <div className="flex space-x-1">
                    <button onClick={() => handleOpenModal(task)} className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors bg-gray-50 hover:bg-blue-50 rounded-lg">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => { setTaskToDelete(task.id); setIsDeleteModalOpen(true); }} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors bg-gray-50 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              
              <h3 className="font-bold text-gray-900 text-lg mb-2">{task.title}</h3>
              <p className="text-sm text-gray-600 line-clamp-2 mb-4 flex-1">
                {task.description}
              </p>
              
              <div className="space-y-2 mt-auto pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Priority:</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ring-1 ring-inset ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                </div>
                {isAdmin && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Assigned To:</span>
                    <span className="font-medium text-gray-900">{task.assignedTo || 'Unassigned'}</span>
                  </div>
                )}
                {!isAdmin && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Assigned By:</span>
                    <span className="font-medium text-gray-900">{task.assignedBy || 'Admin'}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Due Date:</span>
                  <span className="font-medium text-gray-900">
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No date'}
                  </span>
                </div>
              </div>

              {!isAdmin && (
                <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
                  <button 
                    onClick={() => handleStatusChange(task.id, 'In Progress')}
                    disabled={task.status === 'In Progress' || task.status === 'Completed'}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg flex justify-center items-center gap-1.5 transition-colors ${task.status === 'In Progress' || task.status === 'Completed' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'}`}
                  >
                    <Clock className="w-3.5 h-3.5" /> Start
                  </button>
                  <button 
                    onClick={() => handleStatusChange(task.id, 'Completed')}
                    disabled={task.status === 'Completed'}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg flex justify-center items-center gap-1.5 transition-colors ${task.status === 'Completed' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-200'}`}
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Complete
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Task Modal (Admin Only) */}
      {isModalOpen && isAdmin && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all relative z-[70]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold text-gray-900">{editingId ? 'Edit Task' : 'Create Task'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1b2f63]/50 focus:border-[#1b2f63]"
                  placeholder="Task title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1b2f63]/50 focus:border-[#1b2f63] resize-none"
                  placeholder="Provide task details..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assign To *</label>
                  <CustomSelect
                    options={users.map(u => ({ label: u.name, value: u.name }))}
                    value={formData.assignedTo}
                    onChange={(e) => setFormData({...formData, assignedTo: e.target.value})}
                    placeholder="Select User"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <CustomSelect
                    options={[
                      { label: 'High', value: 'High' },
                      { label: 'Medium', value: 'Medium' },
                      { label: 'Low', value: 'Low' },
                    ]}
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1b2f63]/50 focus:border-[#1b2f63] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <CustomSelect
                    options={[
                      { label: 'Pending', value: 'Pending' },
                      { label: 'In Progress', value: 'In Progress' },
                      { label: 'Completed', value: 'Completed' },
                    ]}
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-50 rounded-lg transition-colors border border-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-[#1b2f63] text-white font-medium rounded-lg hover:bg-[#12224d] transition-colors disabled:opacity-50 shadow-sm"
                >
                  {saving ? 'Saving...' : (editingId ? 'Update Task' : 'Create Task')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
      />
    </div>
  );
}
