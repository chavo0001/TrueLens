import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/MyProfile.css"; // riuso il tuo CSS mp-*

const ProfileLayout = ({
  profileUser,
  photos = [],
  isMe = false,

  // stats extra
  likesTotal = null,
  followersCount = null,

  // actions
  onOpenUpload = null,      // per MyProfile (apre modal upload)
  onOpenDeleteMenu = null,  // (photoId) => void
  menuOpenFor = null,       // photoId | null
  onRequestDelete = null,   // (photoObj) => void

  // likes
  onToggleLike = null,      // (photoId) => void
}) => {
  const navigate = useNavigate();

  const avatarUrl =
    (profileUser?.avatar && `http://localhost:5001${profileUser.avatar}`) ||
    "/default-avatar.jpg";

  const username = profileUser?.username || "user";
  const photoCount = photos.length;

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

              {isMe ? (
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

                  <button
                    className="mp-btn mp-btn-primary"
                    onClick={() => onOpenUpload && onOpenUpload()}
                    disabled={!onOpenUpload}
                  >
                    Add photo
                  </button>
                </div>
              ) : null}
            </div>

            <div className="mp-stats">
              <div className="mp-stat">
                <span className="mp-stat-num">{photoCount}</span>
                <span className="mp-stat-label">photos</span>
              </div>

              <div className="mp-stat mp-stat-muted">
                <span className="mp-stat-num">{followersCount ?? "—"}</span>
                <span className="mp-stat-label">followers</span>
              </div>

              <div className="mp-stat mp-stat-muted">
                <span className="mp-stat-num">{likesTotal ?? "—"}</span>
                <span className="mp-stat-label">likes</span>
              </div>
            </div>

            <div className="mp-bio">
              {profileUser?.bio ? (
                profileUser.bio
              ) : isMe ? (
                <span className="mp-bio-placeholder">Add a bio in Edit profile.</span>
              ) : null}
            </div>
          </div>
        </div>

        {/* GALLERY */}
        <div className="mp-gallery">
          {photos.length === 0 ? (
            <div className="mp-empty">
              {isMe
                ? <>Nessuna foto ancora. Premi <b>Add photo</b> per caricare la prima.</>
                : "No photos yet."}
            </div>
          ) : (
            <div className="mp-grid">
              {photos.map((p) => (
                <div key={p.id} className="mp-tile">
                  {/* 3 puntini solo se isMe */}
                  {isMe ? (
                    <div className="mp-photo-actions">
                      <button
                        className="mp-photo-dots"
                        onClick={() => onOpenDeleteMenu && onOpenDeleteMenu(p.id)}
                        aria-label="photo menu"
                      >
                        •••
                      </button>

                      {menuOpenFor === p.id ? (
                        <div className="mp-photo-menu">
                          <button
                            className="mp-photo-menu-item mp-danger"
                            onClick={() => onRequestDelete && onRequestDelete(p)}
                          >
                            Delete photo
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <img
                    className="mp-img"
                    src={`http://localhost:5001${p.file_path}`}
                    alt=""
                    loading="lazy"
                  />

                  {/* Like badge (se vuoi già agganciarlo dopo) */}
                  <button
                    className={`like-badge ${p.likedByMe ? "liked" : ""}`}
                    onClick={() => onToggleLike && onToggleLike(p.id)}
                    disabled={!onToggleLike}
                    title={p.likedByMe ? "Unlike" : "Like"}
                  >
                    ❤️ <span>{p.likesCount ?? 0}</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileLayout;
