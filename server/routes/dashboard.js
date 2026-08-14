const express = require('express');
const { db } = require('../firebase');

const router = express.Router();

router.get('/kpi', async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not initialized' });
  
  try {
    const [ordersSnapshot, customersSnapshot] = await Promise.all([
      db.collection('orders').get(),
      db.collection('customers').get()
    ]);

    const totalOrdersCount = ordersSnapshot.size;
    const activeCustomersCount = customersSnapshot.size;

    let completedCount = 0;
    let runningCount = 0;
    let pendingCount = 0;
    let delayedCount = 0;
    let totalRevenue = 0;

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
      if (typeof amount === 'number') {
        totalRevenue += amount;
      } else if (typeof amount === 'string') {
        totalRevenue += parseFloat(amount.replace(/[^0-9.-]+/g, "")) || 0;
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

    const revenueLakhs = (totalRevenue / 100000).toFixed(2);
    const profitLakhs = (totalRevenue * 0.15 / 100000).toFixed(2); // Estimated 15% profit margin

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
      revenueLine: [
        { name: 'Jan', value: 0 },
        { name: 'Feb', value: 0 },
        { name: 'Mar', value: 0 },
        { name: 'Apr', value: 0 },
        { name: 'May', value: 0 },
        { name: 'Jun', value: parseFloat(revenueLakhs) || 0 },
      ],
      orderStatus: [
        { name: 'Completed', value: completedCount, color: '#16A34A' },
        { name: 'Running', value: runningCount, color: '#2563EB' },
        { name: 'Pending', value: pendingCount, color: '#D97706' },
        { name: 'Delayed', value: delayedCount, color: '#DC2626' },
      ],
      productionStages: [
        { name: 'Printing', value: runningCount > 0 ? 1 : 0 },
        { name: 'Lamination', value: 0 },
        { name: 'Punching', value: 0 },
        { name: 'Striping', value: 0 },
        { name: 'Pasting', value: 0 },
        { name: 'Ready To Dispatch', value: 0 },
        { name: 'Dispatched', value: completedCount > 0 ? 1 : 0 },
      ],
      recentActivities: [
        { id: 1, text: 'Dashboard statistics updated.', time: 'Just now' }
      ]
    };

    res.json({ kpi, charts });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
