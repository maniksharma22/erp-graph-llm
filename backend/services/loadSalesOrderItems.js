const path = require('path');
const fs = require('fs');
const { Client } = require('pg');

async function loadItems() {
  const connectionString = "postgresql://postrgress:ITBLAlyFpAtjqSUiD6DatGOpqGwhTebj@dpg-d72e2724d50c738ngbq0-a.singapore-postgres.render.com/erp_db_z8kd";
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log("✅ Connected to Render Database");

    const folderPath = path.join(__dirname, '../data/sales_order_items'); 
    if (!fs.existsSync(folderPath)) {
      console.error("❌ Folder not found:", folderPath);
      return;
    }

    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.json') || f.endsWith('.jsonl'));

    for (let file of files) {
      console.log(`Processing: ${file}`);
      const lines = fs.readFileSync(path.join(folderPath, file), 'utf-8').split('\n');

      for (let line of lines) {
        if (!line.trim()) continue;
        try {
          const data = JSON.parse(line);
          await client.query(
            `INSERT INTO sales_order_items (
              salesOrder, salesOrderItem, salesOrderItemCategory, material, 
              requestedQuantity, requestedQuantityUnit, transactionCurrency, 
              netAmount, materialGroup, productionPlant, storageLocation, 
              salesDocumentRjcnReason, itembillingblockreason
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            ON CONFLICT (salesOrder, salesOrderItem) DO NOTHING`,
            [
              data.salesOrder, 
              data.salesOrderItem, 
              data.salesOrderItemCategory, 
              data.material,
              parseFloat(data.requestedQuantity) || 0, 
              data.requestedQuantityUnit, 
              data.transactionCurrency,
              parseFloat(data.netAmount) || 0, 
              data.materialGroup, 
              data.productionPlant, 
              data.storageLocation,
              data.salesDocumentRjcnReason, 
              data.itemBillingBlockReason // Matches your JSON key
            ]
          );
        } catch (e) {
          // Silent skip for individual bad rows
        }
      }
    }
    console.log("🚀 SALES ORDER ITEMS LOADED SUCCESSFULLY");
  } catch (err) { 
    console.error("❌ Fatal Error:", err.message); 
  } finally { 
    await client.end(); 
  }
}

loadItems();