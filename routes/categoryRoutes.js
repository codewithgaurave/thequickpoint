// routes/categoryRoutes.js
import express from "express";
import {
  createCategory,
  getActiveCategories,
  adminListCategories,
  getCategoryById,
  updateCategory,
  updateCategoryStatus,
  deleteCategory,
} from "../controllers/categoryController.js";
import { requireAdminAuth } from "../middleware/auth.js";
import { uploadCategoryImage } from "../config/cloudinary.js";

const router = express.Router();

// Public
router.get("/", getActiveCategories);

// Admin list (static path first)
router.get("/admin", requireAdminAuth, adminListCategories);

// Admin update status
router.patch("/:id/status", requireAdminAuth, updateCategoryStatus);

// Admin create, update, delete
router.post("/", requireAdminAuth, uploadCategoryImage, createCategory);

router.patch(
  "/:id",
  requireAdminAuth,
  uploadCategoryImage, // optional new image
  updateCategory
);

router.delete("/:id", requireAdminAuth, deleteCategory);

// Public/admin get by id
router.get("/:id", getCategoryById);

export default router;
