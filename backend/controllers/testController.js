const { getTestMessage } = require("../services/testService");

const testController = async (req, res) => {
  const data = await getTestMessage();
  res.json(data);
};

module.exports = { testController };