const pool = require("../config/db");

const getGraphData = async () => {
  // Fetch all data from the database
  const [ordersRes, customersRes, deliveriesRes, invoicesRes, paymentsRes] = await Promise.all([
    pool.query("SELECT * FROM sales_orders"),
    pool.query("SELECT * FROM customers"),
    pool.query("SELECT * FROM deliveries"),
    pool.query("SELECT * FROM invoices"),
    pool.query("SELECT * FROM payments"),
  ]);

  const nodes = [];
  const edges = [];

  // Helper to keep formatting consistent for React Flow
  const addNode = (id, label, meta) => {
    nodes.push({ 
      id: String(id), 
      data: { label, meta } 
    });
  };

  // 1. Customers
  customersRes.rows.forEach(c => {
    addNode(`customer-${c.customer_id}`, c.name, { 
      customer_id: c.customer_id, 
      customer_name: c.name 
    });
  });

  // 2. Orders -> Link to Customer
  ordersRes.rows.forEach(o => {
    addNode(`order-${o.sales_order_id}`, `Order ${o.sales_order_id}`, { 
      sales_order_id: o.sales_order_id, 
      status: o.status,
      order_amount: o.amount 
    });
    if (o.customer_id) {
      edges.push({ 
        id: `e-c-o-${o.sales_order_id}`, 
        source: `customer-${o.customer_id}`, 
        target: `order-${o.sales_order_id}` 
      });
    }
  });

  // 3. Deliveries -> Link to Order
  deliveriesRes.rows.forEach(d => {
    addNode(`delivery-${d.delivery_id}`, `Delivery ${d.delivery_id}`, { 
      delivery_id: d.delivery_id, 
      status: d.status 
    });
    // Check if column is sales_order_id or order_id
    const orderId = d.sales_order_id || d.order_id;
    if (orderId) {
      edges.push({ 
        id: `e-o-d-${d.delivery_id}`, 
        source: `order-${orderId}`, 
        target: `delivery-${d.delivery_id}` 
      });
    }
  });

  // 4. Invoices -> Link to Order
  invoicesRes.rows.forEach(i => {
    addNode(`invoice-${i.invoice_id}`, `Invoice ${i.invoice_id}`, { 
      invoice_id: i.invoice_id 
    });
    const orderId = i.sales_order_id || i.order_id;
    if (orderId) {
      edges.push({ 
        id: `e-o-i-${i.invoice_id}`, 
        source: `order-${orderId}`, 
        target: `invoice-${i.invoice_id}` 
      });
    }
  });

  // 5. Payments -> Link to Invoice
  paymentsRes.rows.forEach(p => {
    addNode(`payment-${p.payment_id}`, `Payment ${p.payment_id}`, { 
      payment_id: p.payment_id,
      amount: p.amount 
    });
    if (p.invoice_id) {
      edges.push({ 
        id: `e-i-p-${p.payment_id}`, 
        source: `invoice-${p.invoice_id}`, 
        target: `payment-${p.payment_id}` 
      });
    }
  });

  return { nodes, edges };
};

const getDeliveredNotInvoiced = async () => {
  const query = `
    SELECT d.sales_order_id FROM deliveries d
    LEFT JOIN invoices i ON d.sales_order_id = i.sales_order_id
    WHERE d.status = 'delivered' AND i.invoice_id IS NULL`;
  
  const res = await pool.query(query);
  const ids = res.rows.map(r => r.sales_order_id);
  
  return { 
    answer: `Found **${ids.length}** orders delivered but not invoiced: **${ids.join(", ")}**.`, 
    nodes: ids.map(id => `order-${id}`) 
  };
};

module.exports = { getGraphData, getDeliveredNotInvoiced };