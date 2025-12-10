import mongoose from "mongoose";

const { Schema } = mongoose;

const paymentSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
    
    // Payment Details
    paymentMethod: {
      type: String,
      enum: ["cod", "upi", "card", "netbanking", "wallet"],
      required: true,
    },
    
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    
    currency: {
      type: String,
      default: "INR",
    },
    
    // Payment Status
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    
    // For online payments
    transactionId: {
      type: String,
      default: "",
    },
    
    upiId: {
      type: String,
      default: "",
    },
    
    cardLast4: {
      type: String,
      default: "",
    },
    
    bankName: {
      type: String,
      default: "",
    },
    
    // Reference to order (optional - can be linked later)
    order: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    
    // Metadata
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    
    // Error information
    errorMessage: {
      type: String,
      default: "",
    },
    
    isDeleted: {
      type: Boolean,
      default: false,
    },
    
    // IST Timestamps
    createdAtIST: { type: String },
    updatedAtIST: { type: String },
  },
  { timestamps: true }
);

// Set IST timestamps
paymentSchema.pre("save", function (next) {
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

paymentSchema.pre("findOneAndUpdate", function (next) {
  const istTime = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: true,
  });

  this.set({ updatedAtIST: istTime });
  next();
});

export default mongoose.model("Payment", paymentSchema);