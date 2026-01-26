import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import socketService from "../services/socketService";
import ImageGallery from "./ImageGallery";

const Dashboard: React.FC = () => {
  const { user, lastRefresh } = useAuth();
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    const socket = socketService.getSocket();

    if (socket) {
      setIsConnected(socket.connected);

      const handleConnect = () => setIsConnected(true);
      const handleDisconnect = () => setIsConnected(false);

      socket.on("connect", handleConnect);
      socket.on("disconnect", handleDisconnect);

      return () => {
        socket.off("connect", handleConnect);
        socket.off("disconnect", handleDisconnect);
      };
    }
  }, []);

  if (!user) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="container dashboard">
      <h1>Welcome to your Dashboard</h1>

      <div
        className="connection-status"
        style={{
          padding: "10px",
          marginBottom: "20px",
          borderRadius: "5px",
          backgroundColor: isConnected ? "#d4edda" : "#f8d7da",
          color: isConnected ? "#155724" : "#721c24",
        }}
      >
        <span style={{ marginRight: "10px" }}>{isConnected ? "🟢" : "🔴"}</span>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span>
            {isConnected ? "✨ Auto-refresh active" : "⏳ Connecting..."}
          </span>
          {lastRefresh && (
            <span style={{ fontSize: "0.85em", opacity: 0.8 }}>
              Last sync: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      <div className="profile-card">
        <h3>Profile Information</h3>

        <div className="profile-info">
          <label>Username:</label>
          <span>{user.username}</span>
        </div>

        <div className="profile-info">
          <label>Email:</label>
          <span>{user.email}</span>
        </div>

        {user.firstName && (
          <div className="profile-info">
            <label>First Name:</label>
            <span>{user.firstName}</span>
          </div>
        )}

        {user.lastName && (
          <div className="profile-info">
            <label>Last Name:</label>
            <span>{user.lastName}</span>
          </div>
        )}

        <div className="profile-info">
          <label>Account Status:</label>
          <span style={{ color: user.isActive ? "green" : "red" }}>
            {user.isActive ? "Active" : "Inactive"}
          </span>
        </div>

        <div className="profile-info">
          <label>Member Since:</label>
          <span>{new Date(user.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Image Gallery Section */}
      <ImageGallery />
    </div>
  );
};

export default Dashboard;
