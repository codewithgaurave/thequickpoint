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
import { authenticateAdmin } from "../middleware/auth.js";

const router = express.Router();

// Public routes (for app to check version)
router.get("/latest", getLatestVersion);
router.post("/check-update", checkUpdate);
router.get("/latest-save", getLatestSave);

// Admin routes (protected)
router.post("/", authenticateAdmin, createVersion);
router.get("/all", authenticateAdmin, getAllVersions);
router.put("/:id", authenticateAdmin, updateVersion);
router.delete("/:id", authenticateAdmin, deleteVersion);

export default router;