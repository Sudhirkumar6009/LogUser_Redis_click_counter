import React, { useEffect, useState, useCallback } from "react";
import imageService, { Image } from "../services/imageService";

const ImageGallery: React.FC = () => {
  const [allImages, setAllImages] = useState<Image[]>([]);
  const [topImages, setTopImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [fromCache, setFromCache] = useState<boolean>(false);
  const [clickingId, setClickingId] = useState<number | null>(null);

  const fetchImages = useCallback(async () => {
    try {
      const [allRes, topRes] = await Promise.all([
        imageService.getAllImages(),
        imageService.getTopImages(),
      ]);

      if (allRes.success) {
        setAllImages(allRes.images);
      }

      if (topRes.success) {
        setTopImages(topRes.topImages);
        setFromCache(topRes.fromCache);
      }
    } catch (error) {
      console.error("Error fetching images:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const handleImageClick = async (imageId: number) => {
    setClickingId(imageId);
    try {
      const response = await imageService.clickImage(imageId);
      if (response.success) {
        // Update local state
        setAllImages((prev) =>
          prev.map((img) =>
            img.id === imageId ? { ...img, clicks: response.clicks } : img,
          ),
        );
        // Refresh top images
        const topRes = await imageService.getTopImages();
        if (topRes.success) {
          setTopImages(topRes.topImages);
          setFromCache(topRes.fromCache);
        }
      }
    } catch (error) {
      console.error("Error clicking image:", error);
    } finally {
      setClickingId(null);
    }
  };

  if (loading) {
    return <div className="loading">Loading images...</div>;
  }

  return (
    <div className="image-gallery">
      {/* Top 3 Most Clicked Images Section */}
      <div className="top-images-section">
        <h2>
          🔥 Top 3 Most Clicked Images
          <span
            className="cache-badge"
            style={{
              marginLeft: "10px",
              fontSize: "0.7em",
              padding: "4px 8px",
              borderRadius: "12px",
              backgroundColor: fromCache ? "#4caf50" : "#ff9800",
              color: "white",
            }}
          >
            {fromCache ? "⚡ From Redis Cache" : "📊 Fresh Data"}
          </span>
        </h2>
        <div className="top-images-grid">
          {topImages.map((image, index) => (
            <div
              key={image.id}
              className="top-image-card"
              onClick={() => handleImageClick(image.id)}
              style={{
                cursor: "pointer",
                border:
                  index === 0
                    ? "3px solid gold"
                    : index === 1
                      ? "3px solid silver"
                      : "3px solid #cd7f32",
                borderRadius: "12px",
                padding: "10px",
                textAlign: "center",
                background:
                  clickingId === image.id
                    ? "#e3f2fd"
                    : "linear-gradient(145deg, #ffffff, #f0f0f0)",
                boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
            >
              <div
                className="rank-badge"
                style={{
                  fontSize: "1.5em",
                  marginBottom: "5px",
                }}
              >
                {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
              </div>
              <img
                src={image.url}
                alt={image.name}
                style={{
                  width: "100%",
                  height: "150px",
                  objectFit: "cover",
                  borderRadius: "8px",
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://via.placeholder.com/400x300?text=" + image.name;
                }}
              />
              <h4 style={{ margin: "10px 0 5px" }}>{image.name}</h4>
              <p
                style={{
                  fontSize: "0.85em",
                  color: "#666",
                  margin: "0 0 5px",
                }}
              >
                {image.description}
              </p>
              <div
                className="click-count"
                style={{
                  backgroundColor: "#2196f3",
                  color: "white",
                  padding: "5px 15px",
                  borderRadius: "20px",
                  display: "inline-block",
                  fontWeight: "bold",
                }}
              >
                👆 {image.clicks} clicks
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* All 5 Images Section */}
      <div className="all-images-section" style={{ marginTop: "40px" }}>
        <h2>📸 All Images (Click to Like!)</h2>
        <div
          className="images-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "20px",
            padding: "20px 0",
          }}
        >
          {allImages.map((image) => (
            <div
              key={image.id}
              className="image-card"
              onClick={() => handleImageClick(image.id)}
              style={{
                cursor: "pointer",
                borderRadius: "12px",
                overflow: "hidden",
                background: "white",
                boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                transition: "transform 0.2s, box-shadow 0.2s",
                opacity: clickingId === image.id ? 0.7 : 1,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-5px)";
                e.currentTarget.style.boxShadow = "0 8px 25px rgba(0,0,0,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.1)";
              }}
            >
              <img
                src={image.url}
                alt={image.name}
                style={{
                  width: "100%",
                  height: "180px",
                  objectFit: "cover",
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://via.placeholder.com/400x300?text=" + image.name;
                }}
              />
              <div style={{ padding: "15px" }}>
                <h4 style={{ margin: "0 0 5px" }}>{image.name}</h4>
                <p
                  style={{
                    fontSize: "0.85em",
                    color: "#666",
                    margin: "0 0 10px",
                  }}
                >
                  {image.description}
                </p>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      backgroundColor: "#e3f2fd",
                      color: "#1976d2",
                      padding: "4px 12px",
                      borderRadius: "15px",
                      fontSize: "0.9em",
                      fontWeight: "500",
                    }}
                  >
                    👆 {image.clicks}
                  </span>
                  <span style={{ fontSize: "1.2em" }}>
                    {clickingId === image.id ? "⏳" : "❤️"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .top-images-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          padding: 20px 0;
        }
        
        .top-image-card:hover {
          transform: scale(1.02);
          box-shadow: 0 8px 25px rgba(0,0,0,0.2) !important;
        }
        
        @media (max-width: 768px) {
          .top-images-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default ImageGallery;
