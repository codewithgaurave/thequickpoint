import express from "express";
import { requireAdminAuth, requireDeliveryBoyAuth } from "../middleware/auth.js";
import {
  createDeliveryBoy,
  adminListDeliveryBoys,
  adminGetDeliveryBoy,
  updateDeliveryBoy,
  updateDeliveryBoyStatus,
  deleteDeliveryBoy,
  requestDeliveryBoyLoginOtp,
  verifyDeliveryBoyOtp,
  logoutDeliveryBoy,
} from "../controllers/deliveryBoyController.js";
import { uploadDeliveryBoy } from "../config/cloudinary.js";

const router = express.Router();

// Driver authentication routes (public)
router.post("/request-otp/login", requestDeliveryBoyLoginOtp);
router.post("/verify-otp", verifyDeliveryBoyOtp);
router.post("/logout", requireDeliveryBoyAuth, logoutDeliveryBoy);

// Admin-facing delivery boy management routes
router.post("/", requireAdminAuth, uploadDeliveryBoy, createDeliveryBoy);
router.get("/admin", requireAdminAuth, adminListDeliveryBoys);
router.get("/admin/:id", requireAdminAuth, adminGetDeliveryBoy);
router.patch("/:id", requireAdminAuth, uploadDeliveryBoy, updateDeliveryBoy);
router.patch("/:id/status", requireAdminAuth, updateDeliveryBoyStatus);
router.delete("/:id", requireAdminAuth, deleteDeliveryBoy);

export default router;
