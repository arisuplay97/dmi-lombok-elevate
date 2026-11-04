import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  INITIAL_AGENDA,
  INITIAL_NOTULEN,
  INITIAL_RECIPIENTS,
  INITIAL_REMINDER,
  INITIAL_SETTINGS,
  INITIAL_TUGAS,
  INITIAL_WA_LOGS,
  TODAY_ISO,
} from "@/data/pdam-data";
import {
  buildNotulenReadoutText,
  callConfiguredLlm,
  generateContextualReplyWithAi,
  resolveCandidateChoice,
  searchNotulenSmart,
  transcribeAndSummarizeAudio,
} from "@/lib/ai-service";
import {
  createSpeechRecognition,
  enableFarFieldMicBoost,
  extractAgendaFromSpeech,
  formatIsoToReadable,
  getDayNameFromIso,
  getGreetingWita,
  getWitaDate,
  isBrowserCurrentlySpeaking,
  isLikelySpeakerEcho,
  normalizeTimeDot,
  parseWakeWord,
  pauseSpeaking,
  playChime,
  releaseFarFieldMicBoost,
  resolveScheduleQuery,
  resumeSpeaking,
  speakWithConfiguredProvider,
  stopSpeaking,
  type BrowserSpeechRecognition,
} from "@/lib/tiara-speech";
import {
  checkWangsafDeviceStatus,
  sendWhatsappViaGateway,
  type WangsafDeviceStatusResult,
} from "@/lib/wangsaf-service";
import type {
  AgendaItem,
  AssistantSettings,
  ChatTurn,
  DialogStage,
  NotulenFormPrefill,
  NotulenItem,
  NotulenPhoto,
  NotulenReadScope,
  StatusNotulen,
  TugasItem,
  UserRole,
  VoiceAgendaDraft,
  WaGatewayProvider,
  WaLogItem,
  WaRecipient,
} from "@/lib/types";

const STORAGE_KEY = "pdam_tiara_state_v2";
const SETTINGS_STORAGE_KEY = "pdam_tiara_settings_v3";
const SECRETS_SESSION_KEY = "pdam_tiara_secrets_v1";

interface SecretKeysBundle {
  aiApiKey: string;
  sttApiKey: string;
  ttsApiKey: string;
  cartesiaApiKey: string;
  waApiToken: string;
}

interface ReminderState {
  visible: boolean;
  snoozed: boolean;
  waktu: string;
  judul: string;
  teks: string;
}

interface CreateManualNotulenPayload {
  judul: string;
  tanggalIso: string;
  jam: string;
  lokasi: string;
  pimpinan: string;
  peserta: number;
  durasiMenit: number;
  status: StatusNotulen;
  ringkasan: string;
  keputusan: string[];
  transkrip: string;
  dokumentasiFoto: NotulenPhoto[];
  audioFileName?: string;
  tugasBaru: Array<{
    judul: string;
    pj: string;
    tenggat: string;
    segera: boolean;
  }>;
}

interface PdamStoreValue {
  // Data
  agendas: AgendaItem[];
  notulenList: NotulenItem[];
  tugasList: TugasItem[];
  waLogs: WaLogItem[];
  recipients: WaRecipient[];
  settings: AssistantSettings;

  // Navigasi & Fokus Notulen
  selectedNotulenId: number;
  setSelectedNotulenId: (id: number) => void;
  focusedNotulenId: number | null;
  candidateNotulens: NotulenItem[];
  candidateQueryLabel: string;
  candidateMatchReasons: Record<number, string>;
  dismissCandidateNotulens: () => void;
  dialogStage: DialogStage;
  conversationHistory: ChatTurn[];

  // Assistant ("Tiara") Live State
  assistantEnabled: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  isSpeechPaused: boolean;
  awaitingCommand: boolean;
  liveTranscript: string;
  lastAssistantReply: string;
  micSupported: boolean;
  reminder: ReminderState;

  // Modals
  voiceDraft: VoiceAgendaDraft | null;
  setVoiceDraft: (draft: VoiceAgendaDraft | null) => void;
  uploadModalOpen: boolean;
  setUploadModalOpen: (open: boolean) => void;
  createNotulenModalOpen: boolean;
  setCreateNotulenModalOpen: (open: boolean) => void;
  notulenPrefill: NotulenFormPrefill | null;
  openCreateNotulenManual: (prefill?: NotulenFormPrefill | null) => void;
  openCreateNotulenFromAgenda: (agenda: AgendaItem) => void;
  searchModalOpen: boolean;
  setSearchModalOpen: (open: boolean) => void;

  // Assistant & Multi-Turn Actions
  activateAndGreetTiara: () => void;
  toggleWakeWordListening: () => void;
  turnOffAssistantMic: () => void;
  simulateWakeWord: (customCommand?: string) => void;
  sendCommandToTiara: (commandText: string) => void;
  selectDisambiguatedNotulen: (notulenId: number, forceReadNow?: boolean) => void;
  readNotulenAloud: (notulenId: number, scope?: NotulenReadScope) => void;
  pauseOrResumeSpeech: () => void;
  stopTiaraSpeakingOnly: () => void;
  endConversationSession: () => void;
  triggerReminderAnnouncement: (customText?: string) => void;
  snoozeReminder: () => void;
  dismissReminder: () => void;
  speakCustom: (text: string) => void;

  // CRUD Agenda
  addAgenda: (item: Omit<AgendaItem, "id">) => AgendaItem;
  updateAgenda: (id: number, patch: Partial<AgendaItem>) => void;
  deleteAgenda: (id: number) => void;
  toggleAgendaDone: (id: number) => void;

  // CRUD Notulen & Dokumentasi Foto
  uploadAudioNotulen: (payload: {
    judul: string;
    fileName: string;
    durasiMenit: number;
    file?: File;
  }) => void;
  createManualNotulen: (payload: CreateManualNotulenPayload) => NotulenItem;
  updateNotulen: (id: number, patch: Partial<NotulenItem>) => void;
  addPhotosToNotulen: (id: number, photos: NotulenPhoto[]) => void;
  removePhotoFromNotulen: (id: number, photoId: string) => void;
  approveAndLockNotulen: (id: number) => void;
  deleteNotulenAudio: (id: number) => void;
  sendNotulenSummaryToWa: (id: number) => void;

  // CRUD Tugas
  toggleTugas: (id: number) => void;
  addTugas: (payload: Omit<TugasItem, "id">) => void;
  deleteTugas: (id: number) => void;

  // Settings, AI API & WA
  serverSyncedAt: string | null;
  updateSettings: (patch: Partial<AssistantSettings>) => void;
  saveSettingsNow: (sectionLabel?: string) => void;
  toggleDarkMode: () => void;
  clearAllApiKeys: () => void;
  testAiConnection: () => Promise<{ ok: boolean; message: string }>;
  checkWaDeviceStatus: () => Promise<WangsafDeviceStatusResult>;
  setActiveRole: (role: UserRole) => void;
  toggleRecipient: (id: number) => void;
  addRecipient: (r: Omit<WaRecipient, "id">) => void;
  sendTestWaBriefing: () => void;
  sendDirectTestWhatsapp: (targetPhone: string) => Promise<void>;
  retryWaLog: (id: number) => void;
  resetDemoData: () => void;
}

const PdamContext = createContext<PdamStoreValue | null>(null);

interface PersistedShape {
  agendas: AgendaItem[];
  notulenList: NotulenItem[];
  tugasList: TugasItem[];
  waLogs: WaLogItem[];
  recipients: WaRecipient[];
  settings: AssistantSettings;
}

const VALID_WA_GATEWAYS: WaGatewayProvider[] = [
  "Wangsaf",
  "WhatsApp Business API",
  "Custom Webhook",
];

function sanitizeLoadedSettings(
  rawSettings?: Partial<AssistantSettings>
): AssistantSettings {
  const merged: AssistantSettings = {
    ...INITIAL_SETTINGS,
    ...(rawSettings ?? {}),
    persistSecretsOnDevice: true,
  };

  // Migrasi otomatis bila sebelumnya tersimpan gateway lama ("Fonnte" / "Wablas") atau token dummy lama
  if (!VALID_WA_GATEWAYS.includes(merged.waGateway)) {
    merged.waGateway = "Wangsaf";
  }
  if (merged.waApiToken === "simulasi-token-pdam-loteng") {
    merged.waApiToken = "";
  }
  if (!merged.waBaseUrl) {
    merged.waBaseUrl = INITIAL_SETTINGS.waBaseUrl;
  }

  // Perbaiki otomatis bila user menggunakan gateway OpenAI-compatible (mis. Dahono Router)
  // namun tidak sengaja memilih custom-header berisi spasi/nama model
  if (
    merged.aiAuthScheme === "custom-header" &&
    (/\s/.test(merged.aiCustomHeader.trim()) ||
      /dahono\.com|openrouter\.ai|deepseek\.com/i.test(merged.aiBaseUrl))
  ) {
    merged.aiAuthScheme = "bearer";
    merged.aiCustomHeader = "X-API-Key";
    if (/dahono\.com/i.test(merged.aiBaseUrl)) {
      merged.aiCustomName = "Dahono Router";
    }
  }

  // Muat kunci rahasia dari sessionStorage atau localStorage
  if (typeof window !== "undefined") {
    try {
      const rawSession = window.sessionStorage.getItem(SECRETS_SESSION_KEY);
      if (rawSession) {
        const sec = JSON.parse(rawSession) as Partial<SecretKeysBundle>;
        if (sec.aiApiKey) merged.aiApiKey = sec.aiApiKey;
        if (sec.sttApiKey) merged.sttApiKey = sec.sttApiKey;
        if (sec.ttsApiKey) merged.ttsApiKey = sec.ttsApiKey;
        if (sec.cartesiaApiKey) merged.cartesiaApiKey = sec.cartesiaApiKey;
        if (sec.waApiToken) merged.waApiToken = sec.waApiToken;
      }
    } catch {
      // Abaikan bila sessionStorage diblokir browser
    }
  }

  return merged;
}

function formatIsoToIndoShort(iso: string): string {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agu",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${months[m - 1] || ""} ${y}`;
}

function nowHHMM(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}.${String(
    now.getMinutes()
  ).padStart(2, "0")}`;
}

// Persistensi settings & secrets di perangkat dan server
function persistSettingsToStorage(settings: AssistantSettings): boolean {
  if (typeof window === "undefined") return false;
  try {
    const secretsPayload: SecretKeysBundle = {
      aiApiKey: settings.aiApiKey,
      sttApiKey: settings.sttApiKey,
      ttsApiKey: settings.ttsApiKey,
      cartesiaApiKey: settings.cartesiaApiKey,
      waApiToken: settings.waApiToken,
    };
    try {
      window.sessionStorage.setItem(
        SECRETS_SESSION_KEY,
        JSON.stringify(secretsPayload)
      );
    } catch {
      // ignore
    }

    // Selalu simpan juga di localStorage agar di browser PWA / tab baru tidak hilang
    const safeSettingsForLocal: AssistantSettings = {
      ...settings,
      persistSecretsOnDevice: true,
    };

    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify(safeSettingsForLocal)
    );
    return true;
  } catch {
    return false;
  }
}

async function fetchSettingsFromServer(): Promise<{
  found: boolean;
  updatedAt?: string | null;
  settings?: Partial<AssistantSettings>;
} | null> {
  if (typeof window === "undefined") return null;
  const endpoints = ["/api/settings-sync", "./api/settings-sync.php"];
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const ct = (res.headers.get("content-type") || "").toLowerCase();
      if (!res.ok || !ct.includes("application/json")) continue;
      const data = await res.json();
      if (data && data.ok) {
        return {
          found: Boolean(data.found && data.settings),
          updatedAt: data.updatedAt || null,
          settings: data.settings,
        };
      }
    } catch {
      // Lanjut ke kandidat endpoint berikutnya
    }
  }
  return null;
}

async function pushSettingsToServer(
  settings: AssistantSettings
): Promise<{ ok: boolean; updatedAt?: string }> {
  if (typeof window === "undefined") return { ok: false };
  const endpoints = ["/api/settings-sync", "./api/settings-sync.php"];
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ settings }),
      });
      const ct = (res.headers.get("content-type") || "").toLowerCase();
      if (!res.ok || !ct.includes("application/json")) continue;
      const data = await res.json();
      if (data && data.ok) {
        return { ok: true, updatedAt: data.updatedAt };
      }
    } catch {
      // Lanjut ke kandidat endpoint berikutnya
    }
  }
  return { ok: false };
}

interface RemoteStateBundle {
  found: boolean;
  updatedAt?: string | null;
  agendas?: AgendaItem[];
  notulenList?: NotulenItem[];
  tugasList?: TugasItem[];
  waLogs?: WaLogItem[];
  recipients?: WaRecipient[];
}

async function fetchStateFromServer(): Promise<RemoteStateBundle | null> {
  if (typeof window === "undefined") return null;
  const endpoints = ["/api/state-sync", "./api/state-sync.php"];
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const ct = (res.headers.get("content-type") || "").toLowerCase();
      if (!res.ok || !ct.includes("application/json")) continue;
      const data = await res.json();
      if (data && data.ok) {
        return {
          found: Boolean(data.found && Array.isArray(data.agendas)),
          updatedAt: data.updatedAt || null,
          agendas: data.agendas,
          notulenList: data.notulenList,
          tugasList: data.tugasList,
          waLogs: data.waLogs,
          recipients: data.recipients,
        };
      }
    } catch {
      // Lanjut ke kandidat endpoint berikutnya
    }
  }
  return null;
}

async function pushStateToServer(payload: {
  agendas: AgendaItem[];
  notulenList: NotulenItem[];
  tugasList: TugasItem[];
  waLogs: WaLogItem[];
  recipients: WaRecipient[];
}): Promise<{ ok: boolean; updatedAt?: string }> {
  if (typeof window === "undefined") return { ok: false };
  const endpoints = ["/api/state-sync", "./api/state-sync.php"];
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const ct = (res.headers.get("content-type") || "").toLowerCase();
      if (!res.ok || !ct.includes("application/json")) continue;
      const data = await res.json();
      if (data && data.ok) {
        return { ok: true, updatedAt: data.updatedAt };
      }
    } catch {
      // Lanjut ke kandidat endpoint berikutnya
    }
  }
  return { ok: false };
}

function loadInitialState(): PersistedShape {
  if (typeof window === "undefined") {
    return {
      agendas: INITIAL_AGENDA,
      notulenList: INITIAL_NOTULEN,
      tugasList: INITIAL_TUGAS,
      waLogs: INITIAL_WA_LOGS,
      recipients: INITIAL_RECIPIENTS,
      settings: INITIAL_SETTINGS,
    };
  }

  let dedicatedSettings: Partial<AssistantSettings> | undefined;
  try {
    const rawSettings = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (rawSettings) {
      dedicatedSettings = JSON.parse(rawSettings) as Partial<AssistantSettings>;
    }
  } catch {
    // ignore
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error("empty");
    const parsed = JSON.parse(raw) as Partial<PersistedShape>;
    return {
      agendas: parsed.agendas?.length ? parsed.agendas : INITIAL_AGENDA,
      notulenList: parsed.notulenList?.length
        ? parsed.notulenList
        : INITIAL_NOTULEN,
      tugasList: parsed.tugasList?.length ? parsed.tugasList : INITIAL_TUGAS,
      waLogs: parsed.waLogs?.length ? parsed.waLogs : INITIAL_WA_LOGS,
      recipients: parsed.recipients?.length
        ? parsed.recipients
        : INITIAL_RECIPIENTS,
      settings: sanitizeLoadedSettings({
        ...(parsed.settings ?? {}),
        ...(dedicatedSettings ?? {}),
      }),
    };
  } catch {
    return {
      agendas: INITIAL_AGENDA,
      notulenList: INITIAL_NOTULEN,
      tugasList: INITIAL_TUGAS,
      waLogs: INITIAL_WA_LOGS,
      recipients: INITIAL_RECIPIENTS,
      settings: sanitizeLoadedSettings(dedicatedSettings),
    };
  }
}

export function PdamStoreProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const initial = useMemo(() => loadInitialState(), []);

  const [agendas, setAgendas] = useState<AgendaItem[]>(initial.agendas);
  const [notulenList, setNotulenList] = useState<NotulenItem[]>(
    initial.notulenList
  );
  const [tugasList, setTugasList] = useState<TugasItem[]>(initial.tugasList);
  const [waLogs, setWaLogs] = useState<WaLogItem[]>(initial.waLogs);
  const [recipients, setRecipients] = useState<WaRecipient[]>(
    initial.recipients
  );
  const [settings, setSettings] = useState<AssistantSettings>(initial.settings);
  const [serverSyncedAt, setServerSyncedAt] = useState<string | null>(null);
  const serverHydratedRef = useRef<boolean>(false);
  const serverSyncDebounceRef = useRef<number | null>(null);
  const serverStateHydratedRef = useRef<boolean>(false);
  const applyingRemoteStateRef = useRef<boolean>(false);
  const lastRemoteStateAtRef = useRef<string | null>(null);
  const stateSyncDebounceRef = useRef<number | null>(null);

  // Fokus & Konteks Percakapan Multi-Turn
  const [selectedNotulenId, setSelectedNotulenId] = useState<number>(
    initial.notulenList[0]?.id ?? 1
  );
  const [focusedNotulenId, setFocusedNotulenId] = useState<number | null>(null);
  const [candidateNotulens, setCandidateNotulens] = useState<NotulenItem[]>([]);
  const [candidateQueryLabel, setCandidateQueryLabel] = useState<string>("");
  const [candidateMatchReasons, setCandidateMatchReasons] = useState<
    Record<number, string>
  >({});
  const [dialogStage, setDialogStage] = useState<DialogStage>("idle");
  const [conversationHistory, setConversationHistory] = useState<ChatTurn[]>(
    []
  );

  // Assistant Live State
  const [assistantEnabled, setAssistantEnabled] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isSpeechPaused, setIsSpeechPaused] = useState<boolean>(false);
  const [liveTranscript, setLiveTranscript] = useState<string>("");
  const [lastAssistantReply, setLastAssistantReply] = useState<string>("");
  const [reminder, setReminder] = useState<ReminderState>({
    visible: true,
    snoozed: false,
    waktu: INITIAL_REMINDER.waktu,
    judul: INITIAL_REMINDER.judulAcara,
    teks: INITIAL_REMINDER.teks,
  });

  // Modals
  const [voiceDraft, setVoiceDraft] = useState<VoiceAgendaDraft | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState<boolean>(false);
  const [createNotulenModalOpen, setCreateNotulenModalOpen] =
    useState<boolean>(false);
  const [notulenPrefill, setNotulenPrefill] =
    useState<NotulenFormPrefill | null>(null);
  const [searchModalOpen, setSearchModalOpen] = useState<boolean>(false);

  const awaitingCommand = dialogStage !== "idle";

  const micSupported = useMemo(() => {
    if (typeof window === "undefined") return false;
    const w = window as unknown as {
      SpeechRecognition?: unknown;
      webkitSpeechRecognition?: unknown;
    };
    return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
  }, []);

  // Refs untuk callback asinkron suara & gateway
  const agendasRef = useRef(agendas);
  agendasRef.current = agendas;
  const notulenRef = useRef(notulenList);
  notulenRef.current = notulenList;
  const tugasRef = useRef(tugasList);
  tugasRef.current = tugasList;
  const recipientsRef = useRef(recipients);
  recipientsRef.current = recipients;
  const waLogsRef = useRef(waLogs);
  waLogsRef.current = waLogs;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const assistantEnabledRef = useRef(assistantEnabled);
  assistantEnabledRef.current = assistantEnabled;
  const isSpeakingRef = useRef(isSpeaking);
  isSpeakingRef.current = isSpeaking;
  const dialogStageRef = useRef<DialogStage>(dialogStage);
  dialogStageRef.current = dialogStage;
  const focusedNotulenIdRef = useRef<number | null>(focusedNotulenId);
  focusedNotulenIdRef.current = focusedNotulenId;
  const selectedNotulenIdRef = useRef<number>(selectedNotulenId);
  selectedNotulenIdRef.current = selectedNotulenId;
  const lastActiveNotulenIdRef = useRef<number | null>(null);
  const candidateNotulensRef = useRef<NotulenItem[]>(candidateNotulens);
  candidateNotulensRef.current = candidateNotulens;
  const historyRef = useRef<ChatTurn[]>(conversationHistory);
  historyRef.current = conversationHistory;
  const pendingAutoReadRef = useRef<boolean>(false);
  const lastSpokenFullTextRef = useRef<string>("");

  // Anti-Self-Echo & Speech Guard Refs
  const lastSpeechEndedAtRef = useRef<number>(0);
  const micIgnoreUntilRef = useRef<number>(0);
  const micResumeTimerRef = useRef<number | null>(null);
  const speakStartTimerRef = useRef<number | null>(null);
  const speechSessionIdRef = useRef<number>(0);

  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const sessionTimerRef = useRef<number | null>(null);
  const snoozeTimeoutRef = useRef<number | null>(null);
  const wakeInterimTimerRef = useRef<number | null>(null);
  const pendingInterimTextRef = useRef<string>("");
  const interimDebounceTimerRef = useRef<number | null>(null);
  const lastProcessedTextRef = useRef<string>("");
  const lastProcessedTimeRef = useRef<number>(0);

  const appendTurn = useCallback((role: "user" | "assistant", text: string) => {
    setConversationHistory((prev) => [
      ...prev.slice(-18),
      { id: Date.now() + Math.random(), role, text, waktu: nowHHMM() },
    ]);
  }, []);

  const refreshSessionTimeout = useCallback((nextStage?: DialogStage) => {
    if (nextStage) {
      setDialogStage(nextStage);
      dialogStageRef.current = nextStage;
    } else if (dialogStageRef.current === "idle") {
      setDialogStage("active_session");
      dialogStageRef.current = "active_session";
    }
    if (sessionTimerRef.current) {
      window.clearTimeout(sessionTimerRef.current);
    }
    // Pertahankan sesi percakapan aktif selama 45 detik setiap selesai giliran bicara agar percakapan menyambung terus
    sessionTimerRef.current = window.setTimeout(() => {
      setDialogStage("idle");
      dialogStageRef.current = "idle";
      setCandidateNotulens([]);
    }, 45000);
  }, []);

  // Sinkronisasi Dark Mode pada elemen <html> secara instan
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (settings.darkMode) {
      root.classList.add("dark");
      root.dataset.theme = "dark";
    } else {
      root.classList.remove("dark");
      root.dataset.theme = "light";
    }
  }, [settings.darkMode]);

  // Persistensi settings terpisah agar selalu tersimpan walau kuota foto besar
  useEffect(() => {
    persistSettingsToStorage(settings);
  }, [settings]);

  // Sinkronisasi Pengaturan Terpusat Lintas Perangkat (Multi-Device Server Sync)
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const remote = await fetchSettingsFromServer();
      if (cancelled || !remote) {
        serverHydratedRef.current = true;
        return;
      }
      if (remote.found && remote.settings) {
        const hydrated = sanitizeLoadedSettings({
          ...remote.settings,
          persistSecretsOnDevice: true,
        });
        setSettings(hydrated);
        persistSettingsToStorage(hydrated);
        setServerSyncedAt(remote.updatedAt || new Date().toISOString());
      } else {
        // Jika server belum memiliki file pengaturan namun perangkat ini sudah punya konfigurasi, unggah otomatis ke server
        const cur = settingsRef.current;
        const hasConfiguredSomething = Boolean(
          cur.aiApiKey.trim() ||
            cur.ttsApiKey.trim() ||
            cur.cartesiaApiKey.trim() ||
            cur.waApiToken.trim() ||
            cur.ttsProvider !== "browser" ||
            cur.aiProvider !== "gemini"
        );
        if (hasConfiguredSomething) {
          const pushed = await pushSettingsToServer(cur);
          if (!cancelled && pushed.ok) {
            setServerSyncedAt(pushed.updatedAt || new Date().toISOString());
          }
        }
      }
      serverHydratedRef.current = true;
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const scheduleServerSettingsPush = useCallback((nextSettings: AssistantSettings) => {
    if (typeof window === "undefined") return;
    if (serverSyncDebounceRef.current) {
      window.clearTimeout(serverSyncDebounceRef.current);
    }
    serverSyncDebounceRef.current = window.setTimeout(() => {
      void pushSettingsToServer(nextSettings).then((res) => {
        if (res.ok) {
          setServerSyncedAt(res.updatedAt || new Date().toISOString());
        }
      });
    }, 450);
  }, []);

  // Sinkronisasi Data Utama Lintas Perangkat (Web Desktop <-> Mobile PWA)
  useEffect(() => {
    let cancelled = false;

    const pullRemoteState = async (isInitial: boolean) => {
      const remote = await fetchStateFromServer();
      if (cancelled) return;
      if (!remote) {
        if (isInitial) serverStateHydratedRef.current = true;
        return;
      }
      if (remote.found && Array.isArray(remote.agendas)) {
        if (
          remote.updatedAt &&
          lastRemoteStateAtRef.current &&
          remote.updatedAt === lastRemoteStateAtRef.current
        ) {
          if (isInitial) serverStateHydratedRef.current = true;
          return;
        }
        applyingRemoteStateRef.current = true;
        lastRemoteStateAtRef.current = remote.updatedAt || null;
        if (remote.agendas.length > 0) setAgendas(remote.agendas);
        if (Array.isArray(remote.notulenList) && remote.notulenList.length > 0) {
          setNotulenList(remote.notulenList);
        }
        if (Array.isArray(remote.tugasList)) setTugasList(remote.tugasList);
        if (Array.isArray(remote.waLogs)) setWaLogs(remote.waLogs);
        if (Array.isArray(remote.recipients) && remote.recipients.length > 0) {
          setRecipients(remote.recipients);
        }
        window.setTimeout(() => {
          applyingRemoteStateRef.current = false;
        }, 120);
      } else if (isInitial) {
        const pushed = await pushStateToServer({
          agendas: agendasRef.current,
          notulenList: notulenRef.current,
          tugasList: tugasRef.current,
          waLogs: waLogsRef.current,
          recipients: recipientsRef.current,
        });
        if (!cancelled && pushed.ok && pushed.updatedAt) {
          lastRemoteStateAtRef.current = pushed.updatedAt;
        }
      }
      if (isInitial) serverStateHydratedRef.current = true;
    };

    void pullRemoteState(true);

    const onFocusOrVisible = () => {
      if (document.visibilityState === "visible") {
        void pullRemoteState(false);
        void fetchSettingsFromServer().then((remote) => {
          if (!cancelled && remote?.found && remote.settings) {
            const hydrated = sanitizeLoadedSettings({
              ...remote.settings,
              persistSecretsOnDevice: true,
            });
            setSettings(hydrated);
            persistSettingsToStorage(hydrated);
            if (remote.updatedAt) setServerSyncedAt(remote.updatedAt);
          }
        });
      }
    };

    window.addEventListener("focus", onFocusOrVisible);
    document.addEventListener("visibilitychange", onFocusOrVisible);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocusOrVisible);
      document.removeEventListener("visibilitychange", onFocusOrVisible);
    };
  }, []);

  // Persistensi data utama (agenda, notulen, tugas, penerima WA) ke localStorage & Server
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const safeSettingsForLocal: AssistantSettings =
        settings.persistSecretsOnDevice
          ? settings
          : {
              ...settings,
              aiApiKey: "",
              sttApiKey: "",
              ttsApiKey: "",
              cartesiaApiKey: "",
              waApiToken: "",
            };

      const payload: PersistedShape = {
        agendas,
        notulenList,
        tugasList,
        waLogs,
        recipients,
        settings: safeSettingsForLocal,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Settings tetap aman karena sudah disimpan terpisah di SETTINGS_STORAGE_KEY
    }

    if (serverStateHydratedRef.current && !applyingRemoteStateRef.current) {
      if (stateSyncDebounceRef.current) {
        window.clearTimeout(stateSyncDebounceRef.current);
      }
      stateSyncDebounceRef.current = window.setTimeout(() => {
        void pushStateToServer({
          agendas,
          notulenList,
          tugasList,
          waLogs,
          recipients,
        }).then((res) => {
          if (res.ok && res.updatedAt) {
            lastRemoteStateAtRef.current = res.updatedAt;
          }
        });
      }, 450);
    }
  }, [agendas, notulenList, tugasList, waLogs, recipients, settings]);

  // Preload daftar suara TTS
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
  }, []);

  const stopRecognitionSafe = useCallback(() => {
    if (wakeInterimTimerRef.current) {
      window.clearTimeout(wakeInterimTimerRef.current);
      wakeInterimTimerRef.current = null;
    }
    if (micResumeTimerRef.current) {
      window.clearTimeout(micResumeTimerRef.current);
      micResumeTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        // Lepas seluruh event handler sebelum abort() agar sisa buffer mikrofon tidak memicu onresult palsu
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const startRecognitionLoop = useCallback(() => {
    if (!micSupported) return;
    if (!assistantEnabledRef.current) return;
    if (isSpeakingRef.current || isBrowserCurrentlySpeaking()) return;

    stopRecognitionSafe();
    // Aktifkan AGC & audio capture stream pada level hardware/driver agar mikrofon sensitif dari kejauhan
    void enableFarFieldMicBoost();

    const rec = createSpeechRecognition();
    if (!rec) return;

    rec.lang = "id-ID";
    rec.continuous = true;
    rec.interimResults = true;

    // Helper untuk dispatch ucapan yang dikenali (baik dari final maupun interim debounce)
    const dispatchRecognizedSpeech = (text: string) => {
      const clean = text.trim();
      if (!clean) return;
      const now = Date.now();
      // Cegah duplikasi pengenalan kata yang sama dalam rentang 1.5 detik
      if (
        clean.toLowerCase() === lastProcessedTextRef.current.toLowerCase() &&
        now - lastProcessedTimeRef.current < 1500
      ) {
        return;
      }
      lastProcessedTextRef.current = clean;
      lastProcessedTimeRef.current = now;
      pendingInterimTextRef.current = "";
      if (interimDebounceTimerRef.current) {
        window.clearTimeout(interimDebounceTimerRef.current);
        interimDebounceTimerRef.current = null;
      }
      if (wakeInterimTimerRef.current) {
        window.clearTimeout(wakeInterimTimerRef.current);
        wakeInterimTimerRef.current = null;
      }
      setLiveTranscript(clean);
      handleSpokenInputRef.current(clean);
    };

    rec.onresult = (event) => {
      // Blokir mutlak selama Tiara sedang berbicara atau masih dalam jeda redam pantulan speaker
      if (
        isSpeakingRef.current ||
        isBrowserCurrentlySpeaking() ||
        Date.now() < micIgnoreUntilRef.current
      ) {
        return;
      }

      let interim = "";
      let finalChunk = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const transcript = res[0]?.transcript ?? "";
        if (res.isFinal) {
          finalChunk += ` ${transcript}`;
        } else {
          interim += transcript;
        }
      }

      const msSinceEnded = Date.now() - lastSpeechEndedAtRef.current;

      const finalClean = finalChunk.trim();
      if (finalClean) {
        if (
          settingsRef.current.echoGuardAktif &&
          isLikelySpeakerEcho(
            finalClean,
            lastSpokenFullTextRef.current,
            msSinceEnded
          )
        ) {
          return;
        }
        dispatchRecognizedSpeech(finalClean);
        return;
      }

      const interimClean = interim.trim();
      if (interimClean) {
        if (
          settingsRef.current.echoGuardAktif &&
          isLikelySpeakerEcho(
            interimClean,
            lastSpokenFullTextRef.current,
            msSinceEnded
          )
        ) {
          return;
        }
        setLiveTranscript(interimClean);
        pendingInterimTextRef.current = interimClean;

        const wakeCheck = parseWakeWord(interimClean);

        // Jika ada wake word (baik dengan perintah langsung maupun berdiri sendiri)
        if (wakeCheck.isWakeWord) {
          if (interimDebounceTimerRef.current) {
            window.clearTimeout(interimDebounceTimerRef.current);
          }
          const debounceMs = wakeCheck.commandAfterWake ? 650 : 500;
          interimDebounceTimerRef.current = window.setTimeout(() => {
            if (
              !isSpeakingRef.current &&
              !isBrowserCurrentlySpeaking() &&
              Date.now() >= micIgnoreUntilRef.current
            ) {
              dispatchRecognizedSpeech(interimClean);
            }
          }, debounceMs);
          return;
        }

        // Jika sesi percakapan sedang aktif atau ada perintah langsung dari kejauhan
        if (dialogStageRef.current !== "idle") {
          if (interimDebounceTimerRef.current) {
            window.clearTimeout(interimDebounceTimerRef.current);
          }
          interimDebounceTimerRef.current = window.setTimeout(() => {
            if (
              !isSpeakingRef.current &&
              !isBrowserCurrentlySpeaking() &&
              Date.now() >= micIgnoreUntilRef.current
            ) {
              dispatchRecognizedSpeech(interimClean);
            }
          }, 750);
          return;
        }

        // Jika sesi idle tapi terdeteksi perintah langsung yang jelas (tanpa harus ucap 'Tiara')
        const isDirectCommand =
          /\b(jadwal|agenda|kegiatan|acara|notulen|notulensi|rapat|tugas|deadline|bacakan|baca|ringkasan|inti|intinya|kesimpulan|kirim ke wa|kirim wa|siapa peserta|kapan rapat)\b/i.test(
            interimClean
          );
        if (isDirectCommand) {
          if (interimDebounceTimerRef.current) {
            window.clearTimeout(interimDebounceTimerRef.current);
          }
          interimDebounceTimerRef.current = window.setTimeout(() => {
            if (
              !isSpeakingRef.current &&
              !isBrowserCurrentlySpeaking() &&
              Date.now() >= micIgnoreUntilRef.current
            ) {
              dispatchRecognizedSpeech(interimClean);
            }
          }, 800);
        }
      }
    };

    rec.onerror = (ev) => {
      if (ev.error === "not-allowed" || ev.error === "service-not-allowed") {
        assistantEnabledRef.current = false;
        setAssistantEnabled(false);
        setIsListening(false);
        toast.error(
          "Izin mikrofon ditolak browser. Aktifkan izin mikrofon untuk fitur suara 'Hey Tiara'."
        );
      }
    };

    rec.onend = () => {
      // Flush transkrip interim terakhir yang belum sempat dieksekusi sebelum recognition loop restart
      const unhandled = pendingInterimTextRef.current.trim();
      if (
        unhandled.length >= 3 &&
        !isSpeakingRef.current &&
        !isBrowserCurrentlySpeaking() &&
        Date.now() >= micIgnoreUntilRef.current
      ) {
        dispatchRecognizedSpeech(unhandled);
      }
      pendingInterimTextRef.current = "";

      if (
        assistantEnabledRef.current &&
        !isSpeakingRef.current &&
        !isBrowserCurrentlySpeaking()
      ) {
        const remainingGuard = Math.max(
          280,
          micIgnoreUntilRef.current - Date.now()
        );
        micResumeTimerRef.current = window.setTimeout(() => {
          if (
            assistantEnabledRef.current &&
            !isSpeakingRef.current &&
            !isBrowserCurrentlySpeaking()
          ) {
            startRecognitionLoop();
          }
        }, remainingGuard);
      } else {
        setIsListening(false);
      }
    };

    try {
      rec.start();
      recognitionRef.current = rec;
      setIsListening(true);
    } catch {
      setIsListening(false);
    }
  }, [micSupported, stopRecognitionSafe]);

  const speakWithTiara = useCallback(
    (
      text: string,
      opts?: {
        nextStage?: DialogStage;
        keepSessionAlive?: boolean;
        withChime?: "wake" | "reminder";
        recordInHistory?: boolean;
      }
    ) => {
      const currentSessionId = ++speechSessionIdRef.current;
      if (speakStartTimerRef.current) {
        window.clearTimeout(speakStartTimerRef.current);
        speakStartTimerRef.current = null;
      }
      stopRecognitionSafe();
      isSpeakingRef.current = true;
      setIsSpeaking(true);
      setIsSpeechPaused(false);
      setLastAssistantReply(text);
      lastSpokenFullTextRef.current = text;

      if (opts?.recordInHistory !== false) {
        appendTurn("assistant", text);
      }

      if (opts?.withChime) {
        playChime(opts.withChime);
      }

      const delay = opts?.withChime ? 250 : 20;
      speakStartTimerRef.current = window.setTimeout(() => {
        if (currentSessionId !== speechSessionIdRef.current) return;
        speakWithConfiguredProvider(text, settingsRef.current, {
          onStart: () => {
            if (currentSessionId !== speechSessionIdRef.current) return;
            isSpeakingRef.current = true;
            setIsSpeaking(true);
          },
          onFallbackFreeVoice: (freeVoiceId, notice) => {
            setSettings((prev) => ({ ...prev, ttsVoiceId: freeVoiceId }));
            toast(notice);
          },
          onCloudError: (errMsg) => {
            toast.error(
              `Suara ${settingsRef.current.ttsProvider} gagal (${errMsg}). Beralih sementara ke suara Browser.`
            );
          },
          onEnd: () => {
            if (currentSessionId !== speechSessionIdRef.current) return;
            isSpeakingRef.current = false;
            setIsSpeaking(false);
            setIsSpeechPaused(false);

            const endedAt = Date.now();
            lastSpeechEndedAtRef.current = endedAt;
            const resumeDelay = Math.max(
              700,
              settingsRef.current.micResumeDelayMs || 1200
            );
            micIgnoreUntilRef.current = endedAt + resumeDelay + 250;

            if (opts?.nextStage) {
              if (opts.nextStage === "idle") {
                setDialogStage("idle");
                dialogStageRef.current = "idle";
              } else {
                refreshSessionTimeout(opts.nextStage);
              }
            } else if (opts?.keepSessionAlive !== false) {
              refreshSessionTimeout();
            }

            if (assistantEnabledRef.current) {
              if (micResumeTimerRef.current) {
                window.clearTimeout(micResumeTimerRef.current);
              }
              micResumeTimerRef.current = window.setTimeout(() => {
                if (
                  currentSessionId === speechSessionIdRef.current &&
                  assistantEnabledRef.current &&
                  !isSpeakingRef.current &&
                  !isBrowserCurrentlySpeaking()
                ) {
                  startRecognitionLoop();
                }
              }, resumeDelay);
            }
          },
        });
      }, delay);
    },
    [appendTurn, refreshSessionTimeout, startRecognitionLoop, stopRecognitionSafe]
  );

  // Fungsi membuka notulen + pindah otomatis ke halaman /notulen
  const openAndFocusNotulen = useCallback(
    (item: NotulenItem) => {
      setSelectedNotulenId(item.id);
      setFocusedNotulenId(item.id);
      focusedNotulenIdRef.current = item.id;
      lastActiveNotulenIdRef.current = item.id;
      setCandidateNotulens([]);
      candidateNotulensRef.current = [];
      navigate({ to: "/notulen" });
    },
    [navigate]
  );

  // Fungsi membacakan hasil lengkap notulen (Ringkasan + Poin Keputusan + Tugas & Progres)
  const readNotulenAloud = useCallback(
    (notulenId: number, scope: NotulenReadScope = "lengkap") => {
      const target = notulenRef.current.find((n) => n.id === notulenId);
      if (!target) return;
      assistantEnabledRef.current = true;
      setAssistantEnabled(true);
      lastActiveNotulenIdRef.current = notulenId;
      openAndFocusNotulen(target);
      const script = buildNotulenReadoutText(target, tugasRef.current, scope);
      speakWithTiara(script, {
        nextStage: "awaiting_notulen_followup",
        keepSessionAlive: true,
      });
    },
    [openAndFocusNotulen, speakWithTiara]
  );

  // Kirim ringkasan notulen ke WhatsApp via Wangsaf API v1
  const sendNotulenSummaryToWa = useCallback((id: number) => {
    const target = notulenRef.current.find((n) => n.id === id);
    if (!target) return;
    const jam = nowHHMM();
    const logId = Date.now();
    const keputusanRingkas =
      target.keputusan.length > 0
        ? ` Keputusan: (1) ${target.keputusan.join(" (2) ").slice(0, 140)}...`
        : "";
    const logSummary = `Notulen "${target.judul}" (${target.tanggal}): ${target.ringkasan.slice(
      0,
      100
    )}...${keputusanRingkas}`;

    const fullWaMessage = [
      `*NOTULEN RAPAT — PERUMDAM TIRTA ARDHIA RINJANI*`,
      `Judul: *${target.judul}*`,
      `Tanggal: ${target.tanggal}${target.lokasi ? ` (${target.lokasi})` : ""}`,
      ``,
      `*Ringkasan Eksekutif:*`,
      target.ringkasan,
      target.keputusan.length > 0
        ? `\n*Poin Keputusan:*\n${target.keputusan
            .map((k, idx) => `${idx + 1}. ${k}`)
            .join("\n")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    const activeRecs = recipientsRef.current.filter((r) => r.aktif);

    setWaLogs((prev) => [
      {
        id: logId,
        waktu: jam,
        labelDashboard: `Notulen: ${target.judul.slice(0, 16)}`,
        tujuan:
          activeRecs.length > 0
            ? `${activeRecs.length} penerima (${settingsRef.current.waGateway})`
            : "Dirut & Sekretariat",
        isi: logSummary,
        status: "Terkirim",
      },
      ...prev,
    ]);

    void (async () => {
      if (activeRecs.length === 0) {
        toast.success(`Ringkasan "${target.judul}" dicatat pada log WhatsApp.`);
        return;
      }

      const results = await Promise.all(
        activeRecs.map((rec) =>
          sendWhatsappViaGateway({
            targetPhone: rec.noWa,
            message: fullWaMessage,
            settings: settingsRef.current,
          })
        )
      );

      const firstErr = results.find((r) => !r.ok);
      const firstChatId = results.find((r) => r.chatId)?.chatId;
      const isSimulated = results.every((r) => r.simulated);

      if (firstErr) {
        setWaLogs((prev) =>
          prev.map((l) => (l.id === logId ? { ...l, status: "Gagal" } : l))
        );
        toast.error(
          `Gagal mengirim ke ${settingsRef.current.waGateway}: ${
            firstErr.errorMessage || "Periksa Api-Key perangkat Wangsaf"
          }`
        );
      } else if (isSimulated) {
        toast.success(
          `Simulasi terkirim: Ringkasan "${target.judul}" (isi Api-Key Wangsaf di Pengaturan untuk kirim WA nyata).`
        );
      } else {
        setWaLogs((prev) =>
          prev.map((l) =>
            l.id === logId ? { ...l, status: "Terkirim", chatId: firstChatId } : l
          )
        );
        toast.success(
          `Terkirim via ${settingsRef.current.waGateway} ke ${activeRecs.length} nomor WhatsApp!`
        );
      }
    })();
  }, []);

  // Mesin Pemroses Perintah Kontekstual Multi-Turn
  const executeAssistantCommand = useCallback(
    async (rawCommand: string) => {
      const cmd = rawCommand.trim();
      const lower = cmd.toLowerCase();

      // 0. Kontrol akhiri sesi / tutup percakapan
      if (
        /^(?:terima kasih|makasih|cukup sekian|selesai|akhiri percakapan|sudah cukup)\b/i.test(
          lower
        )
      ) {
        setCandidateNotulens([]);
        candidateNotulensRef.current = [];
        speakWithTiara("Sama-sama, Pak Dirut. Saya tetap siaga jika dibutuhkan.", {
          nextStage: "idle",
          keepSessionAlive: false,
        });
        return;
      }

      // 0b. Kontrol ulangi ucapan terakhir
      if (/^(?:ulangi|tolong ulangi|baca ulang)\b/i.test(lower)) {
        if (lastSpokenFullTextRef.current) {
          speakWithTiara(lastSpokenFullTextRef.current, {
            keepSessionAlive: true,
          });
          return;
        }
      }

      // 0c. Sapaan Ramah Sesuai Waktu WITA (Lombok / Bali / Indonesia Tengah)
      if (
        /^(?:halo|hai|hey|hei|pagi|siang|sore|malam|selamat pagi|selamat siang|selamat sore|selamat malam|assalamualaikum)\b/i.test(
          lower
        ) &&
        !/\b(jadwal|agenda|notulen|tugas|buat|catat|tambah|baca|kirim)\b/i.test(lower)
      ) {
        const greetingWita = getGreetingWita();
        speakWithTiara(
          `${greetingWita}, Pak Dirut. Ada yang bisa saya bantu terkait jadwal agenda atau notulen rapat?`,
          { nextStage: "active_session", withChime: "wake" }
        );
        return;
      }

      // 1. JIKA SEDANG MENUNGGU KONFIRMASI PILIHAN DARI BEBERAPA KANDIDAT NOTULEN MIRIP
      if (
        dialogStageRef.current === "awaiting_notulen_choice" &&
        candidateNotulensRef.current.length > 0
      ) {
        if (/\b(batal|tidak jadi|cari yang lain)\b/i.test(lower)) {
          setCandidateNotulens([]);
          candidateNotulensRef.current = [];
          speakWithTiara(
            "Baik Pak Dirut, pencarian sebelumnya dibatalkan. Silakan sebutkan notulen atau instruksi lainnya.",
            { nextStage: "active_session" }
          );
          return;
        }

        const chosen = resolveCandidateChoice(cmd, candidateNotulensRef.current);
        if (chosen) {
          const shouldReadNow =
            pendingAutoReadRef.current ||
            /\b(bacakan|baca|sekaligus baca)\b/i.test(lower);
          pendingAutoReadRef.current = false;
          openAndFocusNotulen(chosen);

          if (shouldReadNow) {
            const script = buildNotulenReadoutText(
              chosen,
              tugasRef.current,
              "lengkap"
            );
            speakWithTiara(script, { nextStage: "awaiting_notulen_followup" });
          } else {
            speakWithTiara(
              `Baik Pak Dirut, saya tampilkan notulen ${chosen.judul} tanggal ${chosen.tanggal}. Apakah ingin langsung saya bacakan ringkasan beserta poin-poin keputusannya?`,
              { nextStage: "awaiting_notulen_followup" }
            );
          }
          return;
        }
      }

      // 2. TINDAK LANJUT KONTEKSTUAL PADA NOTULEN YANG SEDANG DIBUKA / DIBICARAKAN (Melanjutkan Percakapan!)
      const activeNotulenId =
        focusedNotulenIdRef.current ??
        lastActiveNotulenIdRef.current ??
        selectedNotulenIdRef.current ??
        null;
      const activeNotulen = activeNotulenId
        ? notulenRef.current.find((n) => n.id === activeNotulenId) ?? null
        : null;

      // 2f. Kirim notulen yang sedang dibahas ke WhatsApp (Aksi Langsung)
      if (
        (/\b(kirim|kirimkan|bagikan|share|japri)\b.*\b(wa|whatsapp)\b/i.test(
          lower
        ) ||
          /\b(kirim ke wa|kirim wa)\b/i.test(lower)) &&
        activeNotulen
      ) {
        sendNotulenSummaryToWa(activeNotulen.id);
        speakWithTiara(
          `Siap Pak Dirut, ringkasan dan poin keputusan ${activeNotulen.judul} sudah saya kirimkan ke WhatsApp Bapak dan Sekretariat. Ada lagi yang ingin Bapak tindak lanjuti?`,
          { nextStage: "awaiting_notulen_followup" }
        );
        return;
      }

      // 4. TAMBAH / CATAT AGENDA LEWAT SUARA (Aksi Form Langsung)
      if (
        /\b(tambah|tambahkan|buat|buatkan|catat|jadwalkan)\b/i.test(lower) &&
        /\b(rapat|agenda|jadwal|kunjungan|koordinasi|tinjau|evaluasi|pertemuan|berkas|acara)\b/i.test(
          lower
        )
      ) {
        const draft = extractAgendaFromSpeech(cmd, TODAY_ISO);
        setVoiceDraft(draft);
        speakWithTiara(
          `Baik Pak Dirut, saya menyiapkan draf agenda ${draft.judul} pukul ${draft.mulai} di ${draft.lokasi}. Silakan konfirmasi pada layar untuk menyimpan.`,
          { nextStage: "active_session" }
        );
        return;
      }

      // 4b. JIKA ADA API KEY AI (GROQ QWEN / GEMINI / DAHONO / OPENAI / ANTHROPIC),
      // PRIORITASKAN LLM DENGAN SELURUH KONTEKS SISTEM SEBAGAI OTAK UTAMA PENALARAN!
      const hasAiKey =
        Boolean(settingsRef.current.aiApiKey.trim()) ||
        (settingsRef.current.aiProvider === "custom" &&
          (settingsRef.current.aiAuthScheme === "none" ||
            Boolean(settingsRef.current.aiApiKey.trim())) &&
          Boolean(settingsRef.current.aiBaseUrl.trim()));

      if (hasAiKey) {
        const witaDate = getWitaDate();
        const witaTimeStr = `${String(witaDate.getHours()).padStart(2, "0")}:${String(
          witaDate.getMinutes()
        ).padStart(2, "0")} WITA`;

        const aiResult = await generateContextualReplyWithAi(
          cmd,
          historyRef.current,
          activeNotulen,
          settingsRef.current,
          {
            todayIso: TODAY_ISO,
            witaTimeStr,
            agendas: agendasRef.current,
            notulenList: notulenRef.current,
            tugasList: tugasRef.current,
            activeNotulen,
          }
        );

        if (aiResult.reply) {
          speakWithTiara(aiResult.reply, {
            nextStage: activeNotulen ? "awaiting_notulen_followup" : "active_session",
            keepSessionAlive: true,
          });
          return;
        }

        if (aiResult.error) {
          const providerName =
            settingsRef.current.aiProvider === "custom"
              ? settingsRef.current.aiCustomName || "Custom AI"
              : settingsRef.current.aiProvider.toUpperCase();
          toast.error(
            `Koneksi ${providerName} (${aiResult.error}). Menjawab dengan Engine Lokal Tiara.`
          );
        }
      }

      // ==========================================
      // 5. ENGINE LOKAL TIARA (Fallback Cerdas Ketika Offline / Tanpa API AI)
      // ==========================================
      const hasDemonstrativeReference =
        /\b(tersebut|tadi|barusan|notulen ini|rapat ini|notulen itu|rapat itu|yang tadi)\b/i.test(
          lower
        );
      const isInNotulenFollowup =
        dialogStageRef.current === "awaiting_notulen_followup";

      if (activeNotulen) {
        // 2a. Tanya inti, pokok pikiran, ringkasan, atau apa yang dibahas
        if (
          /\b(inti|intinya|ringkas|ringkasan|ringkasannya|pokok|kesimpulan|kesimpulannya|apa isinya|isi notulen|bahas apa|apa yang dibahas|tentang apa)\b/i.test(
            lower
          )
        ) {
          const decisionHighlight =
            activeNotulen.keputusan.length > 0
              ? ` Poin keputusan utamanya antara lain: ${activeNotulen.keputusan
                  .slice(0, 2)
                  .map((k, idx) => `${idx + 1}. ${k}`)
                  .join("; ")}.`
              : "";
          speakWithTiara(
            `Inti dari notulen ${activeNotulen.judul} (tanggal ${activeNotulen.tanggal}): ${activeNotulen.ringkasan}.${decisionHighlight} Apakah ingin saya kirimkan ke WhatsApp atau ada hal lain yang ingin Bapak tanyakan?`,
            { nextStage: "awaiting_notulen_followup" }
          );
          return;
        }

        // 2b. Tanya peserta / siapa yang hadir / pimpinan
        if (
          /\b(peserta|pesertanya|siapa yang hadir|siapa saja yang hadir|siapa yang ikut|siapa saja pesertanya|yang datang|dihadiri|pimpinan|pemimpin)\b/i.test(
            lower
          )
        ) {
          const leaderInfo = activeNotulen.pimpinan
            ? ` dipimpin oleh ${activeNotulen.pimpinan}`
            : "";
          const countInfo =
            typeof activeNotulen.peserta === "number" && activeNotulen.peserta > 0
              ? ` dan dihadiri sekitar ${activeNotulen.peserta} peserta`
              : "";
          speakWithTiara(
            `Rapat ${activeNotulen.judul}${leaderInfo}${countInfo}. Apakah ada hal lain yang ingin Bapak tanyakan terkait rapat ini?`,
            { nextStage: "awaiting_notulen_followup" }
          );
          return;
        }

        // 2c. Tanya waktu dan lokasi rapat
        if (
          /\b(kapan rapat|kapan pelaksanaannya|jam berapa rapat|pukul berapa rapat|di mana rapat|dimana rapat|tempat rapat|lokasi rapat)\b/i.test(
            lower
          )
        ) {
          const timeInfo = activeNotulen.jam ? ` pukul ${activeNotulen.jam} WITA` : "";
          const locInfo = activeNotulen.lokasi ? ` di ${activeNotulen.lokasi}` : "";
          speakWithTiara(
            `Rapat ${activeNotulen.judul} dilaksanakan pada hari ${activeNotulen.tanggal}${timeInfo}${locInfo}.`,
            { nextStage: "awaiting_notulen_followup" }
          );
          return;
        }

        // 2d. Minta bacakan poin keputusannya saja
        if (
          /\b(poin|keputusan|keputusannya|hasil keputusan|apa keputusannya|hasil rapat|hasilnya|yang diputuskan)\b/i.test(
            lower
          )
        ) {
          const script = buildNotulenReadoutText(
            activeNotulen,
            tugasRef.current,
            "keputusan"
          );
          speakWithTiara(script, { nextStage: "awaiting_notulen_followup" });
          return;
        }

        // 2e. Minta bacakan tugas / tindak lanjut / progres dari rapat tersebut
        if (
          /\b(tugasnya|tindak lanjut|penanggung jawab|pj|siapa yang bertugas|progres|deadline|jatuh tempo|tenggat)\b/i.test(
            lower
          ) &&
          !/\bsemua tugas\b/i.test(lower)
        ) {
          const script = buildNotulenReadoutText(
            activeNotulen,
            tugasRef.current,
            "tugas"
          );
          speakWithTiara(script, { nextStage: "awaiting_notulen_followup" });
          return;
        }

        // 2f. Kirim notulen yang sedang dibahas ke WhatsApp
        if (
          /\b(kirim|kirimkan|bagikan|share|japri)\b.*\b(wa|whatsapp)\b/i.test(
            lower
          ) ||
          /\b(kirim ke wa|kirim wa)\b/i.test(lower)
        ) {
          sendNotulenSummaryToWa(activeNotulen.id);
          speakWithTiara(
            `Siap Pak Dirut, ringkasan dan poin keputusan ${activeNotulen.judul} sudah saya kirimkan ke WhatsApp Bapak dan Sekretariat. Ada lagi yang ingin Bapak tindak lanjuti?`,
            { nextStage: "awaiting_notulen_followup" }
          );
          return;
        }

        // 2g. Jawaban konfirmasi "Iya / Boleh / Bacakan" setelah Tiara menawarkan baca notulen
        const isDirectReadRequest =
          /\b(bacakan|baca hasilnya|baca notulen|baca semuanya|bacakan semuanya|tolong baca|bacakan lagi)\b/i.test(
            lower
          ) && !/\b(carikan|cari|tanggal|bulan)\b/i.test(lower);

        const isShortAffirmative =
          isInNotulenFollowup &&
          /^(?:iya|ya|boleh|silakan|oke|baik|lanjut|gas|tolong|iya bacakan|ya bacakan)\b/i.test(
            lower
          );

        if (isDirectReadRequest || isShortAffirmative) {
          const script = buildNotulenReadoutText(
            activeNotulen,
            tugasRef.current,
            "lengkap"
          );
          speakWithTiara(script, { nextStage: "awaiting_notulen_followup" });
          return;
        }

        // 2h. Jika menolak ditawarkan baca ("tidak usah" / "cukup tampilkan saja" / "terima kasih")
        if (
          isInNotulenFollowup &&
          /^(?:tidak|tidak usah|enggak|nggak|jangan dulu|cukup|sudah cukup|terima kasih|makasih)\b/i.test(
            lower
          )
        ) {
          speakWithTiara(
            "Baik Pak Dirut, notulen tetap terbuka di layar. Beri tahu saya jika ingin membacakan poin keputusan atau mencari notulen lain.",
            { nextStage: "active_session" }
          );
          return;
        }

        // 2i. Jika ada kata rujukan demonstratif ("notulen tersebut", "rapat tadi") atau sedang dalam follow-up
        if (hasDemonstrativeReference || isInNotulenFollowup) {
          speakWithTiara(
            `Mengenai notulen ${activeNotulen.judul}: ${activeNotulen.ringkasan}. Apakah Bapak ingin saya bacakan seluruh poin keputusannya atau dikirimkan ke WhatsApp?`,
            { nextStage: "awaiting_notulen_followup" }
          );
          return;
        }
      }

      // 3. PENCARIAN & NAVIGASI NOTULEN VIA SUARA (Tanggal / Bulan / Topik + Disambiguasi >1)
      const isAskingNotulenSearch =
        ((!hasDemonstrativeReference && !isInNotulenFollowup) ||
          /\b(cari|carikan|notulen lain|lainnya)\b/i.test(lower)) &&
        ((/\b(carikan|cari|bukakan|buka|tampilkan|munculkan|lihat)\b/i.test(
          lower
        ) &&
          /\b(notulen|notulensi|hasil rapat|transkrip|rapat)\b/i.test(lower)) ||
          (/\b(notulen|notulensi)\b/i.test(lower) &&
            /\b(tanggal|tgl|bulan|januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember|terbaru|terakhir|kemarin|hari ini)\b/i.test(
              lower
            )));

      if (isAskingNotulenSearch) {
        const searchRes = searchNotulenSmart(
          cmd,
          notulenRef.current,
          TODAY_ISO
        );

        if (searchRes.matches.length === 0) {
          speakWithTiara(
            `Mohon maaf Pak Dirut, saya belum menemukan notulen yang cocok dengan ${searchRes.queryDescription}. Silakan sebutkan kata kunci atau bulan lainnya.`,
            { nextStage: "active_session" }
          );
          return;
        }

        if (searchRes.matches.length === 1) {
          const single = searchRes.matches[0];
          openAndFocusNotulen(single);
          if (searchRes.wantsImmediateRead) {
            const script = buildNotulenReadoutText(
              single,
              tugasRef.current,
              "lengkap"
            );
            speakWithTiara(script, { nextStage: "awaiting_notulen_followup" });
          } else {
            speakWithTiara(
              `Baik Pak Dirut, ini notulen ${single.judul} tanggal ${single.tanggal}. Apakah ingin langsung saya bacakan ringkasan beserta poin-poin keputusannya?`,
              { nextStage: "awaiting_notulen_followup" }
            );
          }
          return;
        }

        // Lebih dari 1 notulen berkaitan -> Munculkan pop-up tengah & tanyakan konfirmasi kepada Dirut!
        const topCandidates = searchRes.matches.slice(0, 4);
        setCandidateNotulens(topCandidates);
        candidateNotulensRef.current = topCandidates;
        setCandidateQueryLabel(searchRes.queryDescription);
        setCandidateMatchReasons(searchRes.matchReasons);
        pendingAutoReadRef.current = searchRes.wantsImmediateRead;

        const ordLabels = ["Pertama", "Kedua", "Ketiga", "Keempat"];
        const listSpoken = topCandidates
          .map((c, idx) => `${ordLabels[idx]}, ${c.judul} (${c.tanggal})`)
          .join("; ");

        speakWithTiara(
          `Pak Dirut, ada ${topCandidates.length} notulen yang berkaitan: ${listSpoken}. Silakan pilih pada layar atau sebutkan nomornya.`,
          { nextStage: "awaiting_notulen_choice" }
        );
        return;
      }


      // 5. TANYA JADWAL / AGENDA (Hari ini, Besok, Lusa, Hari Tertentu misal Sabtu/Jumat, atau Pekan Ini)
      if (
        /\b(jadwal|agenda|acara|briefing|kegiatan)\b/i.test(lower) &&
        !/\b(tambah|tambahkan|buat|catat|jadwalkan)\b/i.test(lower)
      ) {
        const queryRes = resolveScheduleQuery(cmd, TODAY_ISO);
        const { queryDates, dateLabel, isWeekRange } = queryRes;

        const targetItems = agendasRef.current.filter((a) =>
          queryDates.includes(a.tanggal)
        );
        const targetNotulens = notulenRef.current.filter((n) =>
          queryDates.includes(n.tanggalIso)
        );

        if (targetItems.length === 0) {
          if (targetNotulens.length > 0) {
            speakWithTiara(
              `Tidak ada jadwal agenda kegiatan untuk ${dateLabel}, Pak Dirut. Namun terdapat ${targetNotulens.length} arsip notulen rapat pada waktu tersebut: ${targetNotulens.map((n) => n.judul).join(", ")}. Apakah ingin saya buka?`,
              { nextStage: "active_session" }
            );
          } else {
            speakWithTiara(
              `Belum ada agenda kegiatan yang terjadwal untuk ${dateLabel}, Pak Dirut. Apakah ingin menambahkan agenda baru?`,
              { nextStage: "active_session" }
            );
          }
          return;
        }

        if (isWeekRange) {
          const sorted = [...targetItems].sort((a, b) =>
            `${a.tanggal} ${a.mulai}`.localeCompare(`${b.tanggal} ${b.mulai}`)
          );
          const first = sorted[0];
          speakWithTiara(
            `Sepanjang ${dateLabel}, terdapat ${targetItems.length} agenda kegiatan. Agenda terdekat adalah ${first.judul} pada hari ${getDayNameFromIso(first.tanggal)}, ${formatIsoToReadable(first.tanggal)} pukul ${first.mulai.replace(".", " lewat ")} di ${first.lokasi}. Apakah ingin melihat daftar agenda di kalender?`,
            { nextStage: "active_session" }
          );
          return;
        }

        const isTodayQuery =
          queryDates.length === 1 && queryDates[0] === TODAY_ISO;
        const upcoming = isTodayQuery
          ? targetItems.filter((a) => !a.selesaiAcara)
          : targetItems;

        const next = upcoming[0] || targetItems[0];
        const nextTime = next.mulai.replace(".", " lewat ");

        if (isTodayQuery) {
          if (upcoming.length === 0) {
            speakWithTiara(
              `Seluruh ${targetItems.length} agenda hari ini telah selesai, Pak Dirut. Ada hal lain yang ingin diperiksa?`,
              { nextStage: "active_session" }
            );
          } else {
            speakWithTiara(
              `Hari ini terdapat ${targetItems.length} agenda, dan ${upcoming.length} agenda belum berlangsung. Berikutnya pukul ${nextTime}, ${next.judul} di ${next.lokasi}. Apakah ingin melihat halaman agenda?`,
              { nextStage: "active_session" }
            );
          }
        } else {
          speakWithTiara(
            `Untuk ${dateLabel}, terdapat ${targetItems.length} agenda kegiatan: mulai pukul ${nextTime}, ${next.judul} di ${next.lokasi}. Apakah ingin melihat rincian agenda di kalender?`,
            { nextStage: "active_session" }
          );
        }
        return;
      }

      // 6. TANYA TUGAS TERBUKA SECARA UMUM
      if (/\b(tugas|deadline|jatuh tempo)\b/i.test(lower)) {
        const openTasks = tugasRef.current.filter((t) => !t.selesai);
        const urgent = openTasks.filter((t) => t.segera);
        navigate({ to: "/tugas" });
        speakWithTiara(
          `Saya tampilkan halaman tugas, Pak Dirut. Terdapat ${openTasks.length} tugas terbuka, dengan ${urgent.length} tugas jatuh tempo dalam dua hari ke depan.`,
          { nextStage: "active_session" }
        );
        return;
      }

      // 7. TUNDA PENGINGAT
      if (/\b(tunda|lima menit lagi)\b/i.test(lower)) {
        setReminder((prev) => ({ ...prev, visible: true, snoozed: true }));
        speakWithTiara("Baik Pak Dirut, pengingat saya tunda lima menit.", {
          nextStage: "active_session",
        });
        return;
      }

      // 8. FALLBACK LOKAL KONTEKSTUAL
      speakWithTiara(
        "Siap Pak Dirut. Bapak dapat meminta saya mencarikan notulen berdasarkan tanggal atau topik, membacakan ringkasan beserta poin keputusannya, menanyakan jadwal kegiatan, atau mencatat agenda baru.",
        { keepSessionAlive: true }
      );
    },
    [
      navigate,
      openAndFocusNotulen,
      sendNotulenSummaryToWa,
      speakWithTiara,
    ]
  );

  const handleSpokenInput = useCallback(
    (transcript: string) => {
      const { isWakeWord, commandAfterWake } = parseWakeWord(transcript);

      if (isWakeWord) {
        appendTurn("user", transcript);
        if (commandAfterWake.length > 3) {
          void executeAssistantCommand(commandAfterWake);
        } else {
          speakWithTiara("Ada yang bisa saya bantu, Pak Dirut?", {
            nextStage: "active_session",
            withChime: "wake",
          });
        }
        return;
      }

      // Selama sesi percakapan masih aktif, langsung lanjutkan obrolan tanpa harus mengulang "Hey Tiara"!
      if (dialogStageRef.current !== "idle") {
        appendTurn("user", transcript);
        void executeAssistantCommand(transcript);
        return;
      }

      // Jika sesi sedang idle tapi mikrofon aktif dan pengguna mengucapkan perintah langsung yang jelas dari kejauhan:
      const lower = transcript.toLowerCase();
      const isDirectIntent =
        /\b(jadwal|agenda|kegiatan|acara|notulen|notulensi|rapat|tugas|deadline|bacakan|baca|ringkasan|inti|intinya|kesimpulan|kirim ke wa|kirim wa|siapa peserta|kapan rapat|halo|selamat pagi|selamat siang|selamat sore)\b/i.test(
          lower
        );

      if (isDirectIntent) {
        refreshSessionTimeout("active_session");
        appendTurn("user", transcript);
        void executeAssistantCommand(transcript);
      }
    },
    [appendTurn, executeAssistantCommand, speakWithTiara]
  );

  const handleSpokenInputRef = useRef(handleSpokenInput);
  handleSpokenInputRef.current = handleSpokenInput;

  const activateAndGreetTiara = useCallback(() => {
    assistantEnabledRef.current = true;
    setAssistantEnabled(true);
    setLiveTranscript("Halo Tiara");
    appendTurn("user", "Halo Tiara");
    speakWithTiara("Ada yang bisa saya bantu, Pak Dirut?", {
      nextStage: "active_session",
      withChime: "wake",
    });
  }, [appendTurn, speakWithTiara]);

  const sendCommandToTiara = useCallback(
    (commandText: string) => {
      const clean = commandText.trim();
      if (!clean) return;
      assistantEnabledRef.current = true;
      setAssistantEnabled(true);
      setLiveTranscript(clean);
      appendTurn("user", clean);
      if (dialogStageRef.current === "idle") {
        dialogStageRef.current = "active_session";
        setDialogStage("active_session");
      }
      void executeAssistantCommand(clean);
    },
    [appendTurn, executeAssistantCommand]
  );

  const dismissCandidateNotulens = useCallback(() => {
    setCandidateNotulens([]);
    candidateNotulensRef.current = [];
    setCandidateQueryLabel("");
    setCandidateMatchReasons({});
    if (dialogStageRef.current === "awaiting_notulen_choice") {
      setDialogStage("active_session");
      dialogStageRef.current = "active_session";
    }
  }, []);

  const selectDisambiguatedNotulen = useCallback(
    (notulenId: number, forceReadNow?: boolean) => {
      const chosen = notulenRef.current.find((n) => n.id === notulenId);
      if (!chosen) return;
      assistantEnabledRef.current = true;
      setAssistantEnabled(true);
      appendTurn("user", `Pilih: ${chosen.judul}`);
      const shouldRead = Boolean(forceReadNow || pendingAutoReadRef.current);
      pendingAutoReadRef.current = false;
      setCandidateQueryLabel("");
      setCandidateMatchReasons({});
      openAndFocusNotulen(chosen);

      if (shouldRead) {
        const script = buildNotulenReadoutText(
          chosen,
          tugasRef.current,
          "lengkap"
        );
        speakWithTiara(script, { nextStage: "awaiting_notulen_followup" });
      } else {
        speakWithTiara(
          `Baik Pak Dirut, ini notulen ${chosen.judul} tanggal ${chosen.tanggal}. Apakah ingin langsung saya bacakan ringkasan beserta poin-poin keputusannya?`,
          { nextStage: "awaiting_notulen_followup" }
        );
      }
    },
    [appendTurn, openAndFocusNotulen, speakWithTiara]
  );

  const pauseOrResumeSpeech = useCallback(() => {
    if (!isSpeakingRef.current) return;
    if (isSpeechPaused) {
      resumeSpeaking();
      setIsSpeechPaused(false);
    } else {
      pauseSpeaking();
      setIsSpeechPaused(true);
    }
  }, [isSpeechPaused]);

  const stopTiaraSpeakingOnly = useCallback(() => {
    speechSessionIdRef.current += 1;
    stopSpeaking();
    isSpeakingRef.current = false;
    setIsSpeaking(false);
    setIsSpeechPaused(false);
    const endedAt = Date.now();
    lastSpeechEndedAtRef.current = endedAt;
    micIgnoreUntilRef.current = endedAt + 750;
    refreshSessionTimeout();
    if (assistantEnabledRef.current) {
      if (micResumeTimerRef.current) {
        window.clearTimeout(micResumeTimerRef.current);
      }
      micResumeTimerRef.current = window.setTimeout(
        () => startRecognitionLoop(),
        750
      );
    }
  }, [refreshSessionTimeout, startRecognitionLoop]);

  const endConversationSession = useCallback(() => {
    speechSessionIdRef.current += 1;
    stopSpeaking();
    isSpeakingRef.current = false;
    setIsSpeaking(false);
    setIsSpeechPaused(false);
    lastSpeechEndedAtRef.current = Date.now();
    setDialogStage("idle");
    dialogStageRef.current = "idle";
    setCandidateNotulens([]);
    candidateNotulensRef.current = [];
    if (sessionTimerRef.current) {
      window.clearTimeout(sessionTimerRef.current);
    }
  }, []);

  const turnOffAssistantMic = useCallback(() => {
    speechSessionIdRef.current += 1;
    stopSpeaking();
    isSpeakingRef.current = false;
    setIsSpeaking(false);
    setIsSpeechPaused(false);
    assistantEnabledRef.current = false;
    setAssistantEnabled(false);
    setIsListening(false);
    setDialogStage("idle");
    dialogStageRef.current = "idle";
    setCandidateNotulens([]);
    candidateNotulensRef.current = [];
    if (sessionTimerRef.current) {
      window.clearTimeout(sessionTimerRef.current);
    }
    if (micResumeTimerRef.current) {
      window.clearTimeout(micResumeTimerRef.current);
    }
    if (speakStartTimerRef.current) {
      window.clearTimeout(speakStartTimerRef.current);
    }
    if (interimDebounceTimerRef.current) {
      window.clearTimeout(interimDebounceTimerRef.current);
      interimDebounceTimerRef.current = null;
    }
    pendingInterimTextRef.current = "";
    releaseFarFieldMicBoost();
    stopRecognitionSafe();
  }, [stopRecognitionSafe]);

  const toggleWakeWordListening = useCallback(() => {
    if (assistantEnabledRef.current) {
      turnOffAssistantMic();
      toast("Suara asisten Tiara dinonaktifkan sementara.");
    } else {
      assistantEnabledRef.current = true;
      setAssistantEnabled(true);
      toast.success(
        'Asisten Tiara aktif! Ucapkan "Hey Tiara" atau "Halo Tiara" kapan saja.'
      );
      speakWithTiara(
        "Asisten suara aktif dan siap mendengarkan, Pak Dirut. Ada yang bisa saya bantu?",
        { nextStage: "active_session", withChime: "wake" }
      );
    }
  }, [speakWithTiara, turnOffAssistantMic]);

  const simulateWakeWord = useCallback(
    (customCommand?: string) => {
      assistantEnabledRef.current = true;
      setAssistantEnabled(true);
      if (customCommand) {
        sendCommandToTiara(customCommand);
      } else {
        activateAndGreetTiara();
      }
    },
    [activateAndGreetTiara, sendCommandToTiara]
  );

  const triggerReminderAnnouncement = useCallback(
    (customText?: string) => {
      const msg = customText || reminder.teks;
      assistantEnabledRef.current = true;
      setAssistantEnabled(true);
      setReminder((prev) => ({
        ...prev,
        visible: true,
        snoozed: false,
        teks: msg,
      }));
      speakWithTiara(msg, {
        withChime: "reminder",
        recordInHistory: false,
        keepSessionAlive: false,
      });
    },
    [reminder.teks, speakWithTiara]
  );

  const snoozeReminder = useCallback(() => {
    setReminder((prev) => ({ ...prev, visible: true, snoozed: true }));
    speakWithTiara("Baik Pak Dirut, saya ingatkan kembali lima menit lagi.", {
      recordInHistory: false,
      keepSessionAlive: false,
    });
    if (snoozeTimeoutRef.current) {
      window.clearTimeout(snoozeTimeoutRef.current);
    }
    snoozeTimeoutRef.current = window.setTimeout(() => {
      setReminder((prev) => ({ ...prev, visible: true, snoozed: false }));
      speakWithTiara(reminder.teks, {
        withChime: "reminder",
        recordInHistory: false,
        keepSessionAlive: false,
      });
    }, 300000);
  }, [reminder.teks, speakWithTiara]);

  const dismissReminder = useCallback(() => {
    if (snoozeTimeoutRef.current) {
      window.clearTimeout(snoozeTimeoutRef.current);
    }
    speechSessionIdRef.current += 1;
    stopSpeaking();
    setIsSpeaking(false);
    isSpeakingRef.current = false;
    lastSpeechEndedAtRef.current = Date.now();
    setReminder((prev) => ({ ...prev, visible: false, snoozed: false }));
  }, []);

  const speakCustom = useCallback(
    (text: string) => {
      assistantEnabledRef.current = true;
      setAssistantEnabled(true);
      speakWithTiara(text, { keepSessionAlive: true });
    },
    [speakWithTiara]
  );

  // Modal Buat Notulen Manual & Prefill dari Agenda
  const openCreateNotulenManual = useCallback(
    (prefill?: NotulenFormPrefill | null) => {
      setNotulenPrefill(prefill ?? null);
      setCreateNotulenModalOpen(true);
    },
    []
  );

  const openCreateNotulenFromAgenda = useCallback((agenda: AgendaItem) => {
    setNotulenPrefill({
      judul: agenda.judul,
      tanggalIso: agenda.tanggal,
      jam: `${agenda.mulai} – ${agenda.selesai}`,
      lokasi: agenda.lokasi,
      peserta: agenda.peserta,
      catatanAwal: agenda.catatan,
    });
    setCreateNotulenModalOpen(true);
  }, []);

  // CRUD Agenda
  const addAgenda = useCallback((item: Omit<AgendaItem, "id">): AgendaItem => {
    const newItem: AgendaItem = {
      ...item,
      id: Date.now(),
      mulai: normalizeTimeDot(item.mulai),
      selesai: normalizeTimeDot(item.selesai),
    };
    setAgendas((prev) =>
      [...prev, newItem].sort((a, b) =>
        `${a.tanggal}-${a.mulai}`.localeCompare(`${b.tanggal}-${b.mulai}`)
      )
    );
    setWaLogs((prev) => [
      {
        id: Date.now() + 1,
        waktu: newItem.mulai,
        labelDashboard: `Pengingat: ${newItem.judul.slice(0, 18)}`,
        tujuan: "Dirut & Sekretariat",
        isi: `Pengingat otomatis terjadwal untuk agenda "${newItem.judul}" (${newItem.mulai} – ${newItem.selesai}) di ${newItem.lokasi}.`,
        status: "Terjadwal",
      },
      ...prev,
    ]);
    toast.success(
      `Agenda "${newItem.judul}" berhasil disimpan & pengingat WA dijadwalkan.`
    );
    return newItem;
  }, []);

  const updateAgenda = useCallback((id: number, patch: Partial<AgendaItem>) => {
    setAgendas((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              ...patch,
              mulai: patch.mulai ? normalizeTimeDot(patch.mulai) : a.mulai,
              selesai: patch.selesai
                ? normalizeTimeDot(patch.selesai)
                : a.selesai,
            }
          : a
      )
    );
    toast.success("Agenda diperbarui.");
  }, []);

  const deleteAgenda = useCallback((id: number) => {
    setAgendas((prev) => prev.filter((a) => a.id !== id));
    toast("Agenda dihapus.");
  }, []);

  const toggleAgendaDone = useCallback((id: number) => {
    setAgendas((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, selesaiAcara: !a.selesaiAcara } : a
      )
    );
  }, []);

  // CRUD Notulen (Upload Audio & Form Manual + Dokumentasi Foto)
  const uploadAudioNotulen = useCallback(
    ({
      judul,
      fileName,
      durasiMenit,
      file,
    }: {
      judul: string;
      fileName: string;
      durasiMenit: number;
      file?: File;
    }) => {
      const newId = Date.now();
      const jam = Math.floor(durasiMenit / 60);
      const mnt = durasiMenit % 60;
      const durasiLabel =
        jam > 0 ? `${jam} jam ${mnt} menit` : `${durasiMenit} menit`;

      const initialItem: NotulenItem = {
        id: newId,
        judul,
        tanggal: "4 Nov 2026",
        tanggalIso: TODAY_ISO,
        lokasi: "Ruang Rapat Utama",
        pimpinan: "Direktur Utama",
        sumberInput: "audio",
        durasi: durasiLabel,
        durasiMenit,
        audioFileName: fileName,
        audioDihapus: false,
        dokumentasiFoto: [],
        status: "diproses",
        infoSingkat: `Audio ${durasiLabel}`,
        ringkasan:
          "Sedang mentranskripsi audio Bahasa Indonesia dan mengekstrak keputusan rapat...",
        keputusan: [],
        transkrip: "Memproses rekaman audio rapat...",
        tugasCount: 0,
      };

      setNotulenList((prev) => [initialItem, ...prev]);
      setSelectedNotulenId(newId);
      toast.info(
        `Audio "${fileName}" berhasil diunggah. AI sedang memproses transkrip & notulen...`
      );

      void (async () => {
        if (file) {
          try {
            const aiRes = await transcribeAndSummarizeAudio(
              file,
              judul,
              settingsRef.current
            );
            setNotulenList((prev) =>
              prev.map((n) =>
                n.id === newId
                  ? {
                      ...n,
                      status: "selesai" as StatusNotulen,
                      infoSingkat: `Selesai diproses AI (${aiRes.modelUsed})`,
                      ringkasan: aiRes.ringkasan,
                      keputusan: aiRes.keputusan,
                      transkrip: aiRes.transkrip,
                      tugasCount: aiRes.tugas.length,
                    }
                  : n
              )
            );

            if (aiRes.tugas.length > 0) {
              const newTugasItems: TugasItem[] = aiRes.tugas.map((t, idx) => ({
                id: Date.now() + idx + 10,
                notulenId: newId,
                judul: t.judul,
                pj: t.pj,
                tenggat: t.tenggat || "Pekan ini",
                segera: Boolean(t.segera),
                selesai: false,
              }));
              setTugasList((prev) => [...newTugasItems, ...prev]);
            }

            toast.success(
              `Notulen "${judul}" berhasil ditranskrip & dirangkum oleh AI (${aiRes.modelUsed})!`
            );
            return;
          } catch (err: unknown) {
            const errMsg =
              err instanceof Error ? err.message : "Gagal transkripsi AI";
            toast.error(
              `${errMsg}. Beralih otomatis ke draf ringkasan cerdas.`
            );
          }
        }

        // Fallback cerdas jika API Key belum terpasang atau kuota API habis
        window.setTimeout(() => {
          const isSekretariat = settingsRef.current.peranAktif === "sekretariat";
          setNotulenList((prev) =>
            prev.map((n) =>
              n.id === newId
                ? {
                    ...n,
                    status: (isSekretariat ? "diperiksa" : "selesai") as StatusNotulen,
                    infoSingkat: isSekretariat
                      ? "Menunggu pemeriksaan sekretariat"
                      : "Selesai (Draf Cerdas PDAM)",
                    ringkasan: `Hasil ekstraksi rapat "${judul}". Dibahas evaluasi teknis distribusi air bersih Perumdam Tirta Ardhia Rinjani, langkah percepatan penanganan laporan warga, serta penugasan lintas bagian dengan target terukur.`,
                    keputusan: [
                      `Menetapkan tindak lanjut prioritas hasil ${judul} untuk dieksekusi pekan ini.`,
                      "Monitoring progres dilaporkan ke Direktur Utama melalui Sekretariat dalam 3 hari kerja.",
                    ],
                    transkrip: `[00:00:10] Direktur Utama: Assalamualaikum warahmatullahi wabarakatuh. Kita mulai ${judul} hari ini.\n[00:03:45] Peserta Rapat: Melaporkan kondisi terkini operasional dan usulan langkah percepatan di lapangan.\n[00:14:20] Direktur Utama: Baik, kita sepakati target penyelesaian pekan ini dan sekretariat mencatat seluruh poin tindak lanjut.`,
                    tugasCount: 2,
                  }
                : n
            )
          );
          setTugasList((prev) => [
            {
              id: Date.now() + 10,
              notulenId: newId,
              judul: `Tindak lanjut hasil ${judul}`,
              pj: "Bagian Teknik",
              tenggat: "7 Nov",
              segera: true,
              selesai: false,
            },
            {
              id: Date.now() + 11,
              notulenId: newId,
              judul: `Laporan verifikasi pelaksanaan ${judul}`,
              pj: "Sekretariat",
              tenggat: "9 Nov",
              segera: false,
              selesai: false,
            },
            ...prev,
          ]);
          toast.success(
            `Transkrip & ringkasan "${judul}" selesai diproses!`
          );
        }, 1200);
      })();
    },
    []
  );

  const createManualNotulen = useCallback(
    (payload: CreateManualNotulenPayload): NotulenItem => {
      const newId = Date.now();
      const jamDur = Math.floor(payload.durasiMenit / 60);
      const mntDur = payload.durasiMenit % 60;
      const durasiLabel =
        jamDur > 0
          ? `${jamDur} jam ${mntDur > 0 ? `${mntDur} menit` : ""}`.trim()
          : `${payload.durasiMenit} menit`;

      const kepClean = payload.keputusan.map((k) => k.trim()).filter(Boolean);
      const validTasks = payload.tugasBaru.filter((t) => t.judul.trim());

      const newNotulen: NotulenItem = {
        id: newId,
        judul: payload.judul.trim(),
        tanggal: formatIsoToIndoShort(payload.tanggalIso),
        tanggalIso: payload.tanggalIso,
        jam: payload.jam.trim() || "09.00 – 10.30",
        lokasi: payload.lokasi.trim() || "Ruang Rapat Utama",
        pimpinan: payload.pimpinan.trim() || "Direktur Utama",
        peserta: payload.peserta || 6,
        sumberInput: "manual",
        durasi: durasiLabel,
        durasiMenit: payload.durasiMenit || 60,
        audioFileName: payload.audioFileName || undefined,
        audioDihapus: !payload.audioFileName,
        dokumentasiFoto: payload.dokumentasiFoto,
        status: payload.status,
        infoSingkat:
          payload.status === "selesai"
            ? `${kepClean.length} keputusan · ${validTasks.length} tugas`
            : "Menunggu pemeriksaan sekretariat",
        ringkasan: payload.ringkasan.trim(),
        keputusan: kepClean,
        transkrip:
          payload.transkrip.trim() ||
          "Notulen dicatat melalui formulir Sekretariat.",
        tugasCount: validTasks.length,
      };

      setNotulenList((prev) => [newNotulen, ...prev]);
      if (validTasks.length > 0) {
        const createdTasks: TugasItem[] = validTasks.map((t, i) => ({
          id: newId + i + 1,
          notulenId: newId,
          judul: t.judul.trim(),
          pj: t.pj,
          tenggat: t.tenggat.trim() || "Minggu ini",
          segera: t.segera,
          selesai: false,
        }));
        setTugasList((prev) => [...createdTasks, ...prev]);
      }

      setSelectedNotulenId(newId);
      setFocusedNotulenId(newId);
      navigate({ to: "/notulen" });
      toast.success(
        `Notulen "${newNotulen.judul}" beserta ${payload.dokumentasiFoto.length} foto dokumentasi berhasil disimpan!`
      );
      return newNotulen;
    },
    [navigate]
  );

  const updateNotulen = useCallback(
    (id: number, patch: Partial<NotulenItem>) => {
      setNotulenList((prev) =>
        prev.map((n) => (n.id === id ? { ...n, ...patch } : n))
      );
      toast.success("Perubahan notulen disimpan.");
    },
    []
  );

  const addPhotosToNotulen = useCallback(
    (id: number, photos: NotulenPhoto[]) => {
      if (photos.length === 0) return;
      setNotulenList((prev) =>
        prev.map((n) =>
          n.id === id
            ? {
                ...n,
                dokumentasiFoto: [...(n.dokumentasiFoto || []), ...photos],
              }
            : n
        )
      );
      toast.success(`${photos.length} foto dokumentasi rapat ditambahkan.`);
    },
    []
  );

  const removePhotoFromNotulen = useCallback((id: number, photoId: string) => {
    setNotulenList((prev) =>
      prev.map((n) =>
        n.id === id
          ? {
              ...n,
              dokumentasiFoto: (n.dokumentasiFoto || []).filter(
                (p) => p.id !== photoId
              ),
            }
          : n
      )
    );
    toast("Foto dokumentasi dihapus.");
  }, []);

  const approveAndLockNotulen = useCallback((id: number) => {
    setNotulenList((prev) =>
      prev.map((n) => {
        if (n.id !== id) return n;
        const kepCount = n.keputusan.length;
        return {
          ...n,
          status: "selesai",
          infoSingkat: `${kepCount} keputusan · ${n.tugasCount} tugas`,
        };
      })
    );
    toast.success("Notulen telah dikunci dan siap dibaca Direktur Utama.");
  }, []);

  const deleteNotulenAudio = useCallback((id: number) => {
    setNotulenList((prev) =>
      prev.map((n) => (n.id === id ? { ...n, audioDihapus: true } : n))
    );
    toast.success(
      "File rekaman audio asli dihapus demi keamanan data rapat (transkrip tetap tersimpan)."
    );
  }, []);

  // CRUD Tugas
  const toggleTugas = useCallback((id: number) => {
    setTugasList((prev) =>
      prev.map((t) => (t.id === id ? { ...t, selesai: !t.selesai } : t))
    );
  }, []);

  const addTugas = useCallback((payload: Omit<TugasItem, "id">) => {
    setTugasList((prev) => [{ ...payload, id: Date.now() }, ...prev]);
    toast.success("Tugas tindak lanjut ditambahkan.");
  }, []);

  const deleteTugas = useCallback((id: number) => {
    setTugasList((prev) => prev.filter((t) => t.id !== id));
    toast("Tugas dihapus.");
  }, []);

  // Settings, Security, AI API Connection Tester, & Wangsaf WA Gateway
  const updateSettings = useCallback(
    (patch: Partial<AssistantSettings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...patch };
        persistSettingsToStorage(next);
        if (serverHydratedRef.current) {
          scheduleServerSettingsPush(next);
        }
        return next;
      });
    },
    [scheduleServerSettingsPush]
  );

  const saveSettingsNow = useCallback((sectionLabel?: string) => {
    const merged: AssistantSettings = {
      ...settingsRef.current,
      persistSecretsOnDevice: true,
    };
    setSettings(merged);
    const okLocal = persistSettingsToStorage(merged);
    void (async () => {
      const serverRes = await pushSettingsToServer(merged);
      if (serverRes.ok) {
        setServerSyncedAt(serverRes.updatedAt || new Date().toISOString());
        toast.success(
          sectionLabel
            ? `${sectionLabel} tersimpan ke server — otomatis aktif di semua perangkat.`
            : "Seluruh pengaturan tersimpan ke server — otomatis aktif di semua perangkat."
        );
      } else if (okLocal) {
        toast.success(
          sectionLabel
            ? `${sectionLabel} berhasil disimpan di perangkat ini.`
            : "Pengaturan berhasil disimpan."
        );
      } else {
        toast.error("Gagal menyimpan pengaturan.");
      }
    })();
  }, []);

  const toggleDarkMode = useCallback(() => {
    setSettings((prev) => {
      const next = { ...prev, darkMode: !prev.darkMode };
      persistSettingsToStorage(next);
      if (serverHydratedRef.current) {
        scheduleServerSettingsPush(next);
      }
      return next;
    });
  }, [scheduleServerSettingsPush]);

  const clearAllApiKeys = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem(SECRETS_SESSION_KEY);
      } catch {
        // ignore
      }
    }
    const cleared: AssistantSettings = {
      ...settingsRef.current,
      aiApiKey: "",
      sttApiKey: "",
      ttsApiKey: "",
      cartesiaApiKey: "",
      waApiToken: "",
      persistSecretsOnDevice: false,
    };
    setSettings(cleared);
    persistSettingsToStorage(cleared);
    void pushSettingsToServer(cleared);
    toast.success(
      "Seluruh API Key AI, TTS, dan Wangsaf berhasil dihapus dari perangkat & server."
    );
  }, []);

  const testAiConnection = useCallback(async (): Promise<{
    ok: boolean;
    message: string;
  }> => {
    const s = settingsRef.current;
    const hasKey = Boolean(s.aiApiKey.trim());
    const isKeylessCustom =
      s.aiProvider === "custom" &&
      s.aiAuthScheme === "none" &&
      Boolean(s.aiBaseUrl.trim());

    if (!hasKey && !isKeylessCustom) {
      return {
        ok: true,
        message:
          "Mode Lokal Cerdas aktif (tidak ada API Key yang di-hardcode). Isi API Key atau gunakan Custom AI Lokal (Ollama/LM Studio) untuk koneksi LLM eksternal.",
      };
    }

    const providerLabel =
      s.aiProvider === "custom"
        ? s.aiCustomName.trim() || "Custom AI"
        : s.aiProvider.toUpperCase();

    try {
      const start = performance.now();
      const reply = await callConfiguredLlm(
        "Balas singkat maksimal 8 kata Bahasa Indonesia.",
        "Konfirmasi koneksi Asisten Tiara Perumdam Tirta Ardhia Rinjani aktif.",
        s
      );
      const ms = Math.round(performance.now() - start);
      return {
        ok: true,
        message: `Terhubung ke ${providerLabel} (${s.aiModel || "default"}) dalam ${ms} ms: "${reply}"`,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menghubungi API";
      return {
        ok: false,
        message: `Koneksi ${providerLabel} gagal (${msg}). Sistem otomatis tetap aman berjalan dengan Engine Lokal Tiara.`,
      };
    }
  }, []);

  const checkWaDeviceStatus =
    useCallback(async (): Promise<WangsafDeviceStatusResult> => {
      return checkWangsafDeviceStatus(settingsRef.current);
    }, []);

  const setActiveRole = useCallback((role: UserRole) => {
    setSettings((prev) => ({ ...prev, peranAktif: role }));
    toast.success(
      `Mode tampilan beralih ke peran: ${
        role === "dirut" ? "Direktur Utama" : "Sekretariat"
      }`
    );
  }, []);

  const toggleRecipient = useCallback((id: number) => {
    setRecipients((prev) =>
      prev.map((r) => (r.id === id ? { ...r, aktif: !r.aktif } : r))
    );
  }, []);

  const addRecipient = useCallback((r: Omit<WaRecipient, "id">) => {
    setRecipients((prev) => [...prev, { ...r, id: Date.now() }]);
    toast.success(`Nomor WhatsApp ${r.nama} ditambahkan.`);
  }, []);

  const sendTestWaBriefing = useCallback(() => {
    const todayItems = agendasRef.current.filter((a) => a.tanggal === TODAY_ISO);
    const activeRecs = recipientsRef.current.filter((r) => r.aktif);
    const jam = nowHHMM();
    const logId = Date.now();
    const gatewayName = settingsRef.current.waGateway;

    const briefingText = [
      `*BRIEFING PAGI AGENDA DIREKSI*`,
      `Perumdam Tirta Ardhia Rinjani · Rabu, 4 Nov 2026`,
      ``,
      ...todayItems.map(
        (a, idx) => `${idx + 1}. *${a.mulai}* — ${a.judul} (${a.lokasi})`
      ),
      ``,
      `_Dikirim otomatis oleh Asisten Virtual Tiara via ${gatewayName}_`,
    ].join("\n");

    const summaryLine =
      `[${gatewayName}] Briefing Hari Ini (${todayItems.length} agenda): ` +
      todayItems.map((a) => `${a.mulai} ${a.judul}`).join(", ");

    setWaLogs((prev) => [
      {
        id: logId,
        waktu: jam,
        labelDashboard: `Briefing uji ${jam}`,
        tujuan: `${activeRecs.length} penerima aktif`,
        isi: summaryLine,
        status: "Terkirim",
      },
      ...prev,
    ]);

    void (async () => {
      if (activeRecs.length === 0) {
        toast("Belum ada nomor penerima WhatsApp yang diaktifkan.");
        return;
      }

      const results = await Promise.all(
        activeRecs.map((rec) =>
          sendWhatsappViaGateway({
            targetPhone: rec.noWa,
            message: briefingText,
            settings: settingsRef.current,
          })
        )
      );

      const firstErr = results.find((r) => !r.ok);
      const firstChatId = results.find((r) => r.chatId)?.chatId;
      const isSimulated = results.every((r) => r.simulated);

      if (firstErr) {
        setWaLogs((prev) =>
          prev.map((l) => (l.id === logId ? { ...l, status: "Gagal" } : l))
        );
        toast.error(
          `Gagal kirim via ${gatewayName}: ${
            firstErr.errorMessage || "Periksa Api-Key perangkat Wangsaf"
          }`
        );
      } else if (isSimulated) {
        toast.success(
          `Simulasi Briefing (${gatewayName}) tercatat untuk ${activeRecs.length} penerima. Isi Api-Key perangkat Wangsaf untuk pengiriman WhatsApp nyata.`
        );
      } else {
        setWaLogs((prev) =>
          prev.map((l) =>
            l.id === logId ? { ...l, status: "Terkirim", chatId: firstChatId } : l
          )
        );
        toast.success(
          `Briefing WhatsApp berhasil dikirim via ${gatewayName} ke ${activeRecs.length} penerima!`
        );
      }
    })();
  }, []);

  const sendDirectTestWhatsapp = useCallback(async (targetPhone: string) => {
    const cleanPhone = targetPhone.trim();
    if (!cleanPhone) {
      toast.error("Masukkan nomor WhatsApp tujuan terlebih dahulu.");
      return;
    }
    const jam = nowHHMM();
    const logId = Date.now();
    const gatewayName = settingsRef.current.waGateway;
    const todayItems = agendasRef.current.filter((a) => a.tanggal === TODAY_ISO);
    const msgText = [
      `*TES KONEKSI ASISTEN TIARA*`,
      `Perumdam Tirta Ardhia Rinjani · ${jam} WITA`,
      ``,
      `Halo ${settingsRef.current.namaDirut}, integrasi WhatsApp *${gatewayName}* telah aktif dan siap mengirimkan briefing agenda (${todayItems.length} jadwal hari ini) serta ringkasan notulen rapat.`,
    ].join("\n");

    const res = await sendWhatsappViaGateway({
      targetPhone: cleanPhone,
      message: msgText,
      settings: settingsRef.current,
    });

    setWaLogs((prev) => [
      {
        id: logId,
        waktu: jam,
        labelDashboard: `Tes WA ${jam}`,
        tujuan: cleanPhone,
        isi: `[${gatewayName}] Tes pesan langsung ke ${cleanPhone}`,
        status: res.ok ? "Terkirim" : "Gagal",
        chatId: res.chatId,
      },
      ...prev,
    ]);

    if (!res.ok) {
      toast.error(
        `Gagal mengirim WhatsApp ke ${cleanPhone}: ${
          res.errorMessage || "Periksa Api-Key perangkat Wangsaf"
        }`
      );
    } else if (res.simulated) {
      toast.success(
        `Simulasi pesan ke ${cleanPhone} tercatat. Isi Api-Key Perangkat Wangsaf untuk mengirim pesan nyata.`
      );
    } else {
      toast.success(
        `Berhasil! Pesan WhatsApp nyata telah dikirim ke ${cleanPhone}${
          res.chatId ? ` (ID: ${res.chatId})` : ""
        }.`
      );
    }
  }, []);

  const retryWaLog = useCallback((id: number) => {
    const targetLog = waLogsRef.current.find((l) => l.id === id);
    const activeRecs = recipientsRef.current.filter((r) => r.aktif);

    void (async () => {
      if (targetLog && activeRecs.length > 0) {
        const res = await sendWhatsappViaGateway({
          targetPhone: activeRecs[0].noWa,
          message: targetLog.isi,
          settings: settingsRef.current,
        });
        if (!res.ok) {
          setWaLogs((prev) =>
            prev.map((l) => (l.id === id ? { ...l, status: "Gagal" } : l))
          );
          toast.error(
            `Pengiriman ulang gagal: ${
              res.errorMessage || "Periksa Api-Key perangkat Wangsaf"
            }`
          );
          return;
        }
        setWaLogs((prev) =>
          prev.map((l) =>
            l.id === id
              ? { ...l, status: "Terkirim", chatId: res.chatId ?? l.chatId }
              : l
          )
        );
        toast.success(
          res.simulated
            ? "Pengiriman WhatsApp berhasil disimulasikan ulang."
            : `Pesan WhatsApp berhasil dikirim ulang via ${settingsRef.current.waGateway}!`
        );
      } else {
        setWaLogs((prev) =>
          prev.map((l) => (l.id === id ? { ...l, status: "Terkirim" } : l))
        );
        toast.success("Status pengiriman WhatsApp diperbarui.");
      }
    })();
  }, []);

  const resetDemoData = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
      window.sessionStorage.removeItem(SECRETS_SESSION_KEY);
    }
    setAgendas(INITIAL_AGENDA);
    setNotulenList(INITIAL_NOTULEN);
    setTugasList(INITIAL_TUGAS);
    setWaLogs(INITIAL_WA_LOGS);
    setRecipients(INITIAL_RECIPIENTS);
    setSettings(INITIAL_SETTINGS);
    setSelectedNotulenId(INITIAL_NOTULEN[0]?.id ?? 1);
    setFocusedNotulenId(null);
    setCandidateNotulens([]);
    setCandidateQueryLabel("");
    setCandidateMatchReasons({});
    setConversationHistory([]);
    setDialogStage("idle");
    setReminder({
      visible: true,
      snoozed: false,
      waktu: INITIAL_REMINDER.waktu,
      judul: INITIAL_REMINDER.judulAcara,
      teks: INITIAL_REMINDER.teks,
    });
    toast.success("Data demo Perumdam Tirta Ardhia Rinjani dikembalikan ke awal.");
  }, []);

  // Aktifkan standby wake-word "Hey Tiara / Halo Tiara" otomatis pada interaksi pertama di halaman
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!micSupported || !settings.wakeWordAktif) return;

    const unlockStandby = () => {
      if (!assistantEnabledRef.current && settingsRef.current.wakeWordAktif) {
        assistantEnabledRef.current = true;
        setAssistantEnabled(true);
        startRecognitionLoop();
      }
      window.removeEventListener("pointerdown", unlockStandby);
      window.removeEventListener("keydown", unlockStandby);
    };

    window.addEventListener("pointerdown", unlockStandby, { passive: true });
    window.addEventListener("keydown", unlockStandby, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", unlockStandby);
      window.removeEventListener("keydown", unlockStandby);
    };
  }, [micSupported, settings.wakeWordAktif, startRecognitionLoop]);

  useEffect(() => {
    return () => {
      stopRecognitionSafe();
      stopSpeaking();
      if (speakStartTimerRef.current) {
        window.clearTimeout(speakStartTimerRef.current);
      }
      if (sessionTimerRef.current) {
        window.clearTimeout(sessionTimerRef.current);
      }
    };
  }, [stopRecognitionSafe]);

  const value: PdamStoreValue = {
    agendas,
    notulenList,
    tugasList,
    waLogs,
    recipients,
    settings,
    selectedNotulenId,
    setSelectedNotulenId,
    focusedNotulenId,
    candidateNotulens,
    candidateQueryLabel,
    candidateMatchReasons,
    dismissCandidateNotulens,
    dialogStage,
    conversationHistory,
    assistantEnabled,
    isListening,
    isSpeaking,
    isSpeechPaused,
    awaitingCommand,
    liveTranscript,
    lastAssistantReply,
    micSupported,
    reminder,
    voiceDraft,
    setVoiceDraft,
    uploadModalOpen,
    setUploadModalOpen,
    createNotulenModalOpen,
    setCreateNotulenModalOpen,
    notulenPrefill,
    openCreateNotulenManual,
    openCreateNotulenFromAgenda,
    searchModalOpen,
    setSearchModalOpen,
    activateAndGreetTiara,
    toggleWakeWordListening,
    turnOffAssistantMic,
    simulateWakeWord,
    sendCommandToTiara,
    selectDisambiguatedNotulen,
    readNotulenAloud,
    pauseOrResumeSpeech,
    stopTiaraSpeakingOnly,
    endConversationSession,
    triggerReminderAnnouncement,
    snoozeReminder,
    dismissReminder,
    speakCustom,
    addAgenda,
    updateAgenda,
    deleteAgenda,
    toggleAgendaDone,
    uploadAudioNotulen,
    createManualNotulen,
    updateNotulen,
    addPhotosToNotulen,
    removePhotoFromNotulen,
    approveAndLockNotulen,
    deleteNotulenAudio,
    sendNotulenSummaryToWa,
    toggleTugas,
    addTugas,
    deleteTugas,
    serverSyncedAt,
    updateSettings,
    saveSettingsNow,
    toggleDarkMode,
    clearAllApiKeys,
    testAiConnection,
    checkWaDeviceStatus,
    setActiveRole,
    toggleRecipient,
    addRecipient,
    sendTestWaBriefing,
    sendDirectTestWhatsapp,
    retryWaLog,
    resetDemoData,
  };

  return <PdamContext.Provider value={value}>{children}</PdamContext.Provider>;
}

export function usePdamStore(): PdamStoreValue {
  const ctx = useContext(PdamContext);
  if (!ctx) {
    throw new Error("usePdamStore harus digunakan di dalam PdamStoreProvider");
  }
  return ctx;
}
