// /backend/controllers/graphController.js
const fs = require("fs");
const path = require("path");

const getGraph = async (req, res) => {
  try {
    const dataFolder = path.join(__dirname, "../data"); // path to your data folder
    const files = fs.readdirSync(dataFolder);

    let nodes = [];
    let edges = [];

    // Loop through all JSON files in the data folder
    files.forEach((file) => {
      if (file.endsWith(".json")) {
        const filePath = path.join(dataFolder, file);
        const rawData = fs.readFileSync(filePath, "utf-8");
        const jsonData = JSON.parse(rawData);

        // Merge nodes and edges
        if (jsonData.nodes) nodes = nodes.concat(jsonData.nodes);
        if (jsonData.edges) edges = edges.concat(jsonData.edges);
      }
    });

    // Remove duplicate nodes by id
    const uniqueNodesMap = new Map();
    nodes.forEach((n) => uniqueNodesMap.set(n.id, n));
    nodes = Array.from(uniqueNodesMap.values());

    // Remove duplicate edges by source-target
    const uniqueEdgesMap = new Map();
    edges.forEach((e) => uniqueEdgesMap.set(`${e.source}->${e.target}`, e));
    edges = Array.from(uniqueEdgesMap.values());

    res.json({ nodes, edges });

  } catch (err) {
    console.error("ERROR fetching graph:", err);
    res.status(500).json({ error: "Error fetching graph data" });
  }
};

module.exports = { getGraph };
