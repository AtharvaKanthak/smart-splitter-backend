const express = require("express");
const { register, login, searchUsers, updateProfile } = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/users/search", authMiddleware, searchUsers);
router.put("/profile", authMiddleware, updateProfile);

module.exports = router;
