import express from "express";
import axios from "axios";
import {
  initiatePayment,
  getPaymentStatus,
  getMyPayments,
  handlePaymentWebhook,
  verifyPayment,
  clearCartAfterPayment,
  testCashfreeConfig,
} from "../controllers/paymentController.js";

const router = express.Router();

router.post("/initiate", initiatePayment);
router.get("/test-cashfree", testCashfreeConfig);
router.get("/debug-cashfree", async (req, res) => {
  try {
    console.log("🧪 Debug Cashfree Test");
    console.log("🔧 Environment Variables:");
    console.log("- APP_ID:", process.env.CASHFREE_APP_ID ? `${process.env.CASHFREE_APP_ID.substring(0, 15)}...` : 'NOT SET');
    console.log("- SECRET:", process.env.CASHFREE_SECRET_KEY ? `${process.env.CASHFREE_SECRET_KEY.substring(0, 15)}...` : 'NOT SET');
    console.log("- BASE_URL:", process.env.CASHFREE_BASE_URL);
    
    const testOrderId = `debug_${Date.now()}`;
    
    const response = await axios.post(
      `${process.env.CASHFREE_BASE_URL}/orders`,
      {
        order_id: testOrderId,
        order_amount: 10.00,
        order_currency: "INR",
        customer_details: {
          customer_id: "debug_customer",
          customer_name: "Debug Customer",
          customer_email: "debug@test.com",
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
    
    console.log("✅ Debug Success!");
    console.log("📦 Response:", JSON.stringify(response.data, null, 2));
    
    return res.json({
      success: true,
      testOrderId,
      response: response.data,
      hasOrderToken: !!response.data.order_token,
      hasPaymentSessionId: !!response.data.payment_session_id,
      responseKeys: Object.keys(response.data)
    });
    
  } catch (error) {
    console.error("❌ Debug Failed:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status
    });
  }
});
router.get("/status/:paymentId", getPaymentStatus);
router.post("/verify/:paymentId", verifyPayment);
router.post("/clear-cart/:paymentId", clearCartAfterPayment);
router.get("/my", getMyPayments);
router.post("/webhook", handlePaymentWebhook);

export default router;
