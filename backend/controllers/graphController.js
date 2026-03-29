const fs = require('fs');
const path = require('path');

const readData = (p) => {
  try {
    if (!fs.existsSync(p)) return [];
    const s = fs.statSync(p);
    let c = [];
    if (s.isDirectory()) {
      fs.readdirSync(p).forEach(f => {
        try {
          const cnt = fs.readFileSync(path.join(p, f), 'utf8').trim();
          if (cnt) c = [...c, ...(f.endsWith('.jsonl') ? cnt.split('\n').map(l => JSON.parse(l)) : (Array.isArray(JSON.parse(cnt)) ? JSON.parse(cnt) : [JSON.parse(cnt)]))];
        } catch (e) { }
      });
    } else {
      const cnt = fs.readFileSync(p, 'utf8').trim();
      c = p.endsWith('.jsonl') ? cnt.split('\n').filter(l => l.trim()).map(l => JSON.parse(l)) : (Array.isArray(JSON.parse(cnt)) ? JSON.parse(cnt) : [JSON.parse(cnt)]);
    }
    return c;
  } catch (e) { return []; }
};

const getGraphData = async (req, res) => {
  try {
    const d = path.join(__dirname, '../data');
    const r = {
      orders: readData(path.join(d, 'sales_orders.json')),
      payments: readData(path.join(d, 'payments_accounts_receivable.json')),
      partners: readData(path.join(d, 'business_partners.json')),
      orderItems: readData(path.join(d, 'sales_order_items')),
      addresses: readData(path.join(d, 'business_partner_addresses')),
      plants: readData(path.join(d, 'plants')),
      storageLocs: readData(path.join(d, 'product_storage_locations')),
      products: readData(path.join(d, 'products')),
      descriptions: readData(path.join(d, 'product_descriptions')),
      deliveries: readData(path.join(d, 'outbound_delivery_items')),
      billings: readData(path.join(d, 'billing_document_items'))
    };

    // Mapping relations
    r.orders = r.orders.map(o => ({ ...o, salesOrder: String(o.salesOrder), soldToParty: String(o.soldToParty) }));

    r.orderItems = r.orderItems.map(i => ({ ...i, salesOrder: String(i.salesOrder), product: String(i.material), plant: String(i.productionPlant) }));

    r.deliveries = r.deliveries.map(dl => ({ ...dl, salesOrder: String(dl.referenceSdDocument), outboundDelivery: String(dl.deliveryDocument) }));

    r.billings = r.billings.map(b => ({ ...b, outboundDelivery: String(b.referenceSdDocument), billingDocument: String(b.billingDocument) }));

    r.payments = r.payments.map(p => ({ ...p, customer: String(p.customer), accountingDocument: String(p.accountingDocument), salesOrder: String(p.salesDocument || "") }));

    r.partners = r.partners.map(p => ({ ...p, businessPartner: String(p.businessPartner), customer: String(p.customer) }));

    r.addresses = r.addresses.map(a => ({ ...a, businessPartner: String(a.businessPartner), addressId: String(a.addressId) }));

    r.plants = r.plants.map(pl => ({ ...pl, plant: String(pl.plant), addressId: String(pl.addressId) }));

    r.products = r.products.map(p => ({ ...p, product: String(p.product), productGroup: String(p.productGroup) }));

    r.descriptions = r.descriptions.map(d => ({ ...d, product: String(d.product), productDescription: d.productDescription }));

    r.storageLocs = r.storageLocs.map(s => ({ ...s, plant: String(s.plant), storageLocation: String(s.storageLocation), product: String(s.product) }));

    res.json(r);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

module.exports = { getGraphData };