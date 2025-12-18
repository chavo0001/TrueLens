import React, { useEffect, useState, useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../api/apiFetch";
import { UserContext } from "../data/UserContext";
import "../styles/FollowersPage.css";
import "../styles/Followers.css";

const FollowersPage = ({ isMe = false }) => {
  const { id } = useParams();
  const { user: ctxUser } = useContext(UserContext);
  const navigate = useNavigate();

  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyUserIds, setBusyUserIds] = useState(new Set());

  useEffect(() => {
    async function loadFollowers() {
      try {
        const userId = isMe ? ctxUser?.id : Number(id);
        if (!userId) return;

        const res = await fetch(`http://localhost:5001/api/users/${userId}/followers`, {
         credentials: "include",
        });

        if (!res.ok) throw new Error();

        const data = await res.json();
        setFollowers(data.followers || []);
      } catch (err) {
        console.error("load followers error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadFollowers();
  }, [id, isMe, ctxUser]);

  const toggleFollow = async (targetUserId) => {
    if (!ctxUser?.id) {
      navigate("/login");
      return;
    }

    // evita doppio click spam
    setBusyUserIds((prev) => new Set(prev).add(targetUserId));

    try {
      const res = await apiFetch(`/api/users/${targetUserId}/follow`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Follow toggle failed");

      setFollowers((prev) =>
        prev.map((u) =>
          u.id === targetUserId ? { ...u, isFollowing: data.following } : u
        )
      );
    } catch (err) {
      console.error(err);
      alert(err.message || "Errore follow/unfollow");
    } finally {
      setBusyUserIds((prev) => {
        const next = new Set(prev);
        next.delete(targetUserId);
        return next;
      });
    }
  };

  if (loading) return <div className="followers-loading">Loading followers...</div>;

  return (
    <div className="followers-page">
      <h2 className="followers-title">Followers</h2>

      {followers.length === 0 && (
        <div className="followers-empty">No followers yet.</div>
      )}

      <div className="followers-list">
        {followers.map((u) => {
          const isMeRow = ctxUser?.id === u.id;
          const busy = busyUserIds.has(u.id);

          return (
            <div
              key={u.id}
              className="follower-item"
              onClick={() => navigate(`/user/${u.id}`)}
            >
              <img
                className="follower-avatar"
                src={u.avatar ? `http://localhost:5001${u.avatar}` : "/default-avatar.jpg"}
                alt=""
              />

              <span className="follower-username">@{u.username}</span>

              {/* CTA a destra */}
              {!isMeRow && (
                <button
                  className={`fp-follow-btn ${u.isFollowing ? "is-following" : "is-not-following"}`}
                  disabled={busy}
                  onClick={(e) => {
                    e.stopPropagation(); // non navigare
                    toggleFollow(u.id);
                  }}
                  title={u.isFollowing ? "Unfollow" : "Follow"}
                >
                  {busy ? "..." : u.isFollowing ? "Following" : "Follow"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FollowersPage;
