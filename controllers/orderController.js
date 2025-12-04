// controllers/orderController.js
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";

// --------------------------------------
// POST /api/orders/checkout  (user)
// Body: shipping + location + paymentMethod (all optional)
// --------------------------------------
export const checkoutFromCart = async (req, res) => {
  try {
    const userId = req.user.sub;

    const cart = await Cart.findOne({
      user: userId,
      isDeleted: false,
    }).populate("items.product");

    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty." });
    }

    const {
      fullName,
      mobile,
      email,
      addressLine1,
      addressLine2,
      landmark,
      city,
      state,
      pincode,
      country,
      latitude,
      longitude,
      accuracy,
      paymentMethod,
      notes,
    } = req.body;

    const orderItems = [];
    let subtotal = 0;
    let grandTotal = 0;

    for (const item of cart.items) {
      const product = item.product;

      if (!product || product.isDeleted || !product.isActive) {
        return res.status(400).json({
          message: `Product ${item.product} is no longer available.`,
        });
      }

      const qty = item.quantity;
      const price = product.price;
      const offerPrice =
        product.offerPrice !== undefined && product.offerPrice !== null
          ? product.offerPrice
          : price;

      const lineSubtotal = price * qty;
      const lineTotal = offerPrice * qty;

      subtotal += lineSubtotal;
      grandTotal += lineTotal;

      let percentageOff = 0;
      if (price > 0 && offerPrice < price) {
        percentageOff = Math.round(((price - offerPrice) / price) * 100);
      }

      orderItems.push({
        product: product._id,
        name: product.name,
        images: product.images || [],
        unit: product.unit || "piece",
        quantity: qty,
        price,
        offerPrice,
        percentageOff,
        lineTotal,
      });
    }

    const totalDiscount = subtotal - grandTotal;

    const order = await Order.create({
      user: userId,
      items: orderItems,
      subtotal,
      totalDiscount,
      grandTotal,
      paymentMethod: paymentMethod || "cod",
      shippingAddress: {
        fullName: fullName || "",
        mobile: mobile || "",
        email: email || "",
        addressLine1: addressLine1 || "",
        addressLine2: addressLine2 || "",
        landmark: landmark || "",
        city: city || "",
        state: state || "",
        pincode: pincode || "",
        country: country || "India",
        location: {
          latitude: latitude !== undefined ? Number(latitude) : undefined,
          longitude: longitude !== undefined ? Number(longitude) : undefined,
          accuracy: accuracy !== undefined ? Number(accuracy) : undefined,
        },
      },
      notes: notes || "",
    });

    // Clear cart after order
    cart.items = [];
    await cart.save();

    const populatedOrder = await Order.findById(order._id)
      .populate("items.product", "name images unit")
      .populate("user", "mobile email fullName")
      .lean();

    return res.status(201).json({
      message: "Order placed successfully",
      order: populatedOrder,
    });
  } catch (err) {
    console.error("checkoutFromCart error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// GET /api/orders/my  (user) - list my orders
// --------------------------------------
export const getMyOrders = async (req, res) => {
  try {
    const userId = req.user.sub;

    const orders = await Order.find({
      user: userId,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .populate("items.product", "name images unit")
      .lean();

    return res.json({ orders });
  } catch (err) {
    console.error("getMyOrders error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// GET /api/orders/my/:id  (user) - single order
// --------------------------------------
export const getMyOrderById = async (req, res) => {
  try {
    const userId = req.user.sub;
    const { id } = req.params;

    const order = await Order.findOne({
      _id: id,
      user: userId,
      isDeleted: false,
    })
      .populate("items.product", "name images unit")
      .lean();

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    return res.json({ order });
  } catch (err) {
    console.error("getMyOrderById error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// ADMIN: GET /api/orders  (list all)
// --------------------------------------
export const adminListOrders = async (_req, res) => {
  try {
    const orders = await Order.find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .populate("user", "mobile email fullName")
      .lean();

    return res.json({ orders });
  } catch (err) {
    console.error("adminListOrders error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// ADMIN: GET /api/orders/:id
// --------------------------------------
export const adminGetOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findOne({ _id: id, isDeleted: false })
      .populate("user", "mobile email fullName")
      .populate("items.product", "name images unit")
      .lean();

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    return res.json({ order });
  } catch (err) {
    console.error("adminGetOrderById error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// ADMIN: PATCH /api/orders/:id/status
// body: { status, paymentStatus }
// --------------------------------------
export const adminUpdateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paymentStatus } = req.body;

    const update = {};
    if (status !== undefined) update.status = status;
    if (paymentStatus !== undefined) update.paymentStatus = paymentStatus;

    const order = await Order.findOneAndUpdate(
      { _id: id, isDeleted: false },
      update,
      { new: true, runValidators: true }
    )
      .populate("user", "mobile email fullName")
      .populate("items.product", "name images unit")
      .lean();

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    return res.json({
      message: "Order updated successfully",
      order,
    });
  } catch (err) {
    console.error("adminUpdateOrderStatus error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// ADMIN: DELETE /api/orders/:id  (soft delete)
// --------------------------------------
export const adminDeleteOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { isDeleted: true },
      { new: true }
    ).lean();

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    return res.json({
      message: "Order deleted (soft) successfully",
    });
  } catch (err) {
    console.error("adminDeleteOrder error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
