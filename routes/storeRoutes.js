// routes/storeRoutes.js
import express from "express";
import {
  createStore,
  getActiveStores,
  getStoreByIdPublic,
  adminListStores,
  adminGetStoreById,
  updateStore,
  updateStoreStatus,
  deleteStore,
} from "../controllers/storeController.js";
import { requireAdminAuth } from "../middleware/auth.js";
import { uploadStoreImage } from "../config/cloudinary.js";

const router = express.Router();

// Admin routes
router.get("/admin", requireAdminAuth, adminListStores);
router.get("/admin/:id", requireAdminAuth, adminGetStoreById);

router.post("/", requireAdminAuth, uploadStoreImage, createStore);
router.patch("/:id", requireAdminAuth, uploadStoreImage, updateStore);
router.patch("/:id/status", requireAdminAuth, updateStoreStatus);
router.delete("/:id", requireAdminAuth, deleteStore);

// Public routes
router.get("/", getActiveStores);
router.get("/:id", getStoreByIdPublic);

export default router;
