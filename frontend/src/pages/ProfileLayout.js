import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/MyProfile.css";

const ProfileLayout = ({
  profileUser,
  photos = [],
  isMe = false,

  // stats
  likesTotal = null,
  followersCount = null,

  // follow
  isFollowing = false,
  onToggleFollow = null,

  // actions
  onOpenUpload = null,
  onOpenDeleteMenu = null,
  menuOpenFor = null,
  onRequestDelete = null,

  // likes
  onToggleLike = null,

  // ✅ lightbox
  onOpenPhoto = null,
}) => {
  const navigate = useNavigate();

  const avatarUrl = profileUser?.avatar
    ? `http://localhost:5001${profileUser.avatar}`
    : "/default-avatar.jpg";

  const username = profileUser?.username || "user";
  const photoCount = photos.length;

  return (
    <div className="mp-page">
      <div className="mp-container">
        <div className="mp-header-card">
          <div className="mp-avatar-wrap">
            <img className="mp-avatar" src={avatarUrl} alt="avatar" />
          </div>

          <div className="mp-header-info">
            <div className="mp-header-top">
              <div className="mp-username">@{username}</div>

              {isMe ? (
                <div className="mp-actions">
                  <button className="mp-btn" onClick={() => navigate("/settings/profile")}>
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
                  >
                    Add photo
                  </button>
                </div>
              ) : (
                <button
                  className={`mp-btn ${!isFollowing ? "mp-btn-primary" : ""}`}
                  onClick={() => onToggleFollow && onToggleFollow()}
                >
                  {isFollowing ? "Following" : "Follow"}
                </button>
              )}
            </div>

            <div className="mp-stats">
              <div className="mp-stat">
                <span className="mp-stat-num">{photoCount}</span>
                <span className="mp-stat-label">photos</span>
              </div>

              <div
                className="mp-stat mp-stat-clickable"
                onClick={() =>
                  isMe
                    ? navigate("/me/followers")
                    : navigate(`/user/${profileUser.id}/followers`)
                }
              >
                <span className="mp-stat-num">{followersCount ?? "—"}</span>
                <span className="mp-stat-label">followers</span>
              </div>

              <div className="mp-stat">
                <span className="mp-stat-num">{likesTotal ?? "—"}</span>
                <span className="mp-stat-label">likes</span>
              </div>
            </div>

            <div className="mp-bio">
              {profileUser?.bio || (isMe && <span className="mp-bio-placeholder">Add a bio</span>)}
            </div>
          </div>
        </div>

        {/* GALLERY */}
        <div className="mp-gallery">
          <div className="mp-grid">
            {photos.map((p) => (
              <div
                key={p.id}
                className="mp-tile"
                role="button"
                tabIndex={0}
                onClick={() => onOpenPhoto && onOpenPhoto(p)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onOpenPhoto && onOpenPhoto(p);
                }}
              >
                {isMe && (
                  <div className="mp-photo-actions">
                    <button
                      className="mp-photo-dots"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenDeleteMenu && onOpenDeleteMenu(p.id);
                      }}
                    >
                      •••
                    </button>

                    {menuOpenFor === p.id && (
                      <div
                        className="mp-photo-menu"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          className="mp-photo-menu-item mp-danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRequestDelete && onRequestDelete(p);
                          }}
                        >
                          Delete photo
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <img
                  className="mp-img"
                  src={`http://localhost:5001${p.file_path}`}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />

                <button
                  className={`like-badge ${p.likedByMe ? "liked" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleLike && onToggleLike(p.id);
                  }}
                >
                  ❤️ {p.likesCount ?? 0}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileLayout;
