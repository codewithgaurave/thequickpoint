// middleware/auth.js
import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";
import User from "../models/User.js";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error("❌ JWT_SECRET missing in env");
}

// ----------------------------
// Helper → Extract token
// ----------------------------
const extractToken = (req) => {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : null;
};

// ----------------------------
// ADMIN AUTH
// ----------------------------
const requireAdminAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ message: "Missing auth token" });

    const payload = jwt.verify(token, JWT_SECRET);

    const admin = await Admin.findById(payload.sub).select("+tokenVersion");
    if (!admin) {
      return res.status(401).json({ message: "Admin not found" });
    }

    if (admin.tokenVersion !== payload.tv) {
      return res
        .status(401)
        .json({ message: "Session expired. Please login again." });
    }

    req.user = {
      ...payload,
      dbId: admin._id.toString(),
      type: "admin",
    };

    next();
  } catch (err) {
    console.error("Admin auth error:", err);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// ----------------------------
// USER AUTH
// ----------------------------
const requireUserAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ message: "Missing auth token" });

    const payload = jwt.verify(token, JWT_SECRET);

    if (payload.role !== "user") {
      return res.status(403).json({ message: "User access only." });
    }

    const user = await User.findById(payload.sub).select("+tokenVersion");
    if (!user || user.isDeleted) {
      return res.status(401).json({ message: "User not found" });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: "User is blocked by admin." });
    }

    if (user.tokenVersion !== payload.tv) {
      return res
        .status(401)
        .json({ message: "Session expired. Please login again." });
    }

    req.user = {
      ...payload,
      dbId: user._id.toString(),
      type: "user",
    };

    next();
  } catch (err) {
    console.error("User auth error:", err);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// -----------------------------
// STORE MANAGER AUTH
// -----------------------------
export const requireStoreManagerAuth = (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token)
      return res.status(401).json({ message: "Missing auth token" });

    const payload = jwt.verify(token, JWT_SECRET);

    // store manager के लिए type check
    if (!payload || payload.type !== "storeManager") {
      return res.status(401).json({ message: "Not a store manager token" });
    }

    req.user = payload;

    req.storeManager = {
      id: payload.sub,
      managerPhone: payload.managerPhone,
      storeName: payload.storeName,
    };

    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// BACKWARD COMPAT: requireAuth = admin auth
export const requireAuth = requireAdminAuth;

export { requireAdminAuth, requireUserAuth };
