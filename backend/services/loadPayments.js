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

async function loadPayments() {
  const filePath = path.join(__dirname, '../data/payments_accounts_receivable.jsonl');

  const lines = fs.readFileSync(filePath, 'utf-8').split('\n');

  for (let line of lines) {
    if (!line.trim()) continue;

    try {
      const data = JSON.parse(line);

      await pool.query(
        `INSERT INTO payments (payment_id, customer_id, amount)
         VALUES ($1, $2, $3)
         ON CONFLICT (payment_id) DO NOTHING`,
        [
          data.accountingDocument,
          data.customer,
          parseFloat(data.amountInTransactionCurrency)
        ]
      );

    } catch (err) {
      console.log("Error:", err.message);
    }
  }

  console.log("✅ Payments inserted");
  await pool.end();
}

loadPayments();