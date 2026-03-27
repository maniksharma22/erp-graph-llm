const fs = require("fs");
const path = require("path");

// folder where your .jsonl files are
const basePath = "./backend/data";

//  list all files 
const files = [
  "sales_orders.jsonl",
  "business_partners.jsonl",
  "payments_accounts_receivable.jsonl",
  "outbound_delivery_items/part-20251119-133431-439.jsonl",
  "outbound_delivery_items/part-20251119-133431-626.jsonl",
  "billing_document_items/part-20251119-133432-233.jsonl",
  "billing_document_items/part-20251119-133432-978.jsonl"
];

files.forEach((file) => {
  try {
    const inputPath = path.join(basePath, file);
    const outputPath = inputPath.replace(".jsonl", ".json");

    const data = fs.readFileSync(inputPath, "utf-8");

    const json = data
      .split("\n")
      .map(line => line.trim())
      .filter(line => line !== "") 
      .map((line, i) => {
        try {
          return JSON.parse(line);
        } catch (err) {
          console.log(`⚠️ Skipping bad line ${i + 1} in ${file}`);
          return null;
        }
      })
      .filter(Boolean); 

    fs.writeFileSync(outputPath, JSON.stringify(json, null, 2));

    console.log(`✅ Converted: ${file}`);
  } catch (err) {
    console.log(`❌ Error in ${file}`, err.message);
  }
});