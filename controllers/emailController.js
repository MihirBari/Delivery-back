const { promisePool } = require('../config/db');
const { sendDeliveryConfirmationEmail } = require('../services/emailService');
const ErrorHandler = require('../utils/ErrorHandler');
const catchAsync = require('../utils/catchAsync');

/**
 * Send delivery notification email to creditor
 * @route POST /send-email/:id
 */
const sendOrderEmail = catchAsync(async (req, res, next) => {
  const { id: orderId } = req.params;

  if (!orderId) {
    return next(new ErrorHandler('Order ID is required', 400));
  }

  const query = `
    SELECT 
      o.id, 
      o.order_number,
      c.creditor_name, 
      c.creditor_email_id,
      oi.item_quantity,
      oi.product_id,
      p.product_name,
      p.product_hs_code,
      p.product_uom,
      p.product_cat_no
    FROM orders o
    JOIN creditors c ON o.creditor_id = c.id
    LEFT JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN products p ON oi.product_id = p.id
    WHERE o.id = ?;
  `;

  const [rows] = await promisePool.execute(query, [orderId]);

  if (!rows || rows.length === 0) {
    return next(new ErrorHandler('Order not found', 404));
  }

  const order = rows[0];

  if (!order.creditor_email_id) {
    console.warn(`[Email Warning] Creditor ${order.creditor_name} has no email configured.`);
    return res.status(200).json({
      message: 'Email skipped: No creditor email address on file.',
    });
  }

  // Send email via email service
  try {
    await sendDeliveryConfirmationEmail({
      to: order.creditor_email_id,
      creditorName: order.creditor_name,
      orderNumber: order.order_number || order.id,
      items: rows,
    });

    console.log(`[Email] Delivery email sent to ${order.creditor_email_id} for order #${orderId}`);
    return res.status(200).json({ message: 'Email sent successfully!' });
  } catch (error) {
    console.error(`[Email Error] Failed to send email for order #${orderId}:`, error);
    return res.status(500).json({ error: 'An error occurred while sending the email.' });
  }
});

module.exports = {
  sendOrderEmail,
};
