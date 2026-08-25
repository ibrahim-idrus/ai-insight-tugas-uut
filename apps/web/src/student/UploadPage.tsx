import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiUrl } from "../auth/api";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

export default function UploadPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.size > MAX_SIZE) {
      setError("File exceeds 5MB limit");
      return;
    }
    if (!ALLOWED_TYPES.includes(selected.type)) {
      setError("File type not allowed. Allowed: images, PDF, Word, text");
      return;
    }

    setError(null);
    setFile(selected);

    if (selected.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(selected);
    } else {
      setPreview(null);
    }
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError(null);

    try {
      const fileContent = await readFileAsBase64(file);

      const res = await fetch(apiUrl(`/api/student/assignments/${id}/upload`), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileContent,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Upload failed");

      navigate(`/student/assignments/${id}/result`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="page-content">
      <button className="back-button" onClick={() => navigate(`/student/assignments/${id}`)} type="button">
        ← Back to Assignment
      </button>

      <div className="upload-container">
        <div className="page-heading">
          <div>
            <span className="eyebrow">Assignment / Upload</span>
            <h1>Upload Submission</h1>
            <p>Upload your file for this assignment</p>
          </div>
        </div>

        <div className="upload-zone">
          {!file ? (
            <label className="upload-label">
              <input
                type="file"
                accept={ALLOWED_TYPES.join(",")}
                onChange={handleFileChange}
                className="upload-input"
              />
              <div className="upload-placeholder">
                <span className="upload-icon">📁</span>
                <p>Click to select a file</p>
                <p className="upload-hint">Max 5MB. Images, PDF, Word, or text files.</p>
              </div>
            </label>
          ) : (
            <div className="upload-preview">
              {preview ? (
                <img src={preview} alt="Preview" className="upload-preview-image" />
              ) : (
                <div className="upload-preview-file">
                  <span>📄</span>
                  <p>{file.name}</p>
                </div>
              )}
              <div className="upload-preview-info">
                <p><strong>{file.name}</strong></p>
                <p>{formatFileSize(file.size)}</p>
                <button
                  className="upload-remove-btn"
                  onClick={() => { setFile(null); setPreview(null); }}
                  type="button"
                >
                  Remove
                </button>
              </div>
            </div>
          )}
        </div>

        {error && <p className="form-error">{error}</p>}

        <button
          className="primary-button"
          disabled={!file || uploading}
          onClick={() => void handleUpload()}
          type="button"
        >
          {uploading ? "Uploading..." : "Submit Upload"}
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data:mime;base64, prefix
      const base64 = result.split(",")[1] ?? result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
