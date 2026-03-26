const pool = require("../config/db");

const getGraph = async (req, res) => {
  try {
    const view = req.query.view || "detailed";
    const searchId = req.query.searchId || "";

    if (view === "summary") {
      return res.json({
        nodes: [
          { id: "customers", label: "Customers", meta: { type: "All Customers" } },
          { id: "orders", label: "Orders", meta: { type: "All Orders" } },
          { id: "deliveries", label: "Deliveries", meta: { type: "All Deliveries" } },
          { id: "invoices", label: "Invoices", meta: { type: "All Invoices" } },
          { id: "payments", label: "Payments", meta: { type: "All Payments" } },
        ],
        edges: [
          { source: "customers", target: "orders" },
          { source: "orders", target: "deliveries" },
          { source: "deliveries", target: "invoices" },
          { source: "customers", target: "payments" },
        ],
      });
    }

    const nodeMap = new Map();
    const edgeSet = new Set();

    let whereClause = "";
    if (searchId) {
      const cleanId = searchId.replace(/\D/g, '');
      whereClause = `
        WHERE c.customer_id::text = '${cleanId}' 
        OR so.sales_order_id::text = '${cleanId}' 
        OR d.delivery_id::text = '${cleanId}' 
        OR i.invoice_id::text = '${cleanId}' 
        OR p.payment_id::text = '${cleanId}'
      `;
    }

    const queryText = `
      SELECT 
        c.customer_id, c.name,
        so.sales_order_id, so.status, so.amount,
        d.delivery_id,
        i.invoice_id,
        p.payment_id
      FROM customers c
      LEFT JOIN sales_orders so ON so.customer_id = c.customer_id
      LEFT JOIN deliveries d ON d.sales_order_id = so.sales_order_id
      LEFT JOIN invoices i ON i.delivery_id = d.delivery_id
      LEFT JOIN payments p ON p.customer_id = c.customer_id
      ${whereClause}
      ${searchId ? "" : "LIMIT 50"}
    `;

    const result = await pool.query(queryText);

    result.rows.forEach((row) => {
      if (row.customer_id) {
        nodeMap.set(String(row.customer_id), {
          id: String(row.customer_id),
          label: row.name,
          meta: { customer_id: row.customer_id, customer_name: row.name }
        });
      }
      if (row.sales_order_id) {
        nodeMap.set(String(row.sales_order_id), {
          id: String(row.sales_order_id),
          label: `Order ${row.sales_order_id}`,
          meta: { sales_order_id: row.sales_order_id, status: row.status, amount: row.amount }
        });
        if (row.customer_id) edgeSet.add(`${row.customer_id}->${row.sales_order_id}`);
      }
      if (row.delivery_id) {
        nodeMap.set(String(row.delivery_id), {
          id: String(row.delivery_id),
          label: `Delivery ${row.delivery_id}`,
          meta: { delivery_id: row.delivery_id }
        });
        if (row.sales_order_id) edgeSet.add(`${row.sales_order_id}->${row.delivery_id}`);
      }
      if (row.invoice_id) {
        nodeMap.set(String(row.invoice_id), {
          id: String(row.invoice_id),
          label: `Invoice ${row.invoice_id}`,
          meta: { invoice_id: row.invoice_id }
        });
        if (row.delivery_id) edgeSet.add(`${row.delivery_id}->${row.invoice_id}`);
      }
      if (row.payment_id) {
        nodeMap.set(String(row.payment_id), {
          id: String(row.payment_id),
          label: `Payment ${row.payment_id}`,
          meta: { payment_id: row.payment_id }
        });
        if (row.customer_id) edgeSet.add(`${row.customer_id}->${row.payment_id}`);
      }
    });

    const nodes = Array.from(nodeMap.values());
    const edges = Array.from(edgeSet).map((e, i) => {
      const [source, target] = e.split("->");
      return { id: `e-${i}`, source: String(source), target: String(target) };
    });

    res.json({ nodes, edges });

  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ error: "Error fetching graph data" });
  }
};

module.exports = { getGraph };