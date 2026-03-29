const path = require('path');
const fs = require('fs');
const { Client } = require('pg');

async function loadProducts() {
  const connectionString = "postgresql://postrgress:ITBLAlyFpAtjqSUiD6DatGOpqGwhTebj@dpg-d72e2724d50c738ngbq0-a.singapore-postgres.render.com/erp_db_z8kd";
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log("✅ Connected to Render Database");

    const folderPath = path.join(__dirname, '../data/products'); 
    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.json') || f.endsWith('.jsonl'));

    for (let file of files) {
      console.log(`Processing: ${file}`);
      const content = fs.readFileSync(path.join(folderPath, file), 'utf-8');
      const lines = content.split('\n');

      for (let line of lines) {
        if (!line.trim()) continue;
        try {
          const data = JSON.parse(line);
          await client.query(
            `INSERT INTO products (
              product, productType, crossPlantStatus, crossPlantStatusValidityDate,
              creationDate, createdByUser, lastChangeDate, lastChangeDateTime,
              isMarkedForDeletion, productOldId, grossWeight, weightUnit,
              netWeight, productGroup, baseUnit, division, industrySector
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            ON CONFLICT (product) DO UPDATE SET
              lastChangeDateTime = EXCLUDED.lastChangeDateTime,
              isMarkedForDeletion = EXCLUDED.isMarkedForDeletion`,
            [
              data.product, 
              data.productType, 
              data.crossPlantStatus,
              data.crossPlantStatusValidityDate,
              data.creationDate,
              data.createdByUser,
              data.lastChangeDate,
              data.lastChangeDateTime,
              data.isMarkedForDeletion,
              data.productOldId,
              parseFloat(data.grossWeight) || 0,
              data.weightUnit,
              parseFloat(data.netWeight) || 0,
              data.productGroup,
              data.baseUnit,
              data.division,
              data.industrySector
            ]
          );
        } catch (e) {
          console.error(`❌ Error on product ${line.slice(0, 30)}... : ${e.message}`);
        }
      }
    }
    console.log("🚀 ALL PRODUCT DATA LOADED SUCCESSFULLY");
  } catch (err) { 
    console.error("Fatal Error:", err.message); 
  } finally { 
    await client.end(); 
  }
}

loadProducts();