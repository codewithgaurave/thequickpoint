// routes/userRoutes.js
import express from "express";
import {
  requestOtp,
  verifyOtp,
  getMyProfile,
  updateMyProfile,
  logoutAllUser,
  adminListUsers,
  adminGetUser,
  adminUpdateUser,
  adminBlockUser,
  adminDeleteUser,
} from "../controllers/userController.js";
import { requireUserAuth, requireAdminAuth } from "../middleware/auth.js";
import { uploadUserFields } from "../config/cloudinary.js";

const router = express.Router();

// Public (OTP flow)
router.post("/request-otp", requestOtp);
router.post("/verify-otp", verifyOtp);

// User protected
router.get("/me", requireUserAuth, getMyProfile);
router.patch(
  "/me",
  requireUserAuth,
  uploadUserFields,
  updateMyProfile
);
router.post("/logout-all", requireUserAuth, logoutAllUser);

// Admin operations on users
router.get("/", requireAdminAuth, adminListUsers);
router.get("/:id", requireAdminAuth, adminGetUser);
router.patch("/:id", requireAdminAuth, adminUpdateUser);
router.patch("/:id/block", requireAdminAuth, adminBlockUser);
router.delete("/:id", requireAdminAuth, adminDeleteUser);

export default router;
