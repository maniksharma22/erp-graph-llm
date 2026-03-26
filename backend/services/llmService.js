const pool = require("../config/db");
const Groq = require("groq-sdk");
require("dotenv").config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const runNaturalQuery = async (userQuery) => {
  try {
    const response = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are **Dodge AI**, an ERP Analyst. 
          
          RULES:
          1. Greetings (Hi/Hello): "I'm **Dodge AI**, an ERP Analyst. I can assist you with ERP-related queries. Help options: Get customer info, Retrieve sales orders, View deliveries, Generate invoices."
          2. Unrelated/Short: "Questions must be related to ERP (Customers, Orders, Invoices). What ERP query would you like to run?"
          3. ERP Query: Return ONLY RAW SQL. Use '*' or specific columns: customer_id, sales_order_id, delivery_id, invoice_id, amount, status.
          
          TABLES: customers, sales_orders, deliveries, invoices.`
        },
        { role: "user", content: userQuery }
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0,
    });

    const aiOutput = response.choices[0].message.content.trim();

    // 1. GREETING/GUARDRAIL (Keep your existing format)
    if (!aiOutput.toUpperCase().includes("SELECT")) {
      return { answer: aiOutput, nodeIds: [] };
    }

    // 2. SQL EXECUTION
    const cleanSql = aiOutput.replace(/```sql|```|;/gi, "").trim();
    console.log("Dodge AI executing SQL:", cleanSql); // Debugging line
    
    const { rows } = await pool.query(cleanSql);

    if (rows.length === 0) {
      return { answer: "I couldn't find any matching records in the ERP database.", nodeIds: [] };
    }

    // 3. ID COLLECTION FOR HIGHLIGHTING
    const allNodeIds = new Set();
    rows.forEach(r => {
      if (r.customer_id) allNodeIds.add(`customer-${r.customer_id}`);
      if (r.sales_order_id) allNodeIds.add(`order-${r.sales_order_id}`);
      if (r.delivery_id) allNodeIds.add(`delivery-${r.delivery_id}`);
      if (r.invoice_id) allNodeIds.add(`invoice-${r.invoice_id}`);
    });

    // 4. CLEAN HUMAN READABLE FORMAT
    const d = rows[0];
    const safeId = d.invoice_id || d.sales_order_id || d.delivery_id || d.customer_id || "N/A";
    const entityType = d.invoice_id ? "Invoice" : (d.sales_order_id ? "Order" : (d.customer_id ? "Customer" : "Record"));
    
    // Formatting values safely
    const statusVal = d.status || "Processed";
    const amountVal = d.amount ? `$${d.amount}` : "N/A";
    const nameVal = d.name ? ` for **${d.name}**` : "";

    const cleanAnswer = `I found **${entityType} #${safeId}**${nameVal}. It is currently **${statusVal}** with a value of **${amountVal}**. (System Ref: ${safeId})`;

    return { 
      answer: cleanAnswer, 
      nodeIds: Array.from(allNodeIds) 
    };

  } catch (error) {
    console.error("DATABASE OR LLM ERROR:", error.message); // This will show you the real issue in terminal
    return { answer: "I encountered a technical issue while fetching the data. Please try a simpler query like 'list orders'.", nodeIds: [] };
  }
};

module.exports = { runNaturalQuery };