console.log("🔑 APP ID:", process.env.CASHFREE_APP_ID);
console.log("🔐 SECRET:", process.env.CASHFREE_SECRET_KEY);
console.log("🌐 BASE URL:", process.env.CASHFREE_BASE_URL);


import axios from "axios";
import Payment from "../models/Payment.js";
import Order from "../models/Order.js";
import Cart from "../models/Cart.js";
import User from "../models/User.js";
import { sendOrderConfirmationSMS } from "../services/smsService.js";


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
    
    console.log("🔍 Cashfree Configuration:");
    console.log("🔍 APP ID:", process.env.CASHFREE_APP_ID ? `${process.env.CASHFREE_APP_ID.substring(0, 10)}...` : 'NOT SET');
    console.log("🔍 SECRET:", process.env.CASHFREE_SECRET_KEY ? `${process.env.CASHFREE_SECRET_KEY.substring(0, 10)}...` : 'NOT SET');
    console.log("🔍 BASE URL:", process.env.CASHFREE_BASE_URL);
    console.log("🔍 Order ID:", cashfreeOrderId);
    console.log("🔍 Amount:", amount);

    let cf;
    try {
      console.log("🔍 Making Cashfree API call...");
      console.log("🔍 URL:", `${process.env.CASHFREE_BASE_URL}/orders`);
      console.log("🔍 Headers:", {
        "x-client-id": process.env.CASHFREE_APP_ID ? `${process.env.CASHFREE_APP_ID.substring(0, 10)}...` : 'NOT SET',
        "x-client-secret": process.env.CASHFREE_SECRET_KEY ? `${process.env.CASHFREE_SECRET_KEY.substring(0, 10)}...` : 'NOT SET',
        "x-api-version": "2023-08-01"
      });
      console.log("🔍 Body:", {
        order_id: cashfreeOrderId,
        order_amount: amount,
        order_currency: "INR",
        customer_details: {
          customer_id: String(userId),
          customer_name: req.body.customerName || "Customer",
          customer_email: req.body.customerEmail || "customer@email.com",
          customer_phone: req.body.customerPhone || "9999999999",
        }
      });

      cf = await axios.post(
        `${process.env.CASHFREE_BASE_URL}/orders`,
        {
          order_id: cashfreeOrderId,
          order_amount: amount,
          order_currency: "INR",
          customer_details: {
            customer_id: String(userId),
            customer_name: req.body.customerName || "Customer",
            customer_email: req.body.customerEmail || "customer@email.com",
            customer_phone: req.body.customerPhone || "9999999999",
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

      console.log("✅ Cashfree API Success!");
      console.log("🔍 Status:", cf.status);
      console.log("🔍 Raw Response:", JSON.stringify(cf.data, null, 2));
      console.log("🔍 Response Keys:", Object.keys(cf.data));
      console.log("🔍 Has order_token:", !!cf.data.order_token);
      console.log("🔍 Has payment_session_id:", !!cf.data.payment_session_id);
      
      // ✅ IMPORTANT: Cashfree uses payment_session_id as order_token
      if (!cf.data.payment_session_id) {
        console.error("❌ Missing payment_session_id in Cashfree response");
        console.error("❌ Full response:", cf.data);
        throw new Error("Invalid Cashfree response: missing payment_session_id");
      }
      
      console.log("✅ Using payment_session_id as order_token:", cf.data.payment_session_id);
      
    } catch (cfError) {
      console.error("❌ Cashfree API Error Details:");
      console.error("❌ Status:", cfError.response?.status);
      console.error("❌ Status Text:", cfError.response?.statusText);
      console.error("❌ Response Data:", JSON.stringify(cfError.response?.data, null, 2));
      console.error("❌ Request Config:", {
        url: cfError.config?.url,
        method: cfError.config?.method,
        headers: cfError.config?.headers
      });
      console.error("❌ Error Message:", cfError.message);
      
      if (cfError.response?.status === 401) {
        throw new Error("Cashfree authentication failed. Check APP_ID and SECRET_KEY.");
      } else if (cfError.response?.status === 400) {
        const errorMsg = cfError.response.data?.message || cfError.response.data?.error || 'Invalid request';
        throw new Error(`Cashfree validation error: ${errorMsg}`);
      } else if (cfError.response?.status === 403) {
        throw new Error("Cashfree access forbidden. Check credentials and permissions.");
      } else {
        throw new Error(`Cashfree API error: ${cfError.message}`);
      }
    }

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
      order_token: cf.data.payment_session_id,
      payment_session_id: cf.data.payment_session_id,
      amount,
      currency: "INR",
      isPaymentReady: true,
    });

  } catch (err) {
    console.error("initiatePayment Error:", {
      message: err.message,
      response: err.response?.data,
      status: err.response?.status,
      stack: err.stack
    });
    
    // Return more specific error messages
    let errorMessage = "Payment initiation failed";
    if (err.message.includes("Cashfree")) {
      errorMessage = err.message;
    } else if (err.response?.status === 401) {
      errorMessage = "Authentication failed";
    } else if (err.response?.status === 400) {
      errorMessage = "Invalid payment request";
    }
    
    return res.status(500).json({ 
      message: errorMessage,
      error: err.message,
      details: err.response?.data
    });
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

    // ✅ COD payments are already completed, return immediately
    if (payment.paymentMethod === "cod") {
      return res.json({
        payment,
        isCompleted: true,
        isPending: false,
        isFailed: false,
      });
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

          // Update order payment status AND order status
          if (payment.order) {
            await Order.findByIdAndUpdate(payment.order, {
              paymentStatus: "paid",
              status: "confirmed", // ✅ Update order status to confirmed
            });

            // ✅ SEND ORDER CONFIRMATION SMS
            try {
              const order = await Order.findById(payment.order).populate('user', 'mobile');
              if (order && order.user && order.user.mobile) {
                const smsResult = await sendOrderConfirmationSMS(
                  order.user.mobile,
                  order.orderNumber,
                  order.collectionOTP
                );
                console.log("📱 Status check SMS sent:", smsResult.success ? "✅ Success" : "❌ Failed");
              }
            } catch (smsError) {
              console.error("📱 Status check SMS Error:", smsError);
            }
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
            status: "confirmed", // ✅ Update order status to confirmed
          });
        }

        // ✅ SEND ORDER CONFIRMATION SMS
        try {
          const order = await Order.findById(payment.order).populate('user', 'mobile');
          if (order && order.user && order.user.mobile) {
            const smsResult = await sendOrderConfirmationSMS(
              order.user.mobile,
              order.orderNumber,
              order.collectionOTP
            );
            console.log("📱 Order SMS sent:", smsResult.success ? "✅ Success" : "❌ Failed");
          }
        } catch (smsError) {
          console.error("📱 SMS Error:", smsError);
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

    // ✅ Handle COD payments specially
    if (paymentId.startsWith('COD_')) {
      const orderId = paymentId.replace('COD_', '');
      console.log(`🔍 COD Verify - Order ID: ${orderId}, User ID: ${userId}`);
      
      // Find payment by order ID for COD
      const payment = await Payment.findOne({
        order: orderId,
        user: userId,
        paymentMethod: 'cod',
        isDeleted: false,
      });

      console.log(`🔍 COD Payment found:`, payment ? `${payment._id} (${payment.status})` : 'NOT FOUND');

      if (!payment) {
        // Try to find any payment for this order
        const anyPayment = await Payment.findOne({
          order: orderId,
          isDeleted: false,
        });
        console.log(`🔍 Any payment for order:`, anyPayment ? `${anyPayment._id} (${anyPayment.paymentMethod}, ${anyPayment.status})` : 'NONE');
        
        // ✅ CREATE COD PAYMENT IF NOT EXISTS (FALLBACK)
        if (!anyPayment) {
          try {
            // Get order details to create payment
            const order = await Order.findById(orderId);
            if (order && order.paymentMethod === 'cod') {
              const newCodPayment = await Payment.create({
                user: userId,
                order: orderId,
                paymentMethod: 'cod',
                amount: order.grandTotal,
                status: 'completed',
              });
              console.log(`✅ Created missing COD payment: ${newCodPayment._id}`);
              
              return res.json({
                message: "COD payment created and verified successfully",
                payment: newCodPayment,
                cartCleared: false,
                wasCreated: true
              });
            }
          } catch (createError) {
            console.error('❌ Failed to create COD payment:', createError);
          }
        }
        
        return res.status(404).json({ 
          message: "COD payment not found",
          debug: {
            orderId,
            userId,
            searchCriteria: {
              order: orderId,
              user: userId,
              paymentMethod: 'cod',
              isDeleted: false
            },
            anyPaymentFound: anyPayment ? {
              id: anyPayment._id,
              paymentMethod: anyPayment.paymentMethod,
              status: anyPayment.status,
              user: anyPayment.user,
              order: anyPayment.order
            } : null
          }
        });
      }

      // COD payments are already completed
      return res.json({
        message: "COD payment verified successfully",
        payment,
        cartCleared: false, // COD doesn't need cart clearing here
      });
    }

    // Regular online payment verification
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
          status: "confirmed", // ✅ Update order status to confirmed
        });
      }

      // ✅ SEND ORDER CONFIRMATION SMS
      try {
        const order = await Order.findById(payment.order).populate('user', 'mobile');
        if (order && order.user && order.user.mobile) {
          const smsResult = await sendOrderConfirmationSMS(
            order.user.mobile,
            order.orderNumber,
            order.collectionOTP
          );
          console.log("📱 Manual verification SMS sent:", smsResult.success ? "✅ Success" : "❌ Failed");
        }
      } catch (smsError) {
        console.error("📱 Manual verification SMS Error:", smsError);
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

// -------------------------------------------------
// GET /api/payments/test-cashfree
// Test Cashfree configuration
// -------------------------------------------------
export const testCashfreeConfig = async (req, res) => {
  try {
    console.log("🧪 Testing Cashfree configuration...");
    
    // Check environment variables
    const config = {
      appId: process.env.CASHFREE_APP_ID ? 'SET' : 'NOT SET',
      secretKey: process.env.CASHFREE_SECRET_KEY ? 'SET' : 'NOT SET',
      baseUrl: process.env.CASHFREE_BASE_URL || 'NOT SET',
    };
    
    console.log("🔧 Config:", config);
    
    if (!process.env.CASHFREE_APP_ID || !process.env.CASHFREE_SECRET_KEY) {
      return res.status(500).json({
        message: "Cashfree credentials not configured",
        config
      });
    }
    
    // Test API call with minimal order
    const testOrderId = `test_${Date.now()}`;
    
    const testResponse = await axios.post(
      `${process.env.CASHFREE_BASE_URL}/orders`,
      {
        order_id: testOrderId,
        order_amount: 1.00,
        order_currency: "INR",
        customer_details: {
          customer_id: "test_customer",
          customer_name: "Test Customer",
          customer_email: "test@example.com",
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
    
    console.log("✅ Cashfree test successful");
    
    return res.json({
      message: "Cashfree configuration is working",
      config,
      testOrderId,
      hasOrderToken: !!testResponse.data.order_token,
      hasPaymentSessionId: !!testResponse.data.payment_session_id,
      responseKeys: Object.keys(testResponse.data)
    });
    
  } catch (err) {
    console.error("🧪 Cashfree test failed:", err.response?.data || err.message);
    
    return res.status(500).json({
      message: "Cashfree test failed",
      error: err.response?.data || err.message,
      status: err.response?.status
    });
  }
};

// -------------------------------------------------
// POST /api/payments/clear-cart/:paymentId
// Manual cart clear for successful payments (testing)
// -------------------------------------------------
export const clearCartAfterPayment = async (req, res) => {
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

    if (payment.status !== "completed") {
      return res.status(400).json({ message: "Payment not completed yet" });
    }

    // Clear cart
    const cart = await Cart.findOne({
      user: payment.user,
      isDeleted: false,
    });

    if (!cart || cart.items.length === 0) {
      return res.json({
        message: "Cart is already empty",
        cartCleared: false,
      });
    }

    const order = await Order.findById(payment.order);
    
    if (order && order.store) {
      // Remove only store items from cart
      const originalCount = cart.items.length;
      cart.items = cart.items.filter(item => 
        !item.store || String(item.store) !== String(order.store)
      );
      const clearedCount = originalCount - cart.items.length;
      
      await cart.save();
      
      return res.json({
        message: `Cart cleared successfully. Removed ${clearedCount} store items.`,
        cartCleared: true,
        itemsRemoved: clearedCount,
        remainingItems: cart.items.length,
      });
    } else {
      // Remove only global items from cart
      const originalCount = cart.items.length;
      cart.items = cart.items.filter(item => item.store);
      const clearedCount = originalCount - cart.items.length;
      
      await cart.save();
      
      return res.json({
        message: `Cart cleared successfully. Removed ${clearedCount} global items.`,
        cartCleared: true,
        itemsRemoved: clearedCount,
        remainingItems: cart.items.length,
      });
    }
  } catch (err) {
    console.error("clearCartAfterPayment error:", err);
    return res.status(500).json({ message: "Cart clear failed" });
  }
};