import React, { useState } from "react";
import ProfileSection from "./ProfileSection";  // assicurati che sia nella stessa cartella o modifica il path
import "../styles/Settings.css";

const sections = [
  { key: "profile", label: "Profilo" },
  { key: "payments", label: "Pagamenti" },
  { key: "notifications", label: "Notifiche" },
  { key: "privacy", label: "Privacy" },
  { key: "security", label: "Sicurezza" },
];

const Settings = () => {
  const [activeSection, setActiveSection] = useState("profile");

  const renderContent = () => {
    switch (activeSection) {
      case "profile":
        return <ProfileSection />;
      case "payments":
        return <div>Contenuto Pagamenti (da implementare)</div>;
      case "notifications":
        return <div>Contenuto Notifiche (da implementare)</div>;
      case "privacy":
        return <div>Contenuto Privacy (da implementare)</div>;
      case "security":
        return <div>Contenuto Sicurezza (da implementare)</div>;
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        display: "flex",
        height: "calc(100vh - 80px)", // togli altezza navbar
        marginTop: "80px",            // sposta tutto sotto navbar
        margin: 0,
        padding: 0,
      }}
    >
      {/* Sidebar impostazioni */}
      <nav
        style={{
          width: "220px",
          borderRight: "1px solid #ccc",
          padding: "1rem",
          backgroundColor: "#f8f8f8",
          fontWeight: "bold",
          display: "flex",
          flexDirection: "column",
          height: "100%", // fa espandere in verticale la sidebar
          boxSizing: "border-box",
        }}
      >
        <h2 style={{ margin: "0 0 1rem 0" }}>Impostazioni</h2>
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            flexGrow: 1, // per occupare tutta la sidebar disponibile
          }}
        >
          {sections.map((section) => (
            <li
              key={section.key}
              onClick={() => setActiveSection(section.key)}
              style={{
                padding: "0.75rem 1rem",
                cursor: "pointer",
                backgroundColor:
                  activeSection === section.key ? "#ddd" : "transparent",
                borderRadius: "5px",
                marginBottom: "0.5rem",
                transition: "background-color 0.2s ease",
              }}
            >
              {section.label}
            </li>
          ))}
        </ul>
      </nav>

      {/* Area contenuto */}
      <main
        style={{
          flexGrow: 1,
          padding: "1.5rem 2rem",
          backgroundColor: "white",
          boxShadow: "0 0 10px rgb(0 0 0 / 0.1)",
          height: "100%", // espande l'area in verticale
          boxSizing: "border-box",
          overflowY: "auto", // per scrollare se il contenuto è lungo
        }}
      >
        {renderContent()}
      </main>
    </div>
  );
};

export default Settings;
