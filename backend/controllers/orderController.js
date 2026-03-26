const { getOrdersWithDetails, getDeliveredNotBilled } = require("../services/orderService");

const getOrders = async (req, res) => {
    try {
        const data = await getOrdersWithDetails();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Something went wrong" });
    }
};

const getMissingBilling = async (req, res) => {
    try {
        const data = await getDeliveredNotBilled();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Error fetching data" });
    }
};

module.exports = { getOrders, getMissingBilling };