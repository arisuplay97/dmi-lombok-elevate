import { useRef, useState } from "react";
import { FileAudio, Upload, X } from "lucide-react";
import { usePdamStore } from "@/lib/pdam-store";

export function UploadAudioModal() {
  const { uploadModalOpen, setUploadModalOpen, uploadAudioNotulen } =
    usePdamStore();

  const [judul, setJudul] = useState("");
  const [fileName, setFileName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [durasiMenit, setDurasiMenit] = useState(60);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!uploadModalOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setFileName(file.name);
    if (!judul.trim()) {
      const cleanName = file.name
        .replace(/\.[^.]+$/, "")
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
      setJudul(cleanName);
    }
    const approxMin = Math.max(
      15,
      Math.min(180, Math.round(file.size / (1024 * 1024) * 1.4) || 55)
    );
    setDurasiMenit(approxMin);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalJudul = judul.trim() || "Rapat Koordinasi Operasional PDAM";
    const finalFile = fileName || "rekaman-rapat-pdam.m4a";
    uploadAudioNotulen({
      judul: finalJudul,
      fileName: finalFile,
      durasiMenit: Number(durasiMenit) || 60,
      file: selectedFile || undefined,
    });
    setJudul("");
    setFileName("");
    setSelectedFile(null);
    setDurasiMenit(60);
    setUploadModalOpen(false);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(20, 23, 31, 0.55)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={() => setUploadModalOpen(false)}
    >
      <div
        className="c"
        style={{
          width: "100%",
          maxWidth: 500,
          boxShadow: "0 24px 60px rgba(20,23,31,0.25)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>
              Unggah Rekaman Audio Rapat
            </div>
            <div style={{ fontSize: 12, color: "#4A505C", marginTop: 2 }}>
              Format MP3, M4A, atau WAV · Transkrip & notulen diproses otomatis
            </div>
          </div>
          <button
            type="button"
            className="pill"
            style={{ width: 36, height: 36, padding: 0 }}
            onClick={() => setUploadModalOpen(false)}
            aria-label="Tutup"
          >
            <X size={16} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            marginTop: 18,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: "2px dashed #C4C7CE",
              borderRadius: 18,
              padding: "24px 16px",
              textAlign: "center",
              background: "#F7F7F8",
              cursor: "pointer",
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp3,.m4a,.wav,audio/*"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: "#6B7BFF",
                color: "#fff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 8,
              }}
            >
              <FileAudio size={22} />
            </div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>
              {fileName ? fileName : "Klik untuk pilih file rekaman rapat"}
            </div>
            <div style={{ fontSize: 12, color: "#4A505C", marginTop: 4 }}>
              Maksimal 200 MB (MP3 / M4A / WAV) — atau langsung klik Proses untuk
              simulasi
            </div>
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 5,
              }}
            >
              Judul Rapat
            </label>
            <input
              value={judul}
              onChange={(e) => setJudul(e.target.value)}
              placeholder="Contoh: Rapat Koordinasi Distribusi Air Wilayah Selatan"
              required
              style={{
                width: "100%",
                padding: "11px 14px",
                borderRadius: 12,
                border: "1px solid #D5D8DD",
                fontSize: 14,
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 5,
              }}
            >
              Estimasi Durasi Rekaman (menit)
            </label>
            <input
              type="number"
              min={5}
              max={360}
              value={durasiMenit}
              onChange={(e) => setDurasiMenit(Number(e.target.value))}
              style={{
                width: "100%",
                padding: "11px 14px",
                borderRadius: 12,
                border: "1px solid #D5D8DD",
                fontSize: 14,
                boxSizing: "border-box",
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              marginTop: 4,
            }}
          >
            <button
              type="button"
              className="pill"
              onClick={() => setUploadModalOpen(false)}
            >
              Batal
            </button>
            <button
              type="submit"
              className="pill"
              style={{ background: "#14171F", color: "#fff" }}
            >
              <Upload size={15} /> Unggah & Proses AI
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
