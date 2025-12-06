// models/Cart.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const cartItemSchema = new Schema(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
    priceAtAdd: {
      type: Number,
      min: 0,
    },
    offerPriceAtAdd: {
      type: Number,
      min: 0,
    },
    unit: {
      type: String,
      default: "piece",
    },
  },
  { _id: true }
);

const cartSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      unique: true, // 1 user = 1 active cart
      index: true,
    },
    items: {
      type: [cartItemSchema],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    createdAtIST: { type: String },
    updatedAtIST: { type: String },
  },
  { timestamps: true }
);

// IST timestamps
cartSchema.pre("save", function (next) {
  const istTime = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: true,
  });

  if (this.isNew && !this.createdAtIST) {
    this.createdAtIST = istTime;
  }
  this.updatedAtIST = istTime;
  next();
});

cartSchema.pre("findOneAndUpdate", function (next) {
  const istTime = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: true,
  });

  this.set({ updatedAtIST: istTime });
  next();
});

export default mongoose.model("Cart", cartSchema);
