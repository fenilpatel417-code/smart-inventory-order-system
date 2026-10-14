const reportService = require('../services/reportService');
const ApiResponse = require('../utils/apiResponse');
const { Parser } = require('json2csv');

class ReportController {
  async getSalesReport(req, res, next) {
    try {
      const { startDate, endDate, groupBy = 'day', exportFormat } = req.query;
      const data = await reportService.getSalesReport({ startDate, endDate, groupBy });

      if (exportFormat === 'csv') {
        const fields = [
          { label: 'Period', value: 'period' },
          { label: 'Order Count', value: 'orders' },
          { label: 'Subtotal ($)', value: 'subtotal' },
          { label: 'Tax ($)', value: 'tax' },
          { label: 'Discount ($)', value: 'discount' },
          { label: 'Shipping ($)', value: 'shipping' },
          { label: 'Total Revenue ($)', value: 'revenue' },
        ];
        const json2csv = new Parser({ fields });
        const csv = json2csv.parse(data.report);
        res.header('Content-Type', 'text/csv');
        res.attachment(`sales-report-${Date.now()}.csv`);
        return res.send(csv);
      }

      if (exportFormat === 'pdf') {
        const headers = ['Period', 'Orders', 'Subtotal', 'Tax', 'Discount', 'Revenue'];
        const rows = data.report.map((r) => [
          r.period,
          r.orders,
          `$${r.subtotal.toFixed(2)}`,
          `$${r.tax.toFixed(2)}`,
          `-$${r.discount.toFixed(2)}`,
          `$${r.revenue.toFixed(2)}`,
        ]);
        res.header('Content-Type', 'application/pdf');
        res.attachment(`sales-report-${Date.now()}.pdf`);
        return reportService.generatePdfReport('Sales Performance Report', headers, rows, res);
      }

      return ApiResponse.success(res, data, 'Sales report generated');
    } catch (error) {
      next(error);
    }
  }

  async getInventoryValuation(req, res, next) {
    try {
      const { exportFormat } = req.query;
      const data = await reportService.getInventoryValuationReport();

      if (exportFormat === 'csv') {
        const fields = [
          { label: 'Category', value: 'category' },
          { label: 'Product Count', value: 'products' },
          { label: 'Total Units', value: 'totalUnits' },
          { label: 'Total Cost Value ($)', value: 'costValue' },
          { label: 'Total Retail Value ($)', value: 'retailValue' },
          { label: 'Potential Margin (%)', value: 'potentialMargin' },
        ];
        const json2csv = new Parser({ fields });
        const csv = json2csv.parse(data.categories);
        res.header('Content-Type', 'text/csv');
        res.attachment(`inventory-valuation-${Date.now()}.csv`);
        return res.send(csv);
      }

      if (exportFormat === 'pdf') {
        const headers = ['Category', 'Products', 'Total Units', 'Cost Asset Value', 'Retail Value', 'Potential Margin'];
        const rows = data.categories.map((c) => [
          c.category,
          c.products,
          c.totalUnits,
          `$${c.costValue.toFixed(2)}`,
          `$${c.retailValue.toFixed(2)}`,
          `${c.potentialMargin}%`,
        ]);
        res.header('Content-Type', 'application/pdf');
        res.attachment(`inventory-valuation-${Date.now()}.pdf`);
        return reportService.generatePdfReport('Inventory Asset Valuation Report', headers, rows, res);
      }

      return ApiResponse.success(res, data, 'Inventory valuation report');
    } catch (error) {
      next(error);
    }
  }

  async getLowStockReport(req, res, next) {
    try {
      const { exportFormat } = req.query;
      const products = await reportService.getLowStockReport();

      if (exportFormat === 'csv') {
        const fields = [
          { label: 'SKU', value: 'sku' },
          { label: 'Product Name', value: 'name' },
          { label: 'Category', value: 'category' },
          { label: 'Supplier', value: 'supplier' },
          { label: 'Current Quantity', value: 'quantity' },
          { label: 'Reorder Level', value: 'reorderLevel' },
          { label: 'Suggested Order Qty', value: 'suggestedReorder' },
          { label: 'Stock Status', value: 'status' },
        ];
        const json2csv = new Parser({ fields });
        const csv = json2csv.parse(products);
        res.header('Content-Type', 'text/csv');
        res.attachment(`low-stock-report-${Date.now()}.csv`);
        return res.send(csv);
      }

      return ApiResponse.success(res, products, 'Low stock items report');
    } catch (error) {
      next(error);
    }
  }

  async getSupplierPurchasesReport(req, res, next) {
    try {
      const { startDate, endDate, exportFormat } = req.query;
      const data = await reportService.getSupplierPurchasesReport({ startDate, endDate });

      if (exportFormat === 'csv') {
        const fields = [
          { label: 'Supplier Name', value: 'supplier' },
          { label: 'Contact Person', value: 'contactPerson' },
          { label: 'Total Orders Placed', value: 'totalOrders' },
          { label: 'Orders Received', value: 'receivedOrders' },
          { label: 'Total Spend ($)', value: 'totalSpent' },
        ];
        const json2csv = new Parser({ fields });
        const csv = json2csv.parse(data);
        res.header('Content-Type', 'text/csv');
        res.attachment(`supplier-purchases-${Date.now()}.csv`);
        return res.send(csv);
      }

      return ApiResponse.success(res, data, 'Supplier purchases report');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ReportController();
