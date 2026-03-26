// /backend/controllers/graphController.js
const fs = require("fs");
const path = require("path");

// Recursive function to get all JSON files inside a folder
function getAllJsonFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      results = results.concat(getAllJsonFiles(filePath)); // recurse
    } else if (stat.isFile() && file.endsWith(".json")) {
      results.push(filePath);
    }
  });
  return results;
}

const getGraph = async (req, res) => {
  try {
    const dataFolder = path.join(__dirname, "../data");
    const jsonFiles = getAllJsonFiles(dataFolder);

    let nodes = [];
    let edges = [];

    jsonFiles.forEach((filePath) => {
      try {
        const rawData = fs.readFileSync(filePath, "utf-8");
        const jsonData = JSON.parse(rawData);
        if (jsonData.nodes) nodes = nodes.concat(jsonData.nodes);
        if (jsonData.edges) edges = edges.concat(jsonData.edges);
      } catch (err) {
        console.warn(`Skipping invalid JSON file: ${filePath}`);
      }
    });

    // Remove duplicate nodes
    const uniqueNodesMap = new Map();
    nodes.forEach((n) => uniqueNodesMap.set(n.id, n));
    nodes = Array.from(uniqueNodesMap.values());

    // Remove duplicate edges
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
