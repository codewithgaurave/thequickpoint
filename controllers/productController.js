// controllers/productController.js
import Product from "../models/Product.js";
import Category from "../models/Category.js";

// helper to compute discount %
const computePercentageOff = (price, offerPrice) => {
  if (!price || !offerPrice || price <= 0) return 0;
  const diff = price - offerPrice;
  if (diff <= 0) return 0;
  return Math.round((diff / price) * 100);
};

// --------------------------------------
// POST /api/products  (admin) - create
// --------------------------------------
export const createProduct = async (req, res) => {
  try {
    const {
      name,
      categoryId,
      price,
      offerPrice,
      percentageOff,
      stockQuantity,
      unit,
      description,
      isActive,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Product name is required." });
    }

    if (!categoryId) {
      return res.status(400).json({ message: "categoryId is required." });
    }

    if (!price) {
      return res.status(400).json({ message: "price is required." });
    }

    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .json({ message: "At least one product image is required." });
    }

    if (req.files.length > 3) {
      return res
        .status(400)
        .json({ message: "Maximum 3 images allowed per product." });
    }

    // validate category
    const category = await Category.findOne({
      _id: categoryId,
      isDeleted: false,
    }).lean();

    if (!category) {
      return res.status(400).json({ message: "Invalid categoryId." });
    }

    const images = req.files.map((file) => file.path);

    const priceNum = Number(price);
    const offerPriceNum =
      offerPrice !== undefined && offerPrice !== null && offerPrice !== ""
        ? Number(offerPrice)
        : undefined;

    if (isNaN(priceNum) || priceNum < 0) {
      return res.status(400).json({ message: "Invalid price value." });
    }
    if (
      offerPriceNum !== undefined &&
      (isNaN(offerPriceNum) || offerPriceNum < 0)
    ) {
      return res
        .status(400)
        .json({ message: "Invalid offerPrice value (if provided)." });
    }

    let finalPercentageOff = 0;
    if (offerPriceNum !== undefined) {
      finalPercentageOff = computePercentageOff(priceNum, offerPriceNum);
    }
    if (percentageOff !== undefined && percentageOff !== "") {
      const p = Number(percentageOff);
      if (!isNaN(p) && p >= 0 && p <= 100) {
        finalPercentageOff = p;
      }
    }

    const stock = stockQuantity !== undefined ? Number(stockQuantity) : 0;
    if (isNaN(stock) || stock < 0) {
      return res.status(400).json({ message: "Invalid stockQuantity value." });
    }

    const product = await Product.create({
      name: name.trim(),
      category: categoryId,
      images,
      price: priceNum,
      offerPrice: offerPriceNum,
      percentageOff: finalPercentageOff,
      stockQuantity: stock,
      unit: unit || "piece",
      description: description ? description.trim() : "",
      isActive:
        isActive === undefined
          ? true
          : typeof isActive === "string"
          ? isActive === "true"
          : !!isActive,
    });

    return res.status(201).json({
      message: "Product created successfully",
      product,
    });
  } catch (err) {
    console.error("createProduct error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// GET /api/products  (public) - active only, optional category filter
// --------------------------------------
export const getActiveProducts = async (req, res) => {
  try {
    const { categoryId } = req.query;

    const filter = {
      isActive: true,
      isDeleted: false,
    };

    if (categoryId) {
      filter.category = categoryId;
    }

    const products = await Product.find(filter)
      .populate("category", "title imageUrl isActive")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ products });
  } catch (err) {
    console.error("getActiveProducts error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// GET /api/products/:id  (public: only active, non-deleted)
// --------------------------------------
export const getProductByIdPublic = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      isDeleted: false,
      isActive: true,
    })
      .populate("category", "title imageUrl isActive")
      .lean();

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.json({ product });
  } catch (err) {
    console.error("getProductByIdPublic error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// GET /api/products/admin  (admin) - all non-deleted
// --------------------------------------
export const adminListProducts = async (req, res) => {
  try {
    const { categoryId } = req.query;
    const filter = { isDeleted: false };
    if (categoryId) filter.category = categoryId;

    const products = await Product.find(filter)
      .populate("category", "title imageUrl isActive")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ products });
  } catch (err) {
    console.error("adminListProducts error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// GET /api/products/admin/:id  (admin)
// --------------------------------------
export const adminGetProductById = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      isDeleted: false,
    })
      .populate("category", "title imageUrl isActive")
      .lean();

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.json({ product });
  } catch (err) {
    console.error("adminGetProductById error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// PATCH /api/products/:id  (admin) - update + optional new images
// --------------------------------------
export const updateProduct = async (req, res) => {
  try {
    const {
      name,
      categoryId,
      price,
      offerPrice,
      percentageOff,
      stockQuantity,
      unit,
      description,
      isActive,
    } = req.body;

    const update = {};

    if (name !== undefined) {
      if (!name.trim()) {
        return res
          .status(400)
          .json({ message: "Product name cannot be empty." });
      }
      update.name = name.trim();
    }

    if (categoryId !== undefined) {
      const category = await Category.findOne({
        _id: categoryId,
        isDeleted: false,
      }).lean();
      if (!category) {
        return res.status(400).json({ message: "Invalid categoryId." });
      }
      update.category = categoryId;
    }

    if (price !== undefined) {
      const priceNum = Number(price);
      if (isNaN(priceNum) || priceNum < 0) {
        return res.status(400).json({ message: "Invalid price value." });
      }
      update.price = priceNum;
    }

    if (offerPrice !== undefined) {
      const offerPriceNum = Number(offerPrice);
      if (isNaN(offerPriceNum) || offerPriceNum < 0) {
        return res
          .status(400)
          .json({ message: "Invalid offerPrice value." });
      }
      update.offerPrice = offerPriceNum;
    }

    if (stockQuantity !== undefined) {
      const stock = Number(stockQuantity);
      if (isNaN(stock) || stock < 0) {
        return res
          .status(400)
          .json({ message: "Invalid stockQuantity value." });
      }
      update.stockQuantity = stock;
    }

    if (unit !== undefined) {
      update.unit = unit;
    }

    if (description !== undefined) {
      update.description = description.trim();
    }

    if (isActive !== undefined) {
      update.isActive =
        typeof isActive === "string" ? isActive === "true" : !!isActive;
    }

    // handle images: if new images are sent, replace old ones
    if (req.files && req.files.length > 0) {
      if (req.files.length > 3) {
        return res
          .status(400)
          .json({ message: "Maximum 3 images allowed per product." });
      }
      update.images = req.files.map((f) => f.path);
    }

    // If we changed price or offerPrice or percentageOff, recalc
    if (
      update.price !== undefined ||
      update.offerPrice !== undefined ||
      percentageOff !== undefined
    ) {
      // fetch existing product for remaining values
      const existing = await Product.findById(req.params.id).lean();
      if (!existing || existing.isDeleted) {
        return res.status(404).json({ message: "Product not found" });
      }

      const finalPrice =
        update.price !== undefined ? update.price : existing.price;
      const finalOfferPrice =
        update.offerPrice !== undefined
          ? update.offerPrice
          : existing.offerPrice;

      let finalPercentageOff =
        existing.percentageOff !== undefined ? existing.percentageOff : 0;

      if (finalOfferPrice !== undefined) {
        finalPercentageOff = computePercentageOff(finalPrice, finalOfferPrice);
      }

      if (percentageOff !== undefined && percentageOff !== "") {
        const p = Number(percentageOff);
        if (!isNaN(p) && p >= 0 && p <= 100) {
          finalPercentageOff = p;
        }
      }

      update.percentageOff = finalPercentageOff;
    }

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      update,
      { new: true, runValidators: true }
    )
      .populate("category", "title imageUrl isActive")
      .lean();

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.json({
      message: "Product updated successfully",
      product,
    });
  } catch (err) {
    console.error("updateProduct error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// PATCH /api/products/:id/status  (admin) - block/unblock
// --------------------------------------
export const updateProductStatus = async (req, res) => {
  try {
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res
        .status(400)
        .json({ message: "isActive must be true or false." });
    }

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { isActive },
      { new: true }
    )
      .populate("category", "title imageUrl isActive")
      .lean();

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.json({
      message: `Product ${isActive ? "activated" : "blocked"} successfully`,
      product,
    });
  } catch (err) {
    console.error("updateProductStatus error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// DELETE /api/products/:id  (admin) - soft delete
// --------------------------------------
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { isDeleted: true, isActive: false },
      { new: true }
    ).lean();

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.json({
      message: "Product deleted (soft) successfully",
    });
  } catch (err) {
    console.error("deleteProduct error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
