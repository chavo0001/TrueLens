// src/App.js
import React, { useContext, useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";

import Layout from "./components/Layout";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import CreatorRegistration from "./pages/CreatorRegistration";
import UserRegistration from "./pages/UserRegistration";
import Login from "./pages/Login";
import LoadingScreen from "./components/LoadingScreen";
import ThankYouPage from "./pages/ThankYouPage";
import RedirectingPage from "./pages/RedirectingPage";
import { UserProvider, UserContext } from "./data/UserContext";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function AppContent() {
  const { loadingUser } = useContext(UserContext);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  useEffect(() => {
    // Chiudiamo sidebar in queste pagine "auth" dove non serve
    const authPages = ["/login", "/user-registration", "/creator-registration", "/creator-origin-selection"];
    if (authPages.includes(location.pathname)) {
      setIsSidebarOpen(false);
    } else {
      setIsSidebarOpen(true); // Riapre sidebar per tutte le altre pagine (puoi togliere se vuoi mantenere lo stato)
    }
  }, [location]);

  if (loadingUser) return <LoadingScreen />;

  return (
    <>
      <Navbar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      <Routes>
        {/* Pagine SENZA layout */}
        <Route path="/login" element={<Login />} />
        <Route path="/redirecting" element={<RedirectingPage />} />
        <Route path="/creator-registration" element={<CreatorRegistration />} />
        <Route path="/user-registration" element={<UserRegistration />} />

        {/* Pagine CON layout e sidebar */}
        <Route
          path="/"
          element={
            <Layout
              isSidebarOpen={isSidebarOpen}
              toggleSidebar={toggleSidebar}
            />
          }
        >
          <Route index element={<Home />} />
          <Route path="thankyou" element={<ThankYouPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>

      <ToastContainer position="top-right" autoClose={3000} />
    </>
  );
}

function App() {
  return (
    <UserProvider>
      <Router>
        <AppContent />
      </Router>
    </UserProvider>
  );
}

export default App;
