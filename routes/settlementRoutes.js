const express = require("express");
const { getSettlementByTrip } = require("../controllers/settlementController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/:tripId", authMiddleware, getSettlementByTrip);

module.exports = router;
