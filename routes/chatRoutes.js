const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { getTripMessages, sendTripMessage } = require("../controllers/chatController");

const router = express.Router();

router.get("/trips/:tripId/messages", authMiddleware, getTripMessages);
router.post("/trips/:tripId/messages", authMiddleware, sendTripMessage);

module.exports = router;