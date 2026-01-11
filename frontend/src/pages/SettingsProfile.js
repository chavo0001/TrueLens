import React, { useEffect, useRef, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/apiFetch";
import { UserContext } from "../data/UserContext";

export default function SettingsProfile() {
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const { setUser } = useContext(UserContext);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState(""); // path tipo "/uploads/avatars/xxx.jpg"

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch("/api/me");
        if (!res.ok) return navigate("/login");

        const data = await res.json();
        const me = data.user;

        // carico profilo completo per bio+avatar
        const pRes = await apiFetch(`/api/users/${me.id}`);
        if (!pRes.ok) return navigate("/login");

        const pData = await pRes.json();

        setUsername(pData.user.username || "");
        setBio(pData.user.bio || "");
        setAvatar(pData.user.avatar || "");
      } catch (err) {
        console.error(err);
        navigate("/login");
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  const avatarUrl = avatar ? `http://localhost:5001${avatar}` : "/default-avatar.jpg";

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await apiFetch("/api/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, bio }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Save failed");

      // aggiorna anche la navbar (username/bio se li usi nel menu)
      setUser((prev) => ({
        ...prev,
        username: data.user.username,
        // avatar lo lasciamo invariato qui (lo aggiorniamo nel suo endpoint)
      }));

      navigate("/me");
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const form = new FormData();
      form.append("avatar", file);

      const res = await apiFetch("/api/me/avatar", {
        method: "POST",
        body: form,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Upload failed");

      // preview locale (pagina settings)
      setAvatar(data.user.avatar);

      // aggiorna subito navbar (UserContext)
      setUser((prev) => ({
        ...prev,
        avatar: data.user.avatar ? `http://localhost:5001${data.user.avatar}` : "/default-avatar.jpg",
      }));

      if (fileRef.current) fileRef.current.value = "";
    } catch (e) {
      alert(e.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div style={{ padding: 24 }}>Loading...</div>;

  return (
    <div style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <h2>Edit profile</h2>

      <div style={{ display: "flex", gap: 16, alignItems: "center", margin: "16px 0" }}>
        <img
          src={avatarUrl}
          alt="avatar"
          style={{ width: 84, height: 84, borderRadius: 999, objectFit: "cover" }}
        />
        <div>
          <input ref={fileRef} type="file" accept="image/*" />
          <div style={{ marginTop: 8 }}>
            <button onClick={uploadAvatar} disabled={uploading}>
              {uploading ? "Uploading..." : "Upload avatar"}
            </button>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label>Username</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{ width: "100%", padding: 10, marginTop: 6 }}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label>Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          style={{ width: "100%", padding: 10, marginTop: 6 }}
        />
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => navigate("/me")}>Cancel</button>
        <button onClick={saveProfile} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
