import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

export interface Image {
  id: number;
  name: string;
  url: string;
  description: string;
  clicks: number;
}

export interface TopImagesResponse {
  success: boolean;
  fromCache: boolean;
  topImages: Image[];
}

export interface AllImagesResponse {
  success: boolean;
  images: Image[];
}

export interface ClickResponse {
  success: boolean;
  message: string;
  imageId: number;
  clicks: number;
}

const imageService = {
  // Get all 5 images
  getAllImages: async (): Promise<AllImagesResponse> => {
    const response = await api.get("/images");
    return response.data;
  },

  // Get top 3 most clicked images (from Redis cache)
  getTopImages: async (): Promise<TopImagesResponse> => {
    const response = await api.get("/images/top");
    return response.data;
  },

  // Record a click on an image
  clickImage: async (imageId: number): Promise<ClickResponse> => {
    const response = await api.post(`/images/click/${imageId}`);
    return response.data;
  },

  // Get image statistics
  getStats: async () => {
    const response = await api.get("/images/stats");
    return response.data;
  },
};

export default imageService;
