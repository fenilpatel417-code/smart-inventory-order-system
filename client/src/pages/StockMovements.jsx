import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import {
  History,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Package,
  Calendar,
  User,
} from 'lucide-react';

const StockMovements = () => {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [reasonFilter, setReasonFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchMovements = async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({
        page,
        limit: 15,
        ...(search && { search }),
        ...(typeFilter && { type: typeFilter }),
        ...(reasonFilter && { reason: reasonFilter }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      });

      const res = await api.get(`/stock-movements?${params.toString()}`);
      setMovements(res.data.data);
      setTotalPages(res.data.meta?.totalPages || 1);
      setTotal(res.data.meta?.total || 0);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load stock movements log');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovements();
  }, [page, typeFilter, reasonFilter, startDate, endDate]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchMovements();
  };

  const renderReasonBadge = (reason) => {
    const labels = {
      order_confirmed: { text: 'Order Fulfillment', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300' },
      order_cancelled: { text: 'Order Restored', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' },
      purchase_order_received: { text: 'PO Shipment Intake', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300' },
      manual_adjustment: { text: 'Manual Adjustment', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
      damaged: { text: 'Damaged / Spoilage', color: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300' },
      audit: { text: 'Inventory Audit', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' },
      return: { text: 'Customer Return', color: 'bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300' },
    };

    const item = labels[reason] || { text: reason, color: 'bg-gray-100' };
    return (
      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${item.color}`}>
        {item.text}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Stock Movements & Audit Trail</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Complete historical ledger of all stock intake, customer order deductions, and manual revisions ({total} logs)
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col lg:flex-row gap-3 justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-sm relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by SKU or product name..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs focus:ring-2 focus:ring-emerald-500"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs font-medium focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Movement Types</option>
            <option value="in">Intake (In)</option>
            <option value="out">Deduction (Out)</option>
            <option value="adjustment">Adjustment</option>
          </select>

          <select
            value={reasonFilter}
            onChange={(e) => {
              setReasonFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs font-medium focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Reasons</option>
            <option value="order_confirmed">Order Fulfillment</option>
            <option value="order_cancelled">Order Cancelled (Restored)</option>
            <option value="purchase_order_received">PO Shipment Intake</option>
            <option value="manual_adjustment">Manual Adjustment</option>
            <option value="damaged">Damaged / Expired</option>
            <option value="audit">Periodic Audit</option>
            <option value="return">Customer Return</option>
          </select>

          <div className="flex items-center space-x-1.5 text-xs text-gray-500">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs"
            />
            <span>to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/60 text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3.5">Timestamp</th>
                <th className="px-6 py-3.5">Product & SKU</th>
                <th className="px-6 py-3.5">Type</th>
                <th className="px-6 py-3.5">Delta</th>
                <th className="px-6 py-3.5">Quantity Change</th>
                <th className="px-6 py-3.5">Reason</th>
                <th className="px-6 py-3.5">Authorized By</th>
                <th className="px-6 py-3.5">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-750">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-gray-400">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading audit history...</span>
                    </div>
                  </td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                    No stock movements found.
                  </td>
                </tr>
              ) : (
                movements.map((m) => {
                  const isIn = m.type === 'in';
                  const isOut = m.type === 'out';
                  return (
                    <tr key={m._id} className="hover:bg-gray-50/70 dark:hover:bg-gray-750/50 transition-colors text-xs">
                      <td className="px-6 py-4 text-gray-500">
                        {new Date(m.createdAt).toLocaleDateString()}
                        <span className="block text-[10px] text-gray-400">
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {m.product?.name || 'Deleted Product'}
                        </div>
                        <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                          {m.product?.sku}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isIn
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : isOut
                              ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                          }`}
                        >
                          {m.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold">
                        <span className={isIn ? 'text-emerald-600' : isOut ? 'text-red-600' : 'text-blue-600'}>
                          {isIn ? `+${m.quantity}` : isOut ? `-${m.quantity}` : `${m.quantity}`}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-gray-600 dark:text-gray-400">
                        <span>{m.previousQuantity}</span>
                        <span className="mx-1 text-gray-300">→</span>
                        <strong className="text-gray-900 dark:text-white">{m.newQuantity}</strong>
                      </td>
                      <td className="px-6 py-4">
                        {renderReasonBadge(m.reason)}
                      </td>
                      <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                        {m.performedBy?.name || 'System / Auto'}
                      </td>
                      <td className="px-6 py-4 text-gray-400 truncate max-w-xs">
                        {m.notes || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500">
            <span>Page {page} of {totalPages}</span>
            <div className="space-x-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockMovements;
