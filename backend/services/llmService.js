const { Groq } = require("groq-sdk");
const pool = require("../config/db");
require("dotenv").config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const llmService = {
  async runNaturalQuery(userPrompt) {
    try {
      const lowerPrompt = userPrompt.toLowerCase().trim();

      if (["hi", "hello", "hey"].includes(lowerPrompt)) {
        return { success: true, answer: "Hello! I am **Dodge AI**, your ERP Analyst. How can I assist with your data today?", nodeIds: [] };
      }

      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are Dodge AI, an ERP Analyst. 
            TABLES: 
            - customers (customer_id, name)
            - sales_orders (sales_order_id, customer_id, amount, status)
            
            RULES:
            1. Return ONLY raw PostgreSQL SQL.
            2. If user asks for 'high orders', join customers and sales_orders, group by customer, and order by count DESC.
            3. Use LIMIT 5 unless specified.
            4. If unrelated, return 'INVALID'.`
          },
          { role: "user", content: userPrompt },
        ],
        model: "llama-3.3-70b-versatile",
      });

      let sqlQuery = chatCompletion.choices[0].message.content.replace(/```sql|```|`/g, "").trim().split(';')[0];
      if (sqlQuery.includes("INVALID")) {
        return { success: true, answer: "I can only analyze ERP data like customers, orders, and payments.", nodeIds: [] };
      }

      const result = await pool.query(sqlQuery);
      const nodeIds = [];

      if (result.rows.length === 0) {
        return { success: true, answer: "I couldn't find any records matching that criteria.", nodeIds: [] };
      }

      // --- UNIVERSAL HUMAN READABLE FORMATTING ---
      const formattedRows = result.rows.map((row, index) => {
        // Collect any ID present in the row for the Graph
        Object.values(row).forEach(val => { if (val && !isNaN(val)) nodeIds.push(String(val)); });

        let details = [];
        
        // Agar row mein specific IDs hain toh unhe prioritize karo
        if (row.customer_id) details.push(`Customer ID: **${row.customer_id}**`);
        if (row.name) details.push(`Name: **${row.name}**`);
        if (row.sales_order_id) details.push(`Order: **#${row.sales_order_id}**`);
        if (row.status) details.push(`Status: **${row.status}**`);
        if (row.amount) details.push(`Value: **$${row.amount}**`);
        
        // Catch-all for calculated columns like 'count' or 'sum'
        Object.keys(row).forEach(key => {
          if (!['customer_id', 'name', 'sales_order_id', 'status', 'amount'].includes(key)) {
            const cleanKey = key.replace(/_/g, ' ');
            details.push(`${cleanKey.charAt(0).toUpperCase() + cleanKey.slice(1)}: **${row[key]}**`);
          }
        });

        return `${index + 1}) ${details.join("\n")}`;
      });

      // Natural Intro
      let intro = "The records found are:";
      if (lowerPrompt.includes("high") || lowerPrompt.includes("top")) intro = "The top results based on your query are:";
      if (lowerPrompt.includes("customer")) intro = "The customers found are:";

      const finalAnswer = `${intro}\n\n${formattedRows.join("\n\n")}`;

      return { 
        success: true, 
        answer: finalAnswer, 
        nodeIds: [...new Set(nodeIds)] 
      };

    } catch (error) {
      console.error("LLM Error:", error);
      return { success: false, answer: "I'm sorry, I encountered an issue while retrieving that data." };
    }
  }
};

module.exports = llmService;