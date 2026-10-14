import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  Truck,
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  X,
  CheckCircle,
  AlertCircle,
  Mail,
  Phone,
  MapPin,
  Package,
  FileSpreadsheet,
} from 'lucide-react';

const Suppliers = () => {
  const { isAdmin } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [supplierDetail, setSupplierDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState(null);

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: { street: '', city: '', state: '', postalCode: '', country: 'USA' },
    notes: '',
    status: 'active',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({
        page,
        limit: 10,
        ...(search && { search }),
      });
      const res = await api.get(`/suppliers?${params.toString()}`);
      setSuppliers(res.data.data);
      setTotalPages(res.data.meta?.totalPages || 1);
      setTotal(res.data.meta?.total || 0);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch suppliers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [page, search]);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setSelectedId(null);
    setFormData({
      name: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: { street: '', city: '', state: '', postalCode: '', country: 'USA' },
      notes: '',
      status: 'active',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (sup) => {
    setIsEditing(true);
    setSelectedId(sup._id);
    setFormData({
      name: sup.name,
      contactPerson: sup.contactPerson,
      email: sup.email,
      phone: sup.phone,
      address: sup.address || { street: '', city: '', state: '', postalCode: '', country: 'USA' },
      notes: sup.notes || '',
      status: sup.status || 'active',
    });
    setModalOpen(true);
  };

  const handleViewDetail = async (id) => {
    try {
      setDetailLoading(true);
      setDetailModalOpen(true);
      const res = await api.get(`/suppliers/${id}`);
      setSupplierDetail(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch supplier details');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      if (isEditing) {
        await api.put(`/suppliers/${selectedId}`, formData);
        setSuccess('Supplier updated successfully');
      } else {
        await api.post('/suppliers', formData);
        setSuccess('Supplier created successfully');
      }
      setModalOpen(false);
      fetchSuppliers();
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!supplierToDelete) return;
    setSubmitting(true);
    setError('');
    try {
      await api.delete(`/suppliers/${supplierToDelete._id}`);
      setSuccess('Supplier deleted successfully');
      setDeleteModalOpen(false);
      fetchSuppliers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete supplier');
      setDeleteModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Suppliers Directory</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage wholesale vendors, linked products and procurement history ({total} suppliers)
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-xl transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Supplier
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

      {/* Search Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by company name, contact, email or phone..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/60 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3.5">Company Name</th>
                <th className="px-6 py-3.5">Contact Person</th>
                <th className="px-6 py-3.5">Contact Info</th>
                <th className="px-6 py-3.5">Location</th>
                <th className="px-6 py-3.5">Products</th>
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
                      <span>Loading suppliers...</span>
                    </div>
                  </td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    No suppliers found matching your query.
                  </td>
                </tr>
              ) : (
                suppliers.map((s) => (
                  <tr key={s._id} className="hover:bg-gray-50/70 dark:hover:bg-gray-750/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900 dark:text-white">{s.name}</div>
                      {s.notes && <div className="text-xs text-gray-400 truncate max-w-xs">{s.notes}</div>}
                    </td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300 font-medium">
                      {s.contactPerson}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                      <div className="flex items-center space-x-1.5">
                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                        <span>{s.email}</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        <span>{s.phone}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">
                      {s.address?.city ? `${s.address.city}, ${s.address.state || s.address.country}` : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                        {s.productCount || 0} items
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center space-x-1.5">
                        <button
                          onClick={() => handleViewDetail(s._id)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(s)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                          title="Edit Supplier"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => {
                              setSupplierToDelete(s);
                              setDeleteModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                            title="Delete Supplier"
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

      {/* Supplier Detail Modal */}
      {detailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700">
              <div>
                <h3 className="text-xl font-bold">{supplierDetail?.supplier?.name || 'Supplier Details'}</h3>
                <p className="text-xs text-gray-500">Contact: {supplierDetail?.supplier?.contactPerson}</p>
              </div>
              <button onClick={() => setDetailModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailLoading ? (
              <div className="py-12 text-center text-gray-400">Loading supplier data...</div>
            ) : (
              <div className="space-y-6 mt-4">
                {/* Contact and address cards */}
                <div className="grid grid-cols-2 gap-4 text-xs bg-gray-50 dark:bg-gray-750 p-4 rounded-xl">
                  <div>
                    <span className="text-gray-400 block uppercase tracking-wider font-semibold">Email & Phone</span>
                    <p className="font-medium text-gray-800 dark:text-gray-200 mt-1">{supplierDetail?.supplier?.email}</p>
                    <p className="text-gray-500">{supplierDetail?.supplier?.phone}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 block uppercase tracking-wider font-semibold">Mailing Address</span>
                    <p className="font-medium text-gray-800 dark:text-gray-200 mt-1">
                      {supplierDetail?.supplier?.address?.street || 'No street specified'}
                    </p>
                    <p className="text-gray-500">
                      {supplierDetail?.supplier?.address?.city} {supplierDetail?.supplier?.address?.state} {supplierDetail?.supplier?.address?.postalCode}
                    </p>
                  </div>
                </div>

                {/* Linked Products */}
                <div>
                  <h4 className="text-sm font-bold flex items-center space-x-2 mb-3">
                    <Package className="w-4 h-4 text-emerald-600" />
                    <span>Catalog Products Supplied ({supplierDetail?.products?.length || 0})</span>
                  </h4>
                  <div className="max-h-48 overflow-y-auto border border-gray-100 dark:border-gray-700 rounded-xl divide-y divide-gray-100 dark:divide-gray-700 text-xs">
                    {supplierDetail?.products?.length === 0 ? (
                      <p className="p-4 text-gray-400 text-center">No products linked to this supplier yet.</p>
                    ) : (
                      supplierDetail?.products?.map((p) => (
                        <div key={p._id} className="p-3 flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-gray-900 dark:text-white">{p.name}</span>
                            <span className="text-gray-400 ml-2 font-mono">[{p.sku}]</span>
                          </div>
                          <div className="text-right">
                            <span className="font-semibold">${p.price?.toFixed(2)}</span>
                            <span className="text-gray-400 ml-3">Qty: {p.quantity}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Purchase Order History */}
                <div>
                  <h4 className="text-sm font-bold flex items-center space-x-2 mb-3">
                    <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                    <span>Recent Purchase Orders ({supplierDetail?.purchaseOrders?.length || 0})</span>
                  </h4>
                  <div className="max-h-40 overflow-y-auto border border-gray-100 dark:border-gray-700 rounded-xl divide-y divide-gray-100 dark:divide-gray-700 text-xs">
                    {supplierDetail?.purchaseOrders?.length === 0 ? (
                      <p className="p-4 text-gray-400 text-center">No purchase orders recorded for this supplier.</p>
                    ) : (
                      supplierDetail?.purchaseOrders?.map((po) => (
                        <div key={po._id} className="p-3 flex items-center justify-between">
                          <div>
                            <span className="font-semibold font-mono text-emerald-600">{po.poNumber}</span>
                            <span className="text-gray-400 ml-2">{new Date(po.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className="font-bold">${po.totalAmount?.toFixed(2)}</span>
                            <span className="capitalize px-2 py-0.5 rounded text-[10px] bg-gray-100 dark:bg-gray-700">
                              {po.status}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Supplier Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-bold">{isEditing ? 'Edit Supplier' : 'Add Supplier'}</h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block uppercase font-semibold text-gray-500 mb-1">Company Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block uppercase font-semibold text-gray-500 mb-1">Contact Person</label>
                  <input
                    type="text"
                    required
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block uppercase font-semibold text-gray-500 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block uppercase font-semibold text-gray-500 mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block uppercase font-semibold text-gray-500 mb-1">Street Address</label>
                <input
                  type="text"
                  value={formData.address.street}
                  onChange={(e) => setFormData({ ...formData, address: { ...formData.address, street: e.target.value } })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block uppercase font-semibold text-gray-500 mb-1">City</label>
                  <input
                    type="text"
                    value={formData.address.city}
                    onChange={(e) => setFormData({ ...formData, address: { ...formData.address, city: e.target.value } })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                  />
                </div>
                <div>
                  <label className="block uppercase font-semibold text-gray-500 mb-1">State</label>
                  <input
                    type="text"
                    value={formData.address.state}
                    onChange={(e) => setFormData({ ...formData, address: { ...formData.address, state: e.target.value } })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                  />
                </div>
                <div>
                  <label className="block uppercase font-semibold text-gray-500 mb-1">Postal Code</label>
                  <input
                    type="text"
                    value={formData.address.postalCode}
                    onChange={(e) => setFormData({ ...formData, address: { ...formData.address, postalCode: e.target.value } })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block uppercase font-semibold text-gray-500 mb-1">Notes / Terms</label>
                <textarea
                  rows="2"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl disabled:opacity-60"
                >
                  {submitting ? 'Saving...' : isEditing ? 'Update Supplier' : 'Save Supplier'}
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
            <h3 className="text-lg font-bold">Delete Supplier?</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-4">
              Are you sure you want to delete <strong>{supplierToDelete?.name}</strong>?
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="flex-1 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
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

export default Suppliers;
