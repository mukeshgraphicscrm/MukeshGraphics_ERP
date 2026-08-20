const express = require('express');
const { db } = require('../firebase');

const router = express.Router();

router.get('/kpi', async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not initialized' });
  
  try {
    const [ordersSnapshot, customersSnapshot, jobsSnapshot] = await Promise.all([
      db.collection('orders').get(),
      db.collection('customers').get(),
      db.collection('productionJobs').get()
    ]);

    const totalOrdersCount = ordersSnapshot.size;
    const activeCustomersCount = customersSnapshot.size;

    let completedCount = 0;
    let runningCount = 0;
    let pendingCount = 0;
    let delayedCount = 0;
    let totalRevenue = 0;

    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return {
        monthIndex: d.getMonth(),
        year: d.getFullYear(),
        name: d.toLocaleString('default', { month: 'short' }),
        value: 0
      };
    });

    const activities = [];

    ordersSnapshot.forEach(doc => {
      const order = doc.data();
      const status = (order.status || 'Pending').toLowerCase();

      if (status.includes('complet') || status.includes('ready') || status.includes('dispatch')) {
        completedCount++;
      } else if (status.includes('run') || status.includes('progress') || status.includes('active')) {
        runningCount++;
      } else if (status.includes('delay') || status.includes('hold')) {
        delayedCount++;
      } else {
        pendingCount++;
      }

      const amount = order.amount || 0;
      let numericAmount = 0;
      if (typeof amount === 'number') {
        numericAmount = amount;
      } else if (typeof amount === 'string') {
        numericAmount = parseFloat(amount.replace(/[^0-9.-]+/g, "")) || 0;
      }
      totalRevenue += numericAmount;

      const orderDate = order.createdAt ? new Date(order.createdAt) : (order.date ? new Date(order.date) : null);
      if (orderDate) {
        const m = orderDate.getMonth();
        const y = orderDate.getFullYear();
        const monthObj = last6Months.find(lm => lm.monthIndex === m && lm.year === y);
        if (monthObj) {
          monthObj.value += (numericAmount / 100000); // in lakhs
        }
        
        activities.push({
          id: `order_${doc.id}`,
          text: `New order created for ${order.customerName || 'customer'}`,
          time: orderDate,
          type: 'order'
        });
      }
    });

    let totalOutstanding = 0;
    customersSnapshot.forEach(doc => {
      const customer = doc.data();
      const outstanding = customer.outstanding || 0;
      if (typeof outstanding === 'number') {
        totalOutstanding += outstanding;
      } else if (typeof outstanding === 'string') {
        totalOutstanding += parseFloat(outstanding.replace(/[^0-9.-]+/g, "")) || 0;
      }
    });

    // Process Jobs for stages and activities
    const stageCounts = {
      'Printing': 0, 'Lamination': 0, 'Punching': 0, 'Striping': 0,
      'Pasting': 0, 'Ready To Dispatch': 0, 'Dispatched': 0, 'Start': 0
    };

    jobsSnapshot.forEach(doc => {
      const job = doc.data();
      if (job.stage && stageCounts[job.stage] !== undefined) {
        stageCounts[job.stage]++;
      } else if (job.stage) {
        stageCounts[job.stage] = 1;
      }

      const jobDate = job.createdAt ? new Date(job.createdAt) : null;
      if (jobDate) {
        activities.push({
          id: `job_${doc.id}`,
          text: `Production job ${job.jobCardNo || ''} started`,
          time: jobDate,
          type: 'job'
        });
      }
    });

    const revenueLakhs = (totalRevenue / 100000).toFixed(2);
    const profitLakhs = (totalRevenue * 0.15 / 100000).toFixed(2); // Estimated 15% profit margin

    // Sort activities by time desc and get top 5
    activities.sort((a, b) => b.time - a.time);
    const recentActivities = activities.slice(0, 5).map(a => {
      const diffMs = new Date() - a.time;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      let timeStr = 'Just now';
      if (diffDays > 0) timeStr = `${diffDays}d ago`;
      else if (diffHours > 0) timeStr = `${diffHours}h ago`;
      else if (diffMins > 0) timeStr = `${diffMins}m ago`;

      return { id: a.id, text: a.text, time: timeStr };
    });

    if (recentActivities.length === 0) {
      recentActivities.push({ id: 1, text: 'No recent activity.', time: '' });
    }

    const kpi = {
      totalOrders: { value: totalOrdersCount, subtitle: 'Total orders placed' },
      runningJobs: { value: runningCount, subtitle: 'Active in production' },
      completedMonth: { value: completedCount, subtitle: 'Completed or Ready' },
      pendingDispatches: { value: pendingCount, subtitle: 'Pending processing' },
      pendingPayments: { value: `₹${totalOutstanding.toLocaleString('en-IN')}`, subtitle: 'Total outstanding' },
      monthlyRevenue: { value: `₹${revenueLakhs}L`, subtitle: 'Current Month' },
      monthlyProfit: { value: `₹${profitLakhs}L`, subtitle: 'Estimated (15% margin)' },
      activeCustomers: { value: activeCustomersCount, subtitle: 'Total clients' },
    };

    const charts = {
      revenueLine: last6Months.map(lm => ({ name: lm.name, value: parseFloat(lm.value.toFixed(2)) })),
      orderStatus: [
        { name: 'Completed', value: completedCount, color: '#16A34A' },
        { name: 'Running', value: runningCount, color: '#2563EB' },
        { name: 'Pending', value: pendingCount, color: '#D97706' },
        { name: 'Delayed', value: delayedCount, color: '#DC2626' },
      ],
      productionStages: [
        { name: 'Start', value: stageCounts['Start'] || 0 },
        { name: 'Printing', value: stageCounts['Printing'] || 0 },
        { name: 'Lamination', value: stageCounts['Lamination'] || 0 },
        { name: 'Punching', value: stageCounts['Punching'] || 0 },
        { name: 'Striping', value: stageCounts['Striping'] || 0 },
        { name: 'Pasting', value: stageCounts['Pasting'] || 0 },
        { name: 'Ready To Dispatch', value: stageCounts['Ready To Dispatch'] || 0 },
        { name: 'Dispatched', value: stageCounts['Dispatched'] || 0 },
      ].filter(s => s.value > 0 || ['Printing', 'Lamination', 'Punching'].includes(s.name)),
      recentActivities
    };

    res.json({ kpi, charts });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
