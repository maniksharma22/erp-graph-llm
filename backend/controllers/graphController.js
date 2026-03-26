// backend/controllers/graphController.js
const fs = require("fs");
const path = require("path");

// Helper: read JSON or JSONL file
const readFileData = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  const content = fs.readFileSync(filePath, "utf-8");
  if (ext === ".json") {
    return JSON.parse(content);
  } else if (ext === ".jsonl") {
    return content
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((line) => JSON.parse(line));
  }
  return [];
};

// Helper: recursively get all files in folder
const getAllFiles = (dirPath) => {
  let files = [];
  fs.readdirSync(dirPath, { withFileTypes: true }).forEach((entry) => {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(getAllFiles(fullPath));
    } else if (entry.isFile() && [".json", ".jsonl"].includes(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  });
  return files;
};

const getGraph = (req, res) => {
  try {
    const dataDir = path.join(__dirname, "../data");
    const files = getAllFiles(dataDir);

    const nodeMap = new Map();
    const edgeSet = new Set();

    files.forEach((file) => {
      const records = readFileData(file);

      records.forEach((row) => {
        // Example: adjust based on your JSON fields
        if (row.customer_id) {
          nodeMap.set(String(row.customer_id), {
            id: String(row.customer_id),
            label: row.name || `Customer ${row.customer_id}`,
            meta: row,
          });
        }
        if (row.sales_order_id) {
          nodeMap.set(String(row.sales_order_id), {
            id: String(row.sales_order_id),
            label: `Order ${row.sales_order_id}`,
            meta: row,
          });
          if (row.customer_id) edgeSet.add(`${row.customer_id}->${row.sales_order_id}`);
        }
        if (row.delivery_id) {
          nodeMap.set(String(row.delivery_id), {
            id: String(row.delivery_id),
            label: `Delivery ${row.delivery_id}`,
            meta: row,
          });
          if (row.sales_order_id) edgeSet.add(`${row.sales_order_id}->${row.delivery_id}`);
        }
        if (row.invoice_id) {
          nodeMap.set(String(row.invoice_id), {
            id: String(row.invoice_id),
            label: `Invoice ${row.invoice_id}`,
            meta: row,
          });
          if (row.delivery_id) edgeSet.add(`${row.delivery_id}->${row.invoice_id}`);
        }
        if (row.payment_id) {
          nodeMap.set(String(row.payment_id), {
            id: String(row.payment_id),
            label: `Payment ${row.payment_id}`,
            meta: row,
          });
          if (row.customer_id) edgeSet.add(`${row.customer_id}->${row.payment_id}`);
        }
      });
    });

    const nodes = Array.from(nodeMap.values());
    const edges = Array.from(edgeSet).map((e, i) => {
      const [source, target] = e.split("->");
      return { id: `e-${i}`, source, target };
    });

    res.json({ nodes, edges });
  } catch (err) {
    console.error("ERROR reading graph data:", err);
    res.status(500).json({ error: "Error fetching graph data" });
  }
};

module.exports = { getGraph };
