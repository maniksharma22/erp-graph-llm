require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://postrgress:ITBLAlyFpAtjqSUiD6DatGOpqGwhTebj@dpg-d72e2724d50c738ngbq0-a.singapore-postgres.render.com/erp_db_z8kd",
  ssl: { rejectUnauthorized: false }
});

async function loadStorageLocations() {
  console.log("🚀 Starting Storage Location Load...");
  const folderPath = path.join(__dirname, '../data/product_storage_locations');

  if (!fs.existsSync(folderPath)) {
    console.error("❌ Folder not found:", folderPath);
    return;
  }

  const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.json') || f.endsWith('.jsonl'));

  for (let file of files) {
    console.log(`Processing: ${file}`);
    const filePath = path.join(folderPath, file);
    const lines = fs.readFileSync(filePath, 'utf-8').split('\n');

    for (let line of lines) {
      if (!line.trim()) continue;

      try {
        const data = JSON.parse(line);

        await pool.query(
          `INSERT INTO product_storage_locations (
            product_id, plant_id, location_id, inventory_block_ind
          ) VALUES ($1, $2, $3, $4)
          ON CONFLICT (product_id, plant_id, location_id) DO NOTHING`,
          [
            data.product,
            data.plant,
            data.storageLocation,
            data.physicalInventoryBlockInd
          ]
        );
      } catch (err) {
        // Silently skip corrupted lines
      }
    }
  }

  console.log("✅ STORAGE LOCATIONS LOADED SUCCESSFULLY");
  await pool.end();
}

loadStorageLocations();