import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Check,
  FileAudio,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { TODAY_ISO } from "@/data/pdam-data";
import { compressImageFile } from "@/lib/ai-service";
import { usePdamStore } from "@/lib/pdam-store";
import type { NotulenPhoto, StatusNotulen } from "@/lib/types";

const PIC_OPTIONS = [
  "Bagian Teknik",
  "Bagian Keuangan",
  "Hubungan Langganan",
  "Bagian Umum",
  "Sekretariat",
];

interface DraftTaskRow {
  judul: string;
  pj: string;
  tenggat: string;
  segera: boolean;
}

export function CreateNotulenModal() {
  const {
    createNotulenModalOpen,
    setCreateNotulenModalOpen,
    notulenPrefill,
    createManualNotulen,
  } = usePdamStore();

  const [judul, setJudul] = useState("");
  const [tanggalIso, setTanggalIso] = useState(TODAY_ISO);
  const [jam, setJam] = useState("09.00 – 10.30");
  const [lokasi, setLokasi] = useState("Ruang Rapat Utama");
  const [pimpinan, setPimpinan] = useState("Direktur Utama");
  const [peserta, setPeserta] = useState(8);
  const [durasiMenit, setDurasiMenit] = useState(90);
  const [status, setStatus] = useState<StatusNotulen>("selesai");
  const [ringkasan, setRingkasan] = useState("");
  const [keputusanList, setKeputusanList] = useState<string[]>([""]);
  const [tugasRows, setTugasRows] = useState<DraftTaskRow[]>([
    { judul: "", pj: "Bagian Teknik", tenggat: "10 Nov", segera: true },
  ]);
  const [transkrip, setTranskrip] = useState("");
  const [photos, setPhotos] = useState<NotulenPhoto[]>([]);
  const [audioFileName, setAudioFileName] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!createNotulenModalOpen) return;
    if (notulenPrefill) {
      setJudul(notulenPrefill.judul);
      setTanggalIso(notulenPrefill.tanggalIso || TODAY_ISO);
      setJam(notulenPrefill.jam || "09.00 – 10.30");
      setLokasi(notulenPrefill.lokasi || "Ruang Rapat Utama");
      setPeserta(notulenPrefill.peserta || 8);
      setRingkasan(notulenPrefill.catatanAwal || "");
    } else {
      setJudul("");
      setTanggalIso(TODAY_ISO);
      setJam("09.00 – 10.30");
      setLokasi("Ruang Rapat Utama");
      setPimpinan("Direktur Utama");
      setPeserta(8);
      setDurasiMenit(60);
      setStatus("selesai");
      setRingkasan("");
      setKeputusanList([""]);
      setTugasRows([
        { judul: "", pj: "Bagian Teknik", tenggat: "10 Nov", segera: true },
      ]);
      setTranskrip("");
      setPhotos([]);
      setAudioFileName("");
    }
  }, [createNotulenModalOpen, notulenPrefill]);

  if (!createNotulenModalOpen) return null;

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploadingPhoto(true);
    try {
      const processed: NotulenPhoto[] = [];
      for (const f of files) {
        const p = await compressImageFile(f);
        processed.push(p);
      }
      setPhotos((prev) => [...prev, ...processed]);
    } catch {
      toast.error("Gagal memproses salah satu foto dokumentasi.");
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  };

  const updatePhotoCaption = (id: string, caption: string) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, caption } : p))
    );
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!judul.trim() || !ringkasan.trim()) {
      toast.error("Mohon isi Judul Rapat dan Ringkasan Eksekutif.");
      return;
    }

    createManualNotulen({
      judul,
      tanggalIso,
      jam,
      lokasi,
      pimpinan,
      peserta,
      durasiMenit,
      status,
      ringkasan,
      keputusan: keputusanList,
      transkrip,
      dokumentasiFoto: photos,
      audioFileName: audioFileName || undefined,
      tugasBaru: tugasRows,
    });
    setCreateNotulenModalOpen(false);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 13px",
    borderRadius: 12,
    border: "1px solid #D5D8DD",
    fontSize: 13,
    boxSizing: "border-box",
    fontFamily: "inherit",
    background: "#fff",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 85,
        background: "rgba(20, 23, 31, 0.58)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={() => setCreateNotulenModalOpen(false)}
    >
      <div
        className="c"
        style={{
          width: "100%",
          maxWidth: 720,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 24px 64px rgba(20,23,31,0.3)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid #ECEDF0",
            paddingBottom: 14,
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: 19 }}>
              Input Notulen Rapat & Dokumentasi Foto
            </div>
            <div style={{ fontSize: 12, color: "#4A505C", marginTop: 2 }}>
              Formulir pencatatan hasil rapat, poin keputusan, tugas tindak
              lanjut, dan lampiran foto kegiatan
            </div>
          </div>
          <button
            type="button"
            className="pill"
            style={{ width: 36, height: 36, padding: 0 }}
            onClick={() => setCreateNotulenModalOpen(false)}
          >
            <X size={16} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            marginTop: 16,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {/* Informasi Utama seperti Form Agenda */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              Judul Rapat *
            </label>
            <input
              required
              value={judul}
              onChange={(e) => setJudul(e.target.value)}
              placeholder="Contoh: Rapat Koordinasi Distribusi Air Wilayah Praya"
              style={inputStyle}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.1fr 1fr 1.2fr",
              gap: 10,
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                Tanggal Rapat
              </label>
              <input
                type="date"
                value={tanggalIso}
                onChange={(e) => setTanggalIso(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                Jam Pelaksanaan
              </label>
              <input
                value={jam}
                onChange={(e) => setJam(e.target.value)}
                placeholder="09.00 – 10.30"
                style={inputStyle}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                Lokasi Rapat
              </label>
              <input
                value={lokasi}
                onChange={(e) => setLokasi(e.target.value)}
                placeholder="Ruang Rapat Utama"
                style={inputStyle}
              />
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.3fr 0.7fr 0.7fr 1fr",
              gap: 10,
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                Pimpinan Rapat
              </label>
              <input
                value={pimpinan}
                onChange={(e) => setPimpinan(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                Peserta
              </label>
              <input
                type="number"
                min={1}
                value={peserta}
                onChange={(e) => setPeserta(Number(e.target.value))}
                style={inputStyle}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                Durasi (mnt)
              </label>
              <input
                type="number"
                min={5}
                value={durasiMenit}
                onChange={(e) => setDurasiMenit(Number(e.target.value))}
                style={inputStyle}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                Status Notulen
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusNotulen)}
                style={inputStyle}
              >
                <option value="selesai">Selesai (Siap Dibaca)</option>
                <option value="diperiksa">Diperiksa Sekretariat</option>
              </select>
            </div>
          </div>

          {/* Ringkasan Eksekutif */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              Ringkasan Eksekutif *
            </label>
            <textarea
              required
              rows={3}
              value={ringkasan}
              onChange={(e) => setRingkasan(e.target.value)}
              placeholder="Tuliskan pokok bahasan utama dan kesimpulan umum rapat..."
              style={inputStyle}
            />
          </div>

          {/* Poin-poin Keputusan */}
          <div
            style={{
              background: "#F7F7F8",
              borderRadius: 16,
              padding: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700 }}>
                Poin-poin Keputusan Rapat
              </span>
              <button
                type="button"
                className="pill"
                style={{
                  padding: "5px 12px",
                  fontSize: 12,
                  background: "#fff",
                }}
                onClick={() => setKeputusanList((prev) => [...prev, ""])}
              >
                <Plus size={13} /> Tambah Poin
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {keputusanList.map((kep, idx) => (
                <div key={idx} style={{ display: "flex", gap: 8 }}>
                  <span
                    style={{
                      width: 26,
                      height: 36,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#6B7BFF",
                    }}
                  >
                    {idx + 1}.
                  </span>
                  <input
                    value={kep}
                    onChange={(e) =>
                      setKeputusanList((prev) =>
                        prev.map((v, i) => (i === idx ? e.target.value : v))
                      )
                    }
                    placeholder={`Poin keputusan ke-${idx + 1}...`}
                    style={inputStyle}
                  />
                  {keputusanList.length > 1 && (
                    <button
                      type="button"
                      className="pill"
                      style={{ padding: "0 10px", background: "#fff", color: "#DC2626" }}
                      onClick={() =>
                        setKeputusanList((prev) =>
                          prev.filter((_, i) => i !== idx)
                        )
                      }
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Daftar Tugas Tindak Lanjut */}
          <div
            style={{
              background: "#F7F7F8",
              borderRadius: 16,
              padding: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700 }}>
                Daftar Tugas / Action Items Rapat
              </span>
              <button
                type="button"
                className="pill"
                style={{
                  padding: "5px 12px",
                  fontSize: 12,
                  background: "#fff",
                }}
                onClick={() =>
                  setTugasRows((prev) => [
                    ...prev,
                    {
                      judul: "",
                      pj: "Bagian Teknik",
                      tenggat: "Minggu ini",
                      segera: false,
                    },
                  ])
                }
              >
                <Plus size={13} /> Tambah Tugas
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {tugasRows.map((row, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.6fr 1fr 0.8fr auto",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <input
                    value={row.judul}
                    onChange={(e) =>
                      setTugasRows((prev) =>
                        prev.map((r, i) =>
                          i === idx ? { ...r, judul: e.target.value } : r
                        )
                      )
                    }
                    placeholder="Uraian tindak lanjut..."
                    style={inputStyle}
                  />
                  <select
                    value={row.pj}
                    onChange={(e) =>
                      setTugasRows((prev) =>
                        prev.map((r, i) =>
                          i === idx ? { ...r, pj: e.target.value } : r
                        )
                      )
                    }
                    style={inputStyle}
                  >
                    {PIC_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                  <input
                    value={row.tenggat}
                    onChange={(e) =>
                      setTugasRows((prev) =>
                        prev.map((r, i) =>
                          i === idx ? { ...r, tenggat: e.target.value } : r
                        )
                      )
                    }
                    placeholder="Tenggat"
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    className="pill"
                    style={{
                      padding: "8px 10px",
                      background: "#fff",
                      color: "#DC2626",
                    }}
                    onClick={() =>
                      setTugasRows((prev) => prev.filter((_, i) => i !== idx))
                    }
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Upload Foto Dokumentasi Rapat & Rekaman Pendukung */}
          <div
            style={{
              border: "1px solid #E3E5E9",
              borderRadius: 18,
              padding: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>
                  Dokumentasi Foto Rapat & Lampiran
                </div>
                <div style={{ fontSize: 12, color: "#4A505C" }}>
                  Unggah foto suasana rapat, papan tulis, atau daftar hadir
                  (otomatis tampil di detail & dokumen Word/PDF)
                </div>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoSelect}
                  style={{ display: "none" }}
                />
                <button
                  type="button"
                  className="pill"
                  style={{ background: "#6B7BFF", color: "#fff" }}
                  onClick={() => photoInputRef.current?.click()}
                >
                  <Camera size={15} />
                  {uploadingPhoto ? "Memproses..." : "Upload Foto Rapat"}
                </button>

                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/*,.mp3,.m4a,.wav"
                  onChange={(e) =>
                    setAudioFileName(e.target.files?.[0]?.name || "")
                  }
                  style={{ display: "none" }}
                />
                <button
                  type="button"
                  className="pill"
                  onClick={() => audioInputRef.current?.click()}
                >
                  <FileAudio size={15} />
                  {audioFileName ? audioFileName.slice(0, 16) : "Lampirkan Audio"}
                </button>
              </div>
            </div>

            {photos.length > 0 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                  gap: 12,
                  marginTop: 14,
                }}
              >
                {photos.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      background: "#F7F7F8",
                      borderRadius: 14,
                      padding: 8,
                      position: "relative",
                    }}
                  >
                    <img
                      src={p.url}
                      alt={p.caption}
                      style={{
                        width: "100%",
                        height: 110,
                        objectFit: "cover",
                        borderRadius: 10,
                        display: "block",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(p.id)}
                      style={{
                        position: "absolute",
                        top: 14,
                        right: 14,
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        border: 0,
                        background: "rgba(20,23,31,0.78)",
                        color: "#fff",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <X size={13} />
                    </button>
                    <input
                      value={p.caption}
                      onChange={(e) => updatePhotoCaption(p.id, e.target.value)}
                      placeholder="Keterangan foto..."
                      style={{
                        width: "100%",
                        marginTop: 6,
                        border: "1px solid #D5D8DD",
                        borderRadius: 8,
                        padding: "5px 8px",
                        fontSize: 11,
                        boxSizing: "border-box",
                        background: "#fff",
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Catatan / Transkrip */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              Catatan Jalannya Rapat / Transkrip (Opsional)
            </label>
            <textarea
              rows={3}
              value={transkrip}
              onChange={(e) => setTranskrip(e.target.value)}
              placeholder="Uraian lengkap jalannya diskusi rapat..."
              style={inputStyle}
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              borderTop: "1px solid #ECEDF0",
              paddingTop: 14,
            }}
          >
            <button
              type="button"
              className="pill"
              onClick={() => setCreateNotulenModalOpen(false)}
            >
              Batal
            </button>
            <button
              type="submit"
              className="pill"
              style={{ background: "#A6F23A", color: "#14171F", fontWeight: 700 }}
            >
              <Check size={16} /> Simpan Notulen & Dokumentasi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
