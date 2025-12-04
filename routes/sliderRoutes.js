// routes/sliderRoutes.js
import express from "express";
import {
  createSlider,
  getActiveSliders,
  adminListSliders,
  getSliderById,
  updateSlider,
  updateSliderStatus,
  deleteSlider,
} from "../controllers/sliderController.js";
import { requireAdminAuth } from "../middleware/auth.js";
import { uploadSliderImage } from "../config/cloudinary.js";

const router = express.Router();

// Public
router.get("/", getActiveSliders);
router.get("/:id", getSliderById);

// Admin
router.get("/admin/list/all", requireAdminAuth, adminListSliders); // optional path
// OR you prefer: /api/sliders/admin
// router.get("/admin", requireAdminAuth, adminListSliders);

router.post("/", requireAdminAuth, uploadSliderImage, createSlider);

router.patch(
  "/:id",
  requireAdminAuth,
  uploadSliderImage, // optional new image
  updateSlider
);

router.patch("/:id/status", requireAdminAuth, updateSliderStatus);

router.delete("/:id", requireAdminAuth, deleteSlider);

export default router;
