import mongoose from "mongoose";

const { Schema } = mongoose;

const addressSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },

    // Address Type
    type: {
      type: String,
      enum: ["home", "work", "other"],
      default: "home",
    },

    // Contact Information
    fullName: {
      type: String,
      trim: true,
      required: true,
    },
    mobile: {
      type: String,
      trim: true,
      required: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    // Address Details
    addressLine1: {
      type: String,
      trim: true,
      required: true,
    },
    addressLine2: {
      type: String,
      trim: true,
      default: "",
    },
    landmark: {
      type: String,
      trim: true,
      default: "",
    },
    city: {
      type: String,
      trim: true,
      required: true,
    },
    state: {
      type: String,
      trim: true,
      required: true,
    },
    pincode: {
      type: String,
      trim: true,
      required: true,
    },
    country: {
      type: String,
      trim: true,
      default: "India",
    },

    // Geolocation (optional)
    location: {
      latitude: { type: Number },
      longitude: { type: Number },
      accuracy: { type: Number },
      formattedAddress: { type: String },
    },

    // Flags
    isDefault: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },

    // Timestamps in IST
    createdAtIST: { type: String },
    updatedAtIST: { type: String },
  },
  { timestamps: true }
);

// Ensure only one default address per user
addressSchema.pre("save", async function (next) {
  if (this.isDefault && this.isModified("isDefault")) {
    await this.constructor.updateMany(
      { user: this.user, isDeleted: false, _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
  next();
});

// Set IST timestamps
addressSchema.pre("save", function (next) {
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

addressSchema.pre("findOneAndUpdate", function (next) {
  const istTime = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: true,
  });

  this.set({ updatedAtIST: istTime });
  next();
});

export default mongoose.model("Address", addressSchema);