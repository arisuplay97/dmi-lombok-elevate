import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Moon, Smartphone, Sun, Volume2 } from "lucide-react";
import { usePdamStore } from "@/lib/pdam-store";
import { VoiceAgendaConfirmModal } from "./VoiceAgendaConfirmModal";
import { UploadAudioModal } from "./UploadAudioModal";
import { CreateNotulenModal } from "./CreateNotulenModal";
import { FloatingTiaraWidget } from "./FloatingTiaraWidget";
import { SearchModal } from "./SearchModal";
import { NotulenChoiceModal } from "./NotulenChoiceModal";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { MobilePwaApp } from "./MobilePwaApp";

const NAV_ITEMS = [
  { label: "Beranda", to: "/" },
  { label: "Agenda", to: "/agenda" },
  { label: "Notulen", to: "/notulen" },
  { label: "Tugas", to: "/tugas" },
  { label: "Pengaturan", to: "/pengaturan" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const {
    settings,
    toggleDarkMode,
    setActiveRole,
    setSearchModalOpen,
    reminder,
    notulenList,
    triggerReminderAnnouncement,
    assistantEnabled,
    isListening,
    isSpeaking,
    simulateWakeWord,
  } = usePdamStore();

  const [notifOpen, setNotifOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 768px)").matches;
  });
  const [desktopPwaPreview, setDesktopPwaPreview] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("pwa") === "1";
  });

  const isDark = settings.darkMode;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 768px)");
    const onChange = (e: MediaQueryListEvent) => setIsMobileViewport(e.matches);
    setIsMobileViewport(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const pendingCheckCount = notulenList.filter(
    (n) => n.status === "diperiksa"
  ).length;
  const hasUnread = reminder.visible || pendingCheckCount > 0;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchModalOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setSearchModalOpen]);

  if (isMobileViewport || desktopPwaPreview) {
    return (
      <>
        <MobilePwaApp
          onExitDesktopPreview={
            !isMobileViewport ? () => setDesktopPwaPreview(false) : undefined
          }
        />
        <SearchModal />
      </>
    );
  }

  return (
    <div className="pdam-shell">
      {/* Header utama dengan dukungan penuh Light & Dark Mode */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          position: "relative",
        }}
      >
        <Link
          to="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontWeight: 700,
            fontSize: 20,
            color: isDark ? "#F3F5F8" : "#14171F",
            textDecoration: "none",
          }}
        >
          <span
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: "#6B7BFF",
              display: "inline-block",
              flexShrink: 0,
            }}
          />
          <span>Asisten Dirut</span>
        </Link>

        <nav className="desktop-nav" style={{ display: "flex", gap: 8 }}>
          {NAV_ITEMS.map((item) => {
            const active =
              item.to === "/"
                ? pathname === "/"
                : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className="pill"
                style={
                  active
                    ? isDark
                      ? { background: "#6B7BFF", color: "#FFFFFF" }
                      : { background: "#14171F", color: "#FFFFFF" }
                    : isDark
                    ? {
                        background: "#1A1F2C",
                        color: "#CBD5E1",
                        border: "1px solid #262E40",
                      }
                    : { background: "#F1F2F4", color: "#14171F" }
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* Tombol Cari */}
          <button
            type="button"
            className="pill"
            aria-label="Cari"
            title="Cari agenda, notulen, atau tugas (Ctrl+K)"
            style={{
              width: 44,
              height: 44,
              padding: 0,
              background: isDark ? "#1A1F2C" : "#F1F2F4",
              border: isDark ? "1px solid #262E40" : "none",
            }}
            onClick={() => setSearchModalOpen(true)}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke={isDark ? "#E2E8F0" : "#14171F"}
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-4-4" />
            </svg>
          </button>

          {/* Tombol Pratinjau Tampilan Mobile PWA */}
          <button
            type="button"
            className="pill"
            aria-label="Buka Tampilan Mobile PWA"
            title="Pratinjau Tampilan Mobile PWA"
            style={{
              width: 44,
              height: 44,
              padding: 0,
              background: isDark ? "#1A1F2C" : "#F1F2F4",
              color: isDark ? "#E2E8F0" : "#14171F",
              border: isDark ? "1px solid #262E40" : "none",
            }}
            onClick={() => setDesktopPwaPreview(true)}
          >
            <Smartphone size={18} />
          </button>

          {/* Tombol Toggle Dark Mode / Light Mode */}
          <button
            type="button"
            className="pill"
            aria-label={isDark ? "Aktifkan Mode Terang" : "Aktifkan Mode Gelap"}
            title={isDark ? "Beralih ke Mode Terang" : "Beralih ke Mode Gelap"}
            style={{
              width: 44,
              height: 44,
              padding: 0,
              background: isDark ? "#1A1F2C" : "#F1F2F4",
              color: isDark ? "#FBBF24" : "#14171F",
              border: isDark ? "1px solid #262E40" : "none",
            }}
            onClick={toggleDarkMode}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Tombol Notifikasi */}
          <div style={{ position: "relative" }}>
            <button
              type="button"
              className="pill"
              aria-label="Notifikasi"
              title="Notifikasi & pengingat suara"
              style={{
                width: 44,
                height: 44,
                padding: 0,
                position: "relative",
                background: isDark ? "#1A1F2C" : "#F1F2F4",
                border: isDark ? "1px solid #262E40" : "none",
              }}
              onClick={() => {
                setNotifOpen((v) => !v);
                setRoleMenuOpen(false);
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke={isDark ? "#E2E8F0" : "#14171F"}
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M6 17V11a6 6 0 0112 0v6l2 2H4z" />
              </svg>
              {hasUnread && (
                <span
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 11,
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#6B7BFF",
                  }}
                />
              )}
            </button>

            {notifOpen && (
              <div
                className="c"
                style={{
                  position: "absolute",
                  right: 0,
                  top: 52,
                  width: 320,
                  zIndex: 60,
                  padding: 18,
                  boxShadow: "0 18px 44px rgba(0,0,0,0.28)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 10,
                  }}
                >
                  <b style={{ fontSize: 14 }}>Notifikasi Sekretariat PDAM</b>
                  <span
                    style={{
                      fontSize: 11,
                      color: isDark ? "#94A3B8" : "#4A505C",
                    }}
                  >
                    Siaga Tiara
                  </span>
                </div>

                <div
                  style={{
                    background: isDark ? "#1C2232" : "#F7F7F8",
                    borderRadius: 14,
                    padding: 12,
                    fontSize: 13,
                    marginBottom: 8,
                  }}
                >
                  <div style={{ fontWeight: 600 }}>
                    08.55 · Rapat Direksi (5 menit lagi)
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: isDark ? "#94A3B8" : "#4A505C",
                      marginTop: 2,
                    }}
                  >
                    Ruang Rapat Utama · 8 peserta
                  </div>
                  <button
                    type="button"
                    className="pill"
                    style={{
                      marginTop: 8,
                      padding: "6px 12px",
                      fontSize: 12,
                      background: "#A6F23A",
                      color: "#14171F",
                    }}
                    onClick={() => {
                      setNotifOpen(false);
                      triggerReminderAnnouncement();
                    }}
                  >
                    <Volume2 size={13} /> Umumkan Lewat Suara
                  </button>
                </div>

                {pendingCheckCount > 0 && (
                  <Link
                    to="/notulen"
                    onClick={() => setNotifOpen(false)}
                    style={{
                      display: "block",
                      background: isDark ? "#232B47" : "#E4E7FF",
                      color: isDark ? "#A5B4FC" : "#2F3DB5",
                      borderRadius: 14,
                      padding: 12,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {pendingCheckCount} draf notulen AI menunggu pemeriksaan
                    Sekretariat →
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Avatar Peran (DR = Dirut / SK = Sekretariat) */}
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => {
                setRoleMenuOpen((v) => !v);
                setNotifOpen(false);
              }}
              title={`Peran aktif: ${
                settings.peranAktif === "dirut"
                  ? "Direktur Utama"
                  : "Sekretariat"
              } (klik untuk ganti peran)`}
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                border: isDark ? "1px solid #333D54" : 0,
                cursor: "pointer",
                background:
                  settings.peranAktif === "dirut"
                    ? isDark
                      ? "#252C3E"
                      : "#14171F"
                    : "#6B7BFF",
                color: "#fff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 600,
                fontSize: 14,
                fontFamily: "inherit",
              }}
            >
              {settings.peranAktif === "dirut" ? "DR" : "SK"}
            </button>

            {roleMenuOpen && (
              <div
                className="c"
                style={{
                  position: "absolute",
                  right: 0,
                  top: 52,
                  width: 265,
                  zIndex: 60,
                  padding: 16,
                  boxShadow: "0 18px 44px rgba(0,0,0,0.28)",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: isDark ? "#94A3B8" : "#4A505C",
                  }}
                >
                  Perumdam Tirta Ardhia Rinjani
                </div>
                <div style={{ fontWeight: 700, fontSize: 14, marginTop: 2 }}>
                  Pilih Peran Akses (MVP)
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    marginTop: 12,
                  }}
                >
                  <button
                    type="button"
                    className="pill"
                    style={{
                      justifyContent: "flex-start",
                      background:
                        settings.peranAktif === "dirut"
                          ? "#6B7BFF"
                          : isDark
                          ? "#1C2232"
                          : "#F1F2F4",
                      color:
                        settings.peranAktif === "dirut"
                          ? "#fff"
                          : isDark
                          ? "#E2E8F0"
                          : "#14171F",
                    }}
                    onClick={() => {
                      setActiveRole("dirut");
                      setRoleMenuOpen(false);
                    }}
                  >
                    <b>DR</b> · Direktur Utama
                  </button>
                  <button
                    type="button"
                    className="pill"
                    style={{
                      justifyContent: "flex-start",
                      background:
                        settings.peranAktif === "sekretariat"
                          ? "#6B7BFF"
                          : isDark
                          ? "#1C2232"
                          : "#F1F2F4",
                      color:
                        settings.peranAktif === "sekretariat"
                          ? "#fff"
                          : isDark
                          ? "#E2E8F0"
                          : "#14171F",
                    }}
                    onClick={() => {
                      setActiveRole("sekretariat");
                      setRoleMenuOpen(false);
                    }}
                  >
                    <b>SK</b> · Staf Sekretariat
                  </button>
                </div>

                <div
                  style={{
                    borderTop: `1px solid ${isDark ? "#262E40" : "#ECEDF0"}`,
                    marginTop: 12,
                    paddingTop: 10,
                    fontSize: 12,
                    color: isDark ? "#94A3B8" : "#4A505C",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>
                    Asisten Tiara:{" "}
                    <b style={{ color: isDark ? "#F3F5F8" : "#14171F" }}>
                      {isSpeaking
                        ? "Berbicara"
                        : assistantEnabled && isListening
                        ? "Mendengarkan"
                        : "Siaga"}
                    </b>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setRoleMenuOpen(false);
                      simulateWakeWord();
                    }}
                    style={{
                      border: 0,
                      background: "#A6F23A",
                      color: "#14171F",
                      borderRadius: 999,
                      padding: "4px 10px",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Panggil Tiara
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main>{children}</main>

      {/* Navigasi Mobile PWA (hanya muncul <= 640px) */}
      <nav
        className="mobile-nav"
        style={{
          position: "fixed",
          bottom: 12,
          left: 12,
          right: 12,
          zIndex: 50,
          background: "#14171F",
          border: isDark ? "1px solid #262E40" : "none",
          borderRadius: 999,
          padding: "6px",
          justifyContent: "space-between",
          gap: 4,
          boxShadow: "0 12px 32px rgba(20,23,31,0.3)",
        }}
      >
        {NAV_ITEMS.map((item) => {
          const active =
            item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              style={{
                flex: 1,
                textAlign: "center",
                padding: "9px 6px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                background: active ? "#A6F23A" : "transparent",
                color: active ? "#14171F" : "#fff",
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Global Interactive Modals & Floating Voice Assistant */}
      <FloatingTiaraWidget />
      <NotulenChoiceModal />
      <VoiceAgendaConfirmModal />
      <DeleteConfirmModal />
      <UploadAudioModal />
      <CreateNotulenModal />
      <SearchModal />
    </div>
  );
}
