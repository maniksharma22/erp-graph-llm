const express = require("express");
const cors = require("cors");
const pool = require("./config/db");
require("dotenv").config();

const graphRoutes = require("./routes/graphRoutes");
const queryRoutes = require("./routes/queryRoutes");

const app = express();

// Allow your local frontend
app.use(cors({
<<<<<<< HEAD
  origin: "*", 
  methods: ["GET", "POST"],
=======
  origin: "http://localhost:5173",
>>>>>>> f8820e3 (updated api url and env settings)
  credentials: true
}));

app.use(express.json());

// Main entry for the graph
app.use("/api/graph", graphRoutes); 
app.use("/api", queryRoutes);
<<<<<<< HEAD
app.use("/api", graphRoutes);
=======
>>>>>>> f8820e3 (updated api url and env settings)

const PORT = 10000; 
app.listen(PORT, "0.0.0.0", () => {
<<<<<<< HEAD
  console.log(`🚀 Server running on port ${PORT}`);
});
=======
  console.log(`🚀 Local Server running on http://localhost:${PORT}`);
});
>>>>>>> f8820e3 (updated api url and env settings)
