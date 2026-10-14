const reportService = require('../services/reportService');
const ApiResponse = require('../utils/apiResponse');

class DashboardController {
  async getKPIs(req, res, next) {
    try {
      const isAdmin = req.user?.role === 'admin';
      const kpis = await reportService.getDashboardKPIs(isAdmin);
      return ApiResponse.success(res, kpis, 'Dashboard KPIs retrieved');
    } catch (error) {
      next(error);
    }
  }

  async getCharts(req, res, next) {
    try {
      const isAdmin = req.user?.role === 'admin';
      const period = req.query.period || 'monthly';
      const charts = await reportService.getDashboardCharts(period, isAdmin);
      return ApiResponse.success(res, charts, 'Dashboard charts data');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DashboardController();
