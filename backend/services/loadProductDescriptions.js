const path = require('path');
const fs = require('fs');
const { Client } = require('pg');

async function loadProductDescriptions() {
  const connectionString = "postgresql://postrgress:ITBLAlyFpAtjqSUiD6DatGOpqGwhTebj@dpg-d72e2724d50c738ngbq0-a.singapore-postgres.render.com/erp_db_z8kd";
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log("✅ Connected to Render Database");

    const folderPath = path.join(__dirname, '../data/product_descriptions'); 
    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.json') || f.endsWith('.jsonl'));

    for (let file of files) {
      console.log(`Processing: ${file}`);
      const content = fs.readFileSync(path.join(folderPath, file), 'utf-8');
      const lines = content.split('\n');

      for (let line of lines) {
        if (!line.trim()) continue;
        try {
          const data = JSON.parse(line);
          
          // Updated ON CONFLICT to use the composite unique key
          await client.query(
            `INSERT INTO product_descriptions (
              product, language, productDescription
            ) VALUES ($1, $2, $3)
            ON CONFLICT (product, language) DO NOTHING`,
            [
              data.product, 
              data.language, 
              data.productDescription
            ]
          );
        } catch (e) {
          // console.error("Skip bad line");
        }
      }
    }
    console.log("🚀 PRODUCT DESCRIPTIONS LOADED SUCCESSFULLY");
  } catch (err) { 
    console.error("❌ Error:", err.message); 
  } finally { 
    await client.end(); 
  }
}

loadProductDescriptions();