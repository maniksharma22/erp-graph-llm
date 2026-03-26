const fs = require("fs");
const path = require("path");

// Base data directory
const BASE_DIR = path.join(__dirname, "..", "data");

// ✅ Robust File Reader: Handles corrupted JSON and JSONL
const readJsonFile = (filePath) => {
    console.log("Reading file:", filePath);
    if (!fs.existsSync(filePath)) {
        console.warn("Missing file:", filePath);
        return [];
    }

    try {
        const content = fs.readFileSync(filePath, "utf-8").trim();
        if (!content) return [];

        const ext = path.extname(filePath);

        // If it's a standard JSON array
        if (ext === ".json") {
            try {
                return JSON.parse(content);
            } catch (e) {
                // Fallback: If .json file actually contains JSONL data
                return content.split("\n")
                    .filter(Boolean)
                    .map(line => {
                        try { return JSON.parse(line.replace(/,$/, "")); } 
                        catch (err) { return null; }
                    })
                    .filter(Boolean);
            }
        }

        // If it's JSONL (Line by Line)
        if (ext === ".jsonl") {
            return content.split("\n")
                .filter(Boolean)
                .map(line => {
                    try { 
                        // Remove leading/trailing brackets or commas if they exist
                        let cleanLine = line.trim();
                        if (cleanLine.startsWith("[")) cleanLine = cleanLine.substring(1);
                        if (cleanLine.endsWith("]") || cleanLine.endsWith(",")) cleanLine = cleanLine.slice(0, -1);
                        return JSON.parse(cleanLine); 
                    } catch (err) { return null; }
                })
                .filter(Boolean);
        }
    } catch (err) {
        console.error("Critical parse error in:", filePath, err.message);
        return [];
    }
    return [];
};

// Read all JSONL files in a folder
const readJsonlFolder = (folderPath) => {
    if (!fs.existsSync(folderPath)) return [];
    try {
        const files = fs.readdirSync(folderPath).filter((f) => f.endsWith(".jsonl"));
        let result = [];
        files.forEach((file) => {
            result = result.concat(readJsonFile(path.join(folderPath, file)));
        });
        return result;
    } catch (e) {
        return [];
    }
};

const getGraph = async (req, res) => {
    try {
        const edges = [];
        const nodeMap = new Map();

        // 1. Business Partners
        const businessPartners = readJsonFile(path.join(BASE_DIR, "business_partners.jsonl"));
        businessPartners.forEach((bp) => {
            const id = bp.customer || bp.businessPartner;
            if (!id) return;
            nodeMap.set(id, {
                id: id,
                label: bp.businessPartnerFullName || id,
                meta: bp,
                type: 'customer'
            });
        });

        // 2. Sales Orders
        const salesOrders = readJsonFile(path.join(BASE_DIR, "sales_orders.jsonl"));
        salesOrders.forEach((so) => {
            const id = so.salesOrder || so.sales_order_id;
            if (!id) return;
            nodeMap.set(id, {
                id: id,
                label: `Order ${id}`,
                meta: so,
                type: 'order'
            });
            const custId = so.soldToParty || so.customer;
            if (custId) {
                edges.push({ id: `e-cust-${id}`, source: custId, target: id });
            }
        });

        // 3. Deliveries (Folder)
        const deliveries = readJsonlFolder(path.join(BASE_DIR, "outbound_delivery_items"));
        deliveries.forEach((d) => {
            const id = d.delivery_id || d.outboundDelivery;
            if (!id) return;
            nodeMap.set(id, {
                id: id, label: `Delivery ${id}`, meta: d, type: 'delivery'
            });
            const soId = d.sales_order_id || d.referenceSDDocument;
            if (soId) {
                edges.push({ id: `e-order-${id}`, source: soId, target: id });
            }
        });

        // 4. Invoices (Folder)
        const invoices = readJsonlFolder(path.join(BASE_DIR, "billing_document_items"));
        invoices.forEach((inv) => {
            const id = inv.invoice_id || inv.billingDocument;
            if (!id) return;
            nodeMap.set(id, {
                id: id, label: `Invoice ${id}`, meta: inv, type: 'invoice'
            });
            const delId = inv.delivery_id || inv.referenceSDDocument;
            if (delId) {
                edges.push({ id: `e-del-${id}`, source: delId, target: id });
            }
        });

        // 5. Payments (File fix: Using readJsonFile instead of Folder)
        const payments = readJsonFile(path.join(BASE_DIR, "payments_accounts_receivable.jsonl"));
        payments.forEach((p) => {
            const id = p.payment_id || p.accountingDocument;
            if (!id) return;
            nodeMap.set(id, {
                id: id, label: `Payment ${id}`, meta: p, type: 'payment'
            });
            const custId = p.customer;
            if (custId) {
                edges.push({ id: `e-pay-${id}`, source: custId, target: id });
            }
        });

        // Send Clean Response
        res.json({ 
            nodes: Array.from(nodeMap.values()), 
            edges: edges 
        });

    } catch (err) {
        console.error("Graph fetch error:", err.message);
        res.status(500).json({ nodes: [], edges: [], error: "Internal Server Error" });
    }
};

module.exports = { getGraph };