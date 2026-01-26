import { io, Socket } from "socket.io-client";

const SOCKET_URL =
  process.env.REACT_APP_API_URL?.replace(/\/api$/, "") ||
  "http://localhost:5000";

type ListenerMap = Map<string, (...args: any[]) => void>;

class SocketService {
  private socket: Socket | null = null;
  private listeners: ListenerMap = new Map();

  connect() {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on("connect", () => {
      console.log("🔌 Connected to WebSocket server");
    });

    this.socket.on("disconnect", () => {
      console.log("🔌 Disconnected from WebSocket server");
    });

    this.socket.on("connect_error", (error) => {
      console.error("🔌 WebSocket connection error:", error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
    }
  }

  joinUserRoom(userId: string | number) {
    if (this.socket) {
      this.socket.emit("join", userId);
      console.log(`📍 Joined room: user_${userId}`);
    }
  }

  onProfileRefresh(callback: () => void) {
    if (this.socket) {
      const handler = () => {
        console.log("🔄 Auto-refresh: Profile changed on backend");
        callback();
      };
      this.socket.on("profile_refresh", handler);
      this.listeners.set("profile_refresh", handler);
    }
  }

  onUserUpdate(callback: (data: unknown) => void) {
    if (this.socket) {
      const handler = (data: unknown) => {
        console.log("🔄 Auto-refresh: User data updated on backend", data);
        callback(data);
      };
      this.socket.on("user_updated", handler);
      this.listeners.set("user_updated", handler);
    }
  }

  emitProfileUpdate(data: unknown) {
    this.socket?.emit("profile_update", data);
  }

  removeListener(event: string) {
    if (this.socket) {
      const handler = this.listeners.get(event);
      if (handler) {
        this.socket.off(event, handler);
      } else {
        this.socket.off(event);
      }
      this.listeners.delete(event);
    }
  }

  getSocket() {
    return this.socket;
  }

  isConnected() {
    return this.socket?.connected || false;
  }
}

const socketService = new SocketService();
export default socketService;
