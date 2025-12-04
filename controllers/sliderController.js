// controllers/sliderController.js
import Slider from "../models/Slider.js";

// --------------------------------------
// POST /api/sliders  (admin) - create
// --------------------------------------
export const createSlider = async (req, res) => {
  try {
    const { title, subtitle, redirectUrl, sortOrder, isActive } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Title is required." });
    }

    if (!req.file || !req.file.path) {
      return res
        .status(400)
        .json({ message: "Slider image (sliderImage) is required." });
    }

    const slider = await Slider.create({
      title: title.trim(),
      subtitle: subtitle ? subtitle.trim() : "",
      redirectUrl: redirectUrl ? redirectUrl.trim() : "",
      sortOrder: sortOrder ?? 0,
      isActive: typeof isActive === "string" ? isActive === "true" : isActive,
      imageUrl: req.file.path, // Cloudinary URL
    });

    return res.status(201).json({
      message: "Slider created successfully",
      slider,
    });
  } catch (err) {
    console.error("createSlider error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// GET /api/sliders  (public) - active only
// --------------------------------------
export const getActiveSliders = async (_req, res) => {
  try {
    const sliders = await Slider.find({
      isActive: true,
      isDeleted: false,
    })
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    return res.json({ sliders });
  } catch (err) {
    console.error("getActiveSliders error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// GET /api/sliders/admin  (admin) - all (non-deleted)
// --------------------------------------
export const adminListSliders = async (_req, res) => {
  try {
    const sliders = await Slider.find({ isDeleted: false })
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    return res.json({ sliders });
  } catch (err) {
    console.error("adminListSliders error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// GET /api/sliders/:id  (public)
// --------------------------------------
export const getSliderById = async (req, res) => {
  try {
    const slider = await Slider.findOne({
      _id: req.params.id,
      isDeleted: false,
    }).lean();

    if (!slider) {
      return res.status(404).json({ message: "Slider not found" });
    }

    // Optional: public ko sirf active dikhao
    // if (!slider.isActive) {
    //   return res.status(404).json({ message: "Slider not found" });
    // }

    return res.json({ slider });
  } catch (err) {
    console.error("getSliderById error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// PATCH /api/sliders/:id  (admin) - update + optional new image
// --------------------------------------
export const updateSlider = async (req, res) => {
  try {
    const { title, subtitle, redirectUrl, sortOrder, isActive } = req.body;

    const update = {};

    if (title !== undefined) update.title = title.trim();
    if (subtitle !== undefined) update.subtitle = subtitle.trim();
    if (redirectUrl !== undefined) update.redirectUrl = redirectUrl.trim();
    if (sortOrder !== undefined) update.sortOrder = Number(sortOrder);
    if (isActive !== undefined) {
      update.isActive =
        typeof isActive === "string" ? isActive === "true" : !!isActive;
    }

    if (req.file && req.file.path) {
      update.imageUrl = req.file.path;
    }

    const slider = await Slider.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      update,
      { new: true, runValidators: true }
    ).lean();

    if (!slider) {
      return res.status(404).json({ message: "Slider not found" });
    }

    return res.json({
      message: "Slider updated successfully",
      slider,
    });
  } catch (err) {
    console.error("updateSlider error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// PATCH /api/sliders/:id/status  (admin) - active/inactive
// --------------------------------------
export const updateSliderStatus = async (req, res) => {
  try {
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res
        .status(400)
        .json({ message: "isActive must be true or false." });
    }

    const slider = await Slider.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { isActive },
      { new: true }
    ).lean();

    if (!slider) {
      return res.status(404).json({ message: "Slider not found" });
    }

    return res.json({
      message: `Slider ${
        isActive ? "activated" : "deactivated"
      } successfully`,
      slider,
    });
  } catch (err) {
    console.error("updateSliderStatus error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// DELETE /api/sliders/:id  (admin) - soft delete
// --------------------------------------
export const deleteSlider = async (req, res) => {
  try {
    const slider = await Slider.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { isDeleted: true, isActive: false },
      { new: true }
    ).lean();

    if (!slider) {
      return res.status(404).json({ message: "Slider not found" });
    }

    return res.json({
      message: "Slider deleted (soft) successfully",
    });
  } catch (err) {
    console.error("deleteSlider error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
