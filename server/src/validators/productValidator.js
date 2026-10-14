const { body } = require('express-validator');

const createProductValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Product name is required')
    .isLength({ max: 120 }),
  body('sku')
    .trim()
    .notEmpty()
    .withMessage('SKU is required')
    .isLength({ max: 30 })
    .toUpperCase(),
  body('category')
    .notEmpty()
    .withMessage('Category is required')
    .isMongoId()
    .withMessage('Invalid category ID'),
  body('supplier')
    .notEmpty()
    .withMessage('Supplier is required')
    .isMongoId()
    .withMessage('Invalid supplier ID'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a non-negative number'),
  body('costPrice')
    .isFloat({ min: 0 })
    .withMessage('Cost price must be a non-negative number'),
  body('quantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Quantity must be an integer >= 0'),
  body('reorderLevel')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Reorder level must be an integer >= 0'),
  body('description').optional().trim(),
  body('status').optional().isIn(['active', 'inactive', 'archived']),
];

const updateProductValidator = [
  body('name').optional().trim().isLength({ min: 1, max: 120 }),
  body('sku').optional().trim().isLength({ min: 1, max: 30 }).toUpperCase(),
  body('category').optional().isMongoId(),
  body('supplier').optional().isMongoId(),
  body('price').optional().isFloat({ min: 0 }),
  body('costPrice').optional().isFloat({ min: 0 }),
  body('quantity').optional().isInt({ min: 0 }),
  body('reorderLevel').optional().isInt({ min: 0 }),
  body('description').optional().trim(),
  body('status').optional().isIn(['active', 'inactive', 'archived']),
];

const adjustStockValidator = [
  body('type')
    .isIn(['in', 'out', 'adjustment'])
    .withMessage('Type must be "in" (add), "out" (remove), or "adjustment" (set exact)'),
  body('quantity')
    .isFloat({ min: 0.01 })
    .withMessage('Quantity must be greater than 0'),
  body('reason')
    .isIn([
      'manual_adjustment',
      'damaged',
      'audit',
      'return',
      'purchase_order_received',
      'order_cancelled',
    ])
    .withMessage('Valid reason is required'),
  body('notes').optional().trim(),
];

module.exports = {
  createProductValidator,
  updateProductValidator,
  adjustStockValidator,
};
