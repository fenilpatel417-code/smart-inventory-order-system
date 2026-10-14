const { body } = require('express-validator');

const supplierValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Supplier name is required')
    .isLength({ max: 100 }),
  body('contactPerson')
    .trim()
    .notEmpty()
    .withMessage('Contact person name is required'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Valid supplier email is required')
    .normalizeEmail(),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required'),
  body('address.street').optional().trim(),
  body('address.city').optional().trim(),
  body('address.state').optional().trim(),
  body('address.postalCode').optional().trim(),
  body('address.country').optional().trim(),
  body('notes').optional().trim(),
  body('status').optional().isIn(['active', 'inactive']),
];

module.exports = { supplierValidator };
