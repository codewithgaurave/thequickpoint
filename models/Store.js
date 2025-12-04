// models/Store.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const storeSchema = new Schema(
  {
    storeName: {
      type: String,
      required: true,
      trim: true,
    },

    // Store image URL (Cloudinary)
    storeImageUrl: {
      type: String,
      required: true,
    },

    // Location info
    location: {
      latitude: {
        type: Number,
        required: true,
      },
      longitude: {
        type: Number,
        required: true,
      },
      address: {
        type: String,
        trim: true,
        default: "",
      },
      city: {
        type: String,
        trim: true,
        default: "",
      },
      state: {
        type: String,
        trim: true,
        default: "",
      },
      pincode: {
        type: String,
        trim: true,
        default: "",
      },
      country: {
        type: String,
        trim: true,
        default: "India",
      },
    },

    // Manager info
    managerName: {
      type: String,
      trim: true,
      required: true,
    },
    managerPhone: {
      type: String,
      trim: true,
      required: true,
      unique: true,
      index: true,
    },
    managerEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    // Extra details
    storeCode: {
      type: String,
      trim: true,
      default: "",
    },
    openingHours: {
      type: String,
      trim: true,
      default: "",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
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
storeSchema.pre("save", function (next) {
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

storeSchema.pre("findOneAndUpdate", function (next) {
  const istTime = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: true,
  });

  this.set({ updatedAtIST: istTime });
  next();
});

export default mongoose.model("Store", storeSchema);
