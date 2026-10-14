const { body } = require('express-validator');

const customerValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Customer name is required')
    .isLength({ max: 100 }),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Valid customer email is required')
    .normalizeEmail(),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Customer phone is required'),
  body('address.street').optional().trim(),
  body('address.city').optional().trim(),
  body('address.state').optional().trim(),
  body('address.postalCode').optional().trim(),
  body('address.country').optional().trim(),
  body('status').optional().isIn(['active', 'inactive']),
];

module.exports = { customerValidator };
