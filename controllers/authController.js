const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const createToken = (user) => {
  return jwt.sign(
    { userId: user._id, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

const register = async (req, res) => {
  try {
    const { name, email, password, upiId } = req.body;

    if (!name || !email || !password || !upiId) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      upiId: upiId.trim(),
    });

    const token = createToken(user);

    return res.status(201).json({
      message: "Registered successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        upiId: user.upiId,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Registration failed" });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = createToken(user);

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        upiId: user.upiId,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Login failed" });
  }
};

const searchUsers = async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    const limit = Math.min(Number(req.query.limit) || 15, 25);

    if (q.length < 2) {
      return res.status(200).json([]);
    }

    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

    const users = await User.find(
      {
        _id: { $ne: req.user.userId },
        $or: [{ name: regex }, { email: regex }],
      },
      "name email"
    )
      .sort({ name: 1 })
      .limit(limit);

    return res.status(200).json(users);
  } catch (error) {
    return res.status(500).json({ message: "Unable to search users" });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, upiId } = req.body;
    const userId = req.user.userId;

    if (!name || !upiId) {
      return res.status(400).json({ message: "Name and UPI ID are required" });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { name: name.trim(), upiId: upiId.trim() },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        upiId: user.upiId,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update profile" });
  }
};

module.exports = { register, login, searchUsers, updateProfile };
