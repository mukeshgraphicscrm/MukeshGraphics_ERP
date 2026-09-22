import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  ShoppingCart, Factory, CheckCircle, Truck, Wallet, IndianRupee,
  TrendingUp, Activity, Target, CalendarDays, TrendingUp as TrendingUpIcon,
  Clock, CheckSquare, Plus, Mic, MicOff, Square, Trash2, PenTool, Boxes, FilePlus
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar
} from 'recharts';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
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
    productionJobs, leads, productMap, customerMap,
    artworks, dispatches, inventory, invoices, jobPreparations
  } = useData();
  const { currentUser } = useAuth();
  const isAdmin = !currentUser?.profile || currentUser?.profile?.designation?.toUpperCase() === 'ADMINISTRATOR';
  const isEmployee = !isAdmin;
  const employeeName = currentUser?.profile?.name || '';
  const accessibleModules = currentUser?.profile?.accessibleModules || [];

  const hasAccess = (moduleName) => {
    if (!isEmployee) return true;
    return accessibleModules.includes(moduleName);
  };

  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get('/users');
        setUsers(res.data);
      } catch (err) {
        console.error('Error fetching users:', err);
      }
    };
    fetchUsers();
  }, []);

  const [exactViews, setExactViews] = useState({});
  const toggleExactView = (key) => setExactViews(prev => ({ ...prev, [key]: !prev[key] }));
  const [timeframe, setTimeframe] = useState('month'); // 'month' or 'all'

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskFormData, setTaskFormData] = useState({
    title: '',
    description: '',
    assignedTo: employeeName,
    priority: 'Medium',
    status: 'Pending',
    dueDate: '',
    audioUrls: [],
    audioUrl: null
  });
  const [taskAudioBlobs, setTaskAudioBlobs] = useState([]);
  const [isTaskRecording, setIsTaskRecording] = useState(false);
  const [taskMediaRecorder, setTaskMediaRecorder] = useState(null);
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
      dueDate: '',
      audioUrls: [],
      audioUrl: null
    });
    setTaskAudioBlobs([]);
    setIsTaskModalOpen(true);
  };

  const startTaskRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setTaskAudioBlobs(prev => [...prev, blob]);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setTaskMediaRecorder(recorder);
      setIsTaskRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      toast.error('Could not access microphone');
    }
  };

  const stopTaskRecording = () => {
    if (taskMediaRecorder && isTaskRecording) {
      taskMediaRecorder.stop();
      setIsTaskRecording(false);
    }
  };

  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    setTaskSaving(true);

    try {
      let newUrls = [];
      if (taskAudioBlobs.length > 0) {
        for (const blob of taskAudioBlobs) {
          const audioRef = ref(storage, `task-audio/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.webm`);
          await uploadBytes(audioRef, blob);
          const url = await getDownloadURL(audioRef);
          newUrls.push(url);
        }
      }

      const finalAudioUrls = [...(taskFormData.audioUrls || []), ...newUrls];
      const assignedBy = currentUser?.profile?.name || currentUser?.displayName || 'Admin';

      const payload = {
        ...taskFormData,
        audioUrls: finalAudioUrls,
        audioUrl: finalAudioUrls.length > 0 ? finalAudioUrls[0] : null,
        assignedBy
      };

      await api.post('/tasks', payload);
      toast.success('Task created successfully');

      if (taskFormData.assignedTo) {
        try {
          await api.post('/notifications', {
            title: 'New Task Assigned',
            message: `A new task "${taskFormData.title}" has been assigned to you by ${assignedBy}.`,
            employee: taskFormData.assignedTo,
            read: false,
            createdAt: new Date().toISOString()
          });
        } catch (notifErr) {
          console.error('Failed to send notification:', notifErr);
        }
      }

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

  const getJobStatus = (job) => {
    let derivedStatus = job.status || 'On Schedule';
    if (job.deadline) {
      const deadlineDate = new Date(job.deadline);
      deadlineDate.setHours(0, 0, 0, 0);
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      const diffTime = deadlineDate - todayDate;
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays < 0 && Number(job.progress) < 100) {
        derivedStatus = 'Delayed';
      } else if (diffDays >= 0 && diffDays <= 3 && Number(job.progress) < 90) {
        derivedStatus = 'At Risk';
      } else {
        derivedStatus = 'On Schedule';
      }
    }
    return derivedStatus;
  };

  const myJobs = useMemo(() => {
    return realtimeJobs.filter(job => {
      if (job.stage === 'Dispatched') return false;
      const status = getJobStatus(job);
      return status === 'At Risk' || status === 'Delayed';
    }).map(job => ({ ...job, displayStatus: getJobStatus(job) }));
  }, [realtimeJobs]);
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
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    return target < today;
  };

  const getRemainingDaysText = (dateString) => {
    if (!dateString) return '';
    const target = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
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

  const activeDesigns = useMemo(() => {
    return (artworks || []).filter(a => {
      const isMyDesign = !isEmployee || a.employee === employeeName || a.designer === employeeName;
      return isMyDesign && (a.status === 'Active' || a.status === 'In Process');
    });
  }, [artworks, isEmployee, employeeName]);

  const activeJobPreparations = useMemo(() => {
    return (jobPreparations || []).filter(jp => jp.status !== 'Done');
  }, [jobPreparations]);

  const pendingDispatches = useMemo(() => {
    return (dispatches || []).filter(d => d.status !== 'Delivered' && d.status !== 'Cancelled');
  }, [dispatches]);

  const lowStockItems = useMemo(() => {
    return (inventory || []).filter(i => i.status === 'Low Stock');
  }, [inventory]);

  const overdueAccounts = useMemo(() => {
    const overdueInvoices = (invoices || []).filter(i => i.status === 'Overdue');
    const totalAmount = overdueInvoices.reduce((sum, inv) => sum + (parseFloat(inv.amount) || 0), 0);

    // Group by customer
    const customerTotals = {};
    overdueInvoices.forEach(inv => {
      const cId = inv.customerId;
      if (!customerTotals[cId]) customerTotals[cId] = 0;
      customerTotals[cId] += (parseFloat(inv.amount) || 0);
    });

    const byCustomer = Object.keys(customerTotals).map(cId => ({
      customerId: cId,
      customerName: customerMap[cId]?.name || 'Unknown',
      amount: customerTotals[cId]
    })).sort((a, b) => b.amount - a.amount);

    return { totalAmount, byCustomer };
  }, [invoices, customerMap]);

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

  // ── New Analytics Computations (Admin only) ──
  const orderAnalytics = useMemo(() => {
    const currentYear = new Date().getFullYear();
    let ytdRevenue = 0; let totalOrders = 0;
    (orders || []).forEach(o => {
      const d = new Date(o.createdAt || o.date);
      const amt = typeof o.amount === 'string' ? parseFloat(o.amount.replace(/[^0-9.-]+/g, '')) : parseFloat(o.amount || 0);
      if (!isNaN(d.getFullYear()) && d.getFullYear() === currentYear) {
        ytdRevenue += (isNaN(amt) ? 0 : amt); totalOrders++;
      }
    });
    return { ytdRevenue, avgOrderValue: totalOrders > 0 ? ytdRevenue / totalOrders : 0, totalOrders };
  }, [orders]);

  const leadConversion = useMemo(() => {
    const total = (leads || []).length;
    const won = (leads || []).filter(l => l.stage === 'Won').length;
    const active = (leads || []).filter(l => l.stage !== 'Won' && l.stage !== 'Lost').length;
    return { total, won, active, rate: total > 0 ? Math.round((won / total) * 100) : 0 };
  }, [leads]);

  const invoiceHealth = useMemo(() => {
    const count = { Paid: 0, Pending: 0, Overdue: 0 };
    const amounts = { Paid: 0, Pending: 0, Overdue: 0 };
    (invoices || []).forEach(inv => {
      const s = count.hasOwnProperty(inv.status) ? inv.status : 'Pending';
      count[s]++;
      amounts[s] += (parseFloat(inv.amount) || 0);
    });
    const total = count.Paid + count.Pending + count.Overdue;
    return { count, amounts, total, collectionRate: total > 0 ? Math.round((count.Paid / total) * 100) : 0 };
  }, [invoices]);

  const topCustomers = useMemo(() => {
    const byCustomer = {};
    (orders || []).forEach(o => {
      const cId = o.customerId; if (!cId) return;
      const amt = typeof o.amount === 'string' ? parseFloat(o.amount.replace(/[^0-9.-]+/g, '')) : parseFloat(o.amount || 0);
      if (!byCustomer[cId]) byCustomer[cId] = { name: customerMap[cId]?.name || 'Unknown', total: 0, count: 0 };
      byCustomer[cId].total += (isNaN(amt) ? 0 : amt);
      byCustomer[cId].count++;
    });
    const sorted = Object.values(byCustomer).sort((a, b) => b.total - a.total).slice(0, 6);
    const max = sorted[0]?.total || 1;
    return sorted.map(c => ({ ...c, pct: Math.round((c.total / max) * 100) }));
  }, [orders, customerMap]);

  const leadPipeline = useMemo(() => {
    // Actual stage names used in the app
    const stageOrder = ['New Inquiry', 'Follow Up', 'Quotation Sent', 'Won', 'Lost'];
    const stageColors = {
      'New Inquiry': '#6366f1',
      'Follow Up': '#3b82f6',
      'Quotation Sent': '#f59e0b',
      'Won': '#10b981',
      'Lost': '#ef4444'
    };
    const stages = {};
    (leads || []).forEach(l => { const s = l.stage || 'New Inquiry'; stages[s] = (stages[s] || 0) + 1; });
    // Include predefined stages + any extra stages found in data
    const allKeys = [...new Set([...stageOrder, ...Object.keys(stages)])];
    const total = Object.values(stages).reduce((a, b) => a + b, 0) || 1;
    return allKeys.filter(s => stages[s]).map(s => ({
      name: s,
      value: stages[s],
      pct: Math.round((stages[s] / total) * 100),
      color: stageColors[s] || '#94a3b8'
    }));
  }, [leads]);

  const productionHealth = useMemo(() => {
    const health = { 'On Schedule': { count: 0, color: '#10b981' }, 'At Risk': { count: 0, color: '#f59e0b' }, 'Delayed': { count: 0, color: '#ef4444' } };
    (productionJobs || []).filter(j => j.stage !== 'Dispatched' && j.status !== 'Completed').forEach(job => {
      const s = getJobStatus(job);
      if (health[s]) health[s].count++;
    });
    const total = Object.values(health).reduce((a, b) => a + b.count, 0) || 1;
    return Object.entries(health).map(([name, { count, color }]) => ({ name, count, color, pct: Math.round((count / total) * 100) }));
  }, [productionJobs]);

  const monthlyOrderTrend = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push({ name: d.toLocaleString('en-IN', { month: 'short' }), year: d.getFullYear(), month: d.getMonth(), count: 0, revenue: 0 });
    }
    (orders || []).forEach(o => {
      const d = new Date(o.createdAt || o.date);
      const idx = months.findIndex(m => m.month === d.getMonth() && m.year === d.getFullYear());
      if (idx >= 0) {
        months[idx].count++;
        const amt = typeof o.amount === 'string' ? parseFloat(o.amount.replace(/[^0-9.-]+/g, '')) : parseFloat(o.amount || 0);
        months[idx].revenue += (isNaN(amt) ? 0 : amt);
      }
    });
    return months;
  }, [orders]);

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
          <h1 className="text-2xl font-bold text-gray-900 capitalize">{currentUser?.profile?.designation?.toLowerCase() || 'Employee'} Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back, {employeeName || currentUser?.displayName || 'User'} — here is your assigned work.</p>
        </div>

        {/* Top section: Goals & Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 order-1 lg:order-2">
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

          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 order-2 lg:order-1 content-start">
            {hasAccess('Tasks') && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex items-center justify-between hover:border-blue-300 transition-colors">
                <div>
                  <p className="text-sm font-semibold text-gray-500 mb-1 uppercase tracking-wider">Pending Tasks</p>
                  <p className="text-4xl font-bold text-gray-900">{pendingTasks.length}</p>
                </div>
                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner border border-blue-100">
                  <CheckSquare className="w-7 h-7" />
                </div>
              </div>
            )}

            {hasAccess('Orders') && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex items-center justify-between hover:border-orange-300 transition-colors">
                <div>
                  <p className="text-sm font-semibold text-gray-500 mb-1 uppercase tracking-wider">Active Orders</p>
                  <p className="text-4xl font-bold text-gray-900">{myOrders.length}</p>
                </div>
                <div className="w-14 h-14 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center shadow-inner border border-orange-100">
                  <ShoppingCart className="w-7 h-7" />
                </div>
              </div>
            )}

            {hasAccess('Production') && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex items-center justify-between hover:border-green-300 transition-colors">
                <div>
                  <p className="text-sm font-semibold text-gray-500 mb-1 uppercase tracking-wider">Production Jobs</p>
                  <p className="text-4xl font-bold text-gray-900">{myJobs.length}</p>
                </div>
                <div className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center shadow-inner border border-green-100">
                  <Factory className="w-7 h-7" />
                </div>
              </div>
            )}

            {hasAccess('Leads') && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex items-center justify-between hover:border-purple-300 transition-colors">
                <div>
                  <p className="text-sm font-semibold text-gray-500 mb-1 uppercase tracking-wider">Open Leads</p>
                  <p className="text-4xl font-bold text-gray-900">{myLeads.length}</p>
                </div>
                <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center shadow-inner border border-purple-100">
                  <Target className="w-7 h-7" />
                </div>
              </div>
            )}

            {hasAccess('Design') && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex items-center justify-between hover:border-pink-300 transition-colors">
                <div>
                  <p className="text-sm font-semibold text-gray-500 mb-1 uppercase tracking-wider">Active Designs</p>
                  <p className="text-4xl font-bold text-gray-900">{activeDesigns.length}</p>
                </div>
                <div className="w-14 h-14 bg-pink-50 text-pink-600 rounded-2xl flex items-center justify-center shadow-inner border border-pink-100">
                  <PenTool className="w-7 h-7" />
                </div>
              </div>
            )}

            {hasAccess('Job Preparation') && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex items-center justify-between hover:border-indigo-300 transition-colors">
                <div>
                  <p className="text-sm font-semibold text-gray-500 mb-1 uppercase tracking-wider">Job Preps</p>
                  <p className="text-4xl font-bold text-gray-900">{activeJobPreparations.length}</p>
                </div>
                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner border border-indigo-100">
                  <FilePlus className="w-7 h-7" />
                </div>
              </div>
            )}

            {hasAccess('Dispatch') && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex items-center justify-between hover:border-cyan-300 transition-colors">
                <div>
                  <p className="text-sm font-semibold text-gray-500 mb-1 uppercase tracking-wider">Dispatches</p>
                  <p className="text-4xl font-bold text-gray-900">{pendingDispatches.length}</p>
                </div>
                <div className="w-14 h-14 bg-cyan-50 text-cyan-600 rounded-2xl flex items-center justify-center shadow-inner border border-cyan-100">
                  <Truck className="w-7 h-7" />
                </div>
              </div>
            )}

            {hasAccess('Inventory') && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex items-center justify-between hover:border-yellow-300 transition-colors">
                <div>
                  <p className="text-sm font-semibold text-gray-500 mb-1 uppercase tracking-wider">Low Stock</p>
                  <p className="text-4xl font-bold text-gray-900">{lowStockItems.length}</p>
                </div>
                <div className="w-14 h-14 bg-yellow-50 text-yellow-600 rounded-2xl flex items-center justify-center shadow-inner border border-yellow-100">
                  <Boxes className="w-7 h-7" />
                </div>
              </div>
            )}

            {hasAccess('Accounts') && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex items-center justify-between hover:border-red-300 transition-colors">
                <div>
                  <p className="text-sm font-semibold text-gray-500 mb-1 uppercase tracking-wider">Overdue Amount</p>
                  <p className="text-2xl font-bold text-red-600">₹{overdueAccounts.totalAmount.toLocaleString('en-IN')}</p>
                </div>
                <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center shadow-inner border border-red-100">
                  <Wallet className="w-7 h-7" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Work modules grids */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tasks Panel */}
          {hasAccess('Tasks') && (
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
                    {task.description && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                        {task.description}
                      </p>
                    )}
                    {task.audioUrls && task.audioUrls.length > 0 ? (
                      <div className="mb-3 space-y-2">
                        {task.audioUrls.map((url, idx) => (
                          <audio key={idx} src={url} controls className="w-full h-8" />
                        ))}
                      </div>
                    ) : task.audioUrl ? (
                      <div className="mb-3 space-y-2">
                        <audio src={task.audioUrl} controls className="w-full h-8" />
                      </div>
                    ) : null}
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
          )}

          {/* Orders Panel */}
          {hasAccess('Orders') && (
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
          )}

          {/* Jobs Panel */}
          {hasAccess('Production') && (
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
                      <div className="font-bold text-gray-900 text-sm flex items-center gap-2">
                        {job.jobCardNo || job.jobId || 'N/A'}
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full uppercase font-bold ${job.displayStatus === 'Delayed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                          {job.displayStatus}
                        </span>
                      </div>
                      <div className="text-xs font-medium text-gray-500 mt-1">{job.productName || productMap[job.productId]?.name || 'Unknown Product'}</div>
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
          )}

          {/* Leads Panel */}
          {hasAccess('Leads') && (
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
          )}

          {/* Design Panel */}
          {hasAccess('Design') && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-[400px]">
              <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/80 rounded-t-xl">
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <PenTool className="w-5 h-5 text-pink-600" /> Active Designs
                </h2>
              </div>
              <div className="p-4 flex-1 overflow-y-auto space-y-3">
                {activeDesigns.length === 0 ? (
                  <div className="text-center text-gray-400 py-12 flex flex-col items-center">
                    <PenTool className="w-10 h-10 mb-2 opacity-50" />
                    <p>No active designs.</p>
                  </div>
                ) : activeDesigns.map(design => (
                  <div key={design.id} className="border border-gray-100 rounded-xl p-4 flex items-center justify-between hover:border-pink-300 hover:shadow-sm transition-all cursor-pointer bg-white" onClick={() => window.location.href = '/design'}>
                    <div>
                      <div className="font-bold text-gray-900 text-sm">{customerMap[design.customerId]?.name || 'Unknown'}</div>
                      <div className="text-xs font-medium text-gray-500 mt-1">{productMap[design.productId]?.name || 'Unknown Product'}</div>
                    </div>
                    <div className="text-right flex flex-col items-end justify-center">
                      <div className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-pink-50 text-pink-700`}>
                        {design.status}
                      </div>
                      {design.deadline && (
                        <div className={`text-xs font-bold mt-1 ${isOverdue(design.deadline) ? 'text-red-600' : isApproachingDeadline(design.deadline) ? 'text-orange-500' : 'text-gray-900'}`}>
                          Due: {new Date(design.deadline).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Job Preparation Panel */}
          {hasAccess('Job Preparation') && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-[400px]">
              <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/80 rounded-t-xl">
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <FilePlus className="w-5 h-5 text-indigo-600" /> Job Preparations
                </h2>
              </div>
              <div className="p-4 flex-1 overflow-y-auto space-y-3">
                {activeJobPreparations.length === 0 ? (
                  <div className="text-center text-gray-400 py-12 flex flex-col items-center">
                    <FilePlus className="w-10 h-10 mb-2 opacity-50" />
                    <p>No active job preparations.</p>
                  </div>
                ) : activeJobPreparations.map(jp => (
                  <div key={jp.id} className="border border-gray-100 rounded-xl p-4 flex items-center justify-between hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer bg-white" onClick={() => window.location.href = '/job-preparation'}>
                    <div>
                      <div className="font-bold text-gray-900 text-sm">{jp.jobNo || jp.orderNo || 'Unknown'}</div>
                      <div className="text-xs font-medium text-gray-500 mt-1">{jp.party || customerMap[jp.party]?.name || 'Unknown'}</div>
                    </div>
                    <div className="text-right flex flex-col items-end justify-center">
                      <div className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700`}>
                        {jp.status || 'Active'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dispatch Panel */}
          {hasAccess('Dispatch') && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-[400px]">
              <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/80 rounded-t-xl">
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-cyan-600" /> Dispatches
                </h2>
              </div>
              <div className="p-4 flex-1 overflow-y-auto space-y-3">
                {pendingDispatches.length === 0 ? (
                  <div className="text-center text-gray-400 py-12 flex flex-col items-center">
                    <Truck className="w-10 h-10 mb-2 opacity-50" />
                    <p>No pending dispatches.</p>
                  </div>
                ) : pendingDispatches.map(dispatch => (
                  <div key={dispatch.id} className="border border-gray-100 rounded-xl p-4 flex items-center justify-between hover:border-cyan-300 hover:shadow-sm transition-all cursor-pointer bg-white" onClick={() => window.location.href = '/dispatch'}>
                    <div>
                      <div className="font-bold text-gray-900 text-sm">{dispatch.dispatchNo}</div>
                      <div className="text-xs font-medium text-gray-500 mt-1">{dispatch.customer || customerMap[dispatch.customerId]?.name || 'Unknown'}</div>
                    </div>
                    <div className="text-right flex flex-col items-end justify-center">
                      <div className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-700`}>
                        {dispatch.status}
                      </div>
                      <div className="text-xs font-bold mt-1 text-gray-600">
                        {new Date(dispatch.date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inventory Panel */}
          {hasAccess('Inventory') && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-[400px]">
              <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/80 rounded-t-xl">
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <Boxes className="w-5 h-5 text-yellow-600" /> Low Stock Alerts
                </h2>
              </div>
              <div className="p-4 flex-1 overflow-y-auto space-y-3">
                {lowStockItems.length === 0 ? (
                  <div className="text-center text-gray-400 py-12 flex flex-col items-center">
                    <Boxes className="w-10 h-10 mb-2 opacity-50" />
                    <p>All items have sufficient stock.</p>
                  </div>
                ) : lowStockItems.map(item => (
                  <div key={item.id} className="border border-gray-100 rounded-xl p-4 flex items-center justify-between hover:border-yellow-300 hover:shadow-sm transition-all cursor-pointer bg-white" onClick={() => window.location.href = '/inventory'}>
                    <div>
                      <div className="font-bold text-gray-900 text-sm">{item.material}</div>
                      <div className="text-xs font-medium text-gray-500 mt-1">{item.category}</div>
                    </div>
                    <div className="text-right flex flex-col items-end justify-center">
                      <div className="text-sm font-bold text-red-600">
                        {item.stock} <span className="text-xs font-medium text-gray-500">{item.unit}</span>
                      </div>
                      <div className="text-[10px] uppercase font-bold mt-1 px-1.5 py-0.5 rounded bg-red-50 text-red-700">
                        Min: {item.min}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Accounts Panel */}
          {hasAccess('Accounts') && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-[400px]">
              <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/80 rounded-t-xl">
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-red-600" /> Overdue by Customer
                </h2>
              </div>
              <div className="p-4 flex-1 overflow-y-auto space-y-3">
                {overdueAccounts.byCustomer.length === 0 ? (
                  <div className="text-center text-gray-400 py-12 flex flex-col items-center">
                    <Wallet className="w-10 h-10 mb-2 opacity-50" />
                    <p>No overdue accounts.</p>
                  </div>
                ) : overdueAccounts.byCustomer.map(c => (
                  <div key={c.customerId} className="border border-gray-100 rounded-xl p-4 flex items-center justify-between hover:border-red-300 hover:shadow-sm transition-all bg-white" onClick={() => window.location.href = '/accounts'}>
                    <div>
                      <div className="font-bold text-gray-900 text-sm">{c.customerName}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-red-600">
                        ₹{c.amount.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-between items-center shrink-0">
                <span className="font-bold text-gray-700">Total Overdue</span>
                <span className="font-bold text-red-600 text-lg">₹{overdueAccounts.totalAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>
          )}

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
                    onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1b2f63]/50 focus:border-[#1b2f63]"
                    placeholder="TASK TITLE"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    {!isTaskRecording && (
                      <button
                        type="button"
                        onClick={startTaskRecording}
                        className="text-xs flex items-center gap-1 font-medium transition-colors text-blue-500 hover:text-blue-600"
                      >
                        <Mic className="w-3.5 h-3.5" /> Add Voice Note
                      </button>
                    )}
                    {isTaskRecording && (
                      <button
                        type="button"
                        onClick={stopTaskRecording}
                        className="text-xs flex items-center gap-1 font-medium transition-colors text-red-500 hover:text-red-600 animate-pulse"
                      >
                        <Square className="w-3.5 h-3.5 fill-current" /> Stop Recording
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={3}
                    value={taskFormData.description}
                    onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1b2f63]/50 focus:border-[#1b2f63] resize-none"
                    placeholder="PROVIDE TASK DETAILS..."
                  />

                  {/* Render Audio Notes */}
                  {((taskFormData.audioUrls && taskFormData.audioUrls.length > 0) || taskAudioBlobs.length > 0) && (
                    <div className="space-y-2 mt-2">
                      {/* Existing Notes */}
                      {taskFormData.audioUrls && taskFormData.audioUrls.map((url, idx) => (
                        <div key={`url-${idx}`} className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                              <Mic className="w-4 h-4" />
                            </div>
                            <audio src={url} controls className="h-8 max-w-[200px]" />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setTaskFormData(prev => ({
                                ...prev,
                                audioUrls: prev.audioUrls.filter((_, i) => i !== idx)
                              }));
                            }}
                            className="text-red-500 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}

                      {/* New Recorded Notes */}
                      {taskAudioBlobs.map((blob, idx) => (
                        <div key={`new-${idx}`} className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                              <Mic className="w-4 h-4" />
                            </div>
                            <audio src={URL.createObjectURL(blob)} controls className="h-8 max-w-[200px]" />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setTaskAudioBlobs(prev => prev.filter((_, i) => i !== idx));
                            }}
                            className="text-red-500 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assign To *</label>
                    <CustomSelect
                      options={[
                        ...(isAdmin ? [{ label: currentUser?.profile?.name || currentUser?.displayName || 'BHUPAT BHUT', value: currentUser?.profile?.name || currentUser?.displayName || 'BHUPAT BHUT' }] : []),
                        ...users
                          .map(u => ({ label: u.name, value: u.name }))
                      ]}
                      value={taskFormData.assignedTo}
                      onChange={(e) => setTaskFormData({ ...taskFormData, assignedTo: e.target.value })}
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
                      value={taskFormData.priority}
                      onChange={(e) => setTaskFormData({ ...taskFormData, priority: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                    <input
                      type="datetime-local"
                      value={taskFormData.dueDate}
                      onChange={(e) => setTaskFormData({ ...taskFormData, dueDate: e.target.value })}
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
                      onChange={(e) => setTaskFormData({ ...taskFormData, status: e.target.value })}
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
    <div className="space-y-7 pb-12">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-8 rounded-full bg-gradient-to-b from-[#1b2f63] to-[#4f6fbd]" />
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Executive Dashboard</h1>
          </div>
          <p className="text-gray-500 ml-4 text-sm">Welcome back, <span className="font-semibold text-[#1b2f63]">{currentUser?.profile?.name || currentUser?.displayName || 'Mukesh'}</span> — here's how the plant is running today.</p>
        </div>
        <button
          onClick={handleOpenTaskModal}
          className="btn-add whitespace-nowrap self-start sm:self-auto shadow-lg hover:shadow-xl transition-shadow"
        >
          <Plus className="w-4 h-4 mr-2" />
          Quick Assign Task
        </button>
      </div>

      {/* ── KPI Cards + Goals ── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">

        {/* 8 KPI cards in a 4-col sub-grid */}
        <div className="xl:col-span-4 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Card 1 – Total Orders */}
          <div className="group relative bg-white rounded-2xl border border-gray-100 p-5 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 cursor-default">
            <div className="absolute inset-0 bg-gradient-to-br from-[#EFF6FF] to-white opacity-60" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{kpi.totalOrders.subtitle}</p>
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ShoppingCart className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-gray-900 leading-none">{kpi.totalOrders.value}</div>
              <p className="text-xs text-gray-400 mt-2 font-medium">Total Orders Placed</p>
              <div className="mt-3 h-1 w-full bg-blue-50 rounded-full"><div className="h-1 bg-blue-500 rounded-full" style={{ width: '70%' }} /></div>
            </div>
          </div>

          {/* Card 2 – Running Jobs */}
          <div className="group relative bg-white rounded-2xl border border-gray-100 p-5 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 cursor-default">
            <div className="absolute inset-0 bg-gradient-to-br from-[#F0F9FF] to-white opacity-60" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{kpi.runningJobs.subtitle}</p>
                <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Factory className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-gray-900 leading-none">{kpi.runningJobs.value}</div>
              <p className="text-xs text-gray-400 mt-2 font-medium">Active in Production</p>
              <div className="mt-3 h-1 w-full bg-sky-50 rounded-full"><div className="h-1 bg-sky-400 rounded-full" style={{ width: '55%' }} /></div>
            </div>
          </div>

          {/* Card 3 – Completed Month */}
          <div className="group relative bg-white rounded-2xl border border-gray-100 p-5 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 cursor-default">
            <div className="absolute inset-0 bg-gradient-to-br from-[#F0FDF4] to-white opacity-60" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{kpi.completedMonth.subtitle}</p>
                <div className="w-9 h-9 rounded-xl bg-green-100 text-green-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CheckCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-gray-900 leading-none">{kpi.completedMonth.value}</div>
              <p className="text-xs text-gray-400 mt-2 font-medium">Completed or Ready</p>
              <div className="mt-3 h-1 w-full bg-green-50 rounded-full"><div className="h-1 bg-green-500 rounded-full" style={{ width: '80%' }} /></div>
            </div>
          </div>

          {/* Card 4 – Pending Dispatches */}
          <div className="group relative bg-white rounded-2xl border border-gray-100 p-5 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 cursor-default">
            <div className="absolute inset-0 bg-gradient-to-br from-[#FFFBEB] to-white opacity-60" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{kpi.pendingDispatches.subtitle}</p>
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Truck className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-gray-900 leading-none">{kpi.pendingDispatches.value}</div>
              <p className="text-xs text-gray-400 mt-2 font-medium">Pending Processing</p>
              <div className="mt-3 h-1 w-full bg-amber-50 rounded-full"><div className="h-1 bg-amber-400 rounded-full" style={{ width: '40%' }} /></div>
            </div>
          </div>

          {/* Card 5 – Pending Payments */}
          <div onClick={() => toggleExactView('pendingPayments')} className="group relative bg-gradient-to-br from-[#1b2f63] to-[#2a4494] rounded-2xl border border-transparent p-5 overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 cursor-pointer">
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">{kpi.pendingPayments.subtitle}</p>
                <div className="w-9 h-9 rounded-xl bg-white/15 text-red-300 flex items-center justify-center transition-transform group-hover:scale-110">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div className={`font-extrabold text-white leading-none transition-all ${exactViews['pendingPayments'] && kpi.pendingPayments.exactValue ? 'text-2xl' : 'text-3xl'}`}>
                {exactViews['pendingPayments'] && kpi.pendingPayments.exactValue ? kpi.pendingPayments.exactValue : kpi.pendingPayments.value}
              </div>
              <p className="text-xs text-blue-200 mt-2 font-medium">Total Outstanding</p>
            </div>
          </div>

          {/* Card 6 – Revenue (Toggleable) */}
          <div onClick={() => toggleExactView('revenue')} className="group relative bg-gradient-to-br from-[#f59e0b] to-[#d97706] rounded-2xl border border-transparent p-5 overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 cursor-pointer">
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-bold text-amber-100 uppercase tracking-widest">
                  {timeframe === 'month' ? kpi.monthlyRevenue.subtitle : kpi.allTimeRevenue.subtitle}
                </p>
                <div className="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center transition-transform group-hover:scale-110">
                  <IndianRupee className="w-4 h-4" />
                </div>
              </div>
              <div className={`font-extrabold text-white leading-none transition-all ${exactViews['revenue'] ? 'text-2xl' : 'text-3xl'}`}>
                {(() => {
                  const m = timeframe === 'month' ? kpi.monthlyRevenue : kpi.allTimeRevenue;
                  return (exactViews['revenue'] && m.exactValue) ? m.exactValue : m.value;
                })()}
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-amber-100 font-medium">
                  {timeframe === 'month' ? 'Current Month' : 'All-Time Revenue'}
                </p>
                <button
                  onClick={(e) => { e.stopPropagation(); setTimeframe(t => t === 'month' ? 'all' : 'month'); }}
                  className="text-[10px] font-semibold bg-black/10 hover:bg-black/20 transition-colors px-2.5 py-0.5 rounded-full text-white"
                >
                  {timeframe === 'month' ? 'View All-Time' : 'View Month'}
                </button>
              </div>
            </div>
          </div>

          {/* Card 7 – Profit (Toggleable) */}
          <div onClick={() => toggleExactView('profit')} className="group relative bg-gradient-to-br from-[#10b981] to-[#059669] rounded-2xl border border-transparent p-5 overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 cursor-pointer">
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest">
                  {timeframe === 'month' ? kpi.monthlyProfit.subtitle : kpi.allTimeProfit.subtitle}
                </p>
                <div className="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center transition-transform group-hover:scale-110">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className={`font-extrabold text-white leading-none transition-all ${exactViews['profit'] ? 'text-2xl' : 'text-3xl'}`}>
                {(() => {
                  const m = timeframe === 'month' ? kpi.monthlyProfit : kpi.allTimeProfit;
                  return (exactViews['profit'] && m.exactValue) ? m.exactValue : m.value;
                })()}
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-emerald-100 font-medium">
                  {timeframe === 'month' ? 'Est. 10% Margin' : 'All-Time Est. 10%'}
                </p>
                <button
                  onClick={(e) => { e.stopPropagation(); setTimeframe(t => t === 'month' ? 'all' : 'month'); }}
                  className="text-[10px] font-semibold bg-black/10 hover:bg-black/20 transition-colors px-2.5 py-0.5 rounded-full text-white"
                >
                  {timeframe === 'month' ? 'View All-Time' : 'View Month'}
                </button>
              </div>
            </div>
          </div>

          {/* Card 8 – Active Customers */}
          <div className="group relative bg-white rounded-2xl border border-gray-100 p-5 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 cursor-default">
            <div className="absolute inset-0 bg-gradient-to-br from-[#EEF2FF] to-white opacity-60" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{kpi.activeCustomers.subtitle}</p>
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Activity className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-gray-900 leading-none">{kpi.activeCustomers.value}</div>
              <p className="text-xs text-gray-400 mt-2 font-medium">Total Clients</p>
              <div className="mt-3 h-1 w-full bg-indigo-50 rounded-full"><div className="h-1 bg-indigo-500 rounded-full" style={{ width: '90%' }} /></div>
            </div>
          </div>
        </div>

        {/* Goals Board */}
        <div className="xl:col-span-1 bg-gradient-to-br from-[#1b2f63] via-[#1e3570] to-[#12224d] rounded-2xl shadow-xl border border-[#2a3f75] p-6 text-white flex flex-col relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/5" />
          <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full bg-white/5" />

          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="p-2 bg-white/10 rounded-xl border border-white/10">
                <Target className="w-4 h-4 text-amber-300" />
              </div>
              <h2 className="text-base font-extrabold tracking-tight">{goalsBoard.targetYear} Goals</h2>
            </div>

            <div className="space-y-4 flex-1">
              <div>
                <p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest mb-1">Sales Target</p>
                <p className="text-xl font-extrabold tracking-tight break-all leading-tight">₹{goalsBoard.salesTarget.toLocaleString('en-IN')}</p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest">Achieved</p>
                  <span className="text-xs font-extrabold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">{goalsBoard.progress}%</span>
                </div>
                <p className="text-lg font-extrabold text-emerald-400 tracking-tight break-all leading-tight">₹{goalsBoard.achieved.toLocaleString('en-IN')}</p>

                <div className="w-full bg-white/10 rounded-full h-2 mt-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-400 to-green-300 h-2 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${goalsBoard.progress}%` }}
                  />
                </div>
              </div>

              <div className="flex justify-between items-start pt-3 border-t border-white/10 gap-2">
                <div className="shrink-0">
                  <div className="flex items-center gap-1 text-blue-300 mb-1">
                    <CalendarDays className="w-3 h-3" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">Days Left</p>
                  </div>
                  <p className="text-lg font-extrabold">{goalsBoard.daysLeft}</p>
                </div>
                <div className="text-right min-w-0">
                  <div className="flex items-center justify-end gap-1 text-blue-300 mb-1">
                    <TrendingUpIcon className="w-3 h-3" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">Per Day</p>
                  </div>
                  <p className="text-sm font-extrabold tracking-tight break-all">₹{Math.ceil(goalsBoard.perDayRequired).toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Charts Row 1: Revenue + Order Status ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Revenue Area Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col">
          <div className="flex justify-between items-start mb-5">
            <div>
              <h2 className="text-base font-bold text-gray-900">Monthly Revenue</h2>
              <p className="text-xs text-gray-400 mt-0.5">Last 6 months · ₹ in lakhs</p>
            </div>
            <div className="text-right">
              <div className="text-xl font-extrabold text-gray-900">{kpi.monthlyRevenue.value}</div>
              <div className="text-xs font-medium text-emerald-500 mt-1 flex items-center justify-end gap-1">
                <TrendingUp className="w-3 h-3" /> {kpi.monthlyRevenue.subtitle}
              </div>
            </div>
          </div>
          <div className="flex-1 min-h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.revenueLine} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1b2f63" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#1b2f63" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} dx={-8} domain={[0, 100]} tickFormatter={(val) => `₹${val}L`} />
                <RechartsTooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 40px -4px rgba(0,0,0,0.15)', backgroundColor: '#1b2f63', color: '#fff', fontSize: 12 }}
                  formatter={(value) => [`₹${value}L`, 'Revenue']}
                  labelStyle={{ color: '#93c5fd' }}
                />
                <Area type="monotone" dataKey="value" stroke="#1b2f63" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2.5} dot={{ fill: '#1b2f63', r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: '#fff', stroke: '#1b2f63', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Order Status Donut */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col">
          <div className="mb-4">
            <h2 className="text-base font-bold text-gray-900">Order Status</h2>
            <p className="text-xs text-gray-400 mt-0.5">Current month breakdown</p>
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={charts.orderStatus} innerRadius={52} outerRadius={76} paddingAngle={3} dataKey="value" stroke="none">
                    {charts.orderStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2.5 mt-2">
              {charts.orderStatus.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-xs font-medium text-gray-600">{item.name}</span>
                  </div>
                  <span className="text-xs font-bold text-gray-900 bg-gray-50 px-2 py-0.5 rounded-full">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Charts Row 2: Production Stages + Recent Activities ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Production Stages Bar */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-gray-900">Production Stages</h2>
              <p className="text-xs text-gray-400 mt-0.5">Jobs per pipeline stage</p>
            </div>
            <div className="p-2 bg-amber-50 rounded-xl">
              <Factory className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.productionStages} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} stroke="#f1f5f9" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={95} tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }} />
                <RechartsTooltip cursor={{ fill: 'rgba(27,47,99,0.04)' }} contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', fontSize: 12 }} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={18}>
                  {charts.productionStages.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={['#1b2f63', '#2a4494', '#4f6fbd', '#7896d4', '#a8b9e8', '#d0daef'][index % 6]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activities Timeline */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-gray-900">Recent Activities</h2>
              <p className="text-xs text-gray-400 mt-0.5">Latest plant updates</p>
            </div>
            <div className="p-2 bg-indigo-50 rounded-xl">
              <Activity className="w-4 h-4 text-indigo-600" />
            </div>
          </div>
          <div className="space-y-4 overflow-y-auto max-h-60 pr-1">
            {charts.recentActivities.map((activity, idx) => (
              <div key={activity.id} className="flex gap-3 relative">
                {idx !== charts.recentActivities.length - 1 && (
                  <div className="absolute top-7 left-3.5 bottom-0 w-px bg-gray-100 -mb-4" />
                )}
                <div className="w-7 h-7 rounded-full bg-[#1b2f63]/8 border-2 border-[#1b2f63]/15 flex items-center justify-center flex-shrink-0 z-10">
                  <div className="w-2 h-2 rounded-full bg-[#1b2f63]" />
                </div>
                <div className="pt-0.5">
                  <p className="text-sm font-semibold text-gray-800 leading-snug">{activity.text}</p>
                  <p className="text-[11px] text-gray-400 mt-1 font-medium">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Business Intelligence Strip ── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1 h-6 rounded-full bg-gradient-to-b from-violet-500 to-violet-600" />
          <h2 className="text-sm font-extrabold text-gray-700 uppercase tracking-widest">Business Intelligence</h2>
          <div className="flex-1 h-px bg-gray-100" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* YTD Revenue */}
          <div className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl p-5 text-white relative overflow-hidden shadow-lg">
            <div className="absolute top-0 right-0 w-16 h-16 rounded-full bg-white/10 -translate-y-1/3 translate-x-1/3" />
            <p className="text-[10px] font-bold text-violet-200 uppercase tracking-widest mb-3">YTD Revenue</p>
            <p className="text-2xl font-extrabold leading-none">₹{orderAnalytics.ytdRevenue >= 100000 ? `${(orderAnalytics.ytdRevenue / 100000).toFixed(1)}L` : orderAnalytics.ytdRevenue.toLocaleString('en-IN')}</p>
            <p className="text-xs text-violet-200 mt-2">{orderAnalytics.totalOrders} orders this year</p>
          </div>
          {/* Avg Order Value */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Avg Order Value</p>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <IndianRupee className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-gray-900">₹{orderAnalytics.avgOrderValue >= 100000 ? `${(orderAnalytics.avgOrderValue / 100000).toFixed(1)}L` : Math.round(orderAnalytics.avgOrderValue).toLocaleString('en-IN')}</p>
            <p className="text-xs text-gray-400 mt-2">Per order average</p>
          </div>
          {/* Lead Conversion */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Lead Conversion</p>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-gray-900">{leadConversion.rate}<span className="text-lg text-gray-400">%</span></p>
            <div className="mt-2 h-1 w-full bg-gray-100 rounded-full"><div className="h-1 bg-emerald-500 rounded-full" style={{ width: `${leadConversion.rate}%` }} /></div>
            <p className="text-xs text-gray-400 mt-1">{leadConversion.won} won · {leadConversion.active} active</p>
          </div>
          {/* Invoice Collection Rate */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Collection Rate</p>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Wallet className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-gray-900">{invoiceHealth.collectionRate}<span className="text-lg text-gray-400">%</span></p>
            <div className="mt-2 h-1 w-full bg-gray-100 rounded-full"><div className="h-1 bg-amber-500 rounded-full" style={{ width: `${invoiceHealth.collectionRate}%` }} /></div>
            <p className="text-xs text-gray-400 mt-1">{invoiceHealth.count.Paid} paid · {invoiceHealth.count.Overdue} overdue</p>
          </div>
        </div>
      </div>

      {/* ── Sales & Lead Analytics ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Top Customers by Revenue */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-gray-900">Top Customers</h2>
              <p className="text-xs text-gray-400 mt-0.5">By total order revenue</p>
            </div>
            <div className="p-2 bg-blue-50 rounded-xl">
              <Activity className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          {topCustomers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-300">
              <ShoppingCart className="w-8 h-8 mb-2" />
              <p className="text-sm">No order data yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topCustomers.map((c, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#1b2f63]/10 text-[#1b2f63] flex items-center justify-center text-[10px] font-extrabold flex-shrink-0">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-xs font-semibold text-gray-800 truncate">{c.name}</p>
                      <p className="text-xs font-bold text-gray-900 ml-2 flex-shrink-0">₹{c.total >= 100000 ? `${(c.total / 100000).toFixed(1)}L` : c.total.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-1.5 rounded-full transition-all duration-700"
                        style={{ width: `${c.pct}%`, backgroundColor: ['#1b2f63', '#2a4494', '#4f6fbd', '#7896d4', '#a8b9e8', '#d0daef'][i] }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">{c.count} order{c.count !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Monthly Orders Trend */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-gray-900">Monthly Orders</h2>
              <p className="text-xs text-gray-400 mt-0.5">Last 6 months · orders & revenue</p>
            </div>
            <div className="p-2 bg-violet-50 rounded-xl">
              <TrendingUp className="w-4 h-4 text-violet-600" />
            </div>
          </div>
          <div className="flex-1 min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyOrderTrend} margin={{ top: 5, right: 0, left: -20, bottom: 0 }} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
                <RechartsTooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 40px -4px rgba(0,0,0,0.15)', fontSize: 12 }}
                  formatter={(value, name) => [value, name === 'count' ? 'Orders' : 'Revenue']}
                  labelStyle={{ fontWeight: 700, color: '#374151' }}
                />
                <Bar dataKey="count" name="count" radius={[6, 6, 0, 0]}>
                  {monthlyOrderTrend.map((entry, index) => (
                    <Cell
                      key={`bar-${index}`}
                      fill={index === monthlyOrderTrend.length - 1 ? '#1b2f63' : '#a8b9e8'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Mini stats row */}
          <div className="mt-4 pt-4 border-t border-gray-50 grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-lg font-extrabold text-gray-900">{monthlyOrderTrend.reduce((a, m) => a + m.count, 0)}</p>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Total</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-extrabold text-[#1b2f63]">{monthlyOrderTrend[monthlyOrderTrend.length - 1]?.count ?? 0}</p>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">This Month</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-extrabold text-emerald-600">
                ₹{(() => { const rev = monthlyOrderTrend[monthlyOrderTrend.length - 1]?.revenue || 0; return rev >= 100000 ? `${(rev / 100000).toFixed(1)}L` : Math.round(rev / 1000) + 'K'; })()}
              </p>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Revenue</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Lead Pipeline (Full Width) ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 pt-6 pb-4 border-b border-gray-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-xl">
              <Target className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Lead Pipeline</h2>
              <p className="text-xs text-gray-400 mt-0.5">All 5 stages · {leadConversion.total} total leads</p>
            </div>
          </div>
          {/* Stats pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total</span>
              <span className="text-sm font-extrabold text-gray-900">{leadConversion.total}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-xl border border-blue-100">
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Active</span>
              <span className="text-sm font-extrabold text-blue-700">{leadConversion.active}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-xl border border-emerald-100">
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Won</span>
              <span className="text-sm font-extrabold text-emerald-700">{leadConversion.won}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-[#1b2f63] to-[#2a4494] rounded-xl">
              <TrendingUp className="w-3.5 h-3.5 text-blue-300" />
              <span className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">Conversion</span>
              <span className="text-sm font-extrabold text-white">{leadConversion.rate}%</span>
            </div>
          </div>
        </div>

        {/* 5-Stage Cards Grid */}
        <div className="p-6">
          {(() => {
            const allStages = ['New Inquiry', 'Follow Up', 'Quotation Sent', 'Won', 'Lost'];
            const stageColors = {
              'New Inquiry': { bg: '#6366f1', light: '#eef2ff', text: '#4338ca', border: '#c7d2fe' },
              'Follow Up': { bg: '#3b82f6', light: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
              'Quotation Sent': { bg: '#f59e0b', light: '#fffbeb', text: '#b45309', border: '#fde68a' },
              'Won': { bg: '#10b981', light: '#ecfdf5', text: '#065f46', border: '#a7f3d0' },
              'Lost': { bg: '#ef4444', light: '#fef2f2', text: '#991b1b', border: '#fecaca' },
            };
            const pipelineMap = {};
            leadPipeline.forEach(s => { pipelineMap[s.name] = s; });
            return (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {allStages.map(stageName => {
                  const stage = pipelineMap[stageName] || { name: stageName, value: 0, pct: 0 };
                  const c = stageColors[stageName];
                  return (
                    <div key={stageName} className="rounded-2xl border p-4 flex flex-col gap-3 transition-all hover:shadow-md" style={{ backgroundColor: c.light, borderColor: c.border }}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-bold leading-tight" style={{ color: c.text }}>{stageName}</p>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-extrabold text-white flex-shrink-0" style={{ backgroundColor: c.bg }}>
                          {stage.value}
                        </div>
                      </div>
                      <div className="h-2 w-full bg-white/70 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${Math.max(stage.pct, stage.value > 0 ? 6 : 0)}%`, backgroundColor: c.bg }}
                        />
                      </div>
                      <p className="text-2xl font-extrabold" style={{ color: c.bg }}>
                        {stage.pct}<span className="text-sm font-bold opacity-60">%</span>
                      </p>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* Bottom stacked bar + legend */}
        <div className="px-6 pb-5 border-t border-gray-50 pt-4">
          <div className="flex items-center gap-2 mb-1.5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Overall Pipeline Distribution</p>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">{leadConversion.rate}% Conversion Rate</span>
          </div>
          <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden flex">
            {leadPipeline.filter(s => s.pct > 0).map((stage, idx, arr) => {
              const colors = { 'New Inquiry': '#6366f1', 'Follow Up': '#3b82f6', 'Quotation Sent': '#f59e0b', 'Won': '#10b981', 'Lost': '#ef4444' };
              return (
                <div
                  key={stage.name}
                  className="h-full transition-all duration-700"
                  style={{ width: `${stage.pct}%`, backgroundColor: colors[stage.name] || '#94a3b8', borderRadius: idx === 0 ? '9999px 0 0 9999px' : idx === arr.length - 1 ? '0 9999px 9999px 0' : '0' }}
                  title={`${stage.name}: ${stage.value} (${stage.pct}%)`}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-4 mt-2.5">
            {['New Inquiry', 'Follow Up', 'Quotation Sent', 'Won', 'Lost'].map(stageName => {
              const stage = leadPipeline.find(s => s.name === stageName) || { value: 0 };
              const colors = { 'New Inquiry': '#6366f1', 'Follow Up': '#3b82f6', 'Quotation Sent': '#f59e0b', 'Won': '#10b981', 'Lost': '#ef4444' };
              return (
                <div key={stageName} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors[stageName] }} />
                  <span className="text-[11px] text-gray-600 font-semibold">{stageName}</span>
                  <span className="text-[11px] text-gray-400">({stage.value})</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Financial & Operations Health ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Invoice Health Donut */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">Invoice Health</h2>
              <p className="text-xs text-gray-400 mt-0.5">{invoiceHealth.total} total invoices</p>
            </div>
            <div className="p-2 bg-green-50 rounded-xl">
              <IndianRupee className="w-4 h-4 text-green-600" />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Paid', value: invoiceHealth.count.Paid, color: '#10b981' },
                  { name: 'Pending', value: invoiceHealth.count.Pending, color: '#f59e0b' },
                  { name: 'Overdue', value: invoiceHealth.count.Overdue, color: '#ef4444' },
                ].filter(d => d.value > 0)}
                innerRadius={42} outerRadius={62} paddingAngle={3} dataKey="value" stroke="none"
              >
                {[{ name: 'Paid', color: '#10b981' }, { name: 'Pending', color: '#f59e0b' }, { name: 'Overdue', color: '#ef4444' }].map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <RechartsTooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-1">
            {[{ label: 'Paid', count: invoiceHealth.count.Paid, amount: invoiceHealth.amounts.Paid, color: 'bg-emerald-500' },
            { label: 'Pending', count: invoiceHealth.count.Pending, amount: invoiceHealth.amounts.Pending, color: 'bg-amber-500' },
            { label: 'Overdue', count: invoiceHealth.count.Overdue, amount: invoiceHealth.amounts.Overdue, color: 'bg-red-500' }].map(row => (
              <div key={row.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${row.color}`} />
                  <span className="text-xs text-gray-600 font-medium">{row.label}</span>
                  <span className="text-[10px] text-gray-400">({row.count})</span>
                </div>
                <span className="text-xs font-bold text-gray-900">₹{row.amount >= 100000 ? `${(row.amount / 100000).toFixed(1)}L` : row.amount.toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Production Health */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-gray-900">Production Health</h2>
              <p className="text-xs text-gray-400 mt-0.5">Active jobs by status</p>
            </div>
            <div className="p-2 bg-emerald-50 rounded-xl">
              <Factory className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <div className="space-y-4">
            {productionHealth.map(item => (
              <div key={item.name}>
                <div className="flex justify-between items-center mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs font-semibold text-gray-700">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-900">{item.count}</span>
                    <span className="text-[10px] text-gray-400">{item.pct}%</span>
                  </div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${item.pct}%`, backgroundColor: item.color }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-50">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400 font-medium">Total Active Jobs</span>
              <span className="font-extrabold text-gray-900">{productionHealth.reduce((a, b) => a + b.count, 0)}</span>
            </div>
          </div>
        </div>

        {/* Overdue Accounts + Inventory Alerts */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">Alerts & Attention</h2>
              <p className="text-xs text-gray-400 mt-0.5">Items needing action</p>
            </div>
            <div className="p-2 bg-red-50 rounded-xl">
              <Wallet className="w-4 h-4 text-red-500" />
            </div>
          </div>
          <div className="space-y-2 flex-1 overflow-y-auto max-h-52">
            {overdueAccounts.byCustomer.length === 0 && lowStockItems.length === 0 ? (
              <div className="text-center text-gray-300 py-8">
                <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm font-medium">All clear!</p>
              </div>
            ) : (
              <>
                {overdueAccounts.byCustomer.slice(0, 4).map(c => (
                  <div key={c.customerId} className="flex items-center justify-between p-2.5 bg-red-50 rounded-xl border border-red-100">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                      <p className="text-xs font-semibold text-gray-800 truncate">{c.customerName}</p>
                    </div>
                    <span className="text-xs font-bold text-red-600 flex-shrink-0 ml-2">₹{c.amount >= 100000 ? `${(c.amount / 100000).toFixed(1)}L` : c.amount.toLocaleString('en-IN')}</span>
                  </div>
                ))}
                {lowStockItems.slice(0, 3).map(item => (
                  <div key={item.id} className="flex items-center justify-between p-2.5 bg-amber-50 rounded-xl border border-amber-100">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                      <p className="text-xs font-semibold text-gray-800 truncate">{item.material}</p>
                    </div>
                    <span className="text-xs font-bold text-amber-600 flex-shrink-0 ml-2">{item.stock} {item.unit}</span>
                  </div>
                ))}
              </>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-50 grid grid-cols-2 gap-2">
            <div className="text-center p-2 bg-red-50 rounded-xl">
              <p className="text-lg font-extrabold text-red-600">{overdueAccounts.byCustomer.length}</p>
              <p className="text-[10px] text-red-400 font-semibold">Overdue</p>
            </div>
            <div className="text-center p-2 bg-amber-50 rounded-xl">
              <p className="text-lg font-extrabold text-amber-600">{lowStockItems.length}</p>
              <p className="text-[10px] text-amber-400 font-semibold">Low Stock</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Team by Designation ── */}
      {users.length > 0 && (() => {
        const DESG_COLORS = [
          { gradient: 'from-blue-500 to-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500', avatar: 'bg-blue-500 text-white' },
          { gradient: 'from-purple-500 to-purple-600', bg: 'bg-purple-50', border: 'border-purple-100', badge: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500', avatar: 'bg-purple-500 text-white' },
          { gradient: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', avatar: 'bg-emerald-500 text-white' },
          { gradient: 'from-orange-500 to-orange-600', bg: 'bg-orange-50', border: 'border-orange-100', badge: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500', avatar: 'bg-orange-500 text-white' },
          { gradient: 'from-pink-500 to-pink-600', bg: 'bg-pink-50', border: 'border-pink-100', badge: 'bg-pink-100 text-pink-700', dot: 'bg-pink-500', avatar: 'bg-pink-500 text-white' },
          { gradient: 'from-cyan-500 to-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-100', badge: 'bg-cyan-100 text-cyan-700', dot: 'bg-cyan-500', avatar: 'bg-cyan-500 text-white' },
          { gradient: 'from-amber-500 to-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500', avatar: 'bg-amber-500 text-white' },
        ];

        const grouped = {};
        users.forEach(u => {
          const desg = u.designation || 'Unassigned';
          if (!grouped[desg]) grouped[desg] = [];
          grouped[desg].push(u);
        });
        const groups = Object.entries(grouped).sort((a, b) => b[1].length - a[1].length);

        return (
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold text-gray-900">Team by Designation</h2>
                <p className="text-xs text-gray-400 mt-0.5">{users.length} registered users · {groups.length} designation{groups.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="hidden sm:flex flex-wrap gap-2">
                {groups.map(([desg, members], i) => {
                  const c = DESG_COLORS[i % DESG_COLORS.length];
                  return (
                    <span key={desg} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${c.badge} border ${c.border}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                      {desg} · {members.length}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {groups.map(([desg, members], i) => {
                const c = DESG_COLORS[i % DESG_COLORS.length];
                return (
                  <div key={desg} className={`rounded-2xl border ${c.border} bg-white overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300`}>
                    {/* Gradient Header */}
                    <div className={`bg-gradient-to-r ${c.gradient} px-4 py-3 flex items-center justify-between`}>
                      <h3 className="font-bold text-white text-sm truncate">{desg}</h3>
                      <span className="ml-2 flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-full bg-white/20 text-white">
                        {members.length}
                      </span>
                    </div>
                    {/* User list */}
                    <div className={`p-3 space-y-2 max-h-48 overflow-y-auto ${c.bg}`}>
                      {members.map(u => (
                        <div key={u._id || u.email} className="flex items-center gap-2.5 bg-white rounded-xl px-3 py-2 border border-white shadow-sm">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${c.avatar}`}>
                            {(u.name || '?').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate leading-tight">{u.name}</p>
                            <p className="text-[10px] text-gray-400 truncate leading-tight">{u.email}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Quick Assign Task Modal */}
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
                  onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1b2f63]/50 focus:border-[#1b2f63]"
                  placeholder="TASK TITLE"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  {!isTaskRecording && (
                    <button
                      type="button"
                      onClick={startTaskRecording}
                      className="text-xs flex items-center gap-1 font-medium transition-colors text-blue-500 hover:text-blue-600"
                    >
                      <Mic className="w-3.5 h-3.5" /> Add Voice Note
                    </button>
                  )}
                  {isTaskRecording && (
                    <button
                      type="button"
                      onClick={stopTaskRecording}
                      className="text-xs flex items-center gap-1 font-medium transition-colors text-red-500 hover:text-red-600 animate-pulse"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" /> Stop Recording
                    </button>
                  )}
                </div>
                <textarea
                  rows={3}
                  value={taskFormData.description}
                  onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1b2f63]/50 focus:border-[#1b2f63] resize-none"
                  placeholder="PROVIDE TASK DETAILS..."
                />

                {/* Render Audio Notes */}
                {((taskFormData.audioUrls && taskFormData.audioUrls.length > 0) || taskAudioBlobs.length > 0) && (
                  <div className="space-y-2 mt-2">
                    {taskFormData.audioUrls && taskFormData.audioUrls.map((url, idx) => (
                      <div key={`url-${idx}`} className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                            <Mic className="w-4 h-4" />
                          </div>
                          <audio src={url} controls className="h-8 max-w-[200px]" />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setTaskFormData(prev => ({
                              ...prev,
                              audioUrls: prev.audioUrls.filter((_, i) => i !== idx)
                            }));
                          }}
                          className="text-red-500 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {taskAudioBlobs.map((blob, idx) => (
                      <div key={`new-${idx}`} className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                            <Mic className="w-4 h-4" />
                          </div>
                          <audio src={URL.createObjectURL(blob)} controls className="h-8 max-w-[200px]" />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setTaskAudioBlobs(prev => prev.filter((_, i) => i !== idx));
                          }}
                          className="text-red-500 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assign To *</label>
                  <CustomSelect
                    options={[
                      ...(isAdmin ? [{ label: currentUser?.profile?.name || currentUser?.displayName || 'BHUPAT BHUT', value: currentUser?.profile?.name || currentUser?.displayName || 'BHUPAT BHUT' }] : []),
                      ...users.map(u => ({ label: u.name, value: u.name }))
                    ]}
                    value={taskFormData.assignedTo}
                    onChange={(e) => setTaskFormData({ ...taskFormData, assignedTo: e.target.value })}
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
                    value={taskFormData.priority}
                    onChange={(e) => setTaskFormData({ ...taskFormData, priority: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="datetime-local"
                    value={taskFormData.dueDate}
                    onChange={(e) => setTaskFormData({ ...taskFormData, dueDate: e.target.value })}
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
                    onChange={(e) => setTaskFormData({ ...taskFormData, status: e.target.value })}
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