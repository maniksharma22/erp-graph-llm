// controllers/queryController.js
const { runNaturalQuery } = require("../services/llmService"); // ✅ Correct path

const handleQuery = async (req, res) => {
  try {
    const query = req.body.query || req.body.q;

    if (!query || !query.trim()) {
      return res.status(400).json({ answer: "Please provide a valid ERP query.", nodeIds: [] });
    }

    // Run the LLM service
    const result = await runNaturalQuery(query);

    // Always return clean, human-readable response without N/A
    let cleanAnswer = result.answer || "I couldn't find any matching ERP data.";
    cleanAnswer = cleanAnswer.replace(/\b(N\/A|Not available)\b/g, ""); // remove N/A

    res.json({ answer: cleanAnswer.trim(), nodeIds: result.nodeIds || [] });

  } catch (error) {
    console.error("Error in handleQuery:", error);
    res.status(500).json({ answer: "Technical error while fetching ERP data.", nodeIds: [] });
  }
};

module.exports = { handleQuery };