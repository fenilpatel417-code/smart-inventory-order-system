const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

router.get('/kpis', dashboardController.getKPIs);
router.get('/charts', dashboardController.getCharts);

module.exports = router;
