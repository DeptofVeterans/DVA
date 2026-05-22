const fs = require("fs");
const path = require("path");
const multer = require("multer");
const env = require("../config/env");

function ensureDirectory(target) {
  fs.mkdirSync(target, { recursive: true });
}

function createUploader(destination, options = {}) {
  ensureDirectory(destination);
  const allowedMimeTypes = options.allowedMimeTypes || null;

  const storage = multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, destination),
    filename: (_req, file, callback) => {
      const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
      callback(null, safeName);
    }
  });

  return multer({
    storage,
    fileFilter: (_req, file, callback) => {
      if (!allowedMimeTypes || allowedMimeTypes.includes(file.mimetype)) {
        callback(null, true);
        return;
      }

      const error = new Error(options.invalidTypeMessage || "This file type is not allowed.");
      error.statusCode = 400;
      callback(error);
    },
    limits: {
      fileSize: env.uploads.maxUploadSizeMb * 1024 * 1024
    }
  });
}

module.exports = {
  requestUpload: createUploader(path.resolve(process.cwd(), env.uploads.requestDir)),
  identityUpload: createUploader(path.resolve(process.cwd(), env.uploads.identityDir)),
  profileUpload: createUploader(path.resolve(process.cwd(), env.uploads.profileDir), {
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    invalidTypeMessage: "Profile images must be JPG, PNG, or WebP files."
  }),
  galleryUpload: createUploader(path.resolve(process.cwd(), env.uploads.galleryDir), {
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    invalidTypeMessage: "Gallery images must be JPG, PNG, or WebP files."
  }),
  privateUploadRoot: path.resolve(process.cwd(), env.uploads.privateDir)
};
