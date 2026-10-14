import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  ShoppingCart,
  Plus,
  Search,
  Filter,
  FileText,
  Eye,
  Trash2,
  X,
  CheckCircle,
  AlertCircle,
  Calendar,
  CreditCard,
  ChevronRight,
  Download,
} from 'lucide-react';

const Orders = () => {
  const { isAdmin } = useAuth();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dropdown reference data
  const [customers, setCustomers] = useState([]);
  const [productsList, setProductsList] = useState([]);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Create Order Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [lineItems, setLineItems] = useState([
    { product: '', quantity: 1, price: 0, subtotal: 0, availableStock: 0 },
  ]);
  const [taxRate, setTaxRate] = useState(0.1);
  const [discount, setDiscount] = useState(0);
  const [shippingCost, setShippingCost] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);

  // Fetch reference data for order creation
  useEffect(() => {
    const fetchRefs = async () => {
      try {
        const [cRes, pRes] = await Promise.all([
          api.get('/customers/all'),
          api.get('/products?limit=100&status=active'),
        ]);
        setCustomers(cRes.data.data);
        setProductsList(pRes.data.data);
      } catch (err) {
        console.warn('Failed to load customers or products:', err);
      }
    };
    fetchRefs();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({
        page,
        limit: 10,
        ...(search && { search }),
        ...(orderStatusFilter && { orderStatus: orderStatusFilter }),
        ...(paymentStatusFilter && { paymentStatus: paymentStatusFilter }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      });

      const res = await api.get(`/orders?${params.toString()}`);
      setOrders(res.data.data);
      setTotalPages(res.data.meta?.totalPages || 1);
      setTotal(res.data.meta?.total || 0);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, orderStatusFilter, paymentStatusFilter, startDate, endDate]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchOrders();
  };

  // Line item manipulation
  const handleItemChange = (index, field, value) => {
    const updated = [...lineItems];
    if (field === 'product') {
      const prod = productsList.find((p) => p._id === value);
      if (prod) {
        updated[index].product = value;
        updated[index].price = prod.price;
        updated[index].availableStock = prod.quantity;
        updated[index].subtotal = prod.price * (updated[index].quantity || 1);
      } else {
        updated[index].product = '';
        updated[index].price = 0;
        updated[index].subtotal = 0;
      }
    } else if (field === 'quantity') {
      const qty = parseInt(value, 10) || 1;
      updated[index].quantity = qty;
      updated[index].subtotal = updated[index].price * qty;
    }
    setLineItems(updated);
  };

  const handleAddLineItem = () => {
    setLineItems([
      ...lineItems,
      { product: '', quantity: 1, price: 0, subtotal: 0, availableStock: 0 },
    ]);
  };

  const handleRemoveLineItem = (index) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  // Calculation helpers
  const calculateSubtotal = () => {
    return lineItems.reduce((acc, item) => acc + (item.subtotal || 0), 0);
  };
  const subtotal = calculateSubtotal();
  const taxAmount = parseFloat((subtotal * taxRate).toFixed(2));
  const grandTotal = Math.max(0, subtotal + taxAmount + Number(shippingCost) - Number(discount));

  const handleCreateOrderSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      setError('Please select a customer for this order');
      return;
    }

    const validItems = lineItems.filter((i) => i.product && i.quantity > 0);
    if (validItems.length === 0) {
      setError('Please add at least one product with quantity');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await api.post('/orders', {
        customer: selectedCustomerId,
        items: validItems.map((i) => ({ product: i.product, quantity: i.quantity, price: i.price })),
        taxRate: Number(taxRate),
        discount: Number(discount),
        shippingCost: Number(shippingCost),
        paymentMethod,
        paymentStatus,
        notes,
      });

      setSuccess('Order created successfully in Pending status');
      setCreateModalOpen(false);
      // Reset form
      setSelectedCustomerId('');
      setLineItems([{ product: '', quantity: 1, price: 0, subtotal: 0, availableStock: 0 }]);
      setDiscount(0);
      setShippingCost(0);
      setNotes('');
      fetchOrders();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadInvoice = async (orderId, orderNumber) => {
    try {
      const res = await api.get(`/orders/${orderId}/invoice`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${orderNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Failed to download PDF invoice');
    }
  };

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;
    setSubmitting(true);
    setError('');
    try {
      await api.delete(`/orders/${orderToDelete._id}`);
      setSuccess('Order record removed');
      setDeleteModalOpen(false);
      fetchOrders();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete order');
      setDeleteModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const renderOrderStatusBadge = (status) => {
    const map = {
      pending: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
      confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300',
      packed: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300',
      shipped: 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300',
      delivered: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
      cancelled: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${map[status] || 'bg-gray-100'}`}>
        {status}
      </span>
    );
  };

  const renderPaymentBadge = (status) => {
    const map = {
      paid: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400',
      pending: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400',
      refunded: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400',
      failed: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400',
    };
    return (
      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${map[status] || 'bg-gray-50'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customer Orders</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Fulfill orders, track shipping pipelines, and manage invoice generation ({total} orders)
          </p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center justify-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-xl transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Order
        </button>
      </div>

      {/* Alerts */}
      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-sm flex items-center justify-between border border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-sm flex items-center justify-between border border-red-200 dark:border-red-800">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col lg:flex-row gap-3 justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-sm relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order number..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs focus:ring-2 focus:ring-emerald-500"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={orderStatusFilter}
            onChange={(e) => {
              setOrderStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs font-medium focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Fulfillment Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="packed">Packed</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={paymentStatusFilter}
            onChange={(e) => {
              setPaymentStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs font-medium focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Payment Statuses</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="refunded">Refunded</option>
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

      {/* Orders Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/60 text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3.5">Order No.</th>
                <th className="px-6 py-3.5">Customer</th>
                <th className="px-6 py-3.5">Date</th>
                <th className="px-6 py-3.5">Items</th>
                <th className="px-6 py-3.5">Total Amount</th>
                <th className="px-6 py-3.5">Payment</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-750">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-gray-400">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading customer orders...</span>
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                    No orders match your filter selection.
                  </td>
                </tr>
              ) : (
                orders.map((ord) => (
                  <tr key={ord._id} className="hover:bg-gray-50/70 dark:hover:bg-gray-750/50 transition-colors">
                    <td className="px-6 py-4">
                      <Link
                        to={`/orders/${ord._id}`}
                        className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-1"
                      >
                        <span>{ord.orderNumber}</span>
                        <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {ord.customer?.name || 'Walk-in'}
                      </div>
                      <span className="text-xs text-gray-400">{ord.customer?.phone}</span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">
                      {new Date(ord.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600 dark:text-gray-300">
                      {ord.items?.length || 0} line items
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                      ${ord.total?.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      {renderPaymentBadge(ord.paymentStatus)}
                    </td>
                    <td className="px-6 py-4">
                      {renderOrderStatusBadge(ord.orderStatus)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center space-x-2">
                        <Link
                          to={`/orders/${ord._id}`}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition-colors"
                        >
                          Track
                        </Link>
                        <button
                          onClick={() => handleDownloadInvoice(ord._id, ord.orderNumber)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                          title="Download PDF Invoice"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => {
                              setOrderToDelete(ord);
                              setDeleteModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                            title="Delete Order"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
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

      {/* Create Order Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-gray-200 dark:border-gray-700 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-bold">New Sales Order</h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrderSubmit} className="space-y-4 mt-4 text-xs">
              {/* Customer Selector */}
              <div>
                <label className="block uppercase font-semibold text-gray-500 mb-1">Select Customer</label>
                <select
                  required
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Choose customer...</option>
                  {customers.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Line Items Builder */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="uppercase font-semibold text-gray-500">Order Items</span>
                  <button
                    type="button"
                    onClick={handleAddLineItem}
                    className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add Another Item
                  </button>
                </div>

                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {lineItems.map((item, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-12 gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-750 items-center"
                    >
                      <div className="col-span-6">
                        <select
                          required
                          value={item.product}
                          onChange={(e) => handleItemChange(index, 'product', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs"
                        >
                          <option value="">Select product...</option>
                          {productsList.map((p) => (
                            <option key={p._id} value={p._id}>
                              {p.name} (${p.price}) - In Stock: {p.quantity}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-2">
                        <input
                          type="number"
                          min="1"
                          required
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          placeholder="Qty"
                          className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-mono"
                        />
                      </div>

                      <div className="col-span-3 text-right">
                        <span className="font-mono font-bold">${(item.subtotal || 0).toFixed(2)}</span>
                      </div>

                      <div className="col-span-1 text-right">
                        {lineItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLineItem(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Adjustments: Discount, Tax, Shipping */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block uppercase font-semibold text-gray-500 mb-1">Discount ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block uppercase font-semibold text-gray-500 mb-1">Tax Rate</label>
                  <select
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs"
                  >
                    <option value={0}>0% (Exempt)</option>
                    <option value={0.05}>5%</option>
                    <option value={0.1}>10% (Standard)</option>
                    <option value={0.15}>15%</option>
                  </select>
                </div>
                <div>
                  <label className="block uppercase font-semibold text-gray-500 mb-1">Shipping Fee ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={shippingCost}
                    onChange={(e) => setShippingCost(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Payment Details */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block uppercase font-semibold text-gray-500 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Credit / Debit Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="online">Online Payment</option>
                  </select>
                </div>
                <div>
                  <label className="block uppercase font-semibold text-gray-500 mb-1">Payment Status</label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs"
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              </div>

              {/* Calculation Summary Box */}
              <div className="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900 space-y-1 text-xs">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Subtotal:</span>
                  <span className="font-mono font-medium">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Tax ({taxRate * 100}%):</span>
                  <span className="font-mono font-medium">${taxAmount.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-amber-600 dark:text-amber-400">
                    <span>Discount:</span>
                    <span className="font-mono font-medium">-${Number(discount).toFixed(2)}</span>
                  </div>
                )}
                {shippingCost > 0 && (
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Shipping:</span>
                    <span className="font-mono font-medium">+${Number(shippingCost).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-gray-900 dark:text-white pt-2 border-t border-emerald-200 dark:border-emerald-800">
                  <span>Grand Total:</span>
                  <span className="font-mono text-emerald-700 dark:text-emerald-300">
                    ${grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block uppercase font-semibold text-gray-500 mb-1">Order Notes (Optional)</label>
                <textarea
                  rows="2"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Special delivery instructions or order notes..."
                  className="w-full px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl disabled:opacity-60"
                >
                  {submitting ? 'Creating Order...' : 'Create Sales Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-sm w-full p-6 shadow-xl border border-gray-200 dark:border-gray-700 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold">Delete Order?</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-4">
              Are you sure you want to delete order <strong>{orderToDelete?.orderNumber}</strong>?
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="flex-1 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteOrder}
                disabled={submitting}
                className="flex-1 py-2 text-sm bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl disabled:opacity-60"
              >
                {submitting ? 'Deleting...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
