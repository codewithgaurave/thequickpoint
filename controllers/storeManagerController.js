// controllers/storeManagerController.js
import jwt from "jsonwebtoken";
import Store from "../models/Store.js";
import Order from "../models/Order.js";
import DeliveryBoy from "../models/deliveryBoyModel.js";

const JWT_SECRET = process.env.JWT_SECRET;
const MANAGER_JWT_EXPIRES_IN =
  process.env.MANAGER_JWT_EXPIRES_IN || "7d";

// sign JWT for store manager
const signStoreManagerJwt = (store) =>
  jwt.sign(
    {
      sub: String(store._id),
      type: "storeManager",
      managerPhone: store.managerPhone,
      storeName: store.storeName,
    },
    JWT_SECRET,
    { expiresIn: MANAGER_JWT_EXPIRES_IN }
  );

// --------------------------------------
// POST /api/store-managers/request-otp
// --------------------------------------
export const requestStoreManagerOtp = async (req, res) => {
  try {
    const { managerPhone } = req.body;

    if (!managerPhone || !managerPhone.trim()) {
      return res
        .status(400)
        .json({ message: "managerPhone is required." });
    }

    const store = await Store.findOne({
      managerPhone: managerPhone.trim(),
      isDeleted: false,
    }).lean();

    if (!store) {
      return res
        .status(404)
        .json({ message: "Store manager not found for this phone." });
    }

    if (!store.isActive) {
      return res
        .status(403)
        .json({ message: "Store is blocked/inactive. Contact admin." });
    }

    // Abhi ke liye OTP fix
    const otp = "123456";

    return res.json({
      message: "OTP sent successfully (for dev: always 123456).",
      // devOtp: otp, // optional: hata bhi sakte ho production me
    });
  } catch (err) {
    console.error("requestStoreManagerOtp error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// POST /api/store-managers/verify-otp
// --------------------------------------
export const verifyStoreManagerOtp = async (req, res) => {
  try {
    const { managerPhone, otp } = req.body;

    if (!managerPhone || !managerPhone.trim() || !otp) {
      return res.status(400).json({
        message: "managerPhone and otp are required.",
      });
    }

    // Fixed OTP check
    if (otp !== "123456") {
      return res.status(400).json({ message: "Invalid OTP." });
    }

    const store = await Store.findOne({
      managerPhone: managerPhone.trim(),
      isDeleted: false,
    }).lean();

    if (!store) {
      return res
        .status(404)
        .json({ message: "Store manager not found for this phone." });
    }

    if (!store.isActive) {
      return res
        .status(403)
        .json({ message: "Store is blocked/inactive. Contact admin." });
    }

    const token = signStoreManagerJwt(store);

    return res.json({
      message: "Login successful",
      token,
      store: {
        id: store._id,
        storeName: store.storeName,
        storeImageUrl: store.storeImageUrl,
        managerName: store.managerName,
        managerPhone: store.managerPhone,
        managerEmail: store.managerEmail,
        location: store.location,
        isActive: store.isActive,
      },
    });
  } catch (err) {
    console.error("verifyStoreManagerOtp error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// GET /api/store-managers/me  (store manager)
// --------------------------------------
export const getMyStoreProfile = async (req, res) => {
  try {
    const storeId = req.storeManager?.id;

    if (!storeId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const store = await Store.findOne({
      _id: storeId,
      isDeleted: false,
    }).lean();

    if (!store) {
      return res.status(404).json({ message: "Store not found" });
    }

    return res.json({
      store: {
        id: store._id,
        storeName: store.storeName,
        storeImageUrl: store.storeImageUrl,
        managerName: store.managerName,
        managerPhone: store.managerPhone,
        managerEmail: store.managerEmail,
        location: store.location,
        storeCode: store.storeCode,
        openingHours: store.openingHours,
        notes: store.notes,
        isActive: store.isActive,
      },
    });
  } catch (err) {
    console.error("getMyStoreProfile error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// PATCH /api/store-managers/me  (manager update own profile)
// --------------------------------------
export const updateMyStoreManagerProfile = async (req, res) => {
  try {
    const storeId = req.storeManager?.id;
    if (!storeId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { managerName, managerPhone, managerEmail } = req.body;

    const update = {};

    if (managerName !== undefined) {
      if (!managerName.trim()) {
        return res
          .status(400)
          .json({ message: "managerName cannot be empty." });
      }
      update.managerName = managerName.trim();
    }

    if (managerPhone !== undefined) {
      if (!managerPhone.trim()) {
        return res
          .status(400)
          .json({ message: "managerPhone cannot be empty." });
      }

      // ensure unique
      const existing = await Store.findOne({
        managerPhone: managerPhone.trim(),
        _id: { $ne: storeId },
        isDeleted: false,
      }).lean();

      if (existing) {
        return res.status(409).json({
          message:
            "This managerPhone is already used by another store. Please use a different phone.",
        });
      }

      update.managerPhone = managerPhone.trim();
    }

    if (managerEmail !== undefined) {
      update.managerEmail = managerEmail.trim().toLowerCase();
    }

    const store = await Store.findOneAndUpdate(
      { _id: storeId, isDeleted: false },
      update,
      { new: true, runValidators: true }
    ).lean();

    if (!store) {
      return res.status(404).json({ message: "Store not found" });
    }

    return res.json({
      message: "Profile updated successfully",
      store: {
        id: store._id,
        storeName: store.storeName,
        storeImageUrl: store.storeImageUrl,
        managerName: store.managerName,
        managerPhone: store.managerPhone,
        managerEmail: store.managerEmail,
        location: store.location,
        storeCode: store.storeCode,
        openingHours: store.openingHours,
        notes: store.notes,
        isActive: store.isActive,
      },
    });
  } catch (err) {
    console.error("updateMyStoreManagerProfile error:", err);
    if (err.code === 11000 && err.keyPattern?.managerPhone) {
      return res
        .status(409)
        .json({ message: "managerPhone already in use for another store." });
    }
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// GET /api/store-managers/orders
// --------------------------------------
export const getStoreManagerOrders = async (req, res) => {
  try {
    const storeId = req.storeManager?.id;

    if (!storeId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { status } = req.query;
    const filter = {
      store: storeId,
      isDeleted: false,
    };

    if (status && status !== 'all') {
      filter.status = status;
    }

    const orders = await Order.find(filter)
      .populate("user", "mobile email fullName")
      .populate("items.product", "name images unit")
      .populate("deliveryBoy", "name phone profileImageUrl isActive")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (err) {
    console.error("getStoreManagerOrders error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// --------------------------------------
// GET /api/store-managers/delivery-boys
// --------------------------------------
export const getAvailableDeliveryBoys = async (req, res) => {
  try {
    const storeId = req.storeManager?.id;

    if (!storeId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const deliveryBoys = await DeliveryBoy.find({
      isActive: true,
      isDeleted: false,
    })
      .select("name phone profileImageUrl vehicleType isActive")
      .lean();

    return res.json({
      success: true,
      count: deliveryBoys.length,
      deliveryBoys,
    });
  } catch (err) {
    console.error("getAvailableDeliveryBoys error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// --------------------------------------
// PATCH /api/store-managers/orders/:id/assign-delivery
// --------------------------------------
export const assignOrderToDeliveryBoy = async (req, res) => {
  try {
    const storeId = req.storeManager?.id;
    const { id: orderId } = req.params;
    const { deliveryBoyId } = req.body;

    if (!storeId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!orderId) {
      return res.status(400).json({ success: false, message: "Order ID is required." });
    }

    if (!deliveryBoyId) {
      return res.status(400).json({ success: false, message: "Delivery Boy ID is required." });
    }

    const order = await Order.findOne({ _id: orderId, store: storeId, isDeleted: false });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found for your store." });
    }

    const boy = await DeliveryBoy.findOne({ _id: deliveryBoyId, isDeleted: false });
    if (!boy) {
      return res.status(404).json({ success: false, message: "Delivery Boy not found" });
    }

    if (!boy.isActive) {
      return res.status(400).json({ success: false, message: "Delivery Boy is inactive" });
    }

    order.deliveryBoy = deliveryBoyId;

    if (order.status === "pending") {
      order.status = "confirmed";
    }

    await order.save();

    const populatedOrder = await Order.findById(order._id)
      .populate("user", "mobile email fullName")
      .populate("deliveryBoy", "name phone profileImageUrl isActive")
      .populate("items.product", "name images unit")
      .lean();

    return res.json({
      success: true,
      message: "Delivery boy assigned successfully",
      order: populatedOrder,
    });
  } catch (err) {
    console.error("assignOrderToDeliveryBoy error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
