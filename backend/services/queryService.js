const pool = require("../config/db");

// Helper to format delivered but not invoiced orders
const formatDeliveredNotInvoiced = (orders) => {
  if (!orders || orders.length === 0) return "No delivered orders pending invoicing.";

  const ids = orders.map((o) => o.sales_order_id);

  let formatted = "";
  if (ids.length === 1) {
    formatted = ids[0];
  } else if (ids.length === 2) {
    formatted = `${ids[0]} & ${ids[1]}`;
  } else {
    formatted = `${ids.slice(0, -1).join(", ")} & ${ids[ids.length - 1]}`;
  }

  return `Orders delivered but not invoiced: ${formatted}`;
};

// Additional helper: orders with no delivery
const formatOrdersWithNoDelivery = (orders) => {
  if (!orders || orders.length === 0) return "All orders have deliveries.";
  const ids = orders.map((o) => o.sales_order_id);
  return `Orders without delivery: ${ids.join(", ")}`;
};

// Main NLP handler
const runNaturalQuery = async (query) => {
  try {
    const lower = query.toLowerCase();

    // Delivered but not invoiced
    const deliveredQuery = lower.includes("delivered");
    const invoiceQuery =
      lower.includes("invoice") ||
      lower.includes("invoiced") ||
      lower.includes("bill") ||
      lower.includes("billed") ||
      lower.includes("pending");

    if (deliveredQuery && invoiceQuery) {
      const result = await pool.query(`
        SELECT so.sales_order_id
        FROM sales_orders so
        JOIN deliveries d ON so.sales_order_id = d.sales_order_id
        LEFT JOIN invoices i ON d.delivery_id = i.delivery_id
        WHERE i.invoice_id IS NULL
        ORDER BY so.sales_order_id DESC
        LIMIT 20
      `);

      const orders = result.rows;
      const answer = formatDeliveredNotInvoiced(orders);
      const nodes = orders.map((o) => `order-${o.sales_order_id}`);
      return { answer, nodes };
    }

    // Orders with no delivery
    if (lower.includes("no delivery") || lower.includes("not delivered")) {
      const result = await pool.query(`
        SELECT so.sales_order_id
        FROM sales_orders so
        LEFT JOIN deliveries d ON so.sales_order_id = d.sales_order_id
        WHERE d.delivery_id IS NULL
        ORDER BY so.sales_order_id DESC
        LIMIT 20
      `);

      const orders = result.rows;
      const answer = formatOrdersWithNoDelivery(orders);
      const nodes = orders.map((o) => `order-${o.sales_order_id}`);
      return { answer, nodes };
    }

    return {
      answer: "Query not supported. Ask about ERP data (orders, deliveries, invoices, payments).",
      nodes: [],
    };
  } catch (error) {
    console.error(error);
    return { answer: "Error fetching data.", nodes: [] };
  }
};

module.exports = { runNaturalQuery };