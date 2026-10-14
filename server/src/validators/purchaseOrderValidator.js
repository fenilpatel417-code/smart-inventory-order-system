const { body } = require('express-validator');

const createPurchaseOrderValidator = [
  body('supplier').notEmpty().withMessage('Supplier is required').isMongoId().withMessage('Invalid supplier ID'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('Purchase order must contain at least one line item'),
  body('items.*.product')
    .notEmpty()
    .withMessage('Product is required')
    .isMongoId()
    .withMessage('Invalid product ID'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  body('items.*.unitCost')
    .isFloat({ min: 0 })
    .withMessage('Unit cost cannot be negative'),
  body('expectedDeliveryDate').optional().isISO8601().toDate(),
  body('notes').optional().trim(),
];

module.exports = {
  createPurchaseOrderValidator,
};
