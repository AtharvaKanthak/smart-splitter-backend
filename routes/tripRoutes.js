const express = require("express");
const {
	createTrip,
	getTrips,
	getTripById,
	searchTripInviteCandidates,
	sendTripInvitation,
	getMyInvitations,
	respondToInvitation,
} = require("../controllers/tripController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/create", authMiddleware, createTrip);
router.get("/", authMiddleware, getTrips);
router.get("/invitations/me", authMiddleware, getMyInvitations);
router.post("/invitations/:invitationId/respond", authMiddleware, respondToInvitation);
router.get("/:id/invite/search-users", authMiddleware, searchTripInviteCandidates);
router.post("/:id/invitations", authMiddleware, sendTripInvitation);
router.get("/:id", authMiddleware, getTripById);

module.exports = router;
