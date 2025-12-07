import React, { createContext, useState, useEffect } from "react";

export const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const fetchUser = async () => {
    try {
      const res = await fetch("http://localhost:5001/api/check-session", {
        method: "GET",
        credentials: "include", // Manda il cookie di sessione
      });

      if (res.ok) {
        const data = await res.json();  
        if (data.loggedIn) {
          const userWithAvatar = {
       ...data.user,
       avatar: data.user?.avatar
       ? `http://localhost:5001${data.user.avatar}`
       : data.user?.profile_picture
       ? `http://localhost:5001${data.user.profile_picture}`
       : null,
};

          setUser(userWithAvatar);
          return;
        }
      }
      // Se non loggedIn o errore
      setUser(null);
    } catch (e) {
      setUser(null);
    } finally {
      await new Promise((resolve) => setTimeout(resolve, 1000));   // Delay minimo 1 secondo prima di togliere loading
      setLoadingUser(false);
    }
    
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const refreshUser = async () => {
    setLoadingUser(true);
    await fetchUser(); // ricarica utente dal backend
  };

  const logout = async () => {
    await fetch("http://localhost:5001/api/logout", {
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
