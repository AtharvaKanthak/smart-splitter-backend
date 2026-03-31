const Expense = require("../models/Expense");
const Trip = require("../models/Trip");

const addExpense = async (req, res) => {
  try {
    const { tripId, amount, paidBy, participants, category, description } = req.body;

    if (!tripId || !amount || !paidBy || !participants?.length) {
      return res.status(400).json({
        message: "tripId, amount, paidBy and participants are required",
      });
    }

    const trip = await Trip.findById(tripId);

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    const tripMemberIds = trip.members.map((memberId) => memberId.toString());
    const submittedIds = [paidBy, ...participants].map((id) => id.toString());
    const invalidIds = submittedIds.filter((id) => !tripMemberIds.includes(id));

    if (invalidIds.length > 0) {
      return res.status(400).json({ message: "All users must be members of the trip" });
    }

    const expense = await Expense.create({
      trip: tripId,
      amount,
      paidBy,
      participants,
      category,
      description,
    });

    const populatedExpense = await Expense.findById(expense._id)
      .populate("paidBy", "name email")
      .populate("participants", "name email")
      .populate("trip", "name");

    return res.status(201).json(populatedExpense);
  } catch (error) {
    return res.status(500).json({ message: "Unable to add expense" });
  }
};

const getExpensesByTrip = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.tripId);

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    const isMember = trip.members.some((member) => member.toString() === req.user.userId);
    if (!isMember) {
      return res.status(403).json({ message: "You are not part of this trip" });
    }

    const expenses = await Expense.find({ trip: req.params.tripId })
      .populate("paidBy", "name email")
      .populate("participants", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json(expenses);
  } catch (error) {
    return res.status(500).json({ message: "Unable to fetch expenses" });
  }
};

module.exports = { addExpense, getExpensesByTrip };
