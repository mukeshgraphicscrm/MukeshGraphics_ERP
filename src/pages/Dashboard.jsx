import React, { useState, useEffect } from 'react';
import { ShoppingCart, Factory, CheckCircle, Truck, Wallet, IndianRupee, TrendingUp, Activity } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar
} from 'recharts';
import KpiCard from '../components/KpiCard';
import api from '../lib/api';
import { cn } from '../lib/utils';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/kpi')
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching dashboard data:', err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading Executive Dashboard...</div>;
  if (!data) return <div className="p-8 text-center text-red-500">Failed to load dashboard data.</div>;

  const { kpi, charts } = data;

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Executive Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back, Mukesh — here's how the plant is running today.</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard title="Total Orders" value={kpi.totalOrders.value} subtitle={kpi.totalOrders.subtitle} icon={ShoppingCart} color="info" />
        <KpiCard title="Running Jobs" value={kpi.runningJobs.value} subtitle={kpi.runningJobs.subtitle} icon={Factory} color="sky" />
        <KpiCard title="Completed (Month)" value={kpi.completedMonth.value} subtitle={kpi.completedMonth.subtitle} icon={CheckCircle} color="success" />
        <KpiCard title="Pending Dispatches" value={kpi.pendingDispatches.value} subtitle={kpi.pendingDispatches.subtitle} icon={Truck} color="warning" />

        <KpiCard title="Pending Payments" value={kpi.pendingPayments.value} subtitle={kpi.pendingPayments.subtitle} icon={Wallet} color="danger" />
        <KpiCard title="Monthly Revenue" value={kpi.monthlyRevenue.value} subtitle={kpi.monthlyRevenue.subtitle} icon={IndianRupee} color="warning" />
        <KpiCard title="Monthly Profit" value={kpi.monthlyProfit.value} subtitle={kpi.monthlyProfit.subtitle} icon={TrendingUp} color="success" />
        <KpiCard title="Active Customers" value={kpi.activeCustomers.value} subtitle={kpi.activeCustomers.subtitle} icon={Activity} color="indigo" />
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
