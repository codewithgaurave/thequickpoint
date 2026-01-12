console.log("🔑 APP ID:", process.env.CASHFREE_APP_ID);
console.log("🔐 SECRET:", process.env.CASHFREE_SECRET_KEY);
console.log("🌐 BASE URL:", process.env.CASHFREE_BASE_URL);


import axios from "axios";
import Payment from "../models/Payment.js";
import Order from "../models/Order.js";
import Cart from "../models/Cart.js";


const getUserId = (req) => {
  return (
    req?.body?.userId ||
    req?.query?.userId ||
    req?.params?.userId ||
    null
  );
};



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
      isPaymentReady: true,
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
  try {
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

    // ✅ If payment is pending and has cashfreeOrderId, check with Cashfree
    if (payment.status === "pending" && payment.cashfreeOrderId) {
      try {
        const cfResponse = await axios.get(
          `${process.env.CASHFREE_BASE_URL}/orders/${payment.cashfreeOrderId}`,
          {
            headers: {
              "x-client-id": process.env.CASHFREE_APP_ID,
              "x-client-secret": process.env.CASHFREE_SECRET_KEY,
              "x-api-version": "2023-08-01",
            },
          }
        );

        const cfStatus = cfResponse.data.order_status;
        
        // Update payment status based on Cashfree response
        if (cfStatus === "PAID") {
          payment.status = "completed";
          payment.transactionId = cfResponse.data.cf_order_id || "";
          payment.metadata = { ...payment.metadata, cashfreeResponse: cfResponse.data };
          await payment.save();

          // Update order payment status
          if (payment.order) {
            await Order.findByIdAndUpdate(payment.order, {
              paymentStatus: "paid",
            });
          }
        } else if (cfStatus === "CANCELLED" || cfStatus === "FAILED") {
          payment.status = "failed";
          payment.errorMessage = cfResponse.data.order_note || "Payment failed";
          await payment.save();
        }
      } catch (cfError) {
        console.error("Cashfree status check error:", cfError.response?.data || cfError);
        // Don't return error, continue with existing status
      }
    }

    return res.json({
      payment,
      isCompleted: payment.status === "completed",
      isPending: payment.status === "pending",
      isFailed: payment.status === "failed",
    });
  } catch (err) {
    console.error("getPaymentStatus error:", err);
    return res.status(500).json({ message: "Server error" });
  }
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

// -------------------------------------------------
// POST /api/payments/webhook (Cashfree Webhook)
// -------------------------------------------------
export const handlePaymentWebhook = async (req, res) => {
  try {
    const { type, data } = req.body;
    
    console.log("🔔 Webhook received:", { type, data });

    if (type === "PAYMENT_SUCCESS_WEBHOOK") {
      const { order_id, payment_status, cf_payment_id } = data;
      
      // Find payment by cashfreeOrderId
      const payment = await Payment.findOne({
        cashfreeOrderId: order_id,
        isDeleted: false,
      });

      if (!payment) {
        console.log("❌ Payment not found for order_id:", order_id);
        return res.status(404).json({ message: "Payment not found" });
      }

      if (payment_status === "SUCCESS") {
        // Update payment status
        payment.status = "completed";
        payment.transactionId = cf_payment_id || "";
        payment.metadata = { ...payment.metadata, webhookData: data };
        await payment.save();

        // Update order payment status
        if (payment.order) {
          await Order.findByIdAndUpdate(payment.order, {
            paymentStatus: "paid",
          });
        }

        // ✅ NOW CLEAR CART AFTER SUCCESSFUL PAYMENT
        const cart = await Cart.findOne({
          user: payment.user,
          isDeleted: false,
        });

        if (cart) {
          // Get order to check if it's store-specific
          const order = await Order.findById(payment.order);
          
          if (order && order.store) {
            // Remove only store items from cart
            cart.items = cart.items.filter(item => 
              !item.store || String(item.store) !== String(order.store)
            );
          } else {
            // Remove only global items from cart
            cart.items = cart.items.filter(item => item.store);
          }
          
          await cart.save();
          console.log("✅ Cart cleared after successful payment");
        }

        console.log("✅ Payment completed successfully:", payment._id);
      } else {
        // Payment failed
        payment.status = "failed";
        payment.errorMessage = data.failure_reason || "Payment failed";
        await payment.save();
        
        console.log("❌ Payment failed:", payment._id);
      }
    }

    return res.status(200).json({ message: "Webhook processed" });
  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(500).json({ message: "Webhook processing failed" });
  }
};

// -------------------------------------------------
// POST /api/payments/verify/:paymentId
// Manual payment verification (for testing/backup)
// -------------------------------------------------
export const verifyPayment = async (req, res) => {
  try {
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

    if (payment.status !== "pending" || !payment.cashfreeOrderId) {
      return res.json({
        message: "Payment already processed or not eligible for verification",
        payment,
      });
    }

    // Check with Cashfree
    const cfResponse = await axios.get(
      `${process.env.CASHFREE_BASE_URL}/orders/${payment.cashfreeOrderId}`,
      {
        headers: {
          "x-client-id": process.env.CASHFREE_APP_ID,
          "x-client-secret": process.env.CASHFREE_SECRET_KEY,
          "x-api-version": "2023-08-01",
        },
      }
    );

    const cfStatus = cfResponse.data.order_status;
    
    if (cfStatus === "PAID") {
      // Update payment
      payment.status = "completed";
      payment.transactionId = cfResponse.data.cf_order_id || "";
      payment.metadata = { ...payment.metadata, verificationResponse: cfResponse.data };
      await payment.save();

      // Update order
      if (payment.order) {
        await Order.findByIdAndUpdate(payment.order, {
          paymentStatus: "paid",
        });
      }

      // Clear cart
      const cart = await Cart.findOne({
        user: payment.user,
        isDeleted: false,
      });

      if (cart) {
        const order = await Order.findById(payment.order);
        
        if (order && order.store) {
          cart.items = cart.items.filter(item => 
            !item.store || String(item.store) !== String(order.store)
          );
        } else {
          cart.items = cart.items.filter(item => item.store);
        }
        
        await cart.save();
      }

      return res.json({
        message: "Payment verified and completed successfully",
        payment,
        cartCleared: true,
      });
    } else if (cfStatus === "CANCELLED" || cfStatus === "FAILED") {
      payment.status = "failed";
      payment.errorMessage = cfResponse.data.order_note || "Payment failed";
      await payment.save();

      return res.json({
        message: "Payment verification failed",
        payment,
      });
    } else {
      return res.json({
        message: "Payment still pending",
        payment,
        cashfreeStatus: cfStatus,
      });
    }
  } catch (err) {
    console.error("verifyPayment error:", err.response?.data || err);
    return res.status(500).json({ message: "Payment verification failed" });
  }
};