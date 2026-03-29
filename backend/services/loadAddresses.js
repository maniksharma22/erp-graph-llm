const path = require('path');
const fs = require('fs');
const { Client } = require('pg');

async function loadAddresses() {
  const connectionString = "postgresql://postrgress:ITBLAlyFpAtjqSUiD6DatGOpqGwhTebj@dpg-d72e2724d50c738ngbq0-a.singapore-postgres.render.com/erp_db_z8kd";
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log("✅ Connected to Render Database");

    const folderPath = path.join(__dirname, '../data/business_partner_addresses'); 
    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.jsonl') || f.endsWith('.json'));

    for (let file of files) {
      console.log(`Processing: ${file}`);
      const lines = fs.readFileSync(path.join(folderPath, file), 'utf-8').split('\n');

      for (let line of lines) {
        if (!line.trim()) continue;
        const data = JSON.parse(line);
        try {
          await client.query(
            `INSERT INTO addresses (
              addressID, businessPartner, cityName, postalCode, streetName, 
              country, region, addressUuid, addressTimeZone, 
              validityStartDate, validityEndDate, poBox, transportZone, taxJurisdiction
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            ON CONFLICT (addressID) DO NOTHING`,
            [
              data.addressId, 
              data.businessPartner, 
              data.cityName, 
              data.postalCode, 
              data.streetName,
              data.country, 
              data.region,
              data.addressUuid,
              data.addressTimeZone,
              data.validityStartDate,
              data.validityEndDate,
              data.poBox,
              data.transportZone,
              data.taxJurisdiction
            ]
          );
        } catch (e) {
          console.error(`❌ Row Error (Address ${data.addressId}):`, e.message);
        }
      }
    }
    console.log("🚀 ALL ADDRESS DATA LOADED SUCCESSFULLY");
  } catch (err) { 
    console.error("Fatal Error:", err.message); 
  } finally { 
    await client.end(); 
  }
}
loadAddresses();