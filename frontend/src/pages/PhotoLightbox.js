import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/PhotoLightbox.css";

const API_BASE = "http://localhost:5001";

const PhotoLightbox = ({ photo, onClose, onPhotoUpdate }) => {
  const navigate = useNavigate();

  const [likedByMe, setLikedByMe] = useState(!!photo?.likedByMe);
  const [likesCount, setLikesCount] = useState(Number(photo?.likesCount ?? 0));

  const [exif, setExif] = useState(null);
  const [exifLoading, setExifLoading] = useState(false);

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

  useEffect(() => {
    let cancelled = false;

    async function loadExif() {
      if (!photo?.id) {
        setExif(null);
        return;
      }

      setExifLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/photos/${photo.id}/exif`, {
          credentials: "include",
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

        setExif(data?.exif ?? null);
      } catch (e) {
        if (!cancelled) setExif(null);
      } finally {
        if (!cancelled) setExifLoading(false);
      }
    }

    loadExif();
    return () => {
      cancelled = true;
    };
  }, [photo?.id]);

  const imgSrc = photo?.file_path
    ? `${API_BASE}${photo.file_path}`
    : "/default-avatar.jpg";

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

      setLikedByMe(!!data.liked);
      setLikesCount(Number(data.likesCount ?? likesCount));

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

  const formatFNumber = (v) => (v ? `f/${Number(v).toFixed(1)}` : "—");
  const formatFocal = (v) => (v ? `${Number(v)} mm` : "—");
  const formatISO = (v) => (v ? `ISO ${Number(v)}` : "—");
  const formatExposure = (v) => (v ? String(v) : "—");

    const hasDevice = !!(exif?.camera_make || exif?.camera_model);

    const hasAnyExif = !!(
    hasDevice ||
    exif?.lens_model ||
    exif?.width_px ||
    exif?.height_px ||
    exif?.f_number ||
    exif?.exposure_time ||
    exif?.iso ||
    exif?.focal_length_mm
    );

    const cameraText = exif
    ? [exif.camera_make, exif.camera_model].filter(Boolean).join(" ")
    : "";


  return (
    <div className="tl-lightbox" onMouseDown={onClose}>
      <div className="tl-lightbox-inner" onMouseDown={(e) => e.stopPropagation()}>
        <button className="tl-lightbox-close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        {/* immagine + sidebar */}
        <div className="tl-lightbox-body">
          <div className="tl-lightbox-media">
            <img
              className="tl-lightbox-img"
              src={imgSrc}
              alt={photo?.username || "photo"}
            />
            </div>
            <aside
                className="tl-lightbox-info"
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="tl-info-title">Shot Details</div>

                {exifLoading ? (
                <div className="tl-info-muted">Loading EXIF...</div>
                ) : !hasAnyExif ? (
                <div className="tl-info-muted">EXIF not available</div>
                ) : (
                <div className="tl-info-list">
                    <div className="tl-info-row">
                <span>Camera</span>
                <span>{cameraText || "—"}</span>
                </div>

                {exif?.lens_model ? (
                <div className="tl-info-row">
                    <span>Lens</span>
                    <span>{exif.lens_model}</span>
                </div>
                ) : null}

                {exif?.f_number ? (
                <div className="tl-info-row">
                    <span>Aperture</span>
                    <span>{formatFNumber(exif.f_number)}</span>
                </div>
                ) : null}

                {exif?.exposure_time ? (
                <div className="tl-info-row">
                    <span>Shutter Speed</span>
                    <span>{formatExposure(exif.exposure_time)}</span>
                </div>
                ) : null}

                {exif?.iso ? (
                <div className="tl-info-row">
                    <span>ISO</span>
                    <span>{formatISO(exif.iso)}</span>
                </div>
                ) : null}

                {exif?.focal_length_mm ? (
                <div className="tl-info-row">
                    <span>Focal length</span>
                    <span>{formatFocal(exif.focal_length_mm)}</span>
                </div>
                ) : null}

                </div>
                )}

            {photo?.caption ? (
  <div className="tl-shot-caption">
    <div className="tl-shot-caption-label">Caption</div>
    <div className="tl-shot-caption-text">{photo.caption}</div>
  </div>
) : (
  <div className="tl-shot-caption tl-shot-caption-empty">
    <div className="tl-shot-caption-label">Caption</div>
    <div className="tl-shot-caption-text">—</div>
  </div>
    )}
          </aside>
        </div>

        {/* ✅ barra sotto invariata */}
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
