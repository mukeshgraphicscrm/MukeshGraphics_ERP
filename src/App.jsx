import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import Login from './pages/Login';

// Page imports
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Leads from './pages/Leads';
import Quotations from './pages/Quotations';
import Orders from './pages/Orders';
import Products from './pages/Products';

import Production from './pages/Production';
import Inventory from './pages/Inventory';
import Purchase from './pages/Purchase';
import Dispatch from './pages/Dispatch';
import Accounts from './pages/Accounts';
import Jobcard from './pages/Jobcard';
import Settings from './pages/Settings';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="customers" element={<Customers />} />
              <Route path="leads" element={<Leads />} />
              <Route path="quotations" element={<Quotations />} />
              <Route path="orders" element={<Orders />} />
              <Route path="products" element={<Products />} />
              <Route path="jobcard" element={<Jobcard />} />
              <Route path="production" element={<Production />} />
              <Route path="dispatch" element={<Dispatch />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="purchase" element={<Purchase />} />
              <Route path="accounts" element={<Accounts />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </AuthProvider>
  );
}

export default App;
