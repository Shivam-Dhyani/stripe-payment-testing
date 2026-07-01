import { Package, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { logoutUser } from '../../store/slices/authSlice';

interface StaffHeaderProps {
  title: string;
  subtitle?: string;
}

const StaffHeader = ({ title, subtitle }: StaffHeaderProps) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/login');
  };

  const name = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email : '';

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-brand-500 rounded-xl">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="block text-base font-bold text-gray-800 leading-tight">ShopHub</span>
            <span className="block text-xs text-gray-400">{title}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-gray-800 leading-tight">{name}</p>
            {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-100 hover:text-gray-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default StaffHeader;
