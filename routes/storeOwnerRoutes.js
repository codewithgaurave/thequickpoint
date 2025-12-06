import express from "express";
import {
  getStoreOrders,
  getStoreOrderById,
  updateStoreOrderStatus,
  getStoreDashboard,
} from "../controllers/storeOrderController.js";
import { verifyStoreOwner } from "../controllers/storeOrderController.js";

const router = express.Router();

// All routes require store owner authentication
router.use("/:storeId", verifyStoreOwner);

// Dashboard
router.get("/:storeId/dashboard", getStoreDashboard);  // GET /api/store-owner/:storeId/dashboard

// Orders
router.get("/:storeId/orders", getStoreOrders);        // GET /api/store-owner/:storeId/orders
router.get("/:storeId/orders/:orderId", getStoreOrderById); // GET /api/store-owner/:storeId/orders/:orderId
router.patch("/:storeId/orders/:orderId/status", updateStoreOrderStatus); // PATCH /api/store-owner/:storeId/orders/:orderId/status

export default router;