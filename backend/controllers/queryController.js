const llmService = require("../services/llmService");

const handleNaturalQuery = async (req, res) => {
  console.log("📩 Received NLP Prompt from Frontend:", req.body.prompt); 

  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ 
        success: false, 
        answer: "Please provide a query." 
      });
    }

    const result = await llmService.runNaturalQuery(prompt);

    console.log("🤖 AI Response Success:", result.success);

    if (result.success) {
      res.json(result);
    } else {
      res.status(200).json(result);
    }
  } catch (error) {
    console.error("❌ Query Controller Error:", error);
    res.status(500).json({ 
      success: false, 
      answer: "Internal Server error while processing query." 
    });
  }
};

module.exports = { handleNaturalQuery };