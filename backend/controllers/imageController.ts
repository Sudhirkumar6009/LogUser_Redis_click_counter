import { Request, Response } from "express";
import { getRedisClient, REDIS_KEYS } from "../config/redis";

// Sample images data (5 images visible to all users)
const ALL_IMAGES = [
  {
    id: 1,
    name: "Avengers",
    url: "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=400",
    description: "Earth's Mightiest Heroes assembled",
  },
  {
    id: 2,
    name: "Spider-Man",
    url: "https://images.unsplash.com/photo-1635805737707-575885ab0820?w=400",
    description: "Your friendly neighborhood Spider-Man",
  },
  {
    id: 3,
    name: "Batman",
    url: "https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=400",
    description: "The Dark Knight rises",
  },
  {
    id: 4,
    name: "Iron Man",
    url: "https://images.unsplash.com/photo-1569003339405-ea396a5a8a90?w=400",
    description: "Genius, billionaire, playboy, philanthropist",
  },
  {
    id: 5,
    name: "Captain America",
    url: "https://images.unsplash.com/photo-1608889825103-eb5ed706fc64?w=400",
    description: "The First Avenger",
  },
];

// Get all 5 images with their click counts
export const getAllImages = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const redis = getRedisClient();

    // Get click counts for all images
    const imagesWithClicks = await Promise.all(
      ALL_IMAGES.map(async (image) => {
        const clicks = await redis.zScore(
          REDIS_KEYS.IMAGE_CLICKS,
          image.id.toString(),
        );
        return {
          ...image,
          clicks: clicks || 0,
        };
      }),
    );

    res.json({
      success: true,
      images: imagesWithClicks,
    });
  } catch (error) {
    console.error("Error fetching images:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching images",
    });
  }
};

// Get top 3 most clicked images from Redis cache
export const getTopImages = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const redis = getRedisClient();

    // Try to get cached top 3 images
    const cachedTop = await redis.get(REDIS_KEYS.TOP_IMAGES);

    if (cachedTop) {
      console.log("═══════════════════════════════════════════════");
      console.log("✅ TOP 3 IMAGES SERVED FROM REDIS CACHE! ⚡");
      console.log("   Key: ", REDIS_KEYS.TOP_IMAGES);
      console.log("   Data: ", cachedTop.substring(0, 100) + "...");
      console.log("═══════════════════════════════════════════════");
      res.json({
        success: true,
        fromCache: true,
        cacheKey: REDIS_KEYS.TOP_IMAGES,
        topImages: JSON.parse(cachedTop),
      });
      return;
    }

    console.log("📊 Cache MISS - Calculating top 3 images from scratch...");
    // If not cached, calculate and cache
    const topImages = await calculateAndCacheTopImages();

    res.json({
      success: true,
      fromCache: false,
      message: "Freshly calculated and now cached in Redis",
      topImages,
    });
  } catch (error) {
    console.error("Error fetching top images:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching top images",
    });
  }
};

// Record a click on an image
export const clickImage = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { imageId } = req.params;
    const redis = getRedisClient();

    // Validate image exists
    const image = ALL_IMAGES.find((img) => img.id === parseInt(imageId));
    if (!image) {
      res.status(404).json({
        success: false,
        message: "Image not found",
      });
      return;
    }

    // Increment click count in Redis sorted set
    await redis.zIncrBy(REDIS_KEYS.IMAGE_CLICKS, 1, imageId);

    // Get updated click count
    const newClickCount = await redis.zScore(REDIS_KEYS.IMAGE_CLICKS, imageId);

    // Recalculate and update top 3 cache
    await calculateAndCacheTopImages();

    console.log(`🖱️ Image "${image.name}" clicked! Total: ${newClickCount}`);

    res.json({
      success: true,
      message: `Clicked on ${image.name}`,
      imageId: parseInt(imageId),
      clicks: newClickCount,
    });
  } catch (error) {
    console.error("Error recording click:", error);
    res.status(500).json({
      success: false,
      message: "Error recording click",
    });
  }
};

// Helper function to calculate and cache top 3 images
const calculateAndCacheTopImages = async () => {
  const redis = getRedisClient();

  // Get top 3 image IDs by score (clicks) - descending order
  // Using ZREVRANGE for better compatibility
  const topImageIds = (await redis.sendCommand([
    "ZREVRANGE",
    REDIS_KEYS.IMAGE_CLICKS,
    "0",
    "2",
  ])) as string[];

  // If no clicks yet, return first 3 images as default
  if (topImageIds.length === 0) {
    const defaultTop = ALL_IMAGES.slice(0, 3).map((img) => ({
      ...img,
      clicks: 0,
    }));
    await redis.set(REDIS_KEYS.TOP_IMAGES, JSON.stringify(defaultTop), {
      EX: 60, // Cache for 60 seconds
    });
    return defaultTop;
  }

  // Build top images array with click counts
  const topImages = await Promise.all(
    topImageIds.map(async (id) => {
      const image = ALL_IMAGES.find((img) => img.id === parseInt(id));
      const clicks = await redis.zScore(REDIS_KEYS.IMAGE_CLICKS, id);
      return {
        ...image,
        clicks: clicks || 0,
      };
    }),
  );

  // Cache the top 3 images
  await redis.set(REDIS_KEYS.TOP_IMAGES, JSON.stringify(topImages), {
    EX: 60, // Cache expires in 60 seconds
  });

  console.log("📊 Top 3 images cached in Redis");
  return topImages;
};

// Get image statistics
export const getImageStats = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const redis = getRedisClient();

    // Get all images with scores using ZREVRANGE WITHSCORES
    const rawScores = (await redis.sendCommand([
      "ZREVRANGE",
      REDIS_KEYS.IMAGE_CLICKS,
      "0",
      "-1",
      "WITHSCORES",
    ])) as string[];

    // Parse the results (alternating: value, score, value, score...)
    const stats: { imageId: number; name: string; clicks: number }[] = [];
    for (let i = 0; i < rawScores.length; i += 2) {
      const imageId = parseInt(rawScores[i]);
      const clicks = parseFloat(rawScores[i + 1]);
      const image = ALL_IMAGES.find((img) => img.id === imageId);
      stats.push({
        imageId,
        name: image?.name || "Unknown",
        clicks,
      });
    }

    // Calculate total clicks
    const totalClicks = stats.reduce((sum, item) => sum + item.clicks, 0);

    res.json({
      success: true,
      totalClicks,
      stats,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching statistics",
    });
  }
};
