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
    const publicIdWithExtension = path.basename(parsedUrl.pathname);
    const folder = path.dirname(parsedUrl.pathname).split('/').pop(); // extract last folder name

    // Remove the file extension
    const publicId = `${folder}/${publicIdWithExtension.replace(path.extname(publicIdWithExtension), '')}`;

    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error(`Failed to delete image from URL: ${error.message}`);
  }
};
