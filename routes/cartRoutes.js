// routes/cartRoutes.js
import express from "express";
import {
  getMyCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} from "../controllers/cartController.js";
import { requireUserAuth } from "../middleware/auth.js";

const router = express.Router();

// All cart routes are user-protected
router.get("/", requireUserAuth, getMyCart);
router.post("/add", requireUserAuth, addToCart);
router.patch("/update", requireUserAuth, updateCartItem);
router.delete("/item/:productId", requireUserAuth, removeCartItem);
router.delete("/clear", requireUserAuth, clearCart);

export default router;
