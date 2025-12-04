// controllers/categoryController.js
import Category from "../models/Category.js";

// --------------------------------------
// POST /api/categories  (admin) - create
// --------------------------------------
export const createCategory = async (req, res) => {
  try {
    const { title, isActive } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Title is required." });
    }

    if (!req.file || !req.file.path) {
      return res
        .status(400)
        .json({ message: "Category image (categoryImage) is required." });
    }

    const category = await Category.create({
      title: title.trim(),
      imageUrl: req.file.path,
      isActive:
        isActive === undefined
          ? true
          : typeof isActive === "string"
          ? isActive === "true"
          : !!isActive,
    });

    return res.status(201).json({
      message: "Category created successfully",
      category,
    });
  } catch (err) {
    console.error("createCategory error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// GET /api/categories  (public) - active only
// --------------------------------------
export const getActiveCategories = async (_req, res) => {
  try {
    const categories = await Category.find({
      isActive: true,
      isDeleted: false,
    })
      .sort({ title: 1 })
      .lean();

    return res.json({ categories });
  } catch (err) {
    console.error("getActiveCategories error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// GET /api/categories/admin  (admin) - all non-deleted
// --------------------------------------
export const adminListCategories = async (_req, res) => {
  try {
    const categories = await Category.find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ categories });
  } catch (err) {
    console.error("adminListCategories error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// GET /api/categories/:id  (public/admin)
// --------------------------------------
export const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      isDeleted: false,
    }).lean();

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // public ke liye bhi same response
    return res.json({ category });
  } catch (err) {
    console.error("getCategoryById error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// PATCH /api/categories/:id  (admin) - update + optional new image
// --------------------------------------
export const updateCategory = async (req, res) => {
  try {
    const { title, isActive } = req.body;

    const update = {};

    if (title !== undefined) {
      if (!title.trim()) {
        return res
          .status(400)
          .json({ message: "Title cannot be empty string." });
      }
      update.title = title.trim();
    }

    if (isActive !== undefined) {
      update.isActive =
        typeof isActive === "string" ? isActive === "true" : !!isActive;
    }

    if (req.file && req.file.path) {
      update.imageUrl = req.file.path;
    }

    const category = await Category.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      update,
      { new: true, runValidators: true }
    ).lean();

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    return res.json({
      message: "Category updated successfully",
      category,
    });
  } catch (err) {
    console.error("updateCategory error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// PATCH /api/categories/:id/status  (admin) - block/unblock
// --------------------------------------
export const updateCategoryStatus = async (req, res) => {
  try {
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res
        .status(400)
        .json({ message: "isActive must be true or false." });
    }

    const category = await Category.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { isActive },
      { new: true }
    ).lean();

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    return res.json({
      message: `Category ${isActive ? "activated" : "blocked"} successfully`,
      category,
    });
  } catch (err) {
    console.error("updateCategoryStatus error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// DELETE /api/categories/:id  (admin) - soft delete
// --------------------------------------
export const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { isDeleted: true, isActive: false },
      { new: true }
    ).lean();

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    return res.json({
      message: "Category deleted (soft) successfully",
    });
  } catch (err) {
    console.error("deleteCategory error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
