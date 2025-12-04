// routes/storeManagerRoutes.js
import express from "express";
import {
  requestStoreManagerOtp,
  verifyStoreManagerOtp,
  getMyStoreProfile,
  updateMyStoreManagerProfile,
} from "../controllers/storeManagerController.js";
import { requireStoreManagerAuth } from "../middleware/auth.js";

const router = express.Router();

// OTP login
router.post("/request-otp", requestStoreManagerOtp);
router.post("/verify-otp", verifyStoreManagerOtp);

// Logged-in store manager profile
router.get("/me", requireStoreManagerAuth, getMyStoreProfile);
router.patch("/me", requireStoreManagerAuth, updateMyStoreManagerProfile);

export default router;
