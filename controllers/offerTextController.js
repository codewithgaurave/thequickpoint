// controllers/offerTextController.js
import OfferText from "../models/OfferText.js";

// POST /api/offer-texts  (admin) - create
export const createOfferText = async (req, res) => {
  try {
    const { text, isActive } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "text is required." });
    }

    const offerText = await OfferText.create({
      text: text.trim(),
      isActive:
        isActive === undefined
          ? true
          : typeof isActive === "string"
          ? isActive === "true"
          : !!isActive,
    });

    return res.status(201).json({
      message: "Offer text created successfully",
      offerText,
    });
  } catch (err) {
    console.error("createOfferText error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/offer-texts  (public) - active only
export const getActiveOfferTexts = async (_req, res) => {
  try {
    const texts = await OfferText.find({
      isActive: true,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ offerTexts: texts });
  } catch (err) {
    console.error("getActiveOfferTexts error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/offer-texts/admin  (admin)
export const adminListOfferTexts = async (_req, res) => {
  try {
    const texts = await OfferText.find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ offerTexts: texts });
  } catch (err) {
    console.error("adminListOfferTexts error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/offer-texts/:id  (admin/public)
export const getOfferTextById = async (req, res) => {
  try {
    const text = await OfferText.findOne({
      _id: req.params.id,
      isDeleted: false,
    }).lean();

    if (!text) {
      return res.status(404).json({ message: "Offer text not found" });
    }

    return res.json({ offerText: text });
  } catch (err) {
    console.error("getOfferTextById error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// PATCH /api/offer-texts/:id  (admin)
export const updateOfferText = async (req, res) => {
  try {
    const update = {};

    if (req.body.text !== undefined) {
      if (!req.body.text.trim()) {
        return res
          .status(400)
          .json({ message: "text cannot be empty string." });
      }
      update.text = req.body.text.trim();
    }

    if (req.body.isActive !== undefined) {
      update.isActive =
        typeof req.body.isActive === "string"
          ? req.body.isActive === "true"
          : !!req.body.isActive;
    }

    const text = await OfferText.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      update,
      { new: true }
    ).lean();

    if (!text) {
      return res.status(404).json({ message: "Offer text not found" });
    }

    return res.json({
      message: "Offer text updated successfully",
      offerText: text,
    });
  } catch (err) {
    console.error("updateOfferText error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// PATCH /api/offer-texts/:id/status  (admin)
export const updateOfferTextStatus = async (req, res) => {
  try {
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res
        .status(400)
        .json({ message: "isActive must be true or false." });
    }

    const text = await OfferText.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { isActive },
      { new: true }
    ).lean();

    if (!text) {
      return res.status(404).json({ message: "Offer text not found" });
    }

    return res.json({
      message: `Offer text ${
        isActive ? "activated" : "deactivated"
      } successfully`,
      offerText: text,
    });
  } catch (err) {
    console.error("updateOfferTextStatus error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// DELETE /api/offer-texts/:id  (admin) - soft delete
export const deleteOfferText = async (req, res) => {
  try {
    const text = await OfferText.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { isDeleted: true, isActive: false },
      { new: true }
    ).lean();

    if (!text) {
      return res.status(404).json({ message: "Offer text not found" });
    }

    return res.json({
      message: "Offer text deleted (soft) successfully",
    });
  } catch (err) {
    console.error("deleteOfferText error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
