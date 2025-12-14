import express from "express";
import {
  initiatePayment,
  getPaymentStatus,
  getMyPayments,
} from "../controllers/paymentController.js";

const router = express.Router();

router.post("/initiate", initiatePayment);
router.get("/status/:paymentId", getPaymentStatus);
router.get("/my", getMyPayments);

export default router;
