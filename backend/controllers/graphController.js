// backend/controllers/graphController.js
const fs = require("fs");
const path = require("path");

// Helper to read JSON or JSONL file
const readJsonFile = (filePath) => {
  const ext = path.extname(filePath);
  if (ext === ".json") {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } else if (ext === ".jsonl") {
    const lines = fs.readFileSync(filePath, "utf-8").split("\n").filter(Boolean);
    return lines.map((line) => JSON.parse(line));
  }
  return [];
};

// Read all JSONL files in a folder
const readJsonlFolder = (folderPath) => {
  if (!fs.existsSync(folderPath)) return [];
  const files = fs.readdirSync(folderPath);
  let result = [];
  files.forEach((file) => {
    const filePath = path.join(folderPath, file);
    result = result.concat(readJsonFile(filePath));
  });
  return result;
};

const getGraph = async (req, res) => {
  try {
    const nodes = [];
    const edges = [];
    const nodeMap = new Map();

    // 1️⃣ Business Partners / Customers
    const bpFile = path.join(__dirname, "../data/business_partners.json");
    const businessPartners = readJsonFile(bpFile);
    businessPartners.forEach((bp) => {
      nodeMap.set(bp.customer, {
        id: bp.customer,
        label: bp.businessPartnerFullName,
        meta: { ...bp },
      });
    });

    // 2️⃣ Sales Orders
    const soFile = path.join(__dirname, "../data/sales_orders.json");
    const salesOrders = readJsonFile(soFile);
    salesOrders.forEach((so) => {
      nodeMap.set(so.sales_order_id, {
        id: so.sales_order_id,
        label: `Order ${so.sales_order_id}`,
        meta: { ...so },
      });
      // edge: customer -> order
      if (so.customer) edges.push({ id: `e-cust-${so.sales_order_id}`, source: so.customer, target: so.sales_order_id });
    });

    // 3️⃣ Deliveries
    const deliveryFolder = path.join(__dirname, "../data/outbound_delivery_items");
    const deliveries = readJsonlFolder(deliveryFolder);
    deliveries.forEach((d) => {
      nodeMap.set(d.delivery_id, {
        id: d.delivery_id,
        label: `Delivery ${d.delivery_id}`,
        meta: { ...d },
      });
      // edge: order -> delivery
      if (d.sales_order_id) edges.push({ id: `e-order-${d.delivery_id}`, source: d.sales_order_id, target: d.delivery_id });
    });

    // 4️⃣ Invoices / Billing Documents
    const invoiceFolder = path.join(__dirname, "../data/billing_document_items");
    const invoices = readJsonlFolder(invoiceFolder);
    invoices.forEach((inv) => {
      nodeMap.set(inv.invoice_id, {
        id: inv.invoice_id,
        label: `Invoice ${inv.invoice_id}`,
        meta: { ...inv },
      });
      // edge: delivery -> invoice
      if (inv.delivery_id) edges.push({ id: `e-del-${inv.invoice_id}`, source: inv.delivery_id, target: inv.invoice_id });
    });

    // 5️⃣ Payments
    const paymentsFile = path.join(__dirname, "../data/payments_accounts_receivable.jsonl");
    const payments = readJsonlFolder(paymentsFile);
    payments.forEach((p) => {
      nodeMap.set(p.payment_id, {
        id: p.payment_id,
        label: `Payment ${p.payment_id}`,
        meta: { ...p },
      });
      // edge: customer -> payment
      if (p.customer) edges.push({ id: `e-custpay-${p.payment_id}`, source: p.customer, target: p.payment_id });
    });

    res.json({ nodes: Array.from(nodeMap.values()), edges });
  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ error: "Error fetching graph data" });
  }
};

module.exports = { getGraph };
