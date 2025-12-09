// controllers/deliveryBoyController.js
import DeliveryBoy from "../models/deliveryBoyModel.js";

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
