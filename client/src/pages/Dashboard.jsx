import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Clock,
  AlertTriangle,
  Package,
  Plus,
  ArrowRight,
  Shield,
  Layers,
  Sparkles,
  Truck,
  ExternalLink,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4'];

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [kpis, setKpis] = useState(null);
  const [charts, setCharts] = useState(null);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [period, setPeriod] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      const [kpiRes, chartRes, lowStockRes] = await Promise.all([
        api.get('/dashboard/kpis'),
        api.get(`/dashboard/charts?period=${period}`),
        api.get('/products?stockStatus=low_stock&limit=5'),
      ]);

      setKpis(kpiRes.data.data);
      setCharts(chartRes.data.data);
      setLowStockItems(lowStockRes.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [period]);

  if (loading) {
    return (
      <div className="py-24 text-center text-gray-400">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm">Calculating inventory analytics and KPIs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 transform skew-x-12 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur px-3 py-1 rounded-full text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Smart Inventory &amp; Order Intelligence</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {user?.name}!
            </h1>
            <p className="text-emerald-100/90 text-xs sm:text-sm mt-1 max-w-xl">
              Role: <strong className="uppercase">{user?.role}</strong> • Real-time stock audit, sales pipeline and procurement overview.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => navigate('/orders')}
              className="px-4 py-2 bg-white text-emerald-800 hover:bg-emerald-50 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center space-x-1.5"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Process Orders</span>
            </button>
            <button
              onClick={() => navigate('/products')}
              className="px-4 py-2 bg-emerald-800/60 hover:bg-emerald-800 text-white border border-white/20 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5"
            >
              <Package className="w-4 h-4" />
              <span>Manage Stock</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Revenue (Admin) */}
        {isAdmin && (
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center mb-2">
              <DollarSign className="w-4 h-4" />
            </div>
            <p className="text-[11px] uppercase font-bold text-gray-400">Total Revenue</p>
            <p className="text-lg font-extrabold text-gray-900 dark:text-white mt-0.5">
              ${kpis?.totalRevenue?.toLocaleString() || '0'}
            </p>
            <p className="text-[10px] text-emerald-600 font-semibold mt-1">
              Gross sales fulfilled
            </p>
          </div>
        )}

        {/* Net Profit (Admin) */}
        {isAdmin && (
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center mb-2">
              <TrendingUp className="w-4 h-4" />
            </div>
            <p className="text-[11px] uppercase font-bold text-gray-400">Est. Profit</p>
            <p className="text-lg font-extrabold text-gray-900 dark:text-white mt-0.5">
              ${kpis?.totalProfit?.toLocaleString() || '0'}
            </p>
            <p className="text-[10px] text-blue-600 font-semibold mt-1">
              {kpis?.profitMargin || 0}% margin
            </p>
          </div>
        )}

        {/* Orders Today */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center mb-2">
            <ShoppingCart className="w-4 h-4" />
          </div>
          <p className="text-[11px] uppercase font-bold text-gray-400">Orders Today</p>
          <p className="text-lg font-extrabold text-gray-900 dark:text-white mt-0.5">
            {kpis?.ordersToday || 0}
          </p>
          <p className="text-[10px] text-gray-400 mt-1">
            {kpis?.ordersThisMonth || 0} this month
          </p>
        </div>

        {/* Pending Orders */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center mb-2">
            <Clock className="w-4 h-4" />
          </div>
          <p className="text-[11px] uppercase font-bold text-gray-400">Pending Orders</p>
          <p className="text-lg font-extrabold text-amber-600 mt-0.5">
            {kpis?.pendingOrders || 0}
          </p>
          <p className="text-[10px] text-gray-400 mt-1">Awaiting confirmation</p>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 flex items-center justify-center mb-2">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <p className="text-[11px] uppercase font-bold text-gray-400">Low Stock</p>
          <p className="text-lg font-extrabold text-red-600 mt-0.5">
            {kpis?.lowStockCount || 0}
          </p>
          <p className="text-[10px] text-red-500 font-semibold mt-1">
            {kpis?.outOfStockCount || 0} out of stock
          </p>
        </div>

        {/* Total Catalog Items */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center mb-2">
            <Package className="w-4 h-4" />
          </div>
          <p className="text-[11px] uppercase font-bold text-gray-400">Active SKUs</p>
          <p className="text-lg font-extrabold text-gray-900 dark:text-white mt-0.5">
            {kpis?.totalProducts || 0}
          </p>
          <p className="text-[10px] text-teal-600 font-semibold mt-1">Catalog items</p>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend Line/Area Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <h2 className="text-base font-bold tracking-tight text-gray-900 dark:text-white">
                Sales &amp; Order Volume Trend
              </h2>
              <p className="text-xs text-gray-500">
                {isAdmin ? 'Revenue ($) and order frequency over time' : 'Fulfillment activity timeline'}
              </p>
            </div>

            <div className="inline-flex rounded-xl p-1 bg-gray-100 dark:bg-gray-750 text-xs font-semibold">
              <button
                onClick={() => setPeriod('daily')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  period === 'daily' ? 'bg-white dark:bg-gray-800 shadow-xs text-emerald-600' : 'text-gray-500'
                }`}
              >
                Daily
              </button>
              <button
                onClick={() => setPeriod('monthly')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  period === 'monthly' ? 'bg-white dark:bg-gray-800 shadow-xs text-emerald-600' : 'text-gray-500'
                }`}
              >
                Monthly
              </button>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts?.salesTrend || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    borderRadius: '12px',
                    border: 'none',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey={isAdmin ? 'sales' : 'orders'}
                  name={isAdmin ? 'Sales Revenue ($)' : 'Order Count'}
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#salesGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown Donut Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold tracking-tight text-gray-900 dark:text-white">
              Sales by Category
            </h2>
            <p className="text-xs text-gray-500 mb-4">Volume distribution across catalog departments</p>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts?.salesByCategory || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey={isAdmin ? 'revenue' : 'units'}
                    nameKey="category"
                  >
                    {(charts?.salesByCategory || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      borderRadius: '12px',
                      border: 'none',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-gray-100 dark:border-gray-700 text-xs">
            {(charts?.salesByCategory || []).slice(0, 4).map((c, i) => (
              <div key={c.category} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-gray-700 dark:text-gray-300 font-medium">{c.category}</span>
                </div>
                <span className="font-bold text-gray-900 dark:text-white">
                  {isAdmin ? `$${c.revenue?.toLocaleString()}` : `${c.units} units`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Second Row: Top Products & Low Stock Alerts Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top 5 Best Sellers Bar Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold tracking-tight text-gray-900 dark:text-white">
                Top 5 Best-Selling Products
              </h2>
              <p className="text-xs text-gray-500">Highest volume performers across confirmed orders</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts?.topProducts || []} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={120}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    borderRadius: '12px',
                    border: 'none',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="quantity" name="Units Sold" fill="#10b981" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Low-Stock Quick Reorder Widget */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h2 className="text-base font-bold text-gray-900 dark:text-white">Stock Depletion Alerts</h2>
              </div>
              <Link to="/products?stockStatus=low_stock" className="text-xs text-emerald-600 font-semibold hover:underline">
                View All
              </Link>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Products at or below designated minimum reorder threshold
            </p>

            <div className="space-y-3">
              {lowStockItems.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-400 bg-gray-50 dark:bg-gray-750 rounded-xl">
                  Inventory is optimal. No products are currently below reorder thresholds.
                </div>
              ) : (
                lowStockItems.map((item) => (
                  <div
                    key={item._id}
                    className="p-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-750/50 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{item.name}</p>
                      <span className="font-mono text-[10px] text-gray-400">SKU: {item.sku}</span>
                    </div>
                    <div className="text-right flex items-center space-x-2">
                      <span
                        className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                          item.quantity <= 0
                            ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}
                      >
                        {item.quantity} / {item.reorderLevel} min
                      </span>
                      <Link
                        to={`/purchase-orders?productId=${item._id}`}
                        className="p-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300"
                        title="Create Purchase Order for this item"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 text-center">
            <Link
              to="/purchase-orders"
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center space-x-1"
            >
              <span>Manage Supplier Purchase Orders</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
