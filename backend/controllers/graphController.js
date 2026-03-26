const fs = require("fs");
const path = require("path");

// Helper to read JSON or JSONL files
const readJSONFile = (filePath) => {
  if (filePath.endsWith(".jsonl")) {
    const lines = fs.readFileSync(filePath, "utf-8").split("\n").filter(Boolean);
    return lines.map((line) => JSON.parse(line));
  } else {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  }
};

const getGraph = async (req, res) => {
  try {
    const dataDir = path.join(__dirname, "../data");

    // 1️⃣ Read business partners
    const bpFile = path.join(dataDir, "business_partners.json");
    const partners = readJSONFile(bpFile);

    // 2️⃣ Read sales orders
    const soFile = path.join(dataDir, "sales_orders.json");
    const orders = readJSONFile(soFile);

    const nodes = new Map();
    const edges = [];

    // Add business partners as nodes
    partners.forEach((bp) => {
      nodes.set(bp.businessPartner, {
        id: bp.businessPartner,
        label: bp.businessPartnerFullName,
        meta: bp,
      });
    });

    // Add orders as nodes and connect to business partner
    orders.forEach((so) => {
      const bpId = so.customer; // link to business partner
      nodes.set(so.salesOrder, {
        id: so.salesOrder,
        label: `Order ${so.salesOrder}`,
        meta: so,
      });

      if (nodes.has(bpId)) {
        edges.push({
          id: `e-${bpId}-${so.salesOrder}`,
          source: bpId,
          target: so.salesOrder,
        });
      }
    });

    res.json({
      nodes: Array.from(nodes.values()),
      edges,
    });
  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ error: "Error fetching graph data" });
  }
};

module.exports = { getGraph };
