// llm.js
const pool = require("../config/db");
const Groq = require("groq-sdk");
require("dotenv").config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const runNaturalQuery = async (userQuery) => {
  try {
    // Send query to LLM
    const response = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are Dodge AI, an ERP Analyst.
RULES:
1. Always respond in **clean, human-readable single sentences**.
2. Handle any ERP-related query including typos like 'custmer', 'ordrs', 'invoices'.
3. Only return raw SQL for ERP queries using tables: 
   - customers(customer_id, name, status)
   - sales_orders(sales_order_id, customer_id, amount, status)
   - deliveries(delivery_id, sales_order_id, status)
   - invoices(invoice_id, delivery_id, amount, status)
4. For counts or totals, always use: SELECT COUNT(*) as total_count FROM table_name.
5. Always return meaningful values; do not return 'N/A'.`
        },
        { role: "user", content: userQuery }
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0,
    });

    const aiOutput = response.choices[0].message.content.trim();

    // If LLM returned a human-readable answer, send it as is
    if (!aiOutput.toUpperCase().startsWith("SELECT")) {
      return { answer: aiOutput, nodeIds: [] };
    }

    // Clean SQL and run query
    const cleanSql = aiOutput.replace(/```sql|```|;/gi, "").trim();
    const { rows } = await pool.query(cleanSql);

    if (!rows || rows.length === 0) {
      return { answer: "I couldn't find any matching records in the ERP database.", nodeIds: [] };
    }

    const d = rows[0];

    // ✅ Handle COUNT queries
    if (d.total_count !== undefined) {
      return {
        answer: `There are **${d.total_count}** records matching your request.`,
        nodeIds: []
      };
    }

    // Map node IDs for graph highlighting
    const allNodeIds = new Set();
    rows.slice(0, 10).forEach(r => {
      if (r.customer_id) allNodeIds.add(`cust-${r.customer_id}`);
      if (r.sales_order_id) allNodeIds.add(`order-${r.sales_order_id}`);
      if (r.delivery_id) allNodeIds.add(`del-${r.delivery_id}`);
      if (r.invoice_id) allNodeIds.add(`bill-${r.invoice_id}`);
    });

    // Determine entity type
    const safeId = d.invoice_id || d.sales_order_id || d.delivery_id || d.customer_id || "";
    const entityType = d.invoice_id ? "Invoice" 
                        : d.sales_order_id ? "Order" 
                        : d.delivery_id ? "Delivery"
                        : d.customer_id ? "Customer" 
                        : "Record";

    const statusVal = d.status || "";
    const amountVal = (d.sales_order_id || d.invoice_id) && d.amount != null 
                      ? `$${Number(d.amount).toLocaleString()}` 
                      : "";
    const nameVal = d.name ? ` for **${d.name}**` : "";

    // Build final answer cleanly
    let answer = `I found **${entityType} #${safeId}**${nameVal}`;
    if (entityType === "Order" || entityType === "Invoice") {
      answer += `. Status: **${statusVal}**, Value: **${amountVal}**.`;
    } else if (entityType === "Delivery") {
      answer += `. Status: **${statusVal}**.`;
    } else {
      answer += `.`; // Customers or others
    }

    return { answer, nodeIds: Array.from(allNodeIds) };

  } catch (error) {
    console.error("Dodge AI Error:", error.message);
    return { answer: "Technical error while fetching ERP data.", nodeIds: [] };
  }
};

module.exports = { runNaturalQuery };