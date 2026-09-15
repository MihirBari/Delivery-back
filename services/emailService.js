const nodemailer = require('nodemailer');

// Read SMTP credentials with support for both SMTP_* and legacy SMPT_* naming
const host = process.env.SMTP_HOST || process.env.SMPT_HOST || 'smtp.gmail.com';
const port = Number(process.env.SMTP_PORT || process.env.SMPT_PORT) || 465;
const user = process.env.SMTP_MAIL || process.env.SMPT_MAIL;
const pass = process.env.SMTP_PASSWORD || process.env.SMPT_PASSWORD;
const service = process.env.SMTP_SERVICE || process.env.SMPT_SERVICE || 'gmail';

let transporter = null;

if (user && pass) {
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    service,
    auth: {
      user,
      pass,
    },
  });
}

/**
 * Send order delivery confirmation email
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.creditorName - Name of the creditor/customer
 * @param {string|number} options.orderId - Order ID or number
 * @param {Array} options.items - List of delivered items
 */
const sendDeliveryConfirmationEmail = async ({ to, creditorName, orderNumber, items = [] }) => {
  if (!transporter) {
    console.warn('[Email Warning] SMTP credentials not configured. Skipping email dispatch.');
    return { success: false, message: 'SMTP not configured' };
  }

  if (!to) {
    throw new Error('Recipient email address is required');
  }

  // Generate plain text product list
  const textProductList = items
    .map(
      (item, index) =>
        `Product ${index + 1}:
  - Item: ${item.product_name || item.productName || 'N/A'}
  - Product ID: ${item.product_id || item.Items || 'N/A'}
  - Quantity: ${item.item_quantity || item.orderQuantity || 0}
  - HSN Code: ${item.product_hs_code || item.HSNCODE || 'N/A'}
  - UOM: ${item.product_uom || item.Test || 'N/A'}
  - Cat No: ${item.product_cat_no || item.Cat || 'N/A'}`
    )
    .join('\n\n');

  // Generate HTML table for product list
  const htmlRows = items
    .map(
      (item, index) => `
      <tr>
        <td style="padding: 8px 12px; border: 1px solid #ddd; text-align: center;">${index + 1}</td>
        <td style="padding: 8px 12px; border: 1px solid #ddd;"><strong>${item.product_name || item.productName || 'N/A'}</strong></td>
        <td style="padding: 8px 12px; border: 1px solid #ddd; text-align: center;">${item.product_cat_no || item.Cat || '-'}</td>
        <td style="padding: 8px 12px; border: 1px solid #ddd; text-align: center;">${item.product_hs_code || item.HSNCODE || '-'}</td>
        <td style="padding: 8px 12px; border: 1px solid #ddd; text-align: center;">${item.product_uom || item.Test || '-'}</td>
        <td style="padding: 8px 12px; border: 1px solid #ddd; text-align: center; font-weight: bold;">${item.item_quantity || item.orderQuantity || 0}</td>
      </tr>`
    )
    .join('');

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
      <div style="background-color: #2563eb; color: #ffffff; padding: 16px 20px; border-radius: 6px 6px 0 0; text-align: center;">
        <h2 style="margin: 0;">Allied Scientific Products</h2>
        <p style="margin: 4px 0 0; font-size: 14px;">Delivery Confirmation</p>
      </div>
      <div style="padding: 20px 10px;">
        <p>Dear <strong>${creditorName || 'Valued Customer'}</strong>,</p>
        <p>Your order <strong>#${orderNumber || 'N/A'}</strong> has been successfully delivered and signed for.</p>
        
        <h3 style="color: #1e293b; margin-top: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px;">Delivered Items Summary:</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px;">
          <thead>
            <tr style="background-color: #f1f5f9; color: #334155;">
              <th style="padding: 8px 12px; border: 1px solid #ddd;">#</th>
              <th style="padding: 8px 12px; border: 1px solid #ddd; text-align: left;">Product</th>
              <th style="padding: 8px 12px; border: 1px solid #ddd;">Cat #</th>
              <th style="padding: 8px 12px; border: 1px solid #ddd;">HSN</th>
              <th style="padding: 8px 12px; border: 1px solid #ddd;">UOM</th>
              <th style="padding: 8px 12px; border: 1px solid #ddd;">Qty</th>
            </tr>
          </thead>
          <tbody>
            ${htmlRows}
          </tbody>
        </table>

        <p style="margin-top: 25px; font-size: 13px; color: #64748b;">
          If you have any questions or discrepancies regarding this delivery, please reply to this email or contact support at <a href="mailto:info@alliedscientific.net">info@alliedscientific.net</a>.
        </p>
      </div>
      <div style="border-top: 1px solid #e2e8f0; padding-top: 12px; text-align: center; font-size: 12px; color: #94a3b8;">
        Allied Scientific Products &copy; ${new Date().getFullYear()} - All Rights Reserved.
      </div>
    </div>
  `;

  const mailOptions = {
    from: `"Allied Scientific Delivery" <${user}>`,
    to,
    cc: 'info@alliedscientific.net',
    subject: `Delivery Confirmation: Order #${orderNumber || ''}`,
    text: `Thank you for your order, ${creditorName}.\n\nHere is the list of delivered products:\n\n${textProductList}\n\nAllied Scientific Products`,
    html: htmlContent,
  };

  const result = await transporter.sendMail(mailOptions);
  return { success: true, messageId: result.messageId };
};

module.exports = {
  sendDeliveryConfirmationEmail,
};
