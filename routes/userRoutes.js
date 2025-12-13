import express from "express";
import {
  requestRegisterOtp,
  requestLoginOtp,
  verifyOtp,
  getUserProfileById,
  updateUserProfileById,
  logoutAllUserById,
  adminListUsers,
  adminGetUser,
  adminUpdateUser,
  adminBlockUser,
  adminDeleteUser,
} from "../controllers/userController.js";
import { uploadUserFields } from "../config/cloudinary.js";

const router = express.Router();

// Public (OTP flow)
router.post("/request-otp/register", requestRegisterOtp); // Register screen
router.post("/request-otp/login", requestLoginOtp);       // Login screen
router.post("/verify-otp", verifyOtp);

// ID-based user operations (no authentication required)
router.get("/:id/profile", getUserProfileById);           // Get user profile by ID
router.patch("/:id/profile", uploadUserFields, updateUserProfileById); // Update profile by ID
router.post("/:id/logout-all", logoutAllUserById);        // Logout all sessions by ID

// Admin operations on users (admin authentication still required)
router.get("/", adminListUsers);
router.get("/:id", adminGetUser);
router.patch("/:id", adminUpdateUser);
router.patch("/:id/block", adminBlockUser);
router.delete("/:id", adminDeleteUser);

export default router;