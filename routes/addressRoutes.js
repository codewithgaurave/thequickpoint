import express from "express";
import {
  createAddress,
  getMyAddresses,
  getMyDefaultAddress,
  getAddressById,
  updateAddress,
  setDefaultAddress,
  deleteAddress,
} from "../controllers/addressController.js";

const router = express.Router();

// POST /api/addresses - Create new address
router.post("/", createAddress);

// GET /api/addresses/my - Get user's addresses
router.post("/my", getMyAddresses);

// GET /api/addresses/my/default - Get default address
router.get("/my/default", getMyDefaultAddress);

// GET /api/addresses/:id - Get address by ID
router.get("/:id", getAddressById);

// PATCH /api/addresses/:id - Update address
router.patch("/:id", updateAddress);

// PATCH /api/addresses/:id/set-default - Set as default
router.patch("/:id/set-default", setDefaultAddress);

// DELETE /api/addresses/:id - Delete address
router.post("/:id", deleteAddress);

export default router;