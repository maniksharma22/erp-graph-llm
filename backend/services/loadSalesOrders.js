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

async function loadData() {
  const filePath = path.join(__dirname, '../data/sales_orders.json');

  const lines = fs.readFileSync(filePath, 'utf-8').split('\n');

  for (let line of lines) {
    if (!line.trim()) continue;

    try {
      const data = JSON.parse(line);

      await pool.query(
        `INSERT INTO sales_orders (sales_order_id, customer_id, amount, created_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (sales_order_id) DO NOTHING`,
        [
          data.salesOrder,
          data.soldToParty,
          parseFloat(data.totalNetAmount),
          data.creationDate
        ]
      );

    } catch (err) {
      console.log("Error parsing line:", err.message);
    }
  }

  console.log("✅ All data inserted");
  await pool.end();
}

loadData();