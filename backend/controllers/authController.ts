import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import User from "../models/User";

const generateToken = (id: number): string => {
  const secret = process.env.JWT_SECRET || "default_secret";
  return jwt.sign({ id }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || "24h",
  });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req: Request, res: Response) => {
  try {
    const { username, email, password, firstName, lastName } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        message: "Please provide username, email, and password",
      });
    }

    const existingUser = await User.findOne({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User with this email already exists" });
    }

    const existingUsername = await User.findOne({
      where: { username: username.toLowerCase() },
    });

    if (existingUsername) {
      return res.status(400).json({ message: "Username is already taken" });
    }

    const user = await User.create({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password,
      firstName,
      lastName,
    });

    const token = generateToken(user.id);

    const io = req.app.get("io") as Server | undefined;
    if (io) {
      io.emit("user_registered", { userId: user.id, username: user.username });
    }

    return res.status(201).json({
      message: "User registered successfully",
      user: user.toJSON(),
      token,
    });
  } catch (error: unknown) {
    console.error("Registration error:", error);

    if (
      error instanceof Error &&
      (error as any).name === "SequelizeValidationError"
    ) {
      const sequelizeError = error as any;
      const messages = sequelizeError.errors.map(
        (e: { message: string }) => e.message,
      );
      return res.status(400).json({ message: messages.join(", ") });
    }

    return res
      .status(500)
      .json({ message: "Server error during registration" });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Please provide email and password" });
    }

    const user = await User.findOne({ where: { email: email.toLowerCase() } });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: "Account is deactivated" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = generateToken(user.id);

    const io = req.app.get("io") as Server | undefined;
    if (io) {
      io.emit("user_logged_in", { userId: user.id, username: user.username });
    }

    return res.json({
      message: "Login successful",
      user: user.toJSON(),
      token,
    });
  } catch (error: unknown) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Server error during login" });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getProfile = async (req: Request, res: Response) => {
  try {
    const user = await User.findByPk(req.user?.id, {
      attributes: { exclude: ["password"] },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ user: user.toJSON() });
  } catch (error: unknown) {
    console.error("Get profile error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, username } = req.body;

    const user = await User.findByPk(req.user?.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;

    if (username && username !== user.username) {
      const existingUsername = await User.findOne({
        where: { username: username.toLowerCase() },
      });

      if (existingUsername) {
        return res.status(400).json({ message: "Username is already taken" });
      }
      user.username = username.toLowerCase();
    }

    await user.save();

    const io = req.app.get("io") as Server | undefined;
    if (io) {
      io.to(`user_${user.id}`).emit("profile_refresh");
      io.emit("user_updated", { userId: user.id, username: user.username });
    }

    return res.json({
      message: "Profile updated successfully",
      user: user.toJSON(),
    });
  } catch (error: unknown) {
    console.error("Update profile error:", error);
    return res
      .status(500)
      .json({ message: "Server error during profile update" });
  }
};

export { register, login, getProfile, updateProfile };
