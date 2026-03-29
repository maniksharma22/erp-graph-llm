require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://postrgress:ITBLAlyFpAtjqSUiD6DatGOpqGwhTebj@dpg-d72e2724d50c738ngbq0-a.singapore-postgres.render.com/erp_db_z8kd",
  ssl: { rejectUnauthorized: false }
});

async function loadPlants() {
  console.log("🚀 Starting Plant Master Data Load...");
  const folderPath = path.join(__dirname, '../data/plants');

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
          `INSERT INTO plants (plant_id, plant_name, sales_org, factory_calendar, address_id)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (plant_id) DO UPDATE SET 
            plant_name = EXCLUDED.plant_name`,
          [
            data.plant,
            data.plantName,
            data.salesOrganization,
            data.factoryCalendar,
            data.addressId
          ]
        );
      } catch (err) {
        console.error("❌ Row Error:", err.message);
      }
    }
  }

  console.log("✅ ALL PLANTS LOADED SUCCESSFULLY");
  await pool.end();
}

loadPlants();