import axios from "axios";
import Payment from "../models/Payment.js";
import Order from "../models/Order.js";

const getUserId = (req) =>
  req.body.userId || req.query.userId || req.params.userId;

// -------------------------------------------------
// POST /api/payments/initiate
// -------------------------------------------------
export const initiatePayment = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { paymentMethod, amount, orderId = null } = req.body;

    if (!userId || !paymentMethod || !amount) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // ✅ COD FLOW
    if (paymentMethod === "cod") {
      const payment = await Payment.create({
        user: userId,
        order: orderId,
        paymentMethod,
        amount,
        status: "completed",
      });

      if (orderId) {
        await Order.findByIdAndUpdate(orderId, {
          paymentStatus: "paid",
          paymentMethod: "cod",
        });
      }

      return res.status(201).json({
        message: "COD payment successful",
        payment,
        isPaymentReady: true,
      });
    }

    // 🔥 ONLINE PAYMENT (CASHFREE)
    const cashfreeOrderId = `cf_${orderId || userId}_${Date.now()}`;

    const cf = await axios.post(
      `${process.env.CASHFREE_BASE_URL}/orders`,
      {
        order_id: cashfreeOrderId,
        order_amount: amount,
        order_currency: "INR",
        customer_details: {
          customer_id: String(userId),
          customer_phone: "9999999999",
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-client-id": process.env.CASHFREE_APP_ID,
          "x-client-secret": process.env.CASHFREE_SECRET_KEY,
          "x-api-version": "2023-08-01",
        },
      }
    );

    const payment = await Payment.create({
      user: userId,
      order: orderId,
      paymentMethod,
      amount,
      status: "pending",
      cashfreeOrderId,
      paymentSessionId: cf.data.payment_session_id,
      metadata: cf.data,
    });

    return res.status(201).json({
      message: "Payment initiated",
      paymentId: payment._id,
      cashfreeOrderId,
      paymentSessionId: payment.paymentSessionId,
      amount,
      currency: "INR",
      isPaymentReady: false,
    });

  } catch (err) {
    console.error("initiatePayment:", err.response?.data || err);
    return res.status(500).json({ message: "Payment initiation failed" });
  }
};

// -------------------------------------------------
// GET /api/payments/status/:paymentId
// -------------------------------------------------
export const getPaymentStatus = async (req, res) => {
  const userId = getUserId(req);
  const { paymentId } = req.params;

  const payment = await Payment.findOne({
    _id: paymentId,
    user: userId,
    isDeleted: false,
  });

  if (!payment) {
    return res.status(404).json({ message: "Payment not found" });
  }

  return res.json({
    payment,
    isCompleted: payment.status === "completed",
    isPending: payment.status === "pending",
    isFailed: payment.status === "failed",
  });
};

// -------------------------------------------------
// GET /api/payments/my
// -------------------------------------------------
export const getMyPayments = async (req, res) => {
  const userId = getUserId(req);

  const payments = await Payment.find({
    user: userId,
    isDeleted: false,
  })
    .sort({ createdAt: -1 })
    .populate("order", "grandTotal status paymentStatus")
    .lean();

  return res.json({
    count: payments.length,
    payments,
  });
};