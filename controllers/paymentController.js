import Payment from "../models/Payment.js";
import Order from "../models/Order.js";

// Helper to get userId from request
const getUserIdFromReq = (req) => {
  const id =
    req.body.userId ||
    req.query.userId ||
    req.params.userId ||
    "";
  return typeof id === "string" ? id.trim() : id;
};

// --------------------------------------
// POST /api/payments/initiate
// Create a payment record before checkout
// --------------------------------------
export const initiatePayment = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    const { 
      paymentMethod = "cod", 
      amount, 
      orderId = null,
      metadata = {} 
    } = req.body;
    
    if (!userId) {
      return res.status(400).json({ message: "userId is required." });
    }
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Valid amount is required." });
    }
    
    // Validate payment method
    const validMethods = ["cod", "upi", "card", "netbanking", "wallet"];
    if (!validMethods.includes(paymentMethod)) {
      return res.status(400).json({ 
        message: "Invalid payment method. Allowed: cod, upi, card, netbanking, wallet" 
      });
    }
    
    // For COD, mark as completed immediately
    const status = paymentMethod === "cod" ? "completed" : "pending";
    
    const payment = await Payment.create({
      user: userId,
      paymentMethod,
      amount,
      status,
      order: orderId,
      metadata,
    });
    
    return res.status(201).json({
      message: paymentMethod === "cod" 
        ? "COD payment initiated successfully" 
        : "Payment initiated. Please complete payment.",
      payment,
      isPaymentReady: paymentMethod === "cod" ? true : false,
    });
  } catch (err) {
    console.error("initiatePayment error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// POST /api/payments/verify
// Verify payment before allowing checkout
// --------------------------------------
export const verifyPayment = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    const { paymentId, transactionId = "", upiId = "", cardLast4 = "", bankName = "" } = req.body;
    
    if (!userId) {
      return res.status(400).json({ message: "userId is required." });
    }
    
    if (!paymentId) {
      return res.status(400).json({ message: "paymentId is required." });
    }
    
    const payment = await Payment.findOne({
      _id: paymentId,
      user: userId,
      isDeleted: false,
    });
    
    if (!payment) {
      return res.status(404).json({ message: "Payment not found." });
    }
    
    // If payment is already completed, return success
    if (payment.status === "completed") {
      return res.json({
        message: "Payment already verified",
        payment,
        isVerified: true,
      });
    }
    
    // Check if payment method is COD
    if (payment.paymentMethod === "cod") {
      return res.json({
        message: "COD payment verified",
        payment,
        isVerified: true,
      });
    }
    
    // For online payments, check if transactionId is provided
    // In real scenario, you'd verify with payment gateway
    if (transactionId) {
      // Update payment as completed
      const updatedPayment = await Payment.findOneAndUpdate(
        { _id: paymentId, user: userId, isDeleted: false },
        {
          status: "completed",
          transactionId,
          upiId: upiId || "",
          cardLast4: cardLast4 || "",
          bankName: bankName || "",
          metadata: {
            ...payment.metadata,
            verifiedAt: new Date().toISOString(),
            verifiedVia: "api_verification",
          },
        },
        { new: true }
      );
      
      return res.json({
        message: "Payment verified successfully",
        payment: updatedPayment,
        isVerified: true,
      });
    } else {
      // Payment not completed yet
      return res.status(400).json({
        message: "Payment not completed. Please complete payment first.",
        payment,
        isVerified: false,
      });
    }
  } catch (err) {
    console.error("verifyPayment error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// POST /api/payments/complete
// Complete payment (simulate payment completion for testing)
// --------------------------------------
export const completePayment = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    const { paymentId, transactionId = `TXN${Date.now()}`, upiId = "", cardLast4 = "", bankName = "" } = req.body;
    
    if (!userId) {
      return res.status(400).json({ message: "userId is required." });
    }
    
    if (!paymentId) {
      return res.status(400).json({ message: "paymentId is required." });
    }
    
    const payment = await Payment.findOne({
      _id: paymentId,
      user: userId,
      isDeleted: false,
    });
    
    if (!payment) {
      return res.status(404).json({ message: "Payment not found." });
    }
    
    // If already completed, return success
    if (payment.status === "completed") {
      return res.json({
        message: "Payment already completed",
        payment,
        isCompleted: true,
      });
    }
    
    // Mark payment as completed
    const updatedPayment = await Payment.findOneAndUpdate(
      { _id: paymentId, user: userId, isDeleted: false },
      {
        status: "completed",
        transactionId,
        upiId: upiId || "",
        cardLast4: cardLast4 || "",
        bankName: bankName || "",
        metadata: {
          ...payment.metadata,
          completedAt: new Date().toISOString(),
          completedVia: "manual_completion",
        },
      },
      { new: true }
    );
    
    return res.json({
      message: "Payment marked as completed",
      payment: updatedPayment,
      isCompleted: true,
    });
  } catch (err) {
    console.error("completePayment error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// POST /api/payments/fail
// Mark payment as failed (for testing)
// --------------------------------------
export const failPayment = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    const { paymentId, errorMessage = "Payment failed" } = req.body;
    
    if (!userId) {
      return res.status(400).json({ message: "userId is required." });
    }
    
    if (!paymentId) {
      return res.status(400).json({ message: "paymentId is required." });
    }
    
    const payment = await Payment.findOne({
      _id: paymentId,
      user: userId,
      isDeleted: false,
    });
    
    if (!payment) {
      return res.status(404).json({ message: "Payment not found." });
    }
    
    // Mark payment as failed
    const updatedPayment = await Payment.findOneAndUpdate(
      { _id: paymentId, user: userId, isDeleted: false },
      {
        status: "failed",
        errorMessage,
        metadata: {
          ...payment.metadata,
          failedAt: new Date().toISOString(),
          failedVia: "manual_failure",
        },
      },
      { new: true }
    );
    
    return res.json({
      message: "Payment marked as failed",
      payment: updatedPayment,
      isFailed: true,
    });
  } catch (err) {
    console.error("failPayment error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// GET /api/payments/status/:paymentId
// Check payment status
// --------------------------------------
export const getPaymentStatus = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    const { paymentId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ message: "userId is required." });
    }
    
    const payment = await Payment.findOne({
      _id: paymentId,
      user: userId,
      isDeleted: false,
    });
    
    if (!payment) {
      return res.status(404).json({ message: "Payment not found." });
    }
    
    return res.json({
      payment,
      isVerified: payment.status === "completed",
      isFailed: payment.status === "failed",
      isPending: payment.status === "pending",
    });
  } catch (err) {
    console.error("getPaymentStatus error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// GET /api/payments/my
// Get user's payment history
// --------------------------------------
export const getMyPayments = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    
    if (!userId) {
      return res.status(400).json({ message: "userId is required." });
    }
    
    const payments = await Payment.find({
      user: userId,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .populate("order", "grandTotal status paymentStatus")
      .lean();
    
    return res.json({
      payments,
      count: payments.length,
      summary: {
        total: payments.length,
        completed: payments.filter(p => p.status === "completed").length,
        pending: payments.filter(p => p.status === "pending").length,
        failed: payments.filter(p => p.status === "failed").length,
      },
    });
  } catch (err) {
    console.error("getMyPayments error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// PATCH /api/payments/:paymentId/link-order
// Link payment to order after checkout
// --------------------------------------
export const linkPaymentToOrder = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    const { paymentId } = req.params;
    const { orderId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ message: "userId is required." });
    }
    
    if (!paymentId || !orderId) {
      return res.status(400).json({ message: "paymentId and orderId are required." });
    }
    
    // Check if order exists and belongs to user
    const order = await Order.findOne({
      _id: orderId,
      user: userId,
      isDeleted: false,
    });
    
    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }
    
    // Update payment with order reference
    const payment = await Payment.findOneAndUpdate(
      { _id: paymentId, user: userId, isDeleted: false },
      { order: orderId },
      { new: true }
    );
    
    if (!payment) {
      return res.status(404).json({ message: "Payment not found." });
    }
    
    // Also update order with payment reference
    await Order.findByIdAndUpdate(orderId, { payment: paymentId });
    
    return res.json({
      message: "Payment linked to order successfully",
      payment,
      order,
    });
  } catch (err) {
    console.error("linkPaymentToOrder error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// GET /api/payments/analytics
// Get payment analytics (Admin)
// --------------------------------------
export const getPaymentAnalytics = async (req, res) => {
  try {
    // Get date ranges
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    
    // Total payments
    const totalPayments = await Payment.countDocuments({ isDeleted: false });
    
    // Today's payments
    const todaysPayments = await Payment.countDocuments({
      createdAt: { $gte: startOfDay },
      isDeleted: false,
    });
    
    // Payment methods distribution
    const paymentMethodStats = await Payment.aggregate([
      { $match: { isDeleted: false } },
      { $group: { 
        _id: "$paymentMethod", 
        count: { $sum: 1 },
        totalAmount: { $sum: "$amount" }
      }},
      { $sort: { count: -1 } }
    ]);
    
    // Status distribution
    const statusStats = await Payment.aggregate([
      { $match: { isDeleted: false } },
      { $group: { 
        _id: "$status", 
        count: { $sum: 1 },
        totalAmount: { $sum: "$amount" }
      }},
      { $sort: { count: -1 } }
    ]);
    
    // Daily revenue (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const dailyRevenue = await Payment.aggregate([
      { 
        $match: { 
          status: "completed",
          createdAt: { $gte: sevenDaysAgo },
          isDeleted: false 
        }
      },
      {
        $group: {
          _id: { 
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" }
          },
          date: { $first: "$createdAt" },
          count: { $sum: 1 },
          revenue: { $sum: "$amount" }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
    ]);
    
    return res.json({
      analytics: {
        summary: {
          totalPayments,
          todaysPayments,
          totalRevenue: paymentMethodStats.reduce((sum, stat) => sum + stat.totalAmount, 0),
        },
        paymentMethods: paymentMethodStats,
        statusDistribution: statusStats,
        dailyRevenue,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("getPaymentAnalytics error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};