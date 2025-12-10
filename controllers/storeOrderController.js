import Order from "../models/Order.js";
import Store from "../models/Store.js";
import Product from "../models/Product.js";
import mongoose from "mongoose";

// Simple middleware to verify store exists (no authentication required)
export const verifyStoreOwner = async (req, res, next) => {
  try {
    const { storeId } = req.params;
    
    if (!storeId) {
      return res.status(400).json({ 
        success: false,
        message: "storeId is required in the URL." 
      });
    }

    // Validate storeId format
    if (!mongoose.isValidObjectId(storeId)) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid store ID format." 
      });
    }

    // Find store
    const store = await Store.findOne({
      _id: storeId,
      isDeleted: false,
      isActive: true,
    }).lean();

    if (!store) {
      return res.status(404).json({ 
        success: false,
        message: "Store not found or inactive." 
      });
    }

    // Store the store for downstream use
    req.store = store;
    next();
  } catch (err) {
    console.error("verifyStoreOwner error:", err);
    return res.status(500).json({ 
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
};

// --------------------------------------
// GET /api/store-owner/:storeId/dashboard
// Store owner dashboard with stats - PUBLIC ACCESS
// --------------------------------------
export const getStoreDashboard = async (req, res) => {
  try {
    const { storeId } = req.params;
    
    if (!storeId) {
      return res.status(400).json({ 
        success: false,
        message: "storeId is required." 
      });
    }

    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfWeek = new Date(today.setDate(today.getDate() - 7));

    // Use Promise.all for better performance
    const [
      todaysOrders,
      weeksOrders,
      monthsOrders,
      allOrdersStats,
      recentOrders,
      topProducts,
      statusCounts
    ] = await Promise.all([
      // Today's orders
      Order.find({
        store: storeId,
        isDeleted: false,
        createdAt: { $gte: startOfToday }
      }).lean(),
      
      // This week's orders
      Order.find({
        store: storeId,
        isDeleted: false,
        createdAt: { $gte: startOfWeek }
      }).lean(),
      
      // This month's orders
      Order.find({
        store: storeId,
        isDeleted: false,
        createdAt: { $gte: startOfMonth }
      }).lean(),
      
      // All time statistics
      Order.aggregate([
        { 
          $match: {
            store: new mongoose.Types.ObjectId(storeId),
            isDeleted: false
          } 
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$grandTotal" },
            avgOrderValue: { $avg: "$grandTotal" },
            totalOrders: { $sum: 1 }
          }
        }
      ]),
      
      // Recent orders (last 10)
      Order.find({
        store: storeId,
        isDeleted: false
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("user", "mobile fullName")
        .select("grandTotal status paymentStatus createdAtIST")
        .lean(),
      
      // Top selling products
      Order.aggregate([
        {
          $match: {
            store: new mongoose.Types.ObjectId(storeId),
            isDeleted: false,
            status: { $ne: "cancelled" }
          }
        },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.product",
            productName: { $first: "$items.name" },
            totalSold: { $sum: "$items.quantity" },
            totalRevenue: { $sum: "$items.lineTotal" }
          }
        },
        { $sort: { totalSold: -1 } },
        { $limit: 5 }
      ]),
      
      // Get all status counts in parallel
      Promise.all([
        Order.countDocuments({ store: storeId, isDeleted: false, status: 'pending' }),
        Order.countDocuments({ store: storeId, isDeleted: false, status: 'confirmed' }),
        Order.countDocuments({ store: storeId, isDeleted: false, status: 'shipped' }),
        Order.countDocuments({ store: storeId, isDeleted: false, status: 'delivered' }),
        Order.countDocuments({ store: storeId, isDeleted: false, status: 'cancelled' })
      ])
    ]);

    const stats = allOrdersStats[0] || {
      totalRevenue: 0,
      avgOrderValue: 0,
      totalOrders: 0
    };

    // Populate product details for top products
    const topProductsWithDetails = await Promise.all(
      topProducts.map(async (item) => {
        try {
          const product = await Product.findById(item._id)
            .select("name images price offerPrice unit")
            .lean();
          
          return {
            product: {
              id: item._id,
              name: product?.name || item.productName,
              images: product?.images || [],
              price: product?.price || 0,
              offerPrice: product?.offerPrice || 0,
              unit: product?.unit || "piece"
            },
            totalSold: item.totalSold,
            totalRevenue: item.totalRevenue
          };
        } catch (error) {
          console.warn(`Product not found for ID: ${item._id}`);
          return {
            product: {
              id: item._id,
              name: item.productName || "Unknown Product",
              images: [],
              price: 0,
              offerPrice: 0,
              unit: "piece"
            },
            totalSold: item.totalSold,
            totalRevenue: item.totalRevenue
          };
        }
      })
    );

    const dashboard = {
      summary: {
        today: {
          orders: todaysOrders.length,
          revenue: todaysOrders.reduce((sum, o) => sum + o.grandTotal, 0)
        },
        week: {
          orders: weeksOrders.length,
          revenue: weeksOrders.reduce((sum, o) => sum + o.grandTotal, 0)
        },
        month: {
          orders: monthsOrders.length,
          revenue: monthsOrders.reduce((sum, o) => sum + o.grandTotal, 0)
        },
        allTime: {
          totalOrders: stats.totalOrders,
          totalRevenue: stats.totalRevenue,
          avgOrderValue: stats.avgOrderValue.toFixed(2)
        }
      },
      statusBreakdown: {
        pending: statusCounts[0],
        confirmed: statusCounts[1],
        shipped: statusCounts[2],
        delivered: statusCounts[3],
        cancelled: statusCounts[4]
      },
      recentOrders: recentOrders,
      topProducts: topProductsWithDetails,
      store: req.store || { id: storeId }
    };

    return res.json({ 
      success: true,
      message: "Store dashboard data fetched successfully",
      dashboard 
    });
  } catch (err) {
    console.error("getStoreDashboard error:", err);
    return res.status(500).json({ 
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
};

// --------------------------------------
// GET /api/store-owner/:storeId/orders
// Get orders for a specific store (store owner view) - PUBLIC ACCESS
// --------------------------------------
export const getStoreOrders = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { status, startDate, endDate, page = 1, limit = 20 } = req.query;

    if (!storeId) {
      return res.status(400).json({ 
        success: false,
        message: "storeId is required." 
      });
    }

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

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [orders, totalOrders] = await Promise.all([
      Order.find(filter)
        .populate("user", "mobile email fullName")
        .populate("items.product", "name images unit")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Order.countDocuments(filter)
    ]);

    // Calculate statistics
    const stats = {
      total: totalOrders,
      pending: await Order.countDocuments({ ...filter, status: 'pending' }),
      confirmed: await Order.countDocuments({ ...filter, status: 'confirmed' }),
      shipped: await Order.countDocuments({ ...filter, status: 'shipped' }),
      delivered: await Order.countDocuments({ ...filter, status: 'delivered' }),
      cancelled: await Order.countDocuments({ ...filter, status: 'cancelled' }),
      totalRevenue: (await Order.aggregate([
        { $match: filter },
        { $group: { _id: null, total: { $sum: "$grandTotal" } } }
      ]))[0]?.total || 0,
    };

    return res.json({ 
      success: true,
      message: "Store orders fetched successfully",
      orders, 
      stats,
      store: req.store,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalOrders,
        pages: Math.ceil(totalOrders / limitNum)
      }
    });
  } catch (err) {
    console.error("getStoreOrders error:", err);
    return res.status(500).json({ 
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
};

// --------------------------------------
// GET /api/store-owner/:storeId/orders/:orderId
// Get specific order for store owner - PUBLIC ACCESS
// --------------------------------------
export const getStoreOrderById = async (req, res) => {
  try {
    const { storeId, orderId } = req.params;

    if (!storeId || !orderId) {
      return res.status(400).json({ 
        success: false,
        message: "storeId and orderId are required." 
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      store: storeId,
      isDeleted: false,
    })
      .populate("user", "mobile email fullName")
      .populate("items.product", "name images unit price offerPrice")
      .lean();

    if (!order) {
      return res.status(404).json({ 
        success: false,
        message: "Order not found for this store." 
      });
    }

    return res.json({ 
      success: true,
      message: "Order details fetched successfully",
      order,
      store: req.store 
    });
  } catch (err) {
    console.error("getStoreOrderById error:", err);
    return res.status(500).json({ 
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
};

// --------------------------------------
// PATCH /api/store-owner/:storeId/orders/:orderId/status
// Update order status - PUBLIC ACCESS (with simple validation)
// --------------------------------------
export const updateStoreOrderStatus = async (req, res) => {
  try {
    const { storeId, orderId } = req.params;
    const { status, verificationCode } = req.body; // Add verification if needed

    if (!storeId || !orderId) {
      return res.status(400).json({ 
        success: false,
        message: "storeId and orderId are required." 
      });
    }

    if (!status || !['confirmed', 'shipped', 'delivered', 'cancelled'].includes(status)) {
      return res.status(400).json({ 
        success: false,
        message: "Valid status required: confirmed, shipped, delivered, or cancelled." 
      });
    }

    // Optional: Add verification logic here if needed
    // For example, require a verification code to update status
    // if (!verificationCode || verificationCode !== 'YOUR_SECRET_CODE') {
    //   return res.status(401).json({ 
    //     success: false,
    //     message: "Verification code required to update order status." 
    //   });
    // }

    const order = await Order.findOneAndUpdate(
      { 
        _id: orderId, 
        store: storeId,
        isDeleted: false 
      },
      { 
        status,
        updatedAt: new Date(),
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
      return res.status(404).json({ 
        success: false,
        message: "Order not found for this store." 
      });
    }

    return res.json({
      success: true,
      message: `Order status updated to ${status} successfully`,
      order,
      store: req.store,
    });
  } catch (err) {
    console.error("updateStoreOrderStatus error:", err);
    return res.status(500).json({ 
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
};