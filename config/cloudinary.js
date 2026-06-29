// config/cloudinary.js - Replaced with Local File Storage
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// The uploads directory should be absolute and inside thequichpointApi/uploads/
const UPLOADS_BASE_PATH = path.join(__dirname, "..", "uploads");

// Common image mime types
const ALLOWED_IMAGE_MIME = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

// Create local storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    try {
      let folder = UPLOADS_BASE_PATH;
      
      // Dynamically categorize uploads into folders matching the old Cloudinary structure
      if (file.fieldname === "profilePhoto") {
        folder = path.join(folder, "society_users");
      } else if (file.fieldname === "sliderImage") {
        folder = path.join(folder, "society_sliders");
      } else if (file.fieldname === "offerImage") {
        folder = path.join(folder, "society_offers");
      } else if (file.fieldname === "categoryImage") {
        folder = path.join(folder, "society_categories");
      } else if (file.fieldname === "productImages") {
        folder = path.join(folder, "society_products");
      } else if (file.fieldname === "storeImage") {
        folder = path.join(folder, "society_stores");
      } else if (file.fieldname === "profileImage" || file.fieldname === "document") {
        folder = path.join(folder, "delivery_boys");
      }

      // Ensure the folder exists
      fs.mkdirSync(folder, { recursive: true });
      cb(null, folder);
    } catch (err) {
      cb(err);
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  }
});

// Helper function to wrap multer middlewares and convert local path to full URL
const makeLocalUploadMiddleware = (multerMiddleware) => {
  return (req, res, next) => {
    multerMiddleware(req, res, (err) => {
      if (err) {
        console.error("❌ Multer upload error:", err);
        return res.status(500).json({
          message: "Multer file upload failed",
          error: err.message,
          stack: err.stack
        });
      }
      
      try {
        const formatUrl = (filePath) => {
          // Get the path relative to the thequichpointApi root directory (parent of config)
          const apiRootDir = path.join(UPLOADS_BASE_PATH, "..");
          const relativePath = path.relative(apiRootDir, filePath);
          
          // Normalize backslashes (for Windows compatibility) to forward slashes
          const cleanPath = relativePath.replace(/\\/g, "/");
          // Build the full public URL dynamically
          const protocol = req.protocol;
          const host = req.get("host");
          return `${protocol}://${host}/${cleanPath}`;
        };

        if (req.file) {
          req.file.path = formatUrl(req.file.path);
        }
        
        if (req.files) {
          if (Array.isArray(req.files)) {
            req.files.forEach(file => {
              file.path = formatUrl(file.path);
            });
          } else {
            for (let fieldName in req.files) {
              req.files[fieldName].forEach(file => {
                file.path = formatUrl(file.path);
              });
            }
          }
        }
        
        next();
      } catch (innerErr) {
        console.error("❌ Error in makeLocalUploadMiddleware formatting:", innerErr);
        return res.status(500).json({
          message: "File URL formatting failed",
          error: innerErr.message,
          stack: innerErr.stack
        });
      }
    });
  };
};

// -----------------------------------------------------
// USER PROFILE PHOTO UPLOAD
// -----------------------------------------------------
const userMulter = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED_IMAGE_MIME.includes(file.mimetype)) return cb(null, true);
    cb(new Error("Invalid file type. Only image files are allowed for profile photo."), false);
  },
});
const uploadUserFields = makeLocalUploadMiddleware(userMulter.single("profilePhoto"));

// -----------------------------------------------------
// SLIDER IMAGE UPLOAD
// -----------------------------------------------------
const sliderMulter = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED_IMAGE_MIME.includes(file.mimetype)) return cb(null, true);
    cb(new Error("Invalid file type. Only JPG, PNG, WEBP allowed for slider images."), false);
  },
});
const uploadSliderImage = makeLocalUploadMiddleware(sliderMulter.single("sliderImage"));

// -----------------------------------------------------
// OFFER IMAGE UPLOAD
// -----------------------------------------------------
const offerImageMulter = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_IMAGE_MIME.includes(file.mimetype)) return cb(null, true);
    cb(new Error("Invalid file type. Only JPG, PNG, WEBP allowed for offer images."), false);
  },
});
const uploadOfferImage = makeLocalUploadMiddleware(offerImageMulter.single("offerImage"));

// -----------------------------------------------------
// CATEGORY IMAGE UPLOAD
// -----------------------------------------------------
const categoryImageMulter = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_IMAGE_MIME.includes(file.mimetype)) return cb(null, true);
    cb(new Error("Invalid file type. Only JPG, PNG, WEBP allowed for category images."), false);
  },
});
const uploadCategoryImage = makeLocalUploadMiddleware(categoryImageMulter.single("categoryImage"));

// -----------------------------------------------------
// PRODUCT IMAGES UPLOAD (up to 3 images per product)
// -----------------------------------------------------
const productImageMulter = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // per image
  fileFilter: (req, file, cb) => {
    if (ALLOWED_IMAGE_MIME.includes(file.mimetype)) return cb(null, true);
    cb(new Error("Invalid file type. Only JPG, PNG, WEBP allowed for product images."), false);
  },
});
const uploadProductImages = makeLocalUploadMiddleware(productImageMulter.array("productImages", 3));

// -----------------------------------------------------
// STORE IMAGE UPLOAD
// -----------------------------------------------------
const storeImageMulter = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_IMAGE_MIME.includes(file.mimetype)) return cb(null, true);
    cb(new Error("Invalid file type. Only JPG, PNG, WEBP allowed for store images."), false);
  },
});
const uploadStoreImage = makeLocalUploadMiddleware(storeImageMulter.single("storeImage"));

// -----------------------------------------------------
// DELIVERY BOY — PROFILE + DOCUMENT
// -----------------------------------------------------
const deliveryBoyMulter = multer({
  storage: storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [...ALLOWED_IMAGE_MIME, "application/pdf"];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error("Only images and PDF documents are allowed!"), false);
  },
});
const uploadDeliveryBoy = makeLocalUploadMiddleware(deliveryBoyMulter.fields([
  { name: "profileImage", maxCount: 1 },
  { name: "document", maxCount: 1 },
]));

// Placeholder cloudinary object for compatibility
const cloudinary = {
  v2: {},
  uploader: {}
};

// Exports
export {
  cloudinary,
  uploadUserFields,
  uploadSliderImage,
  uploadOfferImage,
  uploadCategoryImage,
  uploadProductImages,
  uploadStoreImage,
  uploadDeliveryBoy
};
