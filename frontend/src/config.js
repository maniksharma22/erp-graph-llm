export const API_BASE_URL = 
  process.env.NODE_ENV === "production"
    ? "https://your-backend-service.onrender.com" 
    : "http://localhost:10000";