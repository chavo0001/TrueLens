import React, { useState } from "react";
import "../styles/ProfileSection.css";

const ProfileSection = () => {
  const [profileData, setProfileData] = useState({
    username: "matteo92",
    email: "matteo@example.com",
    avatar: null,
  });

  const [editFields, setEditFields] = useState({
    username: false,
    email: false,
    avatar: false,
  });

  const [tempData, setTempData] = useState({
    username: profileData.username,
    email: profileData.email,
    avatarFile: null,
    avatarPreview: profileData.avatar,
  });

  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  const enableEdit = (field) => {
    setEditFields((prev) => ({ ...prev, [field]: true }));
    if (field === "avatar") {
      setTempData((prev) => ({ ...prev, avatarPreview: profileData.avatar }));
    }
  };

  const cancelEdit = (field) => {
    setEditFields((prev) => ({ ...prev, [field]: false }));
    if (field === "username" || field === "email") {
      setTempData((prev) => ({
        ...prev,
        [field]: profileData[field],
      }));
    }
    if (field === "avatar") {
      setTempData((prev) => ({
        ...prev,
        avatarFile: null,
        avatarPreview: profileData.avatar,
      }));
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setTempData((prev) => ({
        ...prev,
        avatarFile: file,
        avatarPreview: previewUrl,
      }));
    }
  };

  const saveField = (field) => {
    if (field === "avatar") {
      setProfileData((prev) => ({
        ...prev,
        avatar: tempData.avatarPreview,
      }));
      setEditFields((prev) => ({ ...prev, avatar: false }));
      setTempData((prev) => ({ ...prev, avatarFile: null }));
      return;
    }
    setProfileData((prev) => ({
      ...prev,
      [field]: tempData[field],
    }));
    setEditFields((prev) => ({ ...prev, [field]: false }));
  };

  const openAvatarModal = () => {
    if (profileData.avatar) setIsAvatarModalOpen(true);
  };

  const closeAvatarModal = () => {
    setIsAvatarModalOpen(false);
  };

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div
          className="profile-avatar"
          style={{
            backgroundImage: `url(${tempData.avatarPreview || "https://via.placeholder.com/140?text=Avatar"})`,
            cursor: profileData.avatar ? "pointer" : "default",
          }}
          onClick={openAvatarModal}
        />
        <div>
          <div className="profile-username">{profileData.username}</div>
        </div>
      </div>

      {/* Modifica Avatar */}
      <div className="field-group avatar-edit-block">
        {!editFields.avatar ? (
          <button className="button-edit" onClick={() => enableEdit("avatar")}>
            Modifica foto profilo
          </button>
        ) : (
          <div className="field-control" style={{ flexDirection: "column", alignItems: "flex-start" }}>
            <input
              type="file"
              accept="image/*"
              className="field-file-input"
              onChange={handleAvatarChange}
            />
            <div style={{ marginTop: 8 }}>
              <button className="button-save" onClick={() => saveField("avatar")}>
                Salva
              </button>
              <button className="button-cancel" onClick={() => cancelEdit("avatar")}>
                Annulla
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Username */}
      <div className="field-group">
        <label className="field-label">Username</label>
        <div className="field-control">
          <input
            type="text"
            className="field-input"
            disabled={!editFields.username}
            value={tempData.username}
            onChange={(e) =>
              setTempData((prev) => ({ ...prev, username: e.target.value }))
            }
          />
          {!editFields.username ? (
            <button className="button-edit" onClick={() => enableEdit("username")}>
              Modifica
            </button>
          ) : (
            <>
              <button className="button-save" onClick={() => saveField("username")}>
                Salva
              </button>
              <button className="button-cancel" onClick={() => cancelEdit("username")}>
                Annulla
              </button>
            </>
          )}
        </div>
      </div>

      {/* Email */}
      <div className="field-group">
        <label className="field-label">Email</label>
        <div className="field-control">
          <input
            type="email"
            className="field-input"
            disabled={!editFields.email}
            value={tempData.email}
            onChange={(e) =>
              setTempData((prev) => ({ ...prev, email: e.target.value }))
            }
          />
          {!editFields.email ? (
            <button className="button-edit" onClick={() => enableEdit("email")}>
              Modifica
            </button>
          ) : (
            <>
              <button className="button-save" onClick={() => saveField("email")}>
                Salva
              </button>
              <button className="button-cancel" onClick={() => cancelEdit("email")}>
                Annulla
              </button>
            </>
          )}
        </div>
      </div>

      {/* Modal per immagine ingrandita */}
      {isAvatarModalOpen && (
        <div className="avatar-modal-overlay" onClick={closeAvatarModal}>
          <div className="avatar-modal-content" onClick={(e) => e.stopPropagation()}>
            <img
              src={profileData.avatar}
              alt="Avatar ingrandito"
              className="avatar-modal-image"
            />
            <button className="avatar-modal-close" onClick={closeAvatarModal}>
              Chiudi
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileSection;
