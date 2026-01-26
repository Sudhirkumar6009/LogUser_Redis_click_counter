import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import { sequelize } from "./config/database";
import { initRedis } from "./config/redis";
import authRoutes from "./routes/auth";
import imageRoutes from "./routes/images";

dotenv.config();

const app: Application = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST", "PUT"],
    credentials: true,
  },
});

app.set("io", io);

io.on("connection", (socket) => {
  console.log("🔌 User connected:", socket.id);

  socket.on("join", (userId: string | number) => {
    socket.join(`user_${userId}`);
    console.log(`👤 User ${userId} joined their room`);
  });

  socket.on("profile_update", (data) => {
    socket.broadcast.emit("user_updated", data);
  });

  socket.on("disconnect", () => {
    console.log("🔌 User disconnected:", socket.id);
  });
});

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/images", imageRoutes);

app.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "OK", message: "LogUser API is running" });
});

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connection established successfully.");

    // Initialize Redis
    await initRedis();
    console.log("✅ Redis initialized successfully.");

    try {
      await sequelize.sync({ alter: false });
      console.log("✅ Database models synchronized.");
    } catch (syncError) {
      console.log(
        "⚠️  Could not auto-sync models. Using existing table structure.",
      );
      console.log(
        "    If the 'users' table doesn't exist, create it manually in PostgreSQL.",
      );
    }

    server.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`🔌 WebSocket server is ready`);
    });
  } catch (error) {
    console.error("❌ Unable to connect to the database:", error);
    process.exit(1);
  }
};

startServer();

export { io };
