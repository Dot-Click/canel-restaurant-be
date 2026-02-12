import { env } from "@/utils/env.utils";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

export async function uploadBufferToCloudinary(
  buffer: Buffer,
  folder = "wati-payment-evidence"
): Promise<string> {
  if (!buffer || !buffer.length) {
    throw new Error("Buffer is empty; cannot upload to Cloudinary");
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
        folder,
      },
      (error, result) => {
        if (error || !result) {
          return reject(
            error || new Error("Cloudinary upload failed: no result")
          );
        }
        resolve(result.secure_url);
      }
    );

    uploadStream.end(buffer);
  });
}

export default cloudinary;
