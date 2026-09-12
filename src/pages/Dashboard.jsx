import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  ShoppingCart, Factory, CheckCircle, Truck, Wallet, IndianRupee, 
  TrendingUp, Activity, Target, CalendarDays, TrendingUp as TrendingUpIcon,
  Clock, CheckSquare, Plus
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar
} from 'recharts';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';
import KpiCard from '../components/KpiCard';
import CustomSelect from '../components/CustomSelect';
import api from '../lib/api';
import { cn } from '../lib/utils';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  const { 
    dashboardData: data, settings, orders, 
    productionJobs, leads, productMap, customerMap 
  } = useData();
  const { currentUser } = useAuth();
  const isEmployee = currentUser?.profile?.designation === 'Employee';
  const employeeName = currentUser?.profile?.name || '';

  const [tasks, setTasks] = useState([]);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskFormData, setTaskFormData] = useState({
    title: '',
    description: '',
    assignedTo: employeeName,
    priority: 'Medium',
    status: 'Pending',
    dueDate: ''
  });
  const [taskSaving, setTaskSaving] = useState(false);
  const [realtimeOrders, setRealtimeOrders] = useState([]);
  const [realtimeJobs, setRealtimeJobs] = useState([]);
  const [realtimeLeads, setRealtimeLeads] = useState([]);

  useEffect(() => {
    if (!isEmployee || !employeeName) return;
    
    // Realtime Tasks
    const qTasks = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));
    const unsubTasks = onSnapshot(qTasks, (snapshot) => {
      let fetchedTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTasks(fetchedTasks.filter(t => t.assignedTo === employeeName || t.assignedToEmail === currentUser?.email));
    }, (error) => console.error('Error fetching tasks:', error));

    // Realtime Orders
    const qOrders = query(collection(db, 'orders'), where('employee', '==', employeeName));
    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRealtimeOrders(fetched.filter(o => o.status !== 'Completed' && o.status !== 'Cancelled'));
    }, (error) => console.error('Error fetching orders:', error));

    // Realtime Jobs
    const qJobs = query(collection(db, 'productionJobs'), where('employee', '==', employeeName));
    const unsubJobs = onSnapshot(qJobs, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRealtimeJobs(fetched.filter(j => j.status !== 'Completed' && j.status !== 'Cancelled'));
    }, (error) => console.error('Error fetching jobs:', error));

    // Realtime Leads
    const qLeads = query(collection(db, 'leads'), where('employee', '==', employeeName));
    const unsubLeads = onSnapshot(qLeads, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRealtimeLeads(fetched.filter(l => l.stage !== 'Closed Won' && l.stage !== 'Closed Lost'));
    }, (error) => console.error('Error fetching leads:', error));

    return () => {
      unsubTasks();
      unsubOrders();
      unsubJobs();
      unsubLeads();
    };
  }, [isEmployee, employeeName, currentUser?.email]);

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape' && isTaskModalOpen) {
        setIsTaskModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isTaskModalOpen]);

  const handleOpenTaskModal = () => {
    setTaskFormData({
      title: '',
      description: '',
      assignedTo: employeeName,
      priority: 'Medium',
      status: 'Pending',
      dueDate: ''
    });
    setIsTaskModalOpen(true);
  };

  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    setTaskSaving(true);
    
    try {
      const payload = {
        ...taskFormData,
        assignedBy: currentUser?.profile?.name || 'Self'
      };

      await api.post('/tasks', payload);
      toast.success('Task created successfully');
      setIsTaskModalOpen(false);
    } catch (err) {
      console.error('Error saving task:', err);
      toast.error('Failed to create task');
    } finally {
      setTaskSaving(false);
    }
  };

  const handleTaskStatusChange = async (taskId, newStatus) => {
    try {
      await api.put(`/tasks/${taskId}`, { status: newStatus });
      toast.success('Task status updated');
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Failed to update status');
    }
  };

  const myOrders = realtimeOrders;
  const myJobs = realtimeJobs;
  const myLeads = realtimeLeads;
  
  const pendingTasks = tasks.filter(t => t.status !== 'Completed');

  const isApproachingDeadline = (dateString) => {
    if (!dateString) return false;
    const target = new Date(dateString);
    const today = new Date();
    const diffTime = target - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 5;
  };
  
  const isOverdue = (dateString) => {
    if (!dateString) return false;
    const target = new Date(dateString);
    const today = new Date();
    today.setHours(0,0,0,0);
    target.setHours(0,0,0,0);
    return target < today;
  };

  const getRemainingDaysText = (dateString) => {
    if (!dateString) return '';
    const target = new Date(dateString);
    const today = new Date();
    today.setHours(0,0,0,0);
    target.setHours(0,0,0,0);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    return `${diffDays} days left`;
  };

  const getLeadDate = (lead) => {
    if (lead.followUps && lead.followUps.length > 0) {
      // Find the most recently added follow-up that has a date
      const followUpsWithDates = lead.followUps.filter(f => f.date);
      if (followUpsWithDates.length > 0) {
        return followUpsWithDates[followUpsWithDates.length - 1].date;
      }
    }
    return lead.createdAt || null;
  };

  const goalsBoard = useMemo(() => {
    const goalSettings = settings?.find(s => s.type === 'goals');
    const targetYear = goalSettings?.year ? parseInt(goalSettings.year, 10) : new Date().getFullYear();
    const salesTarget = goalSettings?.salesTarget ? parseFloat(goalSettings.salesTarget) : 0;

    const achieved = (orders || [])
      .filter(o => {
        if (!o.createdAt && !o.date) return false;
        const d = new Date(o.createdAt || o.date);
        return d.getFullYear() === targetYear;
      })
      .reduce((sum, o) => {
        const amt = typeof o.amount === 'string' ? parseFloat(o.amount.replace(/[^0-9.-]+/g, '')) : parseFloat(o.amount || 0);
        return sum + (isNaN(amt) ? 0 : amt);
      }, 0);

    const today = new Date();
    const endOfYear = new Date(targetYear, 11, 31);
    let daysLeft = 0;
    
    if (today.getFullYear() < targetYear) {
        // If target year is in the future
        const startOfYear = new Date(targetYear, 0, 1);
        daysLeft = Math.ceil((endOfYear - startOfYear) / (1000 * 60 * 60 * 24));
    } else if (today.getFullYear() === targetYear) {
        daysLeft = Math.ceil((endOfYear - today) / (1000 * 60 * 60 * 24)); 
    }

    const amountLeft = Math.max(0, salesTarget - achieved);
    const perDayRequired = daysLeft > 0 ? (amountLeft / daysLeft) : 0;

    return {
      targetYear,
      salesTarget,
      achieved,
      daysLeft,
      perDayRequired,
      progress: salesTarget > 0 ? Math.min(100, Math.round((achieved / salesTarget) * 100)) : 0
    };
  }, [settings, orders]);

  if (!data) return (
    <div className="space-y-6 pb-12 animate-pulse">
      <div>
        <div className="h-7 w-56 bg-gray-200 rounded-lg mb-2" />
        <div className="h-4 w-80 bg-gray-100 rounded-lg" />
      </div>
      {/* KPI skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex justify-between items-start">
              <div className="space-y-2 flex-1">
                <div className="h-3 w-28 bg-gray-200 rounded" />
                <div className="h-7 w-20 bg-gray-300 rounded" />
                <div className="h-3 w-36 bg-gray-100 rounded" />
              </div>
              <div className="w-10 h-10 bg-gray-200 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
      {/* Chart skeleton row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 shadow-sm h-72" />
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm h-72" />
      </div>
      {/* Chart skeleton row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm h-64" />
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm h-64" />
      </div>
    </div>
  );


  const { kpi, charts } = data;

  if (isEmployee) {
    return (
      <div className="space-y-6 pb-12">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employee Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back, {employeeName || currentUser?.displayName || 'User'} — here is your assigned work.</p>
        </div>
        
        {/* Top section: Goals & Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-gradient-to-br from-[#1b2f63] to-[#12224d] rounded-xl shadow-lg border border-[#1b2f63] p-6 text-white flex flex-col relative overflow-hidden h-full min-h-[280px]">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Target className="w-24 h-24" />
              </div>
              
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-center space-x-2 mb-6">
                  <div className="p-2 bg-white/10 rounded-lg">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold tracking-tight">{goalsBoard.targetYear} Goals</h2>
                </div>

                <div className="space-y-5 flex-1">
                  <div>
                    <p className="text-brand-accent/80 text-xs font-semibold uppercase tracking-wider mb-1">Sales Target</p>
                    <p className="text-2xl xl:text-xl 2xl:text-3xl font-bold tracking-tight break-all">₹{goalsBoard.salesTarget.toLocaleString('en-IN')}</p>
                  </div>

                  <div>
                    <div className="flex justify-between items-end mb-1">
                      <p className="text-brand-accent/80 text-xs font-semibold uppercase tracking-wider">Achieved</p>
                      <span className="text-xs font-bold text-green-400">{goalsBoard.progress}%</span>
                    </div>
                    <p className="text-xl xl:text-lg 2xl:text-2xl font-bold text-green-400 tracking-tight break-all">₹{goalsBoard.achieved.toLocaleString('en-IN')}</p>
                    
                    <div className="w-full bg-white/10 rounded-full h-1.5 mt-2 overflow-hidden">
                      <div 
                        className="bg-green-400 h-1.5 rounded-full transition-all duration-1000 ease-out" 
                        style={{ width: `${goalsBoard.progress}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex justify-between items-start pt-4 border-t border-white/10 mt-auto gap-2">
                    <div className="shrink-0">
                      <div className="flex items-center space-x-1.5 text-brand-accent/80 mb-1">
                        <CalendarDays className="w-3.5 h-3.5" />
                        <p className="text-[11px] font-semibold uppercase tracking-wider">Days Left</p>
                      </div>
                      <p className="text-base xl:text-sm 2xl:text-lg font-bold">{goalsBoard.daysLeft}</p>
                    </div>
                    <div className="text-right min-w-0">
                      <div className="flex items-center justify-end space-x-1.5 text-brand-accent/80 mb-1">
                        <TrendingUpIcon className="w-3.5 h-3.5" />
                        <p className="text-[11px] font-semibold uppercase tracking-wider">Per Day</p>
                      </div>
                      <p className="text-base xl:text-sm 2xl:text-lg font-bold tracking-tight break-all">₹{Math.ceil(goalsBoard.perDayRequired).toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex items-center justify-between hover:border-blue-300 transition-colors">
              <div>
                <p className="text-sm font-semibold text-gray-500 mb-1 uppercase tracking-wider">Pending Tasks</p>
                <p className="text-4xl font-bold text-gray-900">{pendingTasks.length}</p>
              </div>
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner border border-blue-100">
                <CheckSquare className="w-7 h-7" />
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex items-center justify-between hover:border-orange-300 transition-colors">
              <div>
                <p className="text-sm font-semibold text-gray-500 mb-1 uppercase tracking-wider">Active Orders</p>
                <p className="text-4xl font-bold text-gray-900">{myOrders.length}</p>
              </div>
              <div className="w-14 h-14 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center shadow-inner border border-orange-100">
                <ShoppingCart className="w-7 h-7" />
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex items-center justify-between hover:border-green-300 transition-colors">
              <div>
                <p className="text-sm font-semibold text-gray-500 mb-1 uppercase tracking-wider">Production Jobs</p>
                <p className="text-4xl font-bold text-gray-900">{myJobs.length}</p>
              </div>
              <div className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center shadow-inner border border-green-100">
                <Factory className="w-7 h-7" />
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex items-center justify-between hover:border-purple-300 transition-colors">
              <div>
                <p className="text-sm font-semibold text-gray-500 mb-1 uppercase tracking-wider">Open Leads</p>
                <p className="text-4xl font-bold text-gray-900">{myLeads.length}</p>
              </div>
              <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center shadow-inner border border-purple-100">
                <Target className="w-7 h-7" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Work modules grids */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tasks Panel */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-[400px]">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/80 rounded-t-xl">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-blue-600" /> My Tasks
              </h2>
              <button
                onClick={handleOpenTaskModal}
                className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors flex items-center justify-center border border-blue-200"
                title="Create Task"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-3">
              {pendingTasks.length === 0 ? (
                 <div className="text-center text-gray-400 py-12 flex flex-col items-center">
                    <CheckSquare className="w-10 h-10 mb-2 opacity-50" />
                    <p>No pending tasks.</p>
                 </div>
              ) : pendingTasks.map(task => (
                 <div key={task.id} className="border border-gray-100 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all bg-white">
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <h3 className="font-semibold text-gray-900 flex-1 leading-tight">{task.title}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-wider ${task.priority === 'High' ? 'bg-red-50 text-red-600 border border-red-100' : task.priority === 'Medium' ? 'bg-yellow-50 text-yellow-600 border border-yellow-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>{task.priority}</span>
                    </div>
                    {task.dueDate && (
                      <div className={`flex items-center gap-1.5 text-xs font-semibold mb-3 ${isOverdue(task.dueDate) ? 'text-red-600' : isApproachingDeadline(task.dueDate) ? 'text-orange-500' : 'text-gray-500'}`}>
                        <Clock className="w-3.5 h-3.5" /> Due: {new Date(task.dueDate).toLocaleDateString()}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ml-1 ${isOverdue(task.dueDate) ? 'bg-red-100 text-red-700' : isApproachingDeadline(task.dueDate) ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'}`}>
                          {getRemainingDaysText(task.dueDate)}
                        </span>
                      </div>
                    )}
                    <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50">
                      <button 
                        onClick={() => handleTaskStatusChange(task.id, 'In Progress')}
                        disabled={task.status === 'In Progress'}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex justify-center items-center gap-1.5 transition-all ${task.status === 'In Progress' ? 'bg-gray-50 text-gray-400 border border-gray-100' : 'bg-white text-blue-600 hover:bg-blue-50 border border-blue-200 hover:border-blue-300'}`}
                      >
                        In Progress
                      </button>
                      <button 
                        onClick={() => handleTaskStatusChange(task.id, 'Completed')}
                        className="flex-1 py-1.5 text-xs font-semibold rounded-lg flex justify-center items-center gap-1.5 transition-all bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 hover:border-green-300"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Complete
                      </button>
                    </div>
                 </div>
              ))}
            </div>
          </div>
          
          {/* Orders Panel */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-[400px]">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/80 rounded-t-xl">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-orange-600" /> My Orders
              </h2>
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-3">
              {myOrders.length === 0 ? (
                 <div className="text-center text-gray-400 py-12 flex flex-col items-center">
                    <ShoppingCart className="w-10 h-10 mb-2 opacity-50" />
                    <p>No active orders assigned to you.</p>
                 </div>
              ) : myOrders.map(order => (
                 <div key={order.id} className="border border-gray-100 rounded-xl p-4 flex items-center justify-between hover:border-orange-300 hover:shadow-sm transition-all cursor-pointer bg-white" onClick={() => window.location.href = '/orders'}>
                    <div>
                      <div className="font-bold text-gray-900 text-sm">{order.orderNo}</div>
                      <div className="text-xs font-medium text-gray-500 mt-1">{customerMap[order.customerId]?.name || 'Unknown Customer'}</div>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <div className={`text-xs font-bold ${isOverdue(order.deliveryDate) ? 'text-red-600' : isApproachingDeadline(order.deliveryDate) ? 'text-orange-500' : 'text-gray-900'}`}>
                        {new Date(order.deliveryDate).toLocaleDateString()}
                      </div>
                      <div className={`text-[10px] uppercase font-bold mt-1 px-1.5 py-0.5 rounded ${isOverdue(order.deliveryDate) ? 'bg-red-100 text-red-700' : isApproachingDeadline(order.deliveryDate) ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
                        {getRemainingDaysText(order.deliveryDate)}
                      </div>
                    </div>
                 </div>
              ))}
            </div>
          </div>
          
          {/* Jobs Panel */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-[400px]">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/80 rounded-t-xl">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <Factory className="w-5 h-5 text-green-600" /> My Production Jobs
              </h2>
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-3">
              {myJobs.length === 0 ? (
                 <div className="text-center text-gray-400 py-12 flex flex-col items-center">
                    <Factory className="w-10 h-10 mb-2 opacity-50" />
                    <p>No active production jobs assigned.</p>
                 </div>
              ) : myJobs.map(job => (
                 <div key={job.id} className="border border-gray-100 rounded-xl p-4 flex items-center justify-between hover:border-green-300 hover:shadow-sm transition-all cursor-pointer bg-white" onClick={() => window.location.href = '/production'}>
                    <div>
                      <div className="font-bold text-gray-900 text-sm">{job.jobId}</div>
                      <div className="text-xs font-medium text-gray-500 mt-1">{productMap[job.productId]?.name || 'Unknown Product'}</div>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <div className={`text-xs font-bold flex items-center gap-1 ${isOverdue(job.targetDate) ? 'text-red-600' : isApproachingDeadline(job.targetDate) ? 'text-orange-500' : 'text-gray-900'}`}>
                         {job.targetDate ? new Date(job.targetDate).toLocaleDateString() : 'No date'}
                      </div>
                      {job.targetDate && (
                        <div className={`text-[10px] uppercase font-bold mt-1 px-1.5 py-0.5 rounded ${isOverdue(job.targetDate) ? 'bg-red-100 text-red-700' : isApproachingDeadline(job.targetDate) ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
                          {getRemainingDaysText(job.targetDate)}
                        </div>
                      )}
                    </div>
                 </div>
              ))}
            </div>
          </div>
          
          {/* Leads Panel */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-[400px]">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/80 rounded-t-xl">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-600" /> My Open Leads
              </h2>
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-3">
              {myLeads.length === 0 ? (
                 <div className="text-center text-gray-400 py-12 flex flex-col items-center">
                    <Target className="w-10 h-10 mb-2 opacity-50" />
                    <p>No open leads assigned to you.</p>
                 </div>
              ) : myLeads.map(lead => {
                 const followUps = lead.followUps && lead.followUps.length > 0 
                   ? lead.followUps 
                   : (lead.notes || lead.date || lead.time 
                       ? [{ date: lead.date || '', time: lead.time || '', notes: lead.notes || '' }] 
                       : []);
                 const lastFollowUp = followUps.length > 0 ? followUps[followUps.length - 1] : null;
                 let nextFollowUpText = 'No Follow-up';
                 let followUpDateStr = null;
                 if (lastFollowUp && (lastFollowUp.date || lastFollowUp.time)) {
                   nextFollowUpText = `${lastFollowUp.date || ''} ${lastFollowUp.time ? `at ${lastFollowUp.time}` : ''}`.trim();
                   followUpDateStr = lastFollowUp.date;
                 }

                 return (
                 <div key={lead.id} className="border border-gray-100 rounded-xl p-4 flex items-center justify-between hover:border-purple-300 hover:shadow-sm transition-all cursor-pointer bg-white" onClick={() => window.location.href = `/leads?view=my&expand=${encodeURIComponent(lead.stage)}`}>
                    <div>
                      <div className="font-bold text-gray-900 text-sm">{lead.company}</div>
                      <div className="text-xs font-medium text-gray-500 mt-1">{lead.contactPerson}</div>
                    </div>
                    <div className="text-right flex flex-col items-end justify-center">
                      <div className={`text-xs font-bold ${followUpDateStr && isOverdue(followUpDateStr) ? 'text-red-600' : followUpDateStr && isApproachingDeadline(followUpDateStr) ? 'text-orange-500' : 'text-purple-600'}`}>
                        {nextFollowUpText}
                      </div>
                      {followUpDateStr && (
                        <div className={`text-[10px] uppercase font-bold mt-1 px-1.5 py-0.5 rounded ${isOverdue(followUpDateStr) ? 'bg-red-100 text-red-700' : isApproachingDeadline(followUpDateStr) ? 'bg-orange-100 text-orange-700' : 'bg-purple-50 text-purple-600'}`}>
                          {getRemainingDaysText(followUpDateStr)}
                        </div>
                      )}
                    </div>
                 </div>
                 );
              })}
            </div>
          </div>

        </div>
        
        {/* Task Modal */}
        {isTaskModalOpen && createPortal(
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) setIsTaskModalOpen(false); }}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all relative z-[70]">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h2 className="text-xl font-bold text-gray-900">Create Task</h2>
                <button onClick={() => setIsTaskModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  &times;
                </button>
              </div>
              
              <form onSubmit={handleTaskSubmit} className="p-6 space-y-4 text-left">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input
                    type="text"
                    required
                    value={taskFormData.title}
                    onChange={(e) => setTaskFormData({...taskFormData, title: e.target.value.toUpperCase()})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1b2f63]/50 focus:border-[#1b2f63]"
                    placeholder="TASK TITLE"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={taskFormData.description}
                    onChange={(e) => setTaskFormData({...taskFormData, description: e.target.value.toUpperCase()})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1b2f63]/50 focus:border-[#1b2f63] resize-none"
                    placeholder="PROVIDE TASK DETAILS..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assign To *</label>
                    <input
                      type="text"
                      value={taskFormData.assignedTo}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
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
                      value={taskFormData.priority}
                      onChange={(e) => setTaskFormData({...taskFormData, priority: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                    <input
                      type="date"
                      value={taskFormData.dueDate}
                      onChange={(e) => setTaskFormData({...taskFormData, dueDate: e.target.value})}
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
                      value={taskFormData.status}
                      onChange={(e) => setTaskFormData({...taskFormData, status: e.target.value})}
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsTaskModalOpen(false)}
                    className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-50 rounded-lg transition-colors border border-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={taskSaving}
                    className="btn-add disabled:opacity-50"
                  >
                    {taskSaving ? 'Saving...' : 'Create Task'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Executive Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back, {currentUser?.profile?.name || currentUser?.displayName || 'Mukesh'} — here's how the plant is running today.</p>
      </div>

      {/* KPI & Goals Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KpiCard title="Total Orders" value={kpi.totalOrders.value} subtitle={kpi.totalOrders.subtitle} icon={ShoppingCart} color="info" />
          <KpiCard title="Running Jobs" value={kpi.runningJobs.value} subtitle={kpi.runningJobs.subtitle} icon={Factory} color="sky" />
          <KpiCard title="Completed (Month)" value={kpi.completedMonth.value} subtitle={kpi.completedMonth.subtitle} icon={CheckCircle} color="success" />
          <KpiCard title="Pending Dispatches" value={kpi.pendingDispatches.value} subtitle={kpi.pendingDispatches.subtitle} icon={Truck} color="warning" />
          
          <KpiCard title="Pending Payments" value={kpi.pendingPayments.value} subtitle={kpi.pendingPayments.subtitle} icon={Wallet} color="danger" />
          <KpiCard title="Monthly Revenue" value={kpi.monthlyRevenue.value} subtitle={kpi.monthlyRevenue.subtitle} icon={IndianRupee} color="warning" />
          <KpiCard title="Monthly Profit" value={kpi.monthlyProfit.value} subtitle={kpi.monthlyProfit.subtitle} icon={TrendingUp} color="success" />
          <KpiCard title="Active Customers" value={kpi.activeCustomers.value} subtitle={kpi.activeCustomers.subtitle} icon={Activity} color="indigo" />
        </div>

        {/* Goals Board Module */}
        <div className="xl:col-span-1 bg-gradient-to-br from-[#1b2f63] to-[#12224d] rounded-xl shadow-lg border border-[#1b2f63] p-6 text-white flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Target className="w-24 h-24" />
          </div>
          
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center space-x-2 mb-6">
              <div className="p-2 bg-white/10 rounded-lg">
                <Target className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold tracking-tight">{goalsBoard.targetYear} Goals</h2>
            </div>

            <div className="space-y-5 flex-1">
              <div>
                <p className="text-brand-accent/80 text-xs font-semibold uppercase tracking-wider mb-1">Sales Target</p>
                <p className="text-2xl xl:text-xl 2xl:text-3xl font-bold tracking-tight break-all">₹{goalsBoard.salesTarget.toLocaleString('en-IN')}</p>
              </div>

              <div>
                <div className="flex justify-between items-end mb-1">
                  <p className="text-brand-accent/80 text-xs font-semibold uppercase tracking-wider">Achieved</p>
                  <span className="text-xs font-bold text-green-400">{goalsBoard.progress}%</span>
                </div>
                <p className="text-xl xl:text-lg 2xl:text-2xl font-bold text-green-400 tracking-tight break-all">₹{goalsBoard.achieved.toLocaleString('en-IN')}</p>
                
                {/* Progress Bar */}
                <div className="w-full bg-white/10 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div 
                    className="bg-green-400 h-1.5 rounded-full transition-all duration-1000 ease-out" 
                    style={{ width: `${goalsBoard.progress}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex justify-between items-start pt-4 border-t border-white/10 mt-auto gap-2">
                <div className="shrink-0">
                  <div className="flex items-center space-x-1.5 text-brand-accent/80 mb-1">
                    <CalendarDays className="w-3.5 h-3.5" />
                    <p className="text-[11px] font-semibold uppercase tracking-wider">Days Left</p>
                  </div>
                  <p className="text-base xl:text-sm 2xl:text-lg font-bold">{goalsBoard.daysLeft}</p>
                </div>
                <div className="text-right min-w-0">
                  <div className="flex items-center justify-end space-x-1.5 text-brand-accent/80 mb-1">
                    <TrendingUpIcon className="w-3.5 h-3.5" />
                    <p className="text-[11px] font-semibold uppercase tracking-wider">Per Day</p>
                  </div>
                  <p className="text-base xl:text-sm 2xl:text-lg font-bold tracking-tight break-all">₹{Math.ceil(goalsBoard.perDayRequired).toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Monthly Revenue</h2>
              <p className="text-[13px] text-gray-500 mt-1">Last 6 months · ₹ in lakhs</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">{kpi.monthlyRevenue.value}</div>
              <div className="text-[13px] font-medium text-gray-400 mt-1">{kpi.monthlyRevenue.subtitle}</div>
            </div>
          </div>
          <div className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.revenueLine} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1e3a8a" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#1e3a8a" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={true} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} dx={-10} domain={[0, 100]} tickFormatter={(val) => `₹${val}L`} />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  formatter={(value) => [`₹${value}L`, 'Revenue']}
                />
                <Area type="monotone" dataKey="value" stroke="#1e3a8a" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex flex-col">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Order Status</h2>
            <p className="text-[13px] text-gray-500 mt-1">Current month breakdown</p>
          </div>
          <div className="flex-1 flex flex-col justify-center mt-6">
            <div className="h-48 w-full mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.orderStatus}
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {charts.orderStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3 mt-auto">
              {charts.orderStatus.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-2.5 h-2.5 rounded-full mr-3" style={{backgroundColor: item.color}}></div>
                    <span className="text-[13px] text-gray-600">{item.name}</span>
                  </div>
                  <span className="text-[13px] font-bold text-gray-900">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-medium text-gray-900 mb-6">Production Stages</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.productionStages} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
                <XAxis type="number" axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} tick={{ fill: '#4B5563', fontSize: 13 }} />
                <RechartsTooltip cursor={{ fill: 'transparent' }} />
                <Bar dataKey="value" fill="#D4A574" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-medium text-gray-900 mb-6">Recent Activities</h2>
          <div className="space-y-6">
            {charts.recentActivities.map((activity, idx) => (
              <div key={activity.id} className="flex relative">
                {idx !== charts.recentActivities.length - 1 && (
                  <div className="absolute top-8 left-4 bottom-0 w-px bg-gray-200 -mb-6"></div>
                )}
                <div className="w-8 h-8 rounded-full bg-brand-fill flex items-center justify-center flex-shrink-0 z-10 mr-4">
                  <div className="w-2.5 h-2.5 rounded-full bg-brand-line"></div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{activity.text}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
