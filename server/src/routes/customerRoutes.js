const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { verifyToken, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { customerValidator } = require('../validators/customerValidator');

router.use(verifyToken);

router.get('/all', customerController.getAllCustomersList);
router.get('/', customerController.getCustomers);
router.get('/:id', customerController.getCustomerById);
router.post('/', validate(customerValidator), customerController.createCustomer);
router.put('/:id', validate(customerValidator), customerController.updateCustomer);
router.delete('/:id', authorize('admin'), customerController.deleteCustomer);

module.exports = router;
