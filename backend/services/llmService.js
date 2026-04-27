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
   - journal_entries (j): accounting_document, reference_document, customer_id, amount, posting_date, fiscal_year, company_code

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
   - j.reference_document = i.invoice_id OR j.reference_document = s.sales_order_id
   - j.customer_id = c.customer_id

SELECT 
    si.material as product_id, 
    COALESCE(pd.productdescription, 'Material ID: ' || si.material) as product, 
    COUNT(DISTINCT i.invoice_id) as billing_count
FROM invoices i
JOIN deliveries d ON TRIM(i.delivery_id::TEXT) = TRIM(d.delivery_id::TEXT)
JOIN sales_order_items si ON TRIM(d.sales_order_id::TEXT) = TRIM(si.salesorder::TEXT)
LEFT JOIN product_descriptions pd ON TRIM(si.material::TEXT) = TRIM(pd.product::TEXT) 
    AND (pd.language = 'EN' OR pd.language IS NULL)
GROUP BY si.material, pd.productdescription
ORDER BY billing_count DESC LIMIT 10;
    -- RULE: Invoices table has empty material columns, so we must join through sales_order_items (si) to get the material ID and its description.
    -- RULE: Use 'EN' for language as confirmed from the database.

17. SQL SYNTAX STRICT RULE: If you use 'SELECT DISTINCT', any column in 'ORDER BY' MUST be in the 'SELECT' list. 
    However, for "highest/top" queries, ALWAYS prefer 'GROUP BY' instead of 'DISTINCT'.

18. For "Full Lifecycle" or "Trace Flow" or "Trace Full Flow": 
    ALWAYS use 'LEFT JOIN' starting from sales_orders (s). 
    This ensures that even if a Delivery or Invoice is missing, the Order and Customer details still show up.
    
    SELECT 
    s.sales_order_id, 
    c.name as customer_name,
    si.material as product_id,
    pd.productdescription as product_name,
    s.status as order_status,
    CASE WHEN s.delivery_status = 'C' THEN 'Order Dispatched' ELSE 'Pending' END as delivery_status,
    d.delivery_id,
    i.invoice_id,
    j.accounting_document as journal_id,
    s.created_at
    FROM sales_orders s
    LEFT JOIN customers c ON s.customer_id = c.customer_id
    LEFT JOIN sales_order_items si ON s.sales_order_id = si.salesorder
    LEFT JOIN product_descriptions pd ON TRIM(si.material::TEXT) = TRIM(pd.product::TEXT)
    LEFT JOIN deliveries d ON TRIM(s.sales_order_id::TEXT) = TRIM(d.sales_order_id::TEXT)
    LEFT JOIN invoices i ON TRIM(d.delivery_id::TEXT) = TRIM(i.delivery_id::TEXT)
    LEFT JOIN journal_entries j ON (TRIM(i.invoice_id::TEXT) = TRIM(j.reference_document::TEXT) OR TRIM(s.sales_order_id::TEXT) = TRIM(j.reference_document::TEXT))
    WHERE (pd.language = 'EN' OR pd.language IS NULL)
    ORDER BY s.created_at DESC
    LIMIT 5;

19. **DYNAMIC LIMIT RULE:** - Always use **LIMIT 10** for "Top/Highest" or "List" queries.
    - Always use **LIMIT 5** for "Trace" or "Flow" queries.
    - NEVER exceed **LIMIT 20** to prevent "Data Too Large" errors.

20. BROKEN FLOW LOGIC (STRICT):
    - Goal: Find records where the NEXT step is missing.
    - If user asks for "Delivered but not Billed":
      SELECT s.sales_order_id, c.name as customer_name, d.delivery_id, s.status, s.created_at
      FROM sales_orders s
      JOIN customers c ON s.customer_id = c.customer_id
      JOIN deliveries d ON s.sales_order_id = d.sales_order_id
      LEFT JOIN invoices i ON d.delivery_id = i.delivery_id
      WHERE i.invoice_id IS NULL; 
    - Example (Billed but NOT Delivered): 
      SELECT s.sales_order_id, i.invoice_id FROM sales_orders s 
      INNER JOIN invoices i ON s.sales_order_id = i.sales_order_id 
      LEFT JOIN deliveries d ON s.sales_order_id = d.sales_order_id 
      WHERE d.delivery_id IS NULL;

21. JOIN BRIDGE REFERENCE:
    - s.sales_order_id = d.sales_order_id (Order to Delivery)
    - d.delivery_id = i.delivery_id (Delivery to Invoice)
    - i.invoice_id = j.reference_document (Invoice to Journal)

22. SELECT 
    s.sales_order_id, 
    c.name as customer_name, 
    si.material as product_id,
    pd.productdescription as product_name,
    d.delivery_id, 
    i.invoice_id, 
    j.accounting_document AS journal_id,
    -- Status mapping updated for all 3 standard SAP/ERP codes
    CASE 
        WHEN s.delivery_status = 'C' THEN 'Order Dispatched' 
        WHEN s.delivery_status = 'B' THEN 'Partially Shipped'
        ELSE 'In Process' 
    END as delivery_status,
    s.status AS order_status,
    s.created_at
    FROM sales_orders s
    LEFT JOIN customers c ON s.customer_id = c.customer_id
    LEFT JOIN sales_order_items si ON s.sales_order_id = si.salesorder
    LEFT JOIN product_descriptions pd ON TRIM(si.material::TEXT) = TRIM(pd.product::TEXT)
    LEFT JOIN deliveries d ON TRIM(s.sales_order_id::TEXT) = TRIM(d.sales_order_id::TEXT)
    LEFT JOIN invoices i ON TRIM(d.delivery_id::TEXT) = TRIM(i.delivery_id::TEXT)
    -- Final Fixed Journal Join: Handles Order, Invoice, or Delivery references
    LEFT JOIN journal_entries j ON (
        TRIM(j.reference_document::TEXT) = TRIM(i.invoice_id::TEXT) OR 
        TRIM(j.reference_document::TEXT) = TRIM(s.sales_order_id::TEXT) OR
        TRIM(j.reference_document::TEXT) = TRIM(d.delivery_id::TEXT)
    )
    WHERE (pd.language = 'EN' OR pd.language IS NULL)
    AND ([ID_OR_NAME_CONDITION])
    ORDER BY s.created_at DESC
    LIMIT 20; -- Increased to handle multi-item orders without cutting off the trace

23. TRACING RULE: If a user asks for 'most recent' WITHOUT a specific count, use LIMIT 1. If a count is specified (e.g., 'show 2'), use that count.
24. MANDATORY COLUMNS & JOINS (CRITICAL): 
    - Every SQL query involving 'sales_orders' (s) MUST 'LEFT JOIN customers (c) ON s.customer_id = c.customer_id' to fetch 'c.name as customer_name'. 
    - You MUST select these IDs for Graph Highlighting even if not requested: 
      s.sales_order_id, s.customer_id, c.name as customer_name, d.delivery_id, i.invoice_id, j.accounting_document as journal_id, si.material as product_id.
    - Always use table aliases (s, c, d, i, etc.) to avoid ambiguous column errors.

25. 13-ENTITY ALIASING: Always use these short aliases for consistency:
    s (sales_orders), si (sales_order_items), d (deliveries), i (invoices), c (customers), p (products), pl (plants), sl (storage_locations), psl (product_storage_locations), pay (payments), a (addresses), pd (product_descriptions), j (journal_entries).

26. LIFECYCLE & FLOWS: For any "Trace", "Flow", or "Lifecycle" request, use LEFT JOINs starting from 'sales_orders' to ensure no step is missed. Always ORDER BY s.created_at DESC.

27. CLEAN DATA: Do not return rows where the primary entity ID is missing. Use 'WHERE [ID_COLUMN] IS NOT NULL'.
28. JOIN INTEGRITY: When joining IDs (e.g., material to product), always use TRIM(column::TEXT) to ensure a match across data types.
29. STATUS MAPPING (CRITICAL): When selecting status columns, use CASE statements from the CORRECT table:
    - For delivery_status: CASE WHEN s.delivery_status = 'C' THEN 'Order Dispatched' WHEN s.delivery_status = 'A' THEN 'Pending' ELSE 'In Process' END as delivery_status
    - For billing_status: CASE WHEN s.billing_status = 'C' THEN 'Invoiced' ELSE 'Pending' END as billing_status
    - For order status: CASE WHEN s.status = 'C' THEN 'Order Completed' ELSE s.status END as order_status
30. COLUMN INTEGRITY: 
    - The 'deliveries' (d) table DOES NOT have 'created_at', 'delivery_status', or 'billing_status'. 
    - ALWAYS use 's.created_at' for all dates and 's.delivery_status/billing_status' for all status checks.
    - NEVER try to select 'd.created_at' or 'd.delivery_status'.
31. JOURNAL MAPPING: If the user asks for "Journal", "Accounting", or "Ledger", query the 'journal_entries' table. Use 'accounting_document' as the primary reference.

`;

const llmService = {
  async runNaturalQuery(userPrompt, chatHistory = []) {

    try {
      const lowerPrompt = userPrompt.toLowerCase();
      let limitVal = 5;

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
      const erpKeywords = ["order", "orders", "delivery", "deliveries", "payment", "payments", "inventory", "customer", "customers", "product", "products", "plant", "location", "billing", "invoice", "invoices", "trace", "flow", "journal", "journals", "accounting"];
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
      const isTraceRequest = lowerPrompt.includes("trace") || lowerPrompt.includes("flow");
      const isIssueQuery = lowerPrompt.includes("broken") || lowerPrompt.includes("incomplete") || lowerPrompt.includes("missing") || lowerPrompt.includes("issue");
      const hasSpecificId = lowerPrompt.match(/\d{5,}/);

      if (hasSpecificId && !isTraceRequest && !isIssueQuery) {
        finalPrompt = `Fetch all details for Sales Order ID '${hasSpecificId[0]}'. 
  Include Customer, Delivery, and Invoice if they exist. 
  Format using Rule 22 (Full Lifecycle).`;
      }
      else if (isIssueQuery) {
        finalPrompt = `STRICT RULE: Only return records where a follow-up document is MISSING. 
    If user asks for broken flows, return:
    1. Delivered but NOT billed (d.delivery_id IS NOT NULL AND i.invoice_id IS NULL)
    2. Billed but NOT delivered (i.invoice_id IS NOT NULL AND d.delivery_id IS NULL)
    LIMIT results to 10 to avoid overflow.`;
      }
      else if (isTraceRequest) {
        const matchCount = lowerPrompt.match(/\d+/) ||
          (lowerPrompt.includes("two") ? [2] :
            lowerPrompt.includes("three") ? [3] : null);
        limitVal = matchCount ? parseInt(matchCount[0]) : (hasSpecificId ? 1 : 5);
        if (hasSpecificId) {
          finalPrompt = `Trace full ERP lifecycle for ID '${hasSpecificId[0]}'. Use Rule 22.`;
        } else {
          
          finalPrompt = `Trace the ERP flows using Rule 18. 
        CRITICAL: I need exactly ${limitVal} UNIQUE Sales Order IDs.
        Your SQL MUST use: WHERE s.sales_order_id IN (SELECT sales_order_id FROM sales_orders ORDER BY created_at DESC LIMIT ${limitVal})`;
        }
      }

      console.log("FINAL PROMPT SENT TO AI:", finalPrompt);


      // --- QUERY GENERATION ---
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: SCHEMA_CONTEXT + (isPagination ? "\nSTRICT RULE: Use OFFSET." : "")
          },
          ...chatHistory,
          { role: "user", content: finalPrompt },
        ],
     model: "llama-3.1-70b-versatile",
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
  let safeSQL = cleanSQL;

  if (/limit\s+\d+/i.test(safeSQL)) {
    safeSQL = safeSQL.replace(/limit\s+\d+/i, "LIMIT 2");
  } else {
    safeSQL += " LIMIT 2";
  }

  console.log("FINAL SAFE SQL:", safeSQL);


  result = await pool.query({
    text: safeSQL,
    statement_timeout: 3000, 
  });

} catch (sqlError) {
  console.error("DATABASE ERROR FULL:", sqlError);

  return {
    success: true,
    answer: "Query too large. Try 'Show 2 orders'",
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

      // --- DYNAMIC DATA ROUTING ---
      const flatEntities = ["customer", "product", "plant", "location", "address", "payment"];
      const isFlatQuery = flatEntities.some(entity => lowerPrompt.includes(entity));
      const isFlowQuery = lowerPrompt.includes("order") || lowerPrompt.includes("trace") || lowerPrompt.includes("flow");

      let mergedDataRows;
      if (isFlatQuery && !isFlowQuery) {
        mergedDataRows = result.rows;
      } else {

        const grouped = result.rows.reduce((acc, row, index) => {
          const id =
            row.sales_order_id ||
            row.invoice_id ||
            row.delivery_id ||
            row.accounting_document ||
            row.customer_id ||
            row.product_id ||
            row.material ||
            row.payment_id ||
            row.plant_id ||
            row.location_id ||
            row.addressid ||
            `entity-group-${index}`;
          if (!acc[id]) {
            acc[id] = { ...row, items: [] };
          }
          if (row.product_id || row.material) {
            acc[id].items.push({
              product_id: row.product_id || row.material,
              product_name: row.product_name || row.productdescription,
              amount: row.netamount || row.amount
            });
          }
          return acc;
        }, {});
        mergedDataRows = Object.values(grouped);
        console.log("UNIQUE ORDERS FOUND:", mergedDataRows.length);
      }



      const finalDataForAI = mergedDataRows.map(row => {
        const cleanRow = {};
        const allowedFields = [
          'sales_order_id', 'customer_name', 'name', 'status', 'delivery_status',
          'billing_status', 'order_status', 'created_at', 'delivery_id',
          'invoice_id', 'journal_id', 'accounting_document',
          'product', 'product_id', 'billing_count', 'product_name', 'amount'
        ];

        Object.keys(row).forEach(key => {
          let val = row[key];
          if (val === null || val === undefined || val === "") return;
          if (allowedFields.includes(key)) cleanRow[key] = val;
        });

        if (!lowerPrompt.includes("trace") && !lowerPrompt.includes("flow")) {
          delete cleanRow.items;
        } else if (row.items) {
          cleanRow.items = row.items.slice(0, 2);
        }

        return cleanRow;
      }).slice(0, 5);

      const humanCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are a Senior ERP Analyst. Provide a professional report based ONLY on the provided 'Database Data'.

           STRICT RULES (30):
1. **NO BACKEND TALK:** Never mention "Database", "JSON", "Rows", or "Missing data".
2. **MANDATORY BOLD LABELS:** Every label must be bold (e.g., **Sales Order:**, **Customer:**).
3. **ONE NUMBER PER ORDER:** Use 1), 2) etc. only for unique Sales Order IDs.
4. **HIERARCHY:** Indent Delivery, Invoice, and Journal IDs under the Sales Order.
5. **STRICT NULL FILTER:** If a value is missing/null in the JSON, DELETE the entire line and label.
6. **SILENT NULL FILTER:** If a specific field is missing in the JSON (e.g., no 'product' name), DO NOT mention that field at all. Never write "Not Available".
7. **NO PLACEHOLDERS:** Never use "Item A", "Product B", or dummy IDs. If the product name/ID is missing from the data, DO NOT list the product field at all.
8. 8. **TRACE INTEGRITY:** Show the trace flow ONLY ONCE per unique Sales Order. 
   - Format: **Trace:** [Del ID] → [Inv ID] → [Jour ID].
   - If a middle document is missing, keep the arrow: [Del ID] → → [Jour ID].
   - **CLEAN END:** If the flow ends prematurely (e.g., no Invoice after Delivery), DO NOT show trailing arrows. 
     (BAD: 80737722 → → | GOOD: 80737722)
9. **CLEAN START:** Start directly with "Here is the report:" or "ERP Analysis Report:".
10. **STRICT DATA ADHERENCE:** Do not invent or "hallucinate" any IDs, names, or items. Use ONLY the literal strings provided in the 'Database Data'.
11. **DATE FORMAT:** Always use YYYY-MM-DD (remove time stamps).
12. **NO EXAMPLES:** Never use dummy names like "Bradley-Kelley" unless present in JSON.
13. **ISSUE HIGHLIGHTING:** If Rule 20 is used, add **Issue:** [Description].
14. **VERTICAL COMPACTNESS:** No empty lines between data fields of the same item.
15. **DOUBLE SPACING:** Use one blank line between Item 1) and Item 2).
16. **GHOST SPACE PREVENTION:** Shift next lines up immediately if a field is missing.
17. **CUSTOMER PRIORITY:** Always show Customer Name; if missing, show Customer ID.
18. **NO BULLETS:** Use only numbers (1, 2) for main items, no dots or dashes.
19. **CURRENCY:** Include currency (USD/INR) next to amounts if available.
20. **AGGREGATION ONLY:** If 'billing_count' exists in the data, show ONLY a list: 1) **Product:** [Name] | **Count:** [Value]. DO NOT attempt a Trace flow for this.
21. **ABSOLUTE NO REPETITION:** If multiple rows in the data represent the same Sales Order, you MUST merge them into a single numbered item in your report. Do not repeat the same Sales Order ID.
22. **ORDER STATUS:** Map 'C' to "Completed", 'A' to "Open", 'B' to "In Progress".
23. **DELIVERY STATUS:** Map 'C' to "Order Dispatched", 'A' to "Pending".
24. **SINGLE SOURCE:** Only use data from the 'Database Data' section of the prompt.
25. **NO TRUNCATION:** Display every unique record found in the JSON.
26. **INDENTATION:** Use 2 spaces for indented lines (Delivery, Invoice, etc.).
27. **ITEM ALIGNMENT:** Ensure all bold labels are aligned for readability.
28. **STRICT HIERARCHY:** If no Sales Order ID exists, use the next highest ID (e.g., Invoice ID).
29. **FINANCIAL DATA:** Journal IDs must be labeled as **Journal ID:** or **Accounting Doc:**.
30. **FINAL CHECK:** If JSON is empty, respond: "No records found for your request."
31. **NO EXPLANATIONS:** Do not explain your logic or how you found the data."
32. **BOLD NUMBERING:** Use **1)**, **2)**, etc. (bolded) only for unique Sales Order IDs or main list items.
32. Show exactly ${limitVal} unique items/orders in the report.`
          },
          {
            role: "user",
            content: `User Question: ${userPrompt} 
      Database Data: ${JSON.stringify(finalDataForAI)}`
          },
        ],
      model: "llama-3.1-70b-versatile",
        temperature: 0.1,
      });

      const finalAnswer = humanCompletion.choices[0].message.content.trim();

      console.log("DEBUG ROW DATA:", result.rows[0]);

      // --- FORMAT RESPONSE & NODE IDS ---
      const nodeIds = new Set();
      result.rows.forEach((row) => {
        const clean = (val) => (val && val !== 'null' && val !== 'undefined') ? String(val).trim() : null;

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
      console.error("DETAILED ERROR:", error);
      return {
        success: false,
        answer: "The data requested is too large to summarize right now. Please try a more specific query, like 'Show top 5 billing documents' or 'Details for Order 740506'.",
        nodeIds: [],
      };
    }
  },
};

module.exports = llmService;
