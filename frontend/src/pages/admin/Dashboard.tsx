import { useEffect, useState } from 'react';
import { DollarSign, ShoppingBag, Package, Users } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import { dashboardService } from '../../services/dashboardService';
import { DashboardStats, RevenueData, TopProduct, CategoryDistribution, OrderTrend, Order } from '../../types';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'];

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [revenue, setRevenue] = useState<RevenueData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [categoryDist, setCategoryDist] = useState<CategoryDistribution[]>([]);
  const [orderTrends, setOrderTrends] = useState<OrderTrend[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [s, r, tp, ro, cd, ot] = await Promise.all([
        dashboardService.getStats(),
        dashboardService.getRevenueChart(),
        dashboardService.getTopProducts(),
        dashboardService.getRecentOrders(),
        dashboardService.getCategoryDistribution(),
        dashboardService.getOrderTrends(),
      ]);
      setStats(s);
      setRevenue(r);
      setTopProducts(tp);
      setRecentOrders(ro);
      setCategoryDist(cd);
      setOrderTrends(ot);
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    processing: 'bg-blue-100 text-blue-700',
    shipped: 'bg-purple-100 text-purple-700',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  const kpiCards = [
    { title: 'Total Revenue', value: `$${(stats?.total_revenue || 0).toLocaleString()}`, icon: DollarSign, color: 'bg-green-100 text-green-600' },
    { title: 'Total Orders', value: stats?.total_orders || 0, icon: ShoppingBag, color: 'bg-blue-100 text-blue-600' },
    { title: 'Total Products', value: stats?.total_products || 0, icon: Package, color: 'bg-purple-100 text-purple-600' },
    { title: 'Total Customers', value: stats?.total_customers || 0, icon: Users, color: 'bg-orange-100 text-orange-600' },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-800 mb-8">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 font-medium">{card.title}</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{card.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${card.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Revenue (Last 30 Days)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={revenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <Tooltip />
              <Area type="monotone" dataKey="revenue" stroke="#6366f1" fill="#6366f1" fillOpacity={0.1} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Order Trends */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Order Trends (Last 30 Days)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={orderTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <Tooltip />
              <Line type="monotone" dataKey="orders" stroke="#8b5cf6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top Products */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Top Selling Products</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topProducts} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} stroke="#94a3b8" width={120} />
              <Tooltip />
              <Bar dataKey="total_sold" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Category Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Category Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryDist}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
                nameKey="name"
                label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
              >
                {categoryDist.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Recent Orders</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="pb-3 text-sm font-semibold text-slate-600">Order ID</th>
                <th className="pb-3 text-sm font-semibold text-slate-600">Total</th>
                <th className="pb-3 text-sm font-semibold text-slate-600">Status</th>
                <th className="pb-3 text-sm font-semibold text-slate-600">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                  <td className="py-3 text-sm text-slate-800 font-medium">#{order.id}</td>
                  <td className="py-3 text-sm text-slate-800">${Number(order.total).toFixed(2)}</td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${statusColors[order.status] || 'bg-gray-100 text-gray-700'}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="py-3 text-sm text-slate-500">{new Date(order.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
