import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import Store from "../models/Store.js";

const getUserIdFromReq = (req) => {
  const id =
    req?.body?.userId ||
    req?.query?.userId ||
    req?.params?.userId ||
    "";
  return typeof id === "string" ? id.trim() : id;
};

const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId, isDeleted: false });
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }
  return cart;
};

// --------------------------------------
// GET /api/cart?userId=...
// --------------------------------------
export const getMyCart = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) {
      return res.status(400).json({ message: "userId is required (query param)." });
    }

    const cart = await Cart.findOne({
      user: userId,
      isDeleted: false,
    })
      .populate("items.product", "name images price offerPrice stockQuantity unit isActive store")
      .populate("items.store", "storeName location managerName managerPhone")
      .lean();

    if (!cart) {
      return res.json({
        cart: {
          user: userId,
          items: [],
        },
      });
    }

    // Organize items by store
    const storeItems = {};
    const globalItems = [];
    
    cart.items.forEach(item => {
      if (item.store && item.store._id) {
        const storeId = item.store._id.toString();
        if (!storeItems[storeId]) {
          storeItems[storeId] = {
            store: item.store,
            items: []
          };
        }
        storeItems[storeId].items.push(item);
      } else {
        globalItems.push(item);
      }
    });

    return res.json({ 
      cart,
      organized: {
        globalItems,
        storeItems: Object.values(storeItems)
      }
    });
  } catch (err) {
    console.error("getMyCart error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// GET /api/cart/store/:storeId?userId=...
// Get cart items for specific store
// --------------------------------------
export const getCartByStore = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    const { storeId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "userId is required." });
    }

    if (!storeId) {
      return res.status(400).json({ message: "storeId is required." });
    }

    // Verify store exists
    const store = await Store.findOne({
      _id: storeId,
      isDeleted: false,
      isActive: true,
    }).lean();

    if (!store) {
      return res.status(404).json({ message: "Store not found or inactive." });
    }

    const cart = await Cart.findOne({
      user: userId,
      isDeleted: false,
    })
      .populate({
        path: "items.product",
        match: { store: storeId, isDeleted: false, isActive: true },
        select: "name images price offerPrice stockQuantity unit isActive"
      })
      .populate("items.store", "storeName location managerName managerPhone")
      .lean();

    if (!cart) {
      return res.json({
        cart: {
          user: userId,
          store,
          items: [],
        },
      });
    }

    // Filter items for this store
    const storeItems = cart.items.filter(item => 
      item.product && item.store && 
      String(item.store._id) === storeId &&
      String(item.product.store) === storeId
    );

    return res.json({
      cart: {
        _id: cart._id,
        user: cart.user,
        store,
        items: storeItems,
        createdAtIST: cart.createdAtIST,
        updatedAtIST: cart.updatedAtIST,
      },
    });
  } catch (err) {
    console.error("getCartByStore error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// POST /api/cart/add
// body: { userId, productId, storeId (optional), quantity }
// --------------------------------------
export const addToCart = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    const { productId, storeId } = req.body;
    let { quantity } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId is required." });
    }
    if (!productId) {
      return res.status(400).json({ message: "productId is required." });
    }

    // Validate store if provided
    let store = null;
    if (storeId) {
      store = await Store.findOne({
        _id: storeId,
        isDeleted: false,
        isActive: true,
      }).lean();
      
      if (!store) {
        return res.status(404).json({ message: "Store not found or inactive." });
      }
    }

    // Get product with store validation
    const productFilter = storeId 
      ? { 
          _id: productId, 
          store: storeId, 
          isDeleted: false, 
          isActive: true 
        }
      : { 
          _id: productId, 
          store: null, 
          isDeleted: false, 
          isActive: true 
        };
    
    const product = await Product.findOne(productFilter).lean();

    if (!product) {
      const message = storeId 
        ? "Product not found in this store."
        : "Global product not found.";
      return res.status(404).json({ message });
    }

    quantity = quantity === undefined || quantity === null || quantity === ""
      ? 1
      : Number(quantity);

    if (isNaN(quantity) || quantity <= 0) {
      return res.status(400).json({ message: "quantity must be a positive number." });
    }

    let cart = await getOrCreateCart(userId);

    // Check if item exists with same product and store
    const existingItemIndex = cart.items.findIndex(
      (it) => String(it.product) === String(productId) && 
             String(it.store || null) === String(storeId || null)
    );

    if (existingItemIndex > -1) {
      // Update existing item
      cart.items[existingItemIndex].quantity += quantity;
    } else {
      // Add new item with store info
      cart.items.push({
        product: productId,
        store: storeId || null,
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
      .populate("items.product", "name images price offerPrice stockQuantity unit isActive store")
      .populate("items.store", "storeName location managerName managerPhone")
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
// body: { userId, productId, storeId (if store product), quantity }
// --------------------------------------
export const updateCartItem = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    const { productId, storeId } = req.body;
    let { quantity } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId is required." });
    }
    if (!productId) {
      return res.status(400).json({ message: "productId is required." });
    }

    quantity = Number(quantity);
    if (isNaN(quantity)) {
      return res.status(400).json({ message: "quantity must be a number." });
    }

    const cart = await Cart.findOne({ user: userId, isDeleted: false });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found." });
    }

    // Find item with matching product and store
    const idx = cart.items.findIndex(
      (it) => String(it.product) === String(productId) && 
             String(it.store || null) === String(storeId || null)
    );

    if (idx === -1) {
      return res.status(404).json({ message: "Product not found in cart." });
    }

    if (quantity <= 0) {
      cart.items.splice(idx, 1);
    } else {
      cart.items[idx].quantity = quantity;
    }

    await cart.save();

    const populatedCart = await Cart.findById(cart._id)
      .populate("items.product", "name images price offerPrice stockQuantity unit isActive store")
      .populate("items.store", "storeName location managerName managerPhone")
      .lean();

    return res.json({
      message: quantity <= 0 ? "Item removed from cart." : "Cart item updated successfully.",
      cart: populatedCart,
    });
  } catch (err) {
    console.error("updateCartItem error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// DELETE /api/cart/item/:productId?userId=...&storeId=...
// --------------------------------------
export const removeCartItem = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    const { productId } = req.params;
    const { storeId } = req.query;

    if (!userId) {
      return res.status(400).json({ message: "userId is required." });
    }

    const cart = await Cart.findOne({ user: userId, isDeleted: false });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found." });
    }

    const originalLength = cart.items.length;
    
    // Remove item with matching product and store
    cart.items = cart.items.filter(
      (it) => !(
        String(it.product) === String(productId) && 
        String(it.store || null) === String(storeId || null)
      )
    );

    if (cart.items.length === originalLength) {
      return res.status(404).json({ message: "Product not found in cart." });
    }

    await cart.save();

    const populatedCart = await Cart.findById(cart._id)
      .populate("items.product", "name images price offerPrice stockQuantity unit isActive store")
      .populate("items.store", "storeName location managerName managerPhone")
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
// DELETE /api/cart/clear?userId=...&storeId=... (optional)
// --------------------------------------
export const clearCart = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    const { storeId } = req.query;

    if (!userId) {
      return res.status(400).json({ message: "userId is required." });
    }

    const cart = await Cart.findOne({ user: userId, isDeleted: false });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found." });
    }

    if (storeId) {
      // Clear only items from specific store
      cart.items = cart.items.filter(item => 
        !item.store || String(item.store) !== storeId
      );
    } else {
      // Clear entire cart
      cart.items = [];
    }

    await cart.save();

    return res.json({
      message: storeId ? "Store items cleared from cart." : "Cart cleared successfully",
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

// --------------------------------------
// PATCH /api/cart/decrease
// body: { userId, productId, storeId (optional), decrementBy }
// --------------------------------------
export const decreaseCartItem = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    const { productId, storeId } = req.body;
    let { decrementBy } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId is required." });
    }
    if (!productId) {
      return res.status(400).json({ message: "productId is required." });
    }

    decrementBy = decrementBy === undefined || decrementBy === null || decrementBy === ""
      ? 1
      : Number(decrementBy);

    if (isNaN(decrementBy) || decrementBy <= 0) {
      return res.status(400).json({ message: "decrementBy must be a positive number." });
    }

    const cart = await Cart.findOne({ user: userId, isDeleted: false });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found." });
    }

    const idx = cart.items.findIndex(
      (it) => String(it.product) === String(productId) && 
             String(it.store || null) === String(storeId || null)
    );

    if (idx === -1) {
      return res.status(404).json({ message: "Product not found in cart." });
    }

    cart.items[idx].quantity -= decrementBy;

    if (cart.items[idx].quantity <= 0) {
      cart.items.splice(idx, 1);
    }

    await cart.save();

    const populatedCart = await Cart.findById(cart._id)
      .populate("items.product", "name images price offerPrice stockQuantity unit isActive store")
      .populate("items.store", "storeName location managerName managerPhone")
      .lean();

    const itemExists = populatedCart.items.some(item => 
      String(item.product._id) === productId && 
      String(item.store?._id || null) === String(storeId || null)
    );

    return res.json({
      message: itemExists 
        ? "Cart item quantity decreased successfully." 
        : "Item removed from cart.",
      cart: populatedCart,
    });
  } catch (err) {
    console.error("decreaseCartItem error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------
// POST /api/cart/store/:storeId/checkout
// Checkout only items from specific store
// --------------------------------------
export const checkoutFromStoreCart = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    const { storeId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "userId is required." });
    }

    if (!storeId) {
      return res.status(400).json({ message: "storeId is required." });
    }

    // Verify store exists and is active
    const store = await Store.findOne({
      _id: storeId,
      isDeleted: false,
      isActive: true,
    }).lean();

    if (!store) {
      return res.status(404).json({ message: "Store not found or inactive." });
    }

    const cart = await Cart.findOne({
      user: userId,
      isDeleted: false,
    })
    .populate({
      path: "items.product",
      match: { store: storeId, isDeleted: false, isActive: true }
    })
    .populate("items.store")
    .lean();

    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty." });
    }

    // Filter items for this store
    const storeItems = cart.items.filter(item => 
      item.product && item.store && 
      String(item.store._id) === storeId &&
      String(item.product.store) === storeId
    );

    if (storeItems.length === 0) {
      return res.status(400).json({ message: "No items in cart for this store." });
    }

    // Continue with checkout logic (this would be similar to checkoutFromCart)
    // You would process the checkout for storeItems only
    
    // For now, return the filtered items
    return res.json({
      message: "Ready for checkout from store",
      store,
      items: storeItems,
      itemCount: storeItems.length,
    });
  } catch (err) {
    console.error("checkoutFromStoreCart error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};