import {
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.R2_REGION,

  endpoint: process.env.R2_ENDPOINT,

  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
});

export const uploadSalarySlipPdfToR2 = async (
  pdfBuffer,
  fileName
) => {

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,

      Key: fileName,

      Body: pdfBuffer,

      ContentType: "application/pdf",
    })
  );

  return `${process.env.R2_PUBLIC_URL}/${fileName}`;
};