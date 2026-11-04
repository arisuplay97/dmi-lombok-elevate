import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle2,
  Cpu,
  RotateCcw,
  Save,
  Send,
  Sliders,
  Volume2,
} from "lucide-react";
import { usePdamStore } from "@/lib/pdam-store";
import {
  CARTESIA_VOICE_PRESETS,
  ELEVENLABS_VOICE_PRESETS,
  fetchCartesiaVoices,
  fetchElevenLabsVoices,
  getAvailableIndonesianVoices,
  type CartesiaVoiceInfo,
  type ElevenLabsVoiceInfo,
} from "@/lib/tiara-speech";
import { TabVoiceSettings } from "@/components/pdam/settings/TabVoiceSettings";
import { TabAiSettings } from "@/components/pdam/settings/TabAiSettings";
import { TabWaSettings } from "@/components/pdam/settings/TabWaSettings";
import { TabSystemSettings } from "@/components/pdam/settings/TabSystemSettings";

export const Route = createFileRoute("/pengaturan")({
  component: PengaturanPage,
});

type SettingsTab = "voice" | "ai" | "wa" | "system";

const ELEVEN_VOICES_STORAGE_KEY = "pdam_eleven_voices_cache_v1";
const CARTESIA_VOICES_STORAGE_KEY = "pdam_cartesia_voices_cache_v1";

function loadCachedElevenVoices(): ElevenLabsVoiceInfo[] {
  if (typeof window === "undefined") return ELEVENLABS_VOICE_PRESETS;
  try {
    const raw = window.localStorage.getItem(ELEVEN_VOICES_STORAGE_KEY);
    if (!raw) return ELEVENLABS_VOICE_PRESETS;
    const parsed = JSON.parse(raw) as ElevenLabsVoiceInfo[];
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed
      : ELEVENLABS_VOICE_PRESETS;
  } catch {
    return ELEVENLABS_VOICE_PRESETS;
  }
}

function loadCachedCartesiaVoices(): CartesiaVoiceInfo[] {
  if (typeof window === "undefined") return CARTESIA_VOICE_PRESETS;
  try {
    const raw = window.localStorage.getItem(CARTESIA_VOICES_STORAGE_KEY);
    if (!raw) return CARTESIA_VOICE_PRESETS;
    const parsed = JSON.parse(raw) as CartesiaVoiceInfo[];
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed
      : CARTESIA_VOICE_PRESETS;
  } catch {
    return CARTESIA_VOICE_PRESETS;
  }
}

function PengaturanPage() {
  const {
    settings,
    saveSettingsNow,
    resetDemoData,
    serverSyncedAt,
  } = usePdamStore();

  const [activeTab, setActiveTab] = useState<SettingsTab>("voice");

  // State visibilitas kunci rahasia
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSttKey, setShowSttKey] = useState(false);
  const [showTtsKey, setShowTtsKey] = useState(false);
  const [showWaKey, setShowWaKey] = useState(false);

  // Cache suara TTS
  const [elevenVoices, setElevenVoices] = useState<ElevenLabsVoiceInfo[]>(
    loadCachedElevenVoices
  );
  const [cartesiaVoices, setCartesiaVoices] = useState<CartesiaVoiceInfo[]>(
    loadCachedCartesiaVoices
  );
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Muat daftar suara browser
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const loadVoices = () => {
      setBrowserVoices(getAvailableIndonesianVoices());
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Muat daftar suara ElevenLabs jika ada API Key
  useEffect(() => {
    const key = settings.ttsApiKey?.trim();
    if (settings.ttsProvider !== "elevenlabs" || !key) return;
    let cancel = false;
    fetchElevenLabsVoices(key).then((res) => {
      if (cancel || !res.ok || !res.voices || res.voices.length === 0) return;
      setElevenVoices(res.voices);
      try {
        window.localStorage.setItem(
          ELEVEN_VOICES_STORAGE_KEY,
          JSON.stringify(res.voices)
        );
      } catch {
        // Abaikan jika quota localStorage penuh
      }
    });
    return () => {
      cancel = true;
    };
  }, [settings.ttsApiKey, settings.ttsProvider]);

  // Muat daftar suara Cartesia jika ada API Key
  useEffect(() => {
    const key = (settings.cartesiaApiKey || settings.ttsApiKey || "").trim();
    if (settings.ttsProvider !== "cartesia" || !key) return;
    let cancel = false;
    fetchCartesiaVoices(key).then((res) => {
      if (cancel || !res.ok || !res.voices || res.voices.length === 0) return;
      setCartesiaVoices(res.voices);
      try {
        window.localStorage.setItem(
          CARTESIA_VOICES_STORAGE_KEY,
          JSON.stringify(res.voices)
        );
      } catch {
        // Abaikan
      }
    });
    return () => {
      cancel = true;
    };
  }, [settings.cartesiaApiKey, settings.ttsApiKey, settings.ttsProvider]);

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    borderRadius: 12,
    border: "1px solid #D5D8DD",
    fontSize: 13,
    background: "var(--input-bg, #FFFFFF)",
    color: "var(--text-primary, #14171F)",
    outline: "none",
    boxSizing: "border-box",
  };

  const tabs: Array<{
    id: SettingsTab;
    label: string;
    sublabel: string;
    icon: typeof Volume2;
    badge?: string;
  }> = [
    {
      id: "voice",
      label: "Asisten Suara & TTS",
      sublabel: "Cartesia, ElevenLabs & Mikrofon",
      icon: Volume2,
      badge:
        settings.ttsProvider === "cartesia"
          ? "Cartesia AI"
          : settings.ttsProvider === "elevenlabs"
          ? "ElevenLabs"
          : "Web Speech",
    },
    {
      id: "ai",
      label: "Kecerdasan Buatan (AI LLM)",
      sublabel: "Groq Qwen, Gemini, OpenAI & STT",
      icon: Cpu,
      badge:
        settings.aiProvider === "groq"
          ? "Groq Qwen"
          : settings.aiProvider === "gemini"
          ? "Gemini"
          : settings.aiProvider === "custom"
          ? settings.aiCustomName || "Custom AI"
          : settings.aiProvider.toUpperCase(),
    },
    {
      id: "wa",
      label: "WhatsApp Gateway",
      sublabel: "Wangsaf API v1 & Notifikasi",
      icon: Send,
      badge: settings.waGateway === "Wangsaf" ? "Wangsaf v1" : "Gateway",
    },
    {
      id: "system",
      label: "Sistem & Jam WITA",
      sublabel: "Mode Gelap, DND & Profil",
      icon: Sliders,
      badge: settings.darkMode ? "Dark Mode" : "Light Mode",
    },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", paddingBottom: 60 }}>
      {/* HEADER UTAMA */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: -0.5,
              color: "var(--text-primary, #14171F)",
            }}
          >
            Pengaturan Sistem & Asisten Tiara
          </h1>
          <div
            style={{
              fontSize: 14,
              color: "#4A505C",
              marginTop: 4,
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span>Perumdam Tirta Ardhia Rinjani (PDAM Kab. Lombok Tengah)</span>
            <span style={{ color: "#D1D5DB" }}>•</span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                color: serverSyncedAt ? "#059669" : "#6B7BFF",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <CheckCircle2 size={13} />
              {serverSyncedAt
                ? `Tersinkron: ${serverSyncedAt}`
                : "Tersimpan Lokal"}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            className="pill"
            style={{
              background: "#A6F23A",
              color: "#14171F",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "10px 18px",
              cursor: "pointer",
            }}
            onClick={() => saveSettingsNow("Seluruh konfigurasi sistem")}
          >
            <Save size={15} /> Simpan Semua Pengaturan
          </button>
          <button
            type="button"
            className="pill"
            style={{
              background: "var(--card-bg, #FFFFFF)",
              color: "#4B5563",
              border: "1px solid #D5D8DD",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 14px",
              cursor: "pointer",
            }}
            onClick={resetDemoData}
            title="Kembalikan data contoh ke kondisi awal"
          >
            <RotateCcw size={15} /> Reset Demo
          </button>
        </div>
      </div>

      {/* TAB NAVIGATION BAR (4 TAB MODERN) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 10,
          marginBottom: 24,
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                textAlign: "left",
                padding: "14px 16px",
                borderRadius: 16,
                border: isActive
                  ? "2px solid #14171F"
                  : "1px solid #E5E7EB",
                background: isActive
                  ? "var(--tab-active-bg, #14171F)"
                  : "var(--card-bg, #FFFFFF)",
                color: isActive ? "#FFFFFF" : "var(--text-primary, #14171F)",
                cursor: "pointer",
                transition: "all 0.15s ease",
                boxShadow: isActive
                  ? "0 4px 12px rgba(20,23,31,0.12)"
                  : "none",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  width: "100%",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  <Icon
                    size={17}
                    style={{
                      color: isActive ? "#A6F23A" : "#6B7BFF",
                    }}
                  />
                  <span>{tab.label}</span>
                </div>
                {tab.badge && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 7px",
                      borderRadius: 999,
                      background: isActive
                        ? "rgba(255,255,255,0.18)"
                        : "#F0F2F5",
                      color: isActive ? "#FFFFFF" : "#4B5563",
                    }}
                  >
                    {tab.badge}
                  </span>
                )}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: isActive ? "rgba(255,255,255,0.7)" : "#6B7280",
                }}
              >
                {tab.sublabel}
              </div>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT ACTIVE */}
      <div>
        {activeTab === "voice" && (
          <TabVoiceSettings
            cartesiaVoices={cartesiaVoices}
            elevenVoices={elevenVoices}
            voices={browserVoices}
            showTtsKey={showTtsKey}
            setShowTtsKey={setShowTtsKey}
            inputStyle={inputStyle}
          />
        )}

        {activeTab === "ai" && (
          <TabAiSettings
            showApiKey={showApiKey}
            setShowApiKey={setShowApiKey}
            showSttKey={showSttKey}
            setShowSttKey={setShowSttKey}
            inputStyle={inputStyle}
          />
        )}

        {activeTab === "wa" && (
          <TabWaSettings
            showWaKey={showWaKey}
            setShowWaKey={setShowWaKey}
            inputStyle={inputStyle}
          />
        )}

        {activeTab === "system" && (
          <TabSystemSettings inputStyle={inputStyle} />
        )}
      </div>
    </div>
  );
}
