import mongoose from "mongoose";

const appVersionSchema = new mongoose.Schema({
  versionCode: {
    type: Number,
    required: true,
    unique: true
  },
  versionName: {
    type: String,
    required: true
  },
  platform: {
    type: String,
    enum: ["android", "ios", "both"],
    default: "both"
  },
  isForceUpdate: {
    type: Boolean,
    default: false
  },
  downloadUrl: {
    type: String,
    default: ""
  },
  releaseNotes: {
    type: String,
    default: ""
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

appVersionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model("AppVersion", appVersionSchema);