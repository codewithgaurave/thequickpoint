// routes/orderRoutes.js
import express from "express";
import {
  checkoutFromCart,
  getMyOrders,
  getMyOrderById,
  adminListOrders,
  adminGetOrderById,
  adminUpdateOrderStatus,
  adminDeleteOrder,
} from "../controllers/orderController.js";
import { requireUserAuth, requireAdminAuth } from "../middleware/auth.js";

const router = express.Router();

// User order routes
router.post("/checkout", requireUserAuth, checkoutFromCart);
router.get("/my", requireUserAuth, getMyOrders);
router.get("/my/:id", requireUserAuth, getMyOrderById);

// Admin order routes
router.get("/", requireAdminAuth, adminListOrders);
router.get("/:id", requireAdminAuth, adminGetOrderById);
router.patch("/:id/status", requireAdminAuth, adminUpdateOrderStatus);
router.delete("/:id", requireAdminAuth, adminDeleteOrder);

export default router;
