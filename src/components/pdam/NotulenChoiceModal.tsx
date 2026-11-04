import { useEffect } from "react";
import {
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  MapPin,
  Mic,
  Square,
  Volume2,
  X,
} from "lucide-react";
import { usePdamStore } from "@/lib/pdam-store";

export function NotulenChoiceModal() {
  const {
    candidateNotulens,
    candidateQueryLabel,
    candidateMatchReasons,
    dismissCandidateNotulens,
    selectDisambiguatedNotulen,
    isSpeaking,
    isListening,
    assistantEnabled,
    stopTiaraSpeakingOnly,
    settings,
  } = usePdamStore();

  useEffect(() => {
    if (candidateNotulens.length <= 1) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        dismissCandidateNotulens();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [candidateNotulens.length, dismissCandidateNotulens]);

  if (candidateNotulens.length <= 1) return null;

  const isDark = settings.darkMode;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 85,
        background: "rgba(10, 13, 20, 0.62)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={dismissCandidateNotulens}
    >
      <div
        className="c"
        style={{
          width: "100%",
          maxWidth: 640,
          maxHeight: "88vh",
          overflowY: "auto",
          padding: 24,
          background: isDark ? "#131722" : "#FFFFFF",
          color: isDark ? "#F1F5F9" : "#14171F",
          border: isDark ? "1px solid #262E42" : "1px solid #E4E7EC",
          boxShadow: "0 28px 70px rgba(8, 11, 18, 0.42)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              style={{
                width: 42,
                height: 42,
                borderRadius: 13,
                background: "#6B7BFF",
                color: "#FFFFFF",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <FileText size={20} />
            </span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 18, lineHeight: 1.25 }}>
                Pilih Notulen yang Berkaitan ({candidateNotulens.length} Hasil)
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  color: isDark ? "#94A3B8" : "#4A505C",
                  marginTop: 3,
                }}
              >
                Pencarian: <b>{candidateQueryLabel || "Notulen terkait"}</b> ·
                Klik pilihan atau ucapkan nomor urutnya
              </div>
            </div>
          </div>

          <button
            type="button"
            className="pill"
            style={{
              width: 36,
              height: 36,
              padding: 0,
              background: isDark ? "#1E2434" : "#F1F2F4",
              color: isDark ? "#E2E8F0" : "#14171F",
            }}
            onClick={dismissCandidateNotulens}
            aria-label="Tutup"
          >
            <X size={16} />
          </button>
        </div>

        {/* Bar Status Suara Real-time */}
        <div
          style={{
            background: "#14171F",
            color: "#FFFFFF",
            borderRadius: 14,
            padding: "10px 14px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
            border: isDark ? "1px solid #262E42" : "none",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              fontSize: 12.5,
            }}
          >
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: isSpeaking
                  ? "#A6F23A"
                  : assistantEnabled && isListening
                  ? "#34D399"
                  : "#6B7BFF",
              }}
            />
            <span>
              {isSpeaking ? (
                <>
                  <b style={{ color: "#A6F23A" }}>Tiara sedang membacakan opsi</b>{" "}
                  — Anda bisa langsung klik pilihan di bawah kapan saja.
                </>
              ) : (
                <>
                  <Mic
                    size={13}
                    style={{
                      display: "inline",
                      verticalAlign: "-2px",
                      marginRight: 5,
                      color: "#A6F23A",
                    }}
                  />
                  Ucapkan <b style={{ color: "#A6F23A" }}>“Pertama”</b>,{" "}
                  <b style={{ color: "#A6F23A" }}>“Kedua”</b>, atau klik tombol
                  di bawah:
                </>
              )}
            </span>
          </div>

          {isSpeaking && (
            <button
              type="button"
              className="pill"
              onClick={stopTiaraSpeakingOnly}
              style={{
                padding: "5px 11px",
                fontSize: 11.5,
                background: "#262C3A",
                color: "#FFFFFF",
              }}
            >
              <Square size={11} /> Hentikan Suara
            </button>
          )}
        </div>

        {/* Daftar Kandidat Notulen Relevan */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {candidateNotulens.map((item, idx) => {
            const reason = candidateMatchReasons[item.id];
            const statusChip =
              item.status === "selesai"
                ? { bg: "#A6F23A", color: "#14171F", label: "Selesai" }
                : item.status === "diperiksa"
                ? { bg: "#E4E7FF", color: "#2F3DB5", label: "Diperiksa" }
                : { bg: "#262C3A", color: "#E2E8F0", label: "Diproses" };

            return (
              <div
                key={item.id}
                style={{
                  borderRadius: 16,
                  padding: "14px 16px",
                  background: isDark ? "#1A2030" : "#F8F9FB",
                  border: isDark ? "1px solid #2A3348" : "1px solid #E2E6EE",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  transition: "border-color 0.15s ease",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "flex", gap: 12, flex: "1 1 320px" }}>
                    <span
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 9,
                        background: "#6B7BFF",
                        color: "#FFFFFF",
                        fontWeight: 700,
                        fontSize: 13,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    >
                      {idx + 1}
                    </span>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <span style={{ fontWeight: 700, fontSize: 15.5 }}>
                          {item.judul}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            borderRadius: 999,
                            padding: "2px 9px",
                            background: statusChip.bg,
                            color: statusChip.color,
                          }}
                        >
                          {statusChip.label}
                        </span>
                        {reason && (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              borderRadius: 999,
                              padding: "2px 9px",
                              background: isDark ? "#252D42" : "#EEF1FF",
                              color: isDark ? "#A5B4FC" : "#3746C4",
                            }}
                          >
                            {reason}
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 12,
                          fontSize: 12,
                          color: isDark ? "#94A3B8" : "#525866",
                          marginTop: 5,
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Calendar size={12.5} /> {item.tanggal}
                        </span>
                        {item.jam && (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <Clock size={12.5} /> {item.jam}
                          </span>
                        )}
                        {item.lokasi && (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <MapPin size={12.5} /> {item.lokasi}
                          </span>
                        )}
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <CheckCircle2 size={12.5} /> {item.keputusan.length}{" "}
                          keputusan · {item.tugasCount} tugas
                        </span>
                      </div>

                      <div
                        style={{
                          fontSize: 12.5,
                          color: isDark ? "#CBD5E1" : "#3E4452",
                          marginTop: 7,
                          lineHeight: 1.48,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {item.ringkasan}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tombol Aksi Cepat per Kandidat */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 8,
                    flexWrap: "wrap",
                    paddingTop: 4,
                  }}
                >
                  <button
                    type="button"
                    className="pill"
                    style={{
                      padding: "7px 14px",
                      fontSize: 12.5,
                      fontWeight: 600,
                      background: isDark ? "#262F45" : "#FFFFFF",
                      color: isDark ? "#F1F5F9" : "#14171F",
                      border: isDark
                        ? "1px solid #35415E"
                        : "1px solid #D5D8DD",
                    }}
                    onClick={() => selectDisambiguatedNotulen(item.id, false)}
                  >
                    Buka Notulen
                  </button>
                  <button
                    type="button"
                    className="pill"
                    style={{
                      padding: "7px 14px",
                      fontSize: 12.5,
                      fontWeight: 700,
                      background: "#A6F23A",
                      color: "#14171F",
                    }}
                    onClick={() => selectDisambiguatedNotulen(item.id, true)}
                  >
                    <Volume2 size={14} /> Buka & Bacakan
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
