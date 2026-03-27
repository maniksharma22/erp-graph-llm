const { runNaturalQuery } = require("./llmService");

const handleQuery = async (query) => {
  if (!query) return { answer: "Please provide a query.", nodeIds: [] };
  
  return await runNaturalQuery(query);
};

module.exports = { handleQuery };