import express from "express";
import {
  getLatestVersion,
  checkUpdate,
  createVersion,
  updateVersion,
  getAllVersions,
  deleteVersion,
  getLatestSave
} from "../controllers/appVersionController.js";
import { requireAdminAuth } from "../middleware/auth.js";

const router = express.Router();

// Public routes (for app to check version)
router.get("/latest", getLatestVersion);
router.post("/check-update", checkUpdate);
router.get("/latest-save", getLatestSave);

// Admin routes (protected)
router.post("/", requireAdminAuth, createVersion);
router.get("/all", requireAdminAuth, getAllVersions);
router.put("/:id", requireAdminAuth, updateVersion);
router.delete("/:id", requireAdminAuth, deleteVersion);

export default router;