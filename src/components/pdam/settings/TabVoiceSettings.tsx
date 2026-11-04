import { useState } from "react";
import {
  Bell,
  ExternalLink,
  Eye,
  EyeOff,
  Mic,
  Save,
  Volume2,
} from "lucide-react";
import { usePdamStore } from "@/lib/pdam-store";
import {
  speakWithConfiguredProvider,
  type CartesiaVoiceInfo,
  type ElevenLabsVoiceInfo,
} from "@/lib/tiara-speech";
import type { AiTtsProvider } from "@/lib/types";

interface TabVoiceSettingsProps {
  cartesiaVoices: CartesiaVoiceInfo[];
  elevenVoices: ElevenLabsVoiceInfo[];
  voices: SpeechSynthesisVoice[];
  showTtsKey: boolean;
  setShowTtsKey: (show: boolean) => void;
  inputStyle: React.CSSProperties;
}

export function TabVoiceSettings({
  cartesiaVoices,
  elevenVoices,
  voices,
  showTtsKey,
  setShowTtsKey,
  inputStyle,
}: TabVoiceSettingsProps) {
  const {
    settings,
    updateSettings,
    saveSettingsNow,
    simulateWakeWord,
    triggerReminderAnnouncement,
    toggleWakeWordListening,
    assistantEnabled,
  } = usePdamStore();

  const [testingTts, setTestingTts] = useState(false);
  const [ttsStatus, setTtsStatus] = useState<{
    ok: boolean;
    msg: string;
  } | null>(null);

  const handleTestTts = () => {
    setTestingTts(true);
    setTtsStatus(null);
    let hadErr = false;

    speakWithConfiguredProvider(
      "Halo Pak Dirut, saya Tiara. Suara asisten eksekutif Perumdam Tirta Ardhia Rinjani telah aktif dan siap mendampingi Bapak.",
      settings,
      {
        onStart: () => {
          setTestingTts(true);
        },
        onCloudError: (errMsg) => {
          hadErr = true;
          setTtsStatus({
            ok: false,
            msg: `Uji suara gagal (${errMsg}). Otomatis beralih ke suara bawaan Browser.`,
          });
        },
        onEnd: () => {
          setTestingTts(false);
          if (!hadErr) {
            const label =
              settings.ttsProvider === "cartesia"
                ? "Cartesia Sonic-3"
                : settings.ttsProvider === "elevenlabs"
                ? "ElevenLabs"
                : settings.ttsProvider === "openai-tts"
                ? "OpenAI TTS"
                : "Browser";
            setTtsStatus({
              ok: true,
              msg: `Suara ${label} berhasil diuji dan siap digunakan.`,
            });
          }
        },
      }
    );
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
        gap: 16,
      }}
    >
      {/* KARTU 1: ENGINE SUARA & TTS */}
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
            <Volume2 size={22} />
          </span>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              Engine Suara Tiara (Text-to-Speech)
            </div>
            <div style={{ fontSize: 12, color: "#4A505C" }}>
              Pilihan suara pembacaan agenda, notulen rapat, dan percakapan
            </div>
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
            Penyedia Layanan Suara (TTS Provider)
          </label>
          <select
            value={settings.ttsProvider}
            onChange={(e) => {
              const nextProv = e.target.value as AiTtsProvider;
              if (nextProv === "cartesia") {
                updateSettings({
                  ttsProvider: nextProv,
                  cartesiaModelId: settings.cartesiaModelId || "sonic-3",
                  cartesiaVoiceId:
                    settings.cartesiaVoiceId ||
                    "f786b574-daa5-4673-aa0c-cbe3e8534c02",
                  cartesiaBaseUrl:
                    settings.cartesiaBaseUrl || "https://api.cartesia.ai",
                  cartesiaVersion: settings.cartesiaVersion || "2025-04-16",
                });
              } else if (nextProv === "elevenlabs") {
                updateSettings({
                  ttsProvider: nextProv,
                  ttsVoiceId:
                    settings.ttsVoiceId.trim() && settings.ttsVoiceId !== "nova"
                      ? settings.ttsVoiceId
                      : "EXAVITQu4vr4xnSDxMaL",
                  ttsModelId: settings.ttsModelId?.startsWith("eleven_")
                    ? settings.ttsModelId
                    : "eleven_flash_v2_5",
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
              Suara Bahasa Indonesia Bawaan Browser (Gratis & Offline)
            </option>
            <option value="cartesia">
              Cartesia Sonic TTS API (Sonic-3 Ultra-Cepat — Sangat Alami)
            </option>
            <option value="elevenlabs">
              ElevenLabs API v1 (Flash v2.5 / Multilingual v2)
            </option>
            <option value="openai-tts">
              OpenAI Neural TTS (Nova / Shimmer)
            </option>
            <option value="custom">
              Custom TTS Endpoint (Kokoro / Piper / Server Internal)
            </option>
          </select>
        </div>

        {/* OPSI KHUSUS CARTESIA SONIC */}
        {settings.ttsProvider === "cartesia" && (
          <div
            style={{
              background: "#F7F8FF",
              border: "1px solid #D5DAFF",
              borderRadius: 14,
              padding: 14,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <label style={{ fontSize: 12, fontWeight: 700 }}>
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
                style={{ padding: "0 12px" }}
                onClick={() => setShowTtsKey(!showTtsKey)}
              >
                {showTtsKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1.2fr",
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
                  Model Cartesia
                </label>
                <select
                  value={settings.cartesiaModelId || "sonic-3"}
                  onChange={(e) =>
                    updateSettings({ cartesiaModelId: e.target.value })
                  }
                  style={inputStyle}
                >
                  <option value="sonic-3">sonic-3 (Rekomendasi Utama)</option>
                  <option value="sonic-2">sonic-2</option>
                  <option value="sonic-multilingual">sonic-multilingual</option>
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
                  Pilihan Suara Tiara
                </label>
                <select
                  value={
                    settings.cartesiaVoiceId ||
                    "f786b574-daa5-4673-aa0c-cbe3e8534c02"
                  }
                  onChange={(e) =>
                    updateSettings({ cartesiaVoiceId: e.target.value })
                  }
                  style={inputStyle}
                >
                  {cartesiaVoices.map((v) => (
                    <option key={v.voiceId} value={v.voiceId}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* OPSI KHUSUS ELEVENLABS */}
        {settings.ttsProvider === "elevenlabs" && (
          <div
            style={{
              background: "#F7F8FF",
              border: "1px solid #D5DAFF",
              borderRadius: 14,
              padding: 14,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <label style={{ fontSize: 12, fontWeight: 700 }}>
              API Key ElevenLabs (Header xi-api-key)
            </label>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                type={showTtsKey ? "text" : "password"}
                autoComplete="off"
                spellCheck={false}
                value={settings.ttsApiKey}
                onChange={(e) => updateSettings({ ttsApiKey: e.target.value })}
                placeholder="Tempel API Key ElevenLabs (sk_...)"
                style={inputStyle}
              />
              <button
                type="button"
                className="pill"
                style={{ padding: "0 12px" }}
                onClick={() => setShowTtsKey(!showTtsKey)}
              >
                {showTtsKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
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
                Karakter Suara ElevenLabs
              </label>
              <select
                value={settings.ttsVoiceId || "EXAVITQu4vr4xnSDxMaL"}
                onChange={(e) =>
                  updateSettings({ ttsVoiceId: e.target.value })
                }
                style={inputStyle}
              >
                {elevenVoices.map((v) => (
                  <option key={v.voiceId} value={v.voiceId}>
                    {v.name} ({v.category})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* OPSI KHUSUS BROWSER */}
        {settings.ttsProvider === "browser" && (
          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 5,
              }}
            >
              Pilih Suara Bahasa Indonesia (Browser Web Speech)
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
        )}

        {/* SLIDER KECEPATAN BICARA */}
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
            <span>Kecepatan Berbicara Tiara</span>
            <b>{settings.speechRate.toFixed(2)}x</b>
          </div>
          <input
            type="range"
            min={0.8}
            max={1.35}
            step={0.02}
            value={settings.speechRate}
            onChange={(e) =>
              updateSettings({ speechRate: Number(e.target.value) })
            }
            style={{ width: "100%", accentColor: "#6B7BFF" }}
          />
        </div>

        {/* FEEDBACK STATUS UJI SUARA */}
        {ttsStatus && (
          <div
            style={{
              background: ttsStatus.ok ? "#F3FCE6" : "#FFF4F2",
              border: `1px solid ${ttsStatus.ok ? "#C9EE8F" : "#FECACA"}`,
              borderRadius: 12,
              padding: "10px 14px",
              fontSize: 12.5,
              color: ttsStatus.ok ? "#2E6814" : "#B42318",
            }}
          >
            {ttsStatus.msg}
          </div>
        )}

        {/* TOMBOL UJI SUARA & SIMPAN */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 8,
            marginTop: 4,
          }}
        >
          <button
            type="button"
            className="pill"
            style={{
              background: "#6B7BFF",
              color: "#fff",
              fontWeight: 600,
            }}
            onClick={handleTestTts}
            disabled={testingTts}
          >
            <Volume2 size={15} />
            {testingTts ? "Memutar Suara..." : "Uji Dengarkan Suara Tiara"}
          </button>

          <button
            type="button"
            className="pill"
            style={{
              background: "#14171F",
              color: "#fff",
              fontWeight: 700,
            }}
            onClick={() => saveSettingsNow("Pengaturan Suara Tiara")}
          >
            <Save size={14} /> Simpan Suara
          </button>
        </div>
      </section>

      {/* KARTU 2: PERILAKU SUARA & MIKROFON */}
      <section
        className="c"
        style={{
          border: "2px solid #E4E7FF",
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
            gap: 8,
          }}
        >
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              Perilaku Suara & Mikrofon
            </div>
            <div style={{ fontSize: 12, color: "#4A505C" }}>
              Deteksi panggilan "Hey Tiara" dan proteksi anti-gema speaker
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
              Deteksi Suara "Hey Tiara / Halo Tiara"
            </div>
            <div style={{ fontSize: 12, color: "#4A505C" }}>
              Otomatis mendengarkan perintah dari kejauhan tanpa menyentuh layar
            </div>
          </div>
          <input
            type="checkbox"
            checked={settings.wakeWordAktif}
            onChange={(e) => updateSettings({ wakeWordAktif: e.target.checked })}
            style={{ width: 20, height: 20, accentColor: "#6B7BFF" }}
          />
        </label>

        {/* PROTEKSI ANTI GEMA SPEAKER */}
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
                Proteksi Anti-Gema Speaker (Anti-Self-Echo)
              </div>
              <div style={{ fontSize: 11.5, color: "#4A505C", marginTop: 2 }}>
                Mencegah mikrofon menangkap kembali suara Tiara dari speaker luar
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.echoGuardAktif}
              onChange={(e) =>
                updateSettings({ echoGuardAktif: e.target.checked })
              }
              style={{ width: 18, height: 18, accentColor: "#6B7BFF" }}
            />
          </label>

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
              <span>Jeda Pemulihan Mikrofon Pasca Bicara</span>
              <b>{settings.micResumeDelayMs} ms</b>
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
              Gunakan 1200–1800 ms agar mikrofon tidak menangkap pantulan gema ruangan.
            </div>
          </div>
        </div>

        {/* TOMBOL PENGUJIAN FITUR SUARA */}
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            justifyContent: "space-between",
            marginTop: "auto",
          }}
        >
          <button
            type="button"
            className="pill"
            style={{
              background: "#A6F23A",
              color: "#14171F",
              fontWeight: 600,
            }}
            onClick={() => simulateWakeWord()}
          >
            <Volume2 size={15} /> Uji Sapaan "Halo Tiara"
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
      </section>
    </div>
  );
}
