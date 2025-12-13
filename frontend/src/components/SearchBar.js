import React, { useState, useEffect, useRef } from "react";
import "../styles/SearchBar.css";

const SearchBar = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isFocused, setIsFocused] = useState(false);

  const containerRef = useRef(null);

  useEffect(() => {
    if (!isFocused) {
      setQuery("");
      setResults([]);
    }
  }, [isFocused]);

  // Chiusura focus cliccando fuori
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [containerRef]);

  // Debounce ricerca
  useEffect(() => {
    if (!isFocused) return;

    const delayDebounce = setTimeout(() => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }

      fetch(`http://localhost:5001/api/creators?q=${encodeURIComponent(query)}`)
        .then((res) => res.json())
        .then((data) => setResults(data))
        .catch((err) => {
          console.error("Errore durante la ricerca:", err);
          setResults([]);
        });
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [query, isFocused]);

  const handleClear = () => {
    setQuery("");
    setResults([]);
  };

  return (
    <>
      {isFocused && <div className="overlay-blur" />}
      <div
        className={`search-container ${isFocused ? "focused" : ""}`}
        ref={containerRef}
      >
        <input
          type="text"
          placeholder="Find Photographer..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          className="searchInput"
          autoFocus={isFocused}
        />
        {query && (
          <button onClick={handleClear} className="clearButton">
            ×
          </button>
        )}

        {results.length > 0 && (
          <ul className="searchResults">
            {results.map((creator) => (
              <li key={creator.id} className="resultItem">
                <img
                  src={
                    creator.profile_picture
                      ? `http://localhost:5001${creator.profile_picture}`
                      : "/placeholder.jpg"
                  }
                  alt={creator.name}
                  className="resultAvatar"
                />
                <span>{creator.name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
};

export default SearchBar;
