// controllers/cartController.js
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";

// Helper: get userId from request (body/query/params)
const getUserIdFromReq = (req) => {
  const id =
    req.body.userId ||
    req.query.userId ||
    req.params.userId ||
    "";
  return typeof id === "string" ? id.trim() : id;
};

// Helper to get or create cart for a userId
const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId, isDeleted: false });
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }
  return cart;
};

// --------------------------------------
// GET /api/cart?userId=...  - get cart by userId
// --------------------------------------
export const getMyCart = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) {
      return res
        .status(400)
        .json({ message: "userId is required (query param)." });
    }

    const cart = await Cart.findOne({
      user: userId,
      isDeleted: false,
    })
      .populate(
        "items.product",
        "name images price offerPrice stockQuantity unit isActive"
      )
      .lean();

    if (!cart) {
      return res.json({
        cart: {
          user: userId,
          items: [],
        },
      });
    }

    return res.json({ cart });
  } catch (err) {
    console.error("getMyCart error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// POST /api/cart/add
// body: { userId, productId, quantity }
// --------------------------------------
export const addToCart = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    const { productId } = req.body;
    let { quantity } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId is required." });
    }
    if (!productId) {
      return res
        .status(400)
        .json({ message: "productId is required." });
    }

    quantity =
      quantity === undefined || quantity === null || quantity === ""
        ? 1
        : Number(quantity);

    if (isNaN(quantity) || quantity <= 0) {
      return res
        .status(400)
        .json({ message: "quantity must be a positive number." });
    }

    const product = await Product.findOne({
      _id: productId,
      isDeleted: false,
      isActive: true,
    }).lean();

    if (!product) {
      return res
        .status(404)
        .json({ message: "Product not found or inactive." });
    }

    let cart = await getOrCreateCart(userId);

    // check if item exists
    const existingItem = cart.items.find(
      (it) => String(it.product) === String(productId)
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({
        product: productId,
        quantity,
        priceAtAdd: product.price,
        offerPriceAtAdd:
          product.offerPrice !== undefined && product.offerPrice !== null
            ? product.offerPrice
            : product.price,
        unit: product.unit || "piece",
      });
    }

    await cart.save();

    cart = await Cart.findById(cart._id)
      .populate(
        "items.product",
        "name images price offerPrice stockQuantity unit isActive"
      )
      .lean();

    return res.json({
      message: "Item added to cart successfully",
      cart,
    });
  } catch (err) {
    console.error("addToCart error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// PATCH /api/cart/update
// body: { userId, productId, quantity }
// quantity <= 0 => remove
// --------------------------------------
export const updateCartItem = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    const { productId } = req.body;
    let { quantity } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId is required." });
    }
    if (!productId) {
      return res
        .status(400)
        .json({ message: "productId is required." });
    }

    quantity = Number(quantity);
    if (isNaN(quantity)) {
      return res
        .status(400)
        .json({ message: "quantity must be a number." });
    }

    const cart = await Cart.findOne({ user: userId, isDeleted: false });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found." });
    }

    const idx = cart.items.findIndex(
      (it) => String(it.product) === String(productId)
    );

    if (idx === -1) {
      return res
        .status(404)
        .json({ message: "Product not found in cart." });
    }

    if (quantity <= 0) {
      cart.items.splice(idx, 1);
    } else {
      cart.items[idx].quantity = quantity;
    }

    await cart.save();

    const populatedCart = await Cart.findById(cart._id)
      .populate(
        "items.product",
        "name images price offerPrice stockQuantity unit isActive"
      )
      .lean();

    return res.json({
      message:
        quantity <= 0
          ? "Item removed from cart."
          : "Cart item updated successfully.",
      cart: populatedCart,
    });
  } catch (err) {
    console.error("updateCartItem error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// DELETE /api/cart/item/:productId?userId=...
// --------------------------------------
export const removeCartItem = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    const { productId } = req.params;

    if (!userId) {
      return res
        .status(400)
        .json({ message: "userId is required (query param or body)." });
    }

    const cart = await Cart.findOne({ user: userId, isDeleted: false });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found." });
    }

    const originalLength = cart.items.length;
    cart.items = cart.items.filter(
      (it) => String(it.product) !== String(productId)
    );

    if (cart.items.length === originalLength) {
      return res
        .status(404)
        .json({ message: "Product not found in cart." });
    }

    await cart.save();

    const populatedCart = await Cart.findById(cart._id)
      .populate(
        "items.product",
        "name images price offerPrice stockQuantity unit isActive"
      )
      .lean();

    return res.json({
      message: "Item removed from cart.",
      cart: populatedCart,
    });
  } catch (err) {
    console.error("removeCartItem error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// DELETE /api/cart/clear?userId=...
// --------------------------------------
export const clearCart = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) {
      return res
        .status(400)
        .json({ message: "userId is required (query param or body)." });
    }

    const cart = await Cart.findOne({ user: userId, isDeleted: false });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found." });
    }

    cart.items = [];
    await cart.save();

    return res.json({
      message: "Cart cleared successfully",
      cart: {
        user: userId,
        items: [],
      },
    });
  } catch (err) {
    console.error("clearCart error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
