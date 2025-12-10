import express from "express";
import {
  getAdminDashboard,
  getStoreDashboard,
  getUserDashboard,
  getQuickStats,
  getAnalyticsByPeriod,
} from "../controllers/dashboardController.js";
import { requireUserAuth, requireAdminAuth } from "../middleware/auth.js";
import { requireStoreManagerAuth } from "../middleware/auth.js";

const router = express.Router();

// Public routes (if needed)
// router.get("/public-stats", getQuickStats);

// Admin routes
router.get("/admin", requireAdminAuth, getAdminDashboard);
router.get("/quick-stats", requireAdminAuth, getQuickStats);
router.get("/analytics/period", requireAdminAuth, getAnalyticsByPeriod);

// Store manager routes
router.get("/store/:storeId", getStoreDashboard);

// User routes
router.get("/user/:userId", requireUserAuth, getUserDashboard);

export default router;