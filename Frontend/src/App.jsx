import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';

import { StoreProvider } from './context/StoreContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';

import RequireAuth from './components/RequireAuth.jsx';
import RequireAdmin from './components/RequireAdmin.jsx';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import Toast from './components/Toast.jsx';

import Home from './pages/Home.jsx';
import Shop from './pages/Shop.jsx';
import Product from './pages/Product.jsx';
import Cart from './pages/Cart.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Checkout from './pages/Checkout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import PaymentSuccess from './pages/PaymentSuccess.jsx';
import Admin from './pages/Admin.jsx';

export default function App() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <AuthProvider>
      <StoreProvider>
        <Navbar />

        <Routes>
          <Route path="/" element={<Home />} />

          <Route path="/shop" element={<Shop />} />
          <Route path="/shop/:cat" element={<Shop />} />

          <Route path="/product/:id" element={<Product />} />

          <Route path="/cart" element={<Cart />} />

          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            path="/checkout"
            element={
              <RequireAuth>
                <Checkout />
              </RequireAuth>
            }
          />

          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />

          <Route
            path="/dashboard/:tab"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <Admin />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/:tab"
            element={
              <RequireAdmin>
                <Admin />
              </RequireAdmin>
            }
          />
          <Route path="/payment-success" element={<PaymentSuccess />} />
        </Routes>

        <Footer />
        <Toast />
      </StoreProvider>
    </AuthProvider>
  );
}
