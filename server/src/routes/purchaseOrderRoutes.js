const express = require('express');
const router = express.Router();
const purchaseOrderController = require('../controllers/purchaseOrderController');
const { verifyToken } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createPurchaseOrderValidator } = require('../validators/purchaseOrderValidator');

router.use(verifyToken);

router.get('/', purchaseOrderController.getPurchaseOrders);
router.post(
  '/',
  validate(createPurchaseOrderValidator),
  purchaseOrderController.createPurchaseOrder
);
router.get('/:id', purchaseOrderController.getPurchaseOrderById);
router.put('/:id/receive', purchaseOrderController.receivePurchaseOrder);
router.put('/:id/cancel', purchaseOrderController.cancelPurchaseOrder);

module.exports = router;
