// /backend/controllers/graphController.js
const fs = require("fs");
const path = require("path");

// Recursive function to get all JSON files inside a folder
function getAllJsonFiles(dir) {
  let results = [];
  console.log("Checking folder:", dir);
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      console.log("Entering subfolder:", filePath);
      results = results.concat(getAllJsonFiles(filePath)); // recurse
    } else if (stat.isFile() && file.endsWith(".json")) {
      console.log("Found JSON file:", filePath);
      results.push(filePath);
    } else {
      console.log("Skipping non-JSON file or folder:", filePath);
    }
  });
  return results;
}

const getGraph = async (req, res) => {
  try {
    const dataFolder = path.join(__dirname, "../data");
    const jsonFiles = getAllJsonFiles(dataFolder);

    console.log("Total JSON files to read:", jsonFiles.length);

    let nodes = [];
    let edges = [];

    jsonFiles.forEach((filePath) => {
      try {
        const rawData = fs.readFileSync(filePath, "utf-8");
        const jsonData = JSON.parse(rawData);
        if (jsonData.nodes) nodes = nodes.concat(jsonData.nodes);
        if (jsonData.edges) edges = edges.concat(jsonData.edges);
        console.log(`Loaded file: ${filePath} → nodes: ${jsonData.nodes?.length || 0}, edges: ${jsonData.edges?.length || 0}`);
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

    console.log("Final graph → nodes:", nodes.length, "edges:", edges.length);

    res.json({ nodes, edges });
  } catch (err) {
    console.error("ERROR fetching graph:", err);
    res.status(500).json({ error: "Error fetching graph data" });
  }
};

module.exports = { getGraph };
