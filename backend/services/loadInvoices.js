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

async function loadInvoices() {
  const folderPath = path.join(__dirname, '../data/billing_document_items');

  const files = fs.readdirSync(folderPath);

  for (let file of files) {
    const filePath = path.join(folderPath, file);
    const lines = fs.readFileSync(filePath, 'utf-8').split('\n');

    for (let line of lines) {
      if (!line.trim()) continue;

      try {
        const data = JSON.parse(line);

        await pool.query(
          `INSERT INTO invoices (invoice_id, delivery_id, amount)
           VALUES ($1, $2, $3)
           ON CONFLICT (invoice_id) DO NOTHING`,
          [
            data.billingDocument,
            data.referenceSdDocument,
            parseFloat(data.netAmount)
          ]
        );

      } catch (err) {
        console.log("Error:", err.message);
      }
    }
  }

  console.log("✅ Invoices inserted");
  await pool.end();
}

loadInvoices();