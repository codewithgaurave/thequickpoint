import mongoose from "mongoose";
import User from "../models/User.js";
import Store from "../models/Store.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import Category from "../models/Category.js";

// --------------------------------------
// GET /api/dashboard/admin
// Admin Dashboard - Complete Statistics
// --------------------------------------
export const getAdminDashboard = async (req, res) => {
  try {
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const startOfWeek = new Date(today.setDate(today.getDate() - 7));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    // Parallel API calls for better performance
    const [
      totalUsers,
      totalStores,
      totalProducts,
      totalCategories,
      totalOrders,
      todayUsers,
      todayStores,
      todayProducts,
      todayCategories,
      todayOrders,
      activeUsers,
      activeStores,
      activeProducts,
      activeCategories,
      blockedUsers,
      blockedStores,
      blockedProducts,
      blockedCategories,
      recentUsers,
      recentStores,
      recentProducts,
      recentOrders,
      revenueStats,
      orderStatusStats,
      paymentStatusStats,
      productStockAlerts,
      storeWiseOrders,
      categoryWiseProducts,
    ] = await Promise.all([
      // Total counts
      User.countDocuments({ isDeleted: false }),
      Store.countDocuments({ isDeleted: false }),
      Product.countDocuments({ isDeleted: false }),
      Category.countDocuments({ isDeleted: false }),
      Order.countDocuments({ isDeleted: false }),

      // Today's counts
      User.countDocuments({ 
        isDeleted: false, 
        createdAt: { $gte: startOfToday } 
      }),
      Store.countDocuments({ 
        isDeleted: false, 
        createdAt: { $gte: startOfToday } 
      }),
      Product.countDocuments({ 
        isDeleted: false, 
        createdAt: { $gte: startOfToday } 
      }),
      Category.countDocuments({ 
        isDeleted: false, 
        createdAt: { $gte: startOfToday } 
      }),
      Order.countDocuments({ 
        isDeleted: false, 
        createdAt: { $gte: startOfToday } 
      }),

      // Active counts
      User.countDocuments({ isDeleted: false, isBlocked: false }),
      Store.countDocuments({ isDeleted: false, isActive: true }),
      Product.countDocuments({ isDeleted: false, isActive: true }),
      Category.countDocuments({ isDeleted: false, isActive: true }),

      // Blocked counts
      User.countDocuments({ isDeleted: false, isBlocked: true }),
      Store.countDocuments({ isDeleted: false, isActive: false }),
      Product.countDocuments({ isDeleted: false, isActive: false }),
      Category.countDocuments({ isDeleted: false, isActive: false }),

      // Recent data (last 10 records)
      User.find({ isDeleted: false })
        .sort({ createdAt: -1 })
        .limit(10)
        .select("mobile email fullName profileImageUrl createdAtIST isBlocked")
        .lean(),
      Store.find({ isDeleted: false })
        .sort({ createdAt: -1 })
        .limit(10)
        .select("storeName storeImageUrl managerPhone location.address city state isActive")
        .lean(),
      Product.find({ isDeleted: false })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("category", "title")
        .populate("store", "storeName")
        .select("name images price offerPrice stockQuantity unit isActive")
        .lean(),
      Order.find({ isDeleted: false })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("user", "mobile fullName")
        .populate("store", "storeName")
        .select("grandTotal status paymentStatus paymentMethod createdAtIST")
        .lean(),

      // Revenue statistics
      Order.aggregate([
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$grandTotal" },
            avgOrderValue: { $avg: "$grandTotal" },
            minOrderValue: { $min: "$grandTotal" },
            maxOrderValue: { $max: "$grandTotal" },
            todayRevenue: {
              $sum: {
                $cond: [
                  { $gte: ["$createdAt", startOfToday] },
                  "$grandTotal",
                  0
                ]
              }
            },
            weekRevenue: {
              $sum: {
                $cond: [
                  { $gte: ["$createdAt", startOfWeek] },
                  "$grandTotal",
                  0
                ]
              }
            },
            monthRevenue: {
              $sum: {
                $cond: [
                  { $gte: ["$createdAt", startOfMonth] },
                  "$grandTotal",
                  0
                ]
              }
            },
            yearRevenue: {
              $sum: {
                $cond: [
                  { $gte: ["$createdAt", startOfYear] },
                  "$grandTotal",
                  0
                ]
              }
            },
          }
        }
      ]),

      // Order status breakdown
      Order.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),

      // Payment status breakdown
      Order.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: "$paymentStatus", count: { $sum: 1 } } }
      ]),

      // Low stock products
      Product.find({
        isDeleted: false,
        isActive: true,
        stockQuantity: { $lt: 10 }
      })
        .sort({ stockQuantity: 1 })
        .limit(10)
        .populate("category", "title")
        .populate("store", "storeName")
        .select("name images price stockQuantity unit")
        .lean(),

      // Store-wise order counts
      Order.aggregate([
        { $match: { isDeleted: false, store: { $ne: null } } },
        {
          $group: {
            _id: "$store",
            orderCount: { $sum: 1 },
            totalRevenue: { $sum: "$grandTotal" }
          }
        },
        { $sort: { orderCount: -1 } },
        { $limit: 10 }
      ]),

      // Category-wise product counts
      Product.aggregate([
        { $match: { isDeleted: false, isActive: true } },
        {
          $group: {
            _id: "$category",
            productCount: { $sum: 1 },
            avgPrice: { $avg: "$price" }
          }
        },
        { $sort: { productCount: -1 } },
        { $limit: 10 }
      ]),
    ]);

    // Process aggregate results
    const revenueData = revenueStats[0] || {
      totalRevenue: 0,
      avgOrderValue: 0,
      minOrderValue: 0,
      maxOrderValue: 0,
      todayRevenue: 0,
      weekRevenue: 0,
      monthRevenue: 0,
      yearRevenue: 0,
    };

    const orderStatus = {};
    orderStatusStats.forEach(item => {
      orderStatus[item._id] = item.count;
    });

    const paymentStatus = {};
    paymentStatusStats.forEach(item => {
      paymentStatus[item._id] = item.count;
    });

    // Populate store names for store-wise orders
    const storeOrdersWithDetails = await Promise.all(
      storeWiseOrders.map(async (item) => {
        const store = await Store.findById(item._id)
          .select("storeName storeImageUrl managerName")
          .lean();
        return {
          store: {
            id: item._id,
            storeName: store?.storeName || "Unknown Store",
            storeImageUrl: store?.storeImageUrl,
            managerName: store?.managerName,
          },
          orderCount: item.orderCount,
          totalRevenue: item.totalRevenue,
        };
      })
    );

    // Populate category names for category-wise products
    const categoryProductsWithDetails = await Promise.all(
      categoryWiseProducts.map(async (item) => {
        const category = await Category.findById(item._id)
          .select("title imageUrl")
          .lean();
        return {
          category: {
            id: item._id,
            title: category?.title || "Unknown Category",
            imageUrl: category?.imageUrl,
          },
          productCount: item.productCount,
          avgPrice: item.avgPrice,
        };
      })
    );

    // Weekly statistics (last 7 days)
    const weeklyData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const startOfDay = new Date(date.setHours(0, 0, 0, 0));
      const endOfDay = new Date(date.setHours(23, 59, 59, 999));

      const [dayOrders, dayRevenue] = await Promise.all([
        Order.countDocuments({
          isDeleted: false,
          createdAt: { $gte: startOfDay, $lte: endOfDay }
        }),
        Order.aggregate([
          {
            $match: {
              isDeleted: false,
              createdAt: { $gte: startOfDay, $lte: endOfDay }
            }
          },
          { $group: { _id: null, revenue: { $sum: "$grandTotal" } } }
        ])
      ]);

      weeklyData.push({
        date: startOfDay.toISOString().split('T')[0],
        orders: dayOrders,
        revenue: dayRevenue[0]?.revenue || 0,
      });
    }

    const dashboard = {
      summary: {
        users: {
          total: totalUsers,
          today: todayUsers,
          active: activeUsers,
          blocked: blockedUsers,
          growth: todayUsers > 0 ? ((todayUsers / totalUsers) * 100).toFixed(2) : 0,
        },
        stores: {
          total: totalStores,
          today: todayStores,
          active: activeStores,
          blocked: blockedStores,
          growth: todayStores > 0 ? ((todayStores / totalStores) * 100).toFixed(2) : 0,
        },
        products: {
          total: totalProducts,
          today: todayProducts,
          active: activeProducts,
          blocked: blockedProducts,
          growth: todayProducts > 0 ? ((todayProducts / totalProducts) * 100).toFixed(2) : 0,
        },
        categories: {
          total: totalCategories,
          today: todayCategories,
          active: activeCategories,
          blocked: blockedCategories,
          growth: todayCategories > 0 ? ((todayCategories / totalCategories) * 100).toFixed(2) : 0,
        },
        orders: {
          total: totalOrders,
          today: todayOrders,
          growth: todayOrders > 0 ? ((todayOrders / totalOrders) * 100).toFixed(2) : 0,
        },
      },

      revenue: {
        total: revenueData.totalRevenue,
        today: revenueData.todayRevenue,
        week: revenueData.weekRevenue,
        month: revenueData.monthRevenue,
        year: revenueData.yearRevenue,
        averageOrderValue: revenueData.avgOrderValue,
        minOrderValue: revenueData.minOrderValue,
        maxOrderValue: revenueData.maxOrderValue,
        weeklyData,
      },

      orders: {
        status: {
          pending: orderStatus.pending || 0,
          confirmed: orderStatus.confirmed || 0,
          shipped: orderStatus.shipped || 0,
          delivered: orderStatus.delivered || 0,
          cancelled: orderStatus.cancelled || 0,
          total: totalOrders,
        },
        payment: {
          pending: paymentStatus.pending || 0,
          paid: paymentStatus.paid || 0,
          failed: paymentStatus.failed || 0,
          refunded: paymentStatus.refunded || 0,
        },
      },

      alerts: {
        lowStockProducts: productStockAlerts.length,
        blockedUsers: blockedUsers,
        blockedStores: blockedStores,
        blockedProducts: blockedProducts,
      },

      analytics: {
        storePerformance: storeOrdersWithDetails,
        categoryPerformance: categoryProductsWithDetails,
        userEngagement: {
          ordersPerUser: totalUsers > 0 ? (totalOrders / totalUsers).toFixed(2) : 0,
          revenuePerUser: totalUsers > 0 ? (revenueData.totalRevenue / totalUsers).toFixed(2) : 0,
        },
      },

      recentActivities: {
        users: recentUsers,
        stores: recentStores,
        products: recentProducts,
        orders: recentOrders,
      },

      charts: {
        orderStatusChart: {
          labels: ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'],
          data: [
            orderStatus.pending || 0,
            orderStatus.confirmed || 0,
            orderStatus.shipped || 0,
            orderStatus.delivered || 0,
            orderStatus.cancelled || 0,
          ],
        },
        paymentStatusChart: {
          labels: ['Pending', 'Paid', 'Failed', 'Refunded'],
          data: [
            paymentStatus.pending || 0,
            paymentStatus.paid || 0,
            paymentStatus.failed || 0,
            paymentStatus.refunded || 0,
          ],
        },
        weeklyRevenueChart: {
          labels: weeklyData.map(d => d.date),
          data: weeklyData.map(d => d.revenue),
        },
      },
    };

    return res.json({
      success: true,
      message: "Admin dashboard data fetched successfully",
      timestamp: new Date().toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour12: true,
      }),
      dashboard,
    });
  } catch (err) {
    console.error("getAdminDashboard error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// --------------------------------------
// GET /api/dashboard/store/:storeId
// Store-specific Dashboard
// --------------------------------------
export const getStoreDashboard = async (req, res) => {
  try {
    const { storeId } = req.params;

    if (!storeId) {
      return res.status(400).json({ message: "storeId is required." });
    }

    const store = await Store.findOne({
      _id: storeId,
      isDeleted: false,
    }).lean();

    if (!store) {
      return res.status(404).json({ message: "Store not found." });
    }

    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const startOfWeek = new Date(today.setDate(today.getDate() - 7));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      storeProducts,
      totalOrders,
      totalRevenue,
      todayOrders,
      todayRevenue,
      weekOrders,
      weekRevenue,
      monthOrders,
      monthRevenue,
      orderStatusStats,
      topProducts,
      recentOrders,
    ] = await Promise.all([
      // Store products
      Product.countDocuments({
        store: storeId,
        isDeleted: false,
        isActive: true,
      }),

      // Order statistics
      Order.countDocuments({
        store: storeId,
        isDeleted: false,
      }),
      Order.aggregate([
        {
          $match: {
            store: mongoose.Types.ObjectId(storeId),
            isDeleted: false,
          },
        },
        { $group: { _id: null, total: { $sum: "$grandTotal" } } },
      ]),
      Order.countDocuments({
        store: storeId,
        isDeleted: false,
        createdAt: { $gte: startOfToday },
      }),
      Order.aggregate([
        {
          $match: {
            store: mongoose.Types.ObjectId(storeId),
            isDeleted: false,
            createdAt: { $gte: startOfToday },
          },
        },
        { $group: { _id: null, total: { $sum: "$grandTotal" } } },
      ]),
      Order.countDocuments({
        store: storeId,
        isDeleted: false,
        createdAt: { $gte: startOfWeek },
      }),
      Order.aggregate([
        {
          $match: {
            store: mongoose.Types.ObjectId(storeId),
            isDeleted: false,
            createdAt: { $gte: startOfWeek },
          },
        },
        { $group: { _id: null, total: { $sum: "$grandTotal" } } },
      ]),
      Order.countDocuments({
        store: storeId,
        isDeleted: false,
        createdAt: { $gte: startOfMonth },
      }),
      Order.aggregate([
        {
          $match: {
            store: mongoose.Types.ObjectId(storeId),
            isDeleted: false,
            createdAt: { $gte: startOfMonth },
          },
        },
        { $group: { _id: null, total: { $sum: "$grandTotal" } } },
      ]),

      // Order status breakdown
      Order.aggregate([
        {
          $match: {
            store: mongoose.Types.ObjectId(storeId),
            isDeleted: false,
          },
        },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),

      // Top selling products
      Order.aggregate([
        {
          $match: {
            store: mongoose.Types.ObjectId(storeId),
            isDeleted: false,
            status: { $ne: "cancelled" },
          },
        },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.product",
            productName: { $first: "$items.name" },
            totalSold: { $sum: "$items.quantity" },
            totalRevenue: { $sum: "$items.lineTotal" },
          },
        },
        { $sort: { totalSold: -1 } },
        { $limit: 10 },
      ]),

      // Recent orders
      Order.find({
        store: storeId,
        isDeleted: false,
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("user", "mobile fullName")
        .select("grandTotal status paymentStatus createdAtIST")
        .lean(),
    ]);

    const orderStatus = {};
    orderStatusStats.forEach(item => {
      orderStatus[item._id] = item.count;
    });

    // Populate product details for top products
    const topProductsWithDetails = await Promise.all(
      topProducts.map(async (item) => {
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
            unit: product?.unit || "piece",
          },
          totalSold: item.totalSold,
          totalRevenue: item.totalRevenue,
        };
      })
    );

    const dashboard = {
      store: {
        id: store._id,
        storeName: store.storeName,
        storeImageUrl: store.storeImageUrl,
        managerName: store.managerName,
        managerPhone: store.managerPhone,
        isActive: store.isActive,
      },

      summary: {
        products: storeProducts,
        orders: {
          total: totalOrders,
          today: todayOrders,
          week: weekWeek,
          month: monthOrders,
        },
        revenue: {
          total: totalRevenue[0]?.total || 0,
          today: todayRevenue[0]?.total || 0,
          week: weekRevenue[0]?.total || 0,
          month: monthRevenue[0]?.total || 0,
          avgOrderValue: totalOrders > 0 ? (totalRevenue[0]?.total || 0) / totalOrders : 0,
        },
      },

      orders: {
        status: {
          pending: orderStatus.pending || 0,
          confirmed: orderStatus.confirmed || 0,
          shipped: orderStatus.shipped || 0,
          delivered: orderStatus.delivered || 0,
          cancelled: orderStatus.cancelled || 0,
        },
      },

      topProducts: topProductsWithDetails,
      recentOrders: recentOrders,
    };

    return res.json({
      success: true,
      message: "Store dashboard data fetched successfully",
      dashboard,
    });
  } catch (err) {
    console.error("getStoreDashboard error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// --------------------------------------
// GET /api/dashboard/user/:userId
// User-specific Dashboard
// --------------------------------------
export const getUserDashboard = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "userId is required." });
    }

    const user = await User.findOne({
      _id: userId,
      isDeleted: false,
    }).lean();

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const [
      totalOrders,
      totalSpent,
      pendingOrders,
      deliveredOrders,
      cancelledOrders,
      favoriteStores,
      recentOrders,
      cartItems,
    ] = await Promise.all([
      // Order counts
      Order.countDocuments({
        user: userId,
        isDeleted: false,
      }),
      Order.aggregate([
        {
          $match: {
            user: mongoose.Types.ObjectId(userId),
            isDeleted: false,
            status: { $ne: "cancelled" },
          },
        },
        { $group: { _id: null, total: { $sum: "$grandTotal" } } },
      ]),
      Order.countDocuments({
        user: userId,
        isDeleted: false,
        status: "pending",
      }),
      Order.countDocuments({
        user: userId,
        isDeleted: false,
        status: "delivered",
      }),
      Order.countDocuments({
        user: userId,
        isDeleted: false,
        status: "cancelled",
      }),

      // Favorite stores (stores with most orders)
      Order.aggregate([
        {
          $match: {
            user: mongoose.Types.ObjectId(userId),
            isDeleted: false,
            store: { $ne: null },
          },
        },
        {
          $group: {
            _id: "$store",
            orderCount: { $sum: 1 },
            lastOrderDate: { $max: "$createdAt" },
          },
        },
        { $sort: { orderCount: -1 } },
        { $limit: 5 },
      ]),

      // Recent orders
      Order.find({
        user: userId,
        isDeleted: false,
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("store", "storeName storeImageUrl")
        .select("grandTotal status paymentStatus createdAtIST")
        .lean(),

      // Cart items count
      Order.aggregate([
        {
          $match: {
            user: mongoose.Types.ObjectId(userId),
            isDeleted: false,
          },
        },
        { $unwind: "$items" },
        {
          $group: {
            _id: null,
            totalItems: { $sum: "$items.quantity" },
            uniqueProducts: { $addToSet: "$items.product" },
          },
        },
      ]),
    ]);

    // Populate store details for favorite stores
    const favoriteStoresWithDetails = await Promise.all(
      favoriteStores.map(async (item) => {
        const store = await Store.findById(item._id)
          .select("storeName storeImageUrl location.address managerName")
          .lean();
        return {
          store: {
            id: item._id,
            storeName: store?.storeName || "Unknown Store",
            storeImageUrl: store?.storeImageUrl,
            address: store?.location?.address,
            managerName: store?.managerName,
          },
          orderCount: item.orderCount,
          lastOrderDate: item.lastOrderDate,
        };
      })
    );

    const dashboard = {
      user: {
        id: user._id,
        mobile: user.mobile,
        fullName: user.fullName,
        email: user.email,
        profileImageUrl: user.profileImageUrl,
        isBlocked: user.isBlocked,
      },

      summary: {
        orders: {
          total: totalOrders,
          pending: pendingOrders,
          delivered: deliveredOrders,
          cancelled: cancelledOrders,
          successRate: totalOrders > 0 ? ((deliveredOrders / totalOrders) * 100).toFixed(2) : 0,
        },
        spending: {
          total: totalSpent[0]?.total || 0,
          avgOrderValue: totalOrders > 0 ? (totalSpent[0]?.total || 0) / totalOrders : 0,
        },
        cart: {
          totalItems: cartItems[0]?.totalItems || 0,
          uniqueProducts: cartItems[0]?.uniqueProducts?.length || 0,
        },
      },

      favorites: {
        stores: favoriteStoresWithDetails,
      },

      recentOrders: recentOrders,
    };

    return res.json({
      success: true,
      message: "User dashboard data fetched successfully",
      dashboard,
    });
  } catch (err) {
    console.error("getUserDashboard error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// --------------------------------------
// GET /api/dashboard/quick-stats
// Quick Stats (for dashboard widgets)
// --------------------------------------
export const getQuickStats = async (req, res) => {
  try {
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      totalUsers,
      totalStores,
      totalProducts,
      totalOrders,
      todayUsers,
      todayStores,
      todayProducts,
      todayOrders,
      monthRevenue,
      pendingOrders,
      lowStockProducts,
      activeUsers,
    ] = await Promise.all([
      // Total counts
      User.countDocuments({ isDeleted: false }),
      Store.countDocuments({ isDeleted: false, isActive: true }),
      Product.countDocuments({ isDeleted: false, isActive: true }),
      Order.countDocuments({ isDeleted: false }),

      // Today's counts
      User.countDocuments({ 
        isDeleted: false, 
        createdAt: { $gte: startOfToday } 
      }),
      Store.countDocuments({ 
        isDeleted: false, 
        isActive: true,
        createdAt: { $gte: startOfToday } 
      }),
      Product.countDocuments({ 
        isDeleted: false, 
        isActive: true,
        createdAt: { $gte: startOfToday } 
      }),
      Order.countDocuments({ 
        isDeleted: false, 
        createdAt: { $gte: startOfToday } 
      }),

      // Monthly revenue
      Order.aggregate([
        {
          $match: {
            isDeleted: false,
            createdAt: { $gte: startOfMonth },
            status: { $ne: "cancelled" },
          },
        },
        { $group: { _id: null, revenue: { $sum: "$grandTotal" } } },
      ]),

      // Pending orders
      Order.countDocuments({
        isDeleted: false,
        status: "pending",
      }),

      // Low stock products
      Product.countDocuments({
        isDeleted: false,
        isActive: true,
        stockQuantity: { $lt: 10 },
      }),

      // Active users (users who placed orders in last 30 days)
      Order.distinct("user", {
        isDeleted: false,
        createdAt: { $gte: new Date(today.setDate(today.getDate() - 30)) },
      }),
    ]);

    const stats = {
      users: {
        total: totalUsers,
        today: todayUsers,
        active: activeUsers.length,
        growth: todayUsers > 0 ? ((todayUsers / totalUsers) * 100).toFixed(1) : "0",
      },
      stores: {
        total: totalStores,
        today: todayStores,
        growth: todayStores > 0 ? ((todayStores / totalStores) * 100).toFixed(1) : "0",
      },
      products: {
        total: totalProducts,
        today: todayProducts,
        growth: todayProducts > 0 ? ((todayProducts / totalProducts) * 100).toFixed(1) : "0",
      },
      orders: {
        total: totalOrders,
        today: todayOrders,
        pending: pendingOrders,
        growth: todayOrders > 0 ? ((todayOrders / totalOrders) * 100).toFixed(1) : "0",
      },
      revenue: {
        month: monthRevenue[0]?.revenue || 0,
        formatted: new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
        }).format(monthRevenue[0]?.revenue || 0),
      },
      alerts: {
        lowStock: lowStockProducts,
        pendingOrders: pendingOrders,
      },
    };

    return res.json({
      success: true,
      message: "Quick stats fetched successfully",
      timestamp: new Date().toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour12: true,
      }),
      stats,
    });
  } catch (err) {
    console.error("getQuickStats error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// --------------------------------------
// GET /api/dashboard/analytics/period
// Analytics for specific period
// Query params: type=day|week|month|year, startDate, endDate
// --------------------------------------
export const getAnalyticsByPeriod = async (req, res) => {
  try {
    const { type, startDate, endDate } = req.query;

    let start, end;
    const today = new Date();

    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      switch (type) {
        case 'day':
          start = new Date(today.setHours(0, 0, 0, 0));
          end = new Date(today.setHours(23, 59, 59, 999));
          break;
        case 'week':
          start = new Date(today.setDate(today.getDate() - 7));
          end = new Date();
          break;
        case 'month':
          start = new Date(today.getFullYear(), today.getMonth(), 1);
          end = new Date();
          break;
        case 'year':
          start = new Date(today.getFullYear(), 0, 1);
          end = new Date();
          break;
        default:
          start = new Date(today.setDate(today.getDate() - 30));
          end = new Date();
      }
    }

    const [
      usersData,
      storesData,
      productsData,
      ordersData,
      revenueData,
      orderStatusData,
      topProducts,
      topStores,
    ] = await Promise.all([
      // Users analytics
      User.aggregate([
        {
          $match: {
            isDeleted: false,
            createdAt: { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Stores analytics
      Store.aggregate([
        {
          $match: {
            isDeleted: false,
            isActive: true,
            createdAt: { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Products analytics
      Product.aggregate([
        {
          $match: {
            isDeleted: false,
            isActive: true,
            createdAt: { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Orders analytics
      Order.aggregate([
        {
          $match: {
            isDeleted: false,
            createdAt: { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            count: { $sum: 1 },
            revenue: { $sum: "$grandTotal" },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Revenue analytics
      Order.aggregate([
        {
          $match: {
            isDeleted: false,
            status: { $ne: "cancelled" },
            createdAt: { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            revenue: { $sum: "$grandTotal" },
            orders: { $sum: 1 },
            avgOrderValue: { $avg: "$grandTotal" },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Order status breakdown
      Order.aggregate([
        {
          $match: {
            isDeleted: false,
            createdAt: { $gte: start, $lte: end },
          },
        },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),

      // Top products by revenue
      Order.aggregate([
        {
          $match: {
            isDeleted: false,
            status: { $ne: "cancelled" },
            createdAt: { $gte: start, $lte: end },
          },
        },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.product",
            productName: { $first: "$items.name" },
            revenue: { $sum: "$items.lineTotal" },
            quantity: { $sum: "$items.quantity" },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 10 },
      ]),

      // Top stores by orders
      Order.aggregate([
        {
          $match: {
            isDeleted: false,
            store: { $ne: null },
            createdAt: { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id: "$store",
            orders: { $sum: 1 },
            revenue: { $sum: "$grandTotal" },
          },
        },
        { $sort: { orders: -1 } },
        { $limit: 10 },
      ]),
    ]);

    const analytics = {
      period: {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
        type: type || 'custom',
      },
      users: {
        total: usersData.reduce((sum, item) => sum + item.count, 0),
        daily: usersData,
      },
      stores: {
        total: storesData.reduce((sum, item) => sum + item.count, 0),
        daily: storesData,
      },
      products: {
        total: productsData.reduce((sum, item) => sum + item.count, 0),
        daily: productsData,
      },
      orders: {
        total: ordersData.reduce((sum, item) => sum + item.count, 0),
        totalRevenue: ordersData.reduce((sum, item) => sum + item.revenue, 0),
        daily: ordersData,
      },
      revenue: {
        daily: revenueData,
        summary: {
          totalRevenue: revenueData.reduce((sum, item) => sum + item.revenue, 0),
          totalOrders: revenueData.reduce((sum, item) => sum + item.orders, 0),
          avgOrderValue: revenueData.length > 0 
            ? revenueData.reduce((sum, item) => sum + item.avgOrderValue, 0) / revenueData.length 
            : 0,
        },
      },
      orderStatus: orderStatusData.reduce((obj, item) => {
        obj[item._id] = item.count;
        return obj;
      }, {}),
      topProducts,
      topStores,
    };

    return res.json({
      success: true,
      message: "Analytics data fetched successfully",
      analytics,
    });
  } catch (err) {
    console.error("getAnalyticsByPeriod error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};