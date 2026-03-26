// /backend/index.js
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const testRoutes = require("./routes/testRoutes");
const orderRoutes = require("./routes/orderRoutes");
const queryRoutes = require("./routes/queryRoutes");
const graphRoutes = require("./routes/graphRoutes");

const app = express();

// Enable CORS for all origins
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Optional: simple health check
app.get("/", (req, res) => res.send("Backend is running"));

// API routes
app.use("/api", testRoutes);
app.use("/api", orderRoutes);
app.use("/api", queryRoutes);
app.use("/api/graph", graphRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});