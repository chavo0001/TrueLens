import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { apiFetch } from "../api/apiFetch";
import ProfileLayout from "./ProfileLayout";

const UserProfile = () => {
  const { id } = useParams();
  const profileUserId = Number(id);

  // menu 3 puntini + modal delete
  const [menuOpenFor, setMenuOpenFor] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
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

  // Upload modal (solo se isMine)
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const [likesTotal, setLikesTotal] = useState(null);

  const loadProfile = async () => {
    const res = await fetch(`http://localhost:5001/api/users/${profileUserId}`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Errore caricamento profilo");
    return res.json();
  };
  const loadLikesTotal = async () => {
  const res = await fetch(
    `http://localhost:5001/api/users/${profileUserId}/likes-total`,
    { credentials: "include" }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return typeof data.likesTotal === "number" ? data.likesTotal : null;
};

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

        const [profileData, meData, likesData] = await Promise.all([
         loadProfile(),
         loadMe(),
         loadLikesTotal(),
        ]);

         setLikesTotal(likesData);

        setUser(profileData.user || null);
        setPhotos(profileData.photos || []);
        setMe(meData);

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

  // click-outside + ESC
  useEffect(() => {
    const onMouseDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpenFor(null);
      }
    };

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setMenuOpenFor(null);
        setConfirmDelete(null);
        setUploadOpen(false);
      }
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  // ---------- UPLOAD (modal) ----------
  const openUpload = () => setUploadOpen(true);

  const closeUpload = () => {
    setUploadOpen(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const submitUpload = async () => {
    const fileList = fileRef.current?.files;
    if (!fileList || fileList.length === 0) return;

    try {
      setUploading(true);

      const formData = new FormData();
      Array.from(fileList).forEach((f) => formData.append("photos", f));

      const res = await apiFetch("/api/me/photos", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Upload failed");
      }

      closeUpload();

      const refreshed = await loadProfile();
      setUser(refreshed.user || null);
      setPhotos(refreshed.photos || []);
    } catch (err) {
      console.error(err);
      alert(err.message || "Errore upload");
    } finally {
      setUploading(false);
    }
  };

  // ---------- DELETE ----------
  const deletePhoto = async (photoId) => {
    const res = await apiFetch(`/api/me/photos/${photoId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Delete failed");
    }
  };

  // ---------- TOGGLE LIKE ----------
  const handleToggleLike = async (photoId) => {
    try {
      const res = await apiFetch(`/api/photos/${photoId}/like`, { method: "POST" });
      if (!res.ok) return;
      const data = await res.json();

      setPhotos((prev) =>
        prev.map((p) =>
          p.id === photoId
            ? { ...p, likedByMe: data.liked, likesCount: data.likesCount }
            : p
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  // ---------- STATES ----------
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
      <ProfileLayout
        profileUser={user}
        photos={photos}
        isMe={isMine}
        likesTotal={likesTotal}
        onOpenUpload={isMine ? openUpload : null} 
        onOpenDeleteMenu={(photoId) =>
          setMenuOpenFor((cur) => (cur === photoId ? null : photoId))
        }
        menuOpenFor={menuOpenFor}
        onRequestDelete={(photo) => setConfirmDelete(photo)}
        onToggleLike={handleToggleLike}
      />

      {/* UPLOAD MODAL (solo se isMine) */}
      {isMine && uploadOpen && (
        <div className="mp-modal-backdrop" onMouseDown={closeUpload}>
          <div className="mp-modal" onMouseDown={(e) => e.stopPropagation()}>
            <h3>Add photo</h3>
            <div className="mp-modal-body">
              <input ref={fileRef} type="file" accept="image/*" multiple />
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
              <button
                className="modal-btn"
                disabled={deleting}
                onClick={() => setConfirmDelete(null)}
              >
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
    </div>
  );
};

export default UserProfile;
