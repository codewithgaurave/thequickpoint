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
import { requireAdminAuth } from "../middleware/auth.js";

const router = express.Router();

// ✅ User order routes (id-based)
router.post("/checkout", checkoutFromCart); // body: { userId, ... }
router.get("/my", getMyOrders);             // /api/orders/my?userId=...
router.get("/my/:id", getMyOrderById);      // /api/orders/my/:id?userId=...

// ✅ Admin order routes (admin token-based)
router.get("/", requireAdminAuth, adminListOrders);
router.get("/:id", requireAdminAuth, adminGetOrderById);
router.patch("/:id/status", requireAdminAuth, adminUpdateOrderStatus);
router.delete("/:id", requireAdminAuth, adminDeleteOrder);

export default router;
