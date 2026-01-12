import axios from 'axios';

// Generate order number
const generateOrderNumber = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `TQP${timestamp}${random}`;
};

// Generate random 6-digit OTP for order collection
const generateCollectionOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send order confirmation SMS
export const sendOrderConfirmationSMS = async (mobile, orderId, collectionOTP) => {
  try {
    const cleanMobile = mobile.replace(/^\+91|^0/, "");
    
    const message = `Thank you for ordering with us! Your order ID is ${orderId}. Please share OTP ${collectionOTP} while collecting your order. The Quick Point`;
    
    const smsUrl = 'http://sms.webzmedia.co.in/http-api.php';
    const params = {
      username: process.env.SMS_USERNAME || 'Quickpoint',
      password: process.env.SMS_PASSWORD || 'Quickpoint123',
      senderid: process.env.SMS_SENDER_ID || 'THQPNT',
      route: '1',
      number: `${process.env.SMS_ADMIN_NUMBERS || '9836109633,9934993423'},${cleanMobile}`,
      message: message,
      templateid: process.env.SMS_TEMPLATE_ID || '1107176258986874088'
    };

    console.log(`📱 Sending SMS to ${cleanMobile} with order ${orderId}`);
    console.log(`📱 Message: ${message}`);

    const response = await axios.get(smsUrl, { params, timeout: 10000 });
    
    console.log(`📱 SMS Response:`, response.data);
    
    return {
      success: true,
      response: response.data,
      collectionOTP,
      mobile: cleanMobile,
      orderId
    };
  } catch (error) {
    console.error(`📱 SMS Error for ${mobile}:`, error.message);
    return {
      success: false,
      error: error.message,
      collectionOTP,
      mobile,
      orderId
    };
  }
};

export { generateCollectionOTP, generateOrderNumber };