import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import SearchBar from "../components/SearchBar";
import CreatorCard from "./CreatorCard";
import "../styles/Home.css";

const HomePage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [creators, setCreators] = useState([]);
  const [filteredCreators, setFilteredCreators] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // ✅ Carico i creator REALI dal backend una sola volta
  useEffect(() => {
    async function fetchCreators() {
      try {
        const response = await fetch("http://localhost:5001/api/creators/list");
        if (!response.ok) throw new Error("Errore nel caricamento dei creator");
        const data = await response.json();
        setCreators(data);
      } catch (err) {
        console.error("Fetch error:", err);
        setError("Unable to load photographers at the moment.");
      } finally {
        setLoading(false);
      }
    }

    fetchCreators();
  }, []);

  // 🔍 Search sui creator già caricati dal backend (client-side)
  const handleSearchChange = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);

    if (query) {
      const filtered = creators.filter((creator) =>
        (creator.name || "").toLowerCase().startsWith(query)
      );
      setFilteredCreators(filtered);
      setIsDropdownOpen(filtered.length > 0);
    } else {
      setFilteredCreators([]);
      setIsDropdownOpen(false);
    }
  };

  // 🔒 Chiudi il dropdown cliccando fuori
  const handleClickOutside = (e) => {
    if (
      searchInputRef.current &&
      !searchInputRef.current.contains(e.target) &&
      dropdownRef.current &&
      !dropdownRef.current.contains(e.target)
    ) {
      setSearchQuery("");
      setIsDropdownOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCreatorClick = (id) => {
    setSearchQuery("");
    setIsDropdownOpen(false);
    navigate(`/creator/${id}`);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setIsDropdownOpen(false);
  };

  const handleCreatorRegistration = () => {
    navigate("/creator-origin-selection");
  };

  // 👉 Tutti i creator provengono dal backend
  const allCreators = creators;

  return (
    <>
      <div className="creatorButtonWrapper">
        <button onClick={handleCreatorRegistration} className="creatorButton">
          Are you a photographer?
        </button>
      </div>

      <div className="page">
        <div className="search-bar-wrapper">
          <SearchBar
            value={searchQuery}
            onChange={handleSearchChange}
            onClear={handleClearSearch}
          />
        </div>

        <div className="searchWrapper">
          <div className="search-container" ref={searchInputRef}>
            {searchQuery && isDropdownOpen && filteredCreators.length > 0 && (
              <div className="dropdownMenu" ref={dropdownRef}>
                {filteredCreators.map((creator) => (
                  <div
                    key={creator.id}
                    className="dropdown-item"
                    onClick={() => handleCreatorClick(creator.id)}
                  >
                    <img
                      src={
                        creator.profile_picture?.startsWith("http")
                          ? creator.profile_picture
                          : creator.profile_picture
                          ? `http://localhost:5001${creator.profile_picture}`
                          : "/placeholder.jpg"
                      }
                      alt={creator.name}
                      className="creator-image"
                    />
                    <span>{creator.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <h2 className="center-text">Photographers You May Like</h2>

        {/* 🌀 Loading / Error / Vuoto */}
        {loading ? (
          <p className="center-text" style={{ padding: "2rem" }}>
            Loading photographers...
          </p>
        ) : error ? (
          <p className="center-text" style={{ padding: "2rem", color: "red" }}>
            {error}
          </p>
        ) : allCreators.length === 0 ? (
          <p className="center-text" style={{ padding: "2rem" }}>
            No photographers yet. Be the first one to join 😉
          </p>
        ) : (
          <div className="creator-grid">
            {allCreators.map((creator) => (
              <CreatorCard
                key={creator.id}
                creator={creator}
                onClick={() => handleCreatorClick(creator.id)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default HomePage;
