import Cart from "../models/Cart.js";
import Order from "../models/Order.js";
import Store from "../models/Store.js";

const getUserIdFromReq = (req) => {
  const id =
    req.body.userId ||
    req.query.userId ||
    req.params.userId ||
    "";
  return typeof id === "string" ? id.trim() : id;
};

// --------------------------------------
// POST /api/orders/checkout (Global or Store checkout)
// body: { userId, storeId (optional), ...shippingFields }
// --------------------------------------
export const checkoutFromCart = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    const { storeId } = req.body; // Optional: if checking out from a specific store
    
    if (!userId) {
      return res.status(400).json({ message: "userId is required." });
    }

    const cart = await Cart.findOne({
      user: userId,
      isDeleted: false,
    })
    .populate("items.product")
    .populate("items.store");

    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty." });
    }

    // Filter items based on storeId
    let itemsToCheckout = [];
    let orderStore = null;
    
    if (storeId) {
      // Checkout only items from specific store
      itemsToCheckout = cart.items.filter(item => 
        item.store && String(item.store._id) === String(storeId)
      );
      
      if (itemsToCheckout.length === 0) {
        return res.status(400).json({ 
          message: "No items in cart for this store." 
        });
      }
      
      // Verify store exists
      const store = await Store.findOne({
        _id: storeId,
        isDeleted: false,
        isActive: true,
      }).lean();
      
      if (!store) {
        return res.status(404).json({ message: "Store not found." });
      }
      
      orderStore = storeId;
    } else {
      // Global checkout (items without store)
      itemsToCheckout = cart.items.filter(item => !item.store);
      
      if (itemsToCheckout.length === 0) {
        return res.status(400).json({ 
          message: "No global items in cart. Please specify storeId for store checkout." 
        });
      }
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

    for (const item of itemsToCheckout) {
      const product = item.product;

      if (!product || product.isDeleted || !product.isActive) {
        return res.status(400).json({
          message: `Product ${item.product._id} is no longer available.`,
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
      store: orderStore, // null for global orders
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
          latitude:
            latitude !== undefined && latitude !== null
              ? Number(latitude)
              : undefined,
          longitude:
            longitude !== undefined && longitude !== null
              ? Number(longitude)
              : undefined,
          accuracy:
            accuracy !== undefined && accuracy !== null
              ? Number(accuracy)
              : undefined,
        },
      },
      notes: notes || "",
    });

    // Remove checked out items from cart
    if (storeId) {
      // Remove only store items from cart
      cart.items = cart.items.filter(item => 
        !item.store || String(item.store._id) !== String(storeId)
      );
    } else {
      // Remove only global items from cart
      cart.items = cart.items.filter(item => item.store);
    }
    
    await cart.save();

    const populatedOrder = await Order.findById(order._id)
      .populate("items.product", "name images unit store")
      .populate("store", "storeName managerName managerPhone location")
      .populate("user", "mobile email fullName")
      .lean();

    return res.status(201).json({
      message: orderStore 
        ? `Order placed for ${populatedOrder.store?.storeName || 'store'} successfully`
        : "Global order placed successfully",
      order: populatedOrder,
    });
  } catch (err) {
    console.error("checkoutFromCart error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// POST /api/orders/store/:storeId/checkout
// Checkout from specific store directly
// --------------------------------------
export const checkoutFromStore = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    const { storeId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ message: "userId is required." });
    }

    if (!storeId) {
      return res.status(400).json({ message: "storeId is required." });
    }

    // Verify store
    const store = await Store.findOne({
      _id: storeId,
      isDeleted: false,
      isActive: true,
    }).lean();
    
    if (!store) {
      return res.status(404).json({ message: "Store not found." });
    }

    // Call the main checkout function with storeId
    req.body.storeId = storeId;
    return checkoutFromCart(req, res);
  } catch (err) {
    console.error("checkoutFromStore error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// GET /api/orders/my?userId=...
// Get user's all orders (both global and store)
// --------------------------------------
export const getMyOrders = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) {
      return res.status(400).json({ message: "userId is required." });
    }

    const orders = await Order.find({
      user: userId,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .populate("items.product", "name images unit store")
      .populate("store", "storeName managerName managerPhone location")
      .lean();

    // Separate global and store orders
    const globalOrders = orders.filter(order => !order.store);
    const storeOrders = orders.filter(order => order.store);

    return res.json({ 
      orders,
      organized: {
        globalOrders,
        storeOrders
      }
    });
  } catch (err) {
    console.error("getMyOrders error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// GET /api/orders/my/global?userId=...
// Get only global orders
// --------------------------------------
export const getMyGlobalOrders = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) {
      return res.status(400).json({ message: "userId is required." });
    }

    const orders = await Order.find({
      user: userId,
      store: null,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .populate("items.product", "name images unit")
      .lean();

    return res.json({ orders });
  } catch (err) {
    console.error("getMyGlobalOrders error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// GET /api/orders/my/store/:storeId?userId=...
// Get orders for specific store
// --------------------------------------
export const getMyStoreOrders = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    const { storeId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "userId is required." });
    }

    if (!storeId) {
      return res.status(400).json({ message: "storeId is required." });
    }

    const orders = await Order.find({
      user: userId,
      store: storeId,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .populate("items.product", "name images unit")
      .populate("store", "storeName managerName managerPhone location")
      .lean();

    return res.json({ orders });
  } catch (err) {
    console.error("getMyStoreOrders error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// GET /api/orders/my/:id?userId=...
// --------------------------------------
export const getMyOrderById = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    const { id } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "userId is required." });
    }

    const order = await Order.findOne({
      _id: id,
      user: userId,
      isDeleted: false,
    })
      .populate("items.product", "name images unit store")
      .populate("store", "storeName managerName managerPhone location")
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
// ADMIN: GET /api/orders (all orders)
// --------------------------------------
export const adminListOrders = async (_req, res) => {
  try {
    const orders = await Order.find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .populate("user", "mobile email fullName")
      .populate("store", "storeName managerName")
      .lean();

    // Separate orders
    const globalOrders = orders.filter(order => !order.store);
    const storeOrders = orders.filter(order => order.store);

    return res.json({ 
      orders,
      counts: {
        total: orders.length,
        global: globalOrders.length,
        store: storeOrders.length
      },
      organized: {
        globalOrders,
        storeOrders
      }
    });
  } catch (err) {
    console.error("adminListOrders error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// ADMIN: GET /api/orders/global (only global orders)
// --------------------------------------
export const adminGlobalOrders = async (_req, res) => {
  try {
    const orders = await Order.find({
      store: null,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .populate("user", "mobile email fullName")
      .lean();

    return res.json({ orders });
  } catch (err) {
    console.error("adminGlobalOrders error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// ADMIN: GET /api/orders/store/:storeId (orders for specific store)
// --------------------------------------
export const adminStoreOrders = async (req, res) => {
  try {
    const { storeId } = req.params;

    const orders = await Order.find({
      store: storeId,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .populate("user", "mobile email fullName")
      .populate("store", "storeName managerName")
      .lean();

    return res.json({ orders });
  } catch (err) {
    console.error("adminStoreOrders error:", err);
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
      .populate("store", "storeName managerName managerPhone location")
      .populate("items.product", "name images unit store")
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
      .populate("store", "storeName managerName")
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
// ADMIN: DELETE /api/orders/:id (soft delete)
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