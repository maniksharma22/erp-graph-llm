const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: false
  }
});

const getGraph = async (req, res) => {
  try {
    const edges = [];
    const nodeMap = new Map();

    const customers = await pool.query('SELECT * FROM customers');
    customers.rows.forEach(c => {
      const id = c.customer_id || c.id; 
      nodeMap.set(id, { 
        id: id, 
        label: c.name || c.customer_name, 
        type: 'customer', 
        meta: c 
      });
    });

    const orders = await pool.query('SELECT * FROM sales_orders');
    orders.rows.forEach(o => {
      const orderId = o.order_id || o.sales_order_id;
      const customerId = o.customer_id;

      nodeMap.set(orderId, { 
        id: orderId, 
        label: `Order ${orderId}`, 
        type: 'order', 
        meta: o 
      });

      if (nodeMap.has(customerId)) {
        edges.push({ 
          id: `e-c-${orderId}`, 
          source: customerId, 
          target: orderId 
        });
      }
    });

    res.json({ 
      nodes: Array.from(nodeMap.values()), 
      edges: edges 
    });

  } catch (err) {
    res.status(500).json({ 
      nodes: [], 
      edges: [], 
      error: err.message 
    });
  }
};

module.exports = { getGraph };