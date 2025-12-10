// routes/cloudinary.routes.js
import express from "express";
import { deleteImageController } from "../controllers/deleteImage.js";
const router = express.Router();

// POST because we are sending a body
router.post("/delete-image", deleteImageController);

export default router;
