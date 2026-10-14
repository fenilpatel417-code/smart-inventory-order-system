const express = require('express');
const router = express.Router();
const stockMovementController = require('../controllers/stockMovementController');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

router.get('/', stockMovementController.getStockMovements);

module.exports = router;
