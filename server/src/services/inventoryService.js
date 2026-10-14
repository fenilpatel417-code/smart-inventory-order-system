const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const Notification = require('../models/Notification');
const ApiError = require('../utils/apiError');
const { runInTransaction } = require('../utils/transaction');

class InventoryService {
  /**
   * Adjusts stock quantity atomically and creates StockMovement log.
   */
  async adjustStock(productId, { type, quantity, reason, notes = '', referenceId = null, referenceType = 'Manual', performedBy }) {
    const product = await Product.findById(productId);
    if (!product) {
      throw ApiError.notFound('Product not found');
    }

    const previousQuantity = product.quantity;
    let newQuantity;
    let movementQty;

    if (type === 'in') {
      movementQty = Number(quantity);
      newQuantity = previousQuantity + movementQty;
    } else if (type === 'out') {
      movementQty = Number(quantity);
      if (previousQuantity - movementQty < 0) {
        throw ApiError.badRequest(
          `Insufficient stock. Current quantity is ${previousQuantity}, cannot deduct ${movementQty}.`
        );
      }
      newQuantity = previousQuantity - movementQty;
    } else if (type === 'adjustment') {
      // Direct adjustment: quantity is the new target count
      newQuantity = Number(quantity);
      movementQty = Math.abs(newQuantity - previousQuantity);
    } else {
      throw ApiError.badRequest('Invalid adjustment type');
    }

    // Atomic update
    product.quantity = newQuantity;
    await product.save();

    // Log movement
    const movement = await StockMovement.create({
      product: product._id,
      type,
      quantity: movementQty,
      previousQuantity,
      newQuantity,
      reason,
      referenceId,
      referenceType,
      performedBy,
      notes,
    });

    // Check low-stock threshold trigger
    if (newQuantity <= product.reorderLevel) {
      await this.triggerLowStockNotification(product);
    }

    return {
      product,
      movement,
    };
  }

  async triggerLowStockNotification(product) {
    try {
      const isOut = product.quantity <= 0;
      const severity = isOut ? 'critical' : 'warning';
      const type = isOut ? 'out_of_stock' : 'low_stock';
      const title = isOut ? `Out of Stock: ${product.name}` : `Low Stock Alert: ${product.name}`;
      const message = isOut
        ? `Product "${product.name}" (SKU: ${product.sku}) is completely out of stock.`
        : `Product "${product.name}" (SKU: ${product.sku}) is down to ${product.quantity} units (Reorder level: ${product.reorderLevel}).`;

      // Check if recent unread alert exists for this product in last 1 hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const existing = await Notification.findOne({
        referenceId: product._id,
        type,
        createdAt: { $gte: oneHourAgo },
      });

      if (!existing) {
        await Notification.create({
          title,
          message,
          type,
          severity,
          targetRole: 'all',
          referenceId: product._id,
          referenceType: 'Product',
        });
      }
    } catch (err) {
      console.warn('[InventoryService] Notification error:', err.message);
    }
  }
}

module.exports = new InventoryService();
