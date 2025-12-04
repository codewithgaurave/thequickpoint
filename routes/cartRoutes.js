// routes/cartRoutes.js
import express from "express";
import {
  getMyCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} from "../controllers/cartController.js";

const router = express.Router();

// ✅ User id-based (no token)
router.get("/", getMyCart);                     // /api/cart?userId=...
router.post("/add", addToCart);                 // body: { userId, productId, quantity }
router.patch("/update", updateCartItem);        // body: { userId, productId, quantity }
router.delete("/item/:productId", removeCartItem); // /api/cart/item/:productId?userId=...
router.delete("/clear", clearCart);             // /api/cart/clear?userId=...

export default router;
