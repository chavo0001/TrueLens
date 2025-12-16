import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/SearchBar.css";

const SearchBar = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isFocused, setIsFocused] = useState(false);

  const containerRef = useRef(null);
  const navigate = useNavigate();

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
  }, []);

  // Debounce ricerca
  useEffect(() => {
    if (!isFocused) return;

    const delayDebounce = setTimeout(() => {
      const q = query.trim();
      if (q.length < 1) {
        setResults([]);
        return;
      }

      fetch(`http://localhost:5001/api/users/search?q=${encodeURIComponent(q)}&limit=10`, {
        credentials: "include",
      })
        .then((res) => res.json())
        .then((data) => setResults(data.users || []))
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

  const goToUser = (userId) => {
    setIsFocused(false);
    navigate(`/user/${userId}`);
  };

  return (
    <>
      {isFocused && <div className="overlay-blur" />}
      <div className={`search-container ${isFocused ? "focused" : ""}`} ref={containerRef}>
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
          <button onClick={handleClear} className="clearButton" type="button">
            ×
          </button>
        )}

        {results.length > 0 && (
          <ul className="searchResults">
            {results.map((u) => (
              <li
                key={u.id}
                className="resultItem"
                onMouseDown={(e) => e.preventDefault()} // evita blur prima del click
                onClick={() => goToUser(u.id)}
              >
                <img
                  src={u.avatar ? `http://localhost:5001${u.avatar}` : "/default-avatar.jpg"}
                  alt={u.username}
                  className="resultAvatar"
                />
                <span>{u.username}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
};

export default SearchBar;
