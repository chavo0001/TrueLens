import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/apiFetch";
import ProfileLayout from "./ProfileLayout";
import PhotoLightbox from "./PhotoLightbox";
import UploadPhotoModal from "./UploadPhotoModal";
const MyProfile = () => {
  const navigate = useNavigate();

  const [me,setMe] = useState(null);
  const [profile, setProfile] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [likesTotal, setLikesTotal] = useState(null);

  // Upload 
  const [uploadOpen, setUploadOpen] = useState(false);
  const [followersCount, setFollowersCount] = useState(null);
  
  // 3 puntini menu + cancellazione foto
  const [menuOpenFor, setMenuOpenFor] = useState(null); 
  const [confirmDelete, setConfirmDelete] = useState(null); 
  const [deleting, setDeleting] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const photos = useMemo(() => profile?.photos || [], [profile]);
  
  // si chiude dropdown cliccando fuori
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

  async function loadLikesTotal(userId) {
  const res = await apiFetch(`/api/users/${userId}/likes-total`);
  if (!res.ok) return null;
  const data = await res.json();
  return typeof data.likesTotal === "number" ? data.likesTotal : null;
}
  async function loadFollowersCount(userId) {
  const res = await apiFetch(`/api/users/${userId}/followers-count`);
  if (!res.ok) return null;
  const data = await res.json();
  return typeof data.followersCount === "number"
    ? data.followersCount
    : null;
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
      
      const total = await loadLikesTotal(meData.id);
      setLikesTotal(total);
      const totalFollowers = await loadFollowersCount(meData.id);
      setFollowersCount(totalFollowers);

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

  const openUpload = () => setUploadOpen(true);

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


  const handleToggleLike = async (photoId) => {
    try {
      const res = await apiFetch(`/api/photos/${photoId}/like`, { method: "POST" });
      if (!res.ok) return;
      const data = await res.json();

      setProfile((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          photos: (prev.photos || []).map((p) =>
            p.id === photoId
              ? { ...p, likedByMe: data.liked, likesCount: data.likesCount }
              : p
          ),
        };
      });
    } catch (err) {
      console.error(err);
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

  if (!profile?.user) {
    return (
      <div className="mp-page">
        <div className="mp-container">
          <div className="mp-error">Profilo non disponibile.</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <ProfileLayout
        profileUser={profile.user}
        photos={photos}
        isMe={true}
        likesTotal={likesTotal}
        followersCount={followersCount} 
        onOpenUpload={openUpload}
        onOpenDeleteMenu={(photoId) =>
          setMenuOpenFor((cur) => (cur === photoId ? null : photoId))
        }
        menuOpenFor={menuOpenFor}
        onRequestDelete={requestDelete}
        onToggleLike={handleToggleLike} 
        onOpenPhoto={(p) => setSelectedPhoto(p)}
      />
      {selectedPhoto && (
  <PhotoLightbox
    photo={selectedPhoto}
    onClose={() => setSelectedPhoto(null)}
    onPhotoUpdate={(photoId, patch) => {
      // aggiorna griglia
      setProfile((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          photos: (prev.photos || []).map((ph) =>
            ph.id === photoId ? { ...ph, ...patch } : ph
          ),
        };
      });

      // aggiorna lightbox
      setSelectedPhoto((cur) =>
        cur && cur.id === photoId ? { ...cur, ...patch } : cur
      );
    }}
  />
)}

 {/* UPLOAD MODAL */}
   <UploadPhotoModal
  open={uploadOpen}
  onClose={() => setUploadOpen(false)}
  onUploaded={refresh}
/>

      {/* DELETE CONFIRM MODAL */}
      {confirmDelete && (
        <div
          className="mp-modal-backdrop"
          onMouseDown={() => setConfirmDelete(null)}
        >
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
    </>
  );
};

export default MyProfile; 
