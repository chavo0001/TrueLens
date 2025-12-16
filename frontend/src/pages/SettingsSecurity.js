import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/apiFetch";

export default function SettingsSecurity() {
  const navigate = useNavigate();

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await apiFetch("/api/me");
      if (!res.ok) navigate("/login");
    })();
  }, [navigate]);

  const changePassword = async () => {
    if (newPassword !== newPassword2) return alert("Le nuove password non coincidono");
    setSaving(true);

    try {
      const res = await apiFetch("/api/me/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Update failed");

      alert("Password aggiornata ✅");
      navigate("/me");
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 560, margin: "0 auto" }}>
      <h2>Security</h2>

      <div style={{ marginBottom: 12 }}>
        <label>Old password</label>
        <input
          type="password"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
          style={{ width: "100%", padding: 10, marginTop: 6 }}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label>New password</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          style={{ width: "100%", padding: 10, marginTop: 6 }}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label>Confirm new password</label>
        <input
          type="password"
          value={newPassword2}
          onChange={(e) => setNewPassword2(e.target.value)}
          style={{ width: "100%", padding: 10, marginTop: 6 }}
        />
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => navigate("/me")}>Cancel</button>
        <button onClick={changePassword} disabled={saving}>
          {saving ? "Updating..." : "Update password"}
        </button>
      </div>
    </div>
  );
}
