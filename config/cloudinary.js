// config/cloudinary.js
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
import dotenv from "dotenv";

dotenv.config();

// Cloudinary env check
if (
  !process.env.CLOUDINARY_CLOUD_NAME ||
  !process.env.CLOUDINARY_API_KEY ||
  !process.env.CLOUDINARY_API_SECRET
) {
  console.error("❌ Cloudinary environment variables are missing!");
}

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Common image mime types
const ALLOWED_IMAGE_MIME = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

// -----------------------------------------------------
// USER PROFILE PHOTO UPLOAD
// -----------------------------------------------------
const userStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "society_users",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    resource_type: "image",
  },
});

const uploadUserFiles = multer({
  storage: userStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED_IMAGE_MIME.includes(file.mimetype)) return cb(null, true);
    return cb(
      new Error(
        "Invalid file type. Only image files are allowed for profile photo."
      ),
      false
    );
  },
});

// single: profilePhoto
const uploadUserFields = uploadUserFiles.single("profilePhoto");

// -----------------------------------------------------
// SLIDER IMAGE UPLOAD
// -----------------------------------------------------
const sliderStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "society_sliders",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    resource_type: "image",
  },
});

const sliderMulter = multer({
  storage: sliderStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED_IMAGE_MIME.includes(file.mimetype)) return cb(null, true);
    return cb(
      new Error(
        "Invalid file type. Only JPG, PNG, WEBP allowed for slider images."
      ),
      false
    );
  },
});

// single: sliderImage
const uploadSliderImage = sliderMulter.single("sliderImage");

// -----------------------------------------------------
// OFFER IMAGE UPLOAD
// -----------------------------------------------------
const offerImageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "society_offers",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    resource_type: "image",
  },
});

const offerImageMulter = multer({
  storage: offerImageStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_IMAGE_MIME.includes(file.mimetype)) return cb(null, true);
    return cb(
      new Error(
        "Invalid file type. Only JPG, PNG, WEBP allowed for offer images."
      ),
      false
    );
  },
});

// single: offerImage
const uploadOfferImage = offerImageMulter.single("offerImage");

// -----------------------------------------------------
// CATEGORY IMAGE UPLOAD
// -----------------------------------------------------
const categoryImageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "society_categories",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    resource_type: "image",
  },
});

const categoryImageMulter = multer({
  storage: categoryImageStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_IMAGE_MIME.includes(file.mimetype)) return cb(null, true);
    return cb(
      new Error(
        "Invalid file type. Only JPG, PNG, WEBP allowed for category images."
      ),
      false
    );
  },
});

// single: categoryImage
const uploadCategoryImage = categoryImageMulter.single("categoryImage");

// -----------------------------------------------------
// PRODUCT IMAGES UPLOAD (up to 3 images per product)
// -----------------------------------------------------
const productImageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "society_products",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    resource_type: "image",
  },
});

const productImageMulter = multer({
  storage: productImageStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // per image
  fileFilter: (req, file, cb) => {
    if (ALLOWED_IMAGE_MIME.includes(file.mimetype)) return cb(null, true);
    return cb(
      new Error(
        "Invalid file type. Only JPG, PNG, WEBP allowed for product images."
      ),
      false
    );
  },
});

// array: productImages (max 3)
const uploadProductImages = productImageMulter.array("productImages", 3);

// -----------------------------------------------------
// STORE IMAGE UPLOAD
// -----------------------------------------------------
const storeImageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "society_stores",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    resource_type: "image",
  },
});

const storeImageMulter = multer({
  storage: storeImageStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_IMAGE_MIME.includes(file.mimetype)) return cb(null, true);
    return cb(
      new Error(
        "Invalid file type. Only JPG, PNG, WEBP allowed for store images."
      ),
      false
    );
  },
});

// single: storeImage
const uploadStoreImage = storeImageMulter.single("storeImage");

// DELIVERY BOY — PROFILE + DOCUMENT
const deliveryBoyStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "delivery_boys",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "pdf"],
  },
});

const uploadDeliveryBoyFiles = multer({
  storage: deliveryBoyStorage,
  limits: { fileSize: 15 * 1024 * 1024 },
});

export const uploadDeliveryBoy = uploadDeliveryBoyFiles.fields([
  { name: "profileImage", maxCount: 1 },
  { name: "document", maxCount: 1 },
]);

// -----------------------------------------------------
// EXPORTS
// -----------------------------------------------------
export {
  cloudinary,
  uploadUserFields,
  uploadSliderImage,
  uploadOfferImage,
  uploadCategoryImage,
  uploadProductImages,
  uploadStoreImage,
};
