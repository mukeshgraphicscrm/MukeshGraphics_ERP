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
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!currentUser) return;
    try {
      const [
        custRes, prodRes, catRes, leadsRes, ordersRes, quotRes,
        dspRes, invRes, inventoryRes, jobsRes, poRes, grnRes, supRes, artRes, dashRes
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
        api.get('/dashboard/kpi'),
      ]);

      const toArr = (val) => (Array.isArray(val) ? val : []);

      if (custRes.status === 'fulfilled') setCustomers(toArr(custRes.value.data));
      if (prodRes.status === 'fulfilled') setProducts(toArr(prodRes.value.data));
      if (catRes.status === 'fulfilled') setCategories(toArr(catRes.value.data));
      if (leadsRes.status === 'fulfilled') setLeads(toArr(leadsRes.value.data));
      if (ordersRes.status === 'fulfilled') setOrders(toArr(ordersRes.value.data));
      if (quotRes.status === 'fulfilled') setQuotations(toArr(quotRes.value.data));
      if (dspRes.status === 'fulfilled') setDispatches(toArr(dspRes.value.data));
      if (invRes.status === 'fulfilled') setInvoices(toArr(invRes.value.data));
      if (inventoryRes.status === 'fulfilled') setInventory(toArr(inventoryRes.value.data));
      if (jobsRes.status === 'fulfilled') setProductionJobs(toArr(jobsRes.value.data));
      if (poRes.status === 'fulfilled') setPurchaseOrders(toArr(poRes.value.data));
      if (grnRes.status === 'fulfilled') setGrnData(toArr(grnRes.value.data));
      if (supRes.status === 'fulfilled') setSuppliers(toArr(supRes.value.data));
      if (artRes.status === 'fulfilled') setArtworks(toArr(artRes.value.data));
      if (dashRes.status === 'fulfilled') setDashboardData(dashRes.value.data);
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
      setDashboardData(null);
    }
  }, [currentUser, isLoaded, fetchAll]);

  // Helper maps derived from arrays — Array.isArray guards prevent crashes if any state is non-array
  const customerMap = React.useMemo(() => {
    const m = {};
    if (Array.isArray(customers)) customers.forEach(c => (m[c.id] = c));
    return m;
  }, [customers]);

  const productMap = React.useMemo(() => {
    const m = {};
    if (Array.isArray(products)) products.forEach(p => (m[p.id] = p));
    return m;
  }, [products]);

  const supplierMap = React.useMemo(() => {
    const m = {};
    if (Array.isArray(suppliers)) suppliers.forEach(s => (m[s.id] = s));
    return m;
  }, [suppliers]);

  const leadMap = React.useMemo(() => {
    const m = {};
    if (Array.isArray(leads)) leads.forEach(l => (m[l.id] = l));
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
    dashboardData, setDashboardData,
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
