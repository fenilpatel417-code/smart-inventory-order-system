import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  BarChart3,
  Download,
  Calendar,
  Layers,
  Truck,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  FileSpreadsheet,
  FileText,
  Filter,
  CheckCircle,
  AlertCircle,
  Package,
} from 'lucide-react';

const Reports = () => {
  const { isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState('sales'); // 'sales', 'valuation', 'lowstock', 'suppliers'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Date filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [groupBy, setGroupBy] = useState('day');

  // Report data states
  const [salesData, setSalesData] = useState(null);
  const [valuationData, setValuationData] = useState(null);
  const [lowStockData, setLowStockData] = useState([]);
  const [supplierData, setSupplierData] = useState([]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
        ...(groupBy && { groupBy }),
      });

      if (activeTab === 'sales') {
        const res = await api.get(`/reports/sales?${params.toString()}`);
        setSalesData(res.data.data);
      } else if (activeTab === 'valuation') {
        const res = await api.get(`/reports/inventory-valuation`);
        setValuationData(res.data.data);
      } else if (activeTab === 'lowstock') {
        const res = await api.get(`/reports/low-stock`);
        setLowStockData(res.data.data);
      } else if (activeTab === 'suppliers') {
        const res = await api.get(`/reports/supplier-purchases?${params.toString()}`);
        setSupplierData(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeTab, startDate, endDate, groupBy]);

  const handleExport = async (format) => {
    try {
      setError('');
      const params = new URLSearchParams({
        exportFormat: format,
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
        ...(groupBy && { groupBy }),
      });

      let endpoint = '';
      if (activeTab === 'sales') endpoint = `/reports/sales?${params.toString()}`;
      else if (activeTab === 'valuation') endpoint = `/reports/inventory-valuation?${params.toString()}`;
      else if (activeTab === 'lowstock') endpoint = `/reports/low-stock?${params.toString()}`;
      else if (activeTab === 'suppliers') endpoint = `/reports/supplier-purchases?${params.toString()}`;

      const res = await api.get(endpoint, { responseType: 'blob' });
      const contentType = format === 'csv' ? 'text/csv' : 'application/pdf';
      const ext = format === 'csv' ? 'csv' : 'pdf';

      const blob = new Blob([res.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeTab}-report-${new Date().toISOString().split('T')[0]}.${ext}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess(`Report successfully exported to ${format.toUpperCase()}`);
    } catch (err) {
      setError(`Failed to export report as ${format.toUpperCase()}`);
    }
  };

  const tabs = [
    { key: 'sales', label: 'Sales Performance', icon: BarChart3 },
    { key: 'valuation', label: 'Inventory Valuation', icon: DollarSign },
    { key: 'lowstock', label: 'Low-Stock Audit', icon: AlertTriangle },
    { key: 'suppliers', label: 'Supplier Purchases', icon: Truck },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Financial &amp; Inventory Reports</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Executive accounting reports, valuation balance sheets, and exportable data digests
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => handleExport('csv')}
            disabled={loading}
            className="inline-flex items-center px-3.5 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-semibold shadow-xs disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
            Export CSV
          </button>
          <button
            onClick={() => handleExport('pdf')}
            disabled={loading || activeTab === 'lowstock'}
            className="inline-flex items-center px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Alerts */}
      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-sm flex items-center justify-between border border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess('')}>&times;</button>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-sm flex items-center justify-between border border-red-200 dark:border-red-800">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')}>&times;</button>
        </div>
      )}

      {/* Navigation Tabs Bar */}
      <div className="bg-white dark:bg-gray-800 p-2 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Date & Group Filters (for Sales and Suppliers) */}
      {(activeTab === 'sales' || activeTab === 'suppliers') && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
            <Filter className="w-4 h-4 text-emerald-600" />
            <span>Filter Date Range:</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-1.5 text-xs text-gray-500">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs"
              />
              <span>to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs"
              />
            </div>

            {activeTab === 'sales' && (
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs font-medium"
              >
                <option value="day">Group by Day</option>
                <option value="month">Group by Month</option>
              </select>
            )}
          </div>
        </div>
      )}

      {/* Tab 1: Sales Performance */}
      {activeTab === 'sales' && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
              <span className="text-[11px] uppercase font-bold text-gray-400">Total Fulfilled Orders</span>
              <p className="text-xl font-extrabold text-gray-900 dark:text-white mt-1">
                {salesData?.summary?.totalOrders || 0}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
              <span className="text-[11px] uppercase font-bold text-gray-400">Total Gross Revenue</span>
              <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                ${salesData?.summary?.totalRevenue?.toLocaleString() || '0'}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
              <span className="text-[11px] uppercase font-bold text-gray-400">Sales Tax Collected</span>
              <p className="text-xl font-extrabold text-gray-900 dark:text-white mt-1">
                ${salesData?.summary?.totalTax?.toLocaleString() || '0'}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
              <span className="text-[11px] uppercase font-bold text-gray-400">Total Discounts Given</span>
              <p className="text-xl font-extrabold text-amber-600 mt-1">
                ${salesData?.summary?.totalDiscount?.toLocaleString() || '0'}
              </p>
            </div>
          </div>

          {/* Detailed Sales Breakdown Table */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/60 text-[11px] uppercase tracking-wider text-gray-500 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-3.5">Period</th>
                    <th className="px-6 py-3.5">Orders</th>
                    <th className="px-6 py-3.5">Subtotal</th>
                    <th className="px-6 py-3.5">Tax</th>
                    <th className="px-6 py-3.5">Discount</th>
                    <th className="px-6 py-3.5">Shipping</th>
                    <th className="px-6 py-3.5 text-right">Net Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-750">
                  {salesData?.report?.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-gray-400 text-xs">
                        No sales data found for the selected period.
                      </td>
                    </tr>
                  ) : (
                    salesData?.report?.map((row) => (
                      <tr key={row.period} className="hover:bg-gray-50 dark:hover:bg-gray-750 text-xs">
                        <td className="px-6 py-3.5 font-bold font-mono text-gray-900 dark:text-white">
                          {row.period}
                        </td>
                        <td className="px-6 py-3.5 text-gray-600 dark:text-gray-300">
                          {row.orders} orders
                        </td>
                        <td className="px-6 py-3.5 font-mono">${row.subtotal?.toFixed(2)}</td>
                        <td className="px-6 py-3.5 font-mono text-gray-500">${row.tax?.toFixed(2)}</td>
                        <td className="px-6 py-3.5 font-mono text-amber-600">-${row.discount?.toFixed(2)}</td>
                        <td className="px-6 py-3.5 font-mono text-gray-500">+${row.shipping?.toFixed(2)}</td>
                        <td className="px-6 py-3.5 font-bold font-mono text-right text-emerald-600 dark:text-emerald-400">
                          ${row.revenue?.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Inventory Valuation */}
      {activeTab === 'valuation' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
              <span className="text-[11px] uppercase font-bold text-gray-400">Total Units On Hand</span>
              <p className="text-xl font-extrabold text-gray-900 dark:text-white mt-1">
                {valuationData?.summary?.totalUnits || 0}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
              <span className="text-[11px] uppercase font-bold text-gray-400">Total Cost Valuation</span>
              <p className="text-xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">
                ${valuationData?.summary?.totalCostValue?.toLocaleString() || '0'}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
              <span className="text-[11px] uppercase font-bold text-gray-400">Retail Potential Value</span>
              <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                ${valuationData?.summary?.totalRetailValue?.toLocaleString() || '0'}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
              <span className="text-[11px] uppercase font-bold text-gray-400">Unrealized Gross Margin</span>
              <p className="text-xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">
                ${valuationData?.summary?.unrealizedProfit?.toLocaleString() || '0'}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/60 text-[11px] uppercase tracking-wider text-gray-500 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-3.5">Category</th>
                    <th className="px-6 py-3.5">Catalog Products</th>
                    <th className="px-6 py-3.5">Total Quantity</th>
                    <th className="px-6 py-3.5">Asset Cost Value</th>
                    <th className="px-6 py-3.5">Retail Potential Value</th>
                    <th className="px-6 py-3.5 text-right">Potential Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-750">
                  {valuationData?.categories?.map((c) => (
                    <tr key={c.category} className="hover:bg-gray-50 dark:hover:bg-gray-750 text-xs">
                      <td className="px-6 py-3.5 font-bold text-gray-900 dark:text-white">{c.category}</td>
                      <td className="px-6 py-3.5 text-gray-600 dark:text-gray-300">{c.products} items</td>
                      <td className="px-6 py-3.5 font-mono">{c.totalUnits} units</td>
                      <td className="px-6 py-3.5 font-mono text-blue-600 dark:text-blue-400">
                        ${c.costValue?.toFixed(2)}
                      </td>
                      <td className="px-6 py-3.5 font-mono font-semibold">
                        ${c.retailValue?.toFixed(2)}
                      </td>
                      <td className="px-6 py-3.5 font-bold text-right text-emerald-600 dark:text-emerald-400">
                        {c.potentialMargin}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Low-Stock Audit */}
      {activeTab === 'lowstock' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/60 text-[11px] uppercase tracking-wider text-gray-500 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-3.5">Product &amp; SKU</th>
                    <th className="px-6 py-3.5">Category</th>
                    <th className="px-6 py-3.5">Supplier</th>
                    <th className="px-6 py-3.5">On Hand</th>
                    <th className="px-6 py-3.5">Reorder Level</th>
                    <th className="px-6 py-3.5">Suggested Order</th>
                    <th className="px-6 py-3.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-750">
                  {lowStockData.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-gray-400 text-xs">
                        All products are currently stocked above their minimum reorder levels.
                      </td>
                    </tr>
                  ) : (
                    lowStockData.map((item) => (
                      <tr key={item.sku} className="hover:bg-gray-50 dark:hover:bg-gray-750 text-xs">
                        <td className="px-6 py-3.5">
                          <p className="font-semibold text-gray-900 dark:text-white">{item.name}</p>
                          <span className="font-mono text-[10px] text-gray-400">{item.sku}</span>
                        </td>
                        <td className="px-6 py-3.5 text-gray-600 dark:text-gray-300">{item.category}</td>
                        <td className="px-6 py-3.5 text-gray-600 dark:text-gray-300">{item.supplier}</td>
                        <td className="px-6 py-3.5 font-mono font-bold text-red-600">
                          {item.quantity}
                        </td>
                        <td className="px-6 py-3.5 font-mono text-gray-500">{item.reorderLevel}</td>
                        <td className="px-6 py-3.5 font-mono font-bold text-emerald-600">
                          +{item.suggestedReorder} units
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.quantity <= 0
                                ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Supplier Procurement */}
      {activeTab === 'suppliers' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/60 text-[11px] uppercase tracking-wider text-gray-500 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-3.5">Supplier Company</th>
                    <th className="px-6 py-3.5">Contact Person</th>
                    <th className="px-6 py-3.5">Total Orders Placed</th>
                    <th className="px-6 py-3.5">Shipments Received</th>
                    <th className="px-6 py-3.5 text-right">Total Procurement Spend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-750">
                  {supplierData.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-gray-400 text-xs">
                        No purchase orders recorded for suppliers.
                      </td>
                    </tr>
                  ) : (
                    supplierData.map((sup) => (
                      <tr key={sup.supplier} className="hover:bg-gray-50 dark:hover:bg-gray-750 text-xs">
                        <td className="px-6 py-3.5 font-bold text-gray-900 dark:text-white">
                          {sup.supplier}
                        </td>
                        <td className="px-6 py-3.5 text-gray-600 dark:text-gray-300">
                          {sup.contactPerson}
                        </td>
                        <td className="px-6 py-3.5 font-mono">{sup.totalOrders} POs</td>
                        <td className="px-6 py-3.5 font-mono text-emerald-600">
                          {sup.receivedOrders} Received
                        </td>
                        <td className="px-6 py-3.5 font-bold font-mono text-right text-gray-900 dark:text-white">
                          ${sup.totalSpent?.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
