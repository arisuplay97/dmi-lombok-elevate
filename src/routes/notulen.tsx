import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Camera,
  Check,
  CheckCircle2,
  Download,
  Edit3,
  FilePlus2,
  FileText,
  Lock,
  MapPin,
  Pause,
  Play,
  Printer,
  Search,
  Send,
  Square,
  Trash2,
  Upload,
  Users,
  Volume2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { compressImageFile } from "@/lib/ai-service";
import { usePdamStore } from "@/lib/pdam-store";
import type { NotulenItem, NotulenPhoto, StatusNotulen, TugasItem } from "@/lib/types";

export const Route = createFileRoute("/notulen")({
  component: NotulenPage,
});

function StatusPill({ status }: { status: StatusNotulen }) {
  if (status === "selesai") {
    return (
      <span
        style={{
          fontSize: 12,
          background: "#A6F23A",
          color: "#14171F",
          borderRadius: 999,
          padding: "5px 12px",
          fontWeight: 600,
          whiteSpace: "nowrap",
        }}
      >
        Selesai
      </span>
    );
  }
  if (status === "diperiksa") {
    return (
      <span
        style={{
          fontSize: 12,
          background: "#E4E7FF",
          color: "#2F3DB5",
          borderRadius: 999,
          padding: "5px 12px",
          fontWeight: 600,
          whiteSpace: "nowrap",
        }}
      >
        Diperiksa
      </span>
    );
  }
  return (
    <span
      className="h"
      style={{
        fontSize: 12,
        borderRadius: 999,
        padding: "5px 12px",
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      Diproses
    </span>
  );
}

function exportWordDoc(item: NotulenItem, relatedTasks: TugasItem[]) {
  const photosHtml =
    item.dokumentasiFoto && item.dokumentasiFoto.length > 0
      ? `<h4>4. Dokumentasi Foto Rapat</h4>` +
        item.dokumentasiFoto
          .map(
            (p) =>
              `<div style="margin-bottom:14px;"><img src="${p.url}" width="440" style="max-width:440px;border-radius:8px;"/><br/><i>${p.caption}</i></div>`
          )
          .join("")
      : "";

  const tasksHtml =
    relatedTasks.length > 0
      ? `<h4>3. Daftar Tugas & Tindak Lanjut</h4><ul>` +
        relatedTasks
          .map(
            (t) =>
              `<li><b>${t.judul}</b> — PIC: ${t.pj} | Tenggat: ${t.tenggat} (${
                t.selesai ? "Selesai" : "Berjalan"
              })</li>`
          )
          .join("") +
        `</ul>`
      : "";

  const html = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>Notulen - ${item.judul}</title></head>
    <body style="font-family: Arial, sans-serif; line-height: 1.55;">
      <h2>PERUMDAM TIRTA ARDHIA RINJANI</h2>
      <h3>NOTULEN RAPAT: ${item.judul}</h3>
      <p>
        <b>Tanggal:</b> ${item.tanggal} ${item.jam ? `(${item.jam})` : ""} &nbsp;|&nbsp;
        <b>Lokasi:</b> ${item.lokasi || "Ruang Rapat"} &nbsp;|&nbsp;
        <b>Durasi:</b> ${item.durasi} &nbsp;|&nbsp;
        <b>Status:</b> ${item.status.toUpperCase()}
      </p>
      <hr/>
      <h4>1. Ringkasan Eksekutif</h4>
      <p>${item.ringkasan}</p>
      <h4>2. Poin-poin Keputusan</h4>
      <ol>${item.keputusan.map((k) => `<li>${k}</li>`).join("")}</ol>
      ${tasksHtml}
      ${photosHtml}
      <h4>Catatan / Transkrip Rekaman</h4>
      <pre style="white-space: pre-wrap; font-family: Arial, sans-serif;">${item.transkrip}</pre>
    </body></html>
  `;
  const blob = new Blob(["\ufeff", html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Notulen-${item.judul.replace(/\s+/g, "-")}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}

function NotulenPage() {
  const {
    notulenList,
    tugasList,
    selectedNotulenId,
    setSelectedNotulenId,
    focusedNotulenId,
    isSpeaking,
    isSpeechPaused,
    readNotulenAloud,
    pauseOrResumeSpeech,
    stopTiaraSpeakingOnly,
    setUploadModalOpen,
    openCreateNotulenManual,
    updateNotulen,
    addPhotosToNotulen,
    removePhotoFromNotulen,
    approveAndLockNotulen,
    deleteNotulenAudio,
    requestDeleteNotulen,
    sendNotulenSummaryToWa,
    toggleTugas,
  } = usePdamStore();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"semua" | StatusNotulen>(
    "semua"
  );
  const [editMode, setEditMode] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<NotulenPhoto | null>(null);

  const [draftRingkasan, setDraftRingkasan] = useState("");
  const [draftKeputusan, setDraftKeputusan] = useState("");
  const [draftTranskrip, setDraftTranskrip] = useState("");

  const addPhotoInputRef = useRef<HTMLInputElement | null>(null);

  const filtered = notulenList.filter((n) => {
    if (statusFilter !== "semua" && n.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      n.judul.toLowerCase().includes(q) ||
      n.ringkasan.toLowerCase().includes(q) ||
      n.keputusan.join(" ").toLowerCase().includes(q) ||
      n.transkrip.toLowerCase().includes(q) ||
      n.tanggal.toLowerCase().includes(q)
    );
  });

  const activeItem =
    notulenList.find((n) => n.id === selectedNotulenId) ||
    filtered[0] ||
    notulenList[0];

  const relatedTasks = activeItem
    ? tugasList.filter((t) => t.notulenId === activeItem.id)
    : [];
  const completedRelatedCount = relatedTasks.filter((t) => t.selesai).length;
  const relatedProgressPct =
    relatedTasks.length > 0
      ? Math.round((completedRelatedCount / relatedTasks.length) * 100)
      : 0;

  const startEditing = (item: NotulenItem) => {
    setDraftRingkasan(item.ringkasan);
    setDraftKeputusan(item.keputusan.join("\n"));
    setDraftTranskrip(item.transkrip);
    setEditMode(true);
  };

  const saveEditing = () => {
    if (!activeItem) return;
    const parsedKeputusan = draftKeputusan
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    updateNotulen(activeItem.id, {
      ringkasan: draftRingkasan,
      keputusan: parsedKeputusan,
      transkrip: draftTranskrip,
    });
    setEditMode(false);
  };

  const handleAttachMorePhotos = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!activeItem) return;
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    try {
      const uploaded: NotulenPhoto[] = [];
      for (const f of files) {
        uploaded.push(await compressImageFile(f));
      }
      addPhotosToNotulen(activeItem.id, uploaded);
    } catch {
      toast.error("Gagal mengunggah foto dokumentasi.");
    } finally {
      e.target.value = "";
    }
  };

  return (
    <div style={{ marginTop: 28 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 36, fontWeight: 600 }}>
            Notulen Rapat & Dokumentasi
          </h1>
          <div style={{ fontSize: 14, color: "#4A505C", marginTop: 4 }}>
            Pencarian suara kontekstual, pembacaan ringkasan & poin keputusan,
            input form manual, serta dokumentasi foto rapat
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="pill"
            style={{ background: "#6B7BFF", color: "#fff" }}
            onClick={() => openCreateNotulenManual(null)}
          >
            <FilePlus2 size={16} /> Buat Notulen Manual + Foto
          </button>
          <button
            type="button"
            className="pill"
            style={{ background: "#14171F", color: "#fff" }}
            onClick={() => setUploadModalOpen(true)}
          >
            <Upload size={16} /> Unggah Audio Rapat
          </button>
        </div>
      </div>

      {/* Pencarian & Filter */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "#fff",
            borderRadius: 999,
            padding: "9px 16px",
            flex: "1 1 280px",
            maxWidth: 440,
          }}
        >
          <Search size={16} color="#4A505C" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari judul rapat, poin keputusan, bulan, atau tanggal..."
            style={{
              border: 0,
              outline: "none",
              width: "100%",
              fontSize: 13,
              background: "transparent",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {(["semua", "selesai", "diperiksa", "diproses"] as const).map(
            (st) => (
              <button
                key={st}
                type="button"
                className="pill"
                style={{
                  padding: "8px 14px",
                  fontSize: 13,
                  background: statusFilter === st ? "#14171F" : "#fff",
                  color: statusFilter === st ? "#fff" : "#14171F",
                }}
                onClick={() => setStatusFilter(st)}
              >
                {st.charAt(0).toUpperCase() + st.slice(1)}
              </button>
            )
          )}
        </div>
      </div>

      {/* Layout Split: Daftar Kiri & Detail Notulen Kanan */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(280px, 1fr) minmax(0, 2.15fr)",
          gap: 16,
        }}
        className="notulen-grid"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((item) => {
            const isSelected = activeItem?.id === item.id;
            const isFocusedByVoice = focusedNotulenId === item.id;
            return (
              <div
                key={item.id}
                onClick={() => {
                  setSelectedNotulenId(item.id);
                  setEditMode(false);
                }}
                className="c"
                style={{
                  padding: 18,
                  cursor: "pointer",
                  border: isSelected
                    ? "2px solid #6B7BFF"
                    : "2px solid transparent",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 8,
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 15 }}>
                    {item.judul}
                  </div>
                  <StatusPill status={item.status} />
                </div>
                <div style={{ fontSize: 12, color: "#4A505C", marginTop: 6 }}>
                  {item.tanggal} · {item.durasi}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: 6,
                    fontSize: 12,
                    color: "#5B616E",
                  }}
                >
                  <span>{item.infoSingkat}</span>
                  {(item.dokumentasiFoto?.length ?? 0) > 0 && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "#6B7BFF",
                      }}
                    >
                      {item.dokumentasiFoto?.length} foto
                    </span>
                  )}
                </div>
                {isFocusedByVoice && (
                  <div
                    style={{
                      marginTop: 8,
                      display: "inline-block",
                      fontSize: 11,
                      fontWeight: 700,
                      background: "#14171F",
                      color: "#A6F23A",
                      borderRadius: 999,
                      padding: "3px 10px",
                    }}
                  >
                    Aktif di Percakapan Tiara
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {activeItem && (
          <div
            className="c"
            style={{ display: "flex", flexDirection: "column", gap: 18 }}
          >
            {/* Header Detail Notulen */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                flexWrap: "wrap",
                gap: 12,
                borderBottom: "1px solid #ECEDF0",
                paddingBottom: 16,
              }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
                    {activeItem.judul}
                  </h2>
                  <StatusPill status={activeItem.status} />
                  {activeItem.sumberInput === "manual" && (
                    <span
                      style={{
                        fontSize: 11,
                        background: "#F1F2F4",
                        color: "#4A505C",
                        borderRadius: 999,
                        padding: "4px 10px",
                        fontWeight: 600,
                      }}
                    >
                      Input Form Sekretariat
                    </span>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 14,
                    fontSize: 13,
                    color: "#4A505C",
                    marginTop: 8,
                  }}
                >
                  <span>
                    Tanggal: <b>{activeItem.tanggal}</b>{" "}
                    {activeItem.jam ? `(${activeItem.jam})` : ""}
                  </span>
                  {activeItem.lokasi && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <MapPin size={13} /> {activeItem.lokasi}
                    </span>
                  )}
                  {activeItem.peserta && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Users size={13} /> {activeItem.peserta} peserta
                    </span>
                  )}
                  <span>
                    Durasi: <b>{activeItem.durasi}</b>
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {!editMode && (
                  <button
                    type="button"
                    className="pill"
                    style={{ padding: "8px 14px", fontSize: 13 }}
                    onClick={() => startEditing(activeItem)}
                  >
                    <Edit3 size={15} /> Edit Sekretariat
                  </button>
                )}

                {activeItem.status === "diperiksa" && (
                  <button
                    type="button"
                    className="pill"
                    style={{
                      padding: "8px 14px",
                      fontSize: 13,
                      background: "#A6F23A",
                      fontWeight: 700,
                    }}
                    onClick={() => approveAndLockNotulen(activeItem.id)}
                  >
                    <Lock size={14} /> Kunci & Bagikan
                  </button>
                )}
                <button
                  type="button"
                  className="pill"
                  style={{
                    padding: "8px 14px",
                    fontSize: 13,
                    color: "#EF4444",
                    borderColor: "rgba(239, 68, 68, 0.4)",
                    background: "rgba(239, 68, 68, 0.08)",
                    fontWeight: 600,
                  }}
                  onClick={() => requestDeleteNotulen(activeItem.id)}
                  title="Hapus notulen permanen"
                >
                  <Trash2 size={14} /> Hapus Notulen
                </button>
              </div>
            </div>

            {/* Panel Kontrol Pembacaan Suara Lengkap (Ringkasan + Poin Keputusan + Tugas) */}
            <div
              style={{
                background: "#14171F",
                color: "#fff",
                borderRadius: 18,
                padding: "13px 16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <div style={{ fontSize: 13 }}>
                <b style={{ color: "#A6F23A" }}>Pembacaan Suara Tiara:</b>{" "}
                Ringkasan Eksekutif, Poin Keputusan & Daftar Tugas
              </div>

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="pill"
                  style={{
                    padding: "7px 13px",
                    fontSize: 12,
                    background: "#A6F23A",
                    color: "#14171F",
                    fontWeight: 700,
                  }}
                  onClick={() => readNotulenAloud(activeItem.id, "lengkap")}
                >
                  <Volume2 size={14} /> Bacakan Lengkap
                </button>
                <button
                  type="button"
                  className="pill"
                  style={{
                    padding: "7px 13px",
                    fontSize: 12,
                    background: "#232833",
                    color: "#fff",
                  }}
                  onClick={() => readNotulenAloud(activeItem.id, "keputusan")}
                >
                  Poin Keputusan Saja
                </button>
                <button
                  type="button"
                  className="pill"
                  style={{
                    padding: "7px 13px",
                    fontSize: 12,
                    background: "#232833",
                    color: "#fff",
                  }}
                  onClick={() => readNotulenAloud(activeItem.id, "tugas")}
                >
                  Tugas & Progres
                </button>

                {isSpeaking && (
                  <>
                    <button
                      type="button"
                      className="pill"
                      style={{
                        padding: "7px 12px",
                        fontSize: 12,
                        background: "#6B7BFF",
                        color: "#fff",
                      }}
                      onClick={pauseOrResumeSpeech}
                    >
                      {isSpeechPaused ? (
                        <Play size={13} />
                      ) : (
                        <Pause size={13} />
                      )}
                      {isSpeechPaused ? "Lanjut" : "Jeda"}
                    </button>
                    <button
                      type="button"
                      className="pill"
                      style={{
                        padding: "7px 12px",
                        fontSize: 12,
                        background: "#DC2626",
                        color: "#fff",
                      }}
                      onClick={stopTiaraSpeakingOnly}
                    >
                      <Square size={12} /> Stop
                    </button>
                  </>
                )}
              </div>
            </div>

            {editMode ? (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 14 }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      fontWeight: 700,
                      marginBottom: 4,
                    }}
                  >
                    Ringkasan Eksekutif
                  </label>
                  <textarea
                    rows={3}
                    value={draftRingkasan}
                    onChange={(e) => setDraftRingkasan(e.target.value)}
                    style={{
                      width: "100%",
                      padding: 12,
                      borderRadius: 12,
                      border: "1px solid #D5D8DD",
                      fontSize: 13,
                      fontFamily: "inherit",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      fontWeight: 700,
                      marginBottom: 4,
                    }}
                  >
                    Poin Keputusan (satu keputusan per baris)
                  </label>
                  <textarea
                    rows={4}
                    value={draftKeputusan}
                    onChange={(e) => setDraftKeputusan(e.target.value)}
                    style={{
                      width: "100%",
                      padding: 12,
                      borderRadius: 12,
                      border: "1px solid #D5D8DD",
                      fontSize: 13,
                      fontFamily: "inherit",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      fontWeight: 700,
                      marginBottom: 4,
                    }}
                  >
                    Transkrip / Catatan Pembahasan
                  </label>
                  <textarea
                    rows={6}
                    value={draftTranskrip}
                    onChange={(e) => setDraftTranskrip(e.target.value)}
                    style={{
                      width: "100%",
                      padding: 12,
                      borderRadius: 12,
                      border: "1px solid #D5D8DD",
                      fontSize: 13,
                      fontFamily: "inherit",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 8,
                  }}
                >
                  <button
                    type="button"
                    className="pill"
                    onClick={() => setEditMode(false)}
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    className="pill"
                    style={{ background: "#14171F", color: "#fff" }}
                    onClick={saveEditing}
                  >
                    Simpan Koreksi Notulen
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* 1. Ringkasan Eksekutif */}
                <div
                  style={{
                    background: "#F7F7F8",
                    borderRadius: 18,
                    padding: 16,
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#4A505C",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: 6,
                    }}
                  >
                    1. Ringkasan Eksekutif
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.6 }}>
                    {activeItem.ringkasan}
                  </div>
                </div>

                {/* 2. Poin-poin Keputusan */}
                <div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      marginBottom: 10,
                    }}
                  >
                    2. Poin-poin Keputusan Rapat ({activeItem.keputusan.length})
                  </div>
                  {activeItem.keputusan.length === 0 ? (
                    <div style={{ fontSize: 13, color: "#7A808C" }}>
                      Menunggu ekstraksi poin keputusan selesai diproses...
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      {activeItem.keputusan.map((kep, i) => (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            gap: 10,
                            alignItems: "flex-start",
                            fontSize: 14,
                            background: "#F7F7F8",
                            padding: "10px 14px",
                            borderRadius: 14,
                          }}
                        >
                          <CheckCircle2
                            size={17}
                            color="#6B7BFF"
                            style={{ flexShrink: 0, marginTop: 2 }}
                          />
                          <span>
                            <b>Poin {i + 1}:</b> {kep}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Laporan Status Tindak Lanjut Langsung di Dalam Notulen */}
                {relatedTasks.length > 0 && (
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
                        marginBottom: 8,
                      }}
                    >
                      <span style={{ fontSize: 15, fontWeight: 700 }}>
                        3. Progres Tindak Lanjut Rapat Ini
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          background: "#E4E7FF",
                          color: "#2F3DB5",
                          padding: "3px 10px",
                          borderRadius: 999,
                        }}
                      >
                        {completedRelatedCount}/{relatedTasks.length} Selesai (
                        {relatedProgressPct}%)
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        height: 10,
                        borderRadius: 6,
                        overflow: "hidden",
                        marginBottom: 12,
                      }}
                    >
                      <i
                        style={{
                          display: "inline-block",
                          width: `${relatedProgressPct}%`,
                          background: "#A6F23A",
                        }}
                      />
                      <i
                        className="h"
                        style={{ display: "inline-block", flex: 1 }}
                      />
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      {relatedTasks.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => toggleTugas(t.id)}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            background: "#F7F7F8",
                            borderRadius: 12,
                            padding: "10px 14px",
                            fontSize: 13,
                            cursor: "pointer",
                            gap: 10,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                            }}
                          >
                            <span
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: 6,
                                border: t.selesai
                                  ? "none"
                                  : "2px solid #C4C7CE",
                                background: t.selesai ? "#6B7BFF" : "#fff",
                                color: "#fff",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              {t.selesai && <Check size={13} />}
                            </span>
                            <span
                              style={{
                                textDecoration: t.selesai
                                  ? "line-through"
                                  : "none",
                                color: t.selesai ? "#7A808C" : "#14171F",
                              }}
                            >
                              <b>{t.judul}</b> · {t.pj}
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              background: t.selesai
                                ? "#fff"
                                : t.segera
                                  ? "#A6F23A"
                                  : "#fff",
                              padding: "3px 10px",
                              borderRadius: 999,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {t.tenggat}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Galeri Dokumentasi Foto Rapat */}
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 10,
                    }}
                  >
                    <span style={{ fontSize: 15, fontWeight: 700 }}>
                      4. Dokumentasi Foto Rapat (
                      {activeItem.dokumentasiFoto?.length ?? 0})
                    </span>
                    <div>
                      <input
                        ref={addPhotoInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleAttachMorePhotos}
                        style={{ display: "none" }}
                      />
                      <button
                        type="button"
                        className="pill"
                        style={{ padding: "7px 13px", fontSize: 12 }}
                        onClick={() => addPhotoInputRef.current?.click()}
                      >
                        <Camera size={14} /> Tambah Foto Dokumentasi
                      </button>
                    </div>
                  </div>

                  {!activeItem.dokumentasiFoto ||
                  activeItem.dokumentasiFoto.length === 0 ? (
                    <div
                      onClick={() => addPhotoInputRef.current?.click()}
                      style={{
                        border: "1px dashed #C4C7CE",
                        borderRadius: 16,
                        padding: "18px 16px",
                        textAlign: "center",
                        fontSize: 13,
                        color: "#5B616E",
                        background: "#F7F7F8",
                        cursor: "pointer",
                      }}
                    >
                      Belum ada foto dokumentasi pada rapat ini. Klik untuk
                      mengunggah foto kegiatan rapat atau daftar hadir.
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fill, minmax(200px, 1fr))",
                        gap: 12,
                      }}
                    >
                      {activeItem.dokumentasiFoto.map((photo) => (
                        <div
                          key={photo.id}
                          style={{
                            background: "#F7F7F8",
                            borderRadius: 16,
                            padding: 8,
                            position: "relative",
                          }}
                        >
                          <img
                            src={photo.url}
                            alt={photo.caption}
                            onClick={() => setLightboxPhoto(photo)}
                            style={{
                              width: "100%",
                              height: 130,
                              objectFit: "cover",
                              borderRadius: 12,
                              cursor: "zoom-in",
                              display: "block",
                            }}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              removePhotoFromNotulen(activeItem.id, photo.id)
                            }
                            title="Hapus foto"
                            style={{
                              position: "absolute",
                              top: 14,
                              right: 14,
                              width: 26,
                              height: 26,
                              borderRadius: "50%",
                              border: 0,
                              background: "rgba(20,23,31,0.75)",
                              color: "#fff",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <X size={13} />
                          </button>
                          <div
                            style={{
                              fontSize: 12,
                              color: "#4A505C",
                              marginTop: 6,
                              padding: "0 4px",
                            }}
                          >
                            {photo.caption}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 5. Transkrip / Catatan */}
                <div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      marginBottom: 8,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <FileText size={16} /> Catatan / Transkrip Rekaman
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      background: "#14171F",
                      color: "#E3E5E9",
                      borderRadius: 16,
                      padding: 16,
                      fontSize: 13,
                      lineHeight: 1.65,
                      whiteSpace: "pre-wrap",
                      fontFamily: "inherit",
                    }}
                  >
                    {activeItem.transkrip}
                  </pre>
                </div>

                {/* Aksi Ekspor, Kirim WA, & Keamanan Audio */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 10,
                    borderTop: "1px solid #ECEDF0",
                    paddingTop: 14,
                  }}
                >
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="pill"
                      style={{ background: "#14171F", color: "#fff" }}
                      onClick={() => exportWordDoc(activeItem, relatedTasks)}
                    >
                      <Download size={15} /> Ekspor Word (.doc)
                    </button>
                    <button
                      type="button"
                      className="pill"
                      onClick={() => window.print()}
                    >
                      <Printer size={15} /> Cetak / PDF
                    </button>
                    <button
                      type="button"
                      className="pill"
                      style={{ background: "#6B7BFF", color: "#fff" }}
                      onClick={() => sendNotulenSummaryToWa(activeItem.id)}
                    >
                      <Send size={14} /> Kirim Ringkasan ke WA
                    </button>
                  </div>

                  {!activeItem.audioDihapus && activeItem.audioFileName && (
                    <button
                      type="button"
                      className="pill"
                      style={{ color: "#DC2626", fontSize: 12 }}
                      onClick={() => deleteNotulenAudio(activeItem.id)}
                    >
                      <Trash2 size={14} /> Hapus File Audio Asli
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Lightbox Preview Foto Dokumentasi */}
      {lightboxPhoto && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 95,
            background: "rgba(20, 23, 31, 0.85)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
          onClick={() => setLightboxPhoto(null)}
        >
          <img
            src={lightboxPhoto.url}
            alt={lightboxPhoto.caption}
            style={{
              maxWidth: "90vw",
              maxHeight: "78vh",
              borderRadius: 18,
              objectFit: "contain",
            }}
          />
          <div style={{ color: "#fff", marginTop: 12, fontSize: 14 }}>
            {lightboxPhoto.caption}
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 900px) {
          .notulen-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
