// models/Product.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const productSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    images: {
      type: [String], // up to 3 URLs
      validate: {
        validator: (arr) => arr.length > 0 && arr.length <= 3,
        message: "Product must have between 1 and 3 images.",
      },
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    offerPrice: {
      type: Number,
      min: 0,
    },
    percentageOff: {
      type: Number,
      min: 0,
      max: 100,
    },
    stockQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    unit: {
      type: String,
      enum: [
        "piece",
        "pcs",
        "kg",
        "g",
        "mg",
        "litre",
        "ml",
        "dozen",
        "packet",
        "box",
        "meter",
        "cm",
        "set",
        "pair",
        "bottle",
        "bag",
        "roll",
        "unit",
      ],
      default: "piece",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },

    createdAtIST: { type: String },
    updatedAtIST: { type: String },
  },
  { timestamps: true }
);

// IST timestamps
productSchema.pre("save", function (next) {
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

productSchema.pre("findOneAndUpdate", function (next) {
  const istTime = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: true,
  });

  this.set({ updatedAtIST: istTime });
  next();
});

export default mongoose.model("Product", productSchema);
