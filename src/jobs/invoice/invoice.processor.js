import PDFDocument from 'pdfkit';
import { v4 as uuid } from 'uuid';
import { ServiceOrder } from '../../features/service-booking/models/serviceOrder.model.js';
import { User } from '../../core/models/index.js';
import { uploadBufferToR2 } from '../../lib/storage/r2Upload.js';
import { logger } from '../../utils/index.js';

function renderInvoicePdf(order, user) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(20).fillColor('#111827').text('Service Hub', { align: 'left' });
    doc.moveDown(0.3);
    doc.fontSize(14).fillColor('#6b7280').text('Invoice', { align: 'left' });
    doc.moveDown();

    doc.fontSize(10).fillColor('#6b7280');
    doc.text(`Order: ${order.orderNumber}`);
    doc.text(`Date: ${order.createdAt.toDateString()}`);
    doc.text(`Billed to: ${[user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Customer'}`);
    if (user?.email) doc.text(user.email);
    doc.moveDown();

    order.items.forEach((item) => {
      doc.fontSize(11).fillColor('#111827').text(`${item.serviceNameSnapshot}  —  ₹${item.priceSnapshot.toFixed(2)}`);
      item.addonsSnapshot?.forEach((addon) => {
        doc.fontSize(9).fillColor('#6b7280').text(`   + ${addon.name} — ₹${addon.price.toFixed(2)}`);
      });
    });

    doc.moveDown();
    doc.fontSize(12).fillColor('#111827').text(`Total: ₹${order.totalAmount.toFixed(2)}`, { align: 'right' });

    doc.end();
  });
}

export async function invoiceProcessor(job) {
  const { orderNumber, regenerate = false } = job.data;

  const order = await ServiceOrder.findOne({ orderNumber });
  if (!order) {
    throw new Error(`ServiceOrder not found for invoice generation: ${orderNumber}`);
  }

  if (order.invoiceUrl && !regenerate) {
    logger.info('Invoice already generated — skipping', { jobId: job.id, orderNumber });
    return { skipped: true, url: order.invoiceUrl };
  }

  const user = await User.findById(order.user).select('firstName lastName email').lean();
  const buffer = await renderInvoicePdf(order, user);

  const key = `invoices/${orderNumber}/${uuid()}.pdf`;
  const { url } = await uploadBufferToR2({ key, buffer, contentType: 'application/pdf' });

  order.invoiceUrl = url;
  await order.save();

  return { url };
}
