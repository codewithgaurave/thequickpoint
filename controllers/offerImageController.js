// controllers/offerImageController.js
import OfferImage from "../models/OfferImage.js";

// POST /api/offer-images  (admin) - create
export const createOfferImage = async (req, res) => {
  try {
    if (!req.file || !req.file.path) {
      return res
        .status(400)
        .json({ message: "Offer image (offerImage) is required." });
    }

    const { isActive } = req.body;

    const offerImage = await OfferImage.create({
      imageUrl: req.file.path,
      isActive:
        isActive === undefined
          ? true
          : typeof isActive === "string"
          ? isActive === "true"
          : !!isActive,
    });

    return res.status(201).json({
      message: "Offer image created successfully",
      offerImage,
    });
  } catch (err) {
    console.error("createOfferImage error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/offer-images  (public) - active only
export const getActiveOfferImages = async (_req, res) => {
  try {
    const images = await OfferImage.find({
      isActive: true,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ offerImages: images });
  } catch (err) {
    console.error("getActiveOfferImages error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/offer-images/admin  (admin) - all non-deleted
export const adminListOfferImages = async (_req, res) => {
  try {
    const images = await OfferImage.find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ offerImages: images });
  } catch (err) {
    console.error("adminListOfferImages error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// PATCH /api/offer-images/:id  (admin) - update (image + isActive)
export const updateOfferImage = async (req, res) => {
  try {
    const update = {};

    if (req.body.isActive !== undefined) {
      update.isActive =
        typeof req.body.isActive === "string"
          ? req.body.isActive === "true"
          : !!req.body.isActive;
    }

    if (req.file && req.file.path) {
      update.imageUrl = req.file.path;
    }

    const offerImage = await OfferImage.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      update,
      { new: true }
    ).lean();

    if (!offerImage) {
      return res.status(404).json({ message: "Offer image not found" });
    }

    return res.json({
      message: "Offer image updated successfully",
      offerImage,
    });
  } catch (err) {
    console.error("updateOfferImage error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// PATCH /api/offer-images/:id/status  (admin)
export const updateOfferImageStatus = async (req, res) => {
  try {
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res
        .status(400)
        .json({ message: "isActive must be true or false." });
    }

    const offerImage = await OfferImage.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { isActive },
      { new: true }
    ).lean();

    if (!offerImage) {
      return res.status(404).json({ message: "Offer image not found" });
    }

    return res.json({
      message: `Offer image ${
        isActive ? "activated" : "deactivated"
      } successfully`,
      offerImage,
    });
  } catch (err) {
    console.error("updateOfferImageStatus error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// DELETE /api/offer-images/:id  (admin) - soft delete
export const deleteOfferImage = async (req, res) => {
  try {
    const offerImage = await OfferImage.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { isDeleted: true, isActive: false },
      { new: true }
    ).lean();

    if (!offerImage) {
      return res.status(404).json({ message: "Offer image not found" });
    }

    return res.json({
      message: "Offer image deleted (soft) successfully",
    });
  } catch (err) {
    console.error("deleteOfferImage error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
