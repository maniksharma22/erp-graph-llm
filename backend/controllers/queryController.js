const llmService = require("../services/llmService");

const handleQuery = async (req, res) => {
  try {
    const query = req.body.query || req.body.prompt || req.body.q;

    if (!query) {
      return res.status(400).json({ answer: "Query is required." });
    }

    const result = await llmService.runNaturalQuery(query);

    if (result.success) {
      res.json({ 
        answer: result.answer, 
        data: result.data 
      });
    } else {
      res.json({ answer: "Error: " + result.error });
    }
  } catch (error) {
    res.status(500).json({ answer: "Technical error: " + error.message });
  }
};

module.exports = { handleQuery };