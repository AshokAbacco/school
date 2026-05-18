import fs from "fs";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { S3Client } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
});

// ✅ Upload helper
export const uploadToCloud = async (file, key) => {
  try {

    let body;
    let contentType = "application/octet-stream";

    // 🔥 CASE 1: multer uploaded file
    if (file?.buffer) {
      body = file.buffer;
      contentType = file.mimetype;
    }

    // 🔥 CASE 2: local backup.sql file path
    else if (typeof file === "string") {
      body = fs.createReadStream(file);

      if (file.endsWith(".sql")) {
        contentType = "application/sql";
      } else if (file.endsWith(".json")) {
        contentType = "application/json";
      }
    }

    else {
      throw new Error("Invalid file type");
    }

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    });

    await s3.send(command);

    console.log("✅ Uploaded to cloud:", key);

    return key;

  } catch (err) {
    console.error("❌ Cloud upload failed:", err.message);
    throw err;
  }
};

// ✅ Delete helper
export const deleteFromCloud = async (key) => {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
    })
  );
};