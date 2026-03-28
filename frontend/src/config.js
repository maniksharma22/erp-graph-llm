export const API_BASE_URL = 
  process.env.NODE_ENV === "production"
    ? "https://erp-graph-llm.onrender.com" 
    : "http://localhost:10000";
