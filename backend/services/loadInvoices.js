require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://postrgress:ITBLAlyFpAtjqSUiD6DatGOpqGwhTebj@dpg-d72e2724d50c738ngbq0-a.singapore-postgres.render.com/erp_db_z8kd",
  ssl: { rejectUnauthorized: false }
});

async function loadInvoices() {
  console.log("🚀 Starting Invoice Load...");
  const folderPath = path.join(__dirname, '../data/billing_document_items');

  if (!fs.existsSync(folderPath)) {
    console.error("❌ Folder not found:", folderPath);
    return;
  }

  // Get all JSON files in the folder
  const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.json'));

  for (let file of files) {
    console.log(`⏳ Reading file: ${file}`);
    const filePath = path.join(folderPath, file);
    
    try {
      // 1. Read the whole file and parse as a single Array
      const rawData = fs.readFileSync(filePath, 'utf-8');
      const invoiceItems = JSON.parse(rawData); 
      
      console.log(`✅ Found ${invoiceItems.length} items in ${file}. Inserting...`);

      for (let data of invoiceItems) {
        try {
          await pool.query(
            `INSERT INTO invoices (
              invoice_id, billing_item, delivery_id, amount, 
              material, quantity, quantity_unit, currency, reference_item
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (invoice_id, billing_item) DO NOTHING`,
            [
              data.billingDocument,
              data.billingDocumentItem,
              data.referenceSdDocument,
              parseFloat(data.netAmount) || 0,
              data.material,
              parseFloat(data.billingQuantity) || 0,
              data.billingQuantityUnit,
              data.transactionCurrency,
              data.referenceSdDocumentItem
            ]
          );
        } catch (dbErr) {
          console.error(`❌ DB Error for ${data.billingDocument}:`, dbErr.message);
        }
      }
    } catch (parseErr) {
      console.error(`❌ JSON Parse Error in file ${file}:`, parseErr.message);
    }
  }

  console.log("🎉 ALL INVOICE DATA LOADED SUCCESSFULLY");
  await pool.end();
}

loadInvoices();