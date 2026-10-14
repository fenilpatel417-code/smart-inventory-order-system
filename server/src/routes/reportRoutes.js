const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { verifyToken, authorize } = require('../middleware/auth');

// All reports are restricted to Admin
router.use(verifyToken, authorize('admin'));

router.get('/sales', reportController.getSalesReport);
router.get('/inventory-valuation', reportController.getInventoryValuation);
router.get('/low-stock', reportController.getLowStockReport);
router.get('/supplier-purchases', reportController.getSupplierPurchasesReport);

module.exports = router;
