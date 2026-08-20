import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { useAuth } from './AuthContext';

const DataContext = createContext(null);

export function useData() {
  return useContext(DataContext);
}

export function DataProvider({ children }) {
  const { currentUser } = useAuth();

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [leads, setLeads] = useState([]);
  const [orders, setOrders] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [productionJobs, setProductionJobs] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [grnData, setGrnData] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [artworks, setArtworks] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [settings, setSettings] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!currentUser) return;
    try {
      const [
        custRes, prodRes, catRes, leadsRes, ordersRes, quotRes,
        dspRes, invRes, inventoryRes, jobsRes, poRes, grnRes, supRes, artRes, notifRes, dashRes, settingsRes
      ] = await Promise.allSettled([
        api.get('/customers'),
        api.get('/products'),
        api.get('/categories'),
        api.get('/leads'),
        api.get('/orders'),
        api.get('/quotations'),
        api.get('/dispatches'),
        api.get('/invoices'),
        api.get('/inventory'),
        api.get('/productionJobs'),
        api.get('/purchaseOrders'),
        api.get('/grn'),
        api.get('/suppliers'),
        api.get('/artworks'),
        api.get('/notifications'),
        api.get('/dashboard/kpi'),
        api.get('/settings'),
      ]);

      if (custRes.status === 'fulfilled') setCustomers(Array.isArray(custRes.value.data) ? custRes.value.data : []);
      if (prodRes.status === 'fulfilled') setProducts(Array.isArray(prodRes.value.data) ? prodRes.value.data : []);
      if (catRes.status === 'fulfilled') setCategories(Array.isArray(catRes.value.data) ? catRes.value.data : []);
      if (leadsRes.status === 'fulfilled') setLeads(Array.isArray(leadsRes.value.data) ? leadsRes.value.data : []);
      if (ordersRes.status === 'fulfilled') setOrders(Array.isArray(ordersRes.value.data) ? ordersRes.value.data : []);
      if (quotRes.status === 'fulfilled') setQuotations(Array.isArray(quotRes.value.data) ? quotRes.value.data : []);
      if (dspRes.status === 'fulfilled') setDispatches(Array.isArray(dspRes.value.data) ? dspRes.value.data : []);
      if (invRes.status === 'fulfilled') setInvoices(Array.isArray(invRes.value.data) ? invRes.value.data : []);
      if (inventoryRes.status === 'fulfilled') setInventory(Array.isArray(inventoryRes.value.data) ? inventoryRes.value.data : []);
      if (jobsRes.status === 'fulfilled') setProductionJobs(Array.isArray(jobsRes.value.data) ? jobsRes.value.data : []);
      if (poRes.status === 'fulfilled') setPurchaseOrders(Array.isArray(poRes.value.data) ? poRes.value.data : []);
      if (grnRes.status === 'fulfilled') setGrnData(Array.isArray(grnRes.value.data) ? grnRes.value.data : []);
      if (supRes.status === 'fulfilled') setSuppliers(Array.isArray(supRes.value.data) ? supRes.value.data : []);
      if (artRes.status === 'fulfilled') setArtworks(Array.isArray(artRes.value.data) ? artRes.value.data : []);
      
      if (notifRes.status === 'fulfilled') {
        const allNotifs = Array.isArray(notifRes.value.data) ? notifRes.value.data : [];
        setNotifications(allNotifs.filter(n => n.employee === currentUser?.profile?.name));
      } else {
        // Find notification response in Promise.allSettled array (index 14)
        try {
          const res = await api.get('/notifications');
          const allNotifs = Array.isArray(res.data) ? res.data : [];
          setNotifications(allNotifs.filter(n => n.employee === currentUser?.profile?.name));
        } catch(e) {}
      }

      if (dashRes.status === 'fulfilled') setDashboardData(dashRes.value.data);
      if (settingsRes.status === 'fulfilled') setSettings(Array.isArray(settingsRes.value.data) ? settingsRes.value.data : []);
    } catch (err) {
      console.error('DataContext fetch error:', err);
    } finally {
      setIsLoaded(true);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser && !isLoaded) {
      fetchAll();
    }
    if (!currentUser) {
      // Reset on logout
      setIsLoaded(false);
      setCustomers([]);
      setProducts([]);
      setCategories([]);
      setLeads([]);
      setOrders([]);
      setQuotations([]);
      setDispatches([]);
      setInvoices([]);
      setInventory([]);
      setProductionJobs([]);
      setPurchaseOrders([]);
      setGrnData([]);
      setSuppliers([]);
      setArtworks([]);
      setNotifications([]);
      setDashboardData(null);
      setSettings([]);
    }
  }, [currentUser, isLoaded, fetchAll]);

  // Helper maps derived from arrays — Array.isArray guards prevent crashes if any state is non-array
  const customerMap = React.useMemo(() => {
    const m = {};
    if (Array.isArray(customers)) {
      customers.forEach(c => (m[c.id] = c));
    }
    return m;
  }, [customers]);

  const productMap = React.useMemo(() => {
    const m = {};
    if (Array.isArray(products)) {
      products.forEach(p => (m[p.id] = p));
    }
    return m;
  }, [products]);

  const supplierMap = React.useMemo(() => {
    const m = {};
    if (Array.isArray(suppliers)) {
      suppliers.forEach(s => (m[s.id] = s));
    }
    return m;
  }, [suppliers]);

  const leadMap = React.useMemo(() => {
    const m = {};
    if (Array.isArray(leads)) {
      leads.forEach(l => (m[l.id] = l));
    }
    return m;
  }, [leads]);

  const value = {
    // raw lists
    customers, setCustomers,
    products, setProducts,
    categories, setCategories,
    leads, setLeads,
    orders, setOrders,
    quotations, setQuotations,
    dispatches, setDispatches,
    invoices, setInvoices,
    inventory, setInventory,
    productionJobs, setProductionJobs,
    purchaseOrders, setPurchaseOrders,
    grnData, setGrnData,
    suppliers, setSuppliers,
    artworks, setArtworks,
    notifications, setNotifications,
    dashboardData, setDashboardData,
    settings, setSettings,
    // helper maps
    customerMap,
    productMap,
    supplierMap,
    leadMap,
    // meta
    isLoaded,
    refetch: fetchAll,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
