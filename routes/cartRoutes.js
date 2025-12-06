import express from "express";
import {
  getMyCart,
  getCartByStore,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  decreaseCartItem,
  checkoutFromStoreCart,
} from "../controllers/cartController.js";

const router = express.Router();

// Get user's complete cart
router.get("/", getMyCart);                     // GET /api/cart?userId=...

// Get cart items for specific store
router.get("/store/:storeId", getCartByStore);  // GET /api/cart/store/:storeId?userId=...

// Add item to cart (can be global or store-specific)
router.post("/add", addToCart);                 // POST /api/cart/add

// Update cart item
router.patch("/update", updateCartItem);        // PATCH /api/cart/update

// Decrease cart item quantity
router.patch("/decrease", decreaseCartItem);    // PATCH /api/cart/decrease

// Remove item from cart
router.delete("/item/:productId", removeCartItem); // DELETE /api/cart/item/:productId?userId=...&storeId=...

// Clear cart (optionally for specific store)
router.delete("/clear", clearCart);             // DELETE /api/cart/clear?userId=...&storeId=...

// Checkout from specific store cart
router.post("/store/:storeId/checkout", checkoutFromStoreCart); // POST /api/cart/store/:storeId/checkout

export default router;