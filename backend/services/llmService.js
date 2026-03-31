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
   - journal_entries (j): accounting_document, reference_document, customer, amount, posting_date
   - product_storage_locations (psl): plant_id, location_id, product_id, inventory_block_ind
   - addresses (a): addressid, businesspartner, cityname, streetname, postalcode
   - plants (pl): plant_id, plant_name
15. JOINS:
   - s.sales_order_id = d.sales_order_id
   - s.sales_order_id = si.salesorder
   - d.delivery_id = i.delivery_id
   - c.customer_id = s.customer_id
   - p.product = si.material
   - pd.product = p.product OR pd.product = i.reference_item
   - pl.plant_id = sl.plant_id
   - p.product = psl.product_id
   - i.invoice_id = j.reference_document  
   - si.productionplant = pl.plant_id     
   - si.storagelocation = sl.location_id  
   - s.customer_id = a.businesspartner    

16. For "highest number of billing documents", join i -> d -> si -> pd:
    SELECT 
        si.material as product_id, 
        COALESCE(pd.productdescription, 'Product ID: ' || si.material) as product, 
        COUNT(DISTINCT i.invoice_id) as billing_count,
        MAX(si.salesorder) as sales_order_id  -- YE LINE ADD KARO taaki oId mil sake
    FROM sales_order_items si -- Start from SI to ensure all products are counted
    LEFT JOIN deliveries d ON si.salesorder = d.sales_order_id 
    LEFT JOIN invoices i ON d.delivery_id = i.delivery_id 
    LEFT JOIN product_descriptions pd ON TRIM(si.material::TEXT) = TRIM(pd.product::TEXT) 
    WHERE (pd.language = 'EN' OR pd.language IS NULL)
    GROUP BY si.material, pd.productdescription
    ORDER BY billing_count DESC 
    LIMIT 10;
    -- RULE: Invoices table has empty material columns, so we must join through sales_order_items (si) to get the material ID and its description.
    -- RULE: Use 'EN' for language as confirmed from the database.

17. SQL SYNTAX STRICT RULE: If you use 'SELECT DISTINCT', any column in 'ORDER BY' MUST be in the 'SELECT' list. 
    However, for "highest/top" queries, ALWAYS prefer 'GROUP BY' instead of 'DISTINCT'.

18. For "Trace full flow", ALWAYS use LEFT JOIN and do NOT filter by billing_status. 
    SELECT DISTINCT
        s.sales_order_id, 
        d.delivery_id, 
        i.invoice_id, 
        j.accounting_document AS journal_entry,
        s.status AS order_status,
        s.delivery_status,
        s.created_at
    FROM sales_orders s 
    LEFT JOIN deliveries d ON TRIM(s.sales_order_id::TEXT) = TRIM(d.sales_order_id::TEXT)
    LEFT JOIN invoices i ON TRIM(d.delivery_id::TEXT) = TRIM(i.delivery_id::TEXT)
    LEFT JOIN journal_entries j ON TRIM(i.invoice_id::TEXT) = TRIM(j.reference_document::TEXT)
    ORDER BY s.created_at DESC 
    LIMIT 5;

19. DYNAMIC LIMIT RULE: 
    - If the user specifies a number (e.g., "Top 50", "First 100"), use that number as the LIMIT.
    - If NO number is specified, ALWAYS default to LIMIT 10 for "top/highest" and LIMIT 5 for "flows".
    - NEVER exceed LIMIT 100 to prevent "Technical Issue".

20. For "Broken or Incomplete flows":
    -- Identify orders where delivery exists but invoice is missing.
    SELECT 
        s.sales_order_id, 
        d.delivery_id, 
        'Missing Invoice' as issue,
        s.status as order_status
    FROM sales_orders s
    INNER JOIN deliveries d ON s.sales_order_id = d.delivery_id
    LEFT JOIN invoices i ON d.delivery_id = i.delivery_id
    WHERE i.invoice_id IS NULL
    ORDER BY s.created_at DESC 
    LIMIT 5;

21. PAGINATION & OFFSET RULE:
    - If the user asks for "next", "more", or "page 2", use the OFFSET clause.
    - If the previous query had LIMIT 10, then "Next" means LIMIT 10 OFFSET 10.
    - If the user specifies "Next 5", use LIMIT 5 and calculate OFFSET based on context.
    - ALWAYS ensure an ORDER BY clause is present when using OFFSET to keep results consistent.

22. For "Trace full flow" with a specific ID:
    SELECT DISTINCT
        s.sales_order_id, 
        d.delivery_id, 
        i.invoice_id, 
        j.accounting_document AS journal_entry,
        s.status AS order_status,
        s.billing_status,
        s.delivery_status,
        s.created_at
    FROM sales_orders s
    LEFT JOIN deliveries d ON TRIM(s.sales_order_id::TEXT) = TRIM(d.sales_order_id::TEXT)
    LEFT JOIN invoices i ON TRIM(d.delivery_id::TEXT) = TRIM(i.delivery_id::TEXT)
    LEFT JOIN journal_entries j ON TRIM(i.invoice_id::TEXT) = TRIM(j.reference_document::TEXT)
    WHERE TRIM(s.sales_order_id::TEXT) = 'USER_ID' OR TRIM(i.invoice_id::TEXT) = 'USER_ID'
    ORDER BY s.created_at DESC
    LIMIT 1;

`;

const llmService = {
  async runNaturalQuery(userPrompt, chatHistory = []) {
    try {
      const lowerPrompt = userPrompt.toLowerCase().trim();
      const isPagination = lowerPrompt.includes("next") || lowerPrompt.includes("more") || lowerPrompt.includes("page");

      // --- GREETINGS ---
      if (["hi", "hello", "hey"].includes(lowerPrompt)) {
        return {
          success: true,
          answer: "Hello! I am **Dodge AI**, your ERP Analyst. How can I assist with your data today?",
          nodeIds: [],
        };
      }

      // --- ERP INTENT CHECK ---
      const erpKeywords = ["order", "orders", "delivery", "deliveries", "payment", "payments", "inventory", "customer", "customers", "product", "products", "plant", "location", "billing", "invoice", "invoices", "trace", "flow"];
      const paginationKeywords = ["next", "more", "page", "previous", "show more"];

      const isERPQuery = erpKeywords.some((kw) => lowerPrompt.includes(kw)) ||
        paginationKeywords.some((kw) => lowerPrompt.includes(kw));

      if (!isERPQuery) {
        return {
          success: true,
          answer: "I can only analyze ERP data like customers, orders, deliveries, payments, and inventory. Please ask within these areas.",
          nodeIds: [],
        };
      }

      // --- TRACE FLOW PLACEHOLDER FIX ---
      let finalPrompt = userPrompt;
      const lowerPromptNoSpace = lowerPrompt.replace(/\s/g, "");

      const isTraceRequest = lowerPrompt.includes("trace") || lowerPrompt.includes("flow");
      const hasSpecificId = lowerPrompt.match(/\d{5,}/);

      if (isTraceRequest) {
        if (hasSpecificId) {
          finalPrompt = `Trace the full ERP flow for ID ${hasSpecificId[0]}. Use Rule 22 and return Sales Order, Delivery, Billing, and Journal Entry details.`;
        } else {
          finalPrompt = "Show me the 5 most recent ERP flows including Sales Order, Delivery, Billing, and Journal Entry as per Rule 18";
        }
      }

      console.log("FINAL PROMPT SENT TO AI:", finalPrompt);


      // --- QUERY GENERATION ---
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: SCHEMA_CONTEXT + (isPagination ? "\nSTRICT RULE: The user is asking for more/next results. You MUST use OFFSET. If the previous limit was 10, use OFFSET 10. If the user asks for 'next 5', use LIMIT 5 OFFSET 10." : "")
          },
          ...chatHistory,
          { role: "user", content: finalPrompt },
        ],
        model: "llama-3.1-8b-instant",
        temperature: 0.1,
      });

      let aiResponse = chatCompletion.choices[0].message.content.trim();
      const isSQL = aiResponse.toUpperCase().startsWith("SELECT") && !aiResponse.includes("ERROR");

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
      let result;

      try {
        console.log("ACTUAL SQL EXECUTING:", cleanSQL);
        result = await pool.query(cleanSQL);
      } catch (sqlError) {
        console.error("DATABASE ERROR:", sqlError.message);
        return {
          success: true,
          answer: "I encountered a technical issue while fetching those details. Please try asking: 'Show me top products by invoice count'.",
          nodeIds: [],
        };
      }

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
      
     STRICT RULES:
         1. Start with a professional introduction.
         2. Use Numbers with brackets like **1)**, **2)** for the main entity.
         3. FOLLOWED BY TWO SPACES, put the main detail (e.g., **Product:** [Name]) on the SAME LINE.
         4. ALL other details (e.g., Billing Count) MUST be on a NEW LINE.
         5. INDENT the second line with 5 spaces for a clean look.
         6. NO BULLET POINTS (•) unless it's a sub-list.
         7. Use BOLD for headers like **Product:** and **Amount:**.
         8. SINGLE SPACING within an item.
         9. DOUBLE SPACING (Blank line) between item 1 and item 2.
         10. FULL DATA: Display every single record from the database.
         11. HIERARCHY: Parent entity on top, child details indented below.
         12. DATA COMPLETENESS: Do not skip any rows.
         13. If a value is null, just skip that line.
         14. Always start the next numbered list from a new line.
         15. ALIGNMENT: Ensure the text looks like a clean ERP report.
         
         FORMAT EXAMPLE:
         **1)** **Product:** FACESERUM 30ML VIT C
                **Billing Count:** 2
      
         **2)** **Product:** SUNSCREEN GEL SPF50-PA+++ 50ML
                **Billing Count:** 2`
          },
          {
            role: "user",
            content: `User Question: ${userPrompt} \n Database Data: ${JSON.stringify(result.rows)}`
          },
        ],
        model: "llama-3.1-8b-instant",
        temperature: 0.1,
        max_tokens: 4096,
      });

      const finalAnswer = humanCompletion.choices[0].message.content
        .replace(/\n\s*\n/g, '\n\n')
        .trim();

      console.log("DEBUG ROW DATA:", result.rows[0]);

      // --- FORMAT RESPONSE & NODE IDS ---
      const nodeIds = new Set();
      result.rows.forEach((row) => {
        const clean = (val) => val ? String(val).trim() : null;

        const pId = clean(row.product_id || row.material || row.product);
        const oId = clean(row.sales_order_id || row.salesorder || row.order_id);
        const cId = clean(row.customer_id || row.businesspartner || row.customer || row.business_partner);
        const dId = clean(row.delivery_id || row.delivery);
        const iId = clean(row.invoice_id || row.billing_document || row.invoice);
        const jId = clean(row.journal_id || row.accounting_document || row.journal_entry || row.reference_document);
        const plId = clean(row.plant_id || row.productionplant || row.plant);
        const slId = clean(row.location_id || row.storagelocation || row.storage_location);
        const payId = clean(row.payment_id || row.payment);
        const addrId = clean(row.addressid || row.address_id);
        const itemId = clean(row.salesorderitem || row.item_id);
        const pName = clean(row.product_name || row.product || row.productdescription);

        // Product & Product Descriptions
       if (pId) {
          nodeIds.add(pId);
          nodeIds.add(`prod-${pId}`);

          if (oId) {
            nodeIds.add(`prod-${oId}-${pId}`);
          } else {
            nodeIds.add(`prod-any-${pId}`); 
          }
        }
        if (pName) {
          nodeIds.add(pName);
          nodeIds.add(pName.toLowerCase());
        }
        // Sales Orders
        if (oId) {
          nodeIds.add(oId);
          nodeIds.add(`order-${oId}`);
        }

        // Customers & Business Partners
        if (cId) {
          nodeIds.add(cId);
          nodeIds.add(`cust-${cId}`);
        }

        // Deliveries
        if (dId) {
          nodeIds.add(dId);
          nodeIds.add(`del-${dId}`);
        }

        // Invoices / Billing
        if (iId) {
          nodeIds.add(iId);
          nodeIds.add(`bill-${iId}`);
        }

        // Journal Entries / Accounting
        if (jId) {
          nodeIds.add(jId);
          nodeIds.add(`journal-${jId}`);
        }

        // Plants
        if (plId) {
          nodeIds.add(plId);
          nodeIds.add(`plant-${plId}`);
        }

        // Storage Locations
        if (slId) {
          nodeIds.add(slId);
          if (plId) nodeIds.add(`sloc-${plId}-${slId}`);
        }

        // Payments
        if (payId) {
          nodeIds.add(payId);
          nodeIds.add(`pay-${payId}`);
        }

        // Addresses (Linked to Customer)
        if (addrId || cId) {
          const actualAddr = addrId || cId;
          nodeIds.add(`addr-${actualAddr}-loc`);
        }

        // Order Items
        if (itemId && oId) {
          nodeIds.add(`item-${oId}-${itemId}`);
        }
      });

      return {
        success: true,
        answer: finalAnswer,
        sql: cleanSQL,
        nodeIds: Array.from(nodeIds),
      };
    } catch (error) {
      return {
        success: false,
        answer: "The data requested is too large to summarize right now. Please try a more specific query, like 'Show top 5 billing documents' or 'Details for Order 740506'.",
        nodeIds: [],
      };
    }
  },
};

module.exports = llmService;