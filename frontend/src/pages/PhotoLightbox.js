import React, { useEffect } from "react";
import "../styles/PhotoLightbox.css";
const PhotoLightbox = ({ photo, onClose }) => {
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "auto";
    };
  }, [onClose]);

  return (
    <div className="tl-lightbox" onMouseDown={onClose}>
      <div className="tl-lightbox-inner" onMouseDown={(e) => e.stopPropagation()}>
        <button className="tl-lightbox-close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <img
          className="tl-lightbox-img"
          src={photo.file_url || photo.file_path} // usa quello che hai
          alt=""
        />
       
        <div className="tl-lightbox-footer">

        </div>
      </div>
    </div>
  );
};

export default PhotoLightbox;
