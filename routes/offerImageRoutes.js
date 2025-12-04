// routes/offerImageRoutes.js
import express from "express";
import {
  createOfferImage,
  getActiveOfferImages,
  adminListOfferImages,
  updateOfferImage,
  updateOfferImageStatus,
  deleteOfferImage,
} from "../controllers/offerImageController.js";
import { requireAdminAuth } from "../middleware/auth.js";
import { uploadOfferImage } from "../config/cloudinary.js";

const router = express.Router();

// Public
router.get("/", getActiveOfferImages);

// Admin (static paths first to avoid conflict with :id)
router.get("/admin", requireAdminAuth, adminListOfferImages);

router.post("/", requireAdminAuth, uploadOfferImage, createOfferImage);

router.patch(
  "/:id",
  requireAdminAuth,
  uploadOfferImage, // optional new image
  updateOfferImage
);

router.patch("/:id/status", requireAdminAuth, updateOfferImageStatus);

router.delete("/:id", requireAdminAuth, deleteOfferImage);

export default router;
