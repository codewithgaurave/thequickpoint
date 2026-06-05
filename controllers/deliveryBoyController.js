// controllers/deliveryBoyController.js
import jwt from "jsonwebtoken";
import axios from "axios";
import DeliveryBoy from "../models/deliveryBoyModel.js";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

const SMS_API_URL = "http://sms.webzmedia.co.in/http-api.php";
const SMS_USERNAME = process.env.SMS_USERNAME || "Quickpoint";
const SMS_PASSWORD = process.env.SMS_PASSWORD || "Quickpoint123";
const SMS_SENDER_ID = process.env.SMS_SENDER_ID || "THQPNT";
const SMS_ROUTE = process.env.SMS_ROUTE || "1";
const SMS_TEMPLATE_ID = "1107176249859819412"; // OTP template ID
const SMS_ENTITY_ID = process.env.SMS_ENTITY_ID || "1101176249859819412";

const OTP_EXPIRY_MINUTES = 10;
const deliveryBoyOtpStore = new Map();

// Helper to generate 6-digit OTP
const generateOTP = () => {
  const digits = "0123456789";
  let otp = "";
  for (let i = 0; i < 6; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
};

// Helper to send OTP via SMS
const sendOTPViaSMS = async (mobile, otp) => {
  try {
    const formattedMobile = mobile.replace(/^\+91|^0/, "");

    // Fixed OTP for test number
    const finalOtp = formattedMobile === "9696559848" ? "123456" : otp;

    const message = `${finalOtp} is your one-time password for account verification. Please enter the OTP to proceed. The Quick Point`;

    const smsUrl = `${SMS_API_URL}?username=${SMS_USERNAME}&password=${SMS_PASSWORD}&senderid=${SMS_SENDER_ID}&route=${SMS_ROUTE}&number=${formattedMobile}&message=${encodeURIComponent(message)}&templateid=${SMS_TEMPLATE_ID}&entityid=${SMS_ENTITY_ID}`;
    
    console.log("📤 Delivery Boy SMS URL:", smsUrl);

    const response = await axios.get(smsUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });
    
    const responseText = String(response.data || "");
    console.log("📨 Delivery Boy SMS RESPONSE:", responseText);

    if (/success|submitted|SMSID|Msgid|msg-id|sent/i.test(responseText)) {
      return { success: true, response: responseText };
    }

    return { success: false, error: responseText };
  } catch (err) {
    console.error("❌ Delivery Boy SMS ERROR:", err.message);
    return { success: false, error: err.message };
  }
};

// ----------------------------------------------
// CREATE DELIVERY BOY
// ----------------------------------------------
export const createDeliveryBoy = async (req, res) => {
  try {
    const { name, phone, email, address, city, state, pincode } = req.body;

    if (!name || !name.trim())
      return res.status(400).json({ message: "name is required" });

    if (!phone || !phone.trim())
      return res.status(400).json({ message: "phone is required" });

    if (!req.files?.profileImage || !req.files?.document) {
      return res
        .status(400)
        .json({ message: "Both profileImage and document are required" });
    }

    const profileImageUrl = req.files.profileImage[0].path;
    const documentUrl = req.files.document[0].path;

    const boy = await DeliveryBoy.create({
      name: name.trim(),
      phone: phone.trim(),
      email: email ? email.trim().toLowerCase() : "",
      profileImageUrl,
      documentUrl,
      address: address || "",
      city: city || "",
      state: state || "",
      pincode: pincode || "",
    });

    return res.status(201).json({
      message: "Delivery Boy created successfully",
      boy,
    });
  } catch (err) {
    console.error("createDeliveryBoy error:", err);
    if (err.code === 11000) {
      return res.status(409).json({ message: "Phone already exists." });
    }
    return res.status(500).json({ message: "Server error" });
  }
};

// ----------------------------------------------
// GET ALL (ADMIN)
// ----------------------------------------------
export const adminListDeliveryBoys = async (req, res) => {
  try {
    const list = await DeliveryBoy.find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ list });
  } catch (err) {
    console.error("adminListDeliveryBoys error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ----------------------------------------------
// GET SINGLE
// ----------------------------------------------
export const adminGetDeliveryBoy = async (req, res) => {
  try {
    const boy = await DeliveryBoy.findOne({
      _id: req.params.id,
      isDeleted: false,
    }).lean();

    if (!boy) return res.status(404).json({ message: "Delivery Boy not found" });

    return res.json({ boy });
  } catch (err) {
    console.error("adminGetDeliveryBoy error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ----------------------------------------------
// UPDATE
// ----------------------------------------------
export const updateDeliveryBoy = async (req, res) => {
  try {
    const update = {};
    const {
      name,
      phone,
      email,
      address,
      city,
      state,
      pincode,
      isActive,
    } = req.body;

    if (name !== undefined) update.name = name.trim();
    if (phone !== undefined) update.phone = phone.trim();
    if (email !== undefined) update.email = email.trim().toLowerCase();
    if (address !== undefined) update.address = address;
    if (city !== undefined) update.city = city;
    if (state !== undefined) update.state = state;
    if (pincode !== undefined) update.pincode = pincode;

    if (isActive !== undefined)
      update.isActive =
        typeof isActive === "string" ? isActive === "true" : !!isActive;

    if (req.files?.profileImage) {
      update.profileImageUrl = req.files.profileImage[0].path;
    }
    if (req.files?.document) {
      update.documentUrl = req.files.document[0].path;
    }

    const boy = await DeliveryBoy.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      update,
      { new: true }
    ).lean();

    if (!boy) return res.status(404).json({ message: "Delivery Boy not found" });

    return res.json({ message: "Updated successfully", boy });
  } catch (err) {
    console.error("updateDeliveryBoy error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ----------------------------------------------
// ACTIVATE / INACTIVATE
// ----------------------------------------------
export const updateDeliveryBoyStatus = async (req, res) => {
  try {
    const { isActive } = req.body;

    const boy = await DeliveryBoy.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { isActive },
      { new: true }
    ).lean();

    return res.json({
      message: `Delivery Boy ${
        isActive ? "Activated" : "Deactivated"
      } successfully`,
      boy,
    });
  } catch (err) {
    console.error("updateDeliveryBoyStatus error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ----------------------------------------------
// SOFT DELETE
// ----------------------------------------------
export const deleteDeliveryBoy = async (req, res) => {
  try {
    await DeliveryBoy.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { isDeleted: true, isActive: false }
    );

    return res.json({ message: "Delivery Boy deleted successfully" });
  } catch (err) {
    console.error("deleteDeliveryBoy error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ----------------------------------------------
// REQUEST LOGIN OTP (DRIVER)
// ----------------------------------------------
export const requestDeliveryBoyLoginOtp = async (req, res) => {
  try {
    const phone = (req.body.phone || req.body.mobile || "").trim();

    if (!phone) {
      return res.status(400).json({ message: "Phone number is required." });
    }

    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(phone.replace(/^\+91|^0/, ""))) {
      return res.status(400).json({
        message: "Please enter a valid 10-digit Indian mobile number.",
      });
    }

    // Verify delivery boy exists and is active
    const boy = await DeliveryBoy.findOne({ phone, isDeleted: false });
    if (!boy) {
      return res.status(404).json({
        message: "Delivery boy not registered. Please contact admin.",
      });
    }

    if (!boy.isActive) {
      return res.status(403).json({
        message: "Your account is deactivated. Please contact admin.",
      });
    }

    // Generate OTP
    const otp = phone === "9696559848" ? "123456" : generateOTP();
    const expiresAt = Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000;

    deliveryBoyOtpStore.set(phone, {
      otp,
      expiresAt,
    });

    console.log(`📞 Delivery boy OTP for ${phone}: ${otp}`);

    // Send SMS
    const smsResult = await sendOTPViaSMS(phone, otp);

    const showOtpInResponse =
      process.env.NODE_ENV === "development" ||
      process.env.SHOW_OTP === "true" ||
      !smsResult.success ||
      phone === "9696559848";

    if (smsResult.success) {
      return res.json({
        message: "OTP sent successfully to your mobile number.",
        smsDelivered: true,
        note: "OTP is valid for 10 minutes",
        ...(showOtpInResponse && { debugOtp: otp }),
      });
    } else {
      return res.json({
        message: "OTP generated successfully. Please check your SMS.",
        smsDelivered: false,
        note: "OTP is valid for 10 minutes",
        debugOtp: otp,
        debugNote: "SMS delivery issue. Use this OTP for testing.",
      });
    }
  } catch (err) {
    console.error("requestDeliveryBoyLoginOtp error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ----------------------------------------------
// VERIFY OTP & LOGIN (DRIVER)
// ----------------------------------------------
export const verifyDeliveryBoyOtp = async (req, res) => {
  try {
    const phone = (req.body.phone || req.body.mobile || "").trim();
    const otp = (req.body.otp || "").trim();

    if (!phone || !otp) {
      return res.status(400).json({ message: "Phone and OTP are required." });
    }

    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: "OTP must be 6 digits." });
    }

    if (phone === "9696559848" && otp !== "123456") {
      return res.status(400).json({
        message: "Invalid OTP. For this mobile number, use 123456 as OTP.",
      });
    }

    // Verify OTP
    const storedData = deliveryBoyOtpStore.get(phone);
    if (!storedData && phone !== "9696559848") {
      return res.status(400).json({ message: "OTP not found or expired. Please request a new one." });
    }

    if (phone !== "9696559848") {
      if (storedData.otp !== otp) {
        return res.status(400).json({ message: "Invalid OTP. Please try again." });
      }

      if (Date.now() > storedData.expiresAt) {
        deliveryBoyOtpStore.delete(phone);
        return res.status(400).json({ message: "OTP has expired. Please request a new one." });
      }

      deliveryBoyOtpStore.delete(phone);
    }

    const boy = await DeliveryBoy.findOne({ phone, isDeleted: false });
    if (!boy) {
      return res.status(404).json({ message: "Delivery boy not found." });
    }

    if (!boy.isActive) {
      return res.status(403).json({ message: "Delivery boy is inactive." });
    }

    // Sign JWT
    const token = jwt.sign(
      {
        sub: String(boy._id),
        phone: boy.phone,
        role: "deliveryBoy",
        tv: boy.tokenVersion,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.json({
      message: "Login successful.",
      boy: {
        id: boy._id,
        name: boy.name,
        phone: boy.phone,
        email: boy.email,
        profileImageUrl: boy.profileImageUrl,
        address: boy.address,
        city: boy.city,
        state: boy.state,
        pincode: boy.pincode,
        isActive: boy.isActive,
      },
      token,
    });
  } catch (err) {
    console.error("verifyDeliveryBoyOtp error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ----------------------------------------------
// LOGOUT (DRIVER)
// ----------------------------------------------
export const logoutDeliveryBoy = async (req, res) => {
  try {
    const boyId = req.user.dbId;
    const boy = await DeliveryBoy.findById(boyId);
    if (!boy) {
      return res.status(404).json({ message: "Delivery boy not found." });
    }
    boy.tokenVersion += 1;
    await boy.save();
    return res.json({ message: "Logged out successfully." });
  } catch (err) {
    console.error("logoutDeliveryBoy error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
