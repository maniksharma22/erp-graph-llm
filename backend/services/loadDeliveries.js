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

async function loadDeliveries() {
  const folderPath = path.join(__dirname, '../data/outbound_delivery_items');

  const files = fs.readdirSync(folderPath);

  for (let file of files) {
    const filePath = path.join(folderPath, file);
    const lines = fs.readFileSync(filePath, 'utf-8').split('\n');

    for (let line of lines) {
      if (!line.trim()) continue;

      try {
        const data = JSON.parse(line);

        await pool.query(
          `INSERT INTO deliveries (delivery_id, sales_order_id)
           VALUES ($1, $2)
           ON CONFLICT (delivery_id) DO NOTHING`,
          [
            data.deliveryDocument,
            data.referenceSdDocument
          ]
        );

      } catch (err) {
        console.log("Error:", err.message);
      }
    }
  }

  console.log("✅ Deliveries inserted");
  await pool.end();
}

loadDeliveries();