import express from "express";
import { requireAdminAuth } from "../middleware/auth.js";
import {
  createDeliveryBoy,
  adminListDeliveryBoys,
  adminGetDeliveryBoy,
  updateDeliveryBoy,
  updateDeliveryBoyStatus,
  deleteDeliveryBoy,
} from "../controllers/deliveryBoyController.js";
import { uploadDeliveryBoy } from "../config/cloudinary.js";

const router = express.Router();

router.post("/", requireAdminAuth, uploadDeliveryBoy, createDeliveryBoy);
router.get("/admin", requireAdminAuth, adminListDeliveryBoys);
router.get("/admin/:id", requireAdminAuth, adminGetDeliveryBoy);
router.patch("/:id", requireAdminAuth, uploadDeliveryBoy, updateDeliveryBoy);
router.patch("/:id/status", requireAdminAuth, updateDeliveryBoyStatus);
router.delete("/:id", requireAdminAuth, deleteDeliveryBoy);

export default router;
