import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FolderTree, Layers, ShoppingBag, ClipboardList, ShoppingCart,
  Store, Ban, RotateCcw, Zap, ChevronsLeft, ChevronsRight, SlidersHorizontal,
} from 'lucide-react';
import BrandMark from '../common/BrandMark';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { fetchAllOrders } from '../../store/slices/orderSlice';
import { fetchCancellationPendingCount } from '../../store/slices/cancellationSlice';
import { fetchReturnPendingCount } from '../../store/slices/returnSlice';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const Sidebar = ({ isOpen, onClose, collapsed, onToggleCollapse }: SidebarProps) => {
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { orders } = useAppSelector((state) => state.orders);
  const { pendingCount: cancelPendingCount } = useAppSelector((state) => state.cancellations);
  const { pendingCount: returnPendingCount } = useAppSelector((state) => state.returns);

  useEffect(() => {
    dispatch(fetchAllOrders());
    dispatch(fetchCancellationPendingCount());
    dispatch(fetchReturnPendingCount());
  }, [dispatch]);

  const orderPendingCount = orders.filter(o => ['placed', 'accepted', 'picking', 'packed'].includes(o.status)).length;

  const menuItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: 0 },
    { path: '/admin/categories', label: 'Categories', icon: FolderTree, badge: 0 },
    { path: '/admin/subcategories', label: 'Sub Categories', icon: Layers, badge: 0 },
    { path: '/admin/products', label: 'Products', icon: ShoppingBag, badge: 0 },
    { path: '/admin/orders', label: 'Orders', icon: ClipboardList, badge: orderPendingCount },
    { path: '/admin/cancellations', label: 'Cancellations', icon: Ban, badge: cancelPendingCount },
    { path: '/admin/returns', label: 'Returns', icon: RotateCcw, badge: returnPendingCount },
    { path: '/admin/carts', label: 'User Carts', icon: ShoppingCart, badge: 0 },
    { path: '/admin/settings', label: 'Store Settings', icon: SlidersHorizontal, badge: 0 },
  ];

  // `collapsed` only applies at the lg breakpoint; the mobile off-canvas
  // sidebar always renders full width, so collapse classes are lg-gated.
  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-gray-900/50 lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 flex flex-col h-screen bg-white border-r border-gray-200 transition-all duration-300 ease-in-out w-[290px] px-5
          ${collapsed ? 'lg:w-[84px] lg:px-3' : 'lg:w-[290px]'}
          ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        {/* Logo + collapse toggle */}
        <div className="py-6">
          {/* Full header (mobile always; desktop when expanded) */}
          <div className={`flex items-center justify-between ${collapsed ? 'lg:hidden' : ''}`}>
            <BrandMark size="lg" subtitle="Admin Panel" />
            <button
              onClick={onToggleCollapse}
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
              className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <ChevronsLeft className="w-5 h-5" />
            </button>
          </div>

          {/* Collapsed header (desktop only) */}
          <div className={`hidden flex-col items-center gap-3 ${collapsed ? 'lg:flex' : ''}`}>
            <Link to="/admin/dashboard" className="flex items-center justify-center w-11 h-11 rounded-2xl bg-accent-400 shadow-qc-card">
              <Zap className="w-6 h-6 text-ink-900" fill="currentColor" strokeWidth={0} />
            </Link>
            <button
              onClick={onToggleCollapse}
              title="Expand sidebar"
              aria-label="Expand sidebar"
              className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <ChevronsRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex flex-col overflow-y-auto no-scrollbar">
          <nav>
            <h2 className={`mb-4 text-xs font-medium leading-[20px] uppercase text-gray-400 ${collapsed ? 'lg:hidden' : ''}`}>
              Menu
            </h2>
            <ul className="flex flex-col gap-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={onClose}
                      title={collapsed ? item.label : undefined}
                      className={`menu-item group ${collapsed ? 'lg:justify-center lg:px-0' : ''} ${isActive ? 'menu-item-active' : 'menu-item-inactive'}`}
                    >
                      <span className="relative">
                        <Icon className={`w-5 h-5 ${isActive ? 'menu-item-icon-active' : 'menu-item-icon-inactive'}`} />
                        {/* Collapsed: show a small dot instead of the number badge */}
                        {item.badge > 0 && (
                          <span className={`hidden absolute -top-1.5 -right-1.5 w-2.5 h-2.5 rounded-full bg-error-500 ring-2 ring-white ${collapsed ? 'lg:block' : ''}`} />
                        )}
                      </span>
                      <span className={`flex-1 ${collapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
                      {item.badge > 0 && (
                        <span className={`flex items-center justify-center min-w-[20px] h-5 px-2 text-xs font-medium text-white bg-error-500 rounded-full ${collapsed ? 'lg:hidden' : ''}`}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        {/* Back to store */}
        <div className="mt-auto pb-6">
          <Link
            to="/"
            onClick={onClose}
            title={collapsed ? 'Back to Store' : undefined}
            className={`flex items-center gap-3 px-3 py-2 text-theme-sm font-medium text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 transition-colors ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}
          >
            <Store className="w-5 h-5" />
            <span className={collapsed ? 'lg:hidden' : ''}>Back to Store</span>
          </Link>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
