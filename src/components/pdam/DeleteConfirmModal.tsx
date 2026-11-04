import { useEffect } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { usePdamStore } from "@/lib/pdam-store";

export function DeleteConfirmModal() {
  const {
    pendingDelete,
    confirmPendingDelete,
    cancelPendingDelete,
    settings,
  } = usePdamStore();

  useEffect(() => {
    if (!pendingDelete) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        cancelPendingDelete();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pendingDelete, cancelPendingDelete]);

  if (!pendingDelete) return null;

  const isDark = settings.darkMode;
  const isNotulen = pendingDelete.type === "notulen";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 90,
        background: "rgba(15, 18, 25, 0.65)",
        backdropFilter: "blur(5px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={cancelPendingDelete}
    >
      <div
        className="c"
        style={{
          width: "100%",
          maxWidth: 480,
          boxShadow: "0 28px 70px rgba(15, 18, 25, 0.4)",
          background: isDark ? "#141722" : "#FFFFFF",
          color: isDark ? "#F3F4F6" : "#14171F",
          border: isDark ? "1px solid #2B3347" : "1px solid #E5E7EB",
          borderRadius: 20,
          padding: 22,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: "rgba(239, 68, 68, 0.12)",
                color: "#EF4444",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Trash2 size={20} />
            </span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>
                Hapus {isNotulen ? "Notulen Rapat" : "Agenda Jadwal"}?
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: isDark ? "#94A3B8" : "#64748B",
                }}
              >
                Konfirmasi penghapusan data
              </div>
            </div>
          </div>
          <button
            type="button"
            className="pill"
            style={{ width: 34, height: 34, padding: 0 }}
            onClick={cancelPendingDelete}
            aria-label="Tutup"
          >
            <X size={15} />
          </button>
        </div>

        {/* Detail Target */}
        <div
          style={{
            background: isDark ? "#1C2130" : "#F8FAFC",
            border: isDark ? "1px solid #2C354B" : "1px solid #E2E8F0",
            borderRadius: 14,
            padding: "14px 16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 999,
                background: isNotulen ? "rgba(107, 123, 255, 0.18)" : "rgba(166, 242, 58, 0.22)",
                color: isNotulen ? "#818cf8" : (isDark ? "#A6F23A" : "#3b7d00"),
                textTransform: "uppercase",
              }}
            >
              {isNotulen ? "Notulen" : "Agenda"}
            </span>
            {pendingDelete.subtitle && (
              <span style={{ fontSize: 12, color: isDark ? "#94A3B8" : "#64748B" }}>
                {pendingDelete.subtitle}
              </span>
            )}
          </div>
          <div style={{ fontWeight: 700, fontSize: 15, marginTop: 4 }}>
            {pendingDelete.title}
          </div>
          <p
            style={{
              fontSize: 12.5,
              color: isDark ? "#CBD5E1" : "#4B5563",
              marginTop: 6,
              marginBottom: 0,
              lineHeight: 1.45,
            }}
          >
            {isNotulen
              ? "Notulen ini beserta transkrip, poin keputusan, dan daftar tugas terkait akan dihapus secara permanen."
              : "Jadwal kegiatan ini akan dihapus dari kalender agenda Direksi."}
          </p>
        </div>

        {/* Banner Kontrol Suara Realtime */}
        <div
          style={{
            background: isDark ? "rgba(107, 123, 255, 0.1)" : "#EEF2FF",
            border: "1px solid rgba(107, 123, 255, 0.3)",
            borderRadius: 12,
            padding: "10px 14px",
            fontSize: 12.5,
            color: isDark ? "#C7D2FE" : "#3730A3",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 16 }}>🎙️</span>
          <div>
            <b>Kontrol Suara:</b> Katakan{" "}
            <span style={{ color: isDark ? "#A6F23A" : "#15803D", fontWeight: 700 }}>
              “Iya”
            </span>{" "}
            atau{" "}
            <span style={{ color: isDark ? "#A6F23A" : "#15803D", fontWeight: 700 }}>
              “Hapus”
            </span>{" "}
            untuk menghapus, atau katakan{" "}
            <span style={{ fontWeight: 700 }}>“Batal”</span>.
          </div>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: 10,
            marginTop: 4,
          }}
        >
          <button
            type="button"
            className="btn g sm"
            onClick={cancelPendingDelete}
            style={{
              padding: "9px 16px",
              borderRadius: 12,
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={confirmPendingDelete}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "#EF4444",
              color: "#FFFFFF",
              border: "none",
              borderRadius: 12,
              padding: "9px 18px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(239, 68, 68, 0.3)",
            }}
          >
            <Trash2 size={14} />
            <span>Hapus Sekarang</span>
          </button>
        </div>
      </div>
    </div>
  );
}
