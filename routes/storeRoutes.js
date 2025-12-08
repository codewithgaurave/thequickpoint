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

import {
  getProductsByStore,
  createProductForStore,
  assignProductToStore,
  unassignProductFromStore,
  updateProductForStore,
} from "../controllers/productController.js";
import { uploadProductImages } from "../config/cloudinary.js";

const router = express.Router();

// Admin routes
router.get("/admin", requireAdminAuth, adminListStores);
router.get("/admin/:id", requireAdminAuth, adminGetStoreById);

router.post("/", requireAdminAuth, uploadStoreImage, createStore);
router.patch("/:id", requireAdminAuth, uploadStoreImage, updateStore);
router.patch("/:id/status", requireAdminAuth, updateStoreStatus);
router.delete("/:id", requireAdminAuth, deleteStore);

// Admin: store-scoped product management
router.post(
  "/:storeId/products",
  requireAdminAuth,
  uploadProductImages,
  createProductForStore
);

router.patch(
  "/:storeId/products/:productId",
  requireAdminAuth,
  uploadProductImages,
  updateProductForStore
);

// router.delete("/:storeId/products/:productId", requireAdminAuth, deleteProductForStore);

router.patch(
  "/:storeId/products/:productId/assign",
  requireAdminAuth,
  assignProductToStore
);

router.patch(
  "/:storeId/products/:productId/unassign",
  requireAdminAuth,
  unassignProductFromStore
);

// Public: get products by storeId (active only)
router.get("/:storeId/products", getProductsByStore);

// Public routes
router.get("/", getActiveStores);
router.get("/:id", getStoreByIdPublic);

export default router;