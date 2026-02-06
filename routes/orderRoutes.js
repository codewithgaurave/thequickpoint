import express from "express";
import {
  checkoutFromCart,
  checkoutFromStore,
  checkoutWithStoreSelection,
  getActiveStoresForCheckout,
  getMyOrders,
  getMyGlobalOrders,
  getMyStoreOrders,
  getMyOrderById,
  adminListOrders,
  adminGlobalOrders,
  adminStoreOrders,
  adminGetOrderById,
  adminUpdateOrderStatus,
  adminDeleteOrder,
} from "../controllers/orderController.js";
import { requireAdminAuth } from "../middleware/auth.js";

const router = express.Router();

// ✅ User order routes (id-based)
router.post("/checkout", checkoutFromCart);              // POST /api/orders/checkout
router.post("/checkout-with-store-selection", checkoutWithStoreSelection); // POST /api/orders/checkout-with-store-selection
router.post("/store/:storeId/checkout", checkoutFromStore); // POST /api/orders/store/:storeId/checkout

// Get active stores for checkout selection
router.get("/stores/active", getActiveStoresForCheckout); // GET /api/orders/stores/active

router.get("/my", getMyOrders);                         // GET /api/orders/my?userId=...
router.get("/my/global", getMyGlobalOrders);            // GET /api/orders/my/global?userId=...
router.get("/my/store/:storeId", getMyStoreOrders);     // GET /api/orders/my/store/:storeId?userId=...
router.get("/my/:id", getMyOrderById);                  // GET /api/orders/my/:id?userId=...

// ✅ Admin order routes (admin token-based)
router.get("/", requireAdminAuth, adminListOrders);      // GET /api/orders
router.get("/global", requireAdminAuth, adminGlobalOrders); // GET /api/orders/global
router.get("/store/:storeId", requireAdminAuth, adminStoreOrders); // GET /api/orders/store/:storeId
router.get("/:id", requireAdminAuth, adminGetOrderById); // GET /api/orders/:id
router.patch("/:id/status", requireAdminAuth, adminUpdateOrderStatus); // PATCH /api/orders/:id/status
router.delete("/:id", requireAdminAuth, adminDeleteOrder); // DELETE /api/orders/:id

export default router;