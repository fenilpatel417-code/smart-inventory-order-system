const PDFDocument = require('pdfkit');

/**
 * Generates a clean, professional PDF invoice and pipes it to a writable stream (such as res)
 * @param {Object} order - Populated Mongoose order object
 * @param {Object} customer - Customer object
 * @param {Stream} dataCallback - stream or res
 */
const generateInvoicePDF = (order, customer, res) => {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  // Stream directly to response
  doc.pipe(res);

  // Brand Header
  doc
    .fillColor('#059669') // emerald-600
    .fontSize(22)
    .font('Helvetica-Bold')
    .text('SMART INVENTORY', 50, 50);

  doc
    .fillColor('#6b7280')
    .fontSize(9)
    .font('Helvetica')
    .text('Retail & Wholesale Inventory System', 50, 75)
    .text('100 Enterprise Way, Suite 400', 50, 88)
    .text('support@smartinventory.com | (555) 019-2834', 50, 101);

  // Invoice Meta on Right Side
  doc
    .fillColor('#111827')
    .fontSize(18)
    .font('Helvetica-Bold')
    .text('INVOICE', 350, 50, { align: 'right' });

  doc
    .fillColor('#374151')
    .fontSize(9)
    .font('Helvetica')
    .text(`Invoice No: ${order.orderNumber}`, 350, 75, { align: 'right' })
    .text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, 350, 88, { align: 'right' })
    .text(`Status: ${order.orderStatus.toUpperCase()}`, 350, 101, { align: 'right' })
    .text(`Payment: ${order.paymentStatus.toUpperCase()} (${order.paymentMethod.toUpperCase()})`, 350, 114, { align: 'right' });

  // Divider line
  doc
    .strokeColor('#e5e7eb')
    .lineWidth(1)
    .moveTo(50, 135)
    .lineTo(545, 135)
    .stroke();

  // Customer / Bill To Information
  doc
    .fillColor('#111827')
    .fontSize(11)
    .font('Helvetica-Bold')
    .text('BILL TO:', 50, 150);

  doc
    .fillColor('#374151')
    .fontSize(10)
    .font('Helvetica')
    .text(customer?.name || 'Customer Name', 50, 166)
    .text(`Email: ${customer?.email || 'N/A'}`, 50, 180)
    .text(`Phone: ${customer?.phone || 'N/A'}`, 50, 194);

  const address = order.shippingAddress?.street
    ? order.shippingAddress
    : customer?.address;

  if (address?.street) {
    doc.text(`${address.street}, ${address.city}, ${address.state} ${address.postalCode}`, 50, 208);
  }

  // Items Table Header
  const tableTop = 240;
  doc
    .rect(50, tableTop, 495, 22)
    .fill('#f3f4f6');

  doc
    .fillColor('#111827')
    .fontSize(9)
    .font('Helvetica-Bold')
    .text('ITEM & DESCRIPTION', 60, tableTop + 6)
    .text('SKU', 250, tableTop + 6)
    .text('QTY', 340, tableTop + 6, { align: 'center', width: 40 })
    .text('PRICE', 400, tableTop + 6, { align: 'right', width: 55 })
    .text('SUBTOTAL', 480, tableTop + 6, { align: 'right', width: 55 });

  // Items Table Rows
  let currentY = tableTop + 28;
  doc.font('Helvetica').fontSize(9).fillColor('#374151');

  order.items.forEach((item, index) => {
    // Alternating background
    if (index % 2 === 1) {
      doc.rect(50, currentY - 4, 495, 20).fill('#fafafa');
    }

    doc
      .fillColor('#111827')
      .text(item.name, 60, currentY, { width: 180, lineBreak: false })
      .fillColor('#4b5563')
      .text(item.sku, 250, currentY)
      .text(item.quantity.toString(), 340, currentY, { align: 'center', width: 40 })
      .text(`$${item.price.toFixed(2)}`, 400, currentY, { align: 'right', width: 55 })
      .text(`$${item.subtotal.toFixed(2)}`, 480, currentY, { align: 'right', width: 55 });

    currentY += 22;
  });

  // Divider line before summary
  doc
    .strokeColor('#e5e7eb')
    .lineWidth(1)
    .moveTo(320, currentY + 10)
    .lineTo(545, currentY + 10)
    .stroke();

  // Summary Table on Right
  const summaryY = currentY + 20;
  doc
    .fontSize(9)
    .font('Helvetica')
    .fillColor('#4b5563')
    .text('Subtotal:', 340, summaryY)
    .text(`$${order.subtotal.toFixed(2)}`, 460, summaryY, { align: 'right', width: 75 })

    .text(`Tax (${(order.taxRate * 100).toFixed(0)}%):`, 340, summaryY + 16)
    .text(`$${order.taxAmount.toFixed(2)}`, 460, summaryY + 16, { align: 'right', width: 75 })

    .text('Discount:', 340, summaryY + 32)
    .text(`-$${order.discount.toFixed(2)}`, 460, summaryY + 32, { align: 'right', width: 75 })

    .text('Shipping:', 340, summaryY + 48)
    .text(`$${order.shippingCost.toFixed(2)}`, 460, summaryY + 48, { align: 'right', width: 75 });

  // Total Box
  doc
    .rect(330, summaryY + 68, 215, 26)
    .fill('#ecfdf5'); // light emerald

  doc
    .fillColor('#065f46')
    .fontSize(11)
    .font('Helvetica-Bold')
    .text('TOTAL AMOUNT:', 340, summaryY + 76)
    .text(`$${order.total.toFixed(2)}`, 450, summaryY + 76, { align: 'right', width: 85 });

  // Notes & Footer
  if (order.notes) {
    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor('#111827')
      .text('Order Notes:', 50, summaryY)
      .font('Helvetica')
      .fillColor('#6b7280')
      .text(order.notes, 50, summaryY + 14, { width: 260 });
  }

  // Footer
  doc
    .fontSize(8)
    .fillColor('#9ca3af')
    .text(
      'Thank you for your business! For inquiries regarding this invoice, please email support@smartinventory.com.',
      50,
      720,
      { align: 'center', width: 495 }
    );

  doc.end();
};

module.exports = { generateInvoicePDF };
