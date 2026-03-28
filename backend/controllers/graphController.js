const { Pool } = require('pg');
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const getGraph = async (req, res) => {
  try {
    const edges = [];
    const nodeMap = new Map();

    // 1. Customers
    const customers = await pool.query('SELECT * FROM business_partners');
    customers.rows.forEach(c => {
      nodeMap.set(c.customer_id, { id: c.customer_id, label: c.customer_name, type: 'customer', meta: c });
    });

    // 2. Orders
    const orders = await pool.query('SELECT * FROM sales_orders');
    orders.rows.forEach(o => {
      nodeMap.set(o.sales_order_id, { id: o.sales_order_id, label: `Order ${o.sales_order_id}`, type: 'order', meta: o });
      if (nodeMap.has(o.customer_id)) edges.push({ id: `e-c-${o.sales_order_id}`, source: o.customer_id, target: o.sales_order_id });
    });

    // Repeat for deliveries, invoices, payments...

    res.json({ nodes: Array.from(nodeMap.values()), edges });
  } catch (err) {
    res.status(500).json({ nodes: [], edges: [], error: err.message });
  }
};

module.exports = { getGraph };