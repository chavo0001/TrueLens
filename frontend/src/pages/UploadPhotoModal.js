import { useEffect, useRef, useState } from "react";
import "../styles/UploadPhotoModal.css";

const UploadPhotoModal = ({ open, onClose, onUploaded, multiple = true }) => {
  const fileInputRef = useRef(null);

  const [files, setFiles] = useState([]);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  // Chiudi con ESC
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, uploading]);

  // Reset quando apri
  useEffect(() => {
    if (!open) return;
    setError(null);
  }, [open]);

  const handleClose = () => {
    if (uploading) return; // evita chiusura durante upload
    setError(null);
    setFiles([]);
    setCaption("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    onClose?.();
  };

  const handleOverlayClick = (e) => {
    // se clicchi fuori dal box, chiudi
    if (e.target.classList.contains("tl-modal-overlay")) {
      handleClose();
    }
  };

  const handleChooseFiles = () => {
    if (uploading) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const picked = Array.from(e.target.files || []);
    setFiles(picked);
  };

  const handleSubmit = async () => {
    if (!files.length) {
      setError("Select at least one photo");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();

      // Il backend accetta "photos" (e anche "photo" ma noi standardizziamo)
      files.forEach((file) => formData.append("photos", file));

      if (caption.trim()) {
        formData.append("caption", caption.trim());
      }

      const res = await fetch("http://localhost:5001/api/me/photos", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Upload failed");
      }

      onUploaded?.();
      handleClose();
    } catch (err) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="tl-modal-overlay" onMouseDown={handleOverlayClick}>
      <div className="tl-modal" role="dialog" aria-modal="true">
        <div className="tl-modal-header">
          <h3 className="tl-modal-title">Add photos</h3>

          <button
            className="tl-modal-close"
            onClick={handleClose}
            disabled={uploading}
            aria-label="Close"
            type="button"
          >
            ✕
          </button>
        </div>

        <div className="tl-modal-body">
          <div className="tl-field">
            <div className="tl-label">Photos</div>

            <div className="tl-filebox">
              <div className="tl-filebox-left">
                <div className="tl-filebox-title">
                  {files.length
                    ? `${files.length} file${files.length > 1 ? "s" : ""} selected`
                    : "Choose images to upload"}
                </div>

                <div className="tl-filebox-sub">
                  {files.length
                    ? files.length === 1
                      ? files[0].name
                      : `${files[0].name} + ${files.length - 1} more`
                    : multiple
                    ? "You can select multiple images"
                    : "Select one image"}
                </div>
              </div>

              <button
                type="button"
                className="tl-file-btn"
                onClick={handleChooseFiles}
                disabled={uploading}
              >
                Choose files
              </button>

              <input
                ref={fileInputRef}
                className="tl-hidden-input"
                type="file"
                accept="image/*"
                multiple={multiple}
                onChange={handleFileChange}
              />
            </div>

            <div className="tl-help">
              Tip: HEIC might be rejected by the browser/OS — export to JPG if needed.
            </div>
          </div>

          <div className="tl-field">
            <div className="tl-label">Caption (optional)</div>
            <textarea
              className="tl-textarea"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption…"
              rows={3}
              disabled={uploading}
            />
          </div>

          {error && <div className="tl-error">{error}</div>}
        </div>

        <div className="tl-modal-footer">
          <button
            type="button"
            className="tl-btn tl-btn-secondary"
            onClick={handleClose}
            disabled={uploading}
          >
            Cancel
          </button>

          <button
            type="button"
            className="tl-btn tl-btn-primary"
            onClick={handleSubmit}
            disabled={uploading || files.length === 0}
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadPhotoModal;
