import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/apiFetch";
import "../styles/MyProfile.css";

const MyProfile = () => {
  const navigate = useNavigate();

  const [me, setMe] = useState(null);
  const [profile, setProfile] = useState(null); // { user, photos }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Upload modal
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  // 3 dots menu + delete confirm modal
  const [menuOpenFor, setMenuOpenFor] = useState(null); // photoId | null
  const [confirmDelete, setConfirmDelete] = useState(null); // photo object | null
  const [deleting, setDeleting] = useState(false);

  const photos = useMemo(() => profile?.photos || [], [profile]);

  // close dropdown on outside click
  useEffect(() => {
    function onDocClick(e) {
      const menu = document.querySelector(".mp-photo-menu");
      const btn = document.querySelector(".mp-photo-dots");
      if (!menuOpenFor) return;
      if (menu && menu.contains(e.target)) return;
      if (btn && btn.contains(e.target)) return;
      setMenuOpenFor(null);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpenFor]);

  // close on ESC
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") {
        setMenuOpenFor(null);
        setConfirmDelete(null);
        setUploadOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  async function loadMe() {
    const res = await apiFetch("/api/me");
    if (!res.ok) return null;
    const data = await res.json();
    return data?.user || null;
  }

  async function loadMyProfile(userId) {
    const res = await apiFetch(`/api/users/${userId}`);
    if (!res.ok) return null;
    return res.json(); // { user, photos }
  }

  async function refresh() {
    try {
      setLoading(true);
      setError(null);

      const meData = await loadMe();
      if (!meData) {
        navigate("/login");
        return;
      }
      setMe(meData);

      const prof = await loadMyProfile(meData.id);
      if (!prof) {
        setError("Impossibile caricare il profilo.");
        return;
      }

      // Ordina per data (nel caso backend non lo faccia)
      const sorted = [...(prof.photos || [])].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );

      setProfile({ user: prof.user, photos: sorted });
    } catch (err) {
      console.error(err);
      setError("Errore di caricamento profilo.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const avatarUrl =
    (profile?.user?.avatar && `http://localhost:5001${profile.user.avatar}`) ||
    "/default-avatar.jpg";

  const username = profile?.user?.username || me?.username || "user";

  const photoCount = photos.length;

  const openUpload = () => setUploadOpen(true);
  const closeUpload = () => {
    setUploadOpen(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const submitUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    try {
      setUploading(true);

      const form = new FormData();
      form.append("photo", file);

      const res = await apiFetch("/api/me/photos", {
        method: "POST",
        body: form,
        // IMPORTANT: non mettere Content-Type con FormData
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Upload failed");
      }

      closeUpload();
      await refresh();
    } catch (err) {
      console.error(err);
      alert(err.message || "Errore upload");
    } finally {
      setUploading(false);
    }
  };

  const requestDelete = (photo) => {
    setMenuOpenFor(null);
    setConfirmDelete(photo);
  };

  const doDelete = async () => {
    if (!confirmDelete) return;

    try {
      setDeleting(true);
      const res = await apiFetch(`/api/me/photos/${confirmDelete.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Delete failed");
      }

      setConfirmDelete(null);
      await refresh();
    } catch (err) {
      console.error(err);
      alert(err.message || "Errore cancellazione");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="mp-page">
        <div className="mp-container">
          <div className="mp-skeleton" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mp-page">
        <div className="mp-container">
          <div className="mp-error">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="mp-page">
      <div className="mp-container">
        {/* HEADER PROFILO (stile IG) */}
        <div className="mp-header-card">
          <div className="mp-avatar-wrap">
            <img className="mp-avatar" src={avatarUrl} alt="avatar" />
          </div>

          <div className="mp-header-info">
            <div className="mp-header-top">
              <div className="mp-username">@{username}</div>

              <div className="mp-actions">
                <button
                  className="mp-btn"
                  onClick={() => navigate("/settings/profile")}
                >
                  Edit profile
                </button>
                <button
                  className="mp-btn mp-btn-ghost"
                  onClick={() => navigate("/settings/security")}
                >
                  Security
                </button>
                <button className="mp-btn mp-btn-primary" onClick={openUpload}>
                  Add photo
                </button>
              </div>
            </div>

            <div className="mp-stats">
              <div className="mp-stat">
                <span className="mp-stat-num">{photoCount}</span>
                <span className="mp-stat-label">photos</span>
              </div>
              {/* spazio per future stats */}
              <div className="mp-stat mp-stat-muted">
                <span className="mp-stat-num">—</span>
                <span className="mp-stat-label">followers</span>
              </div>
              <div className="mp-stat mp-stat-muted">
                <span className="mp-stat-num">—</span>
                <span className="mp-stat-label">likes</span>
              </div>
            </div>

            <div className="mp-bio">
              {profile?.user?.bio ? (
                profile.user.bio
              ) : (
                <span className="mp-bio-placeholder">
                  Add a bio in Edit profile.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* GALLERY */}
        <div className="mp-gallery">
          {photos.length === 0 ? (
            <div className="mp-empty">
              Nessuna foto ancora. Premi <b>Add photo</b> per caricare la prima.
            </div>
          ) : (
            <div className="mp-grid">
              {photos.map((p) => (
                <div key={p.id} className="mp-tile">
                  {/* 3 puntini */}
                  <div className="mp-photo-actions">
                    <button
                      className="mp-photo-dots"
                      onClick={() =>
                        setMenuOpenFor((cur) => (cur === p.id ? null : p.id))
                      }
                      aria-label="photo menu"
                    >
                      •••
                    </button>

                    {menuOpenFor === p.id && (
                      <div className="mp-photo-menu">
                        <button
                          className="mp-photo-menu-item mp-danger"
                          onClick={() => requestDelete(p)}
                        >
                          Delete photo
                        </button>
                      </div>
                    )}
                  </div>

                  <img
                    className="mp-img"
                    src={`http://localhost:5001${p.file_path}`}
                    alt=""
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* UPLOAD MODAL */}
      {uploadOpen && (
        <div className="mp-modal-backdrop" onMouseDown={closeUpload}>
          <div
            className="mp-modal"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h3>Add photo</h3>
            <div className="mp-modal-body">
              <input ref={fileRef} type="file" accept="image/*" />
            </div>

            <div className="mp-modal-actions">
              <button className="mp-btn mp-btn-ghost" onClick={closeUpload}>
                Cancel
              </button>
              <button
                className="mp-btn mp-btn-primary"
                onClick={submitUpload}
                disabled={uploading}
              >
                {uploading ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {confirmDelete && (
        <div className="mp-modal-backdrop" onMouseDown={() => setConfirmDelete(null)}>
          <div className="mp-modal" onMouseDown={(e) => e.stopPropagation()}>
            <h3>Sei sicuro di voler cancellare questa foto?</h3>

            <div className="mp-modal-actions">
              <button
                className="mp-btn mp-btn-ghost"
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
              >
                No
              </button>
              <button
                className="mp-btn mp-btn-danger"
                onClick={doDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Sì, cancella"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyProfile;
