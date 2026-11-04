import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Cpu,
  ExternalLink,
  Eye,
  EyeOff,
  Lock,
  RefreshCw,
  Save,
  Trash2,
  Zap,
} from "lucide-react";
import { fetchCustomProviderModels } from "@/lib/ai-service";
import { usePdamStore } from "@/lib/pdam-store";
import type { AiAuthScheme, AiLlmProvider, AiSttProvider } from "@/lib/types";

interface TabAiSettingsProps {
  showApiKey: boolean;
  setShowApiKey: (show: boolean) => void;
  showSttKey: boolean;
  setShowSttKey: (show: boolean) => void;
  inputStyle: React.CSSProperties;
}

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
  groq: [
    "qwen/qwen3.8-27b",
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "deepseek-r1-distill-llama-70b",
  ],
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

export function TabAiSettings({
  showApiKey,
  setShowApiKey,
  showSttKey,
  setShowSttKey,
  inputStyle,
}: TabAiSettingsProps) {
  const {
    settings,
    updateSettings,
    saveSettingsNow,
    clearAllApiKeys,
    testAiConnection,
  } = usePdamStore();

  const [customModels, setCustomModels] = useState<string[]>(
    MODEL_PRESETS.custom
  );
  const [geminiModels] = useState<string[]>(MODEL_PRESETS.gemini);
  const [loadingModels, setLoadingModels] = useState(false);
  const [testingApi, setTestingApi] = useState(false);
  const [apiStatus, setApiStatus] = useState<{
    ok: boolean;
    msg: string;
  } | null>(null);

  const isOfficialGoogle =
    settings.aiProvider === "gemini" && !settings.aiBaseUrl.trim();
  const hasInvalidGoogleKey =
    isOfficialGoogle &&
    settings.aiApiKey.trim().length > 0 &&
    settings.aiApiKey.trim().length < 15;

  const isGroq = settings.aiProvider === "groq";

  const handleProviderChange = (prov: AiLlmProvider) => {
    const defaultModel = MODEL_PRESETS[prov]?.[0] || "";
    setApiStatus(null);

    if (prov === "custom") {
      updateSettings({
        aiProvider: prov,
        aiCustomName: settings.aiCustomName || "Dahono Router",
        aiModel: defaultModel,
        aiBaseUrl: settings.aiBaseUrl || "https://gateway.dahono.com/v1",
        aiCustomPath: settings.aiCustomPath || "/chat/completions",
        aiAuthScheme: settings.aiAuthScheme || "bearer",
      });
      return;
    }

    if (prov === "groq") {
      updateSettings({
        aiProvider: prov,
        aiModel: "qwen/qwen3.8-27b",
        aiBaseUrl: "https://api.groq.com/openai/v1",
        sttProvider: "groq-whisper",
      });
      return;
    }

    updateSettings({
      aiProvider: prov,
      aiModel: defaultModel,
      aiBaseUrl:
        prov === "openai"
          ? "https://api.openai.com/v1"
          : prov === "anthropic"
          ? "https://api.anthropic.com/v1"
          : "",
    });
  };

  const handleApplyCustomPreset = (
    preset: "dahono" | "openrouter" | "deepseek" | "ollama" | "lmstudio"
  ) => {
    setApiStatus(null);
    if (preset === "dahono") {
      updateSettings({
        aiProvider: "custom",
        aiCustomName: "Dahono Router",
        aiBaseUrl: "https://gateway.dahono.com/v1",
        aiCustomPath: "/chat/completions",
        aiAuthScheme: "bearer",
        aiModel: "dahono/deepseek-v4-flash",
      });
    } else if (preset === "openrouter") {
      updateSettings({
        aiProvider: "custom",
        aiCustomName: "OpenRouter",
        aiBaseUrl: "https://openrouter.ai/api/v1",
        aiCustomPath: "/chat/completions",
        aiAuthScheme: "bearer",
        aiModel: "google/gemini-2.5-flash",
      });
    } else if (preset === "deepseek") {
      updateSettings({
        aiProvider: "custom",
        aiCustomName: "DeepSeek Official",
        aiBaseUrl: "https://api.deepseek.com",
        aiCustomPath: "/chat/completions",
        aiAuthScheme: "bearer",
        aiModel: "deepseek-chat",
      });
    } else if (preset === "ollama") {
      updateSettings({
        aiProvider: "custom",
        aiCustomName: "Ollama Lokal (PC/Server)",
        aiBaseUrl: "http://localhost:11434/v1",
        aiCustomPath: "/chat/completions",
        aiAuthScheme: "none",
        aiModel: "llama3.2:latest",
      });
    } else if (preset === "lmstudio") {
      updateSettings({
        aiProvider: "custom",
        aiCustomName: "LM Studio Lokal",
        aiBaseUrl: "http://localhost:1234/v1",
        aiCustomPath: "/chat/completions",
        aiAuthScheme: "none",
        aiModel: "local-model",
      });
    }
  };

  const handleLoadCustomModels = async () => {
    if (!settings.aiBaseUrl.trim()) return;
    setLoadingModels(true);
    try {
      const res = await fetchCustomProviderModels(settings);
      if (res.ok && res.models && res.models.length > 0) {
        setCustomModels(res.models);
        setApiStatus({
          ok: true,
          msg: `Berhasil menemukan ${res.models.length} model dari server!`,
        });
      } else {
        setApiStatus({
          ok: false,
          msg: res.message || "Endpoint merespons tetapi tidak mengembalikan daftar model.",
        });
      }
    } catch {
      setApiStatus({
        ok: false,
        msg: "Gagal menarik daftar model dari endpoint.",
      });
    } finally {
      setLoadingModels(false);
    }
  };

  const handleTestApi = async () => {
    setTestingApi(true);
    setApiStatus(null);
    try {
      const res = await testAiConnection();
      setApiStatus({
        ok: res.ok,
        msg: res.message,
      });
    } catch (e) {
      setApiStatus({
        ok: false,
        msg: e instanceof Error ? e.message : "Gagal menguji koneksi AI.",
      });
    } finally {
      setTestingApi(false);
    }
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
        gap: 16,
      }}
    >
      {/* KARTU 1: PROVIDER AI UTAMA & MODEL */}
      <section
        className="c"
        style={{
          border: "2px solid #E4E7FF",
          display: "flex",
          flexDirection: "column",
          gap: 16,
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
              Otak Utama Asisten AI (LLM)
            </div>
            <div style={{ fontSize: 12, color: "#4A505C" }}>
              Penalaran pertanyaan, jadwal, notulen rapat & diskusi umum
            </div>
          </div>
        </div>

        {/* PILIH PROVIDER AI */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 4,
            }}
          >
            Penyedia Layanan AI (AI Provider)
          </label>
          <select
            value={settings.aiProvider}
            onChange={(e) =>
              handleProviderChange(e.target.value as AiLlmProvider)
            }
            style={{
              ...inputStyle,
              background: "#F7F8FA",
              fontWeight: 600,
            }}
          >
            <option value="groq">Groq Cloud (Qwen 3.8-27b & Whisper Super Cepat)</option>
            <option value="gemini">Google Gemini (Gemini 2.5 Flash / Pro)</option>
            <option value="custom">Custom AI Endpoint (Dahono Router / OpenRouter / DeepSeek / Ollama)</option>
            <option value="openai">OpenAI (GPT-4o / GPT-4o-mini)</option>
            <option value="anthropic">Anthropic (Claude 3.5 Sonnet / Haiku)</option>
          </select>
        </div>

        {/* PRESET TOMBOL CEPAT JIKA CUSTOM */}
        {settings.aiProvider === "custom" && (
          <div
            style={{
              background: "#F0F4FF",
              borderRadius: 12,
              padding: "10px 12px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: "#1E3A8A" }}>
              Preset Endpoint Cepat:
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              <button
                type="button"
                className="pill"
                style={{
                  fontSize: 11,
                  padding: "4px 10px",
                  background:
                    settings.aiCustomName === "Dahono Router"
                      ? "#1E3A8A"
                      : "#FFFFFF",
                  color:
                    settings.aiCustomName === "Dahono Router"
                      ? "#FFFFFF"
                      : "#1E3A8A",
                  fontWeight: 600,
                }}
                onClick={() => handleApplyCustomPreset("dahono")}
              >
                Dahono Router (DeepSeek v4 / Qwen)
              </button>
              <button
                type="button"
                className="pill"
                style={{ fontSize: 11, padding: "4px 10px", background: "#FFFFFF", color: "#14171F" }}
                onClick={() => handleApplyCustomPreset("openrouter")}
              >
                OpenRouter
              </button>
              <button
                type="button"
                className="pill"
                style={{ fontSize: 11, padding: "4px 10px", background: "#FFFFFF", color: "#14171F" }}
                onClick={() => handleApplyCustomPreset("deepseek")}
              >
                DeepSeek Official
              </button>
              <button
                type="button"
                className="pill"
                style={{ fontSize: 11, padding: "4px 10px", background: "#FFFFFF", color: "#14171F" }}
                onClick={() => handleApplyCustomPreset("ollama")}
              >
                Ollama Lokal
              </button>
              <button
                type="button"
                className="pill"
                style={{ fontSize: 11, padding: "4px 10px", background: "#FFFFFF", color: "#14171F" }}
                onClick={() => handleApplyCustomPreset("lmstudio")}
              >
                LM Studio
              </button>
            </div>
          </div>
        )}

        {/* FIELD NAMA & BASE URL CUSTOM */}
        {settings.aiProvider === "custom" && (
          <>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Label Penyedia Custom
              </label>
              <input
                value={settings.aiCustomName}
                onChange={(e) => updateSettings({ aiCustomName: e.target.value })}
                placeholder="Contoh: Dahono Router / Server PDAM"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Base URL Endpoint (OpenAI Compatible)
              </label>
              <input
                value={settings.aiBaseUrl}
                onChange={(e) => updateSettings({ aiBaseUrl: e.target.value })}
                placeholder="https://gateway.dahono.com/v1"
                style={inputStyle}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Skema Autentikasi
                </label>
                <select
                  value={settings.aiAuthScheme}
                  onChange={(e) => updateSettings({ aiAuthScheme: e.target.value as AiAuthScheme })}
                  style={inputStyle}
                >
                  <option value="bearer">Bearer Token (Default)</option>
                  <option value="api-key">Api-Key Header</option>
                  <option value="x-api-key">X-API-Key Header</option>
                  <option value="none">Tanpa Kunci (Lokal Ollama)</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Path Chat
                </label>
                <input
                  value={settings.aiCustomPath}
                  onChange={(e) => updateSettings({ aiCustomPath: e.target.value })}
                  placeholder="/chat/completions"
                  style={inputStyle}
                />
              </div>
            </div>
          </>
        )}

        {/* MODEL SELECTION & PRESETS */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <label style={{ fontSize: 12, fontWeight: 600 }}>
              Nama Model AI ({settings.aiProvider.toUpperCase()})
            </label>
            {settings.aiProvider === "custom" && (
              <button
                type="button"
                className="pill"
                style={{ fontSize: 11, padding: "2px 8px", background: "#F3F4F6", color: "#1F2937" }}
                onClick={handleLoadCustomModels}
                disabled={loadingModels}
              >
                <RefreshCw size={11} className={loadingModels ? "spin" : ""} />{" "}
                {loadingModels ? "Memuat..." : "Tarik Model"}
              </button>
            )}
          </div>

          <input
            list="model-options"
            value={settings.aiModel}
            onChange={(e) => updateSettings({ aiModel: e.target.value })}
            placeholder={
              isGroq
                ? "qwen/qwen3.8-27b"
                : settings.aiProvider === "gemini"
                ? "gemini-2.5-flash"
                : "Nama model..."
            }
            style={inputStyle}
          />

          <datalist id="model-options">
            {(settings.aiProvider === "custom"
              ? customModels
              : settings.aiProvider === "gemini"
              ? geminiModels
              : MODEL_PRESETS[settings.aiProvider] || []
            ).map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>

          {isGroq && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              {MODEL_PRESETS.groq.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => updateSettings({ aiModel: m })}
                  style={{
                    fontSize: 11,
                    padding: "3px 8px",
                    borderRadius: 999,
                    border: settings.aiModel === m ? "1px solid #14171F" : "1px solid #D1D5DB",
                    background: settings.aiModel === m ? "#14171F" : "#F9FAFB",
                    color: settings.aiModel === m ? "#FFFFFF" : "#374151",
                    cursor: "pointer",
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* API KEY INPUT */}
        {!(settings.aiProvider === "custom" && settings.aiAuthScheme === "none") && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 600 }}>
                API Key {isGroq ? "Groq (gsk_...)" : settings.aiProvider.toUpperCase()}
              </label>
              {isGroq && (
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: 11, color: "#2563EB", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 3 }}
                >
                  Dapatkan Kunci Gratis <ExternalLink size={11} />
                </a>
              )}
              {settings.aiProvider === "gemini" && (
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: 11, color: "#2563EB", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 3 }}
                >
                  Google AI Studio <ExternalLink size={11} />
                </a>
              )}
            </div>

            <div style={{ display: "flex", gap: 6 }}>
              <input
                type={showApiKey ? "text" : "password"}
                autoComplete="off"
                spellCheck={false}
                value={settings.aiApiKey}
                onChange={(e) => updateSettings({ aiApiKey: e.target.value })}
                placeholder={
                  isGroq
                    ? "gsk_..."
                    : settings.aiProvider === "gemini"
                    ? "AIza... atau AQ..."
                    : "Tempel API Key di sini..."
                }
                style={{
                  ...inputStyle,
                  borderColor: hasInvalidGoogleKey ? "#EF4444" : "#D5D8DD",
                }}
              />
              <button
                type="button"
                className="pill"
                style={{ padding: "0 12px", background: "#F7F7F8" }}
                onClick={() => setShowApiKey(!showApiKey)}
                title={showApiKey ? "Sembunyikan" : "Tampilkan"}
              >
                {showApiKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {hasInvalidGoogleKey && (
              <div style={{ color: "#EF4444", fontSize: 11, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                <AlertCircle size={12} /> Panjang API Key Gemini minimal 15 karakter.
              </div>
            )}
          </div>
        )}

        {/* UJI KONEKSI & LIVE STATUS */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginTop: 4 }}>
          <button
            type="button"
            className="pill"
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
            onClick={handleTestApi}
            disabled={testingApi}
          >
            <Zap size={14} style={{ color: "#A6F23A" }} />
            {testingApi ? "Menguji Koneksi..." : "Uji Koneksi AI"}
          </button>

          {apiStatus && (
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: apiStatus.ok ? "#059669" : "#DC2626",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              {apiStatus.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              {apiStatus.msg}
            </div>
          )}
        </div>
      </section>

      {/* KARTU 2: TRANSKRIPSI AUDIO & SPEECH TO TEXT */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <section
          className="c"
          style={{
            border: "1px solid #E2E5EC",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700 }}>
            Transkripsi Rekaman Rapat (STT / Speech-to-Text)
          </div>
          <div style={{ fontSize: 12, color: "#4A505C" }}>
            Engine pemrosesan file audio notulen menjadi teks dan poin rapat secara otomatis.
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
              Engine Transkripsi Audio
            </label>
            <select
              value={settings.sttProvider}
              onChange={(e) => updateSettings({ sttProvider: e.target.value as AiSttProvider })}
              style={inputStyle}
            >
              <option value="groq-whisper">
                Groq Whisper (whisper-large-v3-turbo) — Sangat Cepat & Akurat
              </option>
              <option value="openai-whisper">
                OpenAI Whisper Cloud (whisper-1)
              </option>
              <option value="browser">
                Browser Web Speech (Mikrofon Langsung)
              </option>
            </select>
          </div>

          {settings.sttProvider === "openai-whisper" && (
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                API Key OpenAI Whisper (Opsional bila sudah diisi di atas)
              </label>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  type={showSttKey ? "text" : "password"}
                  value={settings.sttApiKey}
                  onChange={(e) => updateSettings({ sttApiKey: e.target.value })}
                  placeholder="sk-..."
                  style={inputStyle}
                />
                <button
                  type="button"
                  className="pill"
                  style={{ padding: "0 12px", background: "#F7F7F8" }}
                  onClick={() => setShowSttKey(!showSttKey)}
                >
                  {showSttKey ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          )}

          <div
            style={{
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: 12,
              padding: 12,
              fontSize: 12,
              color: "#334155",
            }}
          >
            <b>Catatan Ekosistem Terpadu:</b> Jika memilih <b>Groq Cloud</b> dengan model <code>qwen/qwen3.8-27b</code>, transkripsi audio rapat di menu Notulen akan otomatis diproses oleh <code>whisper-large-v3-turbo</code> menggunakan API Key Groq yang sama tanpa perlu konfigurasi ganda.
          </div>
        </section>

        {/* KEAMANAN & PENYIMPANAN KUNCI */}
        <section
          className="c"
          style={{
            border: "1px solid #E2E5EC",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700 }}>
            Keamanan Penyimpanan API Key
          </div>

          <label
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#F7F7F8",
              padding: "10px 12px",
              borderRadius: 12,
              cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Lock size={15} color="#4A505C" />
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>
                Simpan API Key di perangkat ini (tidak hilang saat tab ditutup)
              </span>
            </div>
            <input
              type="checkbox"
              checked={Boolean(settings.persistSecretsOnDevice)}
              onChange={(e) =>
                updateSettings({ persistSecretsOnDevice: e.target.checked })
              }
              style={{ width: 18, height: 18, accentColor: "#6B7BFF" }}
            />
          </label>

          <button
            type="button"
            className="pill"
            style={{
              background: "#FFF0F0",
              color: "#B42318",
              border: "1px solid #FECACA",
              alignSelf: "flex-start",
              fontSize: 12,
            }}
            onClick={clearAllApiKeys}
          >
            <Trash2 size={13} /> Hapus Seluruh Kunci API dari Perangkat
          </button>
        </section>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            className="pill"
            style={{
              background: "#14171F",
              color: "#FFFFFF",
              fontWeight: 700,
              padding: "10px 20px",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
            }}
            onClick={() => saveSettingsNow("Konfigurasi Kecerdasan Buatan AI")}
          >
            <Save size={15} /> Simpan Konfigurasi AI
          </button>
        </div>
      </div>
    </div>
  );
}
