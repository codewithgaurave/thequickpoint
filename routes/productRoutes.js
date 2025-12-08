// routes/productRoutes.js
import express from "express";
import {
  createProduct,
  getActiveProducts,
  getProductByIdPublic,
  adminListProducts,
  adminGetProductById,
  updateProduct,
  updateProductStatus,
  deleteProduct,
  adminListProductsWithStores,
} from "../controllers/productController.js";
import { requireAdminAuth } from "../middleware/auth.js";
import { uploadProductImages } from "../config/cloudinary.js";

const router = express.Router();

// Public
router.get("/", getActiveProducts);
router.get("/:id", getProductByIdPublic);

// Admin (static paths before :id for safety)
router.get("/admin/list/all", requireAdminAuth, adminListProducts);
router.get("/admin/:id", requireAdminAuth, adminGetProductById);

router.post(
  "/",
  requireAdminAuth,
  uploadProductImages, // productImages[] max 3
  createProduct
);

router.patch(
  "/:id",
  requireAdminAuth,
  uploadProductImages, // optional new images
  updateProduct
);

router.patch("/:id/status", requireAdminAuth, updateProductStatus);

router.delete("/:id", requireAdminAuth, deleteProduct);

// routes/productRoutes.js में नया route add करें:

// GET /api/products/admin/list/all - Get all products with store assignments
router.get('/admin/list/all', requireAdminAuth,adminListProductsWithStores);
export default router;
