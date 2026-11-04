import type {
  AgendaItem,
  AssistantSettings,
  JenisAgenda,
  VoiceAgendaDraft,
} from "@/lib/types";

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new Ctx();
  }
  if (sharedAudioCtx.state === "suspended") {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

/**
 * Bunyi "ting" halus menggunakan Web Audio API sesuai PRD 5.4
 */
export function playChime(type: "wake" | "reminder" = "reminder"): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const notes =
      type === "wake" ? [587.33, 880] : [659.25, 987.77]; // D5->A5 atau E5->B5

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.11);

      gain.gain.setValueAtTime(0.001, now + idx * 0.11);
      gain.gain.exponentialRampToValueAtTime(0.16, now + idx * 0.11 + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.11 + 0.42);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.11);
      osc.stop(now + idx * 0.11 + 0.45);
    });
  } catch {
    // Abaikan bila perangkat memblokir audio
  }
}

export function getAvailableIndonesianVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  const all = window.speechSynthesis.getVoices();
  const indo = all.filter((v) => v.lang.toLowerCase().startsWith("id"));
  return indo.length > 0 ? indo : all.slice(0, 8);
}

export function selectFemaleIndonesianVoice(
  preferredURI?: string
): SpeechSynthesisVoice | undefined {
  if (typeof window === "undefined" || !("speechSynthesis" in window))
    return undefined;
  const all = window.speechSynthesis.getVoices();
  if (preferredURI) {
    const exact = all.find((v) => v.voiceURI === preferredURI);
    if (exact) return exact;
  }
  const idVoices = all.filter((v) => v.lang.toLowerCase().startsWith("id"));
  const maleRegex = /andika|ardi|\bmale\b|pria|laki/i;
  const femaleRegex =
    /gadis|damayanti|female|perempuan|wanita|google bahasa indonesia/i;
  return (
    idVoices.find((v) => femaleRegex.test(v.name) && !maleRegex.test(v.name)) ??
    idVoices.find((v) => !maleRegex.test(v.name)) ??
    idVoices[0]
  );
}

export interface ElevenLabsVoiceInfo {
  voiceId: string;
  name: string;
  category: string;
  freeApiAllowed: boolean;
  labels?: string;
}

export const DEFAULT_FREE_ELEVENLABS_VOICE_ID = "EXAVITQu4vr4xnSDxMaL"; // Sarah (Premade Default)

export const ELEVENLABS_VOICE_PRESETS: ElevenLabsVoiceInfo[] = [
  {
    voiceId: "EXAVITQu4vr4xnSDxMaL",
    name: "Sarah — Perempuan Profesional & Ramah [✓ Gratis / Free API]",
    category: "premade",
    freeApiAllowed: true,
  },
  {
    voiceId: "cgSgspJ2msm6clMCkdW9",
    name: "Jessica — Perempuan Cerah & Hangat [✓ Gratis / Free API]",
    category: "premade",
    freeApiAllowed: true,
  },
  {
    voiceId: "XrExE9yKIg1WjnnlVkGX",
    name: "Matilda — Perempuan Tenang & Eksekutif [✓ Gratis / Free API]",
    category: "premade",
    freeApiAllowed: true,
  },
  {
    voiceId: "FGY2WhTYpPnrIDTdsKH5",
    name: "Laura — Perempuan Jernih & Responsif [✓ Gratis / Free API]",
    category: "premade",
    freeApiAllowed: true,
  },
  {
    voiceId: "9BWtsMINqrJLrRacOk9x",
    name: "Aria — Perempuan Natural [✓ Gratis / Free API]",
    category: "premade",
    freeApiAllowed: true,
  },
  {
    voiceId: "Xb7hH8MSUJpSbSDYk0k2",
    name: "Alice — Perempuan Tegas Notulen [✓ Gratis / Free API]",
    category: "premade",
    freeApiAllowed: true,
  },
  {
    voiceId: "pFZP5JQG7iQjIQuC4Bku",
    name: "Lily — Perempuan Lembut [✓ Gratis / Free API]",
    category: "premade",
    freeApiAllowed: true,
  },
];

export interface CartesiaVoiceInfo {
  voiceId: string;
  name: string;
  language: string;
  description?: string;
}

export const CARTESIA_VOICE_PRESETS: CartesiaVoiceInfo[] = [
  {
    voiceId: "f786b574-daa5-4673-aa0c-cbe3e8534c02",
    name: "Katie — Perempuan Ramah & Responsif (Voice Agent Sonic-3)",
    language: "multilingual",
  },
  {
    voiceId: "694f9389-aac1-45b6-b726-9d9369183238",
    name: "Sarah — Perempuan Jernih & Profesional (Sonic-3)",
    language: "multilingual",
  },
  {
    voiceId: "79a125e8-cd45-4c13-8a67-188112f4dd22",
    name: "British Lady — Perempuan Tenang Eksekutif (Sonic)",
    language: "multilingual",
  },
];

// Simpan referensi global agar Chromium tidak men-garbage-collect Utterance / Audio Cloud saat masih berbicara
let activeUtterance: SpeechSynthesisUtterance | null = null;
let silenceCheckTimer: number | null = null;
let activeAudioEl: HTMLAudioElement | null = null;
let activeAudioUrl: string | null = null;
let activeCloudAbort: AbortController | null = null;
let isFetchingCloudTts = false;

// Shared Audio element yang di-unlock pada gesture pengguna pertama (diperlukan untuk iOS Safari / PWA WebKit)
let sharedUnlockedAudio: HTMLAudioElement | null = null;
const SILENT_AUDIO_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

export function warmUpAudioPlayback(): void {
  if (typeof window === "undefined") return;
  try {
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") {
      void ctx.resume().catch(() => {});
    }
    if (!sharedUnlockedAudio) {
      sharedUnlockedAudio = new Audio();
      sharedUnlockedAudio.preload = "auto";
    }
    // Mainkan silent audio sekali pada interaksi user untuk membuka izin autoplay di iOS Safari / PWA WebKit
    if (!sharedUnlockedAudio.src) {
      sharedUnlockedAudio.src = SILENT_AUDIO_WAV;
      void sharedUnlockedAudio.play().catch(() => {});
    }
  } catch {
    // ignore
  }
}

if (typeof window !== "undefined") {
  const onUserInteraction = () => {
    warmUpAudioPlayback();
  };
  window.addEventListener("pointerdown", onUserInteraction, { passive: true });
  window.addEventListener("touchstart", onUserInteraction, { passive: true });
  window.addEventListener("click", onUserInteraction, { passive: true });
  window.addEventListener("keydown", onUserInteraction, { passive: true });
}

function cleanupCloudAudio(): void {
  if (activeCloudAbort) {
    try {
      activeCloudAbort.abort();
    } catch {
      // ignore
    }
    activeCloudAbort = null;
  }
  isFetchingCloudTts = false;
  if (activeAudioEl) {
    try {
      activeAudioEl.onended = null;
      activeAudioEl.onerror = null;
      activeAudioEl.pause();
      activeAudioEl.src = "";
    } catch {
      // ignore
    }
    activeAudioEl = null;
  }
  if (activeAudioUrl) {
    try {
      URL.revokeObjectURL(activeAudioUrl);
    } catch {
      // ignore
    }
    activeAudioUrl = null;
  }
}

export function isBrowserCurrentlySpeaking(): boolean {
  if (typeof window === "undefined") return false;
  if (isFetchingCloudTts) return true;
  if (activeAudioEl && !activeAudioEl.paused && !activeAudioEl.ended) {
    return true;
  }
  if ("speechSynthesis" in window) {
    return Boolean(
      window.speechSynthesis.speaking || window.speechSynthesis.pending
    );
  }
  return false;
}

function clearSilenceTimer(): void {
  if (silenceCheckTimer !== null && typeof window !== "undefined") {
    window.clearInterval(silenceCheckTimer);
    silenceCheckTimer = null;
  }
}

export function speakIndonesian(
  text: string,
  opts?: {
    preferredVoiceURI?: string;
    rate?: number;
    onStart?: () => void;
    onEnd?: () => void;
  }
): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    opts?.onEnd?.();
    return;
  }
  cleanupCloudAudio();
  clearSilenceTimer();
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  activeUtterance = utterance;
  utterance.lang = "id-ID";
  utterance.rate =
    opts?.rate && opts.rate >= 0.7 && opts.rate <= 1.6 ? opts.rate : 1.02;
  utterance.pitch = 1.04;

  const voice = selectFemaleIndonesianVoice(opts?.preferredVoiceURI);
  if (voice) utterance.voice = voice;

  let finishedCalled = false;
  const finalizeEnd = () => {
    if (finishedCalled) return;
    // Pastikan mesin audio OS benar-benar sudah berhenti mengeluarkan suara sebelum melepas kunci
    let ticks = 0;
    clearSilenceTimer();
    silenceCheckTimer = window.setInterval(() => {
      ticks += 1;
      const stillTalking =
        window.speechSynthesis.speaking || window.speechSynthesis.pending;
      if (!stillTalking || ticks >= 25) {
        clearSilenceTimer();
        if (!finishedCalled) {
          finishedCalled = true;
          if (activeUtterance === utterance) {
            activeUtterance = null;
          }
          opts?.onEnd?.();
        }
      }
    }, 100);
  };

  utterance.onstart = () => opts?.onStart?.();
  utterance.onend = finalizeEnd;
  utterance.onerror = finalizeEnd;

  window.speechSynthesis.speak(utterance);
}

/**
 * Mengambil daftar Voice dari akun ElevenLabs pengguna (GET /v1/voices)
 * Aman terhadap scoped API key yang hanya mengaktifkan izin Text-to-Speech.
 */
export async function fetchElevenLabsVoices(
  apiKey: string,
  customBaseUrl?: string
): Promise<{
  ok: boolean;
  voices: ElevenLabsVoiceInfo[];
  message: string;
}> {
  const key = apiKey.trim();
  if (!key) {
    return {
      ok: false,
      voices: [],
      message: "Masukkan API Key ElevenLabs (xi-api-key) terlebih dahulu.",
    };
  }
  const base = (customBaseUrl?.trim() || "https://api.elevenlabs.io/v1").replace(
    /\/$/,
    ""
  );

  try {
    const res = await fetch(`${base}/voices`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "xi-api-key": key,
      },
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const detail =
        data?.detail?.message ||
        data?.message ||
        `HTTP ${res.status}`;
      if (res.status === 401 || res.status === 403) {
        return {
          ok: false,
          voices: [],
          message: `Tidak dapat memuat daftar voice (${detail}). Jika API Key Anda dibatasi khusus Text-to-Speech, Anda tetap bisa langsung memakai pilihan Voice ID di bawah.`,
        };
      }
      return {
        ok: false,
        voices: [],
        message: `Gagal memuat daftar voice ElevenLabs: ${detail}`,
      };
    }

    const rawList = Array.isArray(data?.voices) ? data.voices : [];
    const mapped: ElevenLabsVoiceInfo[] = rawList
      .map(
        (v: {
          voice_id?: string;
          name?: string;
          category?: string;
          labels?: Record<string, string>;
        }) => {
          const cat = String(v.category || "custom").toLowerCase();
          // Di ElevenLabs Free Tier API, hanya voice berkategori "premade" atau "generated" sendiri yang diizinkan gratis
          const freeApiAllowed = cat === "premade" || cat === "generated";
          const labelParts = v.labels
            ? Object.values(v.labels).filter(Boolean).slice(0, 2).join(", ")
            : "";
          const badge = freeApiAllowed
            ? "[✓ Gratis / Free API]"
            : "[🔒 Voice Library — Khusus Akun Paid]";
          return {
            voiceId: String(v.voice_id || ""),
            name: `${v.name || "Voice"}${
              labelParts ? ` (${labelParts})` : ""
            } ${badge}`,
            category: cat,
            freeApiAllowed,
          };
        }
      )
      .filter((v: ElevenLabsVoiceInfo) => Boolean(v.voiceId))
      .sort(
        (a: ElevenLabsVoiceInfo, b: ElevenLabsVoiceInfo) =>
          Number(b.freeApiAllowed) - Number(a.freeApiAllowed)
      );

    const freeCount = mapped.filter((v) => v.freeApiAllowed).length;
    return {
      ok: true,
      voices: mapped,
      message: `Dimuat ${mapped.length} suara (${freeCount} suara bisa dipakai di Akun Gratis/Free API).`,
    };
  } catch {
    return {
      ok: false,
      voices: [],
      message: "Gagal menghubungi server ElevenLabs API.",
    };
  }
}

async function callCartesiaApi(params: {
  endpoint: "/tts/bytes" | "/voices";
  method: "GET" | "POST";
  apiKey: string;
  baseUrl?: string;
  version?: string;
  body?: Record<string, unknown>;
  signal?: AbortSignal;
}): Promise<Response> {
  const cleanBase = (
    params.baseUrl?.trim() || "https://api.cartesia.ai"
  ).replace(/\/$/, "");
  const version = params.version?.trim() || "2025-04-16";
  const isOfficialCartesia = /^https:\/\/api\.cartesia\.ai$/i.test(cleanBase);

  const commonHeaders: Record<string, string> = {
    "X-API-Key": params.apiKey,
    Authorization: `Bearer ${params.apiKey}`,
    "Cartesia-Version": version,
  };
  if (params.method === "POST") {
    commonHeaders["Content-Type"] = "application/json";
  } else {
    commonHeaders.Accept = "application/json";
  }

  const querySuffix = params.endpoint === "/voices" ? "?limit=100" : "";

  if (isOfficialCartesia) {
    // 1. Relay satu-origin Vite (/api-cartesia) agar bebas blokir CORS browser
    try {
      const viteRes = await fetch(
        `/api-cartesia${params.endpoint}${querySuffix}`,
        {
          method: params.method,
          headers: commonHeaders,
          body: params.body ? JSON.stringify(params.body) : undefined,
          signal: params.signal,
        }
      );
      const ct = (viteRes.headers.get("content-type") || "").toLowerCase();
      if (viteRes.status !== 404 && !ct.includes("text/html")) {
        return viteRes;
      }
    } catch (e) {
      if (params.signal?.aborted) throw e;
    }

    // 2. Relay PHP produksi (Laragon Apache/Nginx)
    try {
      const phpUrl = `./api/cartesia-proxy.php?endpoint=${encodeURIComponent(
        params.endpoint
      )}${params.endpoint === "/voices" ? "&limit=100" : ""}`;
      const phpRes = await fetch(phpUrl, {
        method: params.method,
        headers: {
          ...commonHeaders,
          "X-Cartesia-Base": cleanBase,
        },
        body: params.body ? JSON.stringify(params.body) : undefined,
        signal: params.signal,
      });
      const ct = (phpRes.headers.get("content-type") || "").toLowerCase();
      if (
        phpRes.status !== 404 &&
        !ct.includes("text/html") &&
        !ct.includes("application/x-httpd-php")
      ) {
        return phpRes;
      }
    } catch (e) {
      if (params.signal?.aborted) throw e;
    }
  }

  // 3. Koneksi langsung ke endpoint Cartesia / Custom Proxy Cartesia
  return fetch(`${cleanBase}${params.endpoint}${querySuffix}`, {
    method: params.method,
    headers: commonHeaders,
    body: params.body ? JSON.stringify(params.body) : undefined,
    signal: params.signal,
  });
}

/**
 * Mengambil daftar Voice dari akun Cartesia pengguna (GET https://api.cartesia.ai/voices)
 */
export async function fetchCartesiaVoices(
  apiKey: string,
  customBaseUrl?: string,
  version?: string
): Promise<{
  ok: boolean;
  voices: CartesiaVoiceInfo[];
  message: string;
}> {
  const key = apiKey.trim();
  if (!key) {
    return {
      ok: false,
      voices: [],
      message: "Masukkan API Key Cartesia terlebih dahulu.",
    };
  }

  try {
    const res = await callCartesiaApi({
      endpoint: "/voices",
      method: "GET",
      apiKey: key,
      baseUrl: customBaseUrl,
      version,
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const detail =
        data?.message || data?.error || `HTTP ${res.status}`;
      return {
        ok: false,
        voices: [],
        message: `Gagal memuat daftar suara Cartesia: ${detail}`,
      };
    }

    const rawArr: Array<{
      id?: string;
      name?: string;
      language?: string;
      description?: string;
    }> = Array.isArray(data)
      ? data
      : Array.isArray(data?.data)
        ? data.data
        : [];

    const mapped: CartesiaVoiceInfo[] = rawArr
      .filter((v) => Boolean(v?.id))
      .map((v) => {
        const lang = String(v.language || "en").toLowerCase();
        const langBadge =
          lang === "id" ? "[Bahasa Indonesia]" : `[${lang.toUpperCase()}]`;
        return {
          voiceId: String(v.id),
          name: `${v.name || "Cartesia Voice"} ${langBadge}`,
          language: lang,
          description: v.description,
        };
      })
      .sort((a, b) => {
        const aId = a.language === "id" ? 1 : 0;
        const bId = b.language === "id" ? 1 : 0;
        return bId - aId || a.name.localeCompare(b.name);
      });

    const idCount = mapped.filter((v) => v.language === "id").length;
    return {
      ok: true,
      voices: mapped,
      message: `Berhasil memuat ${mapped.length} suara Cartesia${
        idCount > 0 ? ` (${idCount} suara khusus Bahasa Indonesia)` : ""
      }.`,
    };
  } catch {
    return {
      ok: false,
      voices: [],
      message: "Tidak dapat menghubungi server Cartesia API.",
    };
  }
}

/**
 * Pemutar suara utama Tiara:
 * Mendukung penuh ElevenLabs API v1, Cartesia Sonic TTS (Sonic-3 / Sonic-2),
 * OpenAI Neural TTS, Custom TTS Endpoint, serta fallback otomatis ke Browser TTS.
 */
export function speakWithConfiguredProvider(
  text: string,
  settings: AssistantSettings,
  opts?: {
    onStart?: () => void;
    onEnd?: () => void;
    onCloudError?: (errMessage: string) => void;
    onFallbackFreeVoice?: (freeVoiceId: string, notice: string) => void;
    disableBrowserFallback?: boolean;
  }
): void {
  const provider = settings.ttsProvider;
  const ttsKey = settings.ttsApiKey.trim();

  // Jika memilih Browser TTS, langsung gunakan Web Speech API perangkat
  if (provider === "browser") {
    speakIndonesian(text, {
      preferredVoiceURI: settings.selectedVoiceURI,
      rate: settings.speechRate,
      onStart: opts?.onStart,
      onEnd: opts?.onEnd,
    });
    return;
  }

  // Tentukan API Key sesuai provider TTS yang aktif
  const effectiveKey =
    provider === "cartesia"
      ? (settings.cartesiaApiKey || ttsKey).trim()
      : ttsKey || (provider === "openai-tts" ? settings.aiApiKey.trim() : "");

  if (provider !== "custom" && !effectiveKey) {
    const providerLabel =
      provider === "elevenlabs"
        ? "ElevenLabs"
        : provider === "cartesia"
          ? "Cartesia Sonic TTS"
          : "OpenAI TTS";
    if (opts?.disableBrowserFallback) {
      opts?.onCloudError?.(`API Key untuk ${providerLabel} belum diisi.`);
      opts?.onEnd?.();
      return;
    }
    speakIndonesian(text, {
      preferredVoiceURI: settings.selectedVoiceURI,
      rate: settings.speechRate,
      onStart: opts?.onStart,
      onEnd: opts?.onEnd,
    });
    return;
  }

  // Hentikan audio sebelumnya
  cleanupCloudAudio();
  clearSilenceTimer();
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }

  const controller = new AbortController();
  activeCloudAbort = controller;
  isFetchingCloudTts = true;

  void (async () => {
    try {
      let res: Response;

      if (provider === "elevenlabs") {
        const base = (
          settings.ttsBaseUrl.trim() || "https://api.elevenlabs.io/v1"
        ).replace(/\/$/, "");
        const voiceId =
          settings.ttsVoiceId.trim() || "EXAVITQu4vr4xnSDxMaL"; // Default: Sarah
        const modelId =
          settings.ttsModelId?.trim() || "eleven_flash_v2_5";

        const payload: Record<string, unknown> = {
          text,
          model_id: modelId,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.78,
          },
        };
        // Model v2.5 mendukung parameter language_code="id" agar pelafalan Bahasa Indonesia makin akurat
        if (modelId.includes("2_5")) {
          payload.language_code = "id";
        }

        res = await fetch(
          `${base}/text-to-speech/${encodeURIComponent(
            voiceId
          )}?output_format=mp3_44100_128`,
          {
            method: "POST",
            signal: controller.signal,
            headers: {
              Accept: "audio/mpeg",
              "Content-Type": "application/json",
              "xi-api-key": effectiveKey,
            },
            body: JSON.stringify(payload),
          }
        );

        // Jika akun Free Tier mencoba memakai Voice Library berbayar (HTTP 402 / library voices),
        // otomatis alihkan ke suara perempuan Default Gratis ElevenLabs (Sarah) agar tetap bersuara ElevenLabs!
        if (!res.ok && voiceId !== DEFAULT_FREE_ELEVENLABS_VOICE_ID) {
          const clonedErr = await res.clone().json().catch(() => null);
          const errText = String(
            clonedErr?.detail?.message || clonedErr?.message || ""
          );
          if (
            res.status === 402 ||
            /library voices via the api/i.test(errText)
          ) {
            opts?.onFallbackFreeVoice?.(
              DEFAULT_FREE_ELEVENLABS_VOICE_ID,
              "Akun ElevenLabs Free tidak mengizinkan Voice Library lewat API — otomatis dialihkan ke suara perempuan bawaan gratis (Sarah Bahasa Indonesia)."
            );
            res = await fetch(
              `${base}/text-to-speech/${DEFAULT_FREE_ELEVENLABS_VOICE_ID}?output_format=mp3_44100_128`,
              {
                method: "POST",
                signal: controller.signal,
                headers: {
                  Accept: "audio/mpeg",
                  "Content-Type": "application/json",
                  "xi-api-key": effectiveKey,
                },
                body: JSON.stringify(payload),
              }
            );
          }
        }
      } else if (provider === "cartesia") {
        const modelId = settings.cartesiaModelId?.trim() || "sonic-3";
        const voiceId =
          settings.cartesiaVoiceId?.trim() ||
          "f786b574-daa5-4673-aa0c-cbe3e8534c02";
        const basePayload: Record<string, unknown> = {
          model_id: modelId,
          transcript: text,
          language: "id",
          voice: {
            mode: "id",
            id: voiceId,
          },
          output_format: {
            container: "mp3",
            bit_rate: 128000,
            sample_rate: 44100,
          },
        };

        res = await callCartesiaApi({
          endpoint: "/tts/bytes",
          method: "POST",
          apiKey: effectiveKey,
          baseUrl: settings.cartesiaBaseUrl,
          version: settings.cartesiaVersion,
          body: basePayload,
          signal: controller.signal,
        });

        // Jika model/versi lama belum menerima field language="id", coba otomatis tanpa language field
        if (!res.ok && (res.status === 400 || res.status === 422)) {
          const errClone = await res.clone().json().catch(() => null);
          const errMsg = String(errClone?.message || errClone?.error || "");
          if (/language|unsupported|locale/i.test(errMsg)) {
            const { language: _omitted, ...fallbackPayload } = basePayload;
            void _omitted;
            res = await callCartesiaApi({
              endpoint: "/tts/bytes",
              method: "POST",
              apiKey: effectiveKey,
              baseUrl: settings.cartesiaBaseUrl,
              version: settings.cartesiaVersion,
              body: fallbackPayload,
              signal: controller.signal,
            });
          }
        }
      } else if (provider === "openai-tts") {
        const base = (
          settings.ttsBaseUrl.trim() || "https://api.openai.com/v1"
        ).replace(/\/$/, "");
        res = await fetch(`${base}/audio/speech`, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${effectiveKey}`,
          },
          body: JSON.stringify({
            model: settings.ttsModelId?.trim() || "tts-1",
            voice: settings.ttsVoiceId.trim() || "nova",
            input: text,
          }),
        });
      } else {
        // Custom TTS Endpoint
        const customUrl = settings.ttsBaseUrl.trim();
        if (!customUrl) {
          throw new Error("Base URL Custom TTS belum diisi");
        }
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (effectiveKey) {
          headers.Authorization = `Bearer ${effectiveKey}`;
        }
        res = await fetch(customUrl, {
          method: "POST",
          signal: controller.signal,
          headers,
          body: JSON.stringify({
            input: text,
            text,
            voice: settings.ttsVoiceId.trim() || "default",
          }),
        });
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        const detail =
          errJson?.detail?.message ||
          errJson?.error?.message ||
          errJson?.message ||
          `HTTP ${res.status}`;
        throw new Error(detail);
      }

      const audioBlob = await res.blob();
      if (controller.signal.aborted) return;

      const objectUrl = URL.createObjectURL(audioBlob);
      activeAudioUrl = objectUrl;

      // Gunakan audio element yang sudah ter-unlock gesture atau buat baru
      let audio = sharedUnlockedAudio;
      if (!audio) {
        audio = new Audio();
        sharedUnlockedAudio = audio;
      }
      activeAudioEl = audio;
      isFetchingCloudTts = false;

      const rate = settings.speechRate || 1.0;
      audio.playbackRate = Math.max(0.8, Math.min(1.35, rate));

      let done = false;
      const finishAudio = () => {
        if (done) return;
        done = true;
        cleanupCloudAudio();
        opts?.onEnd?.();
      };

      audio.onplay = () => opts?.onStart?.();
      audio.onended = finishAudio;
      audio.onerror = finishAudio;

      audio.src = objectUrl;
      audio.load();

      try {
        await audio.play();
      } catch (playErr) {
        // Jika iOS/Safari PWA memblokir karena gesture timing, coba putar via Web Audio API AudioBuffer
        const ctx = getAudioContext();
        if (ctx) {
          if (ctx.state === "suspended") {
            await ctx.resume().catch(() => {});
          }
          const arrayBuf = await audioBlob.arrayBuffer();
          const audioBuffer = await ctx.decodeAudioData(arrayBuf);
          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          source.playbackRate.value = audio.playbackRate;
          source.connect(ctx.destination);
          source.onended = finishAudio;
          opts?.onStart?.();
          source.start(0);
        } else {
          throw playErr;
        }
      }
    } catch (err) {
      if (controller.signal.aborted) {
        isFetchingCloudTts = false;
        return;
      }
      cleanupCloudAudio();
      const msg =
        err instanceof Error ? err.message : "Gagal memutar Cloud TTS";
      opts?.onCloudError?.(msg);

      if (opts?.disableBrowserFallback) {
        opts?.onEnd?.();
        return;
      }

      // Fallback mulus ke suara Browser agar Tiara tidak pernah bisu
      speakIndonesian(text, {
        preferredVoiceURI: settings.selectedVoiceURI,
        rate: settings.speechRate,
        onStart: opts?.onStart,
        onEnd: opts?.onEnd,
      });
    }
  })();
}

export function pauseSpeaking(): void {
  if (activeAudioEl && !activeAudioEl.paused) {
    activeAudioEl.pause();
    return;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.pause();
  }
}

export function resumeSpeaking(): void {
  if (activeAudioEl && activeAudioEl.paused && !activeAudioEl.ended) {
    void activeAudioEl.play().catch(() => {});
    return;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.resume();
  }
}

export function stopSpeaking(): void {
  cleanupCloudAudio();
  clearSilenceTimer();
  activeUtterance = null;
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

function normalizeWords(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Filter Anti-Gema Speaker (mencegah mikrofon laptop menangkap suara Tiara sendiri dari speaker)
 */
export function isLikelySpeakerEcho(
  heardTranscript: string,
  lastAssistantText: string,
  msSinceAssistantEnded: number
): boolean {
  if (isBrowserCurrentlySpeaking()) return true;

  // Jendela pantulan suara ruangan / buffer driver audio setelah TTS berhenti
  if (msSinceAssistantEnded < 700) return true;

  if (!lastAssistantText || msSinceAssistantEnded > 8500) return false;

  const heardNorm = normalizeWords(heardTranscript);
  const lastNorm = normalizeWords(lastAssistantText);
  if (!heardNorm || !lastNorm) return false;

  const heardTokens = heardNorm.split(" ").filter(Boolean);
  const explicitShortReply =
    /^(?:iya|ya|boleh|silakan|oke|baik|lanjut|tidak|enggak|jangan|batal|ulangi|satu|dua|tiga|empat|pertama|kedua|ketiga|keempat)$/i;

  // 1 kata yang muncul persis di ekor kalimat Tiara dalam 4 detik terakhir (pantulan akhir speaker)
  if (
    heardTokens.length === 1 &&
    msSinceAssistantEnded <= 4000 &&
    !explicitShortReply.test(heardNorm)
  ) {
    const tailWords = lastNorm.split(" ").slice(-6);
    if (heardNorm.length >= 4 && tailWords.includes(heardNorm)) {
      return true;
    }
  }

  // Frasa >= 2 kata yang persis merupakan potongan kalimat yang baru saja diucapkan Tiara
  if (heardTokens.length >= 2 && lastNorm.includes(heardNorm)) {
    return true;
  }

  // Cek kemiripan kata tinggi (>= 70%) dari ucapan Tiara sendiri dalam 7 detik terakhir
  if (heardTokens.length >= 2 && msSinceAssistantEnded <= 7000) {
    const humanStarter =
      /^(?:tolong|coba|iya|ya|boleh|silakan|oke|tidak|jangan|pilih|yang pertama|yang kedua|yang ketiga|nomor|carikan|cari|buka|bacakan|kirim|tambah)\b/i;
    if (!humanStarter.test(heardNorm)) {
      const assistantSet = new Set(
        lastNorm.split(" ").filter((w) => w.length >= 3)
      );
      const sigHeard = heardTokens.filter((w) => w.length >= 3);
      if (sigHeard.length >= 2) {
        const overlap = sigHeard.filter((w) => assistantSet.has(w)).length;
        if (overlap / sigHeard.length >= 0.7) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Deteksi panggilan Wake Word "Hey Tiara" / "Halo Tiara" dengan toleransi fonetik jarak jauh
 */
export function parseWakeWord(rawTranscript: string): {
  isWakeWord: boolean;
  commandAfterWake: string;
} {
  const cleaned = rawTranscript.trim();
  if (!cleaned) return { isWakeWord: false, commandAfterWake: "" };

  // Pola nama Tiara dengan toleransi variasi fonetik saat suara terdengar dari jarak 1-3 meter
  const NAME_PATTERN =
    "(?:tiara|tyara|tiyara|ciara|tara|kiara|klara|mutiara|siara|piara)";

  // 1. Prefix sapaan + Nama: "hey tiara", "halo tara", "oi ciara", "eh tiara", "tolong tiara", dsb.
  const greetingWakeRegex = new RegExp(
    `\\b(?:hey|hei|hai|halo|hallo|helo|alo|he|oi|oy|eh|oke|ok|tolong)\\s+${NAME_PATTERN}\\b`,
    "i"
  );
  const matchGreeting = cleaned.match(greetingWakeRegex);
  if (matchGreeting && matchGreeting.index !== undefined) {
    const after = cleaned
      .slice(matchGreeting.index + matchGreeting[0].length)
      .replace(/^[,.\s?!-]+/, "")
      .trim();
    return { isWakeWord: true, commandAfterWake: after };
  }

  // 2. Langsung nama di awal kalimat: "Tiara apa jadwal hari ini", "Ciara tolong baca notulen"
  const directStartRegex = new RegExp(
    `^(?:(?:eh|oi|oy|oke|ok|tolong)\\s+)?${NAME_PATTERN}\\b[,.\\s?!-]*(.*)$`,
    "i"
  );
  const matchDirect = cleaned.match(directStartRegex);
  if (matchDirect) {
    return {
      isWakeWord: true,
      commandAfterWake: (matchDirect[1] || "").replace(/^[,.\s?!-]+/, "").trim(),
    };
  }

  return { isWakeWord: false, commandAfterWake: "" };
}

/**
 * Konversi format jam "09.00" atau "09:00" ke total menit untuk deteksi bentrok jadwal
 */
export function timeToMinutes(t: string): number {
  const norm = t.trim().replace(":", ".");
  const [hStr, mStr = "0"] = norm.split(".");
  const h = Number.parseInt(hStr, 10);
  const m = Number.parseInt(mStr, 10);
  if (Number.isNaN(h)) return 0;
  return h * 60 + (Number.isNaN(m) ? 0 : m);
}

export function minutesToTimeDot(totalMins: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, totalMins));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}.${String(m).padStart(2, "0")}`;
}

export function normalizeTimeDot(t: string): string {
  return minutesToTimeDot(timeToMinutes(t));
}

export function detectScheduleConflicts(
  candidate: { tanggal: string; mulai: string; selesai: string; id?: number },
  allAgendas: AgendaItem[]
): AgendaItem[] {
  const startA = timeToMinutes(candidate.mulai);
  const endA = timeToMinutes(candidate.selesai);
  if (endA <= startA) return [];

  return allAgendas.filter((item) => {
    if (candidate.id !== undefined && item.id === candidate.id) return false;
    if (item.tanggal !== candidate.tanggal) return false;
    const startB = timeToMinutes(item.mulai);
    const endB = timeToMinutes(item.selesai);
    return startA < endB && endA > startB;
  });
}

const ID_DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const ID_MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export function getDayNameFromIso(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return ID_DAYS[dt.getDay()] || "Hari";
}

export function formatIsoToReadable(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const monthName = ID_MONTHS[m - 1] || "";
  return `${d} ${monthName} ${y}`;
}

/**
 * Mendapatkan objek Date dalam zona Waktu Indonesia Tengah (WITA / UTC+8).
 * Berlaku di Lombok Tengah, NTB, Bali, dan Indonesia bagian tengah.
 */
export function getWitaDate(): Date {
  try {
    const now = new Date();
    const witaString = now.toLocaleString("en-US", {
      timeZone: "Asia/Makassar",
    });
    return new Date(witaString);
  } catch {
    const now = new Date();
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
    return new Date(utcMs + 8 * 3600000);
  }
}

export function getWitaHours(): number {
  return getWitaDate().getHours();
}

/**
 * Ucapan salam dinamis berdasarkan jam Waktu Indonesia Tengah (WITA / UTC+8):
 * - 05:00 – 10:59 : Selamat pagi
 * - 11:00 – 14:59 : Selamat siang
 * - 15:00 – 18:29 : Selamat sore
 * - 18:30 – 04:59 : Selamat malam
 */
export function getGreetingWita(): string {
  const wita = getWitaDate();
  const h = wita.getHours();
  const m = wita.getMinutes();

  if (h >= 5 && h < 11) return "Selamat pagi";
  if (h >= 11 && h < 15) return "Selamat siang";
  if (h >= 15 && (h < 18 || (h === 18 && m < 30))) return "Selamat sore";
  return "Selamat malam";
}

export function addDaysIso(baseIso: string, offsetDays: number): string {
  const [y, m, d] = baseIso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + offsetDays);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export interface ScheduleQueryResolution {
  queryDates: string[];
  dateLabel: string;
  isWeekRange: boolean;
  isSpecificDay: boolean;
}

/**
 * Pemroses kueri tanggal & hari untuk pertanyaan jadwal kegiatan (PRD Assistant Multi-Turn)
 * Mendukung "sabtu depan minggu ini", "hari jumat", "besok", "lusa", "pekan ini", dll.
 */
export function resolveScheduleQuery(
  rawSpeech: string,
  baseDateIso = "2026-11-04"
): ScheduleQueryResolution {
  const lower = rawSpeech.toLowerCase().trim();

  // 1. Cek Hari Relatif Populer
  if (/\bbesok\b/i.test(lower)) {
    const target = addDaysIso(baseDateIso, 1);
    const dayName = getDayNameFromIso(target);
    const dateFormatted = formatIsoToReadable(target);
    return {
      queryDates: [target],
      dateLabel: `besok (${dayName}, ${dateFormatted})`,
      isWeekRange: false,
      isSpecificDay: true,
    };
  }

  if (/\blusa\b/i.test(lower)) {
    const target = addDaysIso(baseDateIso, 2);
    const dayName = getDayNameFromIso(target);
    const dateFormatted = formatIsoToReadable(target);
    return {
      queryDates: [target],
      dateLabel: `lusa (${dayName}, ${dateFormatted})`,
      isWeekRange: false,
      isSpecificDay: true,
    };
  }

  if (/\bkemarin\b/i.test(lower)) {
    const target = addDaysIso(baseDateIso, -1);
    const dayName = getDayNameFromIso(target);
    const dateFormatted = formatIsoToReadable(target);
    return {
      queryDates: [target],
      dateLabel: `kemarin (${dayName}, ${dateFormatted})`,
      isWeekRange: false,
      isSpecificDay: true,
    };
  }

  // 2. Cek Nama Hari dalam Seminggu
  const DOW_MAP: Record<string, { dow: number; name: string }> = {
    minggu: { dow: 0, name: "Minggu" },
    senin: { dow: 1, name: "Senin" },
    selasa: { dow: 2, name: "Selasa" },
    rabu: { dow: 3, name: "Rabu" },
    kamis: { dow: 4, name: "Kamis" },
    jumat: { dow: 5, name: "Jumat" },
    "jum'at": { dow: 5, name: "Jumat" },
    sabtu: { dow: 6, name: "Sabtu" },
  };

  const [by, bm, bd] = baseDateIso.split("-").map(Number);
  const baseDow = new Date(by, bm - 1, bd).getDay();

  for (const [dayKey, { dow: targetDow, name: dayName }] of Object.entries(DOW_MAP)) {
    if (new RegExp(`\\b${dayKey}\\b`, "i").test(lower)) {
      let diff = targetDow - baseDow;
      if (diff < 0) diff += 7; // Hari terdekat ke depan

      // Jika user menyebut secara eksplisit "minggu depan" / "pekan depan" TANPA frasa "minggu ini"
      const wantsNextWeek =
        /\b(?:minggu depan|pekan depan)\b/i.test(lower) &&
        !/\b(?:minggu ini|pekan ini)\b/i.test(lower);
      if (wantsNextWeek) {
        diff += 7;
      }

      const targetIso = addDaysIso(baseDateIso, diff);
      const dateFormatted = formatIsoToReadable(targetIso);
      return {
        queryDates: [targetIso],
        dateLabel: `hari ${dayName}, ${dateFormatted}`,
        isWeekRange: false,
        isSpecificDay: true,
      };
    }
  }

  // 3. Cek Rentang Pekan / Minggu
  if (/\b(pekan depan|minggu depan)\b/i.test(lower)) {
    let daysToMonday = 1 - baseDow;
    if (daysToMonday <= 0) daysToMonday += 7;
    const mondayNext = addDaysIso(baseDateIso, daysToMonday);
    const rangeDates: string[] = [];
    for (let i = 0; i < 7; i++) {
      rangeDates.push(addDaysIso(mondayNext, i));
    }
    const startStr = formatIsoToReadable(rangeDates[0]);
    const endStr = formatIsoToReadable(rangeDates[6]);
    return {
      queryDates: rangeDates,
      dateLabel: `pekan depan (${startStr} – ${endStr})`,
      isWeekRange: true,
      isSpecificDay: false,
    };
  }

  if (/\b(minggu ini|pekan ini|sepekan|seminggu)\b/i.test(lower)) {
    let daysToMonday = 1 - baseDow;
    if (daysToMonday > 0) daysToMonday -= 7;
    const mondayThis = addDaysIso(baseDateIso, daysToMonday);
    const rangeDates: string[] = [];
    for (let i = 0; i < 7; i++) {
      rangeDates.push(addDaysIso(mondayThis, i));
    }
    const startStr = formatIsoToReadable(rangeDates[0]);
    const endStr = formatIsoToReadable(rangeDates[6]);
    return {
      queryDates: rangeDates,
      dateLabel: `pekan ini (${startStr} – ${endStr})`,
      isWeekRange: true,
      isSpecificDay: false,
    };
  }

  // 4. Default: Hari ini
  const dayName = getDayNameFromIso(baseDateIso);
  const dateFormatted = formatIsoToReadable(baseDateIso);
  return {
    queryDates: [baseDateIso],
    dateLabel: `hari ini (${dayName}, ${dateFormatted})`,
    isWeekRange: false,
    isSpecificDay: true,
  };
}

/**
 * Ekstraksi field agenda dari kalimat perintah suara Bahasa Indonesia (PRD 5.1)
 * Contoh: "Tambah rapat dengan Kabag Teknik Jumat jam 9 di Ruang Dirut"
 */
export function extractAgendaFromSpeech(
  rawSpeech: string,
  baseDateIso = "2026-11-04"
): VoiceAgendaDraft {
  const text = rawSpeech.trim();
  const lower = text.toLowerCase();

  // 1. Jenis agenda
  let jenis: JenisAgenda = "rapat";
  if (/\b(kunjungan|tinjau|tinjauan|inspeksi|lapangan|lokasi|cek)\b/i.test(lower)) {
    jenis = "kunjungan";
  } else if (
    /\b(rapat|koordinasi|evaluasi|pertemuan|briefing|diskusi|audiensi)\b/i.test(lower)
  ) {
    jenis = "rapat";
  } else {
    jenis = "lainnya";
  }

  // 2. Tanggal (basis Rabu, 4 Nov 2026 = day index 3)
  let tanggal = baseDateIso;
  if (/\blusa\b/i.test(lower)) {
    tanggal = addDaysIso(baseDateIso, 2);
  } else if (/\bbesok\b/i.test(lower)) {
    tanggal = addDaysIso(baseDateIso, 1);
  } else if (/\bhari ini\b/i.test(lower)) {
    tanggal = baseDateIso;
  } else {
    const dayMap: Record<string, number> = {
      minggu: 0,
      senin: 1,
      selasa: 2,
      rabu: 3,
      kamis: 4,
      jumat: 5,
      "jum'at": 5,
      sabtu: 6,
    };
    const [by, bm, bd] = baseDateIso.split("-").map(Number);
    const baseDow = new Date(by, bm - 1, bd).getDay();
    for (const [dayName, targetDow] of Object.entries(dayMap)) {
      if (new RegExp(`\\b${dayName}\\b`, "i").test(lower)) {
        let diff = targetDow - baseDow;
        if (diff < 0) diff += 7;
        tanggal = addDaysIso(baseDateIso, diff);
        break;
      }
    }
  }

  // 3. Jam mulai & selesai
  let mulai = "09.00";
  let selesai = "10.00";
  const timeMatch = lower.match(
    /(?:jam|pukul)\s*(\d{1,2})(?:[.:](\d{2}))?\s*(pagi|siang|sore|malam)?(?:\s*(?:sampai|hingga|-)\s*(?:jam|pukul)?\s*(\d{1,2})(?:[.:](\d{2}))?)?/i
  );
  if (timeMatch) {
    let h1 = Number.parseInt(timeMatch[1], 10);
    const m1 = timeMatch[2] ? Number.parseInt(timeMatch[2], 10) : 0;
    const meridiem = timeMatch[3];
    if ((meridiem === "siang" || meridiem === "sore") && h1 < 12) h1 += 12;
    if (meridiem === "malam" && h1 < 12) h1 += 12;
    mulai = minutesToTimeDot(h1 * 60 + m1);

    if (timeMatch[4]) {
      let h2 = Number.parseInt(timeMatch[4], 10);
      const m2 = timeMatch[5] ? Number.parseInt(timeMatch[5], 10) : 0;
      if (h2 < h1 && h2 < 12) h2 += 12;
      selesai = minutesToTimeDot(h2 * 60 + m2);
    } else {
      selesai = minutesToTimeDot(h1 * 60 + m1 + 60);
    }
  }

  // 4. Lokasi ("di ...")
  let lokasi =
    jenis === "kunjungan" ? "Lokasi IPA / Lapangan" : "Ruang Rapat Utama";
  const locMatch = text.match(
    /\bdi\s+([A-Za-z0-9\s]+?)(?=\s+(?:jam|pukul|hari|besok|lusa|senin|selasa|rabu|kamis|jumat|sabtu|minggu)\b|$)/i
  );
  if (locMatch && locMatch[1].trim().length >= 3) {
    lokasi = locMatch[1]
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  } else if (/kabag|direksi|dirut/i.test(lower) && jenis === "rapat") {
    lokasi = "Ruang Dirut";
  }

  // 5. Judul bersih
  let cleanTitle = text
    .replace(
      /^(?:tolong\s+)?(?:tiara\s+)?(?:tambah|tambahkan|buat|buatkan|catat|jadwalkan)\s+(?:agenda\s+|jadwal\s+)?/i,
      ""
    )
    .replace(
      /\s+(?:pada\s+)?(?:hari\s+)?(?:hari ini|besok|lusa|senin|selasa|rabu|kamis|jumat|jum'at|sabtu|minggu)\b.*$/i,
      ""
    )
    .replace(/\s+(?:jam|pukul)\s*\d{1,2}.*$/i, "")
    .replace(/\s+\bdi\s+[A-Za-z0-9\s]+$/i, "")
    .trim();

  if (!cleanTitle || cleanTitle.length < 3) {
    cleanTitle = "Rapat Koordinasi Direksi";
  } else {
    cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
  }

  return {
    judul: cleanTitle,
    tanggal,
    mulai,
    selesai,
    lokasi,
    jenis,
    peserta: jenis === "rapat" ? 5 : 4,
    catatan: `Dicatat melalui perintah suara Asisten Tiara: "${text}"`,
    kalimatAsli: text,
  };
}

// Type helper untuk Browser SpeechRecognition
export interface BrowserSpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

export interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [altIndex: number]: {
        transcript: string;
      };
    };
  };
}

export function createSpeechRecognition(): BrowserSpeechRecognition | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => BrowserSpeechRecognition;
    webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
  };
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!Ctor) return null;
  return new Ctor();
}

let activeFarFieldStream: MediaStream | null = null;

/**
 * Mengaktifkan Automatic Gain Control (AGC) dan far-field audio capture pada level browser/driver
 * agar mikrofon sensitif menangkap suara dari jarak 1 - 3 meter tanpa harus menempelkan mulut ke mic.
 */
export async function enableFarFieldMicBoost(): Promise<MediaStream | null> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return null;
  }
  if (
    activeFarFieldStream &&
    activeFarFieldStream.getAudioTracks().some((t) => t.readyState === "live")
  ) {
    return activeFarFieldStream;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: false, // JANGAN matikan/redam suara pelan/jauh
        autoGainControl: true,   // Aktifkan AGC agar suara dari kejauhan diamplifikasi secara dinamis
        channelCount: 1,
      },
    });
    activeFarFieldStream = stream;
    return stream;
  } catch (err) {
    console.warn(
      "Far-field mic boost stream tidak dapat diaktifkan, fallback ke default speech:",
      err
    );
    return null;
  }
}

export function releaseFarFieldMicBoost(): void {
  if (activeFarFieldStream) {
    try {
      activeFarFieldStream.getTracks().forEach((t) => t.stop());
    } catch {
      // noop
    }
    activeFarFieldStream = null;
  }
}
