const Order = require('../models/Order');
const Customer = require('../models/Customer');
const orderService = require('../services/orderService');
const { generateInvoicePDF } = require('../utils/pdfGenerator');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');

class OrderController {
  async getOrders(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const skip = (page - 1) * limit;

      const filter = {};

      if (req.query.orderStatus) {
        filter.orderStatus = req.query.orderStatus;
      }
      if (req.query.paymentStatus) {
        filter.paymentStatus = req.query.paymentStatus;
      }
      if (req.query.customer) {
        filter.customer = req.query.customer;
      }

      // Date range filter
      if (req.query.startDate || req.query.endDate) {
        filter.createdAt = {};
        if (req.query.startDate) {
          filter.createdAt.$gte = new Date(req.query.startDate);
        }
        if (req.query.endDate) {
          const end = new Date(req.query.endDate);
          end.setHours(23, 59, 59, 999);
          filter.createdAt.$lte = end;
        }
      }

      // Search by orderNumber
      if (req.query.search) {
        filter.orderNumber = { $regex: req.query.search, $options: 'i' };
      }

      const total = await Order.countDocuments(filter);
      const orders = await Order.find(filter)
        .populate('customer', 'name email phone')
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const totalPages = Math.ceil(total / limit) || 1;

      return ApiResponse.paginated(
        res,
        orders,
        { page, limit, total, totalPages },
        'Orders retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  async getOrderById(req, res, next) {
    try {
      const order = await Order.findById(req.params.id)
        .populate('customer', 'name email phone address')
        .populate('createdBy', 'name email')
        .populate('statusHistory.changedBy', 'name email role');

      if (!order) {
        throw ApiError.notFound('Order not found');
      }

      return ApiResponse.success(res, order, 'Order details');
    } catch (error) {
      next(error);
    }
  }

  async createOrder(req, res, next) {
    try {
      const order = await orderService.createOrder({
        customerId: req.body.customer,
        items: req.body.items,
        discount: req.body.discount,
        taxRate: req.body.taxRate,
        shippingCost: req.body.shippingCost,
        paymentMethod: req.body.paymentMethod,
        paymentStatus: req.body.paymentStatus,
        shippingAddress: req.body.shippingAddress,
        notes: req.body.notes,
        createdBy: req.user._id,
      });

      return ApiResponse.created(res, order, 'Order created successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateOrderStatus(req, res, next) {
    try {
      const { status, note, paymentStatus } = req.body;
      const order = await orderService.updateOrderStatus(req.params.id, {
        status,
        note,
        paymentStatus,
        changedBy: req.user._id,
      });

      return ApiResponse.success(res, order, `Order status updated to ${status}`);
    } catch (error) {
      next(error);
    }
  }

  async downloadInvoice(req, res, next) {
    try {
      const order = await Order.findById(req.params.id).populate('customer');
      if (!order) {
        throw ApiError.notFound('Order not found');
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=invoice-${order.orderNumber}.pdf`
      );

      generateInvoicePDF(order, order.customer, res);
    } catch (error) {
      next(error);
    }
  }

  async deleteOrder(req, res, next) {
    try {
      const order = await Order.findById(req.params.id);
      if (!order) {
        throw ApiError.notFound('Order not found');
      }

      // If stock was deducted, prevent deleting without cancelling first
      if (order.stockDeducted) {
        throw ApiError.badRequest(
          'Cannot delete an active confirmed order. Please cancel the order first to safely restore inventory.'
        );
      }

      await Order.findByIdAndDelete(order._id);
      return ApiResponse.success(res, null, 'Order record deleted');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new OrderController();
