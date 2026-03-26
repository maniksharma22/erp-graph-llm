// backend/controllers/graphController.js
const fs = require("fs");
const path = require("path");

// Helper to read JSON or JSONL safely
const readJsonFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    console.warn("Missing file:", filePath);
    return [];
  }
  const ext = path.extname(filePath);
  try {
    if (ext === ".json") return JSON.parse(fs.readFileSync(filePath, "utf-8"));
    if (ext === ".jsonl") {
      return fs
        .readFileSync(filePath, "utf-8")
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line));
    }
  } catch (err) {
    console.error("Parse error in file:", filePath, err.message);
    return [];
  }
  return [];
};

// Read all JSONL files in a folder safely
const readJsonlFolder = (folderPath) => {
  if (!fs.existsSync(folderPath)) {
    console.warn("Missing folder:", folderPath);
    return [];
  }
  const files = fs.readdirSync(folderPath).filter((f) => f.endsWith(".jsonl"));
  let result = [];
  files.forEach((file) => {
    result = result.concat(readJsonFile(path.join(folderPath, file)));
  });
  return result;
};

const getGraph = async (req, res) => {
  try {
    const nodes = [];
    const edges = [];
    const nodeMap = new Map();

    // Business Partners / Customers
    const bpFile = path.join(__dirname, "../data/business_partners.json");
    const businessPartners = readJsonFile(bpFile);
    businessPartners.forEach((bp) => {
      if (!bp.customer) return;
      nodeMap.set(bp.customer, { id: bp.customer, label: bp.businessPartnerFullName || bp.customer, meta: bp });
    });

    // Sales Orders
    const soFile = path.join(__dirname, "../data/sales_orders.json");
    const salesOrders = readJsonFile(soFile);
    salesOrders.forEach((so) => {
      if (!so.sales_order_id) return;
      nodeMap.set(so.sales_order_id, { id: so.sales_order_id, label: `Order ${so.sales_order_id}`, meta: so });
      if (so.customer) edges.push({ id: `e-cust-${so.sales_order_id}`, source: so.customer, target: so.sales_order_id });
    });

    // Deliveries
    const deliveryFolder = path.join(__dirname, "../data/outbound_delivery_items");
    const deliveries = readJsonlFolder(deliveryFolder);
    deliveries.forEach((d) => {
      if (!d.delivery_id) return;
      nodeMap.set(d.delivery_id, { id: d.delivery_id, label: `Delivery ${d.delivery_id}`, meta: d });
      if (d.sales_order_id) edges.push({ id: `e-order-${d.delivery_id}`, source: d.sales_order_id, target: d.delivery_id });
    });

    // Invoices
    const invoiceFolder = path.join(__dirname, "../data/billing_document_items");
    const invoices = readJsonlFolder(invoiceFolder);
    invoices.forEach((inv) => {
      if (!inv.invoice_id) return;
      nodeMap.set(inv.invoice_id, { id: inv.invoice_id, label: `Invoice ${inv.invoice_id}`, meta: inv });
      if (inv.delivery_id) edges.push({ id: `e-del-${inv.invoice_id}`, source: inv.delivery_id, target: inv.invoice_id });
    });

    // Payments
    const paymentsFile = path.join(__dirname, "../data/payments_accounts_receivable.jsonl");
    const payments = readJsonlFolder(paymentsFile);
    payments.forEach((p) => {
      if (!p.payment_id) return;
      nodeMap.set(p.payment_id, { id: p.payment_id, label: `Payment ${p.payment_id}`, meta: p });
      if (p.customer) edges.push({ id: `e-custpay-${p.payment_id}`, source: p.customer, target: p.payment_id });
    });

    res.json({ nodes: Array.from(nodeMap.values()), edges });
  } catch (err) {
    console.error("Graph fetch error:", err.message, err.stack);
    res.status(500).json({ error: "Error fetching graph data" });
  }
};

module.exports = { getGraph };