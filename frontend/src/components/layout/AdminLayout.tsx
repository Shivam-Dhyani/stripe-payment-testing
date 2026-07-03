import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import AdminHeader from './AdminHeader';

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile off-canvas
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('admin_sidebar_collapsed') === '1',
  );

  const toggleCollapsed = () =>
    setCollapsed((c) => {
      localStorage.setItem('admin_sidebar_collapsed', c ? '0' : '1');
      return !c;
    });

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapsed}
      />
      <div
        className={`flex flex-col min-h-screen transition-[margin] duration-300 ${
          collapsed ? 'lg:ml-[84px]' : 'lg:ml-[290px]'
        }`}
      >
        <AdminHeader onToggleSidebar={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
