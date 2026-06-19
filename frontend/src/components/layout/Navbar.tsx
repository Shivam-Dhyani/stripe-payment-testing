import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, Menu, X, LogOut, Package, ChevronDown } from 'lucide-react';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { logoutUser } from '../../store/slices/authSlice';

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const { user } = useAppSelector((state) => state.auth);
  const { items } = useAppSelector((state) => state.cart);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate('/login');
    setUserDropdownOpen(false);
  };

  const cartItemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <nav className="sticky top-0 z-50 bg-white shadow-theme-xs border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-800">ShopHub</span>
            </Link>
            <div className="hidden md:flex items-center ml-10 space-x-8">
              <Link to="/" className="text-gray-600 hover:text-brand-500 transition font-medium">
                Home
              </Link>
              <Link to="/products" className="text-gray-600 hover:text-brand-500 transition font-medium">
                Products
              </Link>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                {user.role === 'customer' && (
                  <Link to="/cart" className="relative p-2 text-gray-600 hover:text-brand-500 transition">
                    <ShoppingCart className="w-6 h-6" />
                    {cartItemCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-brand-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {cartItemCount}
                      </span>
                    )}
                  </Link>
                )}
                <div className="relative">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center space-x-2 text-gray-600 hover:text-brand-500 transition"
                  >
                    <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-brand-500" />
                    </div>
                    <span className="font-medium">{user.first_name}</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-theme-md border border-gray-200 py-1 z-50">
                      <Link
                        to="/profile"
                        onClick={() => setUserDropdownOpen(false)}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-500"
                      >
                        Profile
                      </Link>
                      <Link
                        to="/orders"
                        onClick={() => setUserDropdownOpen(false)}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-500"
                      >
                        My Orders
                      </Link>
                      {user.role === 'admin' && (
                        <Link
                          to="/admin/dashboard"
                          onClick={() => setUserDropdownOpen(false)}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-500"
                        >
                          Admin Dashboard
                        </Link>
                      )}
                      <hr className="my-1 border-gray-200" />
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="px-4 py-2 text-gray-600 hover:text-brand-500 font-medium transition"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition font-medium"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          <div className="md:hidden flex items-center">
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-gray-600">
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200 px-4 py-4 space-y-3">
          <Link to="/" onClick={() => setMobileMenuOpen(false)} className="block text-gray-600 hover:text-brand-500 font-medium">Home</Link>
          <Link to="/products" onClick={() => setMobileMenuOpen(false)} className="block text-gray-600 hover:text-brand-500 font-medium">Products</Link>
          {user ? (
            <>
              {user.role === 'customer' && (
                <Link to="/cart" onClick={() => setMobileMenuOpen(false)} className="block text-gray-600 hover:text-brand-500 font-medium">
                  Cart {cartItemCount > 0 && `(${cartItemCount})`}
                </Link>
              )}
              <Link to="/profile" onClick={() => setMobileMenuOpen(false)} className="block text-gray-600 hover:text-brand-500 font-medium">Profile</Link>
              <Link to="/orders" onClick={() => setMobileMenuOpen(false)} className="block text-gray-600 hover:text-brand-500 font-medium">Orders</Link>
              <button onClick={handleLogout} className="block text-red-600 font-medium">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="block text-gray-600 hover:text-brand-500 font-medium">Login</Link>
              <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="block text-brand-500 font-medium">Register</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
