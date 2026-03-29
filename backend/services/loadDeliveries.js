require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://postrgress:ITBLAlyFpAtjqSUiD6DatGOpqGwhTebj@dpg-d72e2724d50c738ngbq0-a.singapore-postgres.render.com/erp_db_z8kd",
  ssl: { rejectUnauthorized: false }
});

async function loadDeliveries() {
  console.log("🚀 Starting Delivery Load (Array Mode)...");
  const folderPath = path.join(__dirname, '../data/outbound_delivery_items');

  if (!fs.existsSync(folderPath)) {
    console.error("❌ Folder not found:", folderPath);
    return;
  }

  const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.json'));

  for (let file of files) {
    console.log(`⏳ Processing file: ${file}`);
    const filePath = path.join(folderPath, file);
    
    try {
      const rawData = fs.readFileSync(filePath, 'utf-8');
      const deliveryItems = JSON.parse(rawData); // Parse the whole array at once

      for (let data of deliveryItems) {
        try {
          await pool.query(
            `INSERT INTO deliveries (
              delivery_id, delivery_item, sales_order_id, actual_quantity, 
              quantity_unit, plant, storage_location, reference_item, batch
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (delivery_id, delivery_item) DO UPDATE SET
              plant = EXCLUDED.plant,
              storage_location = EXCLUDED.storage_location`,
            [
              data.deliveryDocument,
              data.deliveryDocumentItem,
              data.referenceSdDocument,
              parseFloat(data.actualDeliveryQuantity) || 0,
              data.deliveryQuantityUnit,
              data.plant,            // This will now capture "WB05" correctly
              data.storageLocation,   // This will now capture "5031" correctly
              data.referenceSdDocumentItem,
              data.batch
            ]
          );
        } catch (dbErr) {
          console.error(`❌ DB Error for Doc ${data.deliveryDocument}:`, dbErr.message);
        }
      }
    } catch (parseErr) {
      console.error(`❌ JSON Parse Error in file ${file}:`, parseErr.message);
    }
  }

  console.log("🎉 ALL DELIVERY DATA LOADED SUCCESSFULLY");
  await pool.end();
}

loadDeliveries();