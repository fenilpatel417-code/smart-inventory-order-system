const Order = require('../models/Order');
const Product = require('../models/Product');
const PurchaseOrder = require('../models/PurchaseOrder');
const Category = require('../models/Category');
const Supplier = require('../models/Supplier');
const mongoose = require('mongoose');
const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');

class ReportService {
  /**
   * Dashboard Key Performance Indicators (KPIs) using MongoDB aggregation
   */
  async getDashboardKPIs(isAdmin = false) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    // Operational KPIs (All roles)
    const [ordersToday, ordersThisMonth, pendingOrders, lowStockCount, outOfStockCount, totalProducts] =
      await Promise.all([
        Order.countDocuments({ createdAt: { $gte: todayStart } }),
        Order.countDocuments({ createdAt: { $gte: monthStart } }),
        Order.countDocuments({ orderStatus: 'pending' }),
        Product.countDocuments({
          status: { $ne: 'archived' },
          $expr: {
            $and: [{ $gt: ['$quantity', 0] }, { $lte: ['$quantity', '$reorderLevel'] }],
          },
        }),
        Product.countDocuments({
          status: { $ne: 'archived' },
          quantity: { $lte: 0 },
        }),
        Product.countDocuments({ status: { $ne: 'archived' } }),
      ]);

    const kpis = {
      ordersToday,
      ordersThisMonth,
      pendingOrders,
      lowStockCount,
      outOfStockCount,
      totalProducts,
    };

    // Financial KPIs (Admin only)
    if (isAdmin) {
      const financialAggregation = await Order.aggregate([
        { $match: { orderStatus: { $ne: 'cancelled' } } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$total' },
            totalSubtotal: { $sum: '$subtotal' },
            totalTax: { $sum: '$taxAmount' },
            totalDiscount: { $sum: '$discount' },
            totalShipping: { $sum: '$shippingCost' },
            count: { $sum: 1 },
          },
        },
      ]);

      const fin = financialAggregation[0] || { totalRevenue: 0, totalSubtotal: 0 };

      // Calculate cost of goods sold (COGS) to derive net profit
      const cogsAggregation = await Order.aggregate([
        { $match: { orderStatus: { $nin: ['cancelled', 'pending'] } } },
        { $unwind: '$items' },
        {
          $lookup: {
            from: 'products',
            localField: 'items.product',
            foreignField: '_id',
            as: 'productDoc',
          },
        },
        { $unwind: { path: '$productDoc', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            qty: '$items.quantity',
            itemRevenue: '$items.subtotal',
            costPrice: { $ifNull: ['$productDoc.costPrice', 0] },
          },
        },
        {
          $group: {
            _id: null,
            totalCogs: { $sum: { $multiply: ['$qty', '$costPrice'] } },
            totalSales: { $sum: '$itemRevenue' },
          },
        },
      ]);

      const cogs = cogsAggregation[0]?.totalCogs || 0;
      const profit = Math.max(0, fin.totalRevenue - cogs);

      kpis.totalRevenue = parseFloat((fin.totalRevenue || 0).toFixed(2));
      kpis.totalProfit = parseFloat(profit.toFixed(2));
      kpis.profitMargin =
        fin.totalRevenue > 0 ? parseFloat(((profit / fin.totalRevenue) * 100).toFixed(1)) : 0;
    }

    return kpis;
  }

  /**
   * Visual Charts data aggregated via MongoDB pipelines
   */
  async getDashboardCharts(period = 'monthly', isAdmin = false) {
    // 1. Sales Trend over time
    const daysBack = period === 'daily' ? 14 : period === 'weekly' ? 60 : 180;
    const dateLimit = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

    const dateFormat = period === 'daily' ? '%Y-%m-%d' : period === 'weekly' ? '%Y-W%V' : '%Y-%m';

    const salesTrend = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: dateLimit },
          orderStatus: { $ne: 'cancelled' },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
          totalSales: { $sum: '$total' },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          date: '$_id',
          sales: { $round: ['$totalSales', 2] },
          orders: '$orderCount',
          _id: 0,
        },
      },
    ]);

    // 2. Top 5 Selling Products
    const topProducts = await Order.aggregate([
      { $match: { orderStatus: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$items.name' },
          sku: { $first: '$items.sku' },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.subtotal' },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 5 },
      {
        $project: {
          name: 1,
          sku: 1,
          quantity: '$totalQuantity',
          revenue: { $round: ['$totalRevenue', 2] },
        },
      },
    ]);

    // 3. Sales By Category
    const salesByCategory = await Order.aggregate([
      { $match: { orderStatus: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'prod',
        },
      },
      { $unwind: '$prod' },
      {
        $lookup: {
          from: 'categories',
          localField: 'prod.category',
          foreignField: '_id',
          as: 'cat',
        },
      },
      { $unwind: '$cat' },
      {
        $group: {
          _id: '$cat.name',
          revenue: { $sum: '$items.subtotal' },
          units: { $sum: '$items.quantity' },
        },
      },
      { $sort: { revenue: -1 } },
      {
        $project: {
          category: '$_id',
          revenue: { $round: ['$revenue', 2] },
          units: 1,
          _id: 0,
        },
      },
    ]);

    // 4. Order Status Distribution
    const statusDistribution = await Order.aggregate([
      {
        $group: {
          _id: '$orderStatus',
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          status: '$_id',
          count: 1,
          _id: 0,
        },
      },
    ]);

    return {
      salesTrend: isAdmin ? salesTrend : salesTrend.map((s) => ({ date: s.date, orders: s.orders })),
      topProducts: isAdmin ? topProducts : topProducts.map((p) => ({ name: p.name, quantity: p.quantity })),
      salesByCategory: isAdmin ? salesByCategory : salesByCategory.map((c) => ({ category: c.category, units: c.units })),
      statusDistribution,
    };
  }

  /**
   * Detailed Sales Report with Date Filter
   */
  async getSalesReport({ startDate, endDate, groupBy = 'day' }) {
    const match = { orderStatus: { $ne: 'cancelled' } };

    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        match.createdAt.$lte = end;
      }
    }

    const format = groupBy === 'month' ? '%Y-%m' : '%Y-%m-%d';

    const report = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format, date: '$createdAt' } },
          orderCount: { $sum: 1 },
          subtotal: { $sum: '$subtotal' },
          taxAmount: { $sum: '$taxAmount' },
          discount: { $sum: '$discount' },
          shippingCost: { $sum: '$shippingCost' },
          totalRevenue: { $sum: '$total' },
        },
      },
      { $sort: { _id: -1 } },
      {
        $project: {
          period: '$_id',
          orders: '$orderCount',
          subtotal: { $round: ['$subtotal', 2] },
          tax: { $round: ['$taxAmount', 2] },
          discount: { $round: ['$discount', 2] },
          shipping: { $round: ['$shippingCost', 2] },
          revenue: { $round: ['$totalRevenue', 2] },
          _id: 0,
        },
      },
    ]);

    const summary = report.reduce(
      (acc, r) => ({
        totalOrders: acc.totalOrders + r.orders,
        totalRevenue: acc.totalRevenue + r.revenue,
        totalTax: acc.totalTax + r.tax,
        totalDiscount: acc.totalDiscount + r.discount,
      }),
      { totalOrders: 0, totalRevenue: 0, totalTax: 0, totalDiscount: 0 }
    );

    return {
      report,
      summary: {
        totalOrders: summary.totalOrders,
        totalRevenue: parseFloat(summary.totalRevenue.toFixed(2)),
        totalTax: parseFloat(summary.totalTax.toFixed(2)),
        totalDiscount: parseFloat(summary.totalDiscount.toFixed(2)),
      },
    };
  }

  /**
   * Inventory Asset Valuation Report
   */
  async getInventoryValuationReport() {
    const valuationByCategory = await Product.aggregate([
      { $match: { status: { $ne: 'archived' } } },
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'cat',
        },
      },
      { $unwind: { path: '$cat', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $ifNull: ['$cat.name', 'Uncategorized'] },
          productCount: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalCostValue: { $sum: { $multiply: ['$quantity', '$costPrice'] } },
          totalRetailValue: { $sum: { $multiply: ['$quantity', '$price'] } },
        },
      },
      {
        $project: {
          category: '$_id',
          products: '$productCount',
          totalUnits: '$totalQuantity',
          costValue: { $round: ['$totalCostValue', 2] },
          retailValue: { $round: ['$totalRetailValue', 2] },
          potentialMargin: {
            $round: [
              {
                $cond: [
                  { $gt: ['$totalRetailValue', 0] },
                  {
                    $multiply: [
                      {
                        $divide: [
                          { $subtract: ['$totalRetailValue', '$totalCostValue'] },
                          '$totalRetailValue',
                        ],
                      },
                      100,
                    ],
                  },
                  0,
                ],
              },
              1,
            ],
          },
          _id: 0,
        },
      },
      { $sort: { costValue: -1 } },
    ]);

    const totals = valuationByCategory.reduce(
      (acc, c) => ({
        products: acc.products + c.products,
        units: acc.units + c.totalUnits,
        costValue: acc.costValue + c.costValue,
        retailValue: acc.retailValue + c.retailValue,
      }),
      { products: 0, units: 0, costValue: 0, retailValue: 0 }
    );

    return {
      categories: valuationByCategory,
      summary: {
        totalProducts: totals.products,
        totalUnits: totals.units,
        totalCostValue: parseFloat(totals.costValue.toFixed(2)),
        totalRetailValue: parseFloat(totals.retailValue.toFixed(2)),
        unrealizedProfit: parseFloat((totals.retailValue - totals.costValue).toFixed(2)),
      },
    };
  }

  /**
   * Low Stock Inventory Audit Report
   */
  async getLowStockReport() {
    const products = await Product.find({
      status: { $ne: 'archived' },
      $expr: { $lte: ['$quantity', '$reorderLevel'] },
    })
      .populate('category', 'name')
      .populate('supplier', 'name email phone contactPerson')
      .sort({ quantity: 1 });

    return products.map((p) => ({
      name: p.name,
      sku: p.sku,
      category: p.category?.name || '—',
      supplier: p.supplier?.name || '—',
      quantity: p.quantity,
      reorderLevel: p.reorderLevel,
      suggestedReorder: Math.max(10, p.reorderLevel * 2 - p.quantity),
      status: p.quantity <= 0 ? 'Out of Stock' : 'Low Stock',
      unitCost: p.costPrice,
    }));
  }

  /**
   * Supplier Procurement & Purchases Report
   */
  async getSupplierPurchasesReport({ startDate, endDate }) {
    const match = {};
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        match.createdAt.$lte = end;
      }
    }

    const report = await PurchaseOrder.aggregate([
      { $match: match },
      {
        $lookup: {
          from: 'suppliers',
          localField: 'supplier',
          foreignField: '_id',
          as: 'sup',
        },
      },
      { $unwind: '$sup' },
      {
        $group: {
          _id: '$sup._id',
          supplierName: { $first: '$sup.name' },
          contactPerson: { $first: '$sup.contactPerson' },
          poCount: { $sum: 1 },
          totalSpent: { $sum: '$totalAmount' },
          receivedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'received'] }, 1, 0] },
          },
        },
      },
      { $sort: { totalSpent: -1 } },
      {
        $project: {
          supplier: '$supplierName',
          contactPerson: 1,
          totalOrders: '$poCount',
          receivedOrders: '$receivedCount',
          totalSpent: { $round: ['$totalSpent', 2] },
          _id: 0,
        },
      },
    ]);

    return report;
  }

  /**
   * Generate PDF Report Stream
   */
  generatePdfReport(title, headers, rows, res) {
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    doc.pipe(res);

    // Title & Branding
    doc
      .fillColor('#059669')
      .fontSize(18)
      .font('Helvetica-Bold')
      .text('SMART INVENTORY REPORT', 40, 40);

    doc
      .fillColor('#111827')
      .fontSize(14)
      .text(title, 40, 65);

    doc
      .fillColor('#6b7280')
      .fontSize(9)
      .font('Helvetica')
      .text(`Generated on: ${new Date().toLocaleString()}`, 40, 85);

    // Divider
    doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(40, 105).lineTo(780, 105).stroke();

    // Table Header
    let y = 120;
    doc.rect(40, y, 740, 20).fill('#f3f4f6');
    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(9);

    const colWidth = 740 / headers.length;
    headers.forEach((h, i) => {
      doc.text(h.toUpperCase(), 45 + i * colWidth, y + 5, { width: colWidth - 10, lineBreak: false });
    });

    // Rows
    y += 24;
    doc.font('Helvetica').fontSize(8);

    rows.forEach((row, rIdx) => {
      if (y > 520) {
        doc.addPage({ margin: 40, size: 'A4', layout: 'landscape' });
        y = 40;
      }

      if (rIdx % 2 === 1) {
        doc.rect(40, y - 2, 740, 18).fill('#fafafa');
      }

      doc.fillColor('#374151');
      row.forEach((cell, cIdx) => {
        doc.text(String(cell ?? ''), 45 + cIdx * colWidth, y + 2, {
          width: colWidth - 10,
          lineBreak: false,
        });
      });

      y += 18;
    });

    doc.end();
  }
}

module.exports = new ReportService();
