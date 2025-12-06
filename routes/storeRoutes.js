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

// NEW: product store controllers and upload helper
import {
  getProductsByStore,
  createProductForStore,
  assignProductToStore,
  unassignProductFromStore,
  updateProductForStore,
  deleteProductForStore,
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
// Create product for a store
router.post(
  "/:storeId/products",
  requireAdminAuth,
  uploadProductImages, // productImages[] max 3
  createProductForStore
);

// Update product for a store
router.patch(
  "/:storeId/products/:productId",
  requireAdminAuth,
  uploadProductImages, // optional new images
  updateProductForStore
);

// Delete product for a store (soft)
router.delete("/:storeId/products/:productId", requireAdminAuth, deleteProductForStore);

// Assign existing product to store
router.patch(
  "/:storeId/products/:productId/assign",
  requireAdminAuth,
  assignProductToStore
);

// Unassign product from store
router.patch(
  "/:storeId/products/:productId/unassign",
  requireAdminAuth,
  unassignProductFromStore
);

// Public: get products by storeId (active only) - put BEFORE the /:id route
router.get("/:storeId/products", getProductsByStore);

// Public routes
router.get("/", getActiveStores);
router.get("/:id", getStoreByIdPublic);

export default router;
