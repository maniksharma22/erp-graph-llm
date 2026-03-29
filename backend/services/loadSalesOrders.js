require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://postrgress:ITBLAlyFpAtjqSUiD6DatGOpqGwhTebj@dpg-d72e2724d50c738ngbq0-a.singapore-postgres.render.com/erp_db_z8kd",
  ssl: { rejectUnauthorized: false }
});

async function loadSalesOrders() {
  console.log("🚀 Starting Sales Order Load...");
  const filePath = path.join(__dirname, '../data/sales_orders.json');

  if (!fs.existsSync(filePath)) {
    console.error("❌ File not found at:", filePath);
    return;
  }

  try {
    const rawData = fs.readFileSync(filePath, 'utf-8');
    const ordersArray = JSON.parse(rawData);
    console.log(`✅ Loaded ${ordersArray.length} Sales Orders. Processing...`);

    for (let data of ordersArray) {
      try {
        await pool.query(
          `INSERT INTO sales_orders (
            sales_order_id, customer_id, amount, created_at,
            sales_order_type, sales_org, created_by_user, currency,
            delivery_status, billing_status, billing_block, delivery_block,
            incoterms, incoterms_location
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          ON CONFLICT (sales_order_id) DO UPDATE SET
            delivery_status = EXCLUDED.delivery_status,
            amount = EXCLUDED.amount`,
          [
            data.salesOrder,
            data.soldToParty,
            parseFloat(data.totalNetAmount) || 0,
            data.creationDate,
            data.salesOrderType,
            data.salesOrganization,
            data.createdByUser,
            data.transactionCurrency,
            data.overallDeliveryStatus,
            data.overallOrdReltdBillgStatus,
            data.headerBillingBlockReason,
            data.deliveryBlockReason,
            data.incotermsClassification,
            data.incotermsLocation1
          ]
        );
      } catch (dbErr) {
        console.error(`❌ DB Error for Order ${data.salesOrder}:`, dbErr.message);
      }
    }
    console.log("🎉 ALL SALES ORDERS LOADED SUCCESSFULLY");
  } catch (err) {
    console.error("❌ File/Parse Error:", err.message);
  } finally {
    await pool.end();
  }
}

loadSalesOrders();