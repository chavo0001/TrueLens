import React from "react";
import "../styles/CreatorCard.css"; 

const CreatorCard = ({ creator, onClick }) => {
  const name = creator.name || creator.creator_name;
  const style = creator.style || creator.category || "Fotografia";
  const city = creator.city || "Località non specificata";

  const coverImage =
    creator.profile_picture?.startsWith("http")
      ? creator.profile_picture
      : creator.profile_picture
      ? `http://localhost:5001${creator.profile_picture}`
      : "/placeholder.jpg";

  return (
    <div className="creator-card" onClick={onClick}>
      <div className="creator-card-image-wrapper">
        <img src={coverImage} alt={name} className="creator-card-image" />
      </div>

      <div className="creator-card-content">
        <h2 className="creator-card-name">{name}</h2>

        <p className="creator-card-style">{style}</p>

        <p className="creator-card-city">📍 {city}</p>

        {/* PREZZO RIMOSSO COMPLETAMENTE */}

        <p className="creator-card-cta">Vedi portfolio →</p>
      </div>
    </div>
  );
};

export default CreatorCard;
