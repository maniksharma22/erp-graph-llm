require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://postrgress:ITBLAlyFpAtjqSUiD6DatGOpqGwhTebj@dpg-d72e2724d50c738ngbq0-a.singapore-postgres.render.com/erp_db_z8kd",
  ssl: { rejectUnauthorized: false }
});

async function loadCustomers() {
  console.log("🚀 Script started...");
  const filePath = path.join(__dirname, '../data/business_partners.json');
  
  if (!fs.existsSync(filePath)) {
    console.error("❌ ERROR: File not found at:", filePath);
    return;
  }

  try {
    console.log("⏳ Reading file...");
    const rawData = fs.readFileSync(filePath, 'utf-8');
    
    console.log("⏳ Parsing JSON...");
    const customersArray = JSON.parse(rawData); 
    console.log(`✅ Found ${customersArray.length} customers in JSON.`);

    console.log("⏳ Connecting to Database...");
    await pool.connect();
    console.log("✅ Database Connected.");

    for (let data of customersArray) {
      await pool.query(
        `INSERT INTO customers (
          customer_id, name, customer, businessPartnerCategory, 
          businessPartnerFullName, businessPartnerGrouping, correspondenceLanguage, 
          createdByUser, creationDate, industry, lastChangeDate, 
          businessPartnerIsBlocked, isMarkedForArchiving
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (customer_id) DO UPDATE SET
          lastChangeDate = EXCLUDED.lastChangeDate,
          businessPartnerIsBlocked = EXCLUDED.businessPartnerIsBlocked`,
        [
          data.businessPartner,
          data.businessPartnerName,
          data.customer,
          data.businessPartnerCategory,
          data.businessPartnerFullName,
          data.businessPartnerGrouping,
          data.correspondenceLanguage,
          data.createdByUser,
          data.creationDate,
          data.industry,
          data.lastChangeDate,
          data.businessPartnerIsBlocked || false,
          data.isMarkedForArchiving || false
        ]
      );
    }

    console.log("🎉 SUCCESS: All customers loaded!");
  } catch (err) {
    console.error("❌ CRITICAL ERROR:", err.message);
  } finally {
    await pool.end();
    console.log("🔌 Database connection closed.");
  }
}

loadCustomers();