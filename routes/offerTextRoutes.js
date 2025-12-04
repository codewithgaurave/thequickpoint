// routes/offerTextRoutes.js
import express from "express";
import {
  createOfferText,
  getActiveOfferTexts,
  adminListOfferTexts,
  getOfferTextById,
  updateOfferText,
  updateOfferTextStatus,
  deleteOfferText,
} from "../controllers/offerTextController.js";
import { requireAdminAuth } from "../middleware/auth.js";

const router = express.Router();

// Public
router.get("/", getActiveOfferTexts);

// Admin
router.get("/admin", requireAdminAuth, adminListOfferTexts);

router.post("/", requireAdminAuth, createOfferText);

router.patch("/:id/status", requireAdminAuth, updateOfferTextStatus);

router.patch("/:id", requireAdminAuth, updateOfferText);

router.delete("/:id", requireAdminAuth, deleteOfferText);

// Public/Admin both can use
router.get("/:id", getOfferTextById);

export default router;
