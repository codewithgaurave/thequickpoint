import AppVersion from "../models/AppVersion.js";

// Get latest app version
export const getLatestVersion = async (req, res) => {
  try {
    const { platform } = req.query;
    
    let query = { isActive: true };
    if (platform && platform !== "both") {
      query.$or = [
        { platform: platform },
        { platform: "both" }
      ];
    }

    const latestVersion = await AppVersion.findOne(query)
      .sort({ versionCode: -1 })
      .lean();

    if (!latestVersion) {
      return res.status(404).json({
        message: "No active version found"
      });
    }

    return res.json({
      success: true,
      data: latestVersion,
      message: "Latest version retrieved successfully"
    });
  } catch (error) {
    console.error("getLatestVersion error:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

// Check if update is required
export const checkUpdate = async (req, res) => {
  try {
    const { currentVersionCode, platform = "android" } = req.body;

    if (!currentVersionCode) {
      return res.status(400).json({
        message: "Current version code is required"
      });
    }

    let query = { isActive: true };
    if (platform !== "both") {
      query.$or = [
        { platform: platform },
        { platform: "both" }
      ];
    }

    const latestVersion = await AppVersion.findOne(query)
      .sort({ versionCode: -1 })
      .lean();

    if (!latestVersion) {
      return res.json({
        updateRequired: false,
        message: "No version information available"
      });
    }

    const updateRequired = latestVersion.versionCode > currentVersionCode;
    const forceUpdate = updateRequired && latestVersion.isForceUpdate;

    return res.json({
      updateRequired,
      forceUpdate,
      latestVersion: latestVersion.versionCode,
      latestVersionName: latestVersion.versionName,
      downloadUrl: latestVersion.downloadUrl,
      releaseNotes: latestVersion.releaseNotes,
      message: updateRequired 
        ? (forceUpdate ? "Force update required" : "Update available") 
        : "App is up to date"
    });
  } catch (error) {
    console.error("checkUpdate error:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

// Create new version (Admin only)
export const createVersion = async (req, res) => {
  try {
    const {
      versionCode,
      versionName,
      platform = "both",
      isForceUpdate = false,
      downloadUrl = "",
      releaseNotes = ""
    } = req.body;

    if (!versionCode || !versionName) {
      return res.status(400).json({
        message: "Version code and version name are required"
      });
    }

    // Check if version code already exists
    const existingVersion = await AppVersion.findOne({ versionCode });
    if (existingVersion) {
      return res.status(409).json({
        message: "Version code already exists"
      });
    }

    const newVersion = new AppVersion({
      versionCode,
      versionName,
      platform,
      isForceUpdate,
      downloadUrl,
      releaseNotes
    });

    await newVersion.save();

    return res.status(201).json({
      success: true,
      data: newVersion,
      message: "Version created successfully"
    });
  } catch (error) {
    console.error("createVersion error:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

// Update version (Admin only)
export const updateVersion = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const version = await AppVersion.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );

    if (!version) {
      return res.status(404).json({
        message: "Version not found"
      });
    }

    return res.json({
      success: true,
      data: version,
      message: "Version updated successfully"
    });
  } catch (error) {
    console.error("updateVersion error:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

// Get all versions (Admin only)
export const getAllVersions = async (req, res) => {
  try {
    const { page = 1, limit = 10, platform } = req.query;
    
    let query = {};
    if (platform && platform !== "all") {
      query.platform = platform;
    }

    const versions = await AppVersion.find(query)
      .sort({ versionCode: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await AppVersion.countDocuments(query);

    return res.json({
      success: true,
      data: versions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      },
      message: "Versions retrieved successfully"
    });
  } catch (error) {
    console.error("getAllVersions error:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

// Delete version (Admin only)
export const deleteVersion = async (req, res) => {
  try {
    const { id } = req.params;

    const version = await AppVersion.findByIdAndDelete(id);

    if (!version) {
      return res.status(404).json({
        message: "Version not found"
      });
    }

    return res.json({
      success: true,
      message: "Version deleted successfully"
    });
  } catch (error) {
    console.error("deleteVersion error:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

// Get latest save info (for any data that was recently saved)
export const getLatestSave = async (req, res) => {
  try {
    const { type } = req.query; // type can be 'user', 'product', 'order', etc.
    
    let latestSave = {};
    
    // Get latest saves from different collections based on type
    if (!type || type === 'all') {
      // Get latest from all major collections
      const collections = [
        { name: 'User', model: 'User' },
        { name: 'Product', model: 'Product' },
        { name: 'Order', model: 'Order' },
        { name: 'Store', model: 'Store' }
      ];
      
      for (const collection of collections) {
        try {
          const Model = (await import(`../models/${collection.model}.js`)).default;
          const latest = await Model.findOne()
            .sort({ createdAt: -1 })
            .select('_id createdAt updatedAt')
            .lean();
          
          if (latest) {
            latestSave[collection.name.toLowerCase()] = {
              id: latest._id,
              createdAt: latest.createdAt,
              updatedAt: latest.updatedAt || latest.createdAt,
              type: collection.name
            };
          }
        } catch (err) {
          console.warn(`Could not fetch latest from ${collection.name}:`, err.message);
        }
      }
    }

    return res.json({
      success: true,
      data: latestSave,
      timestamp: new Date().toISOString(),
      message: "Latest save information retrieved successfully"
    });
  } catch (error) {
    console.error("getLatestSave error:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};