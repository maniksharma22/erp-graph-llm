const { runNaturalQuery } = require("../services/llmService");

const handleQuery = async (req, res) => {
  try {

    const query = req.body.query || req.body.q;

    if (!query) {
      return res.status(400).json({ answer: "Query is required", nodes: [] });
    }

    const result = await runNaturalQuery(query);
    res.json(result);

  } catch (error) {
    console.error("Error in handleQuery:", error);
    res.status(500).json({ answer: "Server error.", nodes: [] });
  }
};

module.exports = { handleQuery };