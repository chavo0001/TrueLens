import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/Home.css";
import { apiFetch } from "../api/apiFetch";

const UserProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const profileUserId = Number(id);

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

  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        setError(null);

        const [profileData, meData] = await Promise.all([loadProfile(), loadMe()]);
        setUser(profileData.user || null);
        setPhotos(profileData.photos || []);
        setMe(meData);
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
  // UPLOAD
  // ============================
  const handleFileChange = (e) => setFiles(Array.from(e.target.files));

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
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }

      // refresh profilo dopo upload
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 className="center-text" style={{ marginBottom: "1rem" }}>
          @{user.username || "user"}
        </h2>

        {/* shortcut utile: se è il tuo profilo, ti garantisce di tornarci */}
        {me && (
          <button className="creatorButton" onClick={() => navigate("/me")}>
            My profile
          </button>
        )}
      </div>

      {/* ============================
          UPLOAD AREA (SOLO SE MIO)
      ============================ */}
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

          {uploadError && (
            <p style={{ color: "red", marginTop: "0.5rem" }}>{uploadError}</p>
          )}
        </div>
      )}

      {/* ============================
          PHOTO GRID / EMPTY STATE
      ============================ */}
      {photos.length === 0 ? (
        <p className="center-text" style={{ padding: "2rem" }}>
          {isMine ? "Your profile is empty. Upload your first photos 👇" : "No photos yet."}
        </p>
      ) : (
        <div className="photo-grid">
          {photos.map((p) => (
            <div className="photo-tile" key={p.id}>
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
