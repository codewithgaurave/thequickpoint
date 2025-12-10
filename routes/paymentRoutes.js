import express from "express";
import {
  initiatePayment,
  verifyPayment,
  completePayment,
  failPayment,
  getPaymentStatus,
  getMyPayments,
  linkPaymentToOrder,
  getPaymentAnalytics,
} from "../controllers/paymentController.js";
import { requireAdminAuth } from "../middleware/auth.js";

const router = express.Router();

// Payment flow
router.post("/initiate", initiatePayment); // POST /api/payments/initiate
router.post("/verify", verifyPayment); // POST /api/payments/verify
router.post("/complete", completePayment); // POST /api/payments/complete (for testing)
router.post("/fail", failPayment); // POST /api/payments/fail (for testing)

// Payment status and history
router.get("/status/:paymentId", getPaymentStatus); // GET /api/payments/status/:paymentId
router.get("/my", getMyPayments); // GET /api/payments/my?userId=...

// Link payment to order (call after successful checkout)
router.patch("/:paymentId/link-order", linkPaymentToOrder); // PATCH /api/payments/:paymentId/link-order

// Analytics (Admin only)
router.get("/analytics", requireAdminAuth, getPaymentAnalytics); // GET /api/payments/analytics

export default router;