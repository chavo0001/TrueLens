import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/PhotoLightbox.css";

const API_BASE = "http://localhost:5001";

const PhotoLightbox = ({ photo, onClose, onPhotoUpdate }) => {
  const navigate = useNavigate();

  // stato locale per UI immediata (così il click funziona sempre)
  const [likedByMe, setLikedByMe] = useState(!!photo?.likedByMe);
  const [likesCount, setLikesCount] = useState(Number(photo?.likesCount ?? 0));

  useEffect(() => {
    setLikedByMe(!!photo?.likedByMe);
    setLikesCount(Number(photo?.likesCount ?? 0));
  }, [photo]);

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

  const imgSrc = photo?.file_path ? `${API_BASE}${photo.file_path}` : "/default-avatar.jpg";

  const avatarSrc =
    photo?.avatar && photo.avatar !== "null"
      ? photo.avatar.startsWith("http")
        ? photo.avatar
        : `${API_BASE}${photo.avatar}`
      : "/default-avatar.jpg";

  const goToProfile = () => {
    onClose();
    navigate(`/user/${photo.user_id}`);
  };

  const onLike = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/photos/${photo.id}/like`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;

      // aggiorna UI locale
      setLikedByMe(!!data.liked);
      setLikesCount(Number(data.likesCount ?? likesCount));

      // opzionale: aggiorna anche lo state nel parent (Home) se glielo passi
      if (typeof onPhotoUpdate === "function") {
        onPhotoUpdate(photo.id, {
          likedByMe: !!data.liked,
          likesCount: Number(data.likesCount ?? likesCount),
        });
      }
    } catch (err) {
      console.error("Like error:", err);
    }
  };

  return (
    <div className="tl-lightbox" onMouseDown={onClose}>
      <div className="tl-lightbox-inner" onMouseDown={(e) => e.stopPropagation()}>
        <button className="tl-lightbox-close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <div className="tl-lightbox-media">
          <img className="tl-lightbox-img" src={imgSrc} alt={photo?.username || "photo"} />
        </div>

        <div className="tl-lightbox-bar">
          <button type="button" className="tl-lightbox-user" onClick={goToProfile}>
            <img className="tl-lightbox-user-avatar" src={avatarSrc} alt="" />
            <span className="tl-lightbox-user-name">@{photo?.username || "user"}</span>
          </button>

          <button
            type="button"
            className={`tl-lightbox-like ${likedByMe ? "liked" : ""}`}
            onClick={onLike}
          >
            <span className="tl-heart">{likedByMe ? "♥" : "♡"}</span>
            <span className="tl-like-count">{likesCount}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PhotoLightbox;
