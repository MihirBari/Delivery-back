const { promisePool, pool } = require('../config/db');
const ErrorHandler = require('../utils/ErrorHandler');
const catchAsync = require('../utils/catchAsync');

/**
 * Get raised delivery orders assigned to a specific user/driver
 * @route GET /orders/:userId
 */
const getOrdersByUser = catchAsync(async (req, res, next) => {
  const { userId } = req.params;

  if (!userId) {
    return next(new ErrorHandler('User ID is required', 400));
  }

  const query = `
    SELECT DISTINCT 
      o.id,
      o.order_number,
      c.creditor_name,
      c.creditor_number_1,
      c.creditor_address_1,
      c.creditor_address_2,
      c.creditor_address_3,
      c.creditor_city,
      c.creditor_state,
      c.creditor_pincode,
      d.delivery_status
    FROM deliveries d
    JOIN orders o ON o.id = d.order_id
    JOIN creditors c ON c.id = o.creditor_id
    WHERE d.user_id = ? AND d.delivery_status = 'raised'
    ORDER BY o.id DESC;
  `;

  const [orders] = await promisePool.execute(query, [userId]);
  return res.status(200).json(orders);
});

/**
 * Get itemized product details for a specific order
 * @route GET /orderdetail/:id
 */
const getOrderDetails = catchAsync(async (req, res, next) => {
  const { id: orderId } = req.params;

  if (!orderId) {
    return next(new ErrorHandler('Order ID is required', 400));
  }

  const query = `
    SELECT 
      oi.item_quantity AS orderQuantity,
      oi.product_id AS Items,
      p.product_name AS productName,
      p.product_hs_code AS HSNCODE,
      p.product_uom AS Test,
      p.product_cat_no AS Cat
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    JOIN products p ON oi.product_id = p.id
    WHERE o.id = ?
    ORDER BY oi.id ASC;
  `;

  const [rows] = await promisePool.execute(query, [orderId]);

  // Return formatted array directly for UI DataTable component
  return res.status(200).json(rows);
});

/**
 * Complete a delivery with recipient signature (ACID Transaction)
 * @route PUT /orders/:id
 */
const completeDelivery = catchAsync(async (req, res, next) => {
  const { id: orderId } = req.params;
  const signatureDataURL = req.body.signature;

  if (!orderId) {
    return next(new ErrorHandler('Order ID is required', 400));
  }

  if (!signatureDataURL) {
    return next(new ErrorHandler('Signature is required to complete delivery', 400));
  }

  // Obtain a connection from pool for transaction
  const connection = await promisePool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Verify order exists
    const [orderRows] = await connection.execute(
      'SELECT id, status, creditor_id FROM orders WHERE id = ? FOR UPDATE',
      [orderId]
    );

    if (!orderRows || orderRows.length === 0) {
      await connection.rollback();
      return next(new ErrorHandler('Order not found', 404));
    }

    // 2. Update delivery status to 'delivered'
    const updateDeliveryQuery = `
      UPDATE deliveries 
      SET delivery_status = 'delivered', updated_at = CURRENT_TIMESTAMP() 
      WHERE order_id = ?;
    `;
    await connection.execute(updateDeliveryQuery, [orderId]);

    // 3. Record in completed_deliveries audit table
    const insertCompletedQuery = `
      INSERT INTO completed_deliveries (
        order_id, 
        recepient_name, 
        recepient_contact, 
        recepient_signature, 
        created_by, 
        delivery_time
      )
      SELECT
        o.id,
        c.creditor_name,
        c.creditor_number_1,
        ? AS recepient_signature,
        o.created_by,
        CURRENT_TIMESTAMP() AS delivery_time
      FROM orders o
      JOIN creditors c ON o.creditor_id = c.id
      WHERE o.id = ?
      LIMIT 1;
    `;
    await connection.execute(insertCompletedQuery, [signatureDataURL, orderId]);

    // 4. Update order status to 'Closed' and save signature
    const updateOrderQuery = `
      UPDATE orders
      SET status = 'Closed', recepient_signature = ?, updated_at = CURRENT_TIMESTAMP()
      WHERE id = ?;
    `;
    await connection.execute(updateOrderQuery, [signatureDataURL, orderId]);

    // Commit all operations atomically
    await connection.commit();
    console.log(`[Order] Successfully completed delivery for order #${orderId}`);

    // Return exact response string expected by frontend
    return res.status(200).json('Delivered the parcel');
  } catch (error) {
    await connection.rollback();
    console.error(`[Order Transaction Error] Failed to complete delivery for order #${orderId}:`, error);
    return next(error);
  } finally {
    connection.release();
  }
});

module.exports = {
  getOrdersByUser,
  getOrderDetails,
  completeDelivery,
};
