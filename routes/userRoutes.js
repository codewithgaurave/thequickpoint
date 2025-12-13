import express from "express";
import {
  requestRegisterOtp,
  requestLoginOtp,
  verifyOtp,
  getUserProfile,
  updateUserProfile,
  logoutAllUser,
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
router.get("/profile", getUserProfile);                   // GET: /api/users/profile?userId=USER_ID
router.patch("/profile", uploadUserFields, updateUserProfile); // PATCH: /api/users/profile?userId=USER_ID
router.post("/logout-all", logoutAllUser);                // POST: /api/users/logout-all?userId=USER_ID

// Admin operations on users (admin authentication still required)
router.get("/", adminListUsers);
router.get("/:id", adminGetUser);
router.patch("/:id", adminUpdateUser);
router.patch("/:id/block", adminBlockUser);
router.delete("/:id", adminDeleteUser);

export default router;