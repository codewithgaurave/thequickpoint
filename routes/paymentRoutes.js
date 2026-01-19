import express from "express";
import {
  initiatePayment,
  getPaymentStatus,
  getMyPayments,
  handlePaymentWebhook,
  verifyPayment,
  clearCartAfterPayment,
  testCashfreeConfig,
} from "../controllers/paymentController.js";

const router = express.Router();

router.post("/initiate", initiatePayment);
router.get("/test-cashfree", testCashfreeConfig);
router.get("/status/:paymentId", getPaymentStatus);
router.post("/verify/:paymentId", verifyPayment);
router.post("/clear-cart/:paymentId", clearCartAfterPayment);
router.get("/my", getMyPayments);
router.post("/webhook", handlePaymentWebhook);

export default router;
