// controllers/cloudinary.controller.js
import { deleteImage, deleteImageByUrl } from "../config/cloudinary";

export const deleteImageController = async (req, res) => {
  try {
    const { publicId, imageUrl } = req.body;

    if (!publicId && !imageUrl) {
      return res.status(400).json({
        success: false,
        message: "Provide either publicId or imageUrl",
      });
    }

    if (publicId) {
      await deleteImage(publicId);
    }

    if (imageUrl) {
      await deleteImageByUrl(imageUrl);
    }

    return res.status(200).json({
      success: true,
      message: "Image successfully deleted from Cloudinary",
    });

  } catch (error) {
    console.error("Error deleting image:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to delete image",
      error: error.message,
    });
  }
};
