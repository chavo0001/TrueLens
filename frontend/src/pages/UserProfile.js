import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { apiFetch } from "../api/apiFetch";
import ProfileLayout from "./ProfileLayout";
import PhotoLightbox from "./PhotoLightbox";
import UploadPhotoModal from "./UploadPhotoModal";
const UserProfile = () => {
  const { id } = useParams();
  const profileUserId = Number(id);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  // menu 3 puntini + modal delete
  const [menuOpenFor, setMenuOpenFor] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  
  // ref per click-outside 
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
  const [likesTotal, setLikesTotal] = useState(null);
  const [followersCount, setFollowersCount] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);

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
        const [followers, followStatus] = await Promise.all([
          apiFetch(`/api/users/${profileUserId}/followers-count`).then(r=>r.json()),
          apiFetch(`/api/users/${profileUserId}/follow-status`, { credentials:"include" }).then(r=>r.json())
           ]);

        setFollowersCount(followers.followersCount);
        setIsFollowing(followStatus.following);

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

  {isMine && (
  <UploadPhotoModal
    open={uploadOpen}
    onClose={() => setUploadOpen(false)}
    onUploaded={async () => {
      const refreshed = await loadProfile();
      setUser(refreshed.user || null);
      setPhotos(refreshed.photos || []);
    }}
  />
)}

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

  // ---------- TOGGLE ----------
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
   const handleToggleFollow = async () => {
   const res = await apiFetch(`/api/users/${profileUserId}/follow`, { method:"POST" });
   const data = await res.json();

   setIsFollowing(data.following);
   setFollowersCount(c => c + (data.following ? 1 : -1));
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
  followersCount={followersCount}
  isFollowing={isFollowing}
  onToggleFollow={handleToggleFollow}
  onOpenUpload={isMine ? openUpload : null}
  onOpenDeleteMenu={(photoId) =>
    setMenuOpenFor((cur) => (cur === photoId ? null : photoId))
  }
  menuOpenFor={menuOpenFor}
  onRequestDelete={(photo) => setConfirmDelete(photo)}
  onToggleLike={handleToggleLike}
  onOpenPhoto={(p) => setSelectedPhoto(p)}

/>
{selectedPhoto && (
  <PhotoLightbox
    photo={selectedPhoto}
    onClose={() => setSelectedPhoto(null)}
    onPhotoUpdate={(photoId, patch) => {
      //  aggiorna la griglia del profilo pubblico
      setPhotos((prev) =>
        (prev || []).map((ph) => (ph.id === photoId ? { ...ph, ...patch } : ph))
      );

      //  aggiorna il lightbox
      setSelectedPhoto((cur) =>
        cur && cur.id === photoId ? { ...cur, ...patch } : cur
      );
    }}
  />
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
