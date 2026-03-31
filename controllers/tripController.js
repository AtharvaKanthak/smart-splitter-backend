const Trip = require("../models/Trip");
const User = require("../models/User");

const populateTrip = (tripQuery) =>
  tripQuery
    .populate("createdBy", "name email")
    .populate("members", "name email")
    .populate("invitations.user", "name email")
    .populate("invitations.invitedBy", "name email");

const escapeRegex = (text = "") => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const createTrip = async (req, res) => {
  try {
    const { name, memberIds = [] } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Trip name is required" });
    }

    const uniqueInviteeIds = [...new Set(memberIds)].filter((id) => id !== req.user.userId);
    let invitations = [];

    if (uniqueInviteeIds.length > 0) {
      const users = await User.find({ _id: { $in: uniqueInviteeIds } }).select("_id");
      if (users.length !== uniqueInviteeIds.length) {
        return res.status(400).json({ message: "One or more member IDs are invalid" });
      }

      invitations = uniqueInviteeIds.map((userId) => ({
        user: userId,
        invitedBy: req.user.userId,
        status: "pending",
      }));
    }

    const trip = await Trip.create({
      name,
      createdBy: req.user.userId,
      members: [req.user.userId],
      invitations,
    });

    const populatedTrip = await populateTrip(Trip.findById(trip._id));

    return res.status(201).json(populatedTrip);
  } catch (error) {
    return res.status(500).json({ message: "Unable to create trip" });
  }
};

const getTrips = async (req, res) => {
  try {
    const trips = await populateTrip(Trip.find({ members: req.user.userId }).sort({ createdAt: -1 }));

    return res.status(200).json(trips);
  } catch (error) {
    return res.status(500).json({ message: "Unable to fetch trips" });
  }
};

const getTripById = async (req, res) => {
  try {
    const trip = await populateTrip(Trip.findById(req.params.id));

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    const isMember = trip.members.some((member) => member._id.toString() === req.user.userId);
    if (!isMember) {
      return res.status(403).json({ message: "You are not part of this trip" });
    }

    return res.status(200).json(trip);
  } catch (error) {
    return res.status(500).json({ message: "Unable to fetch trip" });
  }
};

const searchTripInviteCandidates = async (req, res) => {
  try {
    const { q = "" } = req.query;
    const query = q.trim();

    if (query.length < 2) {
      return res.status(200).json([]);
    }

    const trip = await Trip.findById(req.params.id).select("members invitations");

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    const isMember = trip.members.some((memberId) => memberId.toString() === req.user.userId);
    const isPendingInvitee = trip.invitations.some(
      (invitation) => invitation.user.toString() === req.user.userId && invitation.status === "pending"
    );

    if (!isMember && !isPendingInvitee) {
      return res.status(403).json({ message: "You do not have access to this trip" });
    }

    const excludedIds = new Set(trip.members.map((memberId) => memberId.toString()));
    trip.invitations
      .filter((invitation) => invitation.status === "pending")
      .forEach((invitation) => excludedIds.add(invitation.user.toString()));

    const regex = new RegExp(escapeRegex(query), "i");

    const users = await User.find(
      {
        _id: { $nin: [...excludedIds] },
        $or: [{ name: regex }, { email: regex }],
      },
      "name email"
    )
      .sort({ name: 1 })
      .limit(15);

    return res.status(200).json(users);
  } catch (error) {
    return res.status(500).json({ message: "Unable to search users for invitation" });
  }
};

const sendTripInvitation = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    const isMember = trip.members.some((memberId) => memberId.toString() === req.user.userId);
    if (!isMember) {
      return res.status(403).json({ message: "Only trip members can send invitations" });
    }

    if (req.user.userId === userId) {
      return res.status(400).json({ message: "You are already a member of this trip" });
    }

    const userExists = await User.exists({ _id: userId });
    if (!userExists) {
      return res.status(404).json({ message: "User not found" });
    }

    if (trip.members.some((memberId) => memberId.toString() === userId)) {
      return res.status(409).json({ message: "User is already a trip member" });
    }

    const existingInvitation = trip.invitations.find((invitation) => invitation.user.toString() === userId);

    if (existingInvitation?.status === "pending") {
      return res.status(409).json({ message: "Invitation already sent" });
    }

    if (existingInvitation) {
      existingInvitation.status = "pending";
      existingInvitation.invitedBy = req.user.userId;
      existingInvitation.respondedAt = null;
    } else {
      trip.invitations.push({
        user: userId,
        invitedBy: req.user.userId,
        status: "pending",
      });
    }

    await trip.save();

    return res.status(201).json({ message: "Invitation sent" });
  } catch (error) {
    return res.status(500).json({ message: "Unable to send invitation" });
  }
};

const getMyInvitations = async (req, res) => {
  try {
    const trips = await Trip.find({
      invitations: {
        $elemMatch: { user: req.user.userId, status: "pending" },
      },
    })
      .select("name invitations")
      .populate("invitations.invitedBy", "name email");

    const pendingInvitations = trips
      .flatMap((trip) =>
        trip.invitations
          .filter(
            (invitation) =>
              invitation.user.toString() === req.user.userId && invitation.status === "pending"
          )
          .map((invitation) => ({
            invitationId: invitation._id,
            createdAt: invitation.createdAt,
            trip: {
              id: trip._id,
              name: trip.name,
            },
            invitedBy: invitation.invitedBy,
          }))
      )
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.status(200).json(pendingInvitations);
  } catch (error) {
    return res.status(500).json({ message: "Unable to fetch invitations" });
  }
};

const respondToInvitation = async (req, res) => {
  try {
    const { action } = req.body;
    if (!["accept", "reject"].includes(action)) {
      return res.status(400).json({ message: "Action must be accept or reject" });
    }

    const trip = await Trip.findOne({
      "invitations._id": req.params.invitationId,
      "invitations.user": req.user.userId,
    });

    if (!trip) {
      return res.status(404).json({ message: "Invitation not found" });
    }

    const invitation = trip.invitations.id(req.params.invitationId);
    if (!invitation || invitation.user.toString() !== req.user.userId) {
      return res.status(404).json({ message: "Invitation not found" });
    }

    if (invitation.status !== "pending") {
      return res.status(409).json({ message: "Invitation already handled" });
    }

    invitation.status = action === "accept" ? "accepted" : "rejected";
    invitation.respondedAt = new Date();

    if (action === "accept") {
      const alreadyMember = trip.members.some((memberId) => memberId.toString() === req.user.userId);
      if (!alreadyMember) {
        trip.members.push(req.user.userId);
      }
    }

    await trip.save();

    return res.status(200).json({
      message: action === "accept" ? "Invitation accepted" : "Invitation rejected",
      tripId: trip._id,
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to respond to invitation" });
  }
};

module.exports = {
  createTrip,
  getTrips,
  getTripById,
  searchTripInviteCandidates,
  sendTripInvitation,
  getMyInvitations,
  respondToInvitation,
};
