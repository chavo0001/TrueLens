import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import SearchBar from "../components/SearchBar";
import PhotoLightbox from "./PhotoLightbox.js";
import "../styles/Home.css";
import "../styles/PhotoLightbox.css";

const HomePage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedPhoto, setSelectedPhoto] = useState(null);

  // ✅ ref per la griglia
  const gridRef = useRef(null);

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

  const handleSearchChange = (e) => setSearchQuery(e.target.value.toLowerCase());
  const handleClearSearch = () => setSearchQuery("");

  const filteredPhotos = searchQuery
    ? photos.filter((p) => (p.username || "").toLowerCase().includes(searchQuery))
    : photos;

  // ✅ funzione: calcola lo span in base all'altezza tile
  const resizeAllMasonryItems = () => {
    const grid = gridRef.current;
    if (!grid) return;

    const rowHeight = parseInt(getComputedStyle(grid).getPropertyValue("grid-auto-rows"), 10);
    const rowGap = parseInt(getComputedStyle(grid).getPropertyValue("gap"), 10) || 0;

    const items = grid.querySelectorAll(".photo-tile");
    items.forEach((item) => {
      const img = item.querySelector(".photo-img");
      if (!img) return;

      // altezza totale tile (img + eventuali overlay)
      const itemHeight = item.getBoundingClientRect().height;

      const span = Math.ceil((itemHeight + rowGap) / (rowHeight + rowGap));
      item.style.gridRowEnd = `span ${span}`;
    });
  };

  // ✅ ricalcola quando cambiano le foto filtrate o dopo loading
  useLayoutEffect(() => {
    if (loading) return;
    const id = requestAnimationFrame(resizeAllMasonryItems);
    return () => cancelAnimationFrame(id);
  }, [loading, filteredPhotos.length]);

  // ✅ ricalcola su resize finestra
  useEffect(() => {
    const onResize = () => resizeAllMasonryItems();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <>
      <div className="page">
        <div className="search-bar-wrapper">
          <SearchBar value={searchQuery} onChange={handleSearchChange} onClear={handleClearSearch} />
        </div>

        <h2 className="center-text">Explore</h2>

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
          <div className="photo-grid" ref={gridRef}>
            {filteredPhotos.map((p) => (
              <button
                key={p.id}
                type="button"
                className="photo-tile"
                onClick={() => setSelectedPhoto(p)}
              >
                <img
                  className="photo-img"
                  src={`http://localhost:5001${p.file_path}`}
                  alt={p.username || "photo"}
                  loading="lazy"
                  decoding="async"
                  onLoad={() => {
                    // quando ogni immagine finisce di caricare, ricalcola
                    resizeAllMasonryItems();
                  }}
                />

                <div className="photo-meta-min">
                  <img
                    src={p.avatar ? `http://localhost:5001${p.avatar}` : "/default-avatar.jpg"}
                    alt=""
                    className="photo-meta-avatar-min"
                  />
                  <span className="photo-meta-username-min">@{p.username || "user"}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedPhoto && (
        <PhotoLightbox photo={selectedPhoto} onClose={() => setSelectedPhoto(null)} />
      )}
    </>
  );
};

export default HomePage;