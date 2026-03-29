require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://postrgress:ITBLAlyFpAtjqSUiD6DatGOpqGwhTebj@dpg-d72e2724d50c738ngbq0-a.singapore-postgres.render.com/erp_db_z8kd",
  ssl: { rejectUnauthorized: false }
});

async function loadPayments() {
  console.log("🚀 Starting Payments Load...");
  const filePath = path.join(__dirname, '../data/payments_accounts_receivable.json');

  if (!fs.existsSync(filePath)) {
    console.error("❌ File not found:", filePath);
    return;
  }

  try {
    const rawData = fs.readFileSync(filePath, 'utf-8');
    const paymentsArray = JSON.parse(rawData);
    console.log(`✅ Loaded ${paymentsArray.length} payment records. processing...`);

    for (let data of paymentsArray) {
      try {
        await pool.query(
          `INSERT INTO payments (
            payment_id, payment_item, customer_id, amount, 
            clearing_date, currency, company_code, fiscal_year, gl_account
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (payment_id, payment_item) DO NOTHING`,
          [
            data.accountingDocument,
            data.accountingDocumentItem,
            data.customer,
            parseFloat(data.amountInTransactionCurrency) || 0,
            data.clearingDate,
            data.transactionCurrency,
            data.companyCode,
            data.fiscalYear,
            data.glAccount
          ]
        );
      } catch (dbErr) {
        console.error(`❌ DB Error for Doc ${data.accountingDocument}:`, dbErr.message);
      }
    }
    console.log("🎉 ALL PAYMENTS LOADED SUCCESSFULLY");
  } catch (err) {
    console.error("❌ File Error:", err.message);
  } finally {
    await pool.end();
  }
}

loadPayments();