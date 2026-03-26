const pool = require("../config/db");

const getOrdersWithDetails = async () => {
    const query = `
    SELECT 
      o.id AS order_id,
      c.name AS customer_name,
      o.amount AS order_amount,
      d.status AS delivery_status,
      i.id AS invoice_id,
      p.id AS payment_id
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    LEFT JOIN deliveries d ON d.order_id = o.id
    LEFT JOIN invoices i ON i.order_id = o.id
    LEFT JOIN payments p ON p.invoice_id = i.id
    ORDER BY o.id;
  `;

    const result = await pool.query(query);
    return result.rows;
};
const getDeliveredNotBilled = async () => {
    const query = `
    SELECT 
      o.id AS order_id,
      c.name AS customer_name,
      d.status AS delivery_status
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    JOIN deliveries d ON d.order_id = o.id
    LEFT JOIN invoices i ON i.order_id = o.id
    WHERE d.status = 'DELIVERED'
    AND i.id IS NULL;
  `;

    const result = await pool.query(query);
    return result.rows;
};
module.exports = { getOrdersWithDetails, getDeliveredNotBilled };