import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FolderTree, Layers, ShoppingBag, ClipboardList, Menu, X, Package } from 'lucide-react';

const menuItems = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/categories', label: 'Categories', icon: FolderTree },
  { path: '/admin/subcategories', label: 'Sub Categories', icon: Layers },
  { path: '/admin/products', label: 'Products', icon: ShoppingBag },
  { path: '/admin/orders', label: 'Orders', icon: ClipboardList },
];

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-slate-800 text-white rounded-lg"
      >
        {collapsed ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      <aside
        className={`fixed left-0 top-0 h-full bg-slate-900 text-white transition-transform duration-300 z-40
          ${collapsed ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 w-64`}
      >
        <div className="p-6">
          <Link to="/admin/dashboard" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">ShopHub</span>
          </Link>
          <p className="text-slate-400 text-sm mt-1">Admin Panel</p>
        </div>

        <nav className="mt-4 px-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setCollapsed(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition font-medium
                  ${isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <Link
            to="/"
            className="flex items-center space-x-2 px-4 py-3 text-slate-400 hover:text-white transition text-sm"
          >
            <span>Back to Store</span>
          </Link>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
