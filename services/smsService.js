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
      username: 'Quickpoint',
      password: 'Quickpoint123',
      senderid: 'THQPNT',
      route: '1',
      number: `9836109633,9934993423,${cleanMobile}`,
      message: message,
      templateid: '1107176258986874088'
    };

    const response = await axios.get(smsUrl, { params, timeout: 10000 });
    
    console.log(`Order SMS sent to ${cleanMobile}. Response:`, response.data);
    
    return {
      success: true,
      response: response.data,
      collectionOTP
    };
  } catch (error) {
    console.error(`Order SMS failed for ${mobile}:`, error.message);
    return {
      success: false,
      error: error.message,
      collectionOTP
    };
  }
};

export { generateCollectionOTP, generateOrderNumber };