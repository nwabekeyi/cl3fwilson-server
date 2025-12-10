import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import path from 'path';
import url from 'url';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Ensure Cloudinary credentials are set
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  throw new Error('Cloudinary credentials are not defined in environment variables');
}

// Upload image to Cloudinary with optimization
export const uploadImage = async (file) => {
  try {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: 'contest_participants',
      resource_type: 'image',
      use_filename: true,
      unique_filename: false,
      overwrite: true,
      transformation: [
        { width: 1080, crop: 'limit' }, // Resize if image is wider than 1080px
        { fetch_format: 'auto' },       // Use best format (e.g., WebP)
        { quality: 'auto' }             // Optimize quality automatically
      ]
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    throw new Error(`Failed to upload image: ${error.message}`);
  }
};

// Delete image using public ID
export const deleteImage = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error(`Failed to delete image: ${error.message}`);
  }
};

// ⚠️ Delete image by URL (Not officially supported by Cloudinary, but possible with parsing)
export const deleteImageByUrl = async (imageUrl) => {
  try {
    const parsedUrl = url.parse(imageUrl);
    const pathname = parsedUrl.pathname; // e.g., /diym28aqy/image/upload/f_auto,q_auto/v1765376096/ecv37d2wnaxokwubcfom.jpg

    const uploadIndex = pathname.indexOf("/upload/");
    if (uploadIndex === -1) throw new Error("Invalid Cloudinary URL");

    // Everything after /upload/
    let afterUpload = pathname.substring(uploadIndex + 8); // skip "/upload/"

    // Strip transformation params and version number
    // Format: [transformations]/v1234567890/public_id.extension
    const parts = afterUpload.split("/"); // e.g., ["f_auto,q_auto", "v1765376096", "ecv37d2wnaxokwubcfom.jpg"]

    const publicIdWithExt = parts[parts.length - 1]; // ecv37d2wnaxokwubcfom.jpg
    const publicId = publicIdWithExt.replace(path.extname(publicIdWithExt), ""); // remove .jpg

    const result = await cloudinary.uploader.destroy(publicId);
    if (result.result === "not found") {
      console.warn(`Image not found in Cloudinary: ${publicId}`);
    } else if (result.result === "ok") {
      console.log(`Successfully deleted image: ${publicId}`);
    } else {
      console.warn(`Unexpected Cloudinary delete result for ${publicId}:`, result);
    }

    return result;
  } catch (error) {
    console.error(`Failed to delete image from URL: ${imageUrl}`, error);
    throw error;
  }
};
