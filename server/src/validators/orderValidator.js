const { body } = require('express-validator');

const createOrderValidator = [
  body('customer').notEmpty().withMessage('Customer is required').isMongoId().withMessage('Invalid customer ID'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('Order must contain at least one item'),
  body('items.*.product')
    .notEmpty()
    .withMessage('Product ID is required for each item')
    .isMongoId()
    .withMessage('Invalid product ID'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be an integer >= 1'),
  body('discount').optional().isFloat({ min: 0 }).withMessage('Discount cannot be negative'),
  body('taxRate').optional().isFloat({ min: 0, max: 1 }).withMessage('Tax rate must be between 0 and 1'),
  body('shippingCost').optional().isFloat({ min: 0 }).withMessage('Shipping cost cannot be negative'),
  body('paymentMethod')
    .optional()
    .isIn(['cash', 'card', 'bank_transfer', 'online'])
    .withMessage('Invalid payment method'),
  body('paymentStatus')
    .optional()
    .isIn(['pending', 'paid', 'failed', 'refunded'])
    .withMessage('Invalid payment status'),
  body('notes').optional().trim(),
];

const updateOrderStatusValidator = [
  body('status')
    .isIn(['pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'])
    .withMessage('Invalid order status'),
  body('note').optional().trim(),
  body('paymentStatus')
    .optional()
    .isIn(['pending', 'paid', 'failed', 'refunded'])
    .withMessage('Invalid payment status'),
];

module.exports = {
  createOrderValidator,
  updateOrderStatusValidator,
};
