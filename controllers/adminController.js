// controllers/adminController.js
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import Admin from "../models/Admin.js";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "241h";
const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || "12", 10);

if (!JWT_SECRET) {
  console.error("❌ JWT_SECRET is missing in environment variables");
}

// Helper: sign JWT
const signJwt = (admin) =>
  jwt.sign(
    { sub: String(admin._id), adminId: admin.adminId, tv: admin.tokenVersion },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
    }
  );

// ----------------------------------------------
// Create Admin
// ----------------------------------------------
export const createAdmin = async (req, res) => {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        message:
          "Request body is empty. Make sure you are sending JSON and Content-Type: application/json",
      });
    }

    const { adminId, password, name } = req.body;

    if (!adminId || !password) {
      return res
        .status(400)
        .json({ message: "adminId and password are required." });
    }

    const exists = await Admin.findOne({ adminId }).lean();
    if (exists) {
      return res
        .status(409)
        .json({ message: "Admin with this adminId already exists." });
    }

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const admin = await Admin.create({ adminId, password: hash, name });

    return res.status(201).json({
      message: "Admin created successfully",
      admin: {
        id: admin._id,
        adminId: admin.adminId,
        name: admin.name,
        createdAt: admin.createdAt,
        createdAtIST: admin.createdAtIST,
      },
    });
  } catch (err) {
    console.error("createAdmin error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ----------------------------------------------
// Login Admin
// ----------------------------------------------
export const loginAdmin = async (req, res) => {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        message:
          "Request body is empty. Make sure you are sending JSON and Content-Type: application/json",
      });
    }

    const { adminId, password } = req.body;

    if (!adminId || !password) {
      return res
        .status(400)
        .json({ message: "adminId and password are required." });
    }

    const admin = await Admin.findOne({ adminId }).select(
      "+password +tokenVersion"
    );
    if (!admin) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const ok = await bcrypt.compare(password, admin.password);
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const token = signJwt(admin);

    return res.json({
      message: "Login successful",
      admin: {
        id: admin._id,
        adminId: admin.adminId,
        name: admin.name,
      },
      token,
    });
  } catch (err) {
    console.error("loginAdmin error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ----------------------------------------------
// Get current admin profile (protected)
// ----------------------------------------------
export const getProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.sub).lean();
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    return res.json({
      admin: {
        id: admin._id,
        adminId: admin.adminId,
        name: admin.name,
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt,
        createdAtIST: admin.createdAtIST,
        updatedAtIST: admin.updatedAtIST,
      },
    });
  } catch (err) {
    console.error("getProfile error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ----------------------------------------------
// Update profile (name) - protected
// ----------------------------------------------
export const updateProfile = async (req, res) => {
  try {
    const { name } = req.body;

    if (typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({ message: "Valid name is required." });
    }

    const admin = await Admin.findByIdAndUpdate(
      req.user.sub,
      { name: name.trim() },
      { new: true, runValidators: true }
    ).lean();

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    return res.json({
      message: "Profile updated successfully",
      admin: {
        id: admin._id,
        adminId: admin.adminId,
        name: admin.name,
        updatedAt: admin.updatedAt,
        updatedAtIST: admin.updatedAtIST,
      },
    });
  } catch (err) {
    console.error("updateProfile error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ----------------------------------------------
// Change password - protected
// ----------------------------------------------
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "currentPassword and newPassword are required.",
      });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "New password must be at least 6 characters." });
    }

    const admin = await Admin.findById(req.user.sub).select(
      "+password +tokenVersion"
    );
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const isCurrentValid = await bcrypt.compare(
      currentPassword,
      admin.password
    );
    if (!isCurrentValid) {
      return res.status(400).json({ message: "Current password is incorrect." });
    }

    const isSame = await bcrypt.compare(newPassword, admin.password);
    if (isSame) {
      return res
        .status(400)
        .json({ message: "New password cannot be same as old password." });
    }

    const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    admin.password = newHash;

    // Bump tokenVersion to invalidate all existing tokens
    admin.tokenVersion += 1;

    await admin.save();

    return res.json({
      message:
        "Password changed successfully. Please login again with your new password.",
    });
  } catch (err) {
    console.error("changePassword error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ----------------------------------------------
// List Admins (protected)
// ----------------------------------------------
export const listAdmins = async (_req, res) => {
  try {
    const admins = await Admin.find(
      {},
      {
        adminId: 1,
        name: 1,
        createdAt: 1,
        updatedAt: 1,
        createdAtIST: 1,
        updatedAtIST: 1,
      }
    ).lean();

    return res.json({ admins });
  } catch (err) {
    console.error("listAdmins error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ----------------------------------------------
// Logout from all devices (bump tokenVersion)
// ----------------------------------------------
export const logoutAll = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.sub).select("+tokenVersion");
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    admin.tokenVersion += 1;
    await admin.save();

    return res.json({ message: "Logged out from all sessions" });
  } catch (err) {
    console.error("logoutAll error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
