import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FolderTree, Layers, ShoppingBag, ClipboardList, Package, ShoppingCart, Store, Ban, RotateCcw } from 'lucide-react';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { fetchAllOrders } from '../../store/slices/orderSlice';
import { fetchCancellationPendingCount } from '../../store/slices/cancellationSlice';
import { fetchReturnPendingCount } from '../../store/slices/returnSlice';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
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

  const orderPendingCount = orders.filter(o => o.status === 'confirmed' || o.status === 'processing').length;

  const menuItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: 0 },
    { path: '/admin/categories', label: 'Categories', icon: FolderTree, badge: 0 },
    { path: '/admin/subcategories', label: 'Sub Categories', icon: Layers, badge: 0 },
    { path: '/admin/products', label: 'Products', icon: ShoppingBag, badge: 0 },
    { path: '/admin/orders', label: 'Orders', icon: ClipboardList, badge: orderPendingCount },
    { path: '/admin/cancellations', label: 'Cancellations', icon: Ban, badge: cancelPendingCount },
    { path: '/admin/returns', label: 'Returns', icon: RotateCcw, badge: returnPendingCount },
    { path: '/admin/carts', label: 'User Carts', icon: ShoppingCart, badge: 0 },
  ];

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
        className={`fixed top-0 left-0 z-50 flex flex-col h-screen px-5 bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out w-[290px]
          ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 py-8">
          <div className="flex items-center justify-center w-10 h-10 bg-brand-500 rounded-xl">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="block text-lg font-bold text-gray-800 leading-tight">ShopHub</span>
            <span className="block text-xs text-gray-400">Admin Panel</span>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex flex-col overflow-y-auto no-scrollbar">
          <nav>
            <h2 className="mb-4 text-xs font-medium leading-[20px] uppercase text-gray-400">
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
                      className={`menu-item group ${isActive ? 'menu-item-active' : 'menu-item-inactive'}`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'menu-item-icon-active' : 'menu-item-icon-inactive'}`} />
                      <span className="flex-1">{item.label}</span>
                      {item.badge > 0 && (
                        <span className="flex items-center justify-center min-w-[20px] h-5 px-2 text-xs font-medium text-white bg-error-500 rounded-full">
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
            className="flex items-center gap-3 px-3 py-2 text-theme-sm font-medium text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <Store className="w-5 h-5" />
            <span>Back to Store</span>
          </Link>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
