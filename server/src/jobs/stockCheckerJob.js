const cron = require('node-cron');
const Product = require('../models/Product');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendEmail } = require('../utils/email');

const runStockCheck = async () => {
  try {
    console.log('[StockChecker] Running scheduled inventory check...');

    // Find products where quantity <= reorderLevel
    const lowStockProducts = await Product.find({
      status: { $ne: 'archived' },
      $expr: { $lte: ['$quantity', '$reorderLevel'] },
    }).populate('category', 'name').populate('supplier', 'name email');

    if (lowStockProducts.length === 0) {
      console.log('[StockChecker] All product stock levels are within healthy thresholds.');
      return { count: 0, products: [] };
    }

    console.log(`[StockChecker] Found ${lowStockProducts.length} products needing attention.`);

    // Create notifications for each low-stock product if not recently alerted
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    for (const p of lowStockProducts) {
      const isOut = p.quantity <= 0;
      const type = isOut ? 'out_of_stock' : 'low_stock';
      const severity = isOut ? 'critical' : 'warning';

      const recentNotif = await Notification.findOne({
        referenceId: p._id,
        type,
        createdAt: { $gte: oneDayAgo },
      });

      if (!recentNotif) {
        await Notification.create({
          title: isOut ? `Out of Stock: ${p.name}` : `Low Stock: ${p.name}`,
          message: `Product "${p.name}" (SKU: ${p.sku}) is at ${p.quantity} units (Reorder point: ${p.reorderLevel}).`,
          type,
          severity,
          targetRole: 'all',
          referenceId: p._id,
          referenceType: 'Product',
        });
      }
    }

    // Send Daily Low-Stock Digest Email to Admins
    const admins = await User.find({ role: 'admin', status: 'active' }).select('email name');

    if (admins.length > 0) {
      const itemsHtml = lowStockProducts
        .map(
          (p) =>
            `<tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>${p.name}</strong><br><small style="color:#666;">SKU: ${p.sku}</small></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${p.category?.name || '—'}</td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd; color: ${p.quantity <= 0 ? '#dc2626' : '#d97706'}; font-weight: bold;">${p.quantity}</td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${p.reorderLevel}</td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${p.supplier?.name || '—'}</td>
            </tr>`
        )
        .join('');

      const emailHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #059669;">Daily Inventory Stock Digest</h2>
          <p>The automated stock auditor identified <strong>${lowStockProducts.length}</strong> items at or below their reorder thresholds:</p>
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
            <thead>
              <tr style="background-color: #f3f4f6;">
                <th style="padding: 8px;">Product</th>
                <th style="padding: 8px;">Category</th>
                <th style="padding: 8px;">Qty</th>
                <th style="padding: 8px;">Reorder</th>
                <th style="padding: 8px;">Supplier</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <p style="margin-top: 24px; font-size: 12px; color: #6b7280;">
            Log in to the Smart Inventory dashboard to generate purchase orders for depleted stock.
          </p>
        </div>
      `;

      for (const admin of admins) {
        await sendEmail({
          to: admin.email,
          subject: `[Alert] Daily Stock Digest: ${lowStockProducts.length} items low or out of stock`,
          html: emailHtml,
        });
      }
    }

    return { count: lowStockProducts.length, products: lowStockProducts };
  } catch (error) {
    console.error(`[StockChecker Error]: ${error.message}`);
    return { count: 0, error: error.message };
  }
};

const startCronJob = () => {
  const schedule = process.env.CRON_SCHEDULE || '0 8 * * *'; // default 8am daily
  console.log(`[StockChecker] Cron scheduled with expression: "${schedule}"`);

  cron.schedule(schedule, async () => {
    await runStockCheck();
  });
};

module.exports = {
  runStockCheck,
  startCronJob,
};
