import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  FileSpreadsheet,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Truck,
  Package,
  Calendar,
  X,
  AlertCircle,
  Clock,
  Layers,
} from 'lucide-react';

const PurchaseOrders = () => {
  const [searchParams] = useSearchParams();
  const preselectedProductId = searchParams.get('productId');

  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dropdowns
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Create Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [poItems, setPoItems] = useState([
    { product: '', quantity: 10, unitCost: 0, totalCost: 0 },
  ]);
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Receive confirmation
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [poToReceive, setPoToReceive] = useState(null);

  // Fetch reference dropdowns
  useEffect(() => {
    const fetchRefs = async () => {
      try {
        const [supRes, prodRes] = await Promise.all([
          api.get('/suppliers/all'),
          api.get('/products?limit=100&status=active'),
        ]);
        setSuppliers(supRes.data.data);
        setProducts(prodRes.data.data);

        // If opened with preselected product (one-click from low-stock alert)
        if (preselectedProductId) {
          const matchedProd = prodRes.data.data.find((p) => p._id === preselectedProductId);
          if (matchedProd) {
            setSelectedSupplier(matchedProd.supplier?._id || matchedProd.supplier);
            setPoItems([
              {
                product: matchedProd._id,
                quantity: Math.max(10, matchedProd.reorderLevel * 2),
                unitCost: matchedProd.costPrice,
                totalCost: matchedProd.costPrice * Math.max(10, matchedProd.reorderLevel * 2),
              },
            ]);
            setNotes(`Restocking for low inventory on ${matchedProd.name}`);
            setCreateModalOpen(true);
          }
        }
      } catch (err) {
        console.warn('Failed to load PO references:', err);
      }
    };
    fetchRefs();
  }, [preselectedProductId]);

  const fetchPOs = async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({
        page,
        limit: 10,
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
        ...(supplierFilter && { supplier: supplierFilter }),
      });
      const res = await api.get(`/purchase-orders?${params.toString()}`);
      setPurchaseOrders(res.data.data);
      setTotalPages(res.data.meta?.totalPages || 1);
      setTotal(res.data.meta?.total || 0);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch purchase orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPOs();
  }, [page, statusFilter, supplierFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchPOs();
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...poItems];
    if (field === 'product') {
      const prod = products.find((p) => p._id === value);
      if (prod) {
        updated[index].product = value;
        updated[index].unitCost = prod.costPrice;
        updated[index].totalCost = prod.costPrice * (updated[index].quantity || 1);
      } else {
        updated[index].product = '';
        updated[index].unitCost = 0;
        updated[index].totalCost = 0;
      }
    } else if (field === 'quantity') {
      const qty = parseInt(value, 10) || 1;
      updated[index].quantity = qty;
      updated[index].totalCost = (updated[index].unitCost || 0) * qty;
    } else if (field === 'unitCost') {
      const cost = parseFloat(value) || 0;
      updated[index].unitCost = cost;
      updated[index].totalCost = cost * (updated[index].quantity || 1);
    }
    setPoItems(updated);
  };

  const handleAddItem = () => {
    setPoItems([...poItems, { product: '', quantity: 10, unitCost: 0, totalCost: 0 }]);
  };

  const handleRemoveItem = (index) => {
    if (poItems.length === 1) return;
    setPoItems(poItems.filter((_, i) => i !== index));
  };

  const totalPoAmount = poItems.reduce((acc, i) => acc + (i.totalCost || 0), 0);

  const handleCreatePoSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSupplier) {
      setError('Please select a supplier');
      return;
    }
    const validItems = poItems.filter((i) => i.product && i.quantity > 0);
    if (validItems.length === 0) {
      setError('Please add at least one line item with quantity');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await api.post('/purchase-orders', {
        supplier: selectedSupplier,
        items: validItems,
        expectedDeliveryDate: expectedDate || undefined,
        notes,
      });
      setSuccess('Purchase order placed successfully');
      setCreateModalOpen(false);
      setSelectedSupplier('');
      setPoItems([{ product: '', quantity: 10, unitCost: 0, totalCost: 0 }]);
      setNotes('');
      fetchPOs();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create purchase order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReceiveConfirm = async () => {
    if (!poToReceive) return;
    setSubmitting(true);
    setError('');
    try {
      await api.put(`/purchase-orders/${poToReceive._id}/receive`);
      setSuccess(`PO ${poToReceive.poNumber} received: Inventory stock quantities automatically incremented`);
      setReceiveModalOpen(false);
      fetchPOs();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to receive purchase order');
      setReceiveModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelPo = async (po) => {
    if (!confirm(`Cancel Purchase Order ${po.poNumber}?`)) return;
    try {
      await api.put(`/purchase-orders/${po._id}/cancel`);
      setSuccess(`PO ${po.poNumber} cancelled`);
      fetchPOs();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel PO');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Purchase Orders</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Supplier procurement, restock shipments, and automated inventory intake ({total} orders)
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedSupplier(suppliers[0]?._id || '');
            setCreateModalOpen(true);
          }}
          className="inline-flex items-center justify-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-xl transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Purchase Order
        </button>
      </div>

      {/* Alerts */}
      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-sm flex items-center justify-between border border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4" />
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
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row gap-4 justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-sm relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search PO number..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs focus:ring-2 focus:ring-emerald-500"
          />
        </form>

        <div className="flex items-center space-x-3">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs font-medium focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All PO Statuses</option>
            <option value="ordered">Ordered (Awaiting Delivery)</option>
            <option value="received">Received (Stock Updated)</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={supplierFilter}
            onChange={(e) => {
              setSupplierFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs font-medium focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Suppliers</option>
            {suppliers.map((s) => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Purchase Orders Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/60 text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3.5">PO Number</th>
                <th className="px-6 py-3.5">Supplier</th>
                <th className="px-6 py-3.5">Items</th>
                <th className="px-6 py-3.5">Total Cost</th>
                <th className="px-6 py-3.5">Expected Delivery</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-750">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-400">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading purchase orders...</span>
                    </div>
                  </td>
                </tr>
              ) : purchaseOrders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    No purchase orders found.
                  </td>
                </tr>
              ) : (
                purchaseOrders.map((po) => (
                  <tr key={po._id} className="hover:bg-gray-50/70 dark:hover:bg-gray-750/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {po.poNumber}
                      </span>
                      <p className="text-[10px] text-gray-400">
                        {new Date(po.createdAt).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {po.supplier?.name}
                      </div>
                      <span className="text-xs text-gray-400">{po.supplier?.contactPerson}</span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600 dark:text-gray-300">
                      {po.items?.length || 0} product lines
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                      ${po.totalAmount?.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">
                      {po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                          po.status === 'received'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : po.status === 'ordered'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {po.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {po.status === 'ordered' && (
                        <div className="inline-flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setPoToReceive(po);
                              setReceiveModalOpen(true);
                            }}
                            className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
                          >
                            Receive Stock
                          </button>
                          <button
                            onClick={() => handleCancelPo(po)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            title="Cancel PO"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      {po.status === 'received' && (
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                          Intake Complete
                        </span>
                      )}
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

      {/* Receive PO Modal */}
      {receiveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold">Receive Shipment into Stock</h3>
                <p className="text-xs text-gray-500 font-mono">{poToReceive?.poNumber}</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-300 mb-4">
              Confirming receipt will automatically increase the on-hand quantities in the inventory catalog for all {poToReceive?.items?.length} items and log corresponding stock intake movements.
            </p>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setReceiveModalOpen(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleReceiveConfirm}
                disabled={submitting}
                className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl disabled:opacity-60"
              >
                {submitting ? 'Receiving...' : 'Confirm & Increase Stock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create PO Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-gray-200 dark:border-gray-700 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-bold">New Purchase Order</h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePoSubmit} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block uppercase font-semibold text-gray-500 mb-1">Supplier</label>
                  <select
                    required
                    value={selectedSupplier}
                    onChange={(e) => setSelectedSupplier(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Select Supplier...</option>
                    {suppliers.map((s) => (
                      <option key={s._id} value={s._id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block uppercase font-semibold text-gray-500 mb-1">Expected Delivery Date</label>
                  <input
                    type="date"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                  />
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="uppercase font-semibold text-gray-500">Items to Order</span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs font-semibold text-emerald-600 hover:underline flex items-center"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add Product
                  </button>
                </div>

                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {poItems.map((item, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-12 gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-750 items-center"
                    >
                      <div className="col-span-5">
                        <select
                          required
                          value={item.product}
                          onChange={(e) => handleItemChange(index, 'product', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs"
                        >
                          <option value="">Select product...</option>
                          {products.map((p) => (
                            <option key={p._id} value={p._id}>
                              {p.name} ({p.sku}) - Current Qty: {p.quantity}
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

                      <div className="col-span-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          value={item.unitCost}
                          onChange={(e) => handleItemChange(index, 'unitCost', e.target.value)}
                          placeholder="Cost"
                          className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-mono"
                        />
                      </div>

                      <div className="col-span-2 text-right">
                        <span className="font-mono font-bold">${(item.totalCost || 0).toFixed(2)}</span>
                      </div>

                      <div className="col-span-1 text-right">
                        {poItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
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

              {/* Total Summary */}
              <div className="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900 flex justify-between items-center text-sm">
                <span className="font-semibold text-gray-700 dark:text-gray-300">Total Purchase Commitment:</span>
                <span className="font-mono font-bold text-lg text-emerald-700 dark:text-emerald-300">
                  ${totalPoAmount.toFixed(2)}
                </span>
              </div>

              <div>
                <label className="block uppercase font-semibold text-gray-500 mb-1">Notes / Instructions</label>
                <textarea
                  rows="2"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Order notes, tracking numbers, or carrier terms..."
                  className="w-full px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl disabled:opacity-60"
                >
                  {submitting ? 'Placing PO...' : 'Submit Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrders;
