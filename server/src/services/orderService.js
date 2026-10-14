const Order = require('../models/Order');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const StockMovement = require('../models/StockMovement');
const inventoryService = require('./inventoryService');
const ApiError = require('../utils/apiError');
const { runInTransaction } = require('../utils/transaction');

class OrderService {
  /**
   * Generates next sequential order number (e.g. ORD-202610-0001)
   */
  async generateOrderNumber() {
    const datePrefix = new Date().toISOString().slice(0, 7).replace('-', '');
    const count = await Order.countDocuments();
    const sequence = String(count + 1).padStart(4, '0');
    return `ORD-${datePrefix}-${sequence}`;
  }

  /**
   * Creates new order with calculated line items, subtotal, tax, and total.
   */
  async createOrder({ customerId, items, discount = 0, taxRate = 0.1, shippingCost = 0, paymentMethod = 'cash', paymentStatus = 'pending', shippingAddress = {}, notes = '', createdBy }) {
    const customer = await Customer.findById(customerId);
    if (!customer) {
      throw ApiError.notFound('Customer not found');
    }

    if (!items || !items.length) {
      throw ApiError.badRequest('Order must include at least one item');
    }

    // Process line items & validate products
    let subtotal = 0;
    const processedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        throw ApiError.notFound(`Product with ID ${item.product} does not exist`);
      }

      if (product.status !== 'active') {
        throw ApiError.badRequest(`Product "${product.name}" is not available for ordering`);
      }

      const qty = parseInt(item.quantity, 10);
      if (qty <= 0) {
        throw ApiError.badRequest(`Invalid quantity for product "${product.name}"`);
      }

      const itemPrice = item.price !== undefined ? Number(item.price) : product.price;
      const itemSubtotal = parseFloat((itemPrice * qty).toFixed(2));
      subtotal += itemSubtotal;

      processedItems.push({
        product: product._id,
        name: product.name,
        sku: product.sku,
        quantity: qty,
        price: itemPrice,
        subtotal: itemSubtotal,
      });
    }

    subtotal = parseFloat(subtotal.toFixed(2));
    const taxAmount = parseFloat((subtotal * taxRate).toFixed(2));
    const total = parseFloat(
      Math.max(0, subtotal + taxAmount + Number(shippingCost) - Number(discount)).toFixed(2)
    );

    const orderNumber = await this.generateOrderNumber();

    const order = await Order.create({
      orderNumber,
      customer: customer._id,
      items: processedItems,
      subtotal,
      taxRate,
      taxAmount,
      discount: Number(discount),
      shippingCost: Number(shippingCost),
      total,
      paymentMethod,
      paymentStatus,
      orderStatus: 'pending',
      shippingAddress: shippingAddress.street ? shippingAddress : customer.address,
      notes,
      stockDeducted: false,
      createdBy,
      statusHistory: [
        {
          status: 'pending',
          changedBy: createdBy,
          timestamp: new Date(),
          note: 'Order created',
        },
      ],
    });

    // Update customer stats
    customer.totalOrders += 1;
    customer.totalSpent += total;
    await customer.save();

    return await Order.findById(order._id)
      .populate('customer', 'name email phone address')
      .populate('createdBy', 'name email');
  }

  /**
   * Validates if status transition is permissible.
   */
  isValidStatusTransition(currentStatus, newStatus) {
    if (currentStatus === newStatus) return true;

    const allowedTransitions = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['packed', 'cancelled'],
      packed: ['shipped', 'cancelled'],
      shipped: ['delivered', 'cancelled'],
      delivered: [], // Final status
      cancelled: [], // Final status
    };

    return allowedTransitions[currentStatus]?.includes(newStatus);
  }

  /**
   * Updates order status with atomic stock deduction / restoration safeguards.
   */
  async updateOrderStatus(orderId, { status: newStatus, note = '', paymentStatus, changedBy }) {
    return await runInTransaction(async (session) => {
      const order = await Order.findById(orderId).session(session);
      if (!order) {
        throw ApiError.notFound('Order not found');
      }

      if (!this.isValidStatusTransition(order.orderStatus, newStatus)) {
        throw ApiError.badRequest(
          `Invalid status transition from "${order.orderStatus}" to "${newStatus}"`
        );
      }

      // Handle Stock Deduction when transitioning to 'confirmed'
      if (newStatus === 'confirmed' && !order.stockDeducted) {
        for (const item of order.items) {
          const product = await Product.findById(item.product).session(session);
          if (!product) {
            throw ApiError.notFound(`Product ${item.name} not found`);
          }

          if (product.quantity < item.quantity) {
            throw ApiError.badRequest(
              `Cannot confirm order: Insufficient stock for "${product.name}" (SKU: ${product.sku}). Available: ${product.quantity}, Required: ${item.quantity}.`
            );
          }

          const previousQty = product.quantity;
          product.quantity -= item.quantity;
          await product.save({ session });

          // Log movement
          await StockMovement.create(
            [
              {
                product: product._id,
                type: 'out',
                quantity: item.quantity,
                previousQuantity: previousQty,
                newQuantity: product.quantity,
                reason: 'order_confirmed',
                referenceId: order._id,
                referenceType: 'Order',
                performedBy: changedBy,
                notes: `Stock deducted on confirmation of ${order.orderNumber}`,
              },
            ],
            { session }
          );

          // Check low stock trigger
          if (product.quantity <= product.reorderLevel) {
            inventoryService.triggerLowStockNotification(product);
          }
        }

        order.stockDeducted = true;
      }

      // Handle Stock Restoration when transitioning to 'cancelled'
      if (newStatus === 'cancelled' && order.stockDeducted) {
        for (const item of order.items) {
          const product = await Product.findById(item.product).session(session);
          if (product) {
            const previousQty = product.quantity;
            product.quantity += item.quantity;
            await product.save({ session });

            await StockMovement.create(
              [
                {
                  product: product._id,
                  type: 'in',
                  quantity: item.quantity,
                  previousQuantity: previousQty,
                  newQuantity: product.quantity,
                  reason: 'order_cancelled',
                  referenceId: order._id,
                  referenceType: 'Order',
                  performedBy: changedBy,
                  notes: `Stock restored upon cancellation of ${order.orderNumber}`,
                },
              ],
              { session }
            );
          }
        }

        order.stockDeducted = false;
      }

      // Update order status & history
      order.orderStatus = newStatus;
      if (paymentStatus) {
        order.paymentStatus = paymentStatus;
      }

      order.statusHistory.push({
        status: newStatus,
        changedBy,
        timestamp: new Date(),
        note: note || `Status transitioned to ${newStatus}`,
      });

      await order.save({ session });

      return await Order.findById(order._id)
        .populate('customer', 'name email phone address')
        .populate('statusHistory.changedBy', 'name email');
    });
  }
}

module.exports = new OrderService();
