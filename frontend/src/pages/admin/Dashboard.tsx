import { useEffect, useState } from 'react';
import { DollarSign, ShoppingBag, Package, Users } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import { dashboardService } from '../../services/dashboardService';
import { DashboardStats, RevenueData, TopProduct, CategoryDistribution, OrderTrend, Order } from '../../types';
import { KpiSkeleton, ChartSkeleton, TableRowSkeleton } from '../../components/common/Skeleton';
import { formatDate } from '../../utils/date';

const COLORS = ['#0c9f4f', '#2fb96e', '#f8cb46', '#f4b400', '#5fd18f', '#0a8a44'];

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

  const statusColors: Record<string, string> = {
    placed: 'bg-blue-100 text-blue-700',
    accepted: 'bg-indigo-100 text-indigo-700',
    picking: 'bg-amber-100 text-amber-700',
    packed: 'bg-orange-100 text-orange-700',
    out_for_delivery: 'bg-purple-100 text-purple-700',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    refunded: 'bg-gray-100 text-gray-700',
  };

  const kpiCards: { title: string; value: string | number; icon: typeof DollarSign; sub: string; hero?: boolean; tile?: string }[] = [
    { title: 'Total Revenue', value: `$${(stats?.total_revenue || 0).toLocaleString()}`, icon: DollarSign, sub: 'Across all dark stores', hero: true },
    { title: 'Total Orders', value: stats?.total_orders || 0, icon: ShoppingBag, sub: 'All time', tile: 'bg-brand-50 text-brand-600' },
    { title: 'Products Live', value: stats?.total_products || 0, icon: Package, sub: 'In catalog', tile: 'bg-blue-50 text-blue-600' },
    { title: 'Customers', value: stats?.total_customers || 0, icon: Users, sub: 'Registered shoppers', tile: 'bg-purple-50 text-purple-600' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-title-sm font-bold text-gray-800">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Here's how your dark stores are performing today.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
        ) : (
          kpiCards.map((card) => {
            const Icon = card.icon;
            if (card.hero) {
              return (
                <div key={card.title} className="rounded-2xl bg-accent-400 p-5 md:p-6 shadow-qc-card">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-ink-900/10 text-ink-900">
                    <Icon className="size-6" />
                  </div>
                  <div className="mt-5">
                    <span className="text-sm font-medium text-ink-900/70">{card.title}</span>
                    <h4 className="mt-1 font-bold text-ink-900 text-title-sm">{card.value}</h4>
                    <p className="text-xs text-ink-900/60 mt-1">{card.sub}</p>
                  </div>
                </div>
              );
            }
            return (
              <div key={card.title} className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6">
                <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${card.tile}`}>
                  <Icon className="size-6" />
                </div>
                <div className="mt-5">
                  <span className="text-sm text-gray-500">{card.title}</span>
                  <h4 className="mt-1 font-bold text-gray-800 text-title-sm">{card.value}</h4>
                  <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {loading ? (
          <>
            <ChartSkeleton />
            <ChartSkeleton />
          </>
        ) : (
          <>
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="p-6 pb-0">
                <h2 className="text-lg font-semibold text-gray-800">Revenue (Last 30 Days)</h2>
                <p className="text-sm text-gray-500 mt-1 mb-4">Daily revenue overview</p>
              </div>
              <div className="p-6 pt-2">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={revenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <Tooltip />
                    <Area type="monotone" dataKey="revenue" stroke="#0c9f4f" fill="#0c9f4f" fillOpacity={0.1} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="p-6 pb-0">
                <h2 className="text-lg font-semibold text-gray-800">Order Trends (Last 30 Days)</h2>
                <p className="text-sm text-gray-500 mt-1 mb-4">Daily order volume</p>
              </div>
              <div className="p-6 pt-2">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={orderTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <Tooltip />
                    <Line type="monotone" dataKey="orders" stroke="#0c9f4f" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {loading ? (
          <>
            <ChartSkeleton />
            <ChartSkeleton />
          </>
        ) : (
          <>
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="p-6 pb-0">
                <h2 className="text-lg font-semibold text-gray-800">Top Selling Products</h2>
                <p className="text-sm text-gray-500 mt-1 mb-4">By units sold</p>
              </div>
              <div className="p-6 pt-2">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topProducts} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} stroke="#94a3b8" width={120} />
                    <Tooltip />
                    <Bar dataKey="total_sold" fill="#0c9f4f" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="p-6 pb-0">
                <h2 className="text-lg font-semibold text-gray-800">Category Distribution</h2>
                <p className="text-sm text-gray-500 mt-1 mb-4">Product distribution across categories</p>
              </div>
              <div className="p-6 pt-2">
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
          </>
        )}
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Recent Orders</h2>
          <p className="text-sm text-gray-500 mt-1">Latest 5 orders</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-6 py-3.5 text-sm font-semibold text-gray-600">Order ID</th>
                <th className="px-6 py-3.5 text-sm font-semibold text-gray-600">Total</th>
                <th className="px-6 py-3.5 text-sm font-semibold text-gray-600">Status</th>
                <th className="px-6 py-3.5 text-sm font-semibold text-gray-600">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={4} />)
              ) : (
                recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-800 font-mono">#{order.id}</td>
                    <td className="px-6 py-4 text-sm text-gray-800 font-semibold">${Number(order.total).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusColors[order.status] || 'bg-gray-100 text-gray-700'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(order.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
