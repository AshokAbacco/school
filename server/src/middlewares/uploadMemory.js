import multer from "multer";

export const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB
    files: 20,
  },

  fileFilter: (_req, file, cb) => {
    console.log("UPLOAD MIME:", file.mimetype);

    if (file.mimetype.startsWith("image/")) {
      return cb(null, true);
    }

    return cb(
      new Error(
        "Only image files are allowed"
      )
    );
  },
});