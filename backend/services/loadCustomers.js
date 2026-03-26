require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function loadCustomers() {
  const filePath = path.join(__dirname, '../data/business_partners.json');

  const lines = fs.readFileSync(filePath, 'utf-8').split('\n');

  for (let line of lines) {
    if (!line.trim()) continue;

    try {
      const data = JSON.parse(line);

      await pool.query(
        `INSERT INTO customers (customer_id, name)
         VALUES ($1, $2)
         ON CONFLICT (customer_id) DO NOTHING`,
        [
          data.businessPartner,
          data.businessPartnerName
        ]
      );

    } catch (err) {
      console.log("Error:", err.message);
    }
  }

  console.log("✅ Customers inserted");
  await pool.end();
}

loadCustomers();