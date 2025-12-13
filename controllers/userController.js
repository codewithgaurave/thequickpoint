import jwt from "jsonwebtoken";
import User from "../models/User.js";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const FIXED_OTP = "123456";

if (!JWT_SECRET) {
  console.error("❌ JWT_SECRET is missing in environment variables");
}

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

// ------------------------------
// REGISTER: POST /api/users/request-otp/register
// ------------------------------
export const requestRegisterOtp = async (req, res) => {
  try {
    const mobile = (req.body.mobile || req.body.mobileNumber || "").trim();

    if (!mobile) {
      return res.status(400).json({ message: "Mobile is required." });
    }

    const existing = await User.findOne({ mobile }).lean();

    if (existing && !existing.isDeleted) {
      return res.status(409).json({
        message: "This mobile is already registered. Please login instead.",
        alreadyRegistered: true,
      });
    }

    return res.json({
      message: "OTP sent for registration (test mode).",
      otp: FIXED_OTP,
      alreadyRegistered: false,
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

    return res.json({
      message: "OTP sent for login (test mode).",
      otp: FIXED_OTP,
      needRegistration: false,
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
        .json({ message: "Mobile and otp are required." });
    }

    if (otp !== FIXED_OTP) {
      return res.status(400).json({ message: "Invalid OTP." });
    }

    let user = await User.findOne({ mobile });

    const isNewUser = !user;

    if (!user) {
      user = await User.create({ mobile });
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