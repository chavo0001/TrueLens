import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import SearchBar from "../components/SearchBar";
import "../styles/Home.css";

const HomePage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // 🔍 Search (per ora non fa fetch: pulizia legacy prima, griglie dopo)
  const handleSearchChange = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);

    // placeholder: niente dropdown finché non abbiamo una lista reale
    setIsDropdownOpen(false);
  };

  // 🔒 Chiudi il dropdown cliccando fuori (placeholder, ma lasciamo la logica pronta)
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

  const handleClearSearch = () => {
    setSearchQuery("");
    setIsDropdownOpen(false);
  };

  const handleCreatorRegistration = () => {
    navigate("/creator-origin-selection");
  };

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
            {/* Dropdown disattivato finché non implementiamo la nuova lista */}
            {searchQuery && isDropdownOpen && (
              <div className="dropdownMenu" ref={dropdownRef}>
                {/* placeholder */}
              </div>
            )}
          </div>
        </div>

        <h2 className="center-text">Explore</h2>

        <p className="center-text" style={{ padding: "2rem" }}>
          Coming soon: griglia foto + ricerca reale.
        </p>
      </div>
    </>
  );
};

export default HomePage;
