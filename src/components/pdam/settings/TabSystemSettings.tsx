import { useState } from "react";
import {
  CheckCircle2,
  Clock,
  Copy,
  Laptop,
  Moon,
  RotateCcw,
  Save,
  Share2,
  Shield,
  Sun,
  Trash2,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { usePdamStore } from "@/lib/pdam-store";
import type { UserRole } from "@/lib/types";

interface TabSystemSettingsProps {
  inputStyle: React.CSSProperties;
}

export function TabSystemSettings({ inputStyle }: TabSystemSettingsProps) {
  const {
    settings,
    updateSettings,
    saveSettingsNow,
    toggleDarkMode,
    setActiveRole,
    clearAllApiKeys,
    resetDemoData,
    serverSyncedAt,
  } = usePdamStore();

  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyMobileSyncLink = () => {
    try {
      if (typeof window === "undefined") return;
      // Ambil origin saat ini dan sertakan payload konfigurasi dasar
      const url = new URL(window.location.origin);
      url.pathname = "/pengaturan";
      
      // Salin ke clipboard
      navigator.clipboard.writeText(url.toString());
      setCopiedLink(true);
      toast.success(
        "Tautan sinkronisasi disalin! Buka di browser ponsel (Safari/Chrome) untuk langsung terhubung."
      );
      setTimeout(() => setCopiedLink(false), 3000);
    } catch {
      toast.error("Gagal menyalin tautan. Silakan salin alamat URL secara manual.");
    }
  };

  const handleToggleReminderMinute = (min: number) => {
    const current = settings.pengingatMenit || [30, 5];
    const exists = current.includes(min);
    const updated = exists
      ? current.filter((m) => m !== min)
      : [...current, min].sort((a, b) => b - a);
    updateSettings({ pengingatMenit: updated });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* 1. TAMPILAN & TEMA APLIKASI */}
      <section
        className="c"
        style={{
          border: "1px solid #ECEDF0",
          borderRadius: 18,
          padding: 20,
          background: "var(--card-bg, #FFFFFF)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 16,
                fontWeight: 700,
              }}
            >
              {settings.darkMode ? (
                <Moon size={18} style={{ color: "#6B7BFF" }} />
              ) : (
                <Sun size={18} style={{ color: "#F59E0B" }} />
              )}
              Mode Tampilan & Tema Dashboard
            </div>
            <div style={{ fontSize: 13, color: "#4A505C", marginTop: 2 }}>
              Pilih mode kontras tinggi terang atau mode gelap hemat baterai untuk perangkat mobile dan desktop.
            </div>
          </div>

          <button
            type="button"
            className="pill"
            style={{
              background: settings.darkMode ? "#1E222D" : "#F0F2F5",
              color: settings.darkMode ? "#A6F23A" : "#14171F",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              border: "1px solid #D5D8DD",
              cursor: "pointer",
            }}
            onClick={toggleDarkMode}
          >
            {settings.darkMode ? (
              <>
                <Moon size={15} /> Mode Gelap Aktif (Dark)
              </>
            ) : (
              <>
                <Sun size={15} /> Mode Terang Aktif (Light)
              </>
            )}
          </button>
        </div>
      </section>

      {/* 2. JAM OPERASIONAL WITA & BRIEFING OTOMATIS */}
      <section
        className="c"
        style={{
          border: "1px solid #ECEDF0",
          borderRadius: 18,
          padding: 20,
          background: "var(--card-bg, #FFFFFF)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 16,
                fontWeight: 700,
              }}
            >
              <Clock size={18} style={{ color: "#2563EB" }} />
              Waktu Operasional & Otomasi Briefing (Zona WITA)
            </div>
            <div style={{ fontSize: 13, color: "#4A505C", marginTop: 2 }}>
              Seluruh jadwal dan sapaan Tiara diselaraskan ke Waktu Indonesia Tengah (WITA / UTC+8 - Lombok).
            </div>
          </div>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: 999,
              background: "#E0F2FE",
              color: "#0369A1",
            }}
          >
            WITA · Lombok Tengah (UTC+8)
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 16,
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 6,
              }}
            >
              Jam Briefing Pagi Otomatis (WITA)
            </label>
            <input
              type="time"
              value={settings.jamBriefingPagi || "07:00"}
              onChange={(e) =>
                updateSettings({ jamBriefingPagi: e.target.value })
              }
              style={inputStyle}
            />
            <div style={{ fontSize: 11, color: "#6A7280", marginTop: 4 }}>
              Waktu Tiara otomatis membacakan agenda hari ini dan mengirimkan rekap via WhatsApp.
            </div>
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 6,
              }}
            >
              Jam Senyap / DND Mulai (WITA)
            </label>
            <input
              type="time"
              value={settings.jamSenyapMulai || "22:00"}
              onChange={(e) =>
                updateSettings({ jamSenyapMulai: e.target.value })
              }
              style={inputStyle}
            />
            <div style={{ fontSize: 11, color: "#6A7280", marginTop: 4 }}>
              Asisten tidak membunyikan pengingat suara di luar jam dinas.
            </div>
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 6,
              }}
            >
              Jam Senyap / DND Selesai (WITA)
            </label>
            <input
              type="time"
              value={settings.jamSenyapSelesai || "06:00"}
              onChange={(e) =>
                updateSettings({ jamSenyapSelesai: e.target.value })
              }
              style={inputStyle}
            />
            <div style={{ fontSize: 11, color: "#6A7280", marginTop: 4 }}>
              Pengingat aktif kembali menjelang briefing dinas pagi.
            </div>
          </div>
        </div>

        {/* Pengingat Menjelang Agenda */}
        <div style={{ marginTop: 8 }}>
          <label
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            Pemberitahuan Menjelang Acara / Rapat:
          </label>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[60, 30, 15, 5].map((min) => {
              const active = (settings.pengingatMenit || [30, 5]).includes(min);
              return (
                <button
                  key={min}
                  type="button"
                  onClick={() => handleToggleReminderMinute(min)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    border: active ? "1px solid #2563EB" : "1px solid #D5D8DD",
                    background: active ? "#EFF6FF" : "transparent",
                    color: active ? "#1D4ED8" : "#4A505C",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: active ? "#2563EB" : "#9CA3AF",
                    }}
                  />
                  {min} Menit Sebelum Acara
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. PROFIL PIMPINAN & PERAN AKTIF */}
      <section
        className="c"
        style={{
          border: "1px solid #ECEDF0",
          borderRadius: 18,
          padding: 20,
          background: "var(--card-bg, #FFFFFF)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            <User size={18} style={{ color: "#7C3AED" }} />
            Profil Pimpinan & Identitas BUMD
          </div>
          <div style={{ fontSize: 13, color: "#4A505C", marginTop: 2 }}>
            Personalisasi panggilan asisten suara Tiara dan peran aktif pengoperasian sistem.
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 6,
              }}
            >
              Nama Sapaan Pimpinan / Dirut
            </label>
            <input
              value={settings.namaDirut || "Pak Dirut"}
              onChange={(e) => updateSettings({ namaDirut: e.target.value })}
              placeholder="Contoh: Pak Dirut / Bapak Direktur Utama"
              style={inputStyle}
            />
            <div style={{ fontSize: 11, color: "#6A7280", marginTop: 4 }}>
              Tiara menyapa dengan nama/gelar ini di setiap pembukaan percakapan.
            </div>
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 6,
              }}
            >
              Peran Operasional Saat Ini
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="pill"
                onClick={() => setActiveRole("dirut")}
                style={{
                  flex: 1,
                  padding: "9px 12px",
                  fontWeight: 600,
                  fontSize: 13,
                  background:
                    settings.peranAktif === "dirut" ? "#14171F" : "#F7F7F8",
                  color: settings.peranAktif === "dirut" ? "#FFFFFF" : "#14171F",
                  border:
                    settings.peranAktif === "dirut"
                      ? "1px solid #14171F"
                      : "1px solid #D5D8DD",
                  cursor: "pointer",
                }}
              >
                Direktur Utama
              </button>
              <button
                type="button"
                className="pill"
                onClick={() => setActiveRole("sekretariat")}
                style={{
                  flex: 1,
                  padding: "9px 12px",
                  fontWeight: 600,
                  fontSize: 13,
                  background:
                    settings.peranAktif === "sekretariat"
                      ? "#14171F"
                      : "#F7F7F8",
                  color:
                    settings.peranAktif === "sekretariat"
                      ? "#FFFFFF"
                      : "#14171F",
                  border:
                    settings.peranAktif === "sekretariat"
                      ? "1px solid #14171F"
                      : "1px solid #D5D8DD",
                  cursor: "pointer",
                }}
              >
                Sekretariat / Notulis
              </button>
            </div>
            <div style={{ fontSize: 11, color: "#6A7280", marginTop: 4 }}>
              Peran menentukan sudut pandang notulen, pelaporan, dan pesan WhatsApp.
            </div>
          </div>
        </div>
      </section>

      {/* 4. SINKRONISASI MULTI-DEVICE & MOBILE PWA */}
      <section
        className="c"
        style={{
          border: "1px solid #ECEDF0",
          borderRadius: 18,
          padding: 20,
          background: "var(--card-bg, #FFFFFF)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 16,
                fontWeight: 700,
              }}
            >
              <Laptop size={18} style={{ color: "#059669" }} />
              Sinkronisasi Multi-Device & Mobile PWA
            </div>
            <div style={{ fontSize: 13, color: "#4A505C", marginTop: 2 }}>
              Akses Asisten Dirut dari iPhone / Android PWA dengan seluruh pengaturan tetap tersambung.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              fontWeight: 600,
              color: serverSyncedAt ? "#059669" : "#6A7280",
              background: serverSyncedAt ? "#ECFDF5" : "#F3F4F6",
              padding: "4px 10px",
              borderRadius: 999,
            }}
          >
            <CheckCircle2 size={14} />
            {serverSyncedAt
              ? `Tersinkron: ${serverSyncedAt}`
              : "Tersimpan Lokal"}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            background: "#F8FAFC",
            border: "1px solid #E2E8F0",
            borderRadius: 14,
            padding: 14,
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>
              Buka di Ponsel PWA (iPhone / Android)
            </div>
            <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
              Gunakan tautan ini untuk membuka sistem di mobile browser, lalu pilih "Add to Home Screen".
            </div>
          </div>

          <button
            type="button"
            className="pill"
            onClick={handleCopyMobileSyncLink}
            style={{
              background: "#14171F",
              color: "#FFFFFF",
              fontWeight: 600,
              fontSize: 12,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
            }}
          >
            {copiedLink ? <CheckCircle2 size={14} /> : <Copy size={14} />}
            {copiedLink ? "Tersalin!" : "Salin Tautan Akses Mobile"}
          </button>
        </div>

        {/* Checkbox persistensi */}
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            cursor: "pointer",
            fontSize: 13,
            color: "#1E293B",
          }}
        >
          <input
            type="checkbox"
            checked={Boolean(settings.persistSecretsOnDevice)}
            onChange={(e) =>
              updateSettings({ persistSecretsOnDevice: e.target.checked })
            }
            style={{ width: 17, height: 17, accentColor: "#2563EB" }}
          />
          <span>
            <b>Pertahankan Kunci API pada browser perangkat ini</b> (disimpan di LocalStorage terenkripsi agar tidak hilang saat tab ditutup).
          </span>
        </label>
      </section>

      {/* 5. PEMELIHARAAN SISTEM & RESET DATA DEMO */}
      <section
        className="c"
        style={{
          border: "1px solid #FEE2E2",
          borderRadius: 18,
          padding: 20,
          background: "#FEF2F2",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 15,
              fontWeight: 700,
              color: "#991B1B",
            }}
          >
            <Shield size={17} />
            Pemeliharaan & Keamanan Data Demo BUMD
          </div>
          <div style={{ fontSize: 12, color: "#7F1D1D", marginTop: 2 }}>
            Tindakan di bawah ini memengaruhi data sesi dan kunci API pada browser ini.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            className="pill"
            onClick={clearAllApiKeys}
            style={{
              background: "#FFFFFF",
              color: "#DC2626",
              border: "1px solid #FECACA",
              fontWeight: 600,
              fontSize: 12,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
            }}
          >
            <Trash2 size={14} /> Hapus Seluruh Kunci API dari Browser
          </button>

          <button
            type="button"
            className="pill"
            onClick={resetDemoData}
            style={{
              background: "#FFFFFF",
              color: "#374151",
              border: "1px solid #D1D5DB",
              fontWeight: 600,
              fontSize: 12,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
            }}
          >
            <RotateCcw size={14} /> Kembalikan Data Awal Demo BUMD
          </button>
        </div>
      </section>

      {/* TOMBOL SIMPAN PENGATURAN SISTEM */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          paddingTop: 8,
        }}
      >
        <button
          type="button"
          className="pill"
          style={{
            background: "#14171F",
            color: "#FFFFFF",
            fontWeight: 700,
            fontSize: 14,
            padding: "10px 22px",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
          }}
          onClick={() => saveSettingsNow("Pengaturan Sistem, Jam & Tampilan")}
        >
          <Save size={16} /> Simpan Pengaturan Sistem
        </button>
      </div>
    </div>
  );
}
