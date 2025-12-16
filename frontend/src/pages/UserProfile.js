import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/Home.css";
import "../styles/UserProfile.css";
import { apiFetch } from "../api/apiFetch";

const UserProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const profileUserId = Number(id);

  // menu 3 puntini + modal delete
  const [menuOpenFor, setMenuOpenFor] = useState(null); // photoId oppure null
  const [confirmDelete, setConfirmDelete] = useState(null); // photo object oppure null
  const [deleting, setDeleting] = useState(false);

  // ref per click-outside (menu puntini)
  const menuRef = useRef(null);

  const [user, setUser] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // session user
  const [me, setMe] = useState(null);
  const isMine = me?.id === profileUserId;

  // upload state
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // ============================
  // LOAD PROFILE + PHOTOS
  // ============================
  const loadProfile = async () => {
    const res = await fetch(`http://localhost:5001/api/users/${profileUserId}`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Errore caricamento profilo");
    return res.json();
  };

  // ============================
  // LOAD "ME" (optional if not logged)
  // ============================
  const loadMe = async () => {
    try {
      const res = await apiFetch("/api/me");
      if (!res.ok) return null;
      const data = await res.json();
      return data.user || null;
    } catch {
      return null;
    }
  };

  // ============================
  // INIT LOAD
  // ============================
  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        setError(null);

        const [profileData, meData] = await Promise.all([loadProfile(), loadMe()]);
        setUser(profileData.user || null);
        setPhotos(profileData.photos || []);
        setMe(meData);

        // reset UI
        setMenuOpenFor(null);
        setConfirmDelete(null);
        setDeleting(false);
      } catch (err) {
        console.error(err);
        setError("Unable to load profile at the moment.");
      } finally {
        setLoading(false);
      }
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileUserId]);

  // ============================
  // CLOSE MENU ON OUTSIDE CLICK + ESC
  // ============================
  useEffect(() => {
    const onMouseDown = (e) => {
      // se clicchi fuori dall'area page, chiude il menu 3 puntini
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpenFor(null);
      }
    };

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setMenuOpenFor(null);
        setConfirmDelete(null);
      }
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  // ============================
  // UPLOAD
  // ============================
  const handleFileChange = (e) => setFiles(Array.from(e.target.files || []));

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!files.length) return;

    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    files.forEach((file) => formData.append("photos", file));

    try {
      const res = await apiFetch("/api/me/photos", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Upload failed");
      }

      const refreshed = await loadProfile();
      setUser(refreshed.user || null);
      setPhotos(refreshed.photos || []);
      setFiles([]);
    } catch (err) {
      console.error(err);
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  // ============================
  // DELETE
  // ============================
  const deletePhoto = async (photoId) => {
    const res = await apiFetch(`/api/me/photos/${photoId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Delete failed");
    }
  };

  // ============================
  // STATES
  // ============================
  if (loading) {
    return (
      <p className="center-text" style={{ padding: "2rem" }}>
        Loading profile...
      </p>
    );
  }

  if (error) {
    return (
      <p className="center-text" style={{ padding: "2rem", color: "red" }}>
        {error}
      </p>
    );
  }

  if (!user) {
    return (
      <p className="center-text" style={{ padding: "2rem" }}>
        User not found.
      </p>
    );
  }

  return (
    <div className="page">
      {/* MODAL CONFERMA DELETE */}
      {confirmDelete && (
        <div
          className="modal-backdrop"
          onClick={() => {
            if (!deleting) setConfirmDelete(null);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>Sei sicuro di voler cancellare questa foto?</h3>

            <div className="modal-actions">
              <button className="modal-btn" disabled={deleting} onClick={() => setConfirmDelete(null)}>
                No
              </button>

              <button
                className="modal-btn danger"
                disabled={deleting}
                onClick={async () => {
                  try {
                    setDeleting(true);
                    await deletePhoto(confirmDelete.id);
                    setConfirmDelete(null);

                    const refreshed = await loadProfile();
                    setUser(refreshed.user || null);
                    setPhotos(refreshed.photos || []);
                  } catch (err) {
                    console.error(err);
                    alert(err.message);
                    setConfirmDelete(null);
                  } finally {
                    setDeleting(false);
                  }
                }}
              >
                {deleting ? "Eliminando..." : "Sì, elimina"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 className="center-text" style={{ marginBottom: "1rem" }}>
          @{user.username || "user"}
        </h2>
      </div>

      {/* UPLOAD AREA (SOLO SE MIO) */}
      {isMine && (
        <div style={{ marginBottom: "2rem", textAlign: "center" }}>
          <form onSubmit={handleUpload}>
            <input type="file" accept="image/*" multiple onChange={handleFileChange} />

            <button
              type="submit"
              disabled={uploading}
              className="creatorButton"
              style={{ marginLeft: "1rem" }}
            >
              {uploading ? "Uploading..." : "Add photos"}
            </button>
          </form>

          {uploadError && <p style={{ color: "red", marginTop: "0.5rem" }}>{uploadError}</p>}
        </div>
      )}

      {/* PHOTO GRID / EMPTY STATE */}
      {photos.length === 0 ? (
        <p className="center-text" style={{ padding: "2rem" }}>
          {isMine ? "Your profile is empty. Upload your first photos 👇" : "No photos yet."}
        </p>
      ) : (
        <div className="photo-grid">
          {photos.map((p) => (
            <div className="photo-tile" key={p.id}>
              {isMine && (
                <div className="photo-actions">
                  <button
                    className="photo-dots"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpenFor((cur) => (cur === p.id ? null : p.id));
                    }}
                    aria-label="Photo options"
                  >
                    ⋯
                  </button>

                  {menuOpenFor === p.id && (
                    <div className="photo-menu"ref={menuRef}>
                      <button
                        className="photo-menu-item danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenFor(null);
                          setConfirmDelete(p);
                        }}
                      >
                        Cancella foto
                      </button>
                    </div>
                  )}
                </div>
              )}

              <img src={`http://localhost:5001${p.file_path}`} alt="photo" loading="lazy" />
              <div className="photo-meta">@{user.username || "user"}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserProfile;
