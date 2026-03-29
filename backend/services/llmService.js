const { Groq } = require("groq-sdk");
const pool = require("../config/db");
require("dotenv").config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SCHEMA_CONTEXT = `
You are an ERP Assistant. Follow these STRICT rules for SQL generation:

// --- GENERAL RULES ---
1. Use table aliases for all joins.
2. All IDs are TEXT. Use single quotes.
3. Ignore columns that do not exist; do not fail.
4. Aggregations: SUM, COUNT, MAX, MIN. Avoid DB-specific functions like group_concat.
5. Pending deliveries: requestedquantity - sum(actual_quantity).
6. Outstanding balance: sum(invoice.amount) - sum(payments.amount).
7. Handle date ranges properly (e.g., April 2025 = '2025-04-01' to '2025-04-30').
8. Always return human-readable summaries if SQL is executed.
9. For greetings or non-ERP questions, respond professionally without SQL.
10.Return ONLY the raw SQL query. No explanation, no backticks.
11.If you use SUM() or COUNT(), you MUST use GROUP BY for all other columns. If the user asks for a single order's details (like ID 740506), do NOT use SUM() or GROUP BY unless specifically asked for a total.

12. DATA TYPES: All IDs (sales_order_id, customer_id, product, plant_id, location_id, invoice_id, payment_id, address_id) are TEXT.
13. COLUMN CHECK: Only use verified columns. If missing, ignore or use alternatives.
14. COLUMN NAMES:
   - sales_orders (s): sales_order_id, customer_id, amount, created_at, created_by_user, status, delivery_status, sales_org, sales_order_type, billing_status
   - sales_order_items (si): salesorder, salesorderitem, material, requestedquantity, netamount, productionplant, storagelocation
   - deliveries (d): delivery_id, sales_order_id, plant, storage_location, actual_quantity, batch
   - invoices (i): invoice_id, delivery_id, amount, quantity, currency, reference_item
   - customers (c): customer_id, name, creationdate, businesspartnerfullname, businesspartnercategory
   - products (p): product, producttype, grossweight, netweight
   - plants (pl): plant_id, plant_name
   - storage_locations (sl): plant_id, location_id, location_name
   - product_storage_locations (psl): plant_id, location_id, product_id, inventory_block_ind
   - payments (pay): payment_id, customer_id, amount, currency, clearing_date, fiscal_year
   - addresses (a): addressid, businesspartner, streetname, cityname, postalcode, country
   - product_descriptions (pd): product, language, productdescription, productgroup, weightunit
15. JOINS:
   - s.sales_order_id = d.sales_order_id
   - s.sales_order_id = si.salesorder
   - d.delivery_id = i.delivery_id
   - c.customer_id = s.customer_id
   - p.product = si.material
   - pl.plant_id = sl.plant_id
   - p.product = psl.product_id
`;

const llmService = {
  async runNaturalQuery(userPrompt) {
    try {
      const lowerPrompt = userPrompt.toLowerCase().trim();

      // --- GREETINGS ---
      if (["hi", "hello", "hey"].includes(lowerPrompt)) {
        return {
          success: true,
          answer: "Hello! I am **Dodge AI**, your ERP Analyst. How can I assist with your data today?",
          nodeIds: [],
        };
      }

      // --- ERP INTENT CHECK ---
      const erpKeywords = [
        "order", "orders", "delivery", "deliveries", "payment", "payments",
        "inventory", "customer", "customers", "product", "products", "plant", "location"
      ];
      const isERPQuery = erpKeywords.some((kw) => lowerPrompt.includes(kw));

      if (!isERPQuery) {
        return {
          success: true,
          answer: "I can only analyze ERP data like customers, orders, deliveries, payments, and inventory. Please ask within these areas.",
          nodeIds: [],
        };
      }

      // --- QUERY GENERATION ---
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: SCHEMA_CONTEXT },
          { role: "user", content: userPrompt },
        ],
        model: "llama-3.1-8b-instant",
        temperature: 0.1,
      });

      let aiResponse = chatCompletion.choices[0].message.content.trim();
      const isSQL = isERPQuery && aiResponse.toUpperCase().startsWith("SELECT");

      // --- HUMAN-READABLE ERP ANSWER ---
      if (!isSQL) {
        return {
          success: true,
          answer: aiResponse,
          nodeIds: [],
        };
      }

      // --- CLEAN SQL & EXECUTE ---
      const cleanSQL = aiResponse.replace(/```sql|```|`/gi, "").trim();
      const result = await pool.query(cleanSQL);

      if (result.rows.length === 0) {
        return {
          success: true,
          answer: "No records found for the specified ERP query.",
          nodeIds: [],
        };
      }
      const humanCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are a Senior ERP Analyst. Provide a professional, structured response.
      
      RULES:
      1. Start with a brief, professional introduction (e.g., "The requested system information has been retrieved for your review:").
      2. Use BOLD headers for each field.
      3. Each detail MUST be on its own NEW LINE.
      4. Use professional bullet points (•).
      5. DO NOT use generic phrases like "Based on the provided data" or "According to the JSON".
      6. USE SINGLE SPACING ONL.
      7. If multiple items (like Plants) belong to the same entity, keep their ID and Name on the SAME LINE.
      8. Each unique entity MUST be on its own NEW LINE.
      9. Use professional bullet points (•).
      10.If multiple records are found, use a NUMBERED LIST (1, 2, 3) for each main entity (e.g., Sales Order).
      11. HIERARCHY: 
        - Use Numbers (1, 2, 3) for the Parent entity (Sales Order ID).
        - Use a Tab Space (or 3 spaces) before Bullets (•) for the Child details.
      12. ALIGNMENT: Each bullet point MUST be indented to create a clear visual hierarchy.
      13. REJECTION: If data is missing (like 'Status'), do NOT say "Not Provided". Instead, skip that line or say "Pending Update".
      14. Always starts next data like list 2 from new line.
      15. Use brackets for data like 1) , 2) , 3).
      
      FORMAT EXAMPLE:
      Here are the details for Sales Order 740506:

      1)**Sales Order ID:** [ID Value]
         •**Customer ID:** [Value]
         •**Amount:** [Value]
         •**Status:** [Value]

      2)**Sales Order ID:** [ID Value]
      ...(so on)`
          },
          {
            role: "user",
            content: `User Question: ${userPrompt} \n Database Data: ${JSON.stringify(result.rows)}`
          },
        ],
        model: "moonshotai/kimi-k2-instruct-0905",
        temperature: 0.3,
      });

      const finalAnswer = humanCompletion.choices[0].message.content
        .replace(/\n\s*\n/g, '\n\n')
        .trim();

      // --- FORMAT RESPONSE & NODE IDS ---
      const nodeIds = new Set();
      const formattedAnswer = result.rows
        .map((row) => {
          if (row.customer_id) nodeIds.add(`cust-${row.customer_id}`);
          if (row.businesspartner) nodeIds.add(`cust-${row.businesspartner}`);
          if (row.sales_order_id) nodeIds.add(`order-${row.sales_order_id}`);
          if (row.salesorder) nodeIds.add(`order-${row.salesorder}`);
          if (row.salesorderitem) nodeIds.add(`item-${row.salesorderitem}`);
          if (row.material) nodeIds.add(`prod-${row.material}`);
          if (row.product) nodeIds.add(`prod-${row.product}`);
          if (row.product_id) nodeIds.add(`prod-${row.product_id}`);
          if (row.delivery_id) nodeIds.add(`del-${row.delivery_id}`);
          if (row.invoice_id) nodeIds.add(`bill-${row.invoice_id}`);
          if (row.payment_id) nodeIds.add(`pay-${row.payment_id}`);
          if (row.plant_id) nodeIds.add(`plant-${row.plant_id}`);
          if (row.location_id) nodeIds.add(`loc-${row.location_id}`);
          if (row.addressid) nodeIds.add(`addr-${row.addressid}`);

          return `
${row.name || row.customer_id}:
• Orders: ${row.total_orders || 0}
• Delivered: ₹${Number(row.total_delivered || row.delivered_amount || 0).toLocaleString()}
• Payments: ₹${Number(row.total_payments || 0).toLocaleString()}
• Pending: ${row.pending_deliveries || "0"} deliveries
• Outstanding: ₹${Number(row.outstanding_balance || 0).toLocaleString()}
          `.trim();
        })
        .join("\n\n");

      return {
        success: true,
        answer: finalAnswer,
        sql: cleanSQL,
        nodeIds: Array.from(nodeIds),
      };
    } catch (error) {
      return { success: false, answer: `ERP query failed: ${error.message}` };
    }
  },
};

module.exports = llmService;