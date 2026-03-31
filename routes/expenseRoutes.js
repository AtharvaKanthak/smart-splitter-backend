const express = require("express");
const { addExpense, getExpensesByTrip } = require("../controllers/expenseController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/add", authMiddleware, addExpense);
router.get("/:tripId", authMiddleware, getExpensesByTrip);

module.exports = router;
