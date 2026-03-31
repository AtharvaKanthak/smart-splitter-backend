const Trip = require("../models/Trip");
const Expense = require("../models/Expense");
const { buildSettlement } = require("../utils/settlement");

const getSettlementByTrip = async (req, res) => {
  try {
    const { tripId } = req.params;

    const trip = await Trip.findById(tripId).populate("members", "name email upiId");
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    const isMember = trip.members.some((member) => member._id.toString() === req.user.userId);
    if (!isMember) {
      return res.status(403).json({ message: "You are not part of this trip" });
    }

    const expenses = await Expense.find({ trip: tripId })
      .populate("paidBy", "name email")
      .populate("participants", "name email");

    const settlement = buildSettlement(trip.members, expenses);

    return res.status(200).json({
      trip: {
        id: trip._id,
        name: trip.name,
      },
      members: trip.members,
      ...settlement,
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to calculate settlement" });
  }
};

module.exports = { getSettlementByTrip };
