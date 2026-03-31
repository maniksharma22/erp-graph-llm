const path = require('path');
const fs = require('fs');
const { Client } = require('pg');

async function loadJournalEntries() {
  const connectionString = "postgresql://postrgress:ITBLAlyFpAtjqSUiD6DatGOpqGwhTebj@dpg-d72e2724d50c738ngbq0-a.singapore-postgres.render.com/erp_db_z8kd";
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log("✅ Connected to Render Database for Journal Entries");

    // Path to journal entries folder
    const folderPath = path.join(__dirname, '../data/journal_entry_items_accounts_receivable'); 
    
    if (!fs.existsSync(folderPath)) {
      console.error("❌ Folder not found:", folderPath);
      return;
    }

    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.json') || f.endsWith('.jsonl'));

    for (let file of files) {
      console.log(`Processing: ${file}`);
      const content = fs.readFileSync(path.join(folderPath, file), 'utf-8');
      const lines = content.split('\n');

      for (let line of lines) {
        if (!line.trim()) continue;
        try {
          const data = JSON.parse(line);
          
          // Mapping according to your JSON structure
          await client.query(
            `INSERT INTO journal_entries (
              accounting_document, company_code, fiscal_year, gl_account, 
              reference_document, profit_center, transaction_currency, amount, 
              posting_date, document_date, accounting_document_type, customer_id, 
              clearing_date, clearing_accounting_document
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            ON CONFLICT (accounting_document) DO NOTHING`,
            [
              data.accountingDocument,
              data.companyCode,
              data.fiscalYear,
              data.glAccount,
              data.referenceDocument, 
              data.profitCenter,
              data.transactionCurrency,
              data.amountInTransactionCurrency,
              data.postingDate,
              data.documentDate,
              data.accountingDocumentType,
              data.customer,           
              data.clearingDate,
              data.clearingAccountingDocument
            ]
          );
        } catch (e) {
          // console.error("Skip bad line or JSON error");
        }
      }
    }
    console.log("🚀 JOURNAL ENTRIES LOADED SUCCESSFULLY");
  } catch (err) { 
    console.error("❌ Error:", err.message); 
  } finally { 
    await client.end(); 
  }
}

loadJournalEntries();