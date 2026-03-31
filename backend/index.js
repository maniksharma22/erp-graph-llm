const express = require("express");
const cors = require("cors");
require("dotenv").config();

const graphRoutes = require("./routes/graphRoutes");
const queryRoutes = require("./routes/queryRoutes");

const app = express();

app.use(cors({
  origin: "*", 
  methods: ["GET", "POST"],
  credentials: true
}));

app.use(express.json());

// Routes setup
app.use("/api/graph", graphRoutes); 
app.use("/api", queryRoutes);

const PORT = process.env.PORT || 10000; 

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});