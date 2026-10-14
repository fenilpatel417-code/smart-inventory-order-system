const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { verifyToken, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createOrderValidator,
  updateOrderStatusValidator,
} = require('../validators/orderValidator');

router.use(verifyToken);

router.get('/', orderController.getOrders);
router.post('/', validate(createOrderValidator), orderController.createOrder);
router.get('/:id', orderController.getOrderById);
router.put(
  '/:id/status',
  validate(updateOrderStatusValidator),
  orderController.updateOrderStatus
);
router.get('/:id/invoice', orderController.downloadInvoice);
router.delete('/:id', authorize('admin'), orderController.deleteOrder);

module.exports = router;
