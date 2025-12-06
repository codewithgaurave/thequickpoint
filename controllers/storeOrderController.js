import Order from "../models/Order.js";
import Store from "../models/Store.js";

// Middleware to verify store owner (you need to implement based on your auth system)
export const verifyStoreOwner = async (req, res, next) => {
  try {
    const { storeId } = req.params;
    const ownerId = req.user?.id; // Assuming you have user info in req.user
    
    if (!ownerId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    // Find store and check if user is the manager/owner
    const store = await Store.findOne({
      _id: storeId,
      isDeleted: false,
      isActive: true,
    }).lean();

    if (!store) {
      return res.status(404).json({ message: "Store not found." });
    }

    // Simple check: if managerPhone matches user's phone (adjust as per your auth)
    // You might need a better system with proper store-owner relationships
    req.store = store;
    next();
  } catch (err) {
    console.error("verifyStoreOwner error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// GET /api/store-owner/:storeId/orders
// Get orders for a specific store (store owner view)
// --------------------------------------
export const getStoreOrders = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { status, startDate, endDate } = req.query;

    const filter = {
      store: storeId,
      isDeleted: false,
    };

    // Filter by status if provided
    if (status && status !== 'all') {
      filter.status = status;
    }

    // Filter by date range if provided
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    const orders = await Order.find(filter)
      .populate("user", "mobile email fullName")
      .populate("items.product", "name images unit")
      .sort({ createdAt: -1 })
      .lean();

    // Calculate statistics
    const stats = {
      total: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      confirmed: orders.filter(o => o.status === 'confirmed').length,
      shipped: orders.filter(o => o.status === 'shipped').length,
      delivered: orders.filter(o => o.status === 'delivered').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length,
      totalRevenue: orders.reduce((sum, order) => sum + order.grandTotal, 0),
    };

    return res.json({ 
      orders, 
      stats,
      store: req.store 
    });
  } catch (err) {
    console.error("getStoreOrders error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// GET /api/store-owner/:storeId/orders/:orderId
// Get specific order for store owner
// --------------------------------------
export const getStoreOrderById = async (req, res) => {
  try {
    const { storeId, orderId } = req.params;

    const order = await Order.findOne({
      _id: orderId,
      store: storeId,
      isDeleted: false,
    })
      .populate("user", "mobile email fullName address")
      .populate("items.product", "name images unit price offerPrice")
      .lean();

    if (!order) {
      return res.status(404).json({ message: "Order not found for this store." });
    }

    return res.json({ 
      order,
      store: req.store 
    });
  } catch (err) {
    console.error("getStoreOrderById error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// PATCH /api/store-owner/:storeId/orders/:orderId/status
// Update order status (store owner can update to confirmed, shipped, delivered, cancelled)
// --------------------------------------
export const updateStoreOrderStatus = async (req, res) => {
  try {
    const { storeId, orderId } = req.params;
    const { status } = req.body;

    if (!status || !['confirmed', 'shipped', 'delivered', 'cancelled'].includes(status)) {
      return res.status(400).json({ 
        message: "Valid status required: confirmed, shipped, delivered, or cancelled." 
      });
    }

    const order = await Order.findOneAndUpdate(
      { 
        _id: orderId, 
        store: storeId,
        isDeleted: false 
      },
      { 
        status,
        $push: {
          statusHistory: {
            status,
            changedAt: new Date(),
            changedBy: 'store_owner'
          }
        }
      },
      { new: true, runValidators: true }
    )
      .populate("user", "mobile email fullName")
      .populate("items.product", "name images unit")
      .lean();

    if (!order) {
      return res.status(404).json({ message: "Order not found for this store." });
    }

    // Optional: Send notification to user about status change

    return res.json({
      message: `Order status updated to ${status} successfully`,
      order,
      store: req.store,
    });
  } catch (err) {
    console.error("updateStoreOrderStatus error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// GET /api/store-owner/:storeId/dashboard
// Store owner dashboard with stats
// --------------------------------------
export const getStoreDashboard = async (req, res) => {
  try {
    const { storeId } = req.params;
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Today's orders
    const todaysOrders = await Order.find({
      store: storeId,
      isDeleted: false,
      createdAt: { $gte: startOfToday }
    }).lean();

    // Month's orders
    const monthsOrders = await Order.find({
      store: storeId,
      isDeleted: false,
      createdAt: { $gte: startOfMonth }
    }).lean();

    // All orders for statistics
    const allOrders = await Order.find({
      store: storeId,
      isDeleted: false,
    }).lean();

    const dashboard = {
      todaysOrders: {
        count: todaysOrders.length,
        revenue: todaysOrders.reduce((sum, o) => sum + o.grandTotal, 0),
      },
      monthsOrders: {
        count: monthsOrders.length,
        revenue: monthsOrders.reduce((sum, o) => sum + o.grandTotal, 0),
      },
      allTime: {
        totalOrders: allOrders.length,
        totalRevenue: allOrders.reduce((sum, o) => sum + o.grandTotal, 0),
        avgOrderValue: allOrders.length > 0 
          ? allOrders.reduce((sum, o) => sum + o.grandTotal, 0) / allOrders.length 
          : 0,
      },
      statusBreakdown: {
        pending: allOrders.filter(o => o.status === 'pending').length,
        confirmed: allOrders.filter(o => o.status === 'confirmed').length,
        shipped: allOrders.filter(o => o.status === 'shipped').length,
        delivered: allOrders.filter(o => o.status === 'delivered').length,
        cancelled: allOrders.filter(o => o.status === 'cancelled').length,
      },
      store: req.store,
    };

    return res.json({ dashboard });
  } catch (err) {
    console.error("getStoreDashboard error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};