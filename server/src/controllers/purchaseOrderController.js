const PurchaseOrder = require('../models/PurchaseOrder');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const StockMovement = require('../models/StockMovement');
const Notification = require('../models/Notification');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const { runInTransaction } = require('../utils/transaction');

class PurchaseOrderController {
  constructor() {
    this.generatePoNumber = this.generatePoNumber.bind(this);
    this.getPurchaseOrders = this.getPurchaseOrders.bind(this);
    this.getPurchaseOrderById = this.getPurchaseOrderById.bind(this);
    this.createPurchaseOrder = this.createPurchaseOrder.bind(this);
    this.receivePurchaseOrder = this.receivePurchaseOrder.bind(this);
    this.cancelPurchaseOrder = this.cancelPurchaseOrder.bind(this);
  }

  async generatePoNumber() {
    const datePrefix = new Date().toISOString().slice(0, 7).replace('-', '');
    const count = await PurchaseOrder.countDocuments();
    const sequence = String(count + 1).padStart(4, '0');
    return `PO-${datePrefix}-${sequence}`;
  }

  async getPurchaseOrders(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const skip = (page - 1) * limit;

      const filter = {};
      if (req.query.status) {
        filter.status = req.query.status;
      }
      if (req.query.supplier) {
        filter.supplier = req.query.supplier;
      }
      if (req.query.search) {
        filter.poNumber = { $regex: req.query.search, $options: 'i' };
      }

      const total = await PurchaseOrder.countDocuments(filter);
      const orders = await PurchaseOrder.find(filter)
        .populate('supplier', 'name email phone contactPerson')
        .populate('createdBy', 'name')
        .populate('receivedBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const totalPages = Math.ceil(total / limit) || 1;

      return ApiResponse.paginated(
        res,
        orders,
        { page, limit, total, totalPages },
        'Purchase orders retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  async getPurchaseOrderById(req, res, next) {
    try {
      const po = await PurchaseOrder.findById(req.params.id)
        .populate('supplier')
        .populate('items.product', 'name sku price costPrice quantity')
        .populate('createdBy', 'name email')
        .populate('receivedBy', 'name email');

      if (!po) {
        throw ApiError.notFound('Purchase order not found');
      }

      return ApiResponse.success(res, po, 'Purchase order details');
    } catch (error) {
      next(error);
    }
  }

  async createPurchaseOrder(req, res, next) {
    try {
      const { supplier, items, expectedDeliveryDate, notes } = req.body;

      const sup = await Supplier.findById(supplier);
      if (!sup) {
        throw ApiError.notFound('Supplier not found');
      }

      let totalAmount = 0;
      const processedItems = [];

      for (const item of items) {
        const prod = await Product.findById(item.product);
        if (!prod) {
          throw ApiError.notFound(`Product ${item.product} not found`);
        }

        const qty = parseInt(item.quantity, 10);
        const unitCost = Number(item.unitCost !== undefined ? item.unitCost : prod.costPrice);
        const totalCost = parseFloat((qty * unitCost).toFixed(2));
        totalAmount += totalCost;

        processedItems.push({
          product: prod._id,
          quantity: qty,
          unitCost,
          totalCost,
        });
      }

      totalAmount = parseFloat(totalAmount.toFixed(2));
      const poNumber = await this.generatePoNumber();

      const po = await PurchaseOrder.create({
        poNumber,
        supplier: sup._id,
        items: processedItems,
        totalAmount,
        status: 'ordered',
        expectedDeliveryDate,
        notes,
        createdBy: req.user._id,
      });

      const populated = await PurchaseOrder.findById(po._id)
        .populate('supplier', 'name email contactPerson')
        .populate('items.product', 'name sku');

      return ApiResponse.created(res, populated, 'Purchase order placed successfully');
    } catch (error) {
      next(error);
    }
  }

  async receivePurchaseOrder(req, res, next) {
    try {
      const result = await runInTransaction(async (session) => {
        const po = await PurchaseOrder.findById(req.params.id).session(session);
        if (!po) {
          throw ApiError.notFound('Purchase order not found');
        }

        if (po.status === 'received') {
          throw ApiError.badRequest('Purchase order has already been received');
        }

        if (po.status === 'cancelled') {
          throw ApiError.badRequest('Cannot receive a cancelled purchase order');
        }

        // Increment stock and log movements
        for (const item of po.items) {
          const product = await Product.findById(item.product).session(session);
          if (product) {
            const previousQuantity = product.quantity;
            product.quantity += item.quantity;
            await product.save({ session });

            await StockMovement.create(
              [
                {
                  product: product._id,
                  type: 'in',
                  quantity: item.quantity,
                  previousQuantity,
                  newQuantity: product.quantity,
                  reason: 'purchase_order_received',
                  referenceId: po._id,
                  referenceType: 'PurchaseOrder',
                  performedBy: req.user._id,
                  notes: `Restock received from PO ${po.poNumber}`,
                },
              ],
              { session }
            );
          }
        }

        po.status = 'received';
        po.receivedDate = new Date();
        po.receivedBy = req.user._id;
        await po.save({ session });

        // Notification
        await Notification.create({
          title: `Purchase Order Received: ${po.poNumber}`,
          message: `Stock has been automatically increased for ${po.items.length} items from ${po.poNumber}.`,
          type: 'po_received',
          severity: 'success',
          targetRole: 'all',
          referenceId: po._id,
          referenceType: 'PurchaseOrder',
        });

        return po;
      });

      const populated = await PurchaseOrder.findById(result._id)
        .populate('supplier', 'name email')
        .populate('receivedBy', 'name')
        .populate('items.product', 'name sku quantity');

      return ApiResponse.success(res, populated, 'Purchase order received and inventory updated');
    } catch (error) {
      next(error);
    }
  }

  async cancelPurchaseOrder(req, res, next) {
    try {
      const po = await PurchaseOrder.findById(req.params.id);
      if (!po) {
        throw ApiError.notFound('Purchase order not found');
      }

      if (po.status === 'received') {
        throw ApiError.badRequest('Cannot cancel a purchase order that has already been received into stock');
      }

      po.status = 'cancelled';
      await po.save();

      return ApiResponse.success(res, po, 'Purchase order cancelled');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PurchaseOrderController();
