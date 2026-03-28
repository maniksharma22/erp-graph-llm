const express = require("express");
const cors = require("cors");
const pool = require("./config/db");
require("dotenv").config();

const testRoutes = require("./routes/testRoutes");
const orderRoutes = require("./routes/orderRoutes");
const queryRoutes = require("./routes/queryRoutes");
const graphRoutes = require("./routes/graphRoutes");

const app = express();

app.use(cors({
  origin: "https://erp-graph-llm.vercel.app", // Aapka actual frontend URL
  methods: ["GET", "POST"],
  credentials: true
}));

app.use(express.json());

app.get("/", (req, res) => res.send("Dodge AI Backend is running"));

app.use("/api", testRoutes);
app.use("/api", orderRoutes);
app.use("/api", queryRoutes);
app.use("/api/graph", graphRoutes);

const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});