const Message = require("../models/Message");
const Trip = require("../models/Trip");

const isTripMember = (trip, userId) =>
  trip.members.some((memberId) => memberId.toString() === userId);

const getTripMessages = async (req, res) => {
  try {
    const { tripId } = req.params;
    const limit = Math.min(Number(req.query.limit) || 80, 150);

    const trip = await Trip.findById(tripId).select("members name");
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    if (!isTripMember(trip, req.user.userId)) {
      return res.status(403).json({ message: "You are not part of this trip" });
    }

    const messages = await Message.find({ trip: tripId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("sender", "name email")
      .lean();

    return res.status(200).json({
      trip: { id: trip._id, name: trip.name },
      messages: messages.reverse(),
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to fetch chat messages" });
  }
};

const sendTripMessage = async (req, res) => {
  try {
    const { tripId } = req.params;
    const text = (req.body.text || "").trim();

    if (!text) {
      return res.status(400).json({ message: "Message text is required" });
    }

    const trip = await Trip.findById(tripId).select("members");
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    if (!isTripMember(trip, req.user.userId)) {
      return res.status(403).json({ message: "You are not part of this trip" });
    }

    const message = await Message.create({
      trip: tripId,
      sender: req.user.userId,
      text,
    });

    const populatedMessage = await Message.findById(message._id).populate("sender", "name email");
    return res.status(201).json(populatedMessage);
  } catch (error) {
    return res.status(500).json({ message: "Unable to send message" });
  }
};

module.exports = {
  getTripMessages,
  sendTripMessage,
};