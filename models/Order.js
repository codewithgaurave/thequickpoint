// models/Order.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const orderItemSchema = new Schema(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: { type: String, required: true },
    images: { type: [String], default: [] },
    unit: { type: String, default: "piece" },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 }, // original
    offerPrice: { type: Number, min: 0 }, // actual selling price
    percentageOff: { type: Number, min: 0, max: 100, default: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: true }
);

const orderSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    items: {
      type: [orderItemSchema],
      default: [],
    },

    subtotal: { type: Number, default: 0 }, // sum(price * qty)
    totalDiscount: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
      default: "pending",
    },

    paymentMethod: {
      type: String,
      enum: ["cod", "upi", "card", "netbanking", "wallet", "other"],
      default: "cod",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },

    shippingAddress: {
      fullName: { type: String, trim: true, default: "" },
      mobile: { type: String, trim: true, default: "" },
      email: { type: String, trim: true, lowercase: true, default: "" },
      addressLine1: { type: String, trim: true, default: "" },
      addressLine2: { type: String, trim: true, default: "" },
      landmark: { type: String, trim: true, default: "" },
      city: { type: String, trim: true, default: "" },
      state: { type: String, trim: true, default: "" },
      pincode: { type: String, trim: true, default: "" },
      country: { type: String, trim: true, default: "India" },
      location: {
        latitude: { type: Number },
        longitude: { type: Number },
        accuracy: { type: Number },
      },
    },

    notes: { type: String, trim: true, default: "" },

    isDeleted: { type: Boolean, default: false },

    createdAtIST: { type: String },
    updatedAtIST: { type: String },
  },
  { timestamps: true }
);

// IST timestamps
orderSchema.pre("save", function (next) {
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

orderSchema.pre("findOneAndUpdate", function (next) {
  const istTime = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: true,
  });

  this.set({ updatedAtIST: istTime });
  next();
});

export default mongoose.model("Order", orderSchema);
