import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAppDispatch } from './hooks/useAppDispatch';
import { useAppSelector } from './hooks/useAppSelector';
import { fetchCurrentUser } from './store/slices/authSlice';
import { fetchCart } from './store/slices/cartSlice';

// Layouts
import UserLayout from './components/layout/UserLayout';
import AdminLayout from './components/layout/AdminLayout';
import ProtectedRoute from './components/common/ProtectedRoute';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// User Pages
import Home from './pages/user/Home';
import ProductList from './pages/user/ProductList';
import ProductDetail from './pages/user/ProductDetail';
import Cart from './pages/user/Cart';
import Checkout from './pages/user/Checkout';
import OrderHistory from './pages/user/OrderHistory';
import Profile from './pages/user/Profile';

// Admin Pages
import Dashboard from './pages/admin/Dashboard';
import Categories from './pages/admin/Categories';
import SubCategories from './pages/admin/SubCategories';
import Products from './pages/admin/Products';
import Orders from './pages/admin/Orders';
import Carts from './pages/admin/Carts';
import CancellationRequests from './pages/admin/CancellationRequests';
import ReturnRequests from './pages/admin/ReturnRequests';

// Staff Portals
import WarehousePortal from './pages/staff/WarehousePortal';
import DeliveryPartnerPortal from './pages/staff/DeliveryPartnerPortal';

const AppContent = () => {
  const dispatch = useAppDispatch();
  const { token, user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (token) {
      dispatch(fetchCurrentUser());
    }
  }, [dispatch, token]);

  useEffect(() => {
    if (user) {
      dispatch(fetchCart());
    }
  }, [dispatch, user]);

  return (
    <Routes>
      {/* Auth Pages - standalone, no layout wrapper */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* User Layout Routes */}
      <Route element={<UserLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<ProductList />} />
        <Route path="/products/:id" element={<ProductDetail />} />

        {/* Protected Customer Routes */}
        <Route
          path="/cart"
          element={
            <ProtectedRoute>
              <Cart />
            </ProtectedRoute>
          }
        />
        <Route
          path="/checkout"
          element={
            <ProtectedRoute>
              <Checkout />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <OrderHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Staff Portals — standalone, role-gated */}
      <Route
        path="/warehouse"
        element={
          <ProtectedRoute requireRole="warehouse_operator">
            <WarehousePortal />
          </ProtectedRoute>
        }
      />
      <Route
        path="/rider"
        element={
          <ProtectedRoute requireRole="delivery_partner">
            <DeliveryPartnerPortal />
          </ProtectedRoute>
        }
      />

      {/* Admin Layout Routes */}
      <Route
        element={
          <ProtectedRoute requireAdmin>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/admin/dashboard" element={<Dashboard />} />
        <Route path="/admin/categories" element={<Categories />} />
        <Route path="/admin/subcategories" element={<SubCategories />} />
        <Route path="/admin/products" element={<Products />} />
        <Route path="/admin/orders" element={<Orders />} />
        <Route path="/admin/cancellations" element={<CancellationRequests />} />
        <Route path="/admin/returns" element={<ReturnRequests />} />
        <Route path="/admin/carts" element={<Carts />} />
      </Route>
    </Routes>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <AppContent />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1e293b',
            color: '#fff',
            borderRadius: '0.75rem',
          },
        }}
      />
    </BrowserRouter>
  );
};

export default App;
