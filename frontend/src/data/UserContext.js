import React, { createContext, useState, useEffect } from "react";

export const UserContext = createContext(null);

const API_BASE = "http://localhost:5001";

function normalizeUser(u) {
  if (!u) return null;

  // Se è già un URL completo, lo lasciamo
  const rawAvatar = u.avatar;

  const avatar =
    rawAvatar && typeof rawAvatar === "string"
      ? rawAvatar.startsWith("http")
        ? rawAvatar
        : `${API_BASE}${rawAvatar}`
      : "/default-avatar.jpg";

  return {
    ...u,
    avatar,
  };
}

export const UserProvider = ({ children }) => {
  const [user, _setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Wrapper: qualunque chiamata a setUser passa dalla normalizzazione
  const setUser = (valueOrFn) => {
    if (typeof valueOrFn === "function") {
      _setUser((prev) => normalizeUser(valueOrFn(prev)));
    } else {
      _setUser(normalizeUser(valueOrFn));
    }
  };

  const fetchUser = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/check-session`, {
        method: "GET",
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        if (data.loggedIn && data.user) {
          setUser(data.user); // passa da normalizeUser
          return;
        }
      }

      setUser(null);
    } catch (e) {
      setUser(null);
    } finally {
      await new Promise((resolve) => setTimeout(resolve, 300));
      setLoadingUser(false);
    }
  };

  useEffect(() => {
    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshUser = async () => {
    setLoadingUser(true);
    await fetchUser();
  };

  const logout = async () => {
    await fetch(`${API_BASE}/api/logout`, {
      method: "POST",
      credentials: "include",
    });
    setUser(null);
  };

  return (
    <UserContext.Provider value={{ user, setUser, logout, refreshUser, loadingUser }}>
      {children}
    </UserContext.Provider>
  );
};
