import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, ChevronDown, User, LogOut, Store } from 'lucide-react';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { logoutUser } from '../../store/slices/authSlice';

interface AdminHeaderProps {
  onToggleSidebar: () => void;
}

const AdminHeader = ({ onToggleSidebar }: AdminHeaderProps) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate('/login');
    setDropdownOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 flex w-full bg-white border-b border-gray-200">
      <div className="flex items-center justify-between w-full gap-2 px-4 py-3 sm:gap-4 lg:px-6">
        {/* Left: toggle + search */}
        <div className="flex items-center gap-3 flex-1">
          <button
            onClick={onToggleSidebar}
            className="flex items-center justify-center w-10 h-10 text-gray-500 border border-gray-200 rounded-lg lg:hidden hover:bg-gray-50"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Right: store link + user */}
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            <Store className="w-4 h-4" />
            <span>View Store</span>
          </Link>

          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 text-gray-700"
            >
              <div className="flex items-center justify-center w-9 h-9 bg-brand-100 rounded-full">
                <User className="w-4 h-4 text-brand-500" />
              </div>
              <span className="hidden sm:block text-sm font-medium">{user?.first_name || 'Admin'}</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl border border-gray-200 shadow-theme-md py-1.5 z-50">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-800 truncate">{user?.first_name} {user?.last_name}</p>
                  <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-error-600 hover:bg-error-50 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
