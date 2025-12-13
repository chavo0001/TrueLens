 import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SearchBar from "../components/SearchBar";
import "../styles/Home.css";

const HomePage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  // ============================
  // EXPLORE: carica foto di tutti
  // ============================
  useEffect(() => {
    async function fetchExplorePhotos() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("http://localhost:5001/api/explore/photos?limit=80");
        if (!res.ok) throw new Error("Errore caricamento explore");

        const data = await res.json();
        setPhotos(data.photos || []);
      } catch (err) {
        console.error(err);
        setError("Unable to load photos at the moment.");
      } finally {
        setLoading(false);
      }
    }

    fetchExplorePhotos();
  }, []);

  // ============================
  // SEARCH (username)
  // ============================
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value.toLowerCase());
  };

  const handleClearSearch = () => setSearchQuery("");

  const handleRegistration = () => {
    navigate("/creator-origin-selection"); // lo rinominiamo dopo
  };

  const filteredPhotos = searchQuery
    ? photos.filter((p) =>
        (p.username || "").toLowerCase().includes(searchQuery)
      )
    : photos;

  return (
    <>

      <div className="page">
        <div className="search-bar-wrapper">
          <SearchBar
            value={searchQuery}
            onChange={handleSearchChange}
            onClear={handleClearSearch}
          />
        </div>

        <h2 className="center-text">Explore</h2>

        {/* ============================
            STATES
        ============================ */}
        {loading ? (
          <p className="center-text" style={{ padding: "2rem" }}>
            Loading photos...
          </p>
        ) : error ? (
          <p className="center-text" style={{ padding: "2rem", color: "red" }}>
            {error}
          </p>
        ) : filteredPhotos.length === 0 ? (
          <p className="center-text" style={{ padding: "2rem" }}>
            No photos yet. Upload your first shots 😉
          </p>
        ) : (
          <div className="photo-grid">
            {filteredPhotos.map((p) => (
              <div className="photo-tile" key={p.id}>
                <img
                  src={`http://localhost:5001${p.file_path}`}
                  alt={p.username || "photo"}
                  loading="lazy"
                />
                <div className="photo-meta">
                  @{p.username || "user"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default HomePage;
