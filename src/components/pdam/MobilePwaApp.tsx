import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";
import { TODAY_ISO } from "@/data/pdam-data";
import { compressImageFile } from "@/lib/ai-service";
import { usePdamStore } from "@/lib/pdam-store";
import { getGreetingWita, normalizeTimeDot } from "@/lib/tiara-speech";
import type {
  AgendaItem,
  AiAuthScheme,
  AiLlmProvider,
  AiTtsProvider,
  JenisAgenda,
  NotulenFormPrefill,
  NotulenItem,
  NotulenPhoto,
  RecurrenceType,
  StatusNotulen,
  TugasItem,
} from "@/lib/types";
import "./mobile-pwa.css";

type MobileTab = "home" | "agenda" | "notulen" | "tugas";
type AgendaSubView = "hari" | "minggu" | "kalender";
type NotulenDetailTab = "ring" | "tgs" | "trk";

type ActiveSheet =
  | { kind: "none" }
  | { kind: "voice" }
  | { kind: "agenda-form"; agenda?: AgendaItem | null; defaultDate?: string }
  | { kind: "notulen-detail"; notulenId: number }
  | { kind: "upload-audio" }
  | { kind: "create-notulen"; prefill?: NotulenFormPrefill | null }
  | { kind: "tugas-form" }
  | { kind: "settings" };

const ICON_PATHS: Record<string, string> = {
  home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  cal: '<path d="M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM3 9h18M8 2v4M16 2v4"/>',
  doc: '<path d="M6 2h9l5 5v15H6zM14 2v6h6M9 13h7M9 17h7"/>',
  tg: '<path d="M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/>',
  mic: '<path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v4"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  warn: '<path d="M12 3l10 18H2zM12 10v5M12 18v.5"/>',
  send: '<path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>',
  up: '<path d="M12 16V4M6 10l6-6 6 6M4 20h16"/>',
  play: '<path d="M7 4l13 8-13 8z"/>',
  pause: '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
  pin: '<path d="M12 22s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
  us: '<path d="M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1"/><circle cx="9.5" cy="7.5" r="3.5"/><path d="M21 20v-1a4 4 0 0 0-3-3.8M16 4.2a3.5 3.5 0 0 1 0 6.6"/>',
  rep: '<path d="M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3"/>',
  ck: '<path d="M4 12l5 5L20 6"/>',
  dl: '<path d="M12 4v12M6 10l6 6 6-6M4 20h16"/>',
  bell: '<path d="M6 9a6 6 0 0 1 12 0c0 6 2 7 2 7H4s2-1 2-7zM10 20a2 2 0 0 0 4 0"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4.2-4.2"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>',
  cam: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
  vol: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>',
  chevL: '<path d="M15 18l-6-6 6-6"/>',
  chevR: '<path d="M9 18l6-6-6-6"/>',
};

function PwaIcon({ name, size }: { name: keyof typeof ICON_PATHS; size?: number }) {
  return (
    <svg
      className="i"
      style={size ? { width: size, height: size } : undefined}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: ICON_PATHS[name] || "" }}
    />
  );
}

const DAY_NAMES_FULL = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];
const DAY_NAMES_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MONTH_NAMES_SHORT = [
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
const MONTH_NAMES_FULL = [
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

function parseIsoLocal(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y || 2026, (m || 11) - 1, d || 4);
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDaysIso(iso: string, delta: number): string {
  const d = parseIsoLocal(iso);
  d.setDate(d.getDate() + delta);
  return toIsoDate(d);
}

function getMondayOfIso(iso: string): string {
  const d = parseIsoLocal(iso);
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return toIsoDate(d);
}

function formatDayDateShort(iso: string): string {
  const d = parseIsoLocal(iso);
  return `${DAY_NAMES_FULL[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES_SHORT[d.getMonth()]}`;
}

function formatFullHeaderDate(iso: string): string {
  const d = parseIsoLocal(iso);
  return `${DAY_NAMES_FULL[d.getDay()]}, ${d.getDate()} ${
    MONTH_NAMES_FULL[d.getMonth()]
  } ${d.getFullYear()}`;
}

function timeToMinutes(dotOrColon: string): number {
  const clean = dotOrColon.replace(":", ".");
  const [h, m] = clean.split(".").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function dotToColon(t: string): string {
  const clean = normalizeTimeDot(t);
  return clean.replace(".", ":");
}

function findAgendaConflicts(
  list: AgendaItem[],
  tanggal: string,
  mulai: string,
  selesai: string,
  skipId?: number
): AgendaItem[] {
  const s = timeToMinutes(mulai);
  const e = timeToMinutes(selesai);
  return list.filter(
    (a) =>
      a.tanggal === tanggal &&
      a.id !== skipId &&
      timeToMinutes(a.mulai) < e &&
      timeToMinutes(a.selesai) > s
  );
}

function statusMeta(s: StatusNotulen): { label: string; cls: string } {
  if (s === "selesai") return { label: "Selesai", cls: "c-ok" };
  if (s === "diperiksa") return { label: "Diperiksa", cls: "" };
  if (s === "gagal") return { label: "Gagal", cls: "c-fl" };
  return { label: "Diproses", cls: "c-h" };
}

function exportWordMobile(item: NotulenItem, relatedTasks: TugasItem[]) {
  const photosHtml =
    item.dokumentasiFoto && item.dokumentasiFoto.length > 0
      ? `<h4>4. Dokumentasi Foto Rapat</h4>` +
        item.dokumentasiFoto
          .map(
            (p) =>
              `<div style="margin-bottom:14px;"><img src="${p.url}" width="420" style="max-width:420px;border-radius:8px;"/><br/><i>${p.caption}</i></div>`
          )
          .join("")
      : "";

  const tasksHtml =
    relatedTasks.length > 0
      ? `<h4>3. Daftar Tugas & Tindak Lanjut</h4><ul>` +
        relatedTasks
          .map(
            (t) =>
              `<li><b>${t.judul}</b> — PIC: ${t.pj} | Tenggat: ${t.tenggat} (${
                t.selesai ? "Selesai" : "Berjalan"
              })</li>`
          )
          .join("") +
        `</ul>`
      : "";

  const html = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>Notulen - ${item.judul}</title></head>
    <body style="font-family: Arial, sans-serif; line-height: 1.55;">
      <h2>PERUMDAM TIRTA ARDHIA RINJANI</h2>
      <h3>NOTULEN RAPAT: ${item.judul}</h3>
      <p><b>Tanggal:</b> ${item.tanggal} ${item.jam ? `(${item.jam})` : ""} | <b>Lokasi:</b> ${
    item.lokasi || "Ruang Rapat"
  } | <b>Durasi:</b> ${item.durasi}</p>
      <hr/>
      <h4>1. Ringkasan Eksekutif</h4>
      <p>${item.ringkasan}</p>
      <h4>2. Poin-poin Keputusan</h4>
      <ol>${item.keputusan.map((k) => `<li>${k}</li>`).join("")}</ol>
      ${tasksHtml}
      ${photosHtml}
      <h4>Catatan / Transkrip Rekaman</h4>
      <pre style="white-space: pre-wrap; font-family: Arial, sans-serif;">${item.transkrip}</pre>
    </body></html>
  `;
  const blob = new Blob(["\ufeff", html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Notulen-${item.judul.replace(/\s+/g, "-")}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}

function parseTranscriptRows(
  raw: string
): Array<{ time: string; speaker: string; text: string }> {
  const lines = raw
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const parsed: Array<{ time: string; speaker: string; text: string }> = [];
  for (const line of lines) {
    const m = line.match(/^\[?(\d{1,2}[:.]\d{2})\]?\s*([^:—-]+)[:—-]\s*(.+)$/);
    if (m) {
      parsed.push({
        time: m[1].replace(":", "."),
        speaker: m[2].trim(),
        text: m[3].trim(),
      });
    } else {
      parsed.push({
        time: "•",
        speaker: "Catatan",
        text: line,
      });
    }
  }
  return parsed;
}

export function MobilePwaApp({
  onExitDesktopPreview,
}: {
  onExitDesktopPreview?: () => void;
}) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const {
    agendas,
    notulenList,
    tugasList,
    waLogs,
    recipients,
    settings,
    focusedNotulenId,
    candidateNotulens,
    candidateQueryLabel,
    candidateMatchReasons,
    dismissCandidateNotulens,
    conversationHistory,
    assistantEnabled,
    isListening,
    isSpeaking,
    isSpeechPaused,
    awaitingCommand,
    liveTranscript,
    lastAssistantReply,
    reminder,
    voiceDraft,
    setVoiceDraft,
    setSearchModalOpen,
    activateAndGreetTiara,
    turnOffAssistantMic,
    toggleWakeWordListening,
    simulateWakeWord,
    sendCommandToTiara,
    selectDisambiguatedNotulen,
    readNotulenAloud,
    pauseOrResumeSpeech,
    stopTiaraSpeakingOnly,
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
    testAiConnection,
    checkWaDeviceStatus,
    setActiveRole,
    toggleRecipient,
    sendTestWaBriefing,
    sendDirectTestWhatsapp,
    retryWaLog,
    resetDemoData,
  } = usePdamStore();

  // Sinkronisasi tab dengan route web
  const derivedTabFromRoute: MobileTab = useMemo(() => {
    if (pathname.startsWith("/agenda")) return "agenda";
    if (pathname.startsWith("/notulen")) return "notulen";
    if (pathname.startsWith("/tugas")) return "tugas";
    return "home";
  }, [pathname]);

  const [tab, setTab] = useState<MobileTab>(derivedTabFromRoute);
  const [enterAnimKey, setEnterAnimKey] = useState<number>(1);
  const [animActive, setAnimActive] = useState<boolean>(true);
  const [isOffline, setIsOffline] = useState<boolean>(
    typeof navigator !== "undefined" ? !navigator.onLine : false
  );

  // Agenda View State
  const [selectedDateIso, setSelectedDateIso] = useState<string>(TODAY_ISO);
  const [agendaView, setAgendaView] = useState<AgendaSubView>("hari");
  const [calendarMonthCursor, setCalendarMonthCursor] = useState<string>(
    TODAY_ISO.slice(0, 7) // "2026-11"
  );

  // Notulen View State
  const [notulenQuery, setNotulenQuery] = useState<string>("");
  const [notulenFilter, setNotulenFilter] = useState<"semua" | StatusNotulen>(
    "semua"
  );

  // Tugas View State
  const [tugasFilter, setTugasFilter] = useState<"buka" | "tutup">("buka");

  // Sheet State
  const [sheet, setSheet] = useState<ActiveSheet>(() =>
    pathname.startsWith("/pengaturan") ? { kind: "settings" } : { kind: "none" }
  );

  // Countdown rolling digits state (5 menit 10 detik dari mount seperti referensi HTML)
  const mountTimeRef = useRef<number>(Date.now());
  const [countdownSec, setCountdownSec] = useState<number>(310);
  const prevCountdownStrRef = useRef<string>("05:10");

  // PWA Install Prompt availability
  const [canInstallPwa, setCanInstallPwa] = useState<boolean>(() =>
    Boolean(typeof window !== "undefined" && window.__pdamDeferredPrompt)
  );

  useEffect(() => {
    setTab(derivedTabFromRoute);
    if (pathname.startsWith("/pengaturan")) {
      setSheet({ kind: "settings" });
    }
  }, [derivedTabFromRoute, pathname]);

  // Animasi reveal saat pindah tab
  useEffect(() => {
    setAnimActive(true);
    const t = window.setTimeout(() => setAnimActive(false), 900);
    return () => window.clearTimeout(t);
  }, [enterAnimKey]);

  const switchTab = useCallback(
    (next: MobileTab) => {
      setTab(next);
      setEnterAnimKey((k) => k + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      const routeMap: Record<MobileTab, string> = {
        home: "/",
        agenda: "/agenda",
        notulen: "/notulen",
        tugas: "/tugas",
      };
      if (pathname !== routeMap[next]) {
        navigate({ to: routeMap[next] });
      }
    },
    [navigate, pathname]
  );

  // Online / Offline listener
  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // PWA beforeinstallprompt listener
  useEffect(() => {
    const syncInstall = () =>
      setCanInstallPwa(Boolean(window.__pdamDeferredPrompt));
    window.addEventListener("pdam-install-available", syncInstall);
    return () =>
      window.removeEventListener("pdam-install-available", syncInstall);
  }, []);

  // Countdown ticker
  useEffect(() => {
    const iv = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - mountTimeRef.current) / 1000);
      setCountdownSec(Math.max(0, 310 - elapsed));
    }, 1000);
    return () => window.clearInterval(iv);
  }, []);

  // Otomatis buka sheet Voice saat ada disambiguasi notulen (>1 kandidat) atau voiceDraft baru
  useEffect(() => {
    if (candidateNotulens.length > 1 || voiceDraft) {
      setSheet({ kind: "voice" });
    }
  }, [candidateNotulens.length, voiceDraft]);

  // Otomatis buka detail notulen di mobile saat Tiara menemukan 1 notulen spesifik
  const lastFocusedRef = useRef<number | null>(null);
  useEffect(() => {
    if (focusedNotulenId && focusedNotulenId !== lastFocusedRef.current) {
      lastFocusedRef.current = focusedNotulenId;
      setSheet({ kind: "notulen-detail", notulenId: focusedNotulenId });
    }
  }, [focusedNotulenId]);

  const countdownStr = useMemo(() => {
    const mm = String(Math.floor(countdownSec / 60)).padStart(2, "0");
    const ss = String(countdownSec % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }, [countdownSec]);

  const prevCountdownStr = prevCountdownStrRef.current;
  useEffect(() => {
    prevCountdownStrRef.current = countdownStr;
  }, [countdownStr]);

  // Data turunan Beranda
  const todayAgendas = useMemo(
    () =>
      [...agendas.filter((a) => a.tanggal === TODAY_ISO)].sort(
        (a, b) => timeToMinutes(a.mulai) - timeToMinutes(b.mulai)
      ),
    [agendas]
  );
  const upcomingToday = useMemo(
    () => todayAgendas.filter((a) => !a.selesaiAcara),
    [todayAgendas]
  );
  const doneTodayCount = todayAgendas.length - upcomingToday.length;
  const nextAgenda = upcomingToday[0] ?? todayAgendas[todayAgendas.length - 1];
  const todayNotulens = useMemo(
    () => notulenList.filter((n) => n.tanggalIso === TODAY_ISO),
    [notulenList]
  );
  const urgentTasks = useMemo(
    () => tugasList.filter((t) => t.segera && !t.selesai),
    [tugasList]
  );

  // Status Asisten Suara
  const assistantStatusLabel = isSpeaking
    ? "Berbicara"
    : assistantEnabled && isListening
    ? "Mendengarkan"
    : assistantEnabled
    ? "Siaga"
    : "Suara mati";

  const handlePlayMorningBriefing = () => {
    const count = todayAgendas.length;
    const nxtText = nextAgenda
      ? `Berikutnya ${nextAgenda.judul} pukul ${nextAgenda.mulai.replace(
          ".",
          " lewat "
        )} di ${nextAgenda.lokasi}.`
      : "Seluruh jadwal hari ini telah selesai.";
    speakCustom(
      `${getGreetingWita()}, ${settings.namaDirut}. Hari ini ada ${count} agenda kegiatan. ${nxtText}`
    );
    toast.success(
      settings.ttsBriefingAktif
        ? "Briefing suara diputar oleh Tiara"
        : "Pengumuman suara dimatikan di pengaturan"
    );
  };

  // Pekan aktif untuk halaman Agenda (Senin s/d Sabtu dari selectedDateIso)
  const weekMondayIso = useMemo(
    () => getMondayOfIso(selectedDateIso),
    [selectedDateIso]
  );
  const weekDaysIso = useMemo(
    () => Array.from({ length: 6 }, (_, idx) => addDaysIso(weekMondayIso, idx)),
    [weekMondayIso]
  );
  const weekRangeLabel = useMemo(() => {
    const d0 = parseIsoLocal(weekDaysIso[0]);
    const d5 = parseIsoLocal(weekDaysIso[5]);
    return `Pekan ${d0.getDate()} ${
      MONTH_NAMES_SHORT[d0.getMonth()]
    } – ${d5.getDate()} ${MONTH_NAMES_SHORT[d5.getMonth()]}`;
  }, [weekDaysIso]);

  const selectedDayAgendas = useMemo(
    () =>
      [...agendas.filter((a) => a.tanggal === selectedDateIso)].sort(
        (a, b) => timeToMinutes(a.mulai) - timeToMinutes(b.mulai)
      ),
    [agendas, selectedDateIso]
  );
  const selectedDayNotulens = useMemo(
    () => notulenList.filter((n) => n.tanggalIso === selectedDateIso),
    [notulenList, selectedDateIso]
  );
  const selectedDayConflictCount = useMemo(
    () =>
      selectedDayAgendas.filter(
        (a) =>
          findAgendaConflicts(
            agendas,
            a.tanggal,
            a.mulai,
            a.selesai,
            a.id
          ).length > 0
      ).length,
    [agendas, selectedDayAgendas]
  );

  // Kalender Bulanan cells
  const monthCalendarCells = useMemo(() => {
    const [yStr, mStr] = calendarMonthCursor.split("-");
    const year = Number(yStr) || 2026;
    const monthIdx = (Number(mStr) || 11) - 1;
    const firstDay = new Date(year, monthIdx, 1);
    const startOffset = (firstDay.getDay() + 6) % 7; // Senin = 0
    const startDate = new Date(year, monthIdx, 1 - startOffset);
    return Array.from({ length: 35 }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const iso = toIsoDate(d);
      return {
        iso,
        dayNum: d.getDate(),
        inMonth: d.getMonth() === monthIdx,
        agendaCount: agendas.filter((a) => a.tanggal === iso).length,
        notulenCount: notulenList.filter((n) => n.tanggalIso === iso).length,
      };
    });
  }, [agendas, calendarMonthCursor, notulenList]);

  // Statistik & Filter Notulen
  const notulenStats = useMemo(() => {
    const total = notulenList.length;
    const thisMonth = notulenList.filter((n) =>
      n.tanggalIso.startsWith("2026-11")
    ).length;
    const totalTasks = tugasList.length;
    const totalHours = Math.max(
      1,
      Math.round(
        notulenList.reduce((acc, n) => acc + (n.durasiMenit || 45), 0) / 60
      )
    );
    const selesai = notulenList.filter((n) => n.status === "selesai").length;
    const diperiksa = notulenList.filter((n) => n.status === "diperiksa").length;
    const diproses = notulenList.filter(
      (n) => n.status === "diproses" || n.status === "diunggah"
    ).length;
    return {
      total,
      thisMonth,
      totalTasks,
      totalHours,
      selesai,
      diperiksa,
      diproses,
    };
  }, [notulenList, tugasList.length]);

  const filteredNotulens = useMemo(() => {
    const q = notulenQuery.trim().toLowerCase();
    return notulenList.filter((n) => {
      if (notulenFilter !== "semua") {
        if (
          notulenFilter === "diproses" &&
          n.status !== "diproses" &&
          n.status !== "diunggah"
        ) {
          return false;
        } else if (notulenFilter !== "diproses" && n.status !== notulenFilter) {
          return false;
        }
      }
      if (!q) return true;
      return (
        n.judul.toLowerCase().includes(q) ||
        n.tanggal.toLowerCase().includes(q) ||
        n.ringkasan.toLowerCase().includes(q) ||
        n.keputusan.join(" ").toLowerCase().includes(q)
      );
    });
  }, [notulenFilter, notulenList, notulenQuery]);

  // Statistik & Filter Tugas
  const openTasks = useMemo(
    () => tugasList.filter((t) => !t.selesai),
    [tugasList]
  );
  const doneTasks = useMemo(
    () => tugasList.filter((t) => t.selesai),
    [tugasList]
  );
  const displayedTasks = tugasFilter === "buka" ? openTasks : doneTasks;

  const handleInstallPwa = async () => {
    const promptEvt = window.__pdamDeferredPrompt;
    if (promptEvt) {
      await promptEvt.prompt();
      const choice = await promptEvt.userChoice;
      if (choice.outcome === "accepted") {
        toast.success("Asisten Dirut berhasil dipasang di layar utama!");
      }
      window.__pdamDeferredPrompt = null;
      setCanInstallPwa(false);
    } else {
      toast(
        "Buka menu browser (⋮ atau Bagikan), lalu pilih 'Tambahkan ke Layar Utama' / 'Install App'."
      );
    }
  };

  const renderTimelineItem = (a: AgendaItem, highlightNextId?: number) => {
    const conflict = findAgendaConflicts(
      agendas,
      a.tanggal,
      a.mulai,
      a.selesai,
      a.id
    )[0];
    const isNext = highlightNextId === a.id;
    return (
      <button
        key={`ag-${a.id}`}
        type="button"
        className={`tl ${a.selesaiAcara ? "dn" : ""} ${isNext ? "nx" : ""}`}
        onClick={() => setSheet({ kind: "agenda-form", agenda: a })}
      >
        <div className="tt">
          <b>{a.mulai}</b>
          <span>{a.selesai}</span>
        </div>
        <i className={`dot k-${a.jenis}`} />
        <div className="tb">
          <h4>{a.judul}</h4>
          <div className="meta">
            <span>
              <PwaIcon name="pin" size={15} />
              {a.lokasi}
            </span>
            <span>
              <PwaIcon name="us" size={15} />
              {a.labelPeserta || `${a.peserta} peserta`}
            </span>
            {a.berulang !== "tidak" && (
              <span>
                <PwaIcon name="rep" size={15} />
                {a.berulang === "mingguan" ? "Mingguan" : "Bulanan"}
              </span>
            )}
          </div>
          {conflict && (
            <div className="cf">
              <PwaIcon name="warn" size={15} />
              Bentrok dengan {conflict.judul}
            </div>
          )}
        </div>
      </button>
    );
  };

  const renderNotulenTimelineItem = (n: NotulenItem) => {
    const sm = statusMeta(n.status);
    const jamStart = n.jam ? n.jam.split(/[–-]/)[0]?.trim() || "09.00" : "Dok";
    return (
      <button
        key={`nt-tl-${n.id}`}
        type="button"
        className="tl nt-item"
        onClick={() => setSheet({ kind: "notulen-detail", notulenId: n.id })}
      >
        <div className="tt">
          <b>{jamStart}</b>
          <span>Notulen</span>
        </div>
        <i className="dot-notulen" />
        <div className="tb">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span className="chip c-nt" style={{ padding: "2px 9px", fontSize: 11 }}>
              ◆ Notulen Rapat
            </span>
            <span className={`chip ${sm.cls}`} style={{ padding: "2px 9px", fontSize: 11 }}>
              {sm.label}
            </span>
          </div>
          <h4>{n.judul}</h4>
          <div className="meta">
            <span>{n.infoSingkat}</span>
            {n.dokumentasiFoto && n.dokumentasiFoto.length > 0 && (
              <span>
                <PwaIcon name="cam" size={14} />
                {n.dokumentasiFoto.length} foto
              </span>
            )}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="mpwa-shell">
      {/* Tombol kembali ke Web Desktop bila sedang mode pratinjau di layar lebar */}
      {onExitDesktopPreview && (
        <div
          style={{
            position: "fixed",
            top: 14,
            right: 16,
            zIndex: 85,
          }}
        >
          <button
            type="button"
            className="btn sm"
            style={{
              boxShadow: "0 10px 24px rgba(20,23,31,0.22)",
              fontSize: 12,
            }}
            onClick={onExitDesktopPreview}
          >
            ← Tampilan Web Desktop
          </button>
        </div>
      )}

      {/* Top Slide-Down Pengingat Suara (#ban) */}
      <div className={`mpwa-ban ${reminder.visible ? "on" : ""}`}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <span className="chip">
            <PwaIcon name="bell" size={14} /> {reminder.waktu}, pengingat suara
          </span>
        </div>
        <p>
          {reminder.snoozed
            ? "Ditunda 5 menit. Tiara akan mengingatkan Bapak kembali."
            : reminder.teks}
        </p>
        <div className="row">
          <button type="button" className="btn sm t" onClick={snoozeReminder}>
            Tunda 5 menit
          </button>
          <button type="button" className="btn sm w" onClick={dismissReminder}>
            Tutup
          </button>
        </div>
      </div>

      {/* Main Mobile Container */}
      <div className="mpwa-app">
        <main
          key={enterAnimKey}
          className={`mpwa-main ${animActive ? "in" : ""}`}
        >
          {isOffline && (
            <div className="off">
              <PwaIcon name="warn" size={16} />
              Offline. Menampilkan data terakhir yang tersimpan di perangkat.
            </div>
          )}

          {/* ==================== TAB 1: BERANDA ==================== */}
          {tab === "home" && (
            <>
              <div className="top">
                <div>
                  <small>{formatFullHeaderDate(TODAY_ISO)}</small>
                  <h1 className="d">
                    {getGreetingWita()},{" "}
                    <span style={{ color: "#7A808C" }}>
                      {settings.namaDirut}
                    </span>
                  </h1>
                </div>
                <div className="row" style={{ gap: 6 }}>
                  <button
                    type="button"
                    className="ib"
                    aria-label="Cari cepat"
                    onClick={() => setSearchModalOpen(true)}
                  >
                    <PwaIcon name="search" size={17} />
                  </button>
                  <button
                    type="button"
                    className="ib"
                    aria-label="Mode Gelap"
                    onClick={toggleDarkMode}
                  >
                    <PwaIcon name={settings.darkMode ? "sun" : "moon"} size={17} />
                  </button>
                  <button
                    type="button"
                    className="av"
                    aria-label="Pengaturan"
                    onClick={() => setSheet({ kind: "settings" })}
                  >
                    {settings.peranAktif === "dirut" ? "DR" : "SK"}
                  </button>
                </div>
              </div>

              {/* Hero Next Agenda Card */}
              {nextAgenda && (
                <section className="hero">
                  <div className="hh">
                    <span className="chip">Berikutnya, {nextAgenda.mulai}</span>
                    <span className="cd d">
                      {[...countdownStr].map((ch, idx) => (
                        <span
                          key={`${idx}-${ch}`}
                          className={
                            prevCountdownStr[idx] &&
                            prevCountdownStr[idx] !== ch
                              ? "ch"
                              : ""
                          }
                        >
                          {ch}
                        </span>
                      ))}
                    </span>
                  </div>
                  <h2 className="d">{nextAgenda.judul}</h2>
                  <div className="meta">
                    <span>
                      <PwaIcon name="pin" size={15} />
                      {nextAgenda.lokasi}
                    </span>
                    <span>
                      <PwaIcon name="us" size={15} />
                      {nextAgenda.labelPeserta ||
                        `${nextAgenda.peserta} peserta`}
                    </span>
                  </div>
                  <div className="pgl">
                    <i
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(12, 100 - countdownSec / 4)
                        )}%`,
                      }}
                    />
                  </div>
                  <div className="row">
                    <button
                      type="button"
                      className="btn"
                      onClick={handlePlayMorningBriefing}
                    >
                      <PwaIcon name="play" size={16} />
                      Briefing suara
                    </button>
                    <button
                      type="button"
                      className="btn g"
                      onClick={() => switchTab("agenda")}
                    >
                      Lihat agenda
                    </button>
                  </div>
                </section>
              )}

              {/* Dark Voice Assistant Card (.ast) */}
              <section className="card ast">
                <div className="ah">
                  <div
                    className={`wv ${
                      isSpeaking
                        ? "sp"
                        : assistantEnabled && (isListening || awaitingCommand)
                        ? "on"
                        : ""
                    }`}
                  >
                    {Array.from({ length: 9 }, (_, idx) => (
                      <i key={idx} />
                    ))}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b>Asisten Tiara: {assistantStatusLabel}</b>
                    <p
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {lastAssistantReply
                        ? lastAssistantReply
                        : `Pengumuman berikutnya ${reminder.waktu}, ${reminder.judul}`}
                    </p>
                  </div>
                </div>
                <div className="row">
                  <button
                    type="button"
                    className={`btn ${assistantEnabled ? "g" : "t"}`}
                    style={{ flex: 1 }}
                    onClick={() => {
                      if (assistantEnabled || isListening || isSpeaking) {
                        turnOffAssistantMic();
                      } else {
                        activateAndGreetTiara();
                      }
                    }}
                  >
                    {assistantEnabled || isListening || isSpeaking
                      ? "Matikan suara asisten"
                      : "Aktifkan asisten"}
                  </button>
                  <button
                    type="button"
                    className="btn t"
                    onClick={() => setSheet({ kind: "voice" })}
                  >
                    <PwaIcon name="mic" size={17} /> Bicara
                  </button>
                </div>
                {!assistantEnabled && (
                  <p className="hint">
                    Ketuk Aktifkan agar sapaan suara &quot;Hey Tiara&quot; siaga
                    dan proteksi anti-echo speaker aktif otomatis.
                  </p>
                )}
              </section>

              {/* Jadwal & Notulen Hari Ini */}
              <div className="sec">
                <h3 className="d">Jadwal hari ini</h3>
                <button type="button" onClick={() => switchTab("agenda")}>
                  Semua
                </button>
              </div>
              <div
                className="row"
                style={{ marginBottom: 14, flexWrap: "wrap" }}
              >
                <span className="chip c-ok">
                  <PwaIcon name="ck" size={14} />
                  {doneTodayCount} agenda selesai
                </span>
                <span className="chip c-mu">
                  {upcomingToday.length} akan datang
                </span>
                {todayNotulens.length > 0 && (
                  <span className="chip c-nt">
                    ◆ {todayNotulens.length} notulen
                  </span>
                )}
              </div>

              <div>
                {(upcomingToday.length > 0 ? upcomingToday : todayAgendas).map(
                  (a) => renderTimelineItem(a, nextAgenda?.id)
                )}
                {todayNotulens.map((n) => renderNotulenTimelineItem(n))}
              </div>

              {/* Tugas Mendesak */}
              <div className="sec">
                <h3 className="d">Tugas mendesak</h3>
                <button type="button" onClick={() => switchTab("tugas")}>
                  Semua
                </button>
              </div>
              <div className="card">
                {urgentTasks.length > 0 ? (
                  urgentTasks.map((t) => (
                    <label
                      key={t.id}
                      className={`tk ${t.selesai ? "dn" : ""}`}
                    >
                      <input
                        className="ck"
                        type="checkbox"
                        checked={t.selesai}
                        onChange={() => toggleTugas(t.id)}
                      />
                      <div>
                        <b>{t.judul}</b>
                        <small>{t.pj}</small>
                      </div>
                      <span
                        className={`chip ${
                          t.segera && !t.selesai ? "c-lm" : "c-mu"
                        }`}
                      >
                        {t.tenggat}
                      </span>
                    </label>
                  ))
                ) : (
                  <p className="hint">
                    Semua tugas mendesak telah diselesaikan.
                  </p>
                )}
              </div>

              {/* Pengiriman WhatsApp (Wangsaf) */}
              <div className="sec">
                <h3 className="d">Pengiriman WhatsApp</h3>
                <button
                  type="button"
                  onClick={() => setSheet({ kind: "settings" })}
                >
                  Atur
                </button>
              </div>
              <div className="card">
                {waLogs.slice(0, 5).map((l) => (
                  <div key={l.id} className="lg">
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <b>{l.waktu}</b>
                      {l.labelDashboard || l.tujuan}
                    </span>
                    {l.status === "Gagal" ? (
                      <button
                        type="button"
                        className="chip c-fl"
                        onClick={() => retryWaLog(l.id)}
                      >
                        Gagal, kirim ulang
                      </button>
                    ) : (
                      <span
                        className={`chip ${
                          l.status === "Terkirim" ? "c-ok" : "c-mu"
                        }`}
                      >
                        {l.status}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ==================== TAB 2: AGENDA & KALENDER ==================== */}
          {tab === "agenda" && (
            <>
              <div className="top">
                <div>
                  <small>{weekRangeLabel}</small>
                  <h1 className="d">Agenda</h1>
                </div>
                <div className="row" style={{ gap: 6 }}>
                  <button
                    type="button"
                    className="btn g sm"
                    onClick={() =>
                      setSheet({
                        kind: "create-notulen",
                        prefill: {
                          judul: "",
                          tanggalIso: selectedDateIso,
                          jam: "09.00 – 10.30",
                          lokasi: "Ruang Rapat Utama",
                          peserta: 6,
                        },
                      })
                    }
                  >
                    + Notulen
                  </button>
                  <button
                    type="button"
                    className="btn t sm"
                    onClick={() =>
                      setSheet({
                        kind: "agenda-form",
                        defaultDate: selectedDateIso,
                      })
                    }
                  >
                    <PwaIcon name="plus" size={15} />
                    Tambah
                  </button>
                </div>
              </div>

              <div className="seg">
                <button
                  type="button"
                  className={agendaView === "hari" ? "on" : ""}
                  onClick={() => setAgendaView("hari")}
                >
                  Harian
                </button>
                <button
                  type="button"
                  className={agendaView === "minggu" ? "on" : ""}
                  onClick={() => setAgendaView("minggu")}
                >
                  Mingguan
                </button>
                <button
                  type="button"
                  className={agendaView === "kalender" ? "on" : ""}
                  onClick={() => {
                    setCalendarMonthCursor(selectedDateIso.slice(0, 7));
                    setAgendaView("kalender");
                  }}
                >
                  Kalender
                </button>
              </div>

              {/* Navigasi Pekan (untuk Harian & Mingguan) */}
              {agendaView !== "kalender" && (
                <div
                  className="row"
                  style={{
                    justifyContent: "space-between",
                    marginTop: 12,
                  }}
                >
                  <button
                    type="button"
                    className="btn g xs"
                    onClick={() =>
                      setSelectedDateIso(addDaysIso(selectedDateIso, -7))
                    }
                  >
                    <PwaIcon name="chevL" size={14} /> Pekan lalu
                  </button>
                  {selectedDateIso !== TODAY_ISO && (
                    <button
                      type="button"
                      className="chip"
                      onClick={() => setSelectedDateIso(TODAY_ISO)}
                    >
                      Hari ini (4 Nov)
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn g xs"
                    onClick={() =>
                      setSelectedDateIso(addDaysIso(selectedDateIso, 7))
                    }
                  >
                    Pekan depan <PwaIcon name="chevR" size={14} />
                  </button>
                </div>
              )}

              {/* Strip Hari (Harian) */}
              {agendaView === "hari" && (
                <>
                  <div className="days">
                    {weekDaysIso.map((iso) => {
                      const d = parseIsoLocal(iso);
                      const dayAgs = agendas.filter((a) => a.tanggal === iso);
                      const dayNts = notulenList.filter(
                        (n) => n.tanggalIso === iso
                      );
                      const isSel = iso === selectedDateIso;
                      return (
                        <button
                          key={iso}
                          type="button"
                          className={isSel ? "on" : ""}
                          onClick={() => setSelectedDateIso(iso)}
                        >
                          <span>{DAY_NAMES_SHORT[d.getDay()]}</span>
                          <b className="d">{d.getDate()}</b>
                          <em>
                            {dayAgs.slice(0, 3).map((a) => (
                              <i key={a.id} />
                            ))}
                            {dayNts.slice(0, 2).map((n) => (
                              <i key={`n-${n.id}`} className="nt-d" />
                            ))}
                          </em>
                        </button>
                      );
                    })}
                  </div>

                  <div
                    className="row"
                    style={{
                      marginBottom: 14,
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                    }}
                  >
                    <b className="d" style={{ fontSize: 20 }}>
                      {formatDayDateShort(selectedDateIso)}
                    </b>
                    <div className="row" style={{ gap: 6 }}>
                      {selectedDayConflictCount > 0 && (
                        <span className="chip c-fl">
                          {selectedDayConflictCount} bentrok
                        </span>
                      )}
                      {selectedDayNotulens.length > 0 && (
                        <span className="chip c-nt">
                          ◆ {selectedDayNotulens.length} notulen
                        </span>
                      )}
                    </div>
                  </div>

                  {selectedDayAgendas.length > 0 ||
                  selectedDayNotulens.length > 0 ? (
                    <div>
                      {selectedDayAgendas.map((a) =>
                        renderTimelineItem(
                          a,
                          selectedDateIso === TODAY_ISO
                            ? nextAgenda?.id
                            : undefined
                        )
                      )}
                      {selectedDayNotulens.map((n) =>
                        renderNotulenTimelineItem(n)
                      )}
                    </div>
                  ) : (
                    <div className="card">
                      <b>Belum ada agenda atau notulen di tanggal ini.</b>
                      <p className="hint" style={{ marginTop: 4 }}>
                        Ketuk Tambah, atau tekan tombol mikrofon di bawah dan
                        ucapkan jadwal baru kepada Tiara.
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Tampilan Mingguan */}
              {agendaView === "minggu" && (
                <div style={{ marginTop: 14 }}>
                  {weekDaysIso.map((iso) => {
                    const dayAgs = agendas.filter((a) => a.tanggal === iso);
                    const dayNts = notulenList.filter(
                      (n) => n.tanggalIso === iso
                    );
                    const countKind = (k: JenisAgenda) =>
                      dayAgs.filter((a) => a.jenis === k).length;
                    return (
                      <button
                        key={iso}
                        type="button"
                        className="card"
                        style={{
                          display: "block",
                          width: "100%",
                          textAlign: "left",
                          marginBottom: 10,
                        }}
                        onClick={() => {
                          setSelectedDateIso(iso);
                          setAgendaView("hari");
                        }}
                      >
                        <div
                          className="row"
                          style={{ justifyContent: "space-between" }}
                        >
                          <b className="d" style={{ fontSize: 17 }}>
                            {formatDayDateShort(iso)}
                          </b>
                          <div className="row" style={{ gap: 5 }}>
                            <span
                              className={`chip ${
                                iso === TODAY_ISO ? "" : "c-mu"
                              }`}
                            >
                              {dayAgs.length} agenda
                            </span>
                            {dayNts.length > 0 && (
                              <span className="chip c-nt">
                                ◆ {dayNts.length}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="pg">
                          <i
                            style={{
                              flex: countKind("rapat") || 0.001,
                              background: "var(--tide)",
                            }}
                          />
                          <i
                            style={{
                              flex: countKind("kunjungan") || 0.001,
                              background: "#A6F23A",
                            }}
                          />
                          <i
                            className="h"
                            style={{ flex: countKind("lainnya") || 0.001 }}
                          />
                        </div>
                        <p className="hint">
                          {dayAgs.length > 0
                            ? dayAgs
                                .slice(0, 2)
                                .map((a) => `${a.mulai} ${a.judul}`)
                                .join(", ") +
                              (dayAgs.length > 2
                                ? `, dan ${dayAgs.length - 2} lainnya`
                                : "")
                            : dayNts.length > 0
                            ? `Arsip Notulen: ${dayNts[0].judul}`
                            : "Belum ada kegiatan terjadwal"}
                        </p>
                      </button>
                    );
                  })}
                  <div className="meta" style={{ marginTop: 8 }}>
                    <span>
                      <i className="dot" style={{ margin: 0 }} />
                      Rapat
                    </span>
                    <span>
                      <i className="dot k-kunjungan" style={{ margin: 0 }} />
                      Kunjungan
                    </span>
                    <span>
                      <i className="dot k-lainnya" style={{ margin: 0 }} />
                      Lainnya
                    </span>
                    <span>
                      <i className="dot-notulen" style={{ margin: 0 }} />
                      Notulen
                    </span>
                  </div>
                </div>
              )}

              {/* Tampilan Kalender Bulanan Terpadu */}
              {agendaView === "kalender" && (
                <>
                  <div className="mpwa-mcal">
                    <div
                      className="row"
                      style={{
                        justifyContent: "space-between",
                        marginBottom: 10,
                      }}
                    >
                      <button
                        type="button"
                        className="ib"
                        style={{ width: 34, height: 34 }}
                        onClick={() => {
                          const [y, m] = calendarMonthCursor
                            .split("-")
                            .map(Number);
                          const d = new Date(y, m - 2, 1);
                          setCalendarMonthCursor(
                            `${d.getFullYear()}-${String(
                              d.getMonth() + 1
                            ).padStart(2, "0")}`
                          );
                        }}
                      >
                        <PwaIcon name="chevL" size={16} />
                      </button>
                      <b className="d" style={{ fontSize: 16 }}>
                        {(() => {
                          const [y, m] = calendarMonthCursor
                            .split("-")
                            .map(Number);
                          return `${MONTH_NAMES_FULL[(m || 1) - 1]} ${y}`;
                        })()}
                      </b>
                      <button
                        type="button"
                        className="ib"
                        style={{ width: 34, height: 34 }}
                        onClick={() => {
                          const [y, m] = calendarMonthCursor
                            .split("-")
                            .map(Number);
                          const d = new Date(y, m, 1);
                          setCalendarMonthCursor(
                            `${d.getFullYear()}-${String(
                              d.getMonth() + 1
                            ).padStart(2, "0")}`
                          );
                        }}
                      >
                        <PwaIcon name="chevR" size={16} />
                      </button>
                    </div>

                    <div className="mpwa-mcal-grid">
                      {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map(
                        (w) => (
                          <div key={w} className="mpwa-mcal-dow">
                            {w}
                          </div>
                        )
                      )}
                      {monthCalendarCells.map((cell) => {
                        const isSel = cell.iso === selectedDateIso;
                        const isToday = cell.iso === TODAY_ISO;
                        return (
                          <button
                            key={cell.iso}
                            type="button"
                            className={`mpwa-mcal-cell ${
                              !cell.inMonth ? "out" : ""
                            } ${isToday ? "today" : ""} ${isSel ? "sel" : ""}`}
                            onClick={() => setSelectedDateIso(cell.iso)}
                          >
                            <span>{cell.dayNum}</span>
                            <span
                              style={{
                                display: "flex",
                                gap: 3,
                                height: 5,
                                alignItems: "center",
                              }}
                            >
                              {cell.agendaCount > 0 && (
                                <i
                                  style={{
                                    width: 5,
                                    height: 5,
                                    borderRadius: "50%",
                                    background: isSel
                                      ? "#A6F23A"
                                      : "var(--tide)",
                                  }}
                                />
                              )}
                              {cell.notulenCount > 0 && (
                                <i
                                  style={{
                                    width: 5,
                                    height: 5,
                                    borderRadius: 1,
                                    transform: "rotate(45deg)",
                                    background: isSel
                                      ? "#C4B5FD"
                                      : "var(--notulen)",
                                  }}
                                />
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div
                    className="row"
                    style={{
                      justifyContent: "space-between",
                      marginBottom: 12,
                    }}
                  >
                    <b className="d" style={{ fontSize: 18 }}>
                      {formatDayDateShort(selectedDateIso)}
                    </b>
                    <span className="hint">
                      ● {selectedDayAgendas.length} jadwal · ◆{" "}
                      {selectedDayNotulens.length} notulen
                    </span>
                  </div>

                  {selectedDayAgendas.length > 0 ||
                  selectedDayNotulens.length > 0 ? (
                    <div>
                      {selectedDayAgendas.map((a) => renderTimelineItem(a))}
                      {selectedDayNotulens.map((n) =>
                        renderNotulenTimelineItem(n)
                      )}
                    </div>
                  ) : (
                    <div className="card">
                      <p className="hint">
                        Tidak ada jadwal agenda maupun arsip notulen pada
                        tanggal ini.
                      </p>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* ==================== TAB 3: NOTULEN ==================== */}
          {tab === "notulen" && (
            <>
              <div className="top">
                <div>
                  <small>Hasil rapat & dokumentasi</small>
                  <h1 className="d">Notulen</h1>
                </div>
                <div className="row" style={{ gap: 6 }}>
                  <button
                    type="button"
                    className="btn g sm"
                    onClick={() => setSheet({ kind: "upload-audio" })}
                  >
                    <PwaIcon name="up" size={15} />
                    Audio
                  </button>
                  <button
                    type="button"
                    className="btn t sm"
                    onClick={() => setSheet({ kind: "create-notulen" })}
                  >
                    <PwaIcon name="plus" size={15} />
                    Buat
                  </button>
                </div>
              </div>

              <section className="card">
                <div className="st">
                  <div>
                    <b className="d">{notulenStats.total}</b>
                    <small>Total</small>
                  </div>
                  <div>
                    <b className="d">{notulenStats.thisMonth}</b>
                    <small>Bulan ini</small>
                  </div>
                  <div>
                    <b className="d">{notulenStats.totalTasks}</b>
                    <small>Tugas</small>
                  </div>
                  <div>
                    <b className="d">{notulenStats.totalHours}</b>
                    <small>Jam rekam</small>
                  </div>
                </div>
                <div className="pg">
                  <i
                    style={{
                      flex: notulenStats.selesai || 0.1,
                      background: "var(--ok)",
                    }}
                  />
                  <i
                    style={{
                      flex: notulenStats.diperiksa || 0.05,
                      background: "var(--tide)",
                    }}
                  />
                  <i
                    className="h"
                    style={{ flex: notulenStats.diproses || 0.05 }}
                  />
                </div>
                <div className="meta">
                  <span>{notulenStats.selesai} selesai</span>
                  <span>{notulenStats.diperiksa} diperiksa</span>
                  <span>{notulenStats.diproses} diproses</span>
                </div>
              </section>

              <div style={{ marginTop: 16 }}>
                <input
                  type="search"
                  placeholder="Cari judul rapat, keputusan, atau tanggal..."
                  value={notulenQuery}
                  onChange={(e) => setNotulenQuery(e.target.value)}
                />
              </div>

              <div className="fl">
                {(
                  [
                    ["semua", "Semua"],
                    ["selesai", "Selesai"],
                    ["diperiksa", "Diperiksa"],
                    ["diproses", "Diproses"],
                  ] as const
                ).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    className={notulenFilter === val ? "on" : ""}
                    onClick={() => setNotulenFilter(val)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="card" style={{ marginTop: 10, padding: "4px 16px" }}>
                {filteredNotulens.length > 0 ? (
                  filteredNotulens.map((n) => {
                    const sm = statusMeta(n.status);
                    return (
                      <button
                        key={n.id}
                        type="button"
                        className="nt"
                        onClick={() =>
                          setSheet({ kind: "notulen-detail", notulenId: n.id })
                        }
                      >
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <b>{n.judul}</b>
                          <small>
                            {n.tanggal} · {n.infoSingkat}
                            {n.dokumentasiFoto && n.dokumentasiFoto.length > 0
                              ? ` · ${n.dokumentasiFoto.length} foto`
                              : ""}
                          </small>
                        </span>
                        <span className={`chip ${sm.cls}`}>{sm.label}</span>
                      </button>
                    );
                  })
                ) : (
                  <p className="hint" style={{ padding: "16px 0" }}>
                    Tidak ada notulen yang cocok. Ubah kata kunci atau filter.
                  </p>
                )}
              </div>
            </>
          )}

          {/* ==================== TAB 4: TUGAS ==================== */}
          {tab === "tugas" && (
            <>
              <div className="top">
                <div>
                  <small>Dari keputusan rapat</small>
                  <h1 className="d">Tugas</h1>
                </div>
                <button
                  type="button"
                  className="btn t sm"
                  onClick={() => setSheet({ kind: "tugas-form" })}
                >
                  <PwaIcon name="plus" size={15} />
                  Tambah
                </button>
              </div>

              <section className="card">
                <div
                  className="row"
                  style={{ alignItems: "flex-end", gap: 14 }}
                >
                  <b
                    className="d"
                    style={{ fontSize: 54, lineHeight: 0.9, fontWeight: 600 }}
                  >
                    {openTasks.length}
                  </b>
                  <p style={{ paddingBottom: 4 }}>
                    tugas terbuka,
                    <br />
                    <span style={{ color: "var(--flare)", fontWeight: 700 }}>
                      {urgentTasks.length} jatuh tempo segera
                    </span>
                  </p>
                </div>
              </section>

              <div className="seg" style={{ margin: "16px 0" }}>
                <button
                  type="button"
                  className={tugasFilter === "buka" ? "on" : ""}
                  onClick={() => setTugasFilter("buka")}
                >
                  Terbuka ({openTasks.length})
                </button>
                <button
                  type="button"
                  className={tugasFilter === "tutup" ? "on" : ""}
                  onClick={() => setTugasFilter("tutup")}
                >
                  Selesai ({doneTasks.length})
                </button>
              </div>

              <div className="card">
                {displayedTasks.length > 0 ? (
                  displayedTasks.map((t) => (
                    <div
                      key={t.id}
                      className={`tk ${t.selesai ? "dn" : ""}`}
                    >
                      <input
                        className="ck"
                        type="checkbox"
                        checked={t.selesai}
                        onChange={() => toggleTugas(t.id)}
                      />
                      <div onClick={() => toggleTugas(t.id)}>
                        <b>{t.judul}</b>
                        <small>{t.pj}</small>
                      </div>
                      <span
                        className={`chip ${
                          t.segera && !t.selesai ? "c-lm" : "c-mu"
                        }`}
                      >
                        {t.tenggat}
                      </span>
                      <button
                        type="button"
                        aria-label="Hapus tugas"
                        style={{ color: "var(--mut)", padding: 4 }}
                        onClick={() => deleteTugas(t.id)}
                      >
                        <PwaIcon name="x" size={15} />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="hint">
                    {tugasFilter === "buka"
                      ? "Seluruh tugas tindak lanjut sudah selesai."
                      : "Belum ada tugas selesai. Centang tugas untuk memindahkannya ke sini."}
                  </p>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Floating Glass Bottom Dock (.dock) */}
      <nav className="dock" aria-label="Navigasi utama">
        <button
          type="button"
          className={tab === "home" ? "on" : ""}
          onClick={() => switchTab("home")}
        >
          <PwaIcon name="home" />
          Beranda
        </button>
        <button
          type="button"
          className={tab === "agenda" ? "on" : ""}
          onClick={() => switchTab("agenda")}
        >
          <PwaIcon name="cal" />
          Agenda
        </button>
        <button
          type="button"
          className={`mic ${isSpeaking || isListening || awaitingCommand ? "live" : ""}`}
          aria-label="Perintah suara Tiara"
          onClick={() => {
            setSheet({ kind: "voice" });
            if (!assistantEnabled && !isListening && !isSpeaking) {
              activateAndGreetTiara();
            }
          }}
        >
          <PwaIcon name="mic" />
        </button>
        <button
          type="button"
          className={tab === "notulen" ? "on" : ""}
          onClick={() => switchTab("notulen")}
        >
          <PwaIcon name="doc" />
          Notulen
        </button>
        <button
          type="button"
          className={tab === "tugas" ? "on" : ""}
          onClick={() => switchTab("tugas")}
        >
          <PwaIcon name="tg" />
          Tugas
        </button>
      </nav>

      {/* ==================== BOTTOM-SHEET DRAWERS ==================== */}
      {sheet.kind !== "none" && (
        <div className="mpwa-sheet">
          <div
            className="scrim"
            onClick={() => {
              if (sheet.kind === "voice" && candidateNotulens.length > 1) {
                dismissCandidateNotulens();
              }
              setSheet({ kind: "none" });
            }}
          />
          <div className="pan">
            <div className="grab" />

            {sheet.kind === "voice" && (
              <MobileVoiceSheet
                agendas={agendas}
                assistantEnabled={assistantEnabled}
                isListening={isListening}
                isSpeaking={isSpeaking}
                isSpeechPaused={isSpeechPaused}
                liveTranscript={liveTranscript}
                lastAssistantReply={lastAssistantReply}
                conversationHistory={conversationHistory}
                voiceDraft={voiceDraft}
                candidateNotulens={candidateNotulens}
                candidateQueryLabel={candidateQueryLabel}
                candidateMatchReasons={candidateMatchReasons}
                onClose={() => {
                  if (candidateNotulens.length > 1) dismissCandidateNotulens();
                  setSheet({ kind: "none" });
                }}
                onToggleMic={() => {
                  const isMicActive = isListening || isSpeaking || assistantEnabled;
                  if (isMicActive) {
                    turnOffAssistantMic();
                  } else {
                    activateAndGreetTiara();
                  }
                }}
                onSendText={(txt) => sendCommandToTiara(txt)}
                onSelectCandidate={(id) => {
                  selectDisambiguatedNotulen(id, true);
                  setSheet({ kind: "notulen-detail", notulenId: id });
                }}
                onConfirmDraft={() => {
                  if (!voiceDraft) return;
                  addAgenda({
                    judul: voiceDraft.judul,
                    tanggal: voiceDraft.tanggal,
                    mulai: voiceDraft.mulai,
                    selesai: voiceDraft.selesai,
                    lokasi: voiceDraft.lokasi || "Ruang Rapat Utama",
                    jenis: voiceDraft.jenis,
                    peserta: voiceDraft.peserta || 4,
                    catatan: voiceDraft.catatan,
                    sumber: "suara",
                    berulang: "tidak",
                    selesaiAcara: false,
                  });
                  setSelectedDateIso(voiceDraft.tanggal);
                  setVoiceDraft(null);
                  setSheet({ kind: "none" });
                  switchTab("agenda");
                }}
                onDiscardDraft={() => setVoiceDraft(null)}
                onPauseResume={pauseOrResumeSpeech}
                onStopSpeech={stopTiaraSpeakingOnly}
              />
            )}

            {sheet.kind === "agenda-form" && (
              <MobileAgendaFormSheet
                agendas={agendas}
                existing={sheet.agenda ?? null}
                defaultDate={sheet.defaultDate || selectedDateIso}
                onClose={() => setSheet({ kind: "none" })}
                onSave={(payload, existingId) => {
                  if (existingId) {
                    updateAgenda(existingId, payload);
                  } else {
                    addAgenda(payload);
                  }
                  setSelectedDateIso(payload.tanggal);
                  setSheet({ kind: "none" });
                }}
                onDelete={(id) => {
                  deleteAgenda(id);
                  setSheet({ kind: "none" });
                }}
                onToggleDone={(id) => {
                  toggleAgendaDone(id);
                  setSheet({ kind: "none" });
                }}
                onCreateNotulenFromAgenda={(ag) => {
                  setSheet({
                    kind: "create-notulen",
                    prefill: {
                      judul: ag.judul,
                      tanggalIso: ag.tanggal,
                      jam: `${ag.mulai} – ${ag.selesai}`,
                      lokasi: ag.lokasi,
                      peserta: ag.peserta,
                      catatanAwal: ag.catatan,
                    },
                  });
                }}
              />
            )}

            {sheet.kind === "notulen-detail" && (
              <MobileNotulenDetailSheet
                notulen={
                  notulenList.find((n) => n.id === sheet.notulenId) ??
                  notulenList[0]
                }
                tugasList={tugasList}
                isSpeaking={isSpeaking}
                isSpeechPaused={isSpeechPaused}
                onClose={() => setSheet({ kind: "none" })}
                onReadAloud={(id) => readNotulenAloud(id, "lengkap")}
                onPauseResume={pauseOrResumeSpeech}
                onStopSpeech={stopTiaraSpeakingOnly}
                onToggleTugas={toggleTugas}
                onUpdateNotulen={updateNotulen}
                onAddPhotos={addPhotosToNotulen}
                onRemovePhoto={removePhotoFromNotulen}
                onApproveLock={approveAndLockNotulen}
                onDeleteAudio={deleteNotulenAudio}
                onSendWa={sendNotulenSummaryToWa}
              />
            )}

            {sheet.kind === "upload-audio" && (
              <MobileUploadAudioSheet
                onClose={() => setSheet({ kind: "none" })}
                onUpload={(payload) => {
                  uploadAudioNotulen(payload);
                  setSheet({ kind: "none" });
                  switchTab("notulen");
                }}
              />
            )}

            {sheet.kind === "create-notulen" && (
              <MobileCreateNotulenSheet
                prefill={sheet.prefill ?? null}
                onClose={() => setSheet({ kind: "none" })}
                onCreate={(payload) => {
                  const created = createManualNotulen(payload);
                  setSheet({ kind: "notulen-detail", notulenId: created.id });
                }}
              />
            )}

            {sheet.kind === "tugas-form" && (
              <MobileTugasFormSheet
                onClose={() => setSheet({ kind: "none" })}
                onAdd={(payload) => {
                  addTugas(payload);
                  setSheet({ kind: "none" });
                }}
              />
            )}

            {sheet.kind === "settings" && (
              <MobileSettingsSheet
                settings={settings}
                waLogs={waLogs}
                recipients={recipients}
                serverSyncedAt={serverSyncedAt}
                canInstallPwa={canInstallPwa}
                onClose={() => {
                  setSheet({ kind: "none" });
                  if (pathname.startsWith("/pengaturan")) {
                    navigate({ to: "/" });
                  }
                }}
                onUpdateSettings={updateSettings}
                onSaveNow={saveSettingsNow}
                onToggleDark={toggleDarkMode}
                onSetRole={setActiveRole}
                onTestAi={testAiConnection}
                onTestVoice={() =>
                  speakCustom(
                    `Halo ${settings.namaDirut}, suara Asisten Tiara siap membacakan agenda dan notulen rapat Bapak.`
                  )
                }
                onCheckWa={checkWaDeviceStatus}
                onSendTestBriefing={sendTestWaBriefing}
                onSendDirectWa={sendDirectTestWhatsapp}
                onToggleRecipient={toggleRecipient}
                onRetryWa={retryWaLog}
                onInstallPwa={handleInstallPwa}
                onResetDemo={resetDemoData}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   SUB-SHEET 1: PERINTAH SUARA & PERCAKAPAN MULTI-TURN TIARA
   ========================================================================== */
function MobileVoiceSheet({
  agendas,
  assistantEnabled,
  isListening,
  isSpeaking,
  isSpeechPaused,
  liveTranscript,
  lastAssistantReply,
  conversationHistory,
  voiceDraft,
  candidateNotulens,
  candidateQueryLabel,
  candidateMatchReasons,
  onClose,
  onToggleMic,
  onSendText,
  onSelectCandidate,
  onConfirmDraft,
  onDiscardDraft,
  onPauseResume,
  onStopSpeech,
}: {
  agendas: AgendaItem[];
  assistantEnabled: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  isSpeechPaused: boolean;
  liveTranscript: string;
  lastAssistantReply: string;
  conversationHistory: Array<{
    id: number;
    role: "user" | "assistant";
    text: string;
    waktu: string;
  }>;
  voiceDraft: NonNullable<ReturnType<typeof usePdamStore>["voiceDraft"]> | null;
  candidateNotulens: NotulenItem[];
  candidateQueryLabel: string;
  candidateMatchReasons: Record<number, string>;
  onClose: () => void;
  onToggleMic: () => void;
  onSendText: (txt: string) => void;
  onSelectCandidate: (id: number) => void;
  onConfirmDraft: () => void;
  onDiscardDraft: () => void;
  onPauseResume: () => void;
  onStopSpeech: () => void;
}) {
  const [textCmd, setTextCmd] = useState("");

  const draftConflict = useMemo(() => {
    if (!voiceDraft) return undefined;
    return findAgendaConflicts(
      agendas,
      voiceDraft.tanggal,
      voiceDraft.mulai,
      voiceDraft.selesai
    )[0];
  }, [agendas, voiceDraft]);

  return (
    <div>
      <div className="ph">
        <div>
          <h3 className="d">Asisten Suara Tiara</h3>
          <p className="hint">
            Percakapan bersambung · Anti-echo speaker aktif
          </p>
        </div>
        <button
          type="button"
          className="ib"
          aria-label="Tutup"
          onClick={onClose}
        >
          <PwaIcon name="x" />
        </button>
      </div>

      {/* Mode 1: Konfirmasi Draf Agenda dari Suara */}
      {voiceDraft ? (
        <div>
          <div className="card">
            <p className="hint">Hasil dikenali dari perintah suara</p>
            <p className="q d" style={{ minHeight: 0, margin: "4px 0 10px" }}>
              {voiceDraft.judul}
            </p>
            <div className="fx">
              <span>Tanggal</span>
              <b>{formatDayDateShort(voiceDraft.tanggal)}</b>
            </div>
            <div className="fx">
              <span>Jam</span>
              <b>
                {voiceDraft.mulai} sampai {voiceDraft.selesai}
              </b>
            </div>
            <div className="fx">
              <span>Peserta</span>
              <b>{voiceDraft.peserta} orang</b>
            </div>
            <div className="fx">
              <span>Lokasi</span>
              <b>{voiceDraft.lokasi || "Ruang Rapat Utama"}</b>
            </div>
          </div>
          {draftConflict && (
            <div className="warn">
              <PwaIcon name="warn" />
              <span>
                Bentrok dengan {draftConflict.judul} ({draftConflict.mulai}{" "}
                sampai {draftConflict.selesai}). Bapak tetap bisa menyimpan.
              </span>
            </div>
          )}
          <div className="row" style={{ marginTop: 10 }}>
            <button
              type="button"
              className="btn t"
              style={{ flex: 1 }}
              onClick={onConfirmDraft}
            >
              Konfirmasi dan simpan
            </button>
            <button type="button" className="btn g" onClick={onDiscardDraft}>
              Ulangi
            </button>
          </div>
        </div>
      ) : candidateNotulens.length > 1 ? (
        /* Mode 2: Disambiguasi Notulen Lebih dari 1 */
        <div>
          <div className="card" style={{ marginBottom: 12 }}>
            <span className="chip c-nt" style={{ marginBottom: 8 }}>
              ◆ {candidateNotulens.length} Notulen Terkait Ditemukan
            </span>
            <p style={{ fontWeight: 600, fontSize: 14 }}>
              Ditemukan beberapa notulen terkait &ldquo;
              {candidateQueryLabel || "permintaan Bapak"}&rdquo;. Pilih yang
              ingin dibuka & dibacakan:
            </p>
          </div>
          <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
            {candidateNotulens.map((n, idx) => (
              <button
                key={n.id}
                type="button"
                className="card"
                style={{
                  textAlign: "left",
                  padding: 14,
                  border: "1px solid var(--line)",
                }}
                onClick={() => onSelectCandidate(n.id)}
              >
                <div
                  className="row"
                  style={{ justifyContent: "space-between", marginBottom: 4 }}
                >
                  <span className="chip">Pilihan {idx + 1}</span>
                  <span className="hint">{n.tanggal}</span>
                </div>
                <b style={{ fontSize: 15, display: "block" }}>{n.judul}</b>
                <p className="hint" style={{ marginTop: 3 }}>
                  {candidateMatchReasons[n.id] || n.infoSingkat}
                </p>
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* Mode 3: Rekam & Multi-Turn Dialog */
        <>
          <div className="rec">
            <button
              type="button"
              className={`rbtn ${isListening || isSpeaking ? "live" : ""}`}
              aria-label={isListening || isSpeaking ? "Matikan mikrofon" : "Rekam suara"}
              onClick={onToggleMic}
            >
              <PwaIcon name={isSpeaking ? "stop" : "mic"} />
            </button>
            <p className="hint">
              {isSpeaking
                ? "Tiara sedang berbicara... Ketuk mic untuk langsung berhenti."
                : isListening || assistantEnabled
                ? "Mendengarkan... Ketuk mic untuk mematikan."
                : "Mikrofon mati. Ketuk mic untuk menyalakan Tiara."}
            </p>
            {(isListening || isSpeaking) && (
              <div className="wv sp lg">
                {Array.from({ length: 9 }, (_, i) => (
                  <i key={i} />
                ))}
              </div>
            )}
            {liveTranscript && <p className="q d">&ldquo;{liveTranscript}&rdquo;</p>}

            {isSpeaking && (
              <div className="row">
                <button
                  type="button"
                  className="btn g sm"
                  onClick={onPauseResume}
                >
                  <PwaIcon name={isSpeechPaused ? "play" : "pause"} size={15} />
                  {isSpeechPaused ? "Lanjutkan" : "Jeda baca"}
                </button>
                <button
                  type="button"
                  className="btn f sm"
                  onClick={onStopSpeech}
                >
                  <PwaIcon name="stop" size={15} /> Berhenti
                </button>
              </div>
            )}
          </div>

          {/* Riwayat Percakapan Bersambung */}
          {conversationHistory.length > 0 ? (
            <div
              className="card"
              style={{
                marginTop: 10,
                padding: 12,
                maxHeight: 190,
                overflowY: "auto",
                display: "grid",
                gap: 8,
              }}
            >
              {conversationHistory.slice(-5).map((turn) => (
                <div
                  key={turn.id}
                  style={{
                    justifySelf:
                      turn.role === "user" ? "end" : "start",
                    maxWidth: "88%",
                    padding: "8px 12px",
                    borderRadius: 14,
                    fontSize: 13,
                    background:
                      turn.role === "user" ? "var(--tide)" : "var(--pill)",
                    color: turn.role === "user" ? "#fff" : "var(--ink)",
                  }}
                >
                  {turn.text}
                </div>
              ))}
            </div>
          ) : (
            lastAssistantReply && (
              <div className="card" style={{ marginTop: 10, padding: 14 }}>
                <small className="hint">Jawaban Tiara</small>
                <p style={{ marginTop: 4, fontSize: 13.5 }}>
                  {lastAssistantReply}
                </p>
              </div>
            )
          )}

          {/* Saran Perintah Cepat */}
          <div className="fl" style={{ marginTop: 12 }}>
            {[
              "Jadwal saya hari ini",
              "Carikan notulen rapat bulan ini",
              "Tambah rapat dengan Kabag Teknik Jumat jam 9",
              "Apa tugas yang mendesak?",
            ].map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => onSendText(sample)}
              >
                {sample}
              </button>
            ))}
          </div>

          {/* Input Teks Manual ke Tiara */}
          <form
            className="row"
            style={{ marginTop: 10 }}
            onSubmit={(e) => {
              e.preventDefault();
              if (!textCmd.trim()) return;
              onSendText(textCmd.trim());
              setTextCmd("");
            }}
          >
            <input
              type="text"
              placeholder="Ketik perintah atau tanya notulen ke Tiara..."
              value={textCmd}
              onChange={(e) => setTextCmd(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn t" style={{ padding: "0 16px" }}>
              <PwaIcon name="send" size={16} />
            </button>
          </form>
        </>
      )}
    </div>
  );
}

/* ==========================================================================
   SUB-SHEET 2: TAMBAH / UBAH AGENDA
   ========================================================================== */
function MobileAgendaFormSheet({
  agendas,
  existing,
  defaultDate,
  onClose,
  onSave,
  onDelete,
  onToggleDone,
  onCreateNotulenFromAgenda,
}: {
  agendas: AgendaItem[];
  existing: AgendaItem | null;
  defaultDate: string;
  onClose: () => void;
  onSave: (payload: Omit<AgendaItem, "id">, existingId?: number) => void;
  onDelete: (id: number) => void;
  onToggleDone: (id: number) => void;
  onCreateNotulenFromAgenda: (agenda: AgendaItem) => void;
}) {
  const [judul, setJudul] = useState(existing?.judul ?? "");
  const [tanggal, setTanggal] = useState(existing?.tanggal ?? defaultDate);
  const [jenis, setJenis] = useState<JenisAgenda>(existing?.jenis ?? "rapat");
  const [mulai, setMulai] = useState(dotToColon(existing?.mulai ?? "09.00"));
  const [selesai, setSelesai] = useState(
    dotToColon(existing?.selesai ?? "10.00")
  );
  const [lokasi, setLokasi] = useState(existing?.lokasi ?? "");
  const [peserta, setPeserta] = useState(String(existing?.peserta ?? 5));
  const [berulang, setBerulang] = useState<RecurrenceType>(
    existing?.berulang ?? "tidak"
  );
  const [catatan, setCatatan] = useState(existing?.catatan ?? "");
  const [forceConfirmed, setForceConfirmed] = useState(false);

  const conflicts = useMemo(
    () =>
      findAgendaConflicts(
        agendas,
        tanggal,
        normalizeTimeDot(mulai),
        normalizeTimeDot(selesai),
        existing?.id
      ),
    [agendas, existing?.id, mulai, selesai, tanggal]
  );

  const handleSubmit = () => {
    if (!judul.trim()) {
      toast.error("Isi judul agenda terlebih dahulu.");
      return;
    }
    const mDot = normalizeTimeDot(mulai);
    const sDot = normalizeTimeDot(selesai);
    if (timeToMinutes(sDot) <= timeToMinutes(mDot)) {
      toast.error("Jam selesai harus setelah jam mulai.");
      return;
    }
    if (conflicts.length > 0 && !forceConfirmed) {
      setForceConfirmed(true);
      return;
    }
    onSave(
      {
        judul: judul.trim(),
        tanggal,
        mulai: mDot,
        selesai: sDot,
        lokasi: lokasi.trim() || "Ruang Rapat Utama",
        jenis,
        peserta: Math.max(1, Number(peserta) || 1),
        catatan: catatan.trim(),
        sumber: existing?.sumber ?? "manual",
        berulang,
        selesaiAcara: existing?.selesaiAcara ?? false,
      },
      existing?.id
    );
  };

  return (
    <div>
      <div className="ph">
        <h3 className="d">{existing ? "Ubah agenda" : "Agenda baru"}</h3>
        <button type="button" className="ib" onClick={onClose}>
          <PwaIcon name="x" />
        </button>
      </div>

      <div className="fld">
        <span>Judul</span>
        <input
          type="text"
          value={judul}
          onChange={(e) => setJudul(e.target.value)}
          placeholder="Contoh: Rapat Evaluasi Jaringan Pipa"
        />
      </div>

      <div className="g2">
        <div className="fld">
          <span>Tanggal</span>
          <input
            type="date"
            value={tanggal}
            onChange={(e) => {
              setTanggal(e.target.value);
              setForceConfirmed(false);
            }}
          />
        </div>
        <div className="fld">
          <span>Jenis</span>
          <select
            value={jenis}
            onChange={(e) => setJenis(e.target.value as JenisAgenda)}
          >
            <option value="rapat">Rapat</option>
            <option value="kunjungan">Kunjungan</option>
            <option value="lainnya">Kegiatan lainnya</option>
          </select>
        </div>
      </div>

      <div className="g2">
        <div className="fld">
          <span>Mulai</span>
          <input
            type="time"
            value={mulai}
            onChange={(e) => {
              setMulai(e.target.value);
              setForceConfirmed(false);
            }}
          />
        </div>
        <div className="fld">
          <span>Selesai</span>
          <input
            type="time"
            value={selesai}
            onChange={(e) => {
              setSelesai(e.target.value);
              setForceConfirmed(false);
            }}
          />
        </div>
      </div>

      <div className="fld">
        <span>Lokasi</span>
        <input
          type="text"
          value={lokasi}
          onChange={(e) => setLokasi(e.target.value)}
          placeholder="Ruang Rapat Utama / Lokasi IPA"
        />
      </div>

      <div className="g2">
        <div className="fld">
          <span>Jumlah peserta</span>
          <input
            type="number"
            min={1}
            value={peserta}
            onChange={(e) => setPeserta(e.target.value)}
          />
        </div>
        <div className="fld">
          <span>Pengulangan</span>
          <select
            value={berulang}
            onChange={(e) => setBerulang(e.target.value as RecurrenceType)}
          >
            <option value="tidak">Tidak berulang</option>
            <option value="mingguan">Mingguan</option>
            <option value="bulanan">Bulanan</option>
          </select>
        </div>
      </div>

      <div className="fld">
        <span>Catatan</span>
        <textarea
          rows={2}
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          placeholder="Catatan agenda opsional..."
        />
      </div>

      {conflicts.length > 0 && (
        <div className="warn">
          <PwaIcon name="warn" />
          <span>
            Bentrok dengan <b>{conflicts[0].judul}</b> ({conflicts[0].mulai} –{" "}
            {conflicts[0].selesai}).
          </span>
        </div>
      )}

      {existing && (
        <div className="row" style={{ marginBottom: 10 }}>
          <button
            type="button"
            className="btn g sm"
            style={{ flex: 1 }}
            onClick={() => onToggleDone(existing.id)}
          >
            <PwaIcon name="ck" size={15} />
            {existing.selesaiAcara ? "Tandai belum selesai" : "Tandai selesai"}
          </button>
          <button
            type="button"
            className="btn g sm"
            style={{ flex: 1 }}
            onClick={() => onCreateNotulenFromAgenda(existing)}
          >
            <PwaIcon name="doc" size={15} /> Buat Notulen
          </button>
        </div>
      )}

      <div className="row">
        <button
          type="button"
          className="btn t"
          style={{ flex: 1 }}
          onClick={handleSubmit}
        >
          {conflicts.length > 0 && forceConfirmed
            ? "Tetap simpan"
            : "Simpan agenda"}
        </button>
        {existing && (
          <button
            type="button"
            className="btn f"
            onClick={() => onDelete(existing.id)}
          >
            Hapus
          </button>
        )}
      </div>
    </div>
  );
}

/* ==========================================================================
   SUB-SHEET 3: DETAIL NOTULEN (RINGKASAN + KEPUTUSAN + FOTO + BACAKAN SUARA)
   ========================================================================== */
function MobileNotulenDetailSheet({
  notulen,
  tugasList,
  isSpeaking,
  isSpeechPaused,
  onClose,
  onReadAloud,
  onPauseResume,
  onStopSpeech,
  onToggleTugas,
  onUpdateNotulen,
  onAddPhotos,
  onRemovePhoto,
  onApproveLock,
  onDeleteAudio,
  onSendWa,
}: {
  notulen?: NotulenItem;
  tugasList: TugasItem[];
  isSpeaking: boolean;
  isSpeechPaused: boolean;
  onClose: () => void;
  onReadAloud: (id: number) => void;
  onPauseResume: () => void;
  onStopSpeech: () => void;
  onToggleTugas: (id: number) => void;
  onUpdateNotulen: (id: number, patch: Partial<NotulenItem>) => void;
  onAddPhotos: (id: number, photos: NotulenPhoto[]) => void;
  onRemovePhoto: (id: number, photoId: string) => void;
  onApproveLock: (id: number) => void;
  onDeleteAudio: (id: number) => void;
  onSendWa: (id: number) => void;
}) {
  const [subTab, setSubTab] = useState<NotulenDetailTab>("ring");
  const [editing, setEditing] = useState(false);
  const [draftRing, setDraftRing] = useState(notulen?.ringkasan ?? "");
  const [draftKep, setDraftKep] = useState(
    (notulen?.keputusan ?? []).join("\n")
  );
  const [draftTrk, setDraftTrk] = useState(notulen?.transkrip ?? "");
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  if (!notulen) return null;

  const sm = statusMeta(notulen.status);
  const relatedTasks = tugasList.filter((t) => t.notulenId === notulen.id);
  const isReady =
    notulen.status === "selesai" || notulen.status === "diperiksa";

  const handlePhotoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const added: NotulenPhoto[] = [];
    for (const file of Array.from(files)) {
      const photo = await compressImageFile(file);
      added.push(photo);
    }
    onAddPhotos(notulen.id, added);
  };

  return (
    <div>
      <div className="ph">
        <div style={{ flex: 1 }}>
          <h3 className="d" style={{ fontSize: 19 }}>
            {notulen.judul}
          </h3>
          <p className="hint" style={{ marginTop: 4 }}>
            {notulen.tanggal}
            {notulen.lokasi ? ` · ${notulen.lokasi}` : ""}{" "}
            <span className={`chip ${sm.cls}`} style={{ marginLeft: 4 }}>
              {sm.label}
            </span>
          </p>
        </div>
        <button type="button" className="ib" onClick={onClose}>
          <PwaIcon name="x" />
        </button>
      </div>

      {/* Tombol Bacakan Hasil Notulensi (Ringkasan + Poin Keputusan) */}
      {isReady && (
        <div className="row" style={{ marginBottom: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn lm sm"
            onClick={() => onReadAloud(notulen.id)}
          >
            <PwaIcon name="vol" size={15} />
            Bacakan Notulen & Keputusan
          </button>
          {isSpeaking && (
            <>
              <button
                type="button"
                className="btn g sm"
                onClick={onPauseResume}
              >
                {isSpeechPaused ? "Lanjut" : "Jeda"}
              </button>
              <button type="button" className="btn f sm" onClick={onStopSpeech}>
                Stop
              </button>
            </>
          )}
        </div>
      )}

      {!isReady ? (
        <div className="card">
          {["Diunggah", "Diproses", "Diperiksa", "Selesai"].map((s, idx) => (
            <div key={s} className="dec">
              <span
                className={`chip ${
                  idx < 1 ? "c-ok" : idx === 1 ? "" : "c-mu"
                }`}
              >
                {idx < 1 ? <PwaIcon name="ck" size={13} /> : idx + 1}
              </span>
              <div>
                <b>{s}</b>
                <p className="hint">
                  {idx === 1
                    ? "Transkrip & ringkasan AI sedang disusun otomatis di latar belakang."
                    : idx < 1
                    ? "Rekaman audio sudah diterima sistem."
                    : "Menunggu tahap pemeriksaan selesai."}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="tabs">
            <button
              type="button"
              className={subTab === "ring" ? "on" : ""}
              onClick={() => setSubTab("ring")}
            >
              Ringkasan
            </button>
            <button
              type="button"
              className={subTab === "tgs" ? "on" : ""}
              onClick={() => setSubTab("tgs")}
            >
              Tugas ({relatedTasks.length})
            </button>
            <button
              type="button"
              className={subTab === "trk" ? "on" : ""}
              onClick={() => setSubTab("trk")}
            >
              Transkrip
            </button>
          </div>

          {subTab === "ring" &&
            (editing ? (
              <div>
                <div className="fld">
                  <span>Ringkasan Eksekutif</span>
                  <textarea
                    rows={4}
                    value={draftRing}
                    onChange={(e) => setDraftRing(e.target.value)}
                  />
                </div>
                <div className="fld">
                  <span>Poin Keputusan (1 baris per poin)</span>
                  <textarea
                    rows={4}
                    value={draftKep}
                    onChange={(e) => setDraftKep(e.target.value)}
                  />
                </div>
                <div className="fld">
                  <span>Transkrip / Catatan</span>
                  <textarea
                    rows={3}
                    value={draftTrk}
                    onChange={(e) => setDraftTrk(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div>
                <p style={{ lineHeight: 1.6 }}>{notulen.ringkasan}</p>
                <p className="gh">Keputusan Rapat</p>
                {notulen.keputusan.map((kep, idx) => (
                  <div key={idx} className="dec">
                    <PwaIcon name="ck" size={17} />
                    <p>{kep}</p>
                  </div>
                ))}

                {/* Dokumentasi Foto */}
                <div
                  className="row"
                  style={{
                    justifyContent: "space-between",
                    marginTop: 16,
                    marginBottom: 8,
                  }}
                >
                  <b style={{ fontSize: 14 }}>Dokumentasi Foto</b>
                  <button
                    type="button"
                    className="btn g xs"
                    onClick={() => photoInputRef.current?.click()}
                  >
                    <PwaIcon name="cam" size={14} /> + Foto
                  </button>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={(e) => handlePhotoUpload(e.target.files)}
                  />
                </div>

                {notulen.dokumentasiFoto &&
                notulen.dokumentasiFoto.length > 0 ? (
                  <div className="g2">
                    {notulen.dokumentasiFoto.map((p) => (
                      <div
                        key={p.id}
                        className="card"
                        style={{ padding: 8, position: "relative" }}
                      >
                        <img
                          src={p.url}
                          alt={p.caption}
                          style={{
                            width: "100%",
                            height: 110,
                            objectFit: "cover",
                            borderRadius: 12,
                            display: "block",
                          }}
                        />
                        <small
                          className="hint"
                          style={{
                            display: "block",
                            marginTop: 4,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {p.caption}
                        </small>
                        <button
                          type="button"
                          aria-label="Hapus foto"
                          onClick={() => onRemovePhoto(notulen.id, p.id)}
                          style={{
                            position: "absolute",
                            top: 12,
                            right: 12,
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            background: "rgba(20,23,31,0.75)",
                            color: "#fff",
                            display: "grid",
                            placeItems: "center",
                          }}
                        >
                          <PwaIcon name="x" size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="hint">Belum ada foto dokumentasi rapat.</p>
                )}
              </div>
            ))}

          {subTab === "tgs" && (
            <div className="card" style={{ padding: "4px 14px" }}>
              {relatedTasks.length > 0 ? (
                relatedTasks.map((t) => (
                  <label key={t.id} className={`tk ${t.selesai ? "dn" : ""}`}>
                    <input
                      className="ck"
                      type="checkbox"
                      checked={t.selesai}
                      onChange={() => onToggleTugas(t.id)}
                    />
                    <div>
                      <b>{t.judul}</b>
                      <small>{t.pj}</small>
                    </div>
                    <span className={`chip ${t.segera ? "c-lm" : "c-mu"}`}>
                      {t.tenggat}
                    </span>
                  </label>
                ))
              ) : (
                <p className="hint" style={{ padding: "14px 0" }}>
                  Belum ada tugas tindak lanjut spesifik pada notulen ini.
                </p>
              )}
            </div>
          )}

          {subTab === "trk" && (
            <div className="card" style={{ padding: "6px 14px" }}>
              {parseTranscriptRows(notulen.transkrip).map((r, idx) => (
                <div key={idx} className="tr">
                  <time>{r.time}</time>
                  <p>
                    <b>{r.speaker}</b>
                    {r.text}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Ekspor & Kirim WA */}
          <div className="row" style={{ flexWrap: "wrap", marginTop: 16 }}>
            <button
              type="button"
              className="btn g sm"
              onClick={() => window.print()}
            >
              <PwaIcon name="dl" size={15} />
              PDF
            </button>
            <button
              type="button"
              className="btn g sm"
              onClick={() => {
                exportWordMobile(notulen, relatedTasks);
                toast.success("Dokumen Word (.doc) berhasil diunduh");
              }}
            >
              <PwaIcon name="dl" size={15} />
              Word
            </button>
            <button
              type="button"
              className="btn t sm"
              onClick={() => onSendWa(notulen.id)}
            >
              <PwaIcon name="send" size={15} />
              Kirim ke WA
            </button>
          </div>

          {/* Kontrol Edit, Kunci & Hapus Audio */}
          <div className="row" style={{ flexWrap: "wrap", marginTop: 10 }}>
            <button
              type="button"
              className="btn g sm"
              onClick={() => {
                if (editing) {
                  onUpdateNotulen(notulen.id, {
                    ringkasan: draftRing.trim(),
                    keputusan: draftKep
                      .split("\n")
                      .map((l) => l.trim())
                      .filter(Boolean),
                    transkrip: draftTrk.trim(),
                  });
                  setEditing(false);
                } else {
                  setDraftRing(notulen.ringkasan);
                  setDraftKep(notulen.keputusan.join("\n"));
                  setDraftTrk(notulen.transkrip);
                  setSubTab("ring");
                  setEditing(true);
                }
              }}
            >
              {editing ? "Simpan perubahan" : "Edit hasil"}
            </button>
            {notulen.status !== "selesai" && (
              <button
                type="button"
                className="btn sm"
                onClick={() => onApproveLock(notulen.id)}
              >
                Kunci dan bagikan
              </button>
            )}
            {notulen.audioFileName && !notulen.audioDihapus && (
              <button
                type="button"
                className="btn g sm"
                onClick={() => onDeleteAudio(notulen.id)}
              >
                Hapus audio asli
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ==========================================================================
   SUB-SHEET 4: UNGGAH AUDIO RAPAT
   ========================================================================== */
function MobileUploadAudioSheet({
  onClose,
  onUpload,
}: {
  onClose: () => void;
  onUpload: (payload: {
    judul: string;
    fileName: string;
    durasiMenit: number;
    file?: File;
  }) => void;
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [judul, setJudul] = useState("");
  const [durasiMenit, setDurasiMenit] = useState(45);

  return (
    <div>
      <div className="ph">
        <h3 className="d">Unggah audio rapat</h3>
        <button type="button" className="ib" onClick={onClose}>
          <PwaIcon name="x" />
        </button>
      </div>

      <label className="drop">
        <PwaIcon name="up" size={24} />
        <b style={{ color: "var(--ink)" }}>
          {fileName || "Pilih file rekaman audio"}
        </b>
        <span>
          {selectedFile
            ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB · File siap ditranskrip AI`
            : "Format mp3, m4a, wav, atau rekaman suara HP"}
        </span>
        <input
          type="file"
          accept=".mp3,.m4a,.wav,.ogg,.aac,audio/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) {
              setSelectedFile(f);
              setFileName(f.name);
              if (!judul) {
                const clean = f.name
                  .replace(/\.[^.]+$/, "")
                  .replace(/[-_]+/g, " ");
                setJudul(clean);
              }
              const approx = Math.max(15, Math.round(f.size / (1024 * 1024) * 1.5) || 45);
              setDurasiMenit(approx);
            }
          }}
        />
      </label>

      <div className="fld" style={{ marginTop: 14 }}>
        <span>Judul rapat</span>
        <input
          type="text"
          value={judul}
          onChange={(e) => setJudul(e.target.value)}
          placeholder="Contoh: Rapat Evaluasi Triwulan"
        />
      </div>

      <button
        type="button"
        className="btn t b"
        onClick={() => {
          if (!judul.trim() && !fileName) {
            toast.error("Pilih file audio atau isi judul rapat terlebih dahulu.");
            return;
          }
          onUpload({
            judul: judul.trim() || fileName,
            fileName: fileName || "rekaman-rapat.m4a",
            durasiMenit,
            file: selectedFile || undefined,
          });
        }}
      >
        Proses notulen AI
      </button>
      <p className="hint" style={{ marginTop: 10 }}>
        Hasil otomatis mencakup transkrip, ringkasan eksekutif, poin keputusan,
        dan daftar tugas tindak lanjut.
      </p>
    </div>
  );
}

/* ==========================================================================
   SUB-SHEET 5: BUAT NOTULEN MANUAL + UPLOAD DOKUMENTASI FOTO
   ========================================================================== */
function MobileCreateNotulenSheet({
  prefill,
  onClose,
  onCreate,
}: {
  prefill: NotulenFormPrefill | null;
  onClose: () => void;
  onCreate: (
    payload: Parameters<
      ReturnType<typeof usePdamStore>["createManualNotulen"]
    >[0]
  ) => void;
}) {
  const [judul, setJudul] = useState(prefill?.judul ?? "");
  const [tanggalIso, setTanggalIso] = useState(
    prefill?.tanggalIso ?? TODAY_ISO
  );
  const [jam, setJam] = useState(prefill?.jam ?? "09.00 – 10.30");
  const [lokasi, setLokasi] = useState(prefill?.lokasi ?? "Ruang Rapat Utama");
  const [pimpinan, setPimpinan] = useState("Direktur Utama");
  const [peserta, setPeserta] = useState(String(prefill?.peserta ?? 8));
  const [ringkasan, setRingkasan] = useState(prefill?.catatanAwal ?? "");
  const [keputusanRaw, setKeputusanRaw] = useState("");
  const [photos, setPhotos] = useState<NotulenPhoto[]>([]);

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const next: NotulenPhoto[] = [];
    for (const f of Array.from(files)) {
      const photo = await compressImageFile(f);
      next.push(photo);
    }
    setPhotos((prev) => [...prev, ...next]);
  };

  return (
    <div>
      <div className="ph">
        <h3 className="d">Input Notulen & Foto</h3>
        <button type="button" className="ib" onClick={onClose}>
          <PwaIcon name="x" />
        </button>
      </div>

      <div className="fld">
        <span>Judul rapat</span>
        <input
          type="text"
          value={judul}
          onChange={(e) => setJudul(e.target.value)}
          placeholder="Contoh: Rapat Koordinasi Distribusi Air"
        />
      </div>

      <div className="g2">
        <div className="fld">
          <span>Tanggal</span>
          <input
            type="date"
            value={tanggalIso}
            onChange={(e) => setTanggalIso(e.target.value)}
          />
        </div>
        <div className="fld">
          <span>Jam pelaksanaan</span>
          <input
            type="text"
            value={jam}
            onChange={(e) => setJam(e.target.value)}
          />
        </div>
      </div>

      <div className="g2">
        <div className="fld">
          <span>Lokasi</span>
          <input
            type="text"
            value={lokasi}
            onChange={(e) => setLokasi(e.target.value)}
          />
        </div>
        <div className="fld">
          <span>Peserta</span>
          <input
            type="number"
            min={1}
            value={peserta}
            onChange={(e) => setPeserta(e.target.value)}
          />
        </div>
      </div>

      <div className="fld">
        <span>Pimpinan rapat</span>
        <input
          type="text"
          value={pimpinan}
          onChange={(e) => setPimpinan(e.target.value)}
        />
      </div>

      <div className="fld">
        <span>Ringkasan eksekutif</span>
        <textarea
          rows={3}
          value={ringkasan}
          onChange={(e) => setRingkasan(e.target.value)}
          placeholder="Pokok pembahasan utama rapat..."
        />
      </div>

      <div className="fld">
        <span>Poin keputusan (1 baris per poin)</span>
        <textarea
          rows={3}
          value={keputusanRaw}
          onChange={(e) => setKeputusanRaw(e.target.value)}
          placeholder={"1. Prioritas perbaikan pipa transmisi\n2. Evaluasi mingguan"}
        />
      </div>

      <div className="fld">
        <span>Dokumentasi foto rapat ({photos.length} dipilih)</span>
        <label className="drop" style={{ padding: 16 }}>
          <PwaIcon name="cam" size={20} />
          <b style={{ color: "var(--ink)", fontSize: 13 }}>
            Tambah Foto Dokumentasi
          </b>
          <input
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>
        {photos.length > 0 && (
          <div className="g2" style={{ marginTop: 6 }}>
            {photos.map((p) => (
              <div key={p.id} style={{ position: "relative" }}>
                <img
                  src={p.url}
                  alt={p.caption}
                  style={{
                    width: "100%",
                    height: 84,
                    objectFit: "cover",
                    borderRadius: 10,
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        className="btn t b"
        onClick={() => {
          if (!judul.trim() || !ringkasan.trim()) {
            toast.error("Judul rapat dan ringkasan eksekutif wajib diisi.");
            return;
          }
          const kepList = keputusanRaw
            .split("\n")
            .map((s) => s.replace(/^\d+[.)]\s*/, "").trim())
            .filter(Boolean);
          onCreate({
            judul: judul.trim(),
            tanggalIso,
            jam,
            lokasi: lokasi.trim() || "Ruang Rapat Utama",
            pimpinan: pimpinan.trim() || "Direktur Utama",
            peserta: Math.max(1, Number(peserta) || 1),
            durasiMenit: 60,
            status: "selesai",
            ringkasan: ringkasan.trim(),
            keputusan:
              kepList.length > 0
                ? kepList
                : ["Menindaklanjuti hasil pembahasan rapat sesuai arahan Dirut."],
            transkrip: `[00.00] ${pimpinan}: Membuka rapat ${judul}.\n[00.15] Notulis: ${ringkasan}`,
            dokumentasiFoto: photos,
            tugasBaru: [],
          });
        }}
      >
        Simpan Notulen Rapat
      </button>
    </div>
  );
}

/* ==========================================================================
   SUB-SHEET 6: TAMBAH TUGAS TINDAK LANJUT
   ========================================================================== */
function MobileTugasFormSheet({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (payload: Omit<TugasItem, "id">) => void;
}) {
  const [judul, setJudul] = useState("");
  const [pj, setPj] = useState("Bagian Teknik");
  const [tenggat, setTenggat] = useState("Besok");
  const [segera, setSegera] = useState(true);

  return (
    <div>
      <div className="ph">
        <h3 className="d">Tugas baru</h3>
        <button type="button" className="ib" onClick={onClose}>
          <PwaIcon name="x" />
        </button>
      </div>

      <div className="fld">
        <span>Uraian tugas tindak lanjut</span>
        <input
          type="text"
          value={judul}
          onChange={(e) => setJudul(e.target.value)}
          placeholder="Contoh: Inspeksi tekanan pipa zona selatan"
        />
      </div>

      <div className="g2">
        <div className="fld">
          <span>Penanggung jawab (PIC)</span>
          <input
            type="text"
            value={pj}
            onChange={(e) => setPj(e.target.value)}
          />
        </div>
        <div className="fld">
          <span>Tenggat</span>
          <input
            type="text"
            value={tenggat}
            onChange={(e) => setTenggat(e.target.value)}
          />
        </div>
      </div>

      <label className="set" style={{ marginBottom: 12 }}>
        <span>
          <b>Prioritas mendesak</b>
          <small>Tampilkan di beranda tugas mendesak</small>
        </span>
        <input
          type="checkbox"
          className="sw"
          checked={segera}
          onChange={(e) => setSegera(e.target.checked)}
        />
      </label>

      <button
        type="button"
        className="btn t b"
        onClick={() => {
          if (!judul.trim()) {
            toast.error("Isi uraian tugas terlebih dahulu.");
            return;
          }
          onAdd({
            judul: judul.trim(),
            pj: pj.trim() || "Sekretariat",
            tenggat: tenggat.trim() || "Minggu ini",
            segera,
            selesai: false,
          });
        }}
      >
        Simpan tugas
      </button>
    </div>
  );
}

/* ==========================================================================
   SUB-SHEET 7: PENGATURAN LENGKAP (MULTI-DEVICE SYNC, AI, CARTESIA, WANGSAF, PWA)
   ========================================================================== */
function MobileSettingsSheet({
  settings,
  waLogs,
  recipients,
  serverSyncedAt,
  canInstallPwa,
  onClose,
  onUpdateSettings,
  onSaveNow,
  onToggleDark,
  onSetRole,
  onTestAi,
  onTestVoice,
  onCheckWa,
  onSendTestBriefing,
  onSendDirectWa,
  onToggleRecipient,
  onRetryWa,
  onInstallPwa,
  onResetDemo,
}: {
  settings: ReturnType<typeof usePdamStore>["settings"];
  waLogs: ReturnType<typeof usePdamStore>["waLogs"];
  recipients: ReturnType<typeof usePdamStore>["recipients"];
  serverSyncedAt: string | null;
  canInstallPwa: boolean;
  onClose: () => void;
  onUpdateSettings: ReturnType<typeof usePdamStore>["updateSettings"];
  onSaveNow: ReturnType<typeof usePdamStore>["saveSettingsNow"];
  onToggleDark: () => void;
  onSetRole: ReturnType<typeof usePdamStore>["setActiveRole"];
  onTestAi: ReturnType<typeof usePdamStore>["testAiConnection"];
  onTestVoice: () => void;
  onCheckWa: ReturnType<typeof usePdamStore>["checkWaDeviceStatus"];
  onSendTestBriefing: () => void;
  onSendDirectWa: (phone: string) => Promise<void>;
  onToggleRecipient: (id: number) => void;
  onRetryWa: (id: number) => void;
  onInstallPwa: () => void;
  onResetDemo: () => void;
}) {
  const [aiStatusMsg, setAiStatusMsg] = useState<string>("");
  const [waStatusMsg, setWaStatusMsg] = useState<string>("");
  const [directWaPhone, setDirectWaPhone] = useState<string>("");
  const [busyAi, setBusyAi] = useState(false);
  const [busyWa, setBusyWa] = useState(false);

  const toggleLeadMinute = (min: number) => {
    const exists = settings.pengingatMenit.includes(min);
    const next = exists
      ? settings.pengingatMenit.filter((x) => x !== min)
      : [...settings.pengingatMenit, min];
    onUpdateSettings({ pengingatMenit: next });
  };

  return (
    <div>
      <div className="ph">
        <h3 className="d">Pengaturan</h3>
        <button type="button" className="ib" onClick={onClose}>
          <PwaIcon name="x" />
        </button>
      </div>

      {/* Profil & Status Sinkronisasi Lintas Perangkat */}
      <div
        className="card"
        style={{ display: "flex", gap: 12, alignItems: "center" }}
      >
        <span className="av">
          {settings.peranAktif === "dirut" ? "DR" : "SK"}
        </span>
        <div style={{ flex: 1 }}>
          <b>
            {settings.peranAktif === "dirut"
              ? "Direktur Utama"
              : "Sekretariat Direksi"}
          </b>
          <p className="hint">Perumdam Tirta Ardhia Rinjani</p>
          {serverSyncedAt && (
            <span
              className="chip c-ok"
              style={{ marginTop: 6, fontSize: 11, padding: "2px 9px" }}
            >
              ✓ Tersinkron lintas perangkat
            </span>
          )}
        </div>
      </div>

      {/* Tampilan & Peran */}
      <p className="gh">Peran & tampilan</p>
      <div className="seg" style={{ marginBottom: 10 }}>
        <button
          type="button"
          className={settings.peranAktif === "dirut" ? "on" : ""}
          onClick={() => onSetRole("dirut")}
        >
          Dirut
        </button>
        <button
          type="button"
          className={settings.peranAktif === "sekretariat" ? "on" : ""}
          onClick={() => onSetRole("sekretariat")}
        >
          Sekretariat
        </button>
      </div>
      <div className="card" style={{ padding: "4px 16px" }}>
        <label className="set">
          <span>
            <b>Mode gelap</b>
            <small>Sinkron otomatis dengan web desktop</small>
          </span>
          <input
            type="checkbox"
            className="sw"
            checked={settings.darkMode}
            onChange={onToggleDark}
          />
        </label>
        <label className="set">
          <span>
            <b>Pasang di layar utama (PWA)</b>
            <small>Buka instan layar penuh & dukungan offline</small>
          </span>
          <button type="button" className="btn sm t" onClick={onInstallPwa}>
            {canInstallPwa ? "Pasang" : "Cara pasang"}
          </button>
        </label>
      </div>

      {/* Suara Asisten & Anti-Echo */}
      <p className="gh">Suara asisten Tiara</p>
      <div className="card" style={{ padding: "4px 16px" }}>
        <label className="set">
          <span>
            <b>Pengumuman suara</b>
            <small>Tiara berbicara saat jadwal tiba</small>
          </span>
          <input
            type="checkbox"
            className="sw"
            checked={settings.ttsBriefingAktif}
            onChange={(e) =>
              onUpdateSettings({ ttsBriefingAktif: e.target.checked })
            }
          />
        </label>
        <label className="set">
          <span>
            <b>Sapaan &ldquo;Hey Tiara&rdquo;</b>
            <small>Aktifkan mikrofon siaga otomatis</small>
          </span>
          <input
            type="checkbox"
            className="sw"
            checked={settings.wakeWordAktif}
            onChange={(e) =>
              onUpdateSettings({ wakeWordAktif: e.target.checked })
            }
          />
        </label>
        <label className="set">
          <span>
            <b>Proteksi anti-gema speaker</b>
            <small>Cegah Tiara mendengar suaranya sendiri</small>
          </span>
          <input
            type="checkbox"
            className="sw"
            checked={settings.echoGuardAktif}
            onChange={(e) =>
              onUpdateSettings({ echoGuardAktif: e.target.checked })
            }
          />
        </label>
        <div className="set">
          <span>
            <b>Waktu pengingat</b>
            <small>Sebelum acara dimulai</small>
          </span>
          <div className="row" style={{ gap: 4 }}>
            {(
              [
                [30, "30m"],
                [5, "5m"],
                [0, "Tepat"],
              ] as const
            ).map(([m, lbl]) => (
              <button
                key={m}
                type="button"
                className={`chip ${
                  settings.pengingatMenit.includes(m) ? "" : "c-mu"
                }`}
                onClick={() => toggleLeadMinute(m)}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Engine Suara TTS (Browser / Cartesia / ElevenLabs / OpenAI) */}
      <p className="gh">Engine suara (Text-to-Speech)</p>
      <div className="card" style={{ padding: 14 }}>
        <div className="fld">
          <span>Provider Suara Tiara</span>
          <select
            value={settings.ttsProvider}
            onChange={(e) =>
              onUpdateSettings({
                ttsProvider: e.target.value as AiTtsProvider,
              })
            }
          >
            <option value="browser">Browser Bahasa Indonesia (Lokal)</option>
            <option value="cartesia">Cartesia Sonic TTS (Ultra-Cepat)</option>
            <option value="elevenlabs">ElevenLabs API v1</option>
            <option value="openai-tts">OpenAI Audio Speech</option>
            <option value="custom">Custom TTS Endpoint</option>
          </select>
        </div>

        {settings.ttsProvider === "cartesia" && (
          <>
            <div className="fld">
              <span>Cartesia API Key</span>
              <input
                type="password"
                value={settings.cartesiaApiKey}
                onChange={(e) =>
                  onUpdateSettings({ cartesiaApiKey: e.target.value })
                }
                placeholder="sk_car_..."
              />
            </div>
            <div className="g2">
              <div className="fld">
                <span>Model Cartesia</span>
                <select
                  value={settings.cartesiaModelId}
                  onChange={(e) =>
                    onUpdateSettings({ cartesiaModelId: e.target.value })
                  }
                >
                  <option value="sonic-3">sonic-3</option>
                  <option value="sonic-2">sonic-2</option>
                  <option value="sonic-multilingual">sonic-multilingual</option>
                </select>
              </div>
              <div className="fld">
                <span>Voice ID Cartesia</span>
                <input
                  type="text"
                  value={settings.cartesiaVoiceId}
                  onChange={(e) =>
                    onUpdateSettings({ cartesiaVoiceId: e.target.value })
                  }
                />
              </div>
            </div>
          </>
        )}

        {settings.ttsProvider === "elevenlabs" && (
          <>
            <div className="fld">
              <span>ElevenLabs API Key</span>
              <input
                type="password"
                value={settings.ttsApiKey}
                onChange={(e) =>
                  onUpdateSettings({ ttsApiKey: e.target.value })
                }
                placeholder="xi-api-key..."
              />
            </div>
            <div className="fld">
              <span>Voice ID ElevenLabs</span>
              <input
                type="text"
                value={settings.ttsVoiceId}
                onChange={(e) =>
                  onUpdateSettings({ ttsVoiceId: e.target.value })
                }
              />
            </div>
          </>
        )}

        {(settings.ttsProvider === "openai-tts" ||
          settings.ttsProvider === "custom") && (
          <>
            <div className="fld">
              <span>TTS API Key</span>
              <input
                type="password"
                value={settings.ttsApiKey}
                onChange={(e) =>
                  onUpdateSettings({ ttsApiKey: e.target.value })
                }
              />
            </div>
            {settings.ttsProvider === "custom" && (
              <div className="fld">
                <span>Custom TTS Base URL</span>
                <input
                  type="text"
                  value={settings.ttsBaseUrl}
                  onChange={(e) =>
                    onUpdateSettings({ ttsBaseUrl: e.target.value })
                  }
                  placeholder="https://..."
                />
              </div>
            )}
          </>
        )}

        <div className="row">
          <button
            type="button"
            className="btn g sm"
            style={{ flex: 1 }}
            onClick={onTestVoice}
          >
            <PwaIcon name="vol" size={15} /> Uji Suara
          </button>
          <button
            type="button"
            className="btn t sm"
            style={{ flex: 1 }}
            onClick={() => onSaveNow("Pengaturan suara")}
          >
            Simpan Suara
          </button>
        </div>
      </div>

      {/* Konfigurasi API AI */}
      <p className="gh">Konfigurasi API AI</p>
      <div className="card" style={{ padding: 14 }}>
        <div className="fld">
          <span>Penyedia Layanan AI</span>
          <select
            value={settings.aiProvider}
            onChange={(e) =>
              onUpdateSettings({
                aiProvider: e.target.value as AiLlmProvider,
              })
            }
          >
            <option value="gemini">Google Gemini API</option>
            <option value="openai">OpenAI API</option>
            <option value="anthropic">Anthropic Claude</option>
            <option value="groq">Groq Cloud</option>
            <option value="custom">
              Custom AI / OpenAI-Compatible (Dahono, OpenRouter, dll.)
            </option>
          </select>
        </div>

        <div className="fld">
          <span>Nama Model</span>
          <input
            type="text"
            value={settings.aiModel}
            onChange={(e) => onUpdateSettings({ aiModel: e.target.value })}
            placeholder="gemini-2.5-flash / deepseek-v4"
          />
        </div>

        <div className="fld">
          <span>API Key AI ({settings.aiProvider === "gemini" ? "Google Gemini" : settings.aiProvider.toUpperCase()})</span>
          <input
            type="password"
            value={settings.aiApiKey}
            onChange={(e) => onUpdateSettings({ aiApiKey: e.target.value })}
            placeholder={
              settings.aiProvider === "gemini"
                ? "Format AIza... atau AQ..."
                : settings.aiProvider === "groq"
                ? "gsk_..."
                : "Tempel API Key..."
            }
          />
        </div>

        {settings.aiProvider === "custom" && (
          <>
            <div className="fld">
              <span>Base URL Server Custom AI</span>
              <input
                type="text"
                value={settings.aiBaseUrl}
                onChange={(e) =>
                  onUpdateSettings({ aiBaseUrl: e.target.value })
                }
                placeholder="https://router.dahono.com/api/v1"
              />
            </div>
            <div className="fld">
              <span>Skema Header Autentikasi</span>
              <select
                value={settings.aiAuthScheme}
                onChange={(e) =>
                  onUpdateSettings({
                    aiAuthScheme: e.target.value as AiAuthScheme,
                  })
                }
              >
                <option value="bearer">Authorization: Bearer</option>
                <option value="x-api-key">x-api-key</option>
                <option value="api-key">Api-Key</option>
                <option value="none">Tanpa Key (Lokal)</option>
              </select>
            </div>
          </>
        )}

        {aiStatusMsg && (
          <p className="hint" style={{ marginBottom: 8 }}>
            {aiStatusMsg}
          </p>
        )}

        <div className="row">
          <button
            type="button"
            className="btn g sm"
            style={{ flex: 1 }}
            disabled={busyAi}
            onClick={async () => {
              setBusyAi(true);
              const res = await onTestAi();
              setAiStatusMsg(res.message);
              setBusyAi(false);
            }}
          >
            {busyAi ? "Menguji..." : "Uji Koneksi AI"}
          </button>
          <button
            type="button"
            className="btn t sm"
            style={{ flex: 1 }}
            onClick={() => onSaveNow("Konfigurasi API AI")}
          >
            Simpan AI
          </button>
        </div>
      </div>

      {/* WhatsApp Wangsaf */}
      <p className="gh">WhatsApp Gateway (Wangsaf)</p>
      <div className="card" style={{ padding: 14 }}>
        <div className="fld">
          <span>Base URL Wangsaf v1</span>
          <input
            type="text"
            value={settings.waBaseUrl}
            onChange={(e) => onUpdateSettings({ waBaseUrl: e.target.value })}
          />
        </div>
        <div className="fld">
          <span>Api-Key Perangkat Wangsaf</span>
          <input
            type="password"
            value={settings.waApiToken}
            onChange={(e) => onUpdateSettings({ waApiToken: e.target.value })}
            placeholder="Header Api-Key perangkat Wangsaf"
          />
        </div>

        {waStatusMsg && (
          <p className="hint" style={{ marginBottom: 8 }}>
            {waStatusMsg}
          </p>
        )}

        <div className="row" style={{ marginBottom: 10 }}>
          <button
            type="button"
            className="btn g sm"
            style={{ flex: 1 }}
            disabled={busyWa}
            onClick={async () => {
              setBusyWa(true);
              const st = await onCheckWa();
              setWaStatusMsg(st.message);
              setBusyWa(false);
            }}
          >
            {busyWa ? "Mengecek..." : "Cek Perangkat"}
          </button>
          <button
            type="button"
            className="btn t sm"
            style={{ flex: 1 }}
            onClick={onSendTestBriefing}
          >
            Uji Briefing
          </button>
        </div>

        <div className="row">
          <input
            type="text"
            placeholder="Nomor tujuan tes WA (0812...)"
            value={directWaPhone}
            onChange={(e) => setDirectWaPhone(e.target.value)}
            style={{ flex: 1 }}
          />
          <button
            type="button"
            className="btn sm"
            onClick={() => void onSendDirectWa(directWaPhone)}
          >
            Kirim Tes
          </button>
        </div>

        <div style={{ marginTop: 12 }}>
          {recipients.map((r) => (
            <label key={r.id} className="set">
              <span>
                <b>{r.nama}</b>
                <small>{r.noWa}</small>
              </span>
              <input
                type="checkbox"
                className="sw"
                checked={r.aktif}
                onChange={() => onToggleRecipient(r.id)}
              />
            </label>
          ))}
        </div>
      </div>

      {/* Log Pengiriman WA */}
      <div className="card" style={{ marginTop: 10 }}>
        <b style={{ display: "block", marginBottom: 6 }}>Log pengiriman</b>
        {waLogs.slice(0, 5).map((l) => (
          <div key={l.id} className="lg">
            <span>
              <b>{l.waktu}</b>
              {l.labelDashboard || l.tujuan}
            </span>
            {l.status === "Gagal" ? (
              <button
                type="button"
                className="chip c-fl"
                onClick={() => onRetryWa(l.id)}
              >
                Kirim ulang
              </button>
            ) : (
              <span
                className={`chip ${l.status === "Terkirim" ? "c-ok" : "c-mu"}`}
              >
                {l.status}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Simpan Global & Reset */}
      <div style={{ display: "grid", gap: 8, marginTop: 18 }}>
        <button
          type="button"
          className="btn t b"
          onClick={() => onSaveNow("Seluruh pengaturan")}
        >
          Simpan ke Server (Semua Perangkat)
        </button>
        <button type="button" className="btn g b" onClick={onResetDemo}>
          Kembalikan Data Demo Awal
        </button>
      </div>
    </div>
  );
}
