import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, LogOut, Package, Search, MapPin, ChevronDown } from 'lucide-react';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { logoutUser } from '../../store/slices/authSlice';
import BrandMark from '../common/BrandMark';
import { DELIVERY_PROMISE } from '../../config/brand';

const Navbar = () => {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { user } = useAppSelector((state) => state.auth);
  const { items } = useAppSelector((state) => state.cart);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate('/login');
    setUserDropdownOpen(false);
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(search.trim() ? `/products?search=${encodeURIComponent(search.trim())}` : '/products');
  };

  const cartItemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = items.reduce((sum, item) => sum + item.quantity * Number(item.product?.price || 0), 0);

  const SearchBar = (
    <form onSubmit={submitSearch} className="relative w-full">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder='Search "milk", "bread", "eggs"...'
        className="w-full h-11 pl-10 pr-4 rounded-xl bg-white border border-black/5 shadow-qc-card text-sm text-ink-900 placeholder:text-gray-400 focus:outline-hidden focus:border-brand-300 focus:ring-3 focus:ring-brand-500/15 transition"
      />
    </form>
  );

  return (
    <nav className="sticky top-0 z-50 bg-accent-400 border-b border-black/5 shadow-qc-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center shrink-0">
            <BrandMark size="md" />
          </Link>

          {/* Delivery / location chip */}
          <div className="hidden lg:flex flex-col leading-tight pl-2 border-l border-ink-900/10">
            <span className="text-[13px] font-bold text-ink-900">{DELIVERY_PROMISE}</span>
            <span className="flex items-center gap-0.5 text-xs text-ink-900/60">
              <MapPin className="w-3 h-3" /> Home · New York <ChevronDown className="w-3 h-3" />
            </span>
          </div>

          {/* Search (desktop) */}
          <div className="hidden md:block flex-1 max-w-xl">{SearchBar}</div>

          <div className="flex items-center gap-3 ml-auto">
            {user ? (
              <>
                {/* Cart pill */}
                {user.role === 'customer' && (
                  <Link
                    to="/cart"
                    className="flex items-center gap-2 h-11 px-4 rounded-xl bg-brand-500 text-white hover:bg-brand-600 transition-colors"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    {cartItemCount > 0 ? (
                      <div className="hidden sm:flex flex-col items-start leading-none">
                        <span className="text-[11px] font-medium opacity-90">{cartItemCount} item{cartItemCount > 1 ? 's' : ''}</span>
                        <span className="text-sm font-bold">${cartTotal.toFixed(2)}</span>
                      </div>
                    ) : (
                      <span className="hidden sm:block text-sm font-semibold">Cart</span>
                    )}
                    {cartItemCount > 0 && (
                      <span className="sm:hidden absolute -mt-6 ml-4 bg-accent-400 text-ink-900 text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1">
                        {cartItemCount}
                      </span>
                    )}
                  </Link>
                )}

                {/* User dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2 h-11 px-2 rounded-xl hover:bg-black/5 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-ink-900 text-accent-400 text-sm font-bold flex items-center justify-center">
                      {user.first_name?.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden md:block text-sm font-semibold text-ink-900">{user.first_name}</span>
                    <ChevronDown className="hidden md:block w-4 h-4 text-ink-900/50" />
                  </button>
                  {userDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setUserDropdownOpen(false)} />
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-theme-lg border border-gray-100 py-1 z-50">
                        <div className="px-4 py-3 border-b border-gray-100">
                          <p className="text-sm font-semibold text-gray-900">{user.first_name} {user.last_name}</p>
                          <p className="text-xs text-gray-500 mt-0.5 truncate">{user.email}</p>
                        </div>
                        <div className="py-1">
                          <Link to="/profile" onClick={() => setUserDropdownOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
                            <User className="w-4 h-4" /> Profile
                          </Link>
                          <Link to="/orders" onClick={() => setUserDropdownOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
                            <Package className="w-4 h-4" /> My Orders
                          </Link>
                          {user.role === 'admin' && (
                            <Link to="/admin/dashboard" onClick={() => setUserDropdownOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
                              <ShoppingCart className="w-4 h-4" /> Admin Dashboard
                            </Link>
                          )}
                        </div>
                        <div className="border-t border-gray-100">
                          <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                            <LogOut className="w-4 h-4" /> Logout
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="px-4 py-2.5 bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-colors text-sm font-semibold shadow-qc-card">Sign in</Link>
                <Link to="/register" className="px-4 py-2.5 bg-ink-900 text-white rounded-xl hover:bg-ink-800 transition-colors text-sm font-semibold">Get Started</Link>
              </div>
            )}
          </div>
        </div>

        {/* Search (mobile) */}
        <div className="md:hidden pb-3">{SearchBar}</div>
      </div>
    </nav>
  );
};

export default Navbar;
