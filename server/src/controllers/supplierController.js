const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const PurchaseOrder = require('../models/PurchaseOrder');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');

class SupplierController {
  async getSuppliers(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const skip = (page - 1) * limit;

      const filter = {};
      if (req.query.status) {
        filter.status = req.query.status;
      }
      if (req.query.search) {
        filter.$or = [
          { name: { $regex: req.query.search, $options: 'i' } },
          { contactPerson: { $regex: req.query.search, $options: 'i' } },
          { email: { $regex: req.query.search, $options: 'i' } },
          { phone: { $regex: req.query.search, $options: 'i' } },
        ];
      }

      const total = await Supplier.countDocuments(filter);
      const suppliers = await Supplier.find(filter)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit);

      // Enhance with product count
      const supplierIds = suppliers.map((s) => s._id);
      const counts = await Product.aggregate([
        { $match: { supplier: { $in: supplierIds } } },
        { $group: { _id: '$supplier', count: { $sum: 1 } } },
      ]);
      const countMap = counts.reduce((acc, c) => ({ ...acc, [c._id.toString()]: c.count }), {});

      const enriched = suppliers.map((s) => ({
        ...s.toObject(),
        productCount: countMap[s._id.toString()] || 0,
      }));

      const totalPages = Math.ceil(total / limit) || 1;

      return ApiResponse.paginated(
        res,
        enriched,
        { page, limit, total, totalPages },
        'Suppliers retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  async getAllSuppliersList(req, res, next) {
    try {
      // Unpaginated list for dropdowns
      const suppliers = await Supplier.find({ status: 'active' }).select('name contactPerson email phone');
      return ApiResponse.success(res, suppliers, 'Active suppliers list');
    } catch (error) {
      next(error);
    }
  }

  async getSupplierById(req, res, next) {
    try {
      const supplier = await Supplier.findById(req.params.id);
      if (!supplier) {
        throw ApiError.notFound('Supplier not found');
      }

      // Fetch linked products
      const products = await Product.find({ supplier: supplier._id })
        .populate('category', 'name')
        .select('name sku price costPrice quantity reorderLevel status')
        .sort({ name: 1 });

      // Fetch purchase history
      const purchaseOrders = await PurchaseOrder.find({ supplier: supplier._id })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('poNumber totalAmount status expectedDeliveryDate receivedDate createdAt');

      return ApiResponse.success(
        res,
        {
          supplier: supplier.toObject(),
          products,
          purchaseOrders,
        },
        'Supplier details'
      );
    } catch (error) {
      next(error);
    }
  }

  async createSupplier(req, res, next) {
    try {
      const { name, contactPerson, email, phone, address, notes, status } = req.body;
      const existing = await Supplier.findOne({ email: email.toLowerCase() });
      if (existing) {
        throw ApiError.conflict('A supplier with this email already exists');
      }

      const supplier = await Supplier.create({
        name,
        contactPerson,
        email: email.toLowerCase(),
        phone,
        address,
        notes,
        status,
      });

      return ApiResponse.created(res, supplier, 'Supplier created successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateSupplier(req, res, next) {
    try {
      const supplier = await Supplier.findById(req.params.id);
      if (!supplier) {
        throw ApiError.notFound('Supplier not found');
      }

      if (req.body.email && req.body.email.toLowerCase() !== supplier.email) {
        const existing = await Supplier.findOne({
          email: req.body.email.toLowerCase(),
          _id: { $ne: supplier._id },
        });
        if (existing) {
          throw ApiError.conflict('Another supplier is already registered with this email');
        }
      }

      Object.assign(supplier, req.body);
      await supplier.save();

      return ApiResponse.success(res, supplier, 'Supplier updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteSupplier(req, res, next) {
    try {
      const supplierId = req.params.id;
      const linkedProducts = await Product.countDocuments({ supplier: supplierId });
      if (linkedProducts > 0) {
        throw ApiError.badRequest(
          `Cannot delete supplier. There are ${linkedProducts} products supplied by this supplier.`
        );
      }

      const deleted = await Supplier.findByIdAndDelete(supplierId);
      if (!deleted) {
        throw ApiError.notFound('Supplier not found');
      }

      return ApiResponse.success(res, null, 'Supplier deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SupplierController();
