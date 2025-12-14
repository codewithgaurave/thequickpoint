import mongoose from "mongoose";
const { Schema } = mongoose;

const paymentSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    order: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      default: null,
      index: true,
    },

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

    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },

    // 🔥 Cashfree
    cashfreeOrderId: { type: String, default: "", index: true },
    paymentSessionId: { type: String, default: "" },
    transactionId: { type: String, default: "" },

    metadata: { type: Schema.Types.Mixed, default: {} },
    errorMessage: { type: String, default: "" },
    isDeleted: { type: Boolean, default: false },

    createdAtIST: String,
    updatedAtIST: String,
  },
  { timestamps: true }
);

// IST timestamps
paymentSchema.pre("save", function (next) {
  const ist = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: true,
  });
  if (this.isNew && !this.createdAtIST) this.createdAtIST = ist;
  this.updatedAtIST = ist;
  next();
});

paymentSchema.pre("findOneAndUpdate", function (next) {
  const ist = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: true,
  });
  this.set({ updatedAtIST: ist });
  next();
});

export default mongoose.model("Payment", paymentSchema);