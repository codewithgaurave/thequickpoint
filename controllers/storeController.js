// controllers/storeController.js
import Store from "../models/Store.js";

// --------------------------------------
// POST /api/stores  (admin) - create
// --------------------------------------
export const createStore = async (req, res) => {
  try {
    const {
      storeName,
      latitude,
      longitude,
      address,
      city,
      state,
      pincode,
      country,
      managerName,
      managerPhone,
      managerEmail,
      storeCode,
      openingHours,
      notes,
      isActive,
    } = req.body;

    if (!storeName || !storeName.trim()) {
      return res.status(400).json({ message: "storeName is required." });
    }

    if (!latitude || !longitude) {
      return res
        .status(400)
        .json({ message: "latitude and longitude are required." });
    }

    if (!managerName || !managerName.trim()) {
      return res.status(400).json({ message: "managerName is required." });
    }

    if (!managerPhone || !managerPhone.trim()) {
      return res.status(400).json({ message: "managerPhone is required." });
    }

    if (!req.file || !req.file.path) {
      return res
        .status(400)
        .json({ message: "Store image (storeImage) is required." });
    }

    const latNum = Number(latitude);
    const lngNum = Number(longitude);
    if (isNaN(latNum) || isNaN(lngNum)) {
      return res
        .status(400)
        .json({ message: "latitude and longitude must be numbers." });
    }

    const store = await Store.create({
      storeName: storeName.trim(),
      storeImageUrl: req.file.path,
      location: {
        latitude: latNum,
        longitude: lngNum,
        address: address ? address.trim() : "",
        city: city ? city.trim() : "",
        state: state ? state.trim() : "",
        pincode: pincode ? pincode.trim() : "",
        country: country ? country.trim() : "India",
      },
      managerName: managerName.trim(),
      managerPhone: managerPhone.trim(),
      managerEmail: managerEmail ? managerEmail.trim().toLowerCase() : "",
      storeCode: storeCode ? storeCode.trim() : "",
      openingHours: openingHours ? openingHours.trim() : "",
      notes: notes ? notes.trim() : "",
      isActive:
        isActive === undefined
          ? true
          : typeof isActive === "string"
          ? isActive === "true"
          : !!isActive,
    });

    return res.status(201).json({
      message: "Store created successfully",
      store,
    });
  } catch (err) {
    console.error("createStore error:", err);
    if (err.code === 11000 && err.keyPattern?.managerPhone) {
      return res
        .status(409)
        .json({ message: "managerPhone already in use for another store." });
    }
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// GET /api/stores  (public) - active only
// --------------------------------------
export const getActiveStores = async (_req, res) => {
  try {
    const stores = await Store.find({
      isActive: true,
      isDeleted: false,
    })
      .sort({ storeName: 1 })
      .lean();

    return res.json({ stores });
  } catch (err) {
    console.error("getActiveStores error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// GET /api/stores/:id  (public) - active only
// --------------------------------------
export const getStoreByIdPublic = async (req, res) => {
  try {
    const store = await Store.findOne({
      _id: req.params.id,
      isDeleted: false,
      isActive: true,
    }).lean();

    if (!store) {
      return res.status(404).json({ message: "Store not found" });
    }

    return res.json({ store });
  } catch (err) {
    console.error("getStoreByIdPublic error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// GET /api/stores/admin  (admin) - all non-deleted
// --------------------------------------
export const adminListStores = async (_req, res) => {
  try {
    const stores = await Store.find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ stores });
  } catch (err) {
    console.error("adminListStores error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// GET /api/stores/admin/:id  (admin)
// --------------------------------------
export const adminGetStoreById = async (req, res) => {
  try {
    const store = await Store.findOne({
      _id: req.params.id,
      isDeleted: false,
    }).lean();

    if (!store) {
      return res.status(404).json({ message: "Store not found" });
    }

    return res.json({ store });
  } catch (err) {
    console.error("adminGetStoreById error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// PATCH /api/stores/:id  (admin) - update
// --------------------------------------
export const updateStore = async (req, res) => {
  try {
    const {
      storeName,
      latitude,
      longitude,
      address,
      city,
      state,
      pincode,
      country,
      managerName,
      managerPhone,
      managerEmail,
      storeCode,
      openingHours,
      notes,
      isActive,
    } = req.body;

    const update = {};

    if (storeName !== undefined) {
      if (!storeName.trim()) {
        return res
          .status(400)
          .json({ message: "storeName cannot be empty." });
      }
      update.storeName = storeName.trim();
    }

    if (latitude !== undefined) {
      const latNum = Number(latitude);
      if (isNaN(latNum)) {
        return res
          .status(400)
          .json({ message: "latitude must be a number." });
      }
      update["location.latitude"] = latNum;
    }
    if (longitude !== undefined) {
      const lngNum = Number(longitude);
      if (isNaN(lngNum)) {
        return res
          .status(400)
          .json({ message: "longitude must be a number." });
      }
      update["location.longitude"] = lngNum;
    }
    if (address !== undefined) {
      update["location.address"] = address.trim();
    }
    if (city !== undefined) {
      update["location.city"] = city.trim();
    }
    if (state !== undefined) {
      update["location.state"] = state.trim();
    }
    if (pincode !== undefined) {
      update["location.pincode"] = pincode.trim();
    }
    if (country !== undefined) {
      update["location.country"] = country.trim();
    }

    if (managerName !== undefined) {
      if (!managerName.trim()) {
        return res
          .status(400)
          .json({ message: "managerName cannot be empty." });
      }
      update.managerName = managerName.trim();
    }

    if (managerPhone !== undefined) {
      if (!managerPhone.trim()) {
        return res
          .status(400)
          .json({ message: "managerPhone cannot be empty." });
      }
      update.managerPhone = managerPhone.trim();
    }

    if (managerEmail !== undefined) {
      update.managerEmail = managerEmail.trim().toLowerCase();
    }

    if (storeCode !== undefined) {
      update.storeCode = storeCode.trim();
    }
    if (openingHours !== undefined) {
      update.openingHours = openingHours.trim();
    }
    if (notes !== undefined) {
      update.notes = notes.trim();
    }

    if (isActive !== undefined) {
      update.isActive =
        typeof isActive === "string" ? isActive === "true" : !!isActive;
    }

    if (req.file && req.file.path) {
      update.storeImageUrl = req.file.path;
    }

    const store = await Store.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      update,
      { new: true, runValidators: true }
    ).lean();

    if (!store) {
      return res.status(404).json({ message: "Store not found" });
    }

    return res.json({
      message: "Store updated successfully",
      store,
    });
  } catch (err) {
    console.error("updateStore error:", err);
    if (err.code === 11000 && err.keyPattern?.managerPhone) {
      return res
        .status(409)
        .json({ message: "managerPhone already in use for another store." });
    }
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// PATCH /api/stores/:id/status  (admin) - active/inactive
// --------------------------------------
export const updateStoreStatus = async (req, res) => {
  try {
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res
        .status(400)
        .json({ message: "isActive must be true or false." });
    }

    const store = await Store.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { isActive },
      { new: true }
    ).lean();

    if (!store) {
      return res.status(404).json({ message: "Store not found" });
    }

    return res.json({
      message: `Store ${isActive ? "activated" : "blocked"} successfully`,
      store,
    });
  } catch (err) {
    console.error("updateStoreStatus error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// DELETE /api/stores/:id  (admin) - soft delete
// --------------------------------------
export const deleteStore = async (req, res) => {
  try {
    const store = await Store.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { isDeleted: true, isActive: false },
      { new: true }
    ).lean();

    if (!store) {
      return res.status(404).json({ message: "Store not found" });
    }

    return res.json({
      message: "Store deleted (soft) successfully",
    });
  } catch (err) {
    console.error("deleteStore error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
