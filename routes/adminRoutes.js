// routes/adminRoutes.js
import express from "express";
import {
  createAdmin,
  loginAdmin,
  listAdmins,
  logoutAll,
  getProfile,
  updateProfile,
  changePassword,
} from "../controllers/adminController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Public
router.post("/create", createAdmin);
router.post("/login", loginAdmin);

// Protected
router.get("/me", requireAuth, getProfile);
router.patch("/profile", requireAuth, updateProfile);
router.patch("/password", requireAuth, changePassword);

router.get("/list", requireAuth, listAdmins);
router.post("/logout-all", requireAuth, logoutAll);

export default router;
