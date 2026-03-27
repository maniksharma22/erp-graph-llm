const fs = require("fs");
const path = require("path");
const BASE_DIR = path.join(__dirname, "..", "data");

const readJsonFile = (filePath) => {
    if (!fs.existsSync(filePath)) return [];
    try {
        const content = fs.readFileSync(filePath, "utf-8").trim();
        if (!content) return [];
        const ext = path.extname(filePath);
        if (ext === ".json") return JSON.parse(content);
        // JSONL logic
        return content.split("\n").filter(Boolean).map(line => {
            try { return JSON.parse(line.trim().replace(/,$/, "")); } catch { return null; }
        }).filter(Boolean);
    } catch { return []; }
};

const readJsonlFolder = (folderPath) => {
    if (!fs.existsSync(folderPath)) return [];
    try {
        const files = fs.readdirSync(folderPath).filter(f => f.endsWith(".jsonl"));
        let result = [];
        files.forEach(file => { result = result.concat(readJsonFile(path.join(folderPath, file))); });
        return result;
    } catch { return []; }
};

const getGraph = async (req, res) => {
    try {
        const edges = [];
        const nodeMap = new Map();
        
        // CRITICAL: Yeh function "0000740508" ko "740508" bana dega
        const cleanId = (id) => id ? String(id).trim().replace(/^0+/, '') : null;

        // 1. Customers
        const bps = readJsonFile(path.join(BASE_DIR, "business_partners.jsonl"));
        bps.forEach(bp => {
            const id = cleanId(bp.customer || bp.businessPartner);
            if (id) nodeMap.set(id, { id, label: bp.businessPartnerFullName || `Customer ${id}`, meta: bp, type: 'customer' });
        });

        // 2. Orders
        const sos = readJsonFile(path.join(BASE_DIR, "sales_orders.jsonl"));
        sos.forEach(so => {
            const id = cleanId(so.salesOrder || so.sales_order_id);
            if (!id) return;
            nodeMap.set(id, { id, label: `Order ${id}`, meta: so, type: 'order' });
            const cId = cleanId(so.soldToParty || so.customer);
            if (cId && nodeMap.has(cId)) edges.push({ id: `e-c-${id}`, source: cId, target: id });
        });

        // 3. Deliveries
        const dels = readJsonlFolder(path.join(BASE_DIR, "outbound_delivery_items"));
        dels.forEach(d => {
            const id = cleanId(d.delivery_id || d.outboundDelivery || d.DeliveryDocument);
            if (!id) return;
            nodeMap.set(id, { id, label: `Delivery ${id}`, meta: d, type: 'delivery' });
            // Connecting to Order
            const soId = cleanId(d.sales_order_id || d.referenceSDDocument || d.ReferenceSDDocument);
            if (soId && nodeMap.has(soId)) edges.push({ id: `e-o-${id}`, source: soId, target: id });
        });

        // 4. Invoices
        const invs = readJsonlFolder(path.join(BASE_DIR, "billing_document_items"));
        invs.forEach(inv => {
            const id = cleanId(inv.invoice_id || inv.billingDocument || inv.BillingDocument);
            if (!id) return;
            nodeMap.set(id, { id, label: `Invoice ${id}`, meta: inv, type: 'invoice' });
            const delId = cleanId(inv.delivery_id || inv.referenceSDDocument || inv.ReferenceSDDocument);
            if (delId && nodeMap.has(delId)) edges.push({ id: `e-d-${id}`, source: delId, target: id });
        });

        // 5. Payments
        const payments = readJsonFile(path.join(BASE_DIR, "payments_accounts_receivable.jsonl"));
        payments.forEach(p => {
            const id = cleanId(p.payment_id || p.accountingDocument);
            if (!id) return;
            nodeMap.set(id, { id, label: `Payment ${id}`, meta: p, type: 'payment' });
            const cId = cleanId(p.customer);
            if (cId && nodeMap.has(cId)) edges.push({ id: `e-p-${id}`, source: cId, target: id });
        });

        // Terminal mein check karo: Edges 0 nahi honi chahiye
        console.log(`STATUS: Nodes: ${nodeMap.size}, Edges: ${edges.length}`);
        res.json({ nodes: Array.from(nodeMap.values()), edges });
    } catch (err) {
        res.status(500).json({ nodes: [], edges: [], error: err.message });
    }
};

module.exports = { getGraph };