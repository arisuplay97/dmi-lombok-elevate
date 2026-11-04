import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Cpu,
  ExternalLink,
  Eye,
  EyeOff,
  Lock,
  Mic,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
  Trash2,
  Volume2,
  Wifi,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { fetchCustomProviderModels } from "@/lib/ai-service";
import { usePdamStore } from "@/lib/pdam-store";
import {
  CARTESIA_VOICE_PRESETS,
  ELEVENLABS_VOICE_PRESETS,
  fetchCartesiaVoices,
  fetchElevenLabsVoices,
  getAvailableIndonesianVoices,
  speakWithConfiguredProvider,
  type CartesiaVoiceInfo,
  type ElevenLabsVoiceInfo,
} from "@/lib/tiara-speech";
import type {
  AiAuthScheme,
  AiLlmProvider,
  AiSttProvider,
  AiTtsProvider,
  UserRole,
  WaGatewayProvider,
} from "@/lib/types";

export const Route = createFileRoute("/pengaturan")({
  component: PengaturanPage,
});

const MODEL_PRESETS: Record<AiLlmProvider, string[]> = {
  gemini: [
    "gemini-2.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-2.5-flash-lite",
    "gemini-2.5-pro",
    "gemini-3.1-flash-lite-preview",
  ],
  openai: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini"],
  anthropic: ["claude-3-5-sonnet-latest", "claude-3-5-haiku-latest"],
  groq: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
  custom: [
    "dahono/deepseek-v4-flash",
    "dahono/auto",
    "dahono/gemini-4-argon",
    "dahono/mimo-v2.6-flash",
    "deepseek-chat",
    "openai/gpt-4o-mini",
    "llama3.2:latest",
  ],
};

const PROVIDER_CACHE_SESSION_KEY = "pdam_provider_creds_session_v1";
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

interface ProviderCredCache {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

function readProviderCache(): Partial<Record<AiLlmProvider, ProviderCredCache>> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(PROVIDER_CACHE_SESSION_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeProviderCache(
  prov: AiLlmProvider,
  entry: ProviderCredCache
): void {
  if (typeof window === "undefined") return;
  try {
    const cur = readProviderCache();
    cur[prov] = { ...cur[prov], ...entry };
    window.sessionStorage.setItem(
      PROVIDER_CACHE_SESSION_KEY,
      JSON.stringify(cur)
    );
  } catch {
    // ignore
  }
}

function PengaturanPage() {
  const {
    settings,
    serverSyncedAt,
    updateSettings,
    saveSettingsNow,
    clearAllApiKeys,
    testAiConnection,
    checkWaDeviceStatus,
    setActiveRole,
    recipients,
    toggleRecipient,
    addRecipient,
    waLogs,
    sendTestWaBriefing,
    sendDirectTestWhatsapp,
    retryWaLog,
    simulateWakeWord,
    triggerReminderAnnouncement,
    toggleWakeWordListening,
    assistantEnabled,
    resetDemoData,
  } = usePdamStore();

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [newNama, setNewNama] = useState("");
  const [newNoWa, setNewNoWa] = useState("");
  const [newPeran, setNewPeran] = useState<UserRole>("sekretariat");

  const [showLlmKey, setShowLlmKey] = useState(false);
  const [showTtsKey, setShowTtsKey] = useState(false);
  const [showWaKey, setShowWaKey] = useState(false);
  const [testingApi, setTestingApi] = useState(false);
  const [apiStatus, setApiStatus] = useState<{
    ok: boolean;
    msg: string;
  } | null>(null);

  const [elevenVoices, setElevenVoices] = useState<ElevenLabsVoiceInfo[]>(() =>
    loadCachedElevenVoices()
  );
  const [loadingElevenVoices, setLoadingElevenVoices] = useState(false);
  const [cartesiaVoices, setCartesiaVoices] = useState<CartesiaVoiceInfo[]>(
    () => loadCachedCartesiaVoices()
  );
  const [loadingCartesiaVoices, setLoadingCartesiaVoices] = useState(false);
  const [testingTts, setTestingTts] = useState(false);
  const [ttsStatus, setTtsStatus] = useState<{
    ok: boolean;
    msg: string;
  } | null>(null);

  const [checkingWa, setCheckingWa] = useState(false);
  const [sendingDirectWa, setSendingDirectWa] = useState(false);
  const [directWaPhone, setDirectWaPhone] = useState(() => {
    const digits = settings.waNomorKhusus.replace(/[^\d+]/g, "");
    return digits.length >= 9 ? digits : "";
  });
  const [waDeviceStatus, setWaDeviceStatus] = useState<{
    ok: boolean;
    connected: boolean;
    msg: string;
  } | null>(null);

  const [customModels, setCustomModels] = useState<string[]>(
    MODEL_PRESETS.custom
  );
  const [geminiModels, setGeminiModels] = useState<string[]>(
    MODEL_PRESETS.gemini
  );
  const [loadingModels, setLoadingModels] = useState(false);

  useEffect(() => {
    // Perbaiki otomatis sesi aktif bila user sedang memakai Dahono Router namun terlanjur memilih custom-header berspasi
    if (
      settings.aiAuthScheme === "custom-header" &&
      (/\s/.test(settings.aiCustomHeader.trim()) ||
        /dahono\.com|openrouter\.ai|deepseek\.com/i.test(settings.aiBaseUrl))
    ) {
      updateSettings({
        aiAuthScheme: "bearer",
        aiCustomHeader: "X-API-Key",
        ...(settings.aiBaseUrl.toLowerCase().includes("dahono.com")
          ? { aiCustomName: "Dahono Router" }
          : {}),
      });
    }
  }, [
    settings.aiAuthScheme,
    settings.aiBaseUrl,
    settings.aiCustomHeader,
    updateSettings,
  ]);

  useEffect(() => {
    const load = () => setVoices(getAvailableIndonesianVoices());
    load();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.addEventListener("voiceschanged", load);
      return () =>
        window.speechSynthesis.removeEventListener("voiceschanged", load);
    }
  }, []);

  const toggleMenit = (m: number) => {
    const exists = settings.pengingatMenit.includes(m);
    const next = exists
      ? settings.pengingatMenit.filter((x) => x !== m)
      : [...settings.pengingatMenit, m].sort((a, b) => b - a);
    updateSettings({ pengingatMenit: next });
  };

  const handleProviderChange = (prov: AiLlmProvider) => {
    // Simpan kredensial provider lama di sesi agar tidak tertukar antar-provider (mis. kunci Dahono vs kunci Gemini AIza...)
    writeProviderCache(settings.aiProvider, {
      apiKey: settings.aiApiKey,
      baseUrl: settings.aiBaseUrl,
      model: settings.aiModel,
    });

    const cached = readProviderCache()[prov];
    const defaultModel = cached?.model || MODEL_PRESETS[prov][0] || "";
    const restoredKey = cached?.apiKey ?? "";

    setApiStatus(null);

    if (prov === "custom") {
      updateSettings({
        aiProvider: prov,
        aiCustomName: settings.aiCustomName || "Dahono Router",
        aiModel: defaultModel,
        aiApiKey: restoredKey,
        aiBaseUrl: cached?.baseUrl || "https://gateway.dahono.com/v1",
        aiCustomPath: settings.aiCustomPath || "/chat/completions",
        aiAuthScheme:
          settings.aiAuthScheme === "custom-header" &&
          /\s/.test(settings.aiCustomHeader)
            ? "bearer"
            : settings.aiAuthScheme || "bearer",
      });
      return;
    }

    updateSettings({
      aiProvider: prov,
      aiModel: defaultModel,
      aiApiKey: restoredKey,
      aiBaseUrl: cached?.baseUrl ?? "",
    });
  };

  const applyCustomPreset = (
    preset: "dahono" | "openrouter" | "deepseek" | "ollama" | "lmstudio"
  ) => {
    if (preset === "dahono") {
      updateSettings({
        aiProvider: "custom",
        aiCustomName: "Dahono Router",
        aiBaseUrl: "https://gateway.dahono.com/v1",
        aiCustomPath: "/chat/completions",
        aiAuthScheme: "bearer",
        aiModel: settings.aiModel.startsWith("dahono/")
          ? settings.aiModel
          : "dahono/deepseek-v4-flash",
      });
    } else if (preset === "openrouter") {
      updateSettings({
        aiProvider: "custom",
        aiCustomName: "OpenRouter",
        aiBaseUrl: "https://openrouter.ai/api/v1",
        aiCustomPath: "/chat/completions",
        aiAuthScheme: "bearer",
        aiModel: "openai/gpt-4o-mini",
      });
    } else if (preset === "deepseek") {
      updateSettings({
        aiProvider: "custom",
        aiCustomName: "DeepSeek API",
        aiBaseUrl: "https://api.deepseek.com/v1",
        aiCustomPath: "/chat/completions",
        aiAuthScheme: "bearer",
        aiModel: "deepseek-chat",
      });
    } else if (preset === "ollama") {
      updateSettings({
        aiProvider: "custom",
        aiCustomName: "Ollama Lokal",
        aiBaseUrl: "http://localhost:11434/v1",
        aiCustomPath: "/chat/completions",
        aiAuthScheme: "none",
        aiModel: "llama3.2",
      });
    } else {
      updateSettings({
        aiProvider: "custom",
        aiCustomName: "LM Studio Lokal",
        aiBaseUrl: "http://localhost:1234/v1",
        aiCustomPath: "/chat/completions",
        aiAuthScheme: "none",
        aiModel: "local-model",
      });
    }
    toast.success("Template endpoint Custom AI diterapkan.");
  };

  const handleLoadCustomModels = async () => {
    setLoadingModels(true);
    const res = await fetchCustomProviderModels(settings);
    setLoadingModels(false);
    if (res.ok && res.models.length > 0) {
      if (settings.aiProvider === "gemini") {
        setGeminiModels(res.models);
      } else {
        setCustomModels(res.models);
      }
      toast.success(res.message);
    } else {
      toast.error(res.message);
    }
  };

  const handleTestApi = async () => {
    setTestingApi(true);
    const res = await testAiConnection();
    setTestingApi(false);
    setApiStatus({ ok: res.ok, msg: res.message });
    if (res.ok) toast.success(res.message);
    else toast.error(res.message);
  };

  const handleCheckWangsafDevice = async () => {
    setCheckingWa(true);
    const res = await checkWaDeviceStatus();
    setCheckingWa(false);
    setWaDeviceStatus({
      ok: res.ok,
      connected: res.connected,
      msg: res.message,
    });
    if (res.ok && res.connected) toast.success(res.message);
    else if (res.ok) toast(res.message);
    else toast.error(res.message);
  };

  const handleSendDirectWa = async () => {
    setSendingDirectWa(true);
    await sendDirectTestWhatsapp(directWaPhone);
    setSendingDirectWa(false);
  };

  const handleLoadElevenLabsVoices = async () => {
    setLoadingElevenVoices(true);
    const res = await fetchElevenLabsVoices(
      settings.ttsApiKey,
      settings.ttsBaseUrl
    );
    setLoadingElevenVoices(false);
    if (res.ok && res.voices.length > 0) {
      const seen = new Set(res.voices.map((v) => v.voiceId));
      const combined = [
        ...res.voices,
        ...ELEVENLABS_VOICE_PRESETS.filter((p) => !seen.has(p.voiceId)),
      ].sort((a, b) => Number(b.freeApiAllowed) - Number(a.freeApiAllowed));
      setElevenVoices(combined);
      try {
        window.localStorage.setItem(
          ELEVEN_VOICES_STORAGE_KEY,
          JSON.stringify(combined)
        );
      } catch {
        // ignore
      }
      const firstFree = combined.find((v) => v.freeApiAllowed);
      if (!settings.ttsVoiceId.trim() && firstFree) {
        updateSettings({ ttsVoiceId: firstFree.voiceId });
      }
      setTtsStatus({ ok: true, msg: res.message });
      toast.success(res.message);
    } else {
      setTtsStatus({ ok: false, msg: res.message });
      toast(res.message);
    }
  };

  const handleLoadCartesiaVoices = async () => {
    setLoadingCartesiaVoices(true);
    const res = await fetchCartesiaVoices(
      settings.cartesiaApiKey || settings.ttsApiKey,
      settings.cartesiaBaseUrl,
      settings.cartesiaVersion
    );
    setLoadingCartesiaVoices(false);
    if (res.ok && res.voices.length > 0) {
      const seen = new Set(res.voices.map((v) => v.voiceId));
      const combined = [
        ...res.voices,
        ...CARTESIA_VOICE_PRESETS.filter((p) => !seen.has(p.voiceId)),
      ];
      setCartesiaVoices(combined);
      try {
        window.localStorage.setItem(
          CARTESIA_VOICES_STORAGE_KEY,
          JSON.stringify(combined)
        );
      } catch {
        // ignore
      }
      if (!settings.cartesiaVoiceId.trim() && combined[0]) {
        updateSettings({ cartesiaVoiceId: combined[0].voiceId });
      }
      setTtsStatus({ ok: true, msg: res.message });
      toast.success(res.message);
    } else {
      setTtsStatus({ ok: false, msg: res.message });
      toast.error(res.message);
    }
  };

  const handleTestCloudTts = () => {
    setTestingTts(true);
    setTtsStatus(null);
    let hadErr = false;
    let fallbackNotice = "";
    const providerLabel =
      settings.ttsProvider === "elevenlabs"
        ? `ElevenLabs (${settings.ttsModelId || "eleven_flash_v2_5"})`
        : settings.ttsProvider === "cartesia"
          ? `Cartesia Sonic (${settings.cartesiaModelId || "sonic-3"})`
          : settings.ttsProvider === "openai-tts"
            ? "OpenAI Neural TTS"
            : "Custom TTS";

    speakWithConfiguredProvider(
      `Halo Pak Dirut, saya Tiara. Suara ${
        settings.ttsProvider === "cartesia"
          ? "Cartesia Sonic"
          : settings.ttsProvider === "elevenlabs"
            ? "ElevenLabs"
            : "Asisten"
      } Bahasa Indonesia sudah aktif dan siap membacakan agenda serta notulen rapat.`,
      settings,
      {
        disableBrowserFallback: true,
        onFallbackFreeVoice: (freeVoiceId, notice) => {
          fallbackNotice = notice;
          updateSettings({ ttsVoiceId: freeVoiceId });
          toast(notice);
        },
        onStart: () => {
          setTtsStatus({
            ok: true,
            msg:
              fallbackNotice || `Berhasil! Audio ${providerLabel} sedang diputar.`,
          });
        },
        onCloudError: (errMsg) => {
          hadErr = true;
          setTestingTts(false);
          setTtsStatus({
            ok: false,
            msg: `Gagal memutar suara: ${errMsg}`,
          });
          toast.error(`Tes suara gagal: ${errMsg}`);
        },
        onEnd: () => {
          setTestingTts(false);
          if (!hadErr && settings.ttsProvider === "browser") {
            setTtsStatus({
              ok: true,
              msg: "Suara bawaan Browser Bahasa Indonesia selesai diuji.",
            });
          }
        },
      }
    );
  };

  const handleAddRecipient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNama.trim() || !newNoWa.trim()) return;
    addRecipient({
      nama: newNama.trim(),
      noWa: newNoWa.trim(),
      peran: newPeran,
      aktif: true,
    });
    setNewNama("");
    setNewNoWa("");
  };

  const hasAnyKeyStored = Boolean(
    settings.aiApiKey.trim() ||
      settings.sttApiKey.trim() ||
      settings.ttsApiKey.trim() ||
      settings.cartesiaApiKey.trim() ||
      settings.waApiToken.trim()
  );

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #D5D8DD",
    fontSize: 13,
    background: "#fff",
    boxSizing: "border-box",
    fontFamily: "inherit",
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
            Pengaturan Sistem, AI & Integrasi
          </h1>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
              marginTop: 5,
            }}
          >
            <span style={{ fontSize: 14, color: "#4A505C" }}>
              Konfigurasi API AI
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11.5,
                fontWeight: 600,
                padding: "3px 10px",
                borderRadius: 999,
                background: "#ECFDF5",
                color: "#047857",
                border: "1px solid #A7F3D0",
              }}
              title={
                serverSyncedAt
                  ? `Tersinkron ke server pada ${serverSyncedAt}`
                  : "Otomatis menyinkronkan pengaturan ke server agar langsung aktif di semua perangkat"
              }
            >
              <CheckCircle2 size={12} /> Tersimpan Lintas Perangkat (Semua
              Device)
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="pill"
            style={{
              background: "#A6F23A",
              color: "#14171F",
              fontWeight: 700,
            }}
            onClick={() => saveSettingsNow("Seluruh konfigurasi AI, Suara & WA")}
          >
            <Save size={15} /> Simpan Semua Pengaturan
          </button>
          <button
            type="button"
            className="pill"
            onClick={resetDemoData}
            title="Kembalikan seluruh data contoh ke kondisi awal"
          >
            <RotateCcw size={15} /> Reset Data Demo
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: 16,
        }}
      >
        {/* KARTU UTAMA: KONFIGURASI ENGINE & CUSTOM AI */}
        <section
          className="c"
          style={{
            gridColumn: "1 / -1",
            border: "2px solid #E4E7FF",
            display: "flex",
            flexDirection: "column",
            gap: 18,
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
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  background: "#14171F",
                  color: "#A6F23A",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Cpu size={22} />
              </span>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>
                  Konfigurasi API AI Terpadu & Provider Custom
                </div>
                <div style={{ fontSize: 12, color: "#4A505C" }}>
                  Mendukung Gemini, OpenAI, Claude, Groq, maupun Custom Endpoint
                  (Dahono Router, OpenRouter, DeepSeek, Ollama lokal)
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  background: "#F7F7F8",
                  padding: "8px 12px",
                  borderRadius: 999,
                  border: "1px solid #D5D8DD",
                  cursor: "pointer",
                }}
              >
                <Lock size={13} color="#4A505C" />
                <span>Simpan kunci di perangkat ini</span>
                <input
                  type="checkbox"
                  checked={settings.persistSecretsOnDevice}
                  onChange={(e) =>
                    updateSettings({ persistSecretsOnDevice: e.target.checked })
                  }
                  style={{ width: 16, height: 16, accentColor: "#6B7BFF" }}
                />
              </label>

              {hasAnyKeyStored && (
                <button
                  type="button"
                  className="pill"
                  style={{
                    background: "#FFF0F0",
                    color: "#B42318",
                    border: "1px solid #FECACA",
                  }}
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      window.sessionStorage.removeItem(
                        PROVIDER_CACHE_SESSION_KEY
                      );
                    }
                    clearAllApiKeys();
                  }}
                  title="Hapus seluruh API Key AI dan Api-Key Wangsaf dari browser"
                >
                  <Trash2 size={14} /> Hapus Semua Kunci API
                </button>
              )}
              <button
                type="button"
                className="pill"
                style={{ background: "#6B7BFF", color: "#fff" }}
                onClick={handleTestApi}
              >
                <Zap size={15} />
                {testingApi ? "Menguji Koneksi..." : "Uji Koneksi API AI"}
              </button>
            </div>
          </div>

          {apiStatus && (
            <div
              style={{
                background: apiStatus.ok ? "#F3FCE6" : "#FFF4F2",
                border: `1px solid ${apiStatus.ok ? "#C9EE8F" : "#FECACA"}`,
                borderRadius: 14,
                padding: "10px 14px",
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {apiStatus.ok ? (
                <CheckCircle2 size={16} color="#3B7A00" />
              ) : (
                <AlertCircle size={16} color="#B42318" />
              )}
              <span>{apiStatus.msg}</span>
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 18,
            }}
          >
            {/* Kolom A: LLM Chat, Summarizer & Custom Provider */}
            <div
              style={{
                background: "#F7F7F8",
                borderRadius: 18,
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700 }}>
                1. Provider LLM (Percakapan & Ringkasan Notulen)
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
                  Penyedia Layanan AI
                </label>
                <select
                  value={settings.aiProvider}
                  onChange={(e) =>
                    handleProviderChange(e.target.value as AiLlmProvider)
                  }
                  style={inputStyle}
                >
                  <option value="gemini">Google Gemini API</option>
                  <option value="openai">OpenAI (GPT-4o / GPT-4.1)</option>
                  <option value="anthropic">Anthropic Claude API</option>
                  <option value="groq">Groq Cloud (Llama 3.3 Cepat)</option>
                  <option value="custom">
                    Custom AI / OpenAI-Compatible (OpenRouter, DeepSeek, Ollama,
                    dll.)
                  </option>
                </select>
              </div>

              {settings.aiProvider === "custom" && (
                <div
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #E2E5EC",
                    borderRadius: 14,
                    padding: 12,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#4A505C",
                        marginBottom: 6,
                      }}
                    >
                      Preset Cepat Custom AI:
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {(
                        [
                          ["dahono", "Dahono Router"],
                          ["openrouter", "OpenRouter"],
                          ["deepseek", "DeepSeek"],
                          ["ollama", "Ollama Lokal"],
                          ["lmstudio", "LM Studio"],
                        ] as const
                      ).map(([id, label]) => (
                        <button
                          key={id}
                          type="button"
                          className="pill"
                          style={{
                            padding: "5px 10px",
                            fontSize: 11,
                            background:
                              id === "dahono" ? "#14171F" : "#F1F2F4",
                            color: id === "dahono" ? "#A6F23A" : "#14171F",
                            fontWeight: id === "dahono" ? 700 : 500,
                          }}
                          onClick={() => applyCustomPreset(id)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: 11,
                          fontWeight: 600,
                          marginBottom: 3,
                        }}
                      >
                        Label Provider Custom
                      </label>
                      <input
                        value={settings.aiCustomName}
                        onChange={(e) =>
                          updateSettings({ aiCustomName: e.target.value })
                        }
                        placeholder="Mis. Dahono Router"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: 11,
                          fontWeight: 600,
                          marginBottom: 3,
                        }}
                      >
                        Endpoint Path
                      </label>
                      <input
                        value={settings.aiCustomPath}
                        onChange={(e) =>
                          updateSettings({ aiCustomPath: e.target.value })
                        }
                        placeholder="/chat/completions"
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        settings.aiAuthScheme === "custom-header"
                          ? "1.1fr 0.9fr"
                          : "1fr",
                      gap: 8,
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: 11,
                          fontWeight: 600,
                          marginBottom: 3,
                        }}
                      >
                        Skema Header Autentikasi
                      </label>
                      <select
                        value={settings.aiAuthScheme}
                        onChange={(e) =>
                          updateSettings({
                            aiAuthScheme: e.target.value as AiAuthScheme,
                          })
                        }
                        style={inputStyle}
                      >
                        <option value="bearer">
                          Authorization: Bearer &lt;KEY&gt; (Wajib untuk Dahono
                          Router / OpenAI / OpenRouter)
                        </option>
                        <option value="x-api-key">x-api-key: &lt;KEY&gt;</option>
                        <option value="api-key">Api-Key: &lt;KEY&gt;</option>
                        <option value="custom-header">
                          Nama Header HTTP Kustom (Tanpa Spasi, mis. X-Token)
                        </option>
                        <option value="none">
                          Tanpa API Key (Server Lokal Ollama / LM Studio)
                        </option>
                      </select>
                    </div>

                    {settings.aiAuthScheme === "custom-header" && (
                      <div>
                        <label
                          style={{
                            display: "block",
                            fontSize: 11,
                            fontWeight: 600,
                            marginBottom: 3,
                          }}
                        >
                          Nama Header HTTP (Tanpa Spasi)
                        </label>
                        <input
                          value={settings.aiCustomHeader}
                          onChange={(e) =>
                            updateSettings({
                              aiCustomHeader: e.target.value.replace(
                                /\s+/g,
                                "-"
                              ),
                            })
                          }
                          placeholder="X-PDAM-Token"
                          style={inputStyle}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 4,
                  }}
                >
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    Nama Model
                  </label>
                  {(settings.aiProvider === "custom" ||
                    settings.aiProvider === "gemini") && (
                    <button
                      type="button"
                      onClick={handleLoadCustomModels}
                      style={{
                        border: 0,
                        background: "transparent",
                        color: "#6B7BFF",
                        fontSize: 11.5,
                        fontWeight: 700,
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      {loadingModels
                        ? "Memuat daftar model..."
                        : settings.aiProvider === "gemini"
                        ? "Muat Model Gemini Aktif"
                        : "Muat Daftar Model Server"}
                    </button>
                  )}
                </div>
                <input
                  list="ai-model-options"
                  value={settings.aiModel}
                  onChange={(e) => updateSettings({ aiModel: e.target.value })}
                  placeholder={
                    settings.aiProvider === "custom"
                      ? "dahono/deepseek-v4-flash"
                      : "gemini-2.5-flash atau gemini-3.1-flash-lite"
                  }
                  style={inputStyle}
                />
                <datalist id="ai-model-options">
                  {(settings.aiProvider === "custom"
                    ? customModels
                    : settings.aiProvider === "gemini"
                    ? geminiModels
                    : MODEL_PRESETS[settings.aiProvider]
                  ).map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </div>

              {!(
                settings.aiProvider === "custom" &&
                settings.aiAuthScheme === "none"
              ) && (
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      fontWeight: 600,
                      marginBottom: 4,
                    }}
                  >
                    {settings.aiProvider === "gemini"
                      ? "API Key Google Gemini (Wajib dari Google AI Studio — AIza...)"
                      : "API Key LLM (Opsional — otomatis fallback lokal bila kosong)"}
                  </label>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      type={showLlmKey ? "text" : "password"}
                      autoComplete="off"
                      spellCheck={false}
                      value={settings.aiApiKey}
                      onChange={(e) =>
                        updateSettings({ aiApiKey: e.target.value })
                      }
                      placeholder={
                        settings.aiProvider === "gemini"
                          ? "AIzaSy... (dapatkan di aistudio.google.com/apikey)"
                          : settings.aiProvider === "custom"
                          ? "Tempel API Key gateway (mis. dhn_... / sk-...)"
                          : "Masukkan API Key AI Anda..."
                      }
                      style={inputStyle}
                    />
                    <button
                      type="button"
                      className="pill"
                      style={{ padding: "0 12px", background: "#fff" }}
                      onClick={() => setShowLlmKey((v) => !v)}
                      title={showLlmKey ? "Sembunyikan" : "Tampilkan"}
                    >
                      {showLlmKey ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>

                  {settings.aiProvider === "gemini" &&
                    !settings.aiBaseUrl.trim() &&
                    settings.aiApiKey.trim().length > 0 &&
                    !settings.aiApiKey.trim().startsWith("AIza") && (
                      <div
                        style={{
                          marginTop: 8,
                          background: "#FFF8EB",
                          border: "1px solid #FDE68A",
                          borderRadius: 12,
                          padding: "9px 11px",
                          fontSize: 11.5,
                          color: "#92400E",
                          lineHeight: 1.45,
                        }}
                      >
                        <div>
                          <b>Perhatian Kunci API:</b> Kolom ini masih berisi
                          kunci yang bukan dari Google AI Studio (kunci Gemini
                          resmi selalu diawali <code>AIza...</code>). Itulah
                          penyebab galat <b>HTTP 400</b>.
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: 6,
                            flexWrap: "wrap",
                            marginTop: 6,
                          }}
                        >
                          <button
                            type="button"
                            className="pill"
                            style={{
                              padding: "4px 10px",
                              fontSize: 11,
                              background: "#fff",
                              border: "1px solid #F59E0B",
                              color: "#92400E",
                            }}
                            onClick={() => {
                              writeProviderCache("custom", {
                                apiKey: settings.aiApiKey,
                                baseUrl: "https://gateway.dahono.com/v1",
                                model: "dahono/deepseek-v4-flash",
                              });
                              updateSettings({ aiApiKey: "" });
                              setApiStatus(null);
                            }}
                          >
                            Kosongkan untuk Isi Kunci AIza...
                          </button>
                          <button
                            type="button"
                            className="pill"
                            style={{
                              padding: "4px 10px",
                              fontSize: 11,
                              background: "#14171F",
                              color: "#A6F23A",
                            }}
                            onClick={() => {
                              updateSettings({
                                aiProvider: "custom",
                                aiCustomName: "Dahono Router",
                                aiBaseUrl: "https://gateway.dahono.com/v1",
                                aiCustomPath: "/chat/completions",
                                aiAuthScheme: "bearer",
                                aiModel: "dahono/gemini-4-argon",
                              });
                              setApiStatus(null);
                            }}
                          >
                            Pakai Kunci Ini di Dahono Router
                          </button>
                        </div>
                      </div>
                    )}
                </div>
              )}

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    marginBottom: 4,
                  }}
                >
                  {settings.aiProvider === "custom"
                    ? "Base URL Server Custom AI (Wajib untuk Custom AI)"
                    : "Custom Base URL / Proxy Internal PDAM (Opsional)"}
                </label>
                <input
                  value={settings.aiBaseUrl}
                  onChange={(e) =>
                    updateSettings({ aiBaseUrl: e.target.value })
                  }
                  placeholder={
                    settings.aiProvider === "custom"
                      ? "https://openrouter.ai/api/v1 atau http://localhost:11434/v1"
                      : "Biarkan kosong untuk endpoint resmi"
                  }
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Kolom B: STT & TTS Voice API (+ Custom Endpoint) */}
            <div
              style={{
                background: "#F7F7F8",
                borderRadius: 18,
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700 }}>
                2. Engine Transkrip Audio (STT) & Suara (TTS)
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
                  Provider Speech-to-Text (Transkrip Rapat & Suara)
                </label>
                <select
                  value={settings.sttProvider}
                  onChange={(e) =>
                    updateSettings({
                      sttProvider: e.target.value as AiSttProvider,
                    })
                  }
                  style={inputStyle}
                >
                  <option value="browser">
                    Web Speech API Browser (Real-time Bahasa Indonesia)
                  </option>
                  <option value="openai-whisper">
                    OpenAI Whisper API (whisper-1)
                  </option>
                  <option value="groq-whisper">
                    Groq Whisper Large-v3 Turbo
                  </option>
                  <option value="custom">
                    Custom STT Endpoint (Faster-Whisper / Server Internal)
                  </option>
                </select>
              </div>

              {settings.sttProvider !== "browser" && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      settings.sttProvider === "custom" ? "1.2fr 1fr" : "1fr",
                    gap: 8,
                  }}
                >
                  {settings.sttProvider === "custom" && (
                    <input
                      value={settings.sttBaseUrl}
                      onChange={(e) =>
                        updateSettings({ sttBaseUrl: e.target.value })
                      }
                      placeholder="https://stt.internal/v1/audio/transcriptions"
                      style={inputStyle}
                    />
                  )}
                  <input
                    type="password"
                    autoComplete="off"
                    value={settings.sttApiKey}
                    onChange={(e) =>
                      updateSettings({ sttApiKey: e.target.value })
                    }
                    placeholder="API Key STT (opsional bila sama)"
                    style={inputStyle}
                  />
                </div>
              )}

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    marginBottom: 4,
                  }}
                >
                  Provider Text-to-Speech (Suara Tiara & Pembacaan Notulen)
                </label>
                <select
                  value={settings.ttsProvider}
                  onChange={(e) => {
                    const nextProv = e.target.value as AiTtsProvider;
                    if (nextProv === "elevenlabs") {
                      updateSettings({
                        ttsProvider: nextProv,
                        ttsVoiceId:
                          settings.ttsVoiceId.trim() &&
                          settings.ttsVoiceId !== "nova"
                            ? settings.ttsVoiceId
                            : "EXAVITQu4vr4xnSDxMaL",
                        ttsModelId:
                          settings.ttsModelId?.startsWith("eleven_")
                            ? settings.ttsModelId
                            : "eleven_flash_v2_5",
                      });
                    } else if (nextProv === "cartesia") {
                      updateSettings({
                        ttsProvider: nextProv,
                        cartesiaModelId: settings.cartesiaModelId || "sonic-3",
                        cartesiaVoiceId:
                          settings.cartesiaVoiceId ||
                          "f786b574-daa5-4673-aa0c-cbe3e8534c02",
                        cartesiaBaseUrl:
                          settings.cartesiaBaseUrl || "https://api.cartesia.ai",
                        cartesiaVersion:
                          settings.cartesiaVersion || "2025-04-16",
                      });
                    } else if (nextProv === "openai-tts") {
                      updateSettings({
                        ttsProvider: nextProv,
                        ttsVoiceId: "nova",
                        ttsModelId: "tts-1",
                      });
                    } else {
                      updateSettings({ ttsProvider: nextProv });
                    }
                  }}
                  style={inputStyle}
                >
                  <option value="browser">
                    Suara Bahasa Indonesia Perangkat (Tanpa Kuota)
                  </option>
                  <option value="cartesia">
                    Cartesia Sonic TTS API (Sonic-3 Ultra-Cepat — Bahasa
                    Indonesia)
                  </option>
                  <option value="elevenlabs">
                    ElevenLabs API v1 (Flash v2.5 / Multilingual v2 — Bahasa
                    Indonesia)
                  </option>
                  <option value="openai-tts">
                    OpenAI Neural TTS (Nova / Shimmer)
                  </option>
                  <option value="custom">
                    Custom TTS Endpoint (Kokoro / Piper / Server Internal)
                  </option>
                </select>
              </div>

              {settings.ttsProvider !== "browser" && (
                <div
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #E2E5EC",
                    borderRadius: 14,
                    padding: 12,
                    display: "flex",
                    flexDirection: "column",
                    gap: 9,
                  }}
                >
                  {settings.ttsProvider === "cartesia" ? (
                    <>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <label style={{ fontSize: 11.5, fontWeight: 600 }}>
                          API Key Cartesia (Header X-API-Key / Bearer)
                        </label>
                        <a
                          href="https://docs.cartesia.ai/get-started/overview"
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            fontSize: 11,
                            color: "#6B7BFF",
                            fontWeight: 600,
                            textDecoration: "none",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 3,
                          }}
                        >
                          Docs Cartesia <ExternalLink size={11} />
                        </a>
                      </div>

                      <div style={{ display: "flex", gap: 6 }}>
                        <input
                          type={showTtsKey ? "text" : "password"}
                          autoComplete="off"
                          spellCheck={false}
                          value={settings.cartesiaApiKey}
                          onChange={(e) =>
                            updateSettings({ cartesiaApiKey: e.target.value })
                          }
                          placeholder="Tempel API Key dari play.cartesia.ai (sk_car_...)"
                          style={inputStyle}
                        />
                        <button
                          type="button"
                          className="pill"
                          style={{ padding: "0 12px", background: "#F7F7F8" }}
                          onClick={() => setShowTtsKey((v) => !v)}
                          title={showTtsKey ? "Sembunyikan" : "Tampilkan"}
                        >
                          {showTtsKey ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1.25fr 0.75fr",
                          gap: 8,
                        }}
                      >
                        <div>
                          <label
                            style={{
                              display: "block",
                              fontSize: 11.5,
                              fontWeight: 600,
                              marginBottom: 4,
                            }}
                          >
                            Model Suara Cartesia
                          </label>
                          <select
                            value={
                              ["sonic-3", "sonic-2", "sonic-multilingual"].includes(
                                settings.cartesiaModelId
                              )
                                ? settings.cartesiaModelId
                                : "custom-model"
                            }
                            onChange={(e) => {
                              if (e.target.value !== "custom-model") {
                                updateSettings({
                                  cartesiaModelId: e.target.value,
                                });
                              }
                            }}
                            style={inputStyle}
                          >
                            <option value="sonic-3">
                              sonic-3 (Rekomendasi: Bahasa Indonesia Natural &
                              Latensi Rendah)
                            </option>
                            <option value="sonic-2">
                              sonic-2 (Sonic Generasi 2 Stabil)
                            </option>
                            <option value="sonic-multilingual">
                              sonic-multilingual (Multibahasa Klasik)
                            </option>
                            {!["sonic-3", "sonic-2", "sonic-multilingual"].includes(
                              settings.cartesiaModelId
                            ) && (
                              <option value="custom-model">
                                Custom: {settings.cartesiaModelId}
                              </option>
                            )}
                          </select>
                        </div>

                        <div>
                          <label
                            style={{
                              display: "block",
                              fontSize: 11.5,
                              fontWeight: 600,
                              marginBottom: 4,
                            }}
                          >
                            Model ID Kustom
                          </label>
                          <input
                            value={settings.cartesiaModelId}
                            onChange={(e) =>
                              updateSettings({ cartesiaModelId: e.target.value })
                            }
                            placeholder="sonic-3"
                            style={inputStyle}
                          />
                        </div>
                      </div>

                      <div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 4,
                          }}
                        >
                          <label style={{ fontSize: 11.5, fontWeight: 600 }}>
                            Pilih Karakter Suara / Voice UUID Cartesia
                          </label>
                          <button
                            type="button"
                            onClick={handleLoadCartesiaVoices}
                            style={{
                              border: 0,
                              background: "transparent",
                              color: "#6B7BFF",
                              fontSize: 11.5,
                              fontWeight: 700,
                              cursor: "pointer",
                              padding: 0,
                            }}
                          >
                            {loadingCartesiaVoices
                              ? "Memuat..."
                              : "Muat Daftar Suara Cartesia"}
                          </button>
                        </div>

                        <select
                          value={settings.cartesiaVoiceId || ""}
                          onChange={(e) => {
                            if (e.target.value) {
                              updateSettings({
                                cartesiaVoiceId: e.target.value,
                              });
                            }
                          }}
                          style={{ ...inputStyle, marginBottom: 6 }}
                        >
                          <option value="">
                            -- Pilih Suara Cartesia atau Tempel UUID Manual --
                          </option>
                          {settings.cartesiaVoiceId.trim() &&
                            !cartesiaVoices.some(
                              (v) => v.voiceId === settings.cartesiaVoiceId
                            ) && (
                              <option value={settings.cartesiaVoiceId}>
                                Voice UUID Tersimpan ({settings.cartesiaVoiceId})
                              </option>
                            )}
                          {cartesiaVoices.map((v) => (
                            <option key={v.voiceId} value={v.voiceId}>
                              {v.name}
                            </option>
                          ))}
                        </select>

                        <input
                          value={settings.cartesiaVoiceId}
                          onChange={(e) =>
                            updateSettings({ cartesiaVoiceId: e.target.value })
                          }
                          placeholder="Tempel Voice UUID dari Cartesia Playground (mis. f786b574-daa5-...)"
                          style={inputStyle}
                        />
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1.35fr 0.65fr",
                          gap: 8,
                        }}
                      >
                        <div>
                          <label
                            style={{
                              display: "block",
                              fontSize: 11,
                              fontWeight: 600,
                              marginBottom: 3,
                              color: "#4A505C",
                            }}
                          >
                            Base URL Endpoint Cartesia
                          </label>
                          <input
                            value={settings.cartesiaBaseUrl}
                            onChange={(e) =>
                              updateSettings({ cartesiaBaseUrl: e.target.value })
                            }
                            placeholder="https://api.cartesia.ai"
                            style={inputStyle}
                          />
                        </div>
                        <div>
                          <label
                            style={{
                              display: "block",
                              fontSize: 11,
                              fontWeight: 600,
                              marginBottom: 3,
                              color: "#4A505C",
                            }}
                          >
                            Cartesia-Version
                          </label>
                          <input
                            value={settings.cartesiaVersion}
                            onChange={(e) =>
                              updateSettings({ cartesiaVersion: e.target.value })
                            }
                            placeholder="2025-04-16"
                            style={inputStyle}
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: 11.5,
                          fontWeight: 600,
                          marginBottom: 4,
                        }}
                      >
                        {settings.ttsProvider === "elevenlabs"
                          ? "API Key ElevenLabs (Header xi-api-key)"
                          : "API Key TTS"}
                      </label>
                      <div style={{ display: "flex", gap: 6 }}>
                        <input
                          type={showTtsKey ? "text" : "password"}
                          autoComplete="off"
                          spellCheck={false}
                          value={settings.ttsApiKey}
                          onChange={(e) =>
                            updateSettings({ ttsApiKey: e.target.value })
                          }
                          placeholder={
                            settings.ttsProvider === "elevenlabs"
                              ? "Tempel xi-api-key ElevenLabs (sk_...)"
                              : "API Key TTS..."
                          }
                          style={inputStyle}
                        />
                        <button
                          type="button"
                          className="pill"
                          style={{ padding: "0 12px", background: "#F7F7F8" }}
                          onClick={() => setShowTtsKey((v) => !v)}
                          title={showTtsKey ? "Sembunyikan" : "Tampilkan"}
                        >
                          {showTtsKey ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>
                  )}

                  {settings.ttsProvider === "elevenlabs" && (
                    <>
                      <div>
                        <label
                          style={{
                            display: "block",
                            fontSize: 11.5,
                            fontWeight: 600,
                            marginBottom: 4,
                          }}
                        >
                          Model Suara ElevenLabs
                        </label>
                        <select
                          value={settings.ttsModelId || "eleven_flash_v2_5"}
                          onChange={(e) =>
                            updateSettings({ ttsModelId: e.target.value })
                          }
                          style={inputStyle}
                        >
                          <option value="eleven_flash_v2_5">
                            Eleven Flash v2.5 (Rekomendasi: Bahasa Indonesia
                            Cepat & Hemat 50% Kredit)
                          </option>
                          <option value="eleven_multilingual_v2">
                            Eleven Multilingual v2 (Kualitas Studio Tinggi)
                          </option>
                          <option value="eleven_turbo_v2_5">
                            Eleven Turbo v2.5 (Seimbang Cepat & Natural)
                          </option>
                        </select>
                      </div>

                      <div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 4,
                          }}
                        >
                          <label style={{ fontSize: 11.5, fontWeight: 600 }}>
                            Pilih Karakter Suara / Voice ID
                          </label>
                          <button
                            type="button"
                            onClick={handleLoadElevenLabsVoices}
                            style={{
                              border: 0,
                              background: "transparent",
                              color: "#6B7BFF",
                              fontSize: 11.5,
                              fontWeight: 700,
                              cursor: "pointer",
                              padding: 0,
                            }}
                          >
                            {loadingElevenVoices
                              ? "Memuat..."
                              : "Muat Daftar Suara Akun"}
                          </button>
                        </div>
                        <select
                          value={settings.ttsVoiceId || ""}
                          onChange={(e) => {
                            if (e.target.value) {
                              updateSettings({ ttsVoiceId: e.target.value });
                            }
                          }}
                          style={{ ...inputStyle, marginBottom: 6 }}
                        >
                          <option value="">
                            -- Pilih dari Preset / Akun atau Ketik Voice ID
                            Manual --
                          </option>
                          {settings.ttsVoiceId.trim() &&
                            !elevenVoices.some(
                              (v) => v.voiceId === settings.ttsVoiceId
                            ) && (
                              <option value={settings.ttsVoiceId}>
                                Suara Tersimpan ({settings.ttsVoiceId})
                              </option>
                            )}
                          {elevenVoices.map((v) => (
                            <option key={v.voiceId} value={v.voiceId}>
                              {v.name}
                            </option>
                          ))}
                        </select>

                        <input
                          value={settings.ttsVoiceId}
                          onChange={(e) =>
                            updateSettings({ ttsVoiceId: e.target.value })
                          }
                          placeholder="Atau tempel Voice ID kustom dari ElevenLabs Voice Library..."
                          style={inputStyle}
                        />
                      </div>
                    </>
                  )}

                  {settings.ttsProvider !== "elevenlabs" &&
                    settings.ttsProvider !== "cartesia" && (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          settings.ttsProvider === "custom"
                            ? "1.3fr 0.7fr"
                            : "1fr",
                        gap: 8,
                      }}
                    >
                      {settings.ttsProvider === "custom" && (
                        <input
                          value={settings.ttsBaseUrl}
                          onChange={(e) =>
                            updateSettings({ ttsBaseUrl: e.target.value })
                          }
                          placeholder="https://tts.internal/v1/audio/speech"
                          style={inputStyle}
                        />
                      )}
                      <input
                        value={settings.ttsVoiceId}
                        onChange={(e) =>
                          updateSettings({ ttsVoiceId: e.target.value })
                        }
                        placeholder="Voice ID (mis. nova / shimmer)"
                        style={inputStyle}
                      />
                    </div>
                  )}

                  {ttsStatus && (
                    <div
                      style={{
                        background: ttsStatus.ok ? "#F3FCE6" : "#FFF4F2",
                        border: `1px solid ${
                          ttsStatus.ok ? "#C9EE8F" : "#FECACA"
                        }`,
                        borderRadius: 10,
                        padding: "8px 10px",
                        fontSize: 11.5,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      {ttsStatus.ok ? (
                        <CheckCircle2 size={14} color="#3B7A00" />
                      ) : (
                        <AlertCircle size={14} color="#B42318" />
                      )}
                      <span>{ttsStatus.msg}</span>
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="pill"
                      style={{
                        background: "#14171F",
                        color: "#A6F23A",
                        padding: "7px 13px",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                      onClick={handleTestCloudTts}
                    >
                      <Volume2 size={14} />{" "}
                      {testingTts
                        ? "Memutar Suara..."
                        : settings.ttsProvider === "elevenlabs"
                          ? "Uji Suara ElevenLabs Sekarang"
                          : settings.ttsProvider === "cartesia"
                            ? "Uji Suara Cartesia Sekarang"
                            : "Uji Suara Cloud TTS"}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                    fontWeight: 600,
                    marginBottom: 4,
                  }}
                >
                  <span>Kecepatan Baca Notulen oleh Tiara</span>
                  <b>{settings.speechRate.toFixed(2)}x</b>
                </div>
                <input
                  type="range"
                  min={0.85}
                  max={1.3}
                  step={0.05}
                  value={settings.speechRate}
                  onChange={(e) =>
                    updateSettings({ speechRate: Number(e.target.value) })
                  }
                  style={{ width: "100%", accentColor: "#6B7BFF" }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  paddingTop: 4,
                }}
              >
                <button
                  type="button"
                  className="pill"
                  style={{
                    background: "#6B7BFF",
                    color: "#FFFFFF",
                    fontWeight: 700,
                    padding: "9px 16px",
                    fontSize: 12.5,
                  }}
                  onClick={() =>
                    saveSettingsNow("Pengaturan Suara & Engine TTS")
                  }
                >
                  <Save size={14} /> Simpan Pengaturan Suara
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 1. Pengaturan Suara Asisten Tiara + Proteksi Anti-Gema Speaker */}
        <section
          className="c"
          style={{ display: "flex", flexDirection: "column", gap: 15 }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>
                Asisten Suara “Tiara” & Anti-Gema
              </div>
              <div style={{ fontSize: 12, color: "#4A505C" }}>
                Panggilan otomatis “Hey Tiara” serta peredam pantulan suara
                speaker
              </div>
            </div>
            <button
              type="button"
              className="pill"
              style={{
                background: assistantEnabled ? "#A6F23A" : "#14171F",
                color: assistantEnabled ? "#14171F" : "#fff",
                fontWeight: 600,
              }}
              onClick={toggleWakeWordListening}
            >
              <Mic size={15} />{" "}
              {assistantEnabled ? "Mikrofon Aktif" : "Aktifkan Mikrofon"}
            </button>
          </div>

          <label
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#F7F7F8",
              padding: "12px 14px",
              borderRadius: 14,
              cursor: "pointer",
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                Deteksi Panggilan “Hey Tiara / Halo Tiara”
              </div>
              <div style={{ fontSize: 12, color: "#4A505C" }}>
                Otomatis merespon & menyambung percakapan multi-turn
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.wakeWordAktif}
              onChange={(e) =>
                updateSettings({ wakeWordAktif: e.target.checked })
              }
              style={{ width: 20, height: 20, accentColor: "#6B7BFF" }}
            />
          </label>

          {/* Kontrol Baru: Proteksi Anti-Gema Speaker (Anti-Self-Echo) */}
          <div
            style={{
              background: "#F4F6FF",
              border: "1px solid #DCE1FF",
              borderRadius: 14,
              padding: "12px 14px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <label
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
                gap: 10,
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#14171F" }}>
                  Filter Anti-Gema Speaker (Cegah Dengar Suara Sendiri)
                </div>
                <div style={{ fontSize: 11.5, color: "#4A505C" }}>
                  Memutus mikrofon penuh saat Tiara berbicara & membuang
                  transkrip pantulan speaker laptop agar tidak menjawab sendiri
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.echoGuardAktif}
                onChange={(e) =>
                  updateSettings({ echoGuardAktif: e.target.checked })
                }
                style={{
                  width: 20,
                  height: 20,
                  accentColor: "#6B7BFF",
                  flexShrink: 0,
                }}
              />
            </label>

            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 3,
                }}
              >
                <span>Jeda Redam Speaker Sebelum Mikrofon Aktif Kembali</span>
                <b>{(settings.micResumeDelayMs / 1000).toFixed(1)} detik</b>
              </div>
              <input
                type="range"
                min={700}
                max={2500}
                step={100}
                value={settings.micResumeDelayMs}
                onChange={(e) =>
                  updateSettings({ micResumeDelayMs: Number(e.target.value) })
                }
                style={{ width: "100%", accentColor: "#6B7BFF" }}
              />
              <div style={{ fontSize: 11, color: "#4A505C" }}>
                Naikkan ke 1.8 – 2.2 detik bila volume speaker luar disetel
                keras di ruangan bergema.
              </div>
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
              Pilih Suara Bahasa Indonesia (Browser TTS)
            </label>
            <select
              value={settings.selectedVoiceURI}
              onChange={(e) =>
                updateSettings({ selectedVoiceURI: e.target.value })
              }
              style={inputStyle}
            >
              <option value="">
                Otomatis (Prioritas Suara Perempuan Bahasa Indonesia)
              </option>
              {voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
              Waktu Pengumuman Suara Otomatis Sebelum Acara
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                [30, "30 menit sebelum"],
                [5, "5 menit sebelum"],
                [0, "Tepat saat mulai"],
              ].map(([val, label]) => {
                const active = settings.pengingatMenit.includes(val as number);
                return (
                  <button
                    key={val}
                    type="button"
                    className="pill"
                    style={{
                      padding: "8px 14px",
                      fontSize: 12,
                      background: active ? "#6B7BFF" : "#F1F2F4",
                      color: active ? "#fff" : "#14171F",
                    }}
                    onClick={() => toggleMenit(val as number)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
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
                Jam Senyap Mulai
              </label>
              <input
                type="time"
                value={settings.jamSenyapMulai}
                onChange={(e) =>
                  updateSettings({ jamSenyapMulai: e.target.value })
                }
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
                Jam Senyap Selesai
              </label>
              <input
                type="time"
                value={settings.jamSenyapSelesai}
                onChange={(e) =>
                  updateSettings({ jamSenyapSelesai: e.target.value })
                }
                style={inputStyle}
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 2,
            }}
          >
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className="pill"
                style={{ background: "#A6F23A", color: "#14171F", fontWeight: 600 }}
                onClick={() => simulateWakeWord()}
              >
                <Volume2 size={15} /> Uji Sapaan “Halo Tiara”
              </button>
              <button
                type="button"
                className="pill"
                style={{ background: "#14171F", color: "#fff" }}
                onClick={() => triggerReminderAnnouncement()}
              >
                <Bell size={15} /> Uji Pengumuman Rapat
              </button>
            </div>
            <button
              type="button"
              className="pill"
              style={{
                background: "#6B7BFF",
                color: "#FFFFFF",
                fontWeight: 700,
              }}
              onClick={() =>
                saveSettingsNow("Pengaturan Asisten Suara Tiara")
              }
            >
              <Save size={14} /> Simpan Pengaturan Suara
            </button>
          </div>
        </section>

        {/* 2. Profil Dirut, Hak Akses & Gateway WhatsApp Wangsaf */}
        <section
          className="c"
          style={{ display: "flex", flexDirection: "column", gap: 15 }}
        >
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              Profil Eksekutif & Gateway Wangsaf
            </div>
            <div style={{ fontSize: 12, color: "#4A505C" }}>
              Personalisasi sapaan Beranda dan integrasi resmi{" "}
              <b>Wangsaf WhatsApp API v1</b>
            </div>
          </div>

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 5,
                }}
              >
                Nama Sapaan Dashboard
              </label>
              <input
                value={settings.namaDirut}
                onChange={(e) => updateSettings({ namaDirut: e.target.value })}
                placeholder="Pak Dirut"
                style={inputStyle}
              />
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                Peran Aktif Saat Ini
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  className="pill"
                  style={{
                    flex: 1,
                    padding: "9px 10px",
                    fontSize: 12,
                    background:
                      settings.peranAktif === "dirut" ? "#14171F" : "#F1F2F4",
                    color: settings.peranAktif === "dirut" ? "#fff" : "#14171F",
                  }}
                  onClick={() => setActiveRole("dirut")}
                >
                  Dirut (DR)
                </button>
                <button
                  type="button"
                  className="pill"
                  style={{
                    flex: 1,
                    padding: "9px 10px",
                    fontSize: 12,
                    background:
                      settings.peranAktif === "sekretariat"
                        ? "#6B7BFF"
                        : "#F1F2F4",
                    color:
                      settings.peranAktif === "sekretariat"
                        ? "#fff"
                        : "#14171F",
                  }}
                  onClick={() => setActiveRole("sekretariat")}
                >
                  Sekretariat
                </button>
              </div>
            </div>
          </div>

          {/* Adapter Gateway WhatsApp: Wangsaf API v1 */}
          <div
            style={{
              borderTop: "1px solid #ECEDF0",
              paddingTop: 14,
              display: "flex",
              flexDirection: "column",
              gap: 11,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 6,
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 700 }}>
                Integrasi WhatsApp Gateway (Wangsaf)
              </div>
              <a
                href="https://docs.wangsaf.com/"
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: 12,
                  color: "#6B7BFF",
                  fontWeight: 600,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                Dokumentasi Wangsaf <ExternalLink size={12} />
              </a>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.25fr 0.95fr",
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
                  Adapter Provider
                </label>
                <select
                  value={settings.waGateway}
                  onChange={(e) =>
                    updateSettings({
                      waGateway: e.target.value as WaGatewayProvider,
                    })
                  }
                  style={inputStyle}
                >
                  <option value="Wangsaf">Wangsaf API v1 (Utama)</option>
                  <option value="WhatsApp Business API">
                    WhatsApp Business Cloud API
                  </option>
                  <option value="Custom Webhook">Custom Webhook Internal</option>
                </select>
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
                  Jam Briefing Pagi Otomatis
                </label>
                <input
                  type="time"
                  value={settings.jamBriefingPagi}
                  onChange={(e) =>
                    updateSettings({ jamBriefingPagi: e.target.value })
                  }
                  style={inputStyle}
                />
              </div>
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
                Base URL Endpoint{" "}
                {settings.waGateway === "Wangsaf" ? "Wangsaf v1" : "Gateway"}
              </label>
              <input
                value={settings.waBaseUrl}
                onChange={(e) => updateSettings({ waBaseUrl: e.target.value })}
                placeholder="https://api.wangsaf.com/v1"
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
                {settings.waGateway === "Wangsaf"
                  ? "Api-Key Perangkat Wangsaf (Header Api-Key)"
                  : "Token / Bearer Key Gateway"}
              </label>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  type={showWaKey ? "text" : "password"}
                  autoComplete="off"
                  spellCheck={false}
                  value={settings.waApiToken}
                  onChange={(e) =>
                    updateSettings({ waApiToken: e.target.value })
                  }
                  placeholder={
                    settings.waGateway === "Wangsaf"
                      ? "Salin Api-Key dari menu Perangkat di dashboard Wangsaf..."
                      : "Masukkan token gateway..."
                  }
                  style={inputStyle}
                />
                <button
                  type="button"
                  className="pill"
                  style={{ padding: "0 12px", background: "#F7F7F8" }}
                  onClick={() => setShowWaKey((v) => !v)}
                  title={showWaKey ? "Sembunyikan" : "Tampilkan"}
                >
                  {showWaKey ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <div style={{ fontSize: 11, color: "#4A505C", marginTop: 4 }}>
                Kosongkan untuk mode simulasi lokal. Saat diisi, pesan dikirim
                nyata ke <code>POST /chat/send-text</code> dengan header{" "}
                <code>Api-Key</code>.
              </div>
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
                Label / Nomor Perangkat Pengirim
              </label>
              <input
                value={settings.waNomorKhusus}
                onChange={(e) =>
                  updateSettings({ waNomorKhusus: e.target.value })
                }
                style={inputStyle}
              />
            </div>

            {/* Kirim Tes Pesan Langsung ke Nomor WhatsApp Pilihan */}
            <div
              style={{
                background: "#F7F8FA",
                border: "1px solid #E5E7EB",
                borderRadius: 14,
                padding: 12,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Tes Kirim Pesan Langsung ke Nomor WhatsApp
              </label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input
                  value={directWaPhone}
                  onChange={(e) => setDirectWaPhone(e.target.value)}
                  placeholder="Contoh: 62881080610640 atau 08123456789"
                  style={{ ...inputStyle, flex: "1 1 200px" }}
                />
                <button
                  type="button"
                  className="pill"
                  disabled={sendingDirectWa}
                  style={{
                    background: "#16A34A",
                    color: "#FFFFFF",
                    fontWeight: 700,
                    padding: "9px 14px",
                    fontSize: 12.5,
                  }}
                  onClick={handleSendDirectWa}
                >
                  <Send size={13} />{" "}
                  {sendingDirectWa ? "Mengirim..." : "Kirim Tes WA"}
                </button>
              </div>
              <div style={{ fontSize: 11, color: "#4A505C" }}>
                Mengirim 1 pesan uji coba nyata via relay anti-CORS Wangsaf ke
                nomor di atas (tanpa perlu mengubah daftar penerima briefing).
              </div>
            </div>

            {waDeviceStatus && (
              <div
                style={{
                  background: waDeviceStatus.connected ? "#F3FCE6" : "#FFF8EB",
                  border: `1px solid ${
                    waDeviceStatus.connected ? "#C9EE8F" : "#FDE68A"
                  }`,
                  borderRadius: 12,
                  padding: "9px 12px",
                  fontSize: 12,
                  color: "#14171F",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {waDeviceStatus.connected ? (
                  <CheckCircle2 size={15} color="#3B7A00" />
                ) : (
                  <AlertCircle size={15} color="#B45309" />
                )}
                <span>{waDeviceStatus.msg}</span>
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {settings.waGateway === "Wangsaf" && (
                  <button
                    type="button"
                    className="pill"
                    style={{ background: "#14171F", color: "#fff" }}
                    onClick={handleCheckWangsafDevice}
                  >
                    <Wifi size={14} />{" "}
                    {checkingWa
                      ? "Mengecek..."
                      : "Cek Perangkat Wangsaf (0 Token)"}
                  </button>
                )}

                <button
                  type="button"
                  className="pill"
                  style={{
                    background: "#6B7BFF",
                    color: "#fff",
                  }}
                  onClick={sendTestWaBriefing}
                >
                  <Send size={14} /> Uji Kirim Briefing Pagi
                </button>
              </div>

              <button
                type="button"
                className="pill"
                style={{
                  background: "#14171F",
                  color: "#FFFFFF",
                  fontWeight: 600,
                }}
                onClick={() => saveSettingsNow("Konfigurasi WhatsApp Wangsaf")}
              >
                <Save size={14} /> Simpan Konfigurasi WA
              </button>
            </div>
          </div>
        </section>

        {/* 3. Daftar Penerima & Log Pengiriman WhatsApp */}
        <section className="c" style={{ gridColumn: "1 / -1" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 24,
            }}
          >
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 10 }}>
                Daftar Penerima Jadwal WhatsApp (Format Otomatis 628xx)
              </div>
              {recipients.map((r) => (
                <label
                  key={r.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 0",
                    borderBottom: "1px solid #ECEDF0",
                    cursor: "pointer",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>
                      {r.nama}
                    </div>
                    <div style={{ fontSize: 12, color: "#4A505C" }}>
                      {r.noWa} ·{" "}
                      {r.peran === "dirut" ? "Dirut" : "Sekretariat"}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={r.aktif}
                    onChange={() => toggleRecipient(r.id)}
                    style={{ width: 18, height: 18, accentColor: "#6B7BFF" }}
                  />
                </label>
              ))}

              <form
                onSubmit={handleAddRecipient}
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  marginTop: 12,
                }}
              >
                <input
                  value={newNama}
                  onChange={(e) => setNewNama(e.target.value)}
                  placeholder="Nama staf / pejabat"
                  style={{
                    flex: "1 1 130px",
                    padding: "9px 12px",
                    borderRadius: 12,
                    border: "1px solid #D5D8DD",
                    fontSize: 13,
                  }}
                />
                <input
                  value={newNoWa}
                  onChange={(e) => setNewNoWa(e.target.value)}
                  placeholder="08xx / 628xx"
                  style={{
                    flex: "1 1 120px",
                    padding: "9px 12px",
                    borderRadius: 12,
                    border: "1px solid #D5D8DD",
                    fontSize: 13,
                  }}
                />
                <select
                  value={newPeran}
                  onChange={(e) => setNewPeran(e.target.value as UserRole)}
                  style={{
                    padding: "9px 10px",
                    borderRadius: 12,
                    border: "1px solid #D5D8DD",
                    fontSize: 13,
                    background: "#fff",
                  }}
                >
                  <option value="sekretariat">Sekretariat</option>
                  <option value="dirut">Dirut</option>
                </select>
                <button
                  type="submit"
                  className="pill"
                  style={{ background: "#14171F", color: "#fff" }}
                >
                  <Plus size={14} /> Tambah
                </button>
              </form>
            </div>

            <div>
              <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 10 }}>
                Log Pengiriman WhatsApp ({settings.waGateway})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {waLogs.slice(0, 6).map((log) => (
                  <div
                    key={log.id}
                    style={{
                      background: "#F7F7F8",
                      borderRadius: 14,
                      padding: "11px 14px",
                      fontSize: 13,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <b>
                        {log.waktu} · {log.tujuan}
                      </b>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          borderRadius: 999,
                          padding: "3px 10px",
                          background:
                            log.status === "Terkirim"
                              ? "#A6F23A"
                              : log.status === "Gagal"
                              ? "#FEE2E2"
                              : "#E4E7FF",
                          color:
                            log.status === "Terkirim"
                              ? "#14171F"
                              : log.status === "Gagal"
                              ? "#B42318"
                              : "#2F3DB5",
                        }}
                      >
                        {log.status}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#4A505C",
                        marginTop: 4,
                      }}
                    >
                      {log.isi}
                    </div>
                    {log.chatId && (
                      <div
                        style={{
                          fontSize: 11,
                          color: "#6B7BFF",
                          marginTop: 3,
                          fontWeight: 600,
                        }}
                      >
                        Wangsaf Chat ID: {log.chatId}
                      </div>
                    )}
                    {log.status !== "Terkirim" && (
                      <button
                        type="button"
                        className="pill"
                        style={{
                          marginTop: 6,
                          padding: "4px 10px",
                          fontSize: 11,
                        }}
                        onClick={() => retryWaLog(log.id)}
                      >
                        <RefreshCw size={12} /> Kirim Ulang
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
