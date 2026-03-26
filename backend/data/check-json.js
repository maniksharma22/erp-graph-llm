const fs = require("fs");
const path = require("path");

function checkJsonFiles(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.lstatSync(fullPath).isDirectory()) {
      checkJsonFiles(fullPath);
    } else if (file.endsWith(".json")) {
      try {
        const content = fs.readFileSync(fullPath, "utf-8");
        JSON.parse(content);
      } catch (err) {
        console.error("Invalid JSON:", fullPath, err.message);
      }
    }
  }
}

checkJsonFiles("./data");