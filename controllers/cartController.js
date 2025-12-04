// controllers/cartController.js
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";

// Helper to get or create cart for user
const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId, isDeleted: false });
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }
  return cart;
};

// --------------------------------------
// GET /api/cart  (user) - get my cart
// --------------------------------------
export const getMyCart = async (req, res) => {
  try {
    const userId = req.user.sub;

    const cart = await Cart.findOne({
      user: userId,
      isDeleted: false,
    })
      .populate("items.product", "name images price offerPrice stockQuantity unit isActive")
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
// POST /api/cart/add  (user) - add or increase
// body: { productId, quantity }
// --------------------------------------
export const addToCart = async (req, res) => {
  try {
    const userId = req.user.sub;
    const { productId } = req.body;
    let { quantity } = req.body;

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
      return res.status(404).json({ message: "Product not found or inactive." });
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
        offerPriceAtAdd: product.offerPrice ?? product.price,
        unit: product.unit || "piece",
      });
    }

    await cart.save();

    cart = await Cart.findById(cart._id)
      .populate("items.product", "name images price offerPrice stockQuantity unit isActive")
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
// PATCH /api/cart/update  (user) - set quantity
// body: { productId, quantity }
// quantity <=0 => remove
// --------------------------------------
export const updateCartItem = async (req, res) => {
  try {
    const userId = req.user.sub;
    const { productId } = req.body;
    let { quantity } = req.body;

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
      return res.status(404).json({ message: "Product not found in cart." });
    }

    if (quantity <= 0) {
      // remove item
      cart.items.splice(idx, 1);
    } else {
      cart.items[idx].quantity = quantity;
    }

    await cart.save();

    const populatedCart = await Cart.findById(cart._id)
      .populate("items.product", "name images price offerPrice stockQuantity unit isActive")
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
// DELETE /api/cart/item/:productId  (user) - remove
// --------------------------------------
export const removeCartItem = async (req, res) => {
  try {
    const userId = req.user.sub;
    const { productId } = req.params;

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
      .populate("items.product", "name images price offerPrice stockQuantity unit isActive")
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
// DELETE /api/cart/clear  (user) - clear entire cart
// --------------------------------------
export const clearCart = async (req, res) => {
  try {
    const userId = req.user.sub;

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
