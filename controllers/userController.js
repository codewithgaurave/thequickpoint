import jwt from "jsonwebtoken";
import User from "../models/User.js";
import crypto from "crypto";
import axios from "axios";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

// SMS Gateway Configuration
const SMS_API_URL = "http://sms.webzmedia.co.in/http-api.php";
const SMS_USERNAME = process.env.SMS_USERNAME || "Quickpoint";
const SMS_PASSWORD = process.env.SMS_PASSWORD || "Quickpoint123";
const SMS_SENDER_ID = process.env.SMS_SENDER_ID || "THQPNT";
const SMS_ROUTE = process.env.SMS_ROUTE || "1";
const SMS_TEMPLATE_ID = process.env.SMS_TEMPLATE_ID || "1107176249859819412";

// OTP configuration
const OTP_EXPIRY_MINUTES = 10; // OTP validity in minutes
const OTP_LENGTH = 6; // 6-digit OTP

if (!JWT_SECRET) {
  console.error("❌ JWT_SECRET is missing in environment variables");
}

if (!SMS_USERNAME || !SMS_PASSWORD) {
  console.warn("⚠️  SMS credentials not configured. OTPs will be logged but not sent.");
}

// helper: generate random OTP
const generateOTP = () => {
  const digits = "0123456789";
  let otp = "";
  for (let i = 0; i < OTP_LENGTH; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
};

// helper: send OTP via SMS
const sendOTPViaSMS = async (mobile, otp) => {
  try {
    // Format mobile number (remove +91 or 0 prefix if present)
    let formattedMobile = mobile.replace(/^\+91|^0/, "");
    
    const message = `${otp} is your one-time password for account verification. Please enter the OTP to proceed. The Quick Point`;
    
    const params = new URLSearchParams({
      username: SMS_USERNAME,
      password: SMS_PASSWORD,
      senderid: SMS_SENDER_ID,
      route: SMS_ROUTE,
      number: formattedMobile,
      message: message,
      templateid: SMS_TEMPLATE_ID
    });

    const response = await axios.get(`${SMS_API_URL}?${params.toString()}`);
    
    console.log(`SMS sent to ${mobile}. Response:`, response.data);
    
    // Check if SMS was sent successfully
    // Typical success response: "Sent Successfully. 1707115717696953530"
    if (response.data && response.data.includes("Sent Successfully")) {
      return { success: true, response: response.data };
    } else {
      console.error("SMS gateway error:", response.data);
      return { success: false, error: response.data };
    }
  } catch (error) {
    console.error("Error sending SMS:", error.message);
    return { success: false, error: error.message };
  }
};

// helper: sign JWT for user
const signUserJwt = (user) =>
  jwt.sign(
    {
      sub: String(user._id),
      mobile: user.mobile,
      role: "user",
      tv: user.tokenVersion,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

// In-memory OTP store (in production, use Redis or database)
const otpStore = new Map();

// Clean expired OTPs
const cleanExpiredOTPs = () => {
  const now = Date.now();
  for (const [key, data] of otpStore.entries()) {
    if (now > data.expiresAt) {
      otpStore.delete(key);
    }
  }
};

// Verify OTP from store
const verifyStoredOTP = (mobile, otp) => {
  cleanExpiredOTPs();
  
  const key = mobile;
  const storedData = otpStore.get(key);
  
  if (!storedData) {
    return { valid: false, reason: "OTP not found or expired" };
  }
  
  if (storedData.otp !== otp) {
    return { valid: false, reason: "Invalid OTP" };
  }
  
  if (Date.now() > storedData.expiresAt) {
    otpStore.delete(key);
    return { valid: false, reason: "OTP expired" };
  }
  
  // OTP verified successfully, remove it from store
  otpStore.delete(key);
  return { valid: true, purpose: storedData.purpose };
};

// ------------------------------
// REGISTER: POST /api/users/request-otp/register
// ------------------------------
export const requestRegisterOtp = async (req, res) => {
  try {
    const mobile = (req.body.mobile || req.body.mobileNumber || "").trim();

    if (!mobile) {
      return res.status(400).json({ message: "Mobile is required." });
    }

    // Validate mobile number format (Indian)
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(mobile.replace(/^\+91|^0/, ""))) {
      return res.status(400).json({ 
        message: "Please enter a valid 10-digit Indian mobile number." 
      });
    }

    const existing = await User.findOne({ mobile }).lean();

    if (existing && !existing.isDeleted) {
      return res.status(409).json({
        message: "This mobile is already registered. Please login instead.",
        alreadyRegistered: true,
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + (OTP_EXPIRY_MINUTES * 60 * 1000);
    
    // Store OTP in memory
    otpStore.set(mobile, {
      otp,
      expiresAt,
      purpose: "register",
      createdAt: new Date()
    });

    // Send OTP via SMS
    const smsResult = await sendOTPViaSMS(mobile, otp);

    if (!smsResult.success) {
      console.warn(`Failed to send SMS to ${mobile}. OTP: ${otp}`);
      // Still return success but log OTP for development
      return res.json({
        message: "OTP generated. SMS delivery failed (check logs for OTP).",
        otp: process.env.NODE_ENV === "development" ? otp : undefined,
        alreadyRegistered: false,
        smsDelivered: false,
        note: "In development mode, OTP is shown. In production, check SMS gateway."
      });
    }

    return res.json({
      message: "OTP sent successfully to your mobile number.",
      alreadyRegistered: false,
      smsDelivered: true,
      note: "OTP is valid for 10 minutes"
    });
  } catch (err) {
    console.error("requestRegisterOtp error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ------------------------------
// LOGIN: POST /api/users/request-otp/login
// ------------------------------
export const requestLoginOtp = async (req, res) => {
  try {
    const mobile = (req.body.mobile || req.body.mobileNumber || "").trim();

    if (!mobile) {
      return res.status(400).json({ message: "Mobile is required." });
    }

    // Validate mobile number format
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(mobile.replace(/^\+91|^0/, ""))) {
      return res.status(400).json({ 
        message: "Please enter a valid 10-digit Indian mobile number." 
      });
    }

    const user = await User.findOne({ mobile }).lean();

    if (!user || user.isDeleted) {
      return res.status(404).json({
        message: "User not found. Please register first.",
        needRegistration: true,
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        message: "User is blocked by admin. Login not allowed.",
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + (OTP_EXPIRY_MINUTES * 60 * 1000);
    
    // Store OTP in memory
    otpStore.set(mobile, {
      otp,
      expiresAt,
      purpose: "login",
      createdAt: new Date(),
      userId: user._id
    });

    // Send OTP via SMS
    const smsResult = await sendOTPViaSMS(mobile, otp);

    if (!smsResult.success) {
      console.warn(`Failed to send SMS to ${mobile}. OTP: ${otp}`);
      // Still return success but log OTP for development
      return res.json({
        message: "OTP generated. SMS delivery failed (check logs for OTP).",
        otp: process.env.NODE_ENV === "development" ? otp : undefined,
        needRegistration: false,
        smsDelivered: false,
        note: "In development mode, OTP is shown. In production, check SMS gateway."
      });
    }

    return res.json({
      message: "OTP sent successfully to your mobile number.",
      needRegistration: false,
      smsDelivered: true,
      note: "OTP is valid for 10 minutes"
    });
  } catch (err) {
    console.error("requestLoginOtp error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ------------------------------
// POST /api/users/verify-otp  (common for login + register)
// ------------------------------
export const verifyOtp = async (req, res) => {
  try {
    const mobile = (req.body.mobile || req.body.mobileNumber || "").trim();
    const otp = (req.body.otp || "").trim();

    if (!mobile || !otp) {
      return res
        .status(400)
        .json({ message: "Mobile and OTP are required." });
    }

    // Validate OTP format
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: "OTP must be 6 digits." });
    }

    // Verify OTP from store
    const otpVerification = verifyStoredOTP(mobile, otp);
    
    if (!otpVerification.valid) {
      return res.status(400).json({ 
        message: otpVerification.reason === "OTP expired" 
          ? "OTP has expired. Please request a new one." 
          : "Invalid OTP. Please try again." 
      });
    }

    let user = await User.findOne({ mobile });

    const isNewUser = !user;

    if (!user) {
      // Create new user for registration
      if (otpVerification.purpose !== "register") {
        return res.status(400).json({ 
          message: "Invalid OTP purpose. Please request registration OTP." 
        });
      }
      user = await User.create({ mobile });
    } else {
      // Existing user for login
      if (otpVerification.purpose !== "login") {
        return res.status(400).json({ 
          message: "Invalid OTP purpose. Please request login OTP." 
        });
      }
    }

    if (user.isDeleted) {
      return res.status(403).json({
        message: "Account deleted. Please contact support.",
      });
    }

    if (user.isBlocked) {
      return res
        .status(403)
        .json({ message: "User is blocked by admin. Login not allowed." });
    }

    const token = signUserJwt(user);

    return res.json({
      message: isNewUser
        ? "OTP verified. User registered & logged in."
        : "OTP verified. Login successful.",
      isNewUser,
      user: {
        id: user._id,
        mobile: user.mobile,
        email: user.email,
        fullName: user.fullName,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth,
        profileImageUrl: user.profileImageUrl,
        address: user.address,
        city: user.city,
        state: user.state,
        pincode: user.pincode,
        country: user.country,
        isBlocked: user.isBlocked,
      },
      token,
    });
  } catch (err) {
    console.error("verifyOtp error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ------------------------------
// RESEND OTP: POST /api/users/resend-otp
// ------------------------------
export const resendOtp = async (req, res) => {
  try {
    const mobile = (req.body.mobile || req.body.mobileNumber || "").trim();
    const purpose = req.body.purpose || "login"; // "login" or "register"

    if (!mobile) {
      return res.status(400).json({ message: "Mobile is required." });
    }

    // Validate mobile number format
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(mobile.replace(/^\+91|^0/, ""))) {
      return res.status(400).json({ 
        message: "Please enter a valid 10-digit Indian mobile number." 
      });
    }

    // Check if user exists for login purpose
    if (purpose === "login") {
      const user = await User.findOne({ mobile }).lean();
      if (!user || user.isDeleted) {
        return res.status(404).json({
          message: "User not found. Please register first.",
          needRegistration: true,
        });
      }
      
      if (user.isBlocked) {
        return res.status(403).json({
          message: "User is blocked by admin.",
        });
      }
    }

    // Check for registration purpose
    if (purpose === "register") {
      const existing = await User.findOne({ mobile }).lean();
      if (existing && !existing.isDeleted) {
        return res.status(409).json({
          message: "This mobile is already registered. Please login instead.",
          alreadyRegistered: true,
        });
      }
    }

    // Generate new OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + (OTP_EXPIRY_MINUTES * 60 * 1000);
    
    // Store OTP in memory
    otpStore.set(mobile, {
      otp,
      expiresAt,
      purpose,
      createdAt: new Date()
    });

    // Send OTP via SMS
    const smsResult = await sendOTPViaSMS(mobile, otp);

    if (!smsResult.success) {
      console.warn(`Failed to send SMS to ${mobile}. OTP: ${otp}`);
      return res.json({
        message: "OTP generated. SMS delivery failed (check logs for OTP).",
        otp: process.env.NODE_ENV === "development" ? otp : undefined,
        smsDelivered: false,
        purpose,
        note: "In development mode, OTP is shown."
      });
    }

    return res.json({
      message: "OTP resent successfully to your mobile number.",
      smsDelivered: true,
      purpose,
      note: "OTP is valid for 10 minutes"
    });
  } catch (err) {
    console.error("resendOtp error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ------------------------------
// GET /api/users/profile  (Query parameter से user ID)
// ------------------------------
export const getUserProfile = async (req, res) => {
  try {
    // Query parameters से user ID लें
    const userId = req.query.userId || req.query.id;
    
    if (!userId) {
      return res.status(400).json({ 
        message: "User ID is required as query parameter. Use ?userId=USER_ID" 
      });
    }

    const user = await User.findById(userId).lean();
    
    if (!user || user.isDeleted) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user is blocked
    if (user.isBlocked) {
      return res.status(403).json({ 
        message: "This user account is blocked." 
      });
    }

    return res.json({
      user: {
        id: user._id,
        mobile: user.mobile,
        email: user.email,
        fullName: user.fullName,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth,
        profileImageUrl: user.profileImageUrl,
        address: user.address,
        city: user.city,
        state: user.state,
        pincode: user.pincode,
        country: user.country,
        isBlocked: user.isBlocked,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        createdAtIST: user.createdAtIST,
        updatedAtIST: user.updatedAtIST,
      },
    });
  } catch (err) {
    console.error("getUserProfile error:", err);
    
    // Handle invalid ObjectId format
    if (err.name === 'CastError') {
      return res.status(400).json({ message: "Invalid user ID format." });
    }
    
    return res.status(500).json({ message: "Server error" });
  }
};

// ------------------------------
// PATCH /api/users/profile  (Query parameter से user ID)
// ------------------------------
export const updateUserProfile = async (req, res) => {
  try {
    // Query parameters से user ID लें
    const userId = req.query.userId || req.query.id;
    
    if (!userId) {
      return res.status(400).json({ 
        message: "User ID is required as query parameter. Use ?userId=USER_ID" 
      });
    }

    const {
      fullName,
      email,
      gender,
      dateOfBirth, // yyyy-mm-dd
      address,
      city,
      state,
      pincode,
      country,
    } = req.body;

    const update = {};

    if (fullName !== undefined) update.fullName = fullName.trim();
    if (email !== undefined) update.email = email.trim();
    if (gender !== undefined) update.gender = gender;
    if (address !== undefined) update.address = address.trim();
    if (city !== undefined) update.city = city.trim();
    if (state !== undefined) update.state = state.trim();
    if (pincode !== undefined) update.pincode = pincode.trim();
    if (country !== undefined) update.country = country.trim();

    if (dateOfBirth) {
      const dob = new Date(dateOfBirth);
      if (isNaN(dob.getTime())) {
        return res.status(400).json({ message: "Invalid dateOfBirth format." });
      }
      update.dateOfBirth = dob;
    }

    if (req.file && req.file.path) {
      update.profileImageUrl = req.file.path;
    }

    const user = await User.findByIdAndUpdate(userId, update, {
      new: true,
      runValidators: true,
    }).lean();

    if (!user || user.isDeleted) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user is blocked
    if (user.isBlocked) {
      return res.status(403).json({ 
        message: "This user account is blocked." 
      });
    }

    return res.json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        mobile: user.mobile,
        email: user.email,
        fullName: user.fullName,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth,
        profileImageUrl: user.profileImageUrl,
        address: user.address,
        city: user.city,
        state: user.state,
        pincode: user.pincode,
        country: user.country,
        isBlocked: user.isBlocked,
        updatedAt: user.updatedAt,
        updatedAtIST: user.updatedAtIST,
      },
    });
  } catch (err) {
    console.error("updateUserProfile error:", err);
    
    // Handle invalid ObjectId format
    if (err.name === 'CastError') {
      return res.status(400).json({ message: "Invalid user ID format." });
    }
    
    return res.status(500).json({ message: "Server error" });
  }
};

// ------------------------------
// POST /api/users/logout-all  (Query parameter से user ID)
// ------------------------------
export const logoutAllUser = async (req, res) => {
  try {
    // Query parameters से user ID लें
    const userId = req.query.userId || req.query.id;
    
    if (!userId) {
      return res.status(400).json({ 
        message: "User ID is required as query parameter. Use ?userId=USER_ID" 
      });
    }

    const user = await User.findById(userId).select("+tokenVersion");
    
    if (!user || user.isDeleted) {
      return res.status(404).json({ message: "User not found" });
    }

    user.tokenVersion += 1;
    await user.save();

    return res.json({
      message: "Logged out from all user sessions successfully.",
    });
  } catch (err) {
    console.error("logoutAllUser error:", err);
    
    // Handle invalid ObjectId format
    if (err.name === 'CastError') {
      return res.status(400).json({ message: "Invalid user ID format." });
    }
    
    return res.status(500).json({ message: "Server error" });
  }
};

// ------------------------------
// ADMIN APIs (इन्हें वैसे ही रखें)
// ------------------------------

// GET /api/users  (admin)
export const adminListUsers = async (_req, res) => {
  try {
    const users = await User.find(
      { isDeleted: false },
      {
        mobile: 1,
        email: 1,
        fullName: 1,
        gender: 1,
        dateOfBirth: 1,
        profileImageUrl: 1,
        address: 1,
        city: 1,
        state: 1,
        pincode: 1,
        country: 1,
        isBlocked: 1,
        createdAt: 1,
        updatedAt: 1,
        createdAtIST: 1,
        updatedAtIST: 1,
      }
    ).lean();

    return res.json({ users });
  } catch (err) {
    console.error("adminListUsers error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/users/:id  (admin)
export const adminGetUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user || user.isDeleted) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ user });
  } catch (err) {
    console.error("adminGetUser error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// PATCH /api/users/:id  (admin - update detail)
export const adminUpdateUser = async (req, res) => {
  try {
    const allowedFields = [
      "mobile",
      "email",
      "fullName",
      "gender",
      "dateOfBirth",
      "address",
      "city",
      "state",
      "pincode",
      "country",
      "isBlocked",
    ];

    const update = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        if (key === "dateOfBirth") {
          const dob = new Date(req.body[key]);
          if (isNaN(dob.getTime())) {
            return res
              .status(400)
              .json({ message: "Invalid dateOfBirth format." });
          }
          update.dateOfBirth = dob;
        } else {
          update[key] = req.body[key];
        }
      }
    }

    const user = await User.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    }).lean();

    if (!user || user.isDeleted) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      message: "User updated successfully",
      user,
    });
  } catch (err) {
    console.error("adminUpdateUser error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// PATCH /api/users/:id/block  (admin)
export const adminBlockUser = async (req, res) => {
  try {
    const { isBlocked } = req.body;
    if (typeof isBlocked !== "boolean") {
      return res
        .status(400)
        .json({ message: "isBlocked must be true or false." });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBlocked },
      { new: true }
    ).lean();

    if (!user || user.isDeleted) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      message: `User ${isBlocked ? "blocked" : "unblocked"} successfully`,
      user,
    });
  } catch (err) {
    console.error("adminBlockUser error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// DELETE /api/users/:id  (admin)
export const adminDeleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id).lean();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      message: "User deleted successfully",
    });
  } catch (err) {
    console.error("adminDeleteUser error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};