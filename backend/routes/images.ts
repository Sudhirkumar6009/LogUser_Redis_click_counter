import { Router } from "express";
import {
  getAllImages,
  getTopImages,
  clickImage,
  getImageStats,
} from "../controllers/imageController";
import { protect } from "../middleware/auth";

const router = Router();

// Get all 5 images (protected - only logged in users)
router.get("/", protect, getAllImages);

// Get top 3 most clicked images from Redis cache (protected)
router.get("/top", protect, getTopImages);

// Record a click on an image (protected)
router.post("/click/:imageId", protect, clickImage);

// Get image statistics (protected)
router.get("/stats", protect, getImageStats);

export default router;
