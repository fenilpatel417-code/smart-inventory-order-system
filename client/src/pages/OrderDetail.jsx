import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import {
  ArrowLeft,
  Download,
  CheckCircle2,
  Clock,
  PackageCheck,
  Truck,
  CheckCheck,
  XCircle,
  AlertCircle,
  User,
  MapPin,
  Calendar,
  CreditCard,
  FileText,
} from 'lucide-react';

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [transitioning, setTransitioning] = useState(false);

  // Transition Note Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');

  const fetchOrder = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/orders/${id}`);
      setOrder(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const handleOpenTransitionModal = (status) => {
    setTargetStatus(status);
    setStatusNote('');
    setModalOpen(true);
  };

  const handleExecuteStatusTransition = async (e) => {
    e.preventDefault();
    setTransitioning(true);
    setError('');
    try {
      const res = await api.put(`/orders/${id}/status`, {
        status: targetStatus,
        note: statusNote,
      });
      setOrder(res.data.data);
      setSuccess(`Order successfully updated to ${targetStatus.toUpperCase()}`);
      setModalOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update order status');
    } finally {
      setTransitioning(false);
    }
  };

  const handleDownloadInvoice = async () => {
    if (!order) return;
    try {
      const res = await api.get(`/orders/${order._id}/invoice`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${order.orderNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Failed to download invoice PDF');
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-gray-400">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm">Retrieving order details...</p>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 bg-red-50 dark:bg-red-950/30 rounded-2xl border border-red-200 dark:border-red-900 text-center">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-red-700 dark:text-red-300">Order Not Found</h2>
        <p className="text-xs text-red-600 mt-1 mb-4">{error}</p>
        <Link to="/orders" className="text-xs font-semibold text-emerald-600 hover:underline">
          Return to Orders
        </Link>
      </div>
    );
  }

  // Pipeline step order
  const steps = [
    { key: 'pending', label: 'Pending', icon: Clock },
    { key: 'confirmed', label: 'Confirmed', icon: CheckCircle2 },
    { key: 'packed', label: 'Packed', icon: PackageCheck },
    { key: 'shipped', label: 'Shipped', icon: Truck },
    { key: 'delivered', label: 'Delivered', icon: CheckCheck },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === order.orderStatus);
  const isCancelled = order.orderStatus === 'cancelled';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back button & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/orders')}
            className="p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 text-gray-500"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold font-mono tracking-tight text-gray-900 dark:text-white">
                {order.orderNumber}
              </h1>
              {order.stockDeducted && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  Stock Deducted
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Placed on {new Date(order.createdAt).toLocaleDateString()} at{' '}
              {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleDownloadInvoice}
            className="inline-flex items-center px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs font-semibold shadow-xs"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
            Download PDF Invoice
          </button>
        </div>
      </div>

      {/* Alerts */}
      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-sm flex items-center justify-between border border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess('')}><XCircle className="w-4 h-4" /></button>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-sm flex items-center justify-between border border-red-200 dark:border-red-800">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')}><XCircle className="w-4 h-4" /></button>
        </div>
      )}

      {/* Visual Pipeline Timeline Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xs uppercase font-semibold text-gray-500 tracking-wider mb-6">
          Order Status Pipeline
        </h2>

        {isCancelled ? (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-sm flex items-center space-x-3">
            <XCircle className="w-6 h-6 flex-shrink-0" />
            <div>
              <p className="font-bold">This order has been cancelled.</p>
              <p className="text-xs mt-0.5 text-red-600 dark:text-red-400">
                All previously reserved line item quantities were safely restored back to inventory catalog.
              </p>
            </div>
          </div>
        ) : (
          <div className="relative">
            <div className="hidden sm:block absolute top-1/2 left-0 right-0 h-1 bg-gray-100 dark:bg-gray-700 -translate-y-1/2 z-0" />
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 relative z-10">
              {steps.map((s, idx) => {
                const Icon = s.icon;
                const isPassed = currentStepIndex >= idx;
                const isCurrent = currentStepIndex === idx;

                return (
                  <div key={s.key} className="flex flex-col items-center text-center">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm transition-all shadow-sm ${
                        isCurrent
                          ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 dark:ring-emerald-950/60'
                          : isPassed
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                          : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span
                      className={`text-xs font-semibold mt-2.5 ${
                        isCurrent
                          ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                          : isPassed
                          ? 'text-gray-900 dark:text-white'
                          : 'text-gray-400'
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Buttons for Next Transition */}
        {!isCancelled && order.orderStatus !== 'delivered' && (
          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-gray-500">Available Next Actions:</span>
            <div className="flex items-center space-x-2.5">
              {order.orderStatus === 'pending' && (
                <button
                  onClick={() => handleOpenTransitionModal('confirmed')}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Order (Deducts Stock)</span>
                </button>
              )}

              {order.orderStatus === 'confirmed' && (
                <button
                  onClick={() => handleOpenTransitionModal('packed')}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm flex items-center space-x-1.5"
                >
                  <PackageCheck className="w-4 h-4" />
                  <span>Mark as Packed</span>
                </button>
              )}

              {order.orderStatus === 'packed' && (
                <button
                  onClick={() => handleOpenTransitionModal('shipped')}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm flex items-center space-x-1.5"
                >
                  <Truck className="w-4 h-4" />
                  <span>Mark as Shipped</span>
                </button>
              )}

              {order.orderStatus === 'shipped' && (
                <button
                  onClick={() => handleOpenTransitionModal('delivered')}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm flex items-center space-x-1.5"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>Mark as Delivered</span>
                </button>
              )}

              <button
                onClick={() => handleOpenTransitionModal('cancelled')}
                className="px-3 py-2 rounded-xl border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-semibold"
              >
                Cancel Order
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Grid: Order Items & Customer Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Items & Pricing */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">
              Ordered Line Items ({order.items?.length})
            </h3>

            <div className="divide-y divide-gray-100 dark:divide-gray-700 text-sm">
              {order.items?.map((item) => (
                <div key={item._id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{item.name}</p>
                    <p className="text-xs text-gray-400 font-mono">SKU: {item.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900 dark:text-white">
                      ${item.subtotal?.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {item.quantity} × ${item.price?.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Financial Summary */}
            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-2 text-xs">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Subtotal:</span>
                <span className="font-mono">${order.subtotal?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Tax ({(order.taxRate * 100).toFixed(0)}%):</span>
                <span className="font-mono">${order.taxAmount?.toFixed(2)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-amber-600">
                  <span>Discount:</span>
                  <span className="font-mono">-${order.discount?.toFixed(2)}</span>
                </div>
              )}
              {order.shippingCost > 0 && (
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Shipping:</span>
                  <span className="font-mono">+${order.shippingCost?.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-gray-900 dark:text-white pt-3 border-t border-gray-200 dark:border-gray-700">
                <span>Total Amount:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 text-lg">
                  ${order.total?.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Audit Status History */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">
              Status History Audit Log
            </h3>
            <div className="space-y-4">
              {order.statusHistory?.map((entry, idx) => (
                <div key={idx} className="flex items-start space-x-3 text-xs">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                        {entry.status}
                      </span>
                      <span className="text-gray-400 text-[11px]">
                        {new Date(entry.timestamp).toLocaleString()}
                      </span>
                    </div>
                    {entry.note && <p className="text-gray-500 mt-0.5">{entry.note}</p>}
                    {entry.changedBy && (
                      <span className="text-[10px] text-gray-400">by {entry.changedBy.name}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Customer & Shipping Details */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4 text-xs">
            <div className="flex items-center space-x-2 text-sm font-bold text-gray-900 dark:text-white">
              <User className="w-4 h-4 text-emerald-600" />
              <span>Customer Information</span>
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">
                {order.customer?.name}
              </p>
              <p className="text-gray-500 mt-0.5">{order.customer?.email}</p>
              <p className="text-gray-500">{order.customer?.phone}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4 text-xs">
            <div className="flex items-center space-x-2 text-sm font-bold text-gray-900 dark:text-white">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>Shipping Destination</span>
            </div>
            <div>
              <p className="text-gray-700 dark:text-gray-300">
                {order.shippingAddress?.street || 'No street specified'}
              </p>
              <p className="text-gray-500 mt-0.5">
                {order.shippingAddress?.city} {order.shippingAddress?.state}{' '}
                {order.shippingAddress?.postalCode}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-3 text-xs">
            <div className="flex items-center space-x-2 text-sm font-bold text-gray-900 dark:text-white">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>Payment Details</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Method:</span>
              <span className="font-semibold uppercase">{order.paymentMethod}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Status:</span>
              <span className="font-semibold uppercase text-emerald-600">{order.paymentStatus}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Transition Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-base font-bold">
                Transition Status to: <span className="uppercase text-emerald-600">{targetStatus}</span>
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteStatusTransition} className="space-y-4 mt-4 text-xs">
              {targetStatus === 'confirmed' && (
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
                  <p className="font-semibold">Inventory Deduction Confirmation:</p>
                  <p className="text-[11px] mt-0.5">
                    Confirming this order will atomically decrement item quantities from stock and log stock movements.
                  </p>
                </div>
              )}

              {targetStatus === 'cancelled' && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300">
                  <p className="font-semibold">Stock Restoration Warning:</p>
                  <p className="text-[11px] mt-0.5">
                    Cancelling will restore all line item quantities back to available inventory.
                  </p>
                </div>
              )}

              <div>
                <label className="block uppercase font-semibold text-gray-500 mb-1">
                  Transition Note / Remarks
                </label>
                <textarea
                  rows="3"
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="e.g. Courier tracking code #12345, payment verified..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transitioning}
                  className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl disabled:opacity-60"
                >
                  {transitioning ? 'Updating...' : 'Confirm Status Change'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetail;
