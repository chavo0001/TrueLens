import React, { useEffect, useState, useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../api/apiFetch";
import { UserContext } from "../data/UserContext";
import "../styles/Followers.css";
import "../styles/FollowersPage.css";
const FollowersPage = ({ isMe = false }) => {
  const { id } = useParams();
  const { user: ctxUser } = useContext(UserContext);
  const navigate = useNavigate();

  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFollowers() {
      try {
        const userId = isMe ? ctxUser?.id : Number(id);
        if (!userId) return;

        const res = await apiFetch(`/api/users/${userId}/followers`);
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

  if (loading) {
  return <div className="followers-loading">Loading followers...</div>;
}

return (
  <div className="followers-page">
    <h2 className="followers-title">Followers</h2>

    {followers.length === 0 && (
      <div className="followers-empty">No followers yet.</div>
    )}

    <div className="followers-list">
      {followers.map((u) => (
        <div
          key={u.id}
          className="follower-item"
          onClick={() => navigate(`/user/${u.id}`)}
        >
          <img
            className="follower-avatar"
            src={
              u.avatar
                ? `http://localhost:5001${u.avatar}`
                : "/default-avatar.jpg"
            }
            alt=""
          />
          <span className="follower-username">@{u.username}</span>
        </div>
      ))}
    </div>
  </div>
);

};

export default FollowersPage;
