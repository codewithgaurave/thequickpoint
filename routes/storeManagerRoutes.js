// routes/storeManagerRoutes.js
import express from "express";
import {
  requestStoreManagerOtp,
  verifyStoreManagerOtp,
  getMyStoreProfile,
  updateMyStoreManagerProfile,
  getStoreManagerOrders,
  getAvailableDeliveryBoys,
  assignOrderToDeliveryBoy,
} from "../controllers/storeManagerController.js";
import { requireStoreManagerAuth } from "../middleware/auth.js";

const router = express.Router();

// OTP login
router.post("/request-otp", requestStoreManagerOtp);
router.post("/verify-otp", verifyStoreManagerOtp);

// Logged-in store manager profile
router.get("/me", requireStoreManagerAuth, getMyStoreProfile);
router.patch("/me", requireStoreManagerAuth, updateMyStoreManagerProfile);

// Order & Delivery Boy management
router.get("/orders", requireStoreManagerAuth, getStoreManagerOrders);
router.get("/delivery-boys", requireStoreManagerAuth, getAvailableDeliveryBoys);
router.patch("/orders/:id/assign-delivery", requireStoreManagerAuth, assignOrderToDeliveryBoy);

export default router;
