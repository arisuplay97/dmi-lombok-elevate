import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit3,
  ExternalLink,
  FilePlus2,
  FileText,
  Layers,
  MapPin,
  Mic,
  Plus,
  Repeat,
  Search,
  Trash2,
  Users,
  Volume2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { TODAY_ISO } from "@/data/pdam-data";
import { usePdamStore } from "@/lib/pdam-store";
import {
  createSpeechRecognition,
  detectScheduleConflicts,
  extractAgendaFromSpeech,
} from "@/lib/tiara-speech";
import type {
  AgendaItem,
  JenisAgenda,
  NotulenItem,
  RecurrenceType,
} from "@/lib/types";

export const Route = createFileRoute("/agenda")({
  component: AgendaPage,
});

type CalendarViewMode = "day" | "week" | "month" | "list";
type CategoryFilter = "semua" | "rapat" | "kunjungan" | "lainnya" | "notulen";

const MONTH_NAMES_ID = [
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

const SHORT_MONTH_ID = [
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

const SHORT_DAY_ID = ["MIN", "SEN", "SEL", "RAB", "KAM", "JUM", "SAB"];
const FULL_DAY_ID = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

const TIMELINE_START_HOUR = 7;
const TIMELINE_END_HOUR = 17; // 07:00 s/d 18:00 WITA
const HOUR_HEIGHT_PX = 88; // 44px per 30 menit — proporsional tanpa tumpang tindih

function parseIsoDate(iso: string): Date {
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
  const d = parseIsoDate(iso);
  d.setDate(d.getDate() + delta);
  return toIsoDate(d);
}

function getMondayOfWeek(iso: string): string {
  const d = parseIsoDate(iso);
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return toIsoDate(d);
}

function formatFullDateId(iso: string): string {
  const d = parseIsoDate(iso);
  return `${FULL_DAY_ID[d.getDay()]}, ${d.getDate()} ${
    MONTH_NAMES_ID[d.getMonth()]
  } ${d.getFullYear()}`;
}

function formatShortDateId(iso: string): string {
  const d = parseIsoDate(iso);
  return `${FULL_DAY_ID[d.getDay()]}, ${d.getDate()} ${
    SHORT_MONTH_ID[d.getMonth()]
  } ${d.getFullYear()}`;
}

function parseHHMMToMinutes(str: string, fallbackMinutes: number): number {
  const clean = str.trim().replace(":", ".");
  const match = clean.match(/(\d{1,2})\.(\d{2})/);
  if (!match) return fallbackMinutes;
  const h = Math.min(23, Math.max(0, Number(match[1])));
  const m = Math.min(59, Math.max(0, Number(match[2])));
  return h * 60 + m;
}

function formatMinutesColon(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

interface AgendaTimelineEntry {
  uid: string;
  dateIso: string;
  startMin: number;
  endMin: number;
  timeLabel: string;
  agenda: AgendaItem;
  hasConflict: boolean;
}

interface PositionedAgendaEntry extends AgendaTimelineEntry {
  colIndex: number;
  totalCols: number;
}

function layoutAgendaEntries(
  entries: AgendaTimelineEntry[]
): PositionedAgendaEntry[] {
  if (entries.length === 0) return [];
  const sorted = [...entries].sort((a, b) =>
    a.startMin !== b.startMin
      ? a.startMin - b.startMin
      : b.endMin - b.startMin - (a.endMin - a.startMin)
  );

  const clusters: AgendaTimelineEntry[][] = [];
  let currentCluster: AgendaTimelineEntry[] = [];
  let clusterMaxEnd = -1;

  for (const item of sorted) {
    const effectiveEnd = Math.max(item.endMin, item.startMin + 26);
    if (currentCluster.length === 0 || item.startMin < clusterMaxEnd) {
      currentCluster.push(item);
      clusterMaxEnd = Math.max(clusterMaxEnd, effectiveEnd);
    } else {
      clusters.push(currentCluster);
      currentCluster = [item];
      clusterMaxEnd = effectiveEnd;
    }
  }
  if (currentCluster.length > 0) clusters.push(currentCluster);

  const result: PositionedAgendaEntry[] = [];
  for (const cluster of clusters) {
    const colEnds: number[] = [];
    const assigned: Array<{ entry: AgendaTimelineEntry; col: number }> = [];

    for (const entry of cluster) {
      const effectiveEnd = Math.max(entry.endMin, entry.startMin + 26);
      let placedCol = -1;
      for (let c = 0; c < colEnds.length; c++) {
        if (colEnds[c] <= entry.startMin) {
          placedCol = c;
          colEnds[c] = effectiveEnd;
          break;
        }
      }
      if (placedCol === -1) {
        placedCol = colEnds.length;
        colEnds.push(effectiveEnd);
      }
      assigned.push({ entry, col: placedCol });
    }

    const totalCols = Math.max(1, colEnds.length);
    for (const a of assigned) {
      result.push({
        ...a.entry,
        colIndex: a.col,
        totalCols,
      });
    }
  }

  return result;
}

function buildMonthGrid(year: number, monthIndex: number): Array<{
  iso: string;
  dayNum: number;
  inMonth: boolean;
}> {
  const firstDay = new Date(year, monthIndex, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const startDate = new Date(year, monthIndex, 1 - startOffset);

  const cells: Array<{ iso: string; dayNum: number; inMonth: boolean }> = [];
  for (let i = 0; i < 42; i++) {
    const cur = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate() + i
    );
    cells.push({
      iso: toIsoDate(cur),
      dayNum: cur.getDate(),
      inMonth: cur.getMonth() === monthIndex,
    });
  }
  const lastRowInMonth = cells.slice(35).some((c) => c.inMonth);
  return lastRowInMonth ? cells : cells.slice(0, 35);
}

/**
 * Palet aksen eksekutif yang tenang & presisi (tanpa warna neon / border melengkung kasar)
 */
function getAgendaAccent(jenis: JenisAgenda, isDark: boolean): {
  bar: string;
  tagBg: string;
  tagText: string;
  label: string;
} {
  if (jenis === "rapat") {
    return {
      bar: isDark ? "#60A5FA" : "#2563EB",
      tagBg: isDark ? "rgba(59, 130, 246, 0.14)" : "#EFF6FF",
      tagText: isDark ? "#93C5FD" : "#1D4ED8",
      label: "Rapat",
    };
  }
  if (jenis === "kunjungan") {
    return {
      bar: isDark ? "#34D399" : "#0D9488",
      tagBg: isDark ? "rgba(16, 185, 129, 0.14)" : "#F0FDFA",
      tagText: isDark ? "#6EE7B7" : "#0F766E",
      label: "Kunjungan",
    };
  }
  return {
    bar: isDark ? "#94A3B8" : "#64748B",
    tagBg: isDark ? "rgba(148, 163, 184, 0.14)" : "#F1F5F9",
    tagText: isDark ? "#CBD5E1" : "#475569",
    label: "Kegiatan",
  };
}

function AgendaPage() {
  const navigate = useNavigate();
  const {
    agendas,
    notulenList,
    settings,
    addAgenda,
    updateAgenda,
    deleteAgenda,
    requestDeleteAgenda,
    toggleAgendaDone,
    openCreateNotulenFromAgenda,
    openCreateNotulenManual,
    setSelectedNotulenId,
    readNotulenAloud,
    setVoiceDraft,
    speakCustom,
  } = usePdamStore();

  const isDark = settings.darkMode;

  const [viewMode, setViewMode] = useState<CalendarViewMode>("week");
  const [selectedDate, setSelectedDate] = useState<string>(TODAY_ISO);
  const [miniMonthCursor, setMiniMonthCursor] = useState<{
    year: number;
    month: number;
  }>(() => {
    const d = parseIsoDate(TODAY_ISO);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("semua");
  const [showAgendaLayer, setShowAgendaLayer] = useState(true);
  const [showNotulenLayer, setShowNotulenLayer] = useState(true);

  const [voiceDrawerOpen, setVoiceDrawerOpen] = useState(false);
  const [recordingVoice, setRecordingVoice] = useState(false);
  const [quickVoiceText, setQuickVoiceText] = useState("");

  const [inspectedAgenda, setInspectedAgenda] = useState<AgendaItem | null>(
    null
  );
  const [inspectedNotulen, setInspectedNotulen] = useState<NotulenItem | null>(
    null
  );

  // State Form Modal Tambah / Edit Agenda
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [judul, setJudul] = useState("");
  const [tanggal, setTanggal] = useState(TODAY_ISO);
  const [mulai, setMulai] = useState("09.00");
  const [selesai, setSelesai] = useState("10.00");
  const [lokasi, setLokasi] = useState("Ruang Rapat Utama");
  const [jenis, setJenis] = useState<JenisAgenda>("rapat");
  const [peserta, setPeserta] = useState(5);
  const [berulang, setBerulang] = useState<RecurrenceType>("tidak");
  const [catatan, setCatatan] = useState("");

  // Sistem Token Warna Arsitektural (Clean Hairline Borders, Tanpa Garis Putus Kasar)
  const ui = {
    surface: isDark ? "#11141C" : "#FFFFFF",
    sidebarBg: isDark ? "#141821" : "#FAFAFB",
    elevated: isDark ? "#181D28" : "#FFFFFF",
    cardAgenda: isDark ? "#191E2B" : "#FFFFFF",
    cardAgendaBorder: isDark ? "#262E40" : "#E5E7EB",
    cardNotulen: isDark ? "#171B26" : "#F8FAFC",
    cardNotulenBorder: isDark ? "#2A3246" : "#E2E8F0",
    notulenBadgeBg: isDark ? "rgba(99, 102, 241, 0.18)" : "#EEF2FF",
    notulenAccent: isDark ? "#818CF8" : "#4F46E5",
    subtleBg: isDark ? "#1A1F2C" : "#F4F5F7",
    border: isDark ? "#222836" : "#EAECEF",
    gridLine: isDark ? "rgba(255, 255, 255, 0.05)" : "#F0F2F5",
    textPrimary: isDark ? "#F1F5F9" : "#0F172A",
    textSecondary: isDark ? "#94A3B8" : "#475569",
    textMuted: isDark ? "#64748B" : "#94A3B8",
    primaryBtnBg: isDark ? "#F8FAFC" : "#111827",
    primaryBtnText: isDark ? "#0F172A" : "#FFFFFF",
    cobalt: isDark ? "#60A5FA" : "#2563EB",
  };

  const selectDateAndSyncMonth = (iso: string) => {
    setSelectedDate(iso);
    const d = parseIsoDate(iso);
    setMiniMonthCursor({ year: d.getFullYear(), month: d.getMonth() });
  };

  const stepPeriod = (dir: -1 | 1) => {
    if (viewMode === "day") {
      selectDateAndSyncMonth(addDaysIso(selectedDate, dir));
    } else if (viewMode === "week" || viewMode === "list") {
      selectDateAndSyncMonth(addDaysIso(selectedDate, dir * 7));
    } else {
      const next = new Date(
        miniMonthCursor.year,
        miniMonthCursor.month + dir,
        1
      );
      setMiniMonthCursor({
        year: next.getFullYear(),
        month: next.getMonth(),
      });
      setSelectedDate(toIsoDate(next));
    }
  };

  const openAddModal = (prefillDate?: string, prefillStart?: string) => {
    const targetDate = prefillDate || selectedDate || TODAY_ISO;
    const startStr = prefillStart || "10.00";
    const startMins = parseHHMMToMinutes(startStr, 600);
    const endMins = Math.min(22 * 60, startMins + 60);
    const endStr = `${String(Math.floor(endMins / 60)).padStart(
      2,
      "0"
    )}.${String(endMins % 60).padStart(2, "0")}`;

    setEditingId(null);
    setJudul("");
    setTanggal(targetDate);
    setMulai(startStr);
    setSelesai(endStr);
    setLokasi("Ruang Rapat Utama");
    setJenis("rapat");
    setPeserta(6);
    setBerulang("tidak");
    setCatatan("");
    setInspectedAgenda(null);
    setFormOpen(true);
  };

  const openEditModal = (item: AgendaItem) => {
    setEditingId(item.id);
    setJudul(item.judul);
    setTanggal(item.tanggal);
    setMulai(item.mulai);
    setSelesai(item.selesai);
    setLokasi(item.lokasi);
    setJenis(item.jenis);
    setPeserta(item.peserta);
    setBerulang(item.berulang);
    setCatatan(item.catatan || "");
    setInspectedAgenda(null);
    setFormOpen(true);
  };

  const conflicts = detectScheduleConflicts(
    { tanggal, mulai, selesai, id: editingId ?? undefined },
    agendas
  );

  const handleSaveManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!judul.trim()) return;
    if (editingId !== null) {
      updateAgenda(editingId, {
        judul: judul.trim(),
        tanggal,
        mulai,
        selesai,
        lokasi: lokasi.trim(),
        jenis,
        peserta,
        labelPeserta:
          jenis === "kunjungan" ? "Kunjungan lapangan" : `${peserta} peserta`,
        berulang,
        catatan,
      });
    } else {
      addAgenda({
        judul: judul.trim(),
        tanggal,
        mulai,
        selesai,
        lokasi: lokasi.trim(),
        jenis,
        peserta,
        labelPeserta:
          jenis === "kunjungan" ? "Kunjungan lapangan" : `${peserta} peserta`,
        berulang,
        catatan,
        sumber: "manual",
        selesaiAcara: false,
      });
      selectDateAndSyncMonth(tanggal);
    }
    setFormOpen(false);
  };

  const handleRecordVoiceAgenda = () => {
    setVoiceDrawerOpen(true);
    const rec = createSpeechRecognition();
    if (!rec) {
      toast.error(
        "Browser belum mendukung mikrofon langsung. Ketik perintah jadwal di kolom yang terbuka."
      );
      return;
    }
    rec.lang = "id-ID";
    rec.continuous = false;
    rec.interimResults = false;
    setRecordingVoice(true);
    toast(
      "Silakan ucapkan jadwal, contoh: 'Tambah rapat evaluasi teknis Kamis jam 10'"
    );

    rec.onresult = (ev) => {
      const spoken = ev.results[0]?.[0]?.transcript || "";
      setRecordingVoice(false);
      if (spoken.trim()) {
        const draft = extractAgendaFromSpeech(
          spoken,
          selectedDate || TODAY_ISO
        );
        setVoiceDraft(draft);
        speakCustom(
          `Baik, saya siapkan draf agenda ${draft.judul} pukul ${draft.mulai}. Silakan konfirmasi.`
        );
      }
    };
    rec.onerror = () => setRecordingVoice(false);
    rec.onend = () => setRecordingVoice(false);
    try {
      rec.start();
    } catch {
      setRecordingVoice(false);
    }
  };

  const handleQuickExtractSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const txt =
      quickVoiceText.trim() ||
      "Tambah rapat evaluasi jaringan pipa Jumat jam 09.00 di Ruang Rapat Utama";
    const draft = extractAgendaFromSpeech(txt, selectedDate || TODAY_ISO);
    setVoiceDraft(draft);
    setQuickVoiceText("");
  };

  const qNorm = searchQuery.trim().toLowerCase();

  const visibleAgendas = useMemo(() => {
    if (!showAgendaLayer || categoryFilter === "notulen") return [];
    return agendas.filter((a) => {
      if (categoryFilter !== "semua" && a.jenis !== categoryFilter) {
        return false;
      }
      if (!qNorm) return true;
      const hay = `${a.judul} ${a.lokasi} ${a.catatan || ""}`.toLowerCase();
      return hay.includes(qNorm);
    });
  }, [agendas, showAgendaLayer, categoryFilter, qNorm]);

  const visibleNotulens = useMemo(() => {
    if (!showNotulenLayer) return [];
    if (
      categoryFilter !== "semua" &&
      categoryFilter !== "notulen" &&
      categoryFilter !== "rapat"
    ) {
      return [];
    }
    return notulenList.filter((n) => {
      if (!qNorm) return true;
      const hay = `${n.judul} ${n.lokasi || ""} ${n.pimpinan || ""} ${
        n.ringkasan
      }`.toLowerCase();
      return hay.includes(qNorm);
    });
  }, [notulenList, showNotulenLayer, categoryFilter, qNorm]);

  const markersByDate = useMemo(() => {
    const map: Record<
      string,
      { agendas: AgendaItem[]; notulens: NotulenItem[] }
    > = {};
    for (const a of visibleAgendas) {
      if (!map[a.tanggal]) map[a.tanggal] = { agendas: [], notulens: [] };
      map[a.tanggal].agendas.push(a);
    }
    for (const n of visibleNotulens) {
      if (!map[n.tanggalIso]) map[n.tanggalIso] = { agendas: [], notulens: [] };
      map[n.tanggalIso].notulens.push(n);
    }
    return map;
  }, [visibleAgendas, visibleNotulens]);

  const weekDays = useMemo(() => {
    const monday = getMondayOfWeek(selectedDate);
    const allSeven = Array.from({ length: 7 }, (_, i) => addDaysIso(monday, i));
    const sundayIso = allSeven[6];
    const sundayHasItems =
      Boolean(markersByDate[sundayIso]?.agendas.length) ||
      Boolean(markersByDate[sundayIso]?.notulens.length) ||
      selectedDate === sundayIso;
    return sundayHasItems ? allSeven : allSeven.slice(0, 6);
  }, [selectedDate, markersByDate]);

  const activeTimelineDays = useMemo(
    () => (viewMode === "day" ? [selectedDate] : weekDays),
    [viewMode, selectedDate, weekDays]
  );

  // Jadwal Agenda dipetakan ke grid jam, sedangkan Notulen dipetakan ke baris dokumen di atas grid agar tidak pernah bertumpuk sempit!
  const agendaTimelineByDate = useMemo(() => {
    const out: Record<string, PositionedAgendaEntry[]> = {};
    for (const dayIso of activeTimelineDays) {
      const dayAgendas = markersByDate[dayIso]?.agendas || [];
      const raw: AgendaTimelineEntry[] = dayAgendas.map((a) => {
        const startMin = parseHHMMToMinutes(a.mulai, 9 * 60);
        const endRaw = parseHHMMToMinutes(a.selesai, startMin + 60);
        const endMin = endRaw > startMin ? endRaw : startMin + 30;
        const itemConflicts = detectScheduleConflicts(
          { tanggal: a.tanggal, mulai: a.mulai, selesai: a.selesai, id: a.id },
          agendas
        );
        return {
          uid: `ag-${a.id}`,
          dateIso: dayIso,
          startMin,
          endMin,
          timeLabel: `${formatMinutesColon(startMin)} – ${formatMinutesColon(
            endMin
          )}`,
          agenda: a,
          hasConflict: itemConflicts.length > 0,
        };
      });
      out[dayIso] = layoutAgendaEntries(raw);
    }
    return out;
  }, [activeTimelineDays, markersByDate, agendas]);

  const anyNotulenInActiveTimeline = useMemo(
    () =>
      showNotulenLayer &&
      activeTimelineDays.some(
        (d) => (markersByDate[d]?.notulens.length || 0) > 0
      ),
    [showNotulenLayer, activeTimelineDays, markersByDate]
  );

  // Grup tanggal berurutan untuk tampilan Daftar (List View)
  const groupedListDates = useMemo(() => {
    const allDates = new Set<string>();
    for (const a of visibleAgendas) allDates.add(a.tanggal);
    for (const n of visibleNotulens) allDates.add(n.tanggalIso);
    return Array.from(allDates).sort((a, b) => a.localeCompare(b));
  }, [visibleAgendas, visibleNotulens]);

  const miniCells = useMemo(
    () => buildMonthGrid(miniMonthCursor.year, miniMonthCursor.month),
    [miniMonthCursor.year, miniMonthCursor.month]
  );

  const breakdown = useMemo(() => {
    const rapatCount = agendas.filter((a) => a.jenis === "rapat").length;
    const kunjunganCount = agendas.filter(
      (a) => a.jenis === "kunjungan"
    ).length;
    const lainnyaCount = agendas.filter((a) => a.jenis === "lainnya").length;
    const notulenCount = notulenList.length;
    const maxVal = Math.max(
      1,
      rapatCount,
      kunjunganCount,
      lainnyaCount,
      notulenCount
    );
    return [
      {
        label: "Rapat Direksi",
        count: rapatCount,
        pct: Math.round((rapatCount / maxVal) * 100),
        color: ui.cobalt,
        isDiamond: false,
      },
      {
        label: "Kunjungan",
        count: kunjunganCount,
        pct: Math.round((kunjunganCount / maxVal) * 100),
        color: isDark ? "#34D399" : "#0D9488",
        isDiamond: false,
      },
      {
        label: "Kegiatan Lain",
        count: lainnyaCount,
        pct: Math.round((lainnyaCount / maxVal) * 100),
        color: isDark ? "#94A3B8" : "#64748B",
        isDiamond: false,
      },
      {
        label: "Arsip Notulen",
        count: notulenCount,
        pct: Math.round((notulenCount / maxVal) * 100),
        color: ui.notulenAccent,
        isDiamond: true,
      },
    ];
  }, [agendas, notulenList, isDark, ui.cobalt, ui.notulenAccent]);

  const upcomingItems = useMemo(() => {
    return [...agendas]
      .filter((a) => !a.selesaiAcara && a.tanggal >= TODAY_ISO)
      .sort((a, b) =>
        a.tanggal !== b.tanggal
          ? a.tanggal.localeCompare(b.tanggal)
          : a.mulai.localeCompare(b.mulai)
      )
      .slice(0, 3);
  }, [agendas]);

  const periodLabel = useMemo(() => {
    if (viewMode === "day") {
      return formatShortDateId(selectedDate);
    }
    if (viewMode === "month") {
      return `${MONTH_NAMES_ID[miniMonthCursor.month]} ${miniMonthCursor.year}`;
    }
    const first = parseIsoDate(weekDays[0]);
    const last = parseIsoDate(weekDays[weekDays.length - 1]);
    if (first.getMonth() === last.getMonth()) {
      return `${first.getDate()} – ${last.getDate()} ${
        SHORT_MONTH_ID[first.getMonth()]
      } ${first.getFullYear()}`;
    }
    return `${first.getDate()} ${
      SHORT_MONTH_ID[first.getMonth()]
    } – ${last.getDate()} ${
      SHORT_MONTH_ID[last.getMonth()]
    } ${last.getFullYear()}`;
  }, [viewMode, selectedDate, miniMonthCursor, weekDays]);

  const hoursArray = useMemo(() => {
    const arr: number[] = [];
    for (let h = TIMELINE_START_HOUR; h <= TIMELINE_END_HOUR; h++) {
      arr.push(h);
    }
    return arr;
  }, []);

  const totalTimelineHeight = hoursArray.length * HOUR_HEIGHT_PX;
  const currentIndicatorMin = 8 * 60 + 55;
  const currentIndicatorTop =
    ((currentIndicatorMin - TIMELINE_START_HOUR * 60) / 60) * HOUR_HEIGHT_PX;

  const outlineActionBtn: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    height: 32,
    padding: "0 11px",
    borderRadius: 8,
    border: `1px solid ${ui.border}`,
    background: ui.elevated,
    color: ui.textPrimary,
    fontSize: 12,
    fontWeight: 500,
    fontFamily: "inherit",
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  const modalInputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 13px",
    borderRadius: 10,
    border: `1px solid ${ui.border}`,
    background: isDark ? "#141822" : "#FFFFFF",
    color: ui.textPrimary,
    fontSize: 13.5,
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  return (
    <div style={{ marginTop: 20 }}>
      <div
        className="sched-workspace"
        style={{
          background: ui.surface,
          border: `1px solid ${ui.border}`,
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: isDark
            ? "0 20px 48px rgba(0, 0, 0, 0.4)"
            : "0 4px 20px rgba(15, 23, 42, 0.035)",
        }}
      >
        {/* TOP BAR: Segmented Switcher · Search · Crisp Executive Buttons */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            padding: "13px 20px",
            borderBottom: `1px solid ${ui.border}`,
            background: ui.surface,
          }}
        >
          {/* Segmented View Switcher */}
          <div
            style={{
              display: "inline-flex",
              background: ui.subtleBg,
              border: `1px solid ${ui.border}`,
              borderRadius: 10,
              padding: 3,
              gap: 2,
            }}
          >
            {(
              [
                ["day", "Hari"],
                ["week", "Minggu"],
                ["month", "Bulan"],
                ["list", "Daftar"],
              ] as Array<[CalendarViewMode, string]>
            ).map(([mode, label]) => {
              const active = viewMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  style={{
                    border: 0,
                    borderRadius: 7,
                    padding: "5px 13px",
                    fontSize: 12.5,
                    fontWeight: active ? 600 : 500,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    background: active ? ui.elevated : "transparent",
                    color: active ? ui.textPrimary : ui.textSecondary,
                    boxShadow: active
                      ? isDark
                        ? "0 1px 2px rgba(0,0,0,0.4)"
                        : "0 1px 2px rgba(15,23,42,0.06)"
                      : "none",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div
            style={{
              flex: "1 1 250px",
              maxWidth: 420,
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: ui.subtleBg,
              border: `1px solid ${ui.border}`,
              borderRadius: 9,
              padding: "0 12px",
              height: 36,
            }}
          >
            <Search size={14} color={ui.textMuted} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari agenda, lokasi, atau judul notulen..."
              style={{
                border: 0,
                outline: 0,
                background: "transparent",
                color: ui.textPrimary,
                fontSize: 12.5,
                width: "100%",
                fontFamily: "inherit",
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{
                  border: 0,
                  background: "transparent",
                  color: ui.textMuted,
                  cursor: "pointer",
                  padding: 2,
                  display: "inline-flex",
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Action Buttons (Monokrom Bersih & Tegas, Tanpa Warna Slop) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={() => setVoiceDrawerOpen((v) => !v)}
              style={{
                ...outlineActionBtn,
                height: 36,
                padding: "0 12px",
                background: voiceDrawerOpen ? ui.subtleBg : ui.elevated,
                borderColor: voiceDrawerOpen ? ui.cobalt : ui.border,
              }}
            >
              <Mic size={14} color={voiceDrawerOpen ? ui.cobalt : ui.textSecondary} />
              <span>Perintah Suara</span>
            </button>

            <button
              type="button"
              onClick={() => openCreateNotulenManual()}
              style={{
                ...outlineActionBtn,
                height: 36,
                padding: "0 12px",
              }}
            >
              <FilePlus2 size={14} color={ui.notulenAccent} />
              <span>Catat Notulen</span>
            </button>

            <button
              type="button"
              onClick={() => openAddModal(selectedDate)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                height: 36,
                padding: "0 14px",
                borderRadius: 9,
                border: 0,
                background: ui.primaryBtnBg,
                color: ui.primaryBtnText,
                fontSize: 12.5,
                fontWeight: 600,
                fontFamily: "inherit",
                cursor: "pointer",
              }}
            >
              <Plus size={15} />
              <span>Agenda Baru</span>
            </button>
          </div>
        </div>

        {/* COLLAPSIBLE VOICE / NATURAL-LANGUAGE SCHEDULE DRAWER */}
        {voiceDrawerOpen && (
          <form
            onSubmit={handleQuickExtractSubmit}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
              padding: "11px 20px",
              borderBottom: `1px solid ${ui.border}`,
              background: ui.sidebarBg,
            }}
          >
            <button
              type="button"
              onClick={handleRecordVoiceAgenda}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                height: 34,
                padding: "0 12px",
                borderRadius: 8,
                border: 0,
                background: recordingVoice ? "#DC2626" : ui.cobalt,
                color: "#FFFFFF",
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "inherit",
                cursor: "pointer",
              }}
            >
              <Mic size={13} />
              {recordingVoice ? "Mendengarkan..." : "Mulai Bicara"}
            </button>
            <input
              value={quickVoiceText}
              onChange={(e) => setQuickVoiceText(e.target.value)}
              placeholder="Ketik jadwal natural, contoh: 'Tambah rapat evaluasi NRW Kamis jam 10 di Ruang Dirut'"
              style={{
                flex: "1 1 280px",
                height: 34,
                padding: "0 12px",
                borderRadius: 8,
                border: `1px solid ${ui.border}`,
                background: ui.surface,
                color: ui.textPrimary,
                fontSize: 12.5,
                fontFamily: "inherit",
              }}
            />
            <button type="submit" style={{ ...outlineActionBtn, height: 34 }}>
              Buat Draf Jadwal
            </button>
          </form>
        )}

        {/* 2-PANE BODY */}
        <div
          className="sched-body-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "268px minmax(0, 1fr)",
            minHeight: 720,
          }}
        >
          {/* LEFT SIDEBAR */}
          <aside
            className="sched-sidebar"
            style={{
              background: ui.sidebarBg,
              borderRight: `1px solid ${ui.border}`,
              padding: "18px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            {/* 1. Mini Calendar */}
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 12,
                  padding: "0 2px",
                }}
              >
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: ui.textPrimary,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {MONTH_NAMES_ID[miniMonthCursor.month]}{" "}
                  {miniMonthCursor.year}
                </span>
                <div style={{ display: "flex", gap: 4 }}>
                  <button
                    type="button"
                    onClick={() =>
                      setMiniMonthCursor((prev) => {
                        const d = new Date(prev.year, prev.month - 1, 1);
                        return { year: d.getFullYear(), month: d.getMonth() };
                      })
                    }
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 7,
                      border: `1px solid ${ui.border}`,
                      background: ui.elevated,
                      color: ui.textSecondary,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setMiniMonthCursor((prev) => {
                        const d = new Date(prev.year, prev.month + 1, 1);
                        return { year: d.getFullYear(), month: d.getMonth() };
                      })
                    }
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 7,
                      border: `1px solid ${ui.border}`,
                      background: ui.elevated,
                      color: ui.textSecondary,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                  textAlign: "center",
                  marginBottom: 4,
                }}
              >
                {["S", "S", "R", "K", "J", "S", "M"].map((d, idx) => (
                  <span
                    key={idx}
                    style={{
                      fontSize: 10.5,
                      fontWeight: 600,
                      color: ui.textMuted,
                    }}
                  >
                    {d}
                  </span>
                ))}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                  rowGap: 2,
                }}
              >
                {miniCells.map((cell) => {
                  const isSelected = cell.iso === selectedDate;
                  const isToday = cell.iso === TODAY_ISO;
                  const bucket = markersByDate[cell.iso];
                  const hasAgenda = Boolean(bucket?.agendas.length);
                  const hasNotulen = Boolean(bucket?.notulens.length);

                  return (
                    <button
                      key={cell.iso}
                      type="button"
                      onClick={() => selectDateAndSyncMonth(cell.iso)}
                      style={{
                        border: 0,
                        background: isSelected
                          ? isDark
                            ? "rgba(96, 165, 250, 0.18)"
                            : "#EFF6FF"
                          : "transparent",
                        color: isSelected
                          ? ui.cobalt
                          : isToday
                            ? ui.cobalt
                            : cell.inMonth
                              ? ui.textPrimary
                              : ui.textMuted,
                        opacity: cell.inMonth ? 1 : 0.38,
                        borderRadius: 7,
                        height: 32,
                        padding: 0,
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "inherit",
                        fontSize: 12,
                        fontWeight: isSelected || isToday ? 700 : 500,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      <span>{cell.dayNum}</span>
                      {(hasAgenda || hasNotulen) && (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 2.5,
                            marginTop: 1,
                            height: 4,
                          }}
                        >
                          {hasAgenda && (
                            <i
                              style={{
                                width: 4,
                                height: 4,
                                borderRadius: "50%",
                                background: ui.cobalt,
                                display: "inline-block",
                              }}
                            />
                          )}
                          {hasNotulen && (
                            <i
                              style={{
                                width: 4,
                                height: 4,
                                borderRadius: 1,
                                background: ui.notulenAccent,
                                transform: "rotate(45deg)",
                                display: "inline-block",
                              }}
                            />
                          )}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ height: 1, background: ui.border }} />

            {/* 2. Layer Toggles (Clean Hairline Surface — Tanpa Garis Putus Ungu) */}
            <div>
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  color: ui.textMuted,
                  marginBottom: 8,
                }}
              >
                Lapisan Kalender
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setShowAgendaLayer((v) => !v)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 10px",
                    borderRadius: 9,
                    border: `1px solid ${ui.border}`,
                    background: showAgendaLayer ? ui.elevated : "transparent",
                    color: ui.textPrimary,
                    opacity: showAgendaLayer ? 1 : 0.48,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 12.5,
                      fontWeight: 500,
                    }}
                  >
                    <span
                      style={{
                        width: 3,
                        height: 14,
                        borderRadius: 99,
                        background: ui.cobalt,
                        display: "inline-block",
                      }}
                    />
                    <span>Jadwal Kegiatan</span>
                  </span>
                  <span
                    style={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: ui.textSecondary,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {agendas.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowNotulenLayer((v) => !v)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 10px",
                    borderRadius: 9,
                    border: `1px solid ${ui.border}`,
                    background: showNotulenLayer ? ui.elevated : "transparent",
                    color: ui.textPrimary,
                    opacity: showNotulenLayer ? 1 : 0.48,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 12.5,
                      fontWeight: 500,
                    }}
                  >
                    <span
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 4,
                        background: ui.notulenBadgeBg,
                        color: ui.notulenAccent,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <FileText size={10} />
                    </span>
                    <span>Dokumen Notulen</span>
                  </span>
                  <span
                    style={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: ui.textSecondary,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {notulenList.length}
                  </span>
                </button>
              </div>
            </div>

            <div style={{ height: 1, background: ui.border }} />

            {/* 3. Rincian Aktivitas */}
            <div>
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  color: ui.textMuted,
                  marginBottom: 10,
                }}
              >
                Distribusi Aktivitas
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {breakdown.map((b) => (
                  <div
                    key={b.label}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "100px 1fr 22px",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 12,
                        color: ui.textSecondary,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <i
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: b.isDiamond ? 1.5 : "50%",
                          transform: b.isDiamond ? "rotate(45deg)" : undefined,
                          background: b.color,
                          display: "inline-block",
                          flexShrink: 0,
                        }}
                      />
                      {b.label}
                    </span>
                    <div
                      style={{
                        height: 4,
                        borderRadius: 99,
                        background: isDark ? "#232938" : "#E5E7EB",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.max(12, b.pct)}%`,
                          height: "100%",
                          borderRadius: 99,
                          background: b.color,
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        color: ui.textMuted,
                        textAlign: "right",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {b.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ height: 1, background: ui.border }} />

            {/* 4. Jadwal Terdekat */}
            <div>
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  color: ui.textMuted,
                  marginBottom: 9,
                }}
              >
                Agenda Berikutnya
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {upcomingItems.length === 0 ? (
                  <div style={{ fontSize: 12, color: ui.textMuted }}>
                    Tidak ada agenda tertunda.
                  </div>
                ) : (
                  upcomingItems.map((item) => {
                    const acc = getAgendaAccent(item.jenis, isDark);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          selectDateAndSyncMonth(item.tanggal);
                          setInspectedAgenda(item);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "stretch",
                          gap: 9,
                          padding: "9px 10px",
                          borderRadius: 10,
                          border: `1px solid ${ui.border}`,
                          background: ui.elevated,
                          color: ui.textPrimary,
                          textAlign: "left",
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        <span
                          style={{
                            width: 3,
                            borderRadius: 99,
                            background: acc.bar,
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              fontSize: 12.5,
                              fontWeight: 600,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {item.judul}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: ui.textSecondary,
                              marginTop: 2,
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {item.mulai.replace(".", ":")} –{" "}
                            {item.selesai.replace(".", ":")} · {item.lokasi}
                          </div>
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </aside>

          {/* RIGHT MAIN CALENDAR STAGE */}
          <div
            className="sched-main"
            style={{
              display: "flex",
              flexDirection: "column",
              minWidth: 0,
              background: ui.surface,
            }}
          >
            {/* Stage Header + Category Filter Tabs + Date Stepper */}
            <div
              style={{
                padding: "18px 24px 0 24px",
                borderBottom: `1px solid ${ui.border}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 12,
                  flexWrap: "wrap",
                  marginBottom: 14,
                }}
              >
                <div>
                  <h1
                    style={{
                      margin: 0,
                      fontSize: 20,
                      fontWeight: 700,
                      color: ui.textPrimary,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    Kalender Eksekutif & Arsip Notulen
                  </h1>
                  <div
                    style={{
                      fontSize: 12.5,
                      color: ui.textSecondary,
                      marginTop: 3,
                    }}
                  >
                    Jadwal kegiatan Direktur Utama dan dokumen notulen rapat
                    terorganisir berdasarkan tanggal pelaksanaan.
                  </div>
                </div>

                {/* Date Stepper */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {selectedDate !== TODAY_ISO && (
                    <button
                      type="button"
                      onClick={() => selectDateAndSyncMonth(TODAY_ISO)}
                      style={{
                        ...outlineActionBtn,
                        height: 34,
                        color: ui.cobalt,
                        fontWeight: 600,
                      }}
                    >
                      Hari Ini
                    </button>
                  )}

                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      height: 34,
                      padding: "0 6px",
                      borderRadius: 9,
                      border: `1px solid ${ui.border}`,
                      background: ui.subtleBg,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => stepPeriod(-1)}
                      style={{
                        border: 0,
                        background: "transparent",
                        color: ui.textSecondary,
                        cursor: "pointer",
                        padding: 4,
                        display: "inline-flex",
                      }}
                    >
                      <ChevronLeft size={15} />
                    </button>
                    <span
                      style={{
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: ui.textPrimary,
                        padding: "0 6px",
                        whiteSpace: "nowrap",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {periodLabel}
                    </span>
                    <button
                      type="button"
                      onClick={() => stepPeriod(1)}
                      style={{
                        border: 0,
                        background: "transparent",
                        color: ui.textSecondary,
                        cursor: "pointer",
                        padding: 4,
                        display: "inline-flex",
                      }}
                    >
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Category Tabs */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  overflowX: "auto",
                }}
              >
                {(
                  [
                    ["semua", "Semua Item", Layers],
                    ["rapat", "Rapat", Users],
                    ["kunjungan", "Kunjungan", MapPin],
                    ["lainnya", "Kegiatan Lain", Calendar],
                    ["notulen", "Arsip Notulen", FileText],
                  ] as const
                ).map(([key, label, Icon]) => {
                  const active = categoryFilter === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setCategoryFilter(key);
                        if (key === "notulen" && !showNotulenLayer) {
                          setShowNotulenLayer(true);
                        }
                        if (
                          key !== "notulen" &&
                          key !== "semua" &&
                          !showAgendaLayer
                        ) {
                          setShowAgendaLayer(true);
                        }
                      }}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "8px 2px 10px 2px",
                        border: 0,
                        borderBottom: `2px solid ${
                          active ? ui.textPrimary : "transparent"
                        }`,
                        background: "transparent",
                        color: active ? ui.textPrimary : ui.textSecondary,
                        fontSize: 12.5,
                        fontWeight: active ? 600 : 500,
                        fontFamily: "inherit",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <Icon
                        size={13.5}
                        color={active ? ui.textPrimary : ui.textMuted}
                      />
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* VIEW 1 & 2: WEEK & DAY TIMELINE GRID */}
            {(viewMode === "week" || viewMode === "day") && (
              <div className="sched-scroll" style={{ overflowX: "auto", flex: 1 }}>
                <div
                  style={{
                    minWidth: viewMode === "week" ? 820 : 440,
                  }}
                >
                  {/* Column Header Row */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: `72px repeat(${activeTimelineDays.length}, minmax(0, 1fr))`,
                      borderBottom: `1px solid ${ui.border}`,
                      background: ui.sidebarBg,
                    }}
                  >
                    <div
                      style={{
                        padding: "11px 8px",
                        fontSize: 10.5,
                        fontWeight: 600,
                        color: ui.textMuted,
                        textAlign: "center",
                        borderRight: `1px solid ${ui.border}`,
                      }}
                    >
                      WITA
                    </div>
                    {activeTimelineDays.map((dayIso) => {
                      const d = parseIsoDate(dayIso);
                      const isToday = dayIso === TODAY_ISO;
                      const isSelected = dayIso === selectedDate;
                      return (
                        <button
                          key={dayIso}
                          type="button"
                          onClick={() => setSelectedDate(dayIso)}
                          onDoubleClick={() => {
                            setSelectedDate(dayIso);
                            setViewMode("day");
                          }}
                          style={{
                            border: 0,
                            borderRight: `1px solid ${ui.gridLine}`,
                            background: isSelected
                              ? isDark
                                ? "rgba(96, 165, 250, 0.06)"
                                : "rgba(37, 99, 235, 0.03)"
                              : "transparent",
                            padding: "10px 8px",
                            cursor: "pointer",
                            fontFamily: "inherit",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                          }}
                          title="Klik untuk memilih hari, klik ganda untuk fokus tampilan Hari"
                        >
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              letterSpacing: "0.04em",
                              color: isToday ? ui.cobalt : ui.textSecondary,
                            }}
                          >
                            {SHORT_DAY_ID[d.getDay()]}
                          </span>
                          <span
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: "50%",
                              background: isToday ? ui.cobalt : "transparent",
                              color: isToday
                                ? "#FFFFFF"
                                : isSelected
                                  ? ui.textPrimary
                                  : ui.textSecondary,
                              fontSize: 12,
                              fontWeight: isToday || isSelected ? 700 : 600,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {d.getDate()}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* DEDICATED NOTULEN DOCUMENT LANE (Mencegah Tumpukan Sempit di Jam Pagi!) */}
                  {anyNotulenInActiveTimeline && (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: `72px repeat(${activeTimelineDays.length}, minmax(0, 1fr))`,
                        borderBottom: `1px solid ${ui.border}`,
                        background: isDark
                          ? "rgba(24, 29, 40, 0.65)"
                          : "#FAFBFC",
                      }}
                    >
                      <div
                        style={{
                          padding: "10px 8px",
                          borderRight: `1px solid ${ui.border}`,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 2,
                          color: ui.notulenAccent,
                          fontSize: 10,
                          fontWeight: 600,
                        }}
                      >
                        <FileText size={12} />
                        <span>Notulen</span>
                      </div>

                      {activeTimelineDays.map((dayIso) => {
                        const dayNotulens =
                          markersByDate[dayIso]?.notulens || [];
                        return (
                          <div
                            key={`nt-lane-${dayIso}`}
                            style={{
                              padding: "6px 6px",
                              borderRight: `1px solid ${ui.gridLine}`,
                              display: "flex",
                              flexDirection: "column",
                              gap: 4,
                              minWidth: 0,
                            }}
                          >
                            {dayNotulens.map((nt) => (
                              <button
                                key={`lane-nt-${nt.id}`}
                                type="button"
                                onClick={() => setInspectedNotulen(nt)}
                                title={`Notulen: ${nt.judul} (${nt.jam || "09.00"})`}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                  width: "100%",
                                  padding: "5px 8px",
                                  borderRadius: 7,
                                  border: `1px solid ${ui.cardNotulenBorder}`,
                                  background: ui.elevated,
                                  color: ui.textPrimary,
                                  textAlign: "left",
                                  cursor: "pointer",
                                  fontFamily: "inherit",
                                  minWidth: 0,
                                }}
                              >
                                <span
                                  style={{
                                    width: 16,
                                    height: 16,
                                    borderRadius: 4,
                                    background: ui.notulenBadgeBg,
                                    color: ui.notulenAccent,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                  }}
                                >
                                  <FileText size={10} />
                                </span>
                                <span
                                  style={{
                                    fontSize: 11.5,
                                    fontWeight: 600,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    flex: 1,
                                  }}
                                >
                                  {nt.judul}
                                </span>
                              </button>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Hourly Schedule Grid Body */}
                  <div
                    style={{
                      position: "relative",
                      display: "grid",
                      gridTemplateColumns: `72px repeat(${activeTimelineDays.length}, minmax(0, 1fr))`,
                      height: totalTimelineHeight,
                    }}
                  >
                    {/* Left Time Axis */}
                    <div
                      style={{
                        position: "relative",
                        borderRight: `1px solid ${ui.border}`,
                        background: ui.surface,
                      }}
                    >
                      {hoursArray.map((hour, idx) => (
                        <div
                          key={hour}
                          style={{
                            height: HOUR_HEIGHT_PX,
                            borderBottom:
                              idx < hoursArray.length - 1
                                ? `1px solid ${ui.gridLine}`
                                : "none",
                            padding: "6px 10px 0 0",
                            textAlign: "right",
                            fontSize: 11,
                            fontWeight: 500,
                            color: ui.textMuted,
                            fontVariantNumeric: "tabular-nums",
                            boxSizing: "border-box",
                          }}
                        >
                          {String(hour).padStart(2, "0")}:00
                        </div>
                      ))}

                      <div
                        style={{
                          position: "absolute",
                          top: currentIndicatorTop - 8,
                          right: 6,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 10,
                          fontWeight: 700,
                          color: "#10B981",
                          background: ui.surface,
                          padding: "1px 3px",
                          fontVariantNumeric: "tabular-nums",
                          zIndex: 5,
                        }}
                      >
                        08:55
                        <span
                          style={{
                            width: 5,
                            height: 5,
                            background: "#10B981",
                            transform: "rotate(45deg)",
                            display: "inline-block",
                          }}
                        />
                      </div>
                    </div>

                    {/* Hatched Break Strip (12:00 - 13:00 WITA) */}
                    <div
                      className="sched-break-hatch"
                      style={{
                        position: "absolute",
                        left: 72,
                        right: 0,
                        top: (12 - TIMELINE_START_HOUR) * HOUR_HEIGHT_PX,
                        height: HOUR_HEIGHT_PX,
                        pointerEvents: "none",
                        zIndex: 1,
                        borderTop: `1px solid ${ui.gridLine}`,
                        borderBottom: `1px solid ${ui.gridLine}`,
                      }}
                    />

                    {/* Current Time Dashed Line */}
                    <div
                      style={{
                        position: "absolute",
                        left: 72,
                        right: 0,
                        top: currentIndicatorTop,
                        borderTop: "1.5px dashed #10B981",
                        pointerEvents: "none",
                        zIndex: 4,
                        opacity: 0.75,
                      }}
                    />

                    {/* Day Columns */}
                    {activeTimelineDays.map((dayIso) => {
                      const entries = agendaTimelineByDate[dayIso] || [];
                      const isTodayCol = dayIso === TODAY_ISO;

                      return (
                        <div
                          key={dayIso}
                          style={{
                            position: "relative",
                            borderRight: `1px solid ${ui.gridLine}`,
                            background: isTodayCol
                              ? isDark
                                ? "rgba(96, 165, 250, 0.02)"
                                : "rgba(37, 99, 235, 0.012)"
                              : "transparent",
                          }}
                        >
                          {hoursArray.map((hour, idx) => (
                            <div
                              key={hour}
                              onDoubleClick={() =>
                                openAddModal(
                                  dayIso,
                                  `${String(hour).padStart(2, "0")}.00`
                                )
                              }
                              title="Klik ganda untuk menambah agenda pada jam ini"
                              style={{
                                height: HOUR_HEIGHT_PX,
                                borderBottom:
                                  idx < hoursArray.length - 1
                                    ? `1px solid ${ui.gridLine}`
                                    : "none",
                                boxSizing: "border-box",
                              }}
                            />
                          ))}

                          {entries.map((entry) => {
                            const clampedStart = Math.max(
                              TIMELINE_START_HOUR * 60,
                              Math.min(
                                (TIMELINE_END_HOUR + 0.5) * 60,
                                entry.startMin
                              )
                            );
                            const clampedEnd = Math.max(
                              clampedStart + 25,
                              Math.min(
                                (TIMELINE_END_HOUR + 1) * 60,
                                entry.endMin
                              )
                            );
                            const topPx =
                              ((clampedStart - TIMELINE_START_HOUR * 60) / 60) *
                                HOUR_HEIGHT_PX +
                              2;
                            // Tinggi presisi sesuai menit (30 mnt = 40px di dalam slot 44px — tidak pernah menabrak jam berikutnya!)
                            const heightPx = Math.max(
                              34,
                              ((clampedEnd - clampedStart) / 60) *
                                HOUR_HEIGHT_PX -
                                4
                            );
                            const isCompactSlot = heightPx < 54;
                            const widthPct = 100 / entry.totalCols;
                            const leftPct = entry.colIndex * widthPct;

                            const ag = entry.agenda;
                            const acc = getAgendaAccent(ag.jenis, isDark);

                            return (
                              <button
                                key={entry.uid}
                                type="button"
                                onClick={() => setInspectedAgenda(ag)}
                                title={`${ag.judul} (${entry.timeLabel}) · ${ag.lokasi}`}
                                style={{
                                  position: "absolute",
                                  top: topPx,
                                  height: heightPx,
                                  left: `calc(${leftPct}% + 4px)`,
                                  width: `calc(${widthPct}% - 8px)`,
                                  zIndex: 3,
                                  borderRadius: 9,
                                  border: entry.hasConflict
                                    ? "1px solid #F59E0B"
                                    : `1px solid ${ui.cardAgendaBorder}`,
                                  background: ui.cardAgenda,
                                  color: ui.textPrimary,
                                  padding: isCompactSlot
                                    ? "4px 8px 4px 14px"
                                    : "7px 9px 7px 14px",
                                  textAlign: "left",
                                  cursor: "pointer",
                                  fontFamily: "inherit",
                                  overflow: "hidden",
                                  display: "flex",
                                  flexDirection: "column",
                                  justifyContent: isCompactSlot
                                    ? "center"
                                    : "flex-start",
                                  gap: isCompactSlot ? 1 : 2,
                                  opacity: ag.selesaiAcara ? 0.65 : 1,
                                  boxShadow: isDark
                                    ? "0 2px 8px rgba(0, 0, 0, 0.25)"
                                    : "0 1px 3px rgba(15, 23, 42, 0.04)",
                                }}
                              >
                                {/* Floating Inset Accent Pill (Lurus & Rapi, Tanpa Lengkungan Sudut Kasar) */}
                                <span
                                  style={{
                                    position: "absolute",
                                    left: 5,
                                    top: 6,
                                    bottom: 6,
                                    width: 3,
                                    borderRadius: 99,
                                    background: acc.bar,
                                  }}
                                />

                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: 4,
                                    minWidth: 0,
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: isCompactSlot ? 11.5 : 12,
                                      fontWeight: 600,
                                      lineHeight: 1.2,
                                      textDecoration: ag.selesaiAcara
                                        ? "line-through"
                                        : "none",
                                      whiteSpace: isCompactSlot
                                        ? "nowrap"
                                        : undefined,
                                      display: isCompactSlot
                                        ? "block"
                                        : "-webkit-box",
                                      WebkitLineClamp:
                                        !isCompactSlot && heightPx >= 78
                                          ? 2
                                          : 1,
                                      WebkitBoxOrient: "vertical",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {ag.judul}
                                  </span>
                                  {entry.hasConflict && (
                                    <AlertTriangle
                                      size={11}
                                      color="#F59E0B"
                                      style={{ flexShrink: 0 }}
                                    />
                                  )}
                                </div>

                                <div
                                  style={{
                                    fontSize: 10.5,
                                    lineHeight: 1.15,
                                    color: ui.textSecondary,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    fontVariantNumeric: "tabular-nums",
                                  }}
                                >
                                  {entry.timeLabel}
                                </div>

                                {heightPx >= 82 && (
                                  <div
                                    style={{
                                      fontSize: 10,
                                      color: ui.textMuted,
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      marginTop: "auto",
                                    }}
                                  >
                                    {ag.lokasi}
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 3: MONTH MATRIX CALENDAR VIEW */}
            {viewMode === "month" && (
              <div style={{ padding: 20, flex: 1 }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                    border: `1px solid ${ui.border}`,
                    borderRadius: 12,
                    overflow: "hidden",
                  }}
                >
                  {[
                    "Senin",
                    "Selasa",
                    "Rabu",
                    "Kamis",
                    "Jumat",
                    "Sabtu",
                    "Minggu",
                  ].map((dName) => (
                    <div
                      key={dName}
                      style={{
                        padding: "9px 12px",
                        fontSize: 11.5,
                        fontWeight: 600,
                        color: ui.textSecondary,
                        background: ui.sidebarBg,
                        borderBottom: `1px solid ${ui.border}`,
                        borderRight: `1px solid ${ui.gridLine}`,
                      }}
                    >
                      {dName}
                    </div>
                  ))}

                  {miniCells.map((cell) => {
                    const bucket = markersByDate[cell.iso];
                    const dayAgendas = bucket?.agendas || [];
                    const dayNotulens = bucket?.notulens || [];
                    const isToday = cell.iso === TODAY_ISO;
                    const isSelected = cell.iso === selectedDate;

                    return (
                      <div
                        key={cell.iso}
                        onClick={() => setSelectedDate(cell.iso)}
                        style={{
                          minHeight: 120,
                          padding: 8,
                          borderRight: `1px solid ${ui.gridLine}`,
                          borderBottom: `1px solid ${ui.gridLine}`,
                          background: isSelected
                            ? isDark
                              ? "rgba(96, 165, 250, 0.05)"
                              : "#F8FAFF"
                            : cell.inMonth
                              ? ui.surface
                              : ui.sidebarBg,
                          opacity: cell.inMonth ? 1 : 0.45,
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                          cursor: "pointer",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 2,
                          }}
                        >
                          <span
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: "50%",
                              background: isToday ? ui.cobalt : "transparent",
                              color: isToday ? "#FFFFFF" : ui.textPrimary,
                              fontSize: 11.5,
                              fontWeight: isToday ? 700 : 600,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {cell.dayNum}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openAddModal(cell.iso);
                            }}
                            style={{
                              border: 0,
                              background: "transparent",
                              color: ui.textMuted,
                              cursor: "pointer",
                              padding: 2,
                              display: "inline-flex",
                            }}
                            title="Tambah agenda"
                          >
                            <Plus size={12} />
                          </button>
                        </div>

                        {dayAgendas.slice(0, 2).map((ag) => {
                          const acc = getAgendaAccent(ag.jenis, isDark);
                          return (
                            <button
                              key={`m-ag-${ag.id}`}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setInspectedAgenda(ag);
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 5,
                                border: `1px solid ${ui.cardAgendaBorder}`,
                                background: ui.cardAgenda,
                                color: ui.textPrimary,
                                borderRadius: 6,
                                padding: "3px 6px",
                                fontSize: 11,
                                fontWeight: 500,
                                textAlign: "left",
                                cursor: "pointer",
                                fontFamily: "inherit",
                                minWidth: 0,
                              }}
                            >
                              <span
                                style={{
                                  width: 4.5,
                                  height: 4.5,
                                  borderRadius: "50%",
                                  background: acc.bar,
                                  flexShrink: 0,
                                }}
                              />
                              <span
                                style={{
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {ag.mulai} {ag.judul}
                              </span>
                            </button>
                          );
                        })}

                        {dayNotulens.slice(0, 2).map((nt) => (
                          <button
                            key={`m-nt-${nt.id}`}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInspectedNotulen(nt);
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                              border: `1px solid ${ui.cardNotulenBorder}`,
                              background: ui.cardNotulen,
                              color: ui.textPrimary,
                              borderRadius: 6,
                              padding: "3px 6px",
                              fontSize: 11,
                              fontWeight: 500,
                              textAlign: "left",
                              cursor: "pointer",
                              fontFamily: "inherit",
                              minWidth: 0,
                            }}
                          >
                            <FileText
                              size={10}
                              color={ui.notulenAccent}
                              style={{ flexShrink: 0 }}
                            />
                            <span
                              style={{
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {nt.judul}
                            </span>
                          </button>
                        ))}

                        {dayAgendas.length + dayNotulens.length > 4 && (
                          <span
                            style={{
                              fontSize: 10.5,
                              color: ui.textSecondary,
                              fontWeight: 600,
                              paddingLeft: 4,
                            }}
                          >
                            +{dayAgendas.length + dayNotulens.length - 4} lainnya
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* VIEW 4: CLEAN EXECUTIVE LIST VIEW (Tanpa Border Kasar / Tombol Pelangi) */}
            {viewMode === "list" && (
              <div
                style={{
                  padding: "20px 24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 22,
                  flex: 1,
                }}
              >
                {groupedListDates.length === 0 ? (
                  <div
                    style={{
                      padding: 40,
                      textAlign: "center",
                      color: ui.textSecondary,
                      fontSize: 13.5,
                    }}
                  >
                    Tidak ada jadwal agenda maupun dokumen notulen pada filter
                    ini.
                  </div>
                ) : (
                  groupedListDates.map((dateIso) => {
                    const dayAgendas = (markersByDate[dateIso]?.agendas || [])
                      .slice()
                      .sort((a, b) => a.mulai.localeCompare(b.mulai));
                    const dayNotulens = markersByDate[dateIso]?.notulens || [];

                    return (
                      <div key={dateIso}>
                        {/* Date Group Header */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            marginBottom: 10,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color:
                                dateIso === TODAY_ISO
                                  ? ui.cobalt
                                  : ui.textPrimary,
                            }}
                          >
                            {formatFullDateId(dateIso)}
                          </span>
                          {dateIso === TODAY_ISO && (
                            <span
                              style={{
                                fontSize: 10.5,
                                fontWeight: 600,
                                padding: "2px 8px",
                                borderRadius: 99,
                                background: isDark
                                  ? "rgba(96, 165, 250, 0.16)"
                                  : "#EFF6FF",
                                color: ui.cobalt,
                              }}
                            >
                              Hari Ini
                            </span>
                          )}
                          <div
                            style={{
                              flex: 1,
                              height: 1,
                              background: ui.border,
                            }}
                          />
                        </div>

                        {/* Clean Uniform Cards */}
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                          }}
                        >
                          {dayAgendas.map((ag) => {
                            const acc = getAgendaAccent(ag.jenis, isDark);
                            const itemConflicts = detectScheduleConflicts(
                              {
                                tanggal: ag.tanggal,
                                mulai: ag.mulai,
                                selesai: ag.selesai,
                                id: ag.id,
                              },
                              agendas
                            );
                            return (
                              <div
                                key={`lst-ag-${ag.id}`}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  gap: 16,
                                  flexWrap: "wrap",
                                  padding: "12px 16px",
                                  borderRadius: 11,
                                  border: `1px solid ${ui.cardAgendaBorder}`,
                                  background: ui.cardAgenda,
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 14,
                                    minWidth: 240,
                                    flex: 1,
                                  }}
                                >
                                  {/* Inset Vertical Bar */}
                                  <span
                                    style={{
                                      width: 3,
                                      height: 36,
                                      borderRadius: 99,
                                      background: acc.bar,
                                      flexShrink: 0,
                                    }}
                                  />

                                  {/* Tabular Time Column */}
                                  <div
                                    style={{
                                      width: 96,
                                      flexShrink: 0,
                                      fontSize: 12.5,
                                      fontWeight: 600,
                                      color: ui.textSecondary,
                                      fontVariantNumeric: "tabular-nums",
                                    }}
                                  >
                                    {ag.mulai.replace(".", ":")} –{" "}
                                    {ag.selesai.replace(".", ":")}
                                  </div>

                                  <div style={{ minWidth: 0, flex: 1 }}>
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                        flexWrap: "wrap",
                                      }}
                                    >
                                      <span
                                        style={{
                                          fontSize: 14,
                                          fontWeight: 600,
                                          color: ui.textPrimary,
                                          textDecoration: ag.selesaiAcara
                                            ? "line-through"
                                            : "none",
                                          opacity: ag.selesaiAcara ? 0.65 : 1,
                                        }}
                                      >
                                        {ag.judul}
                                      </span>
                                      <span
                                        style={{
                                          fontSize: 11,
                                          fontWeight: 500,
                                          padding: "1px 7px",
                                          borderRadius: 6,
                                          background: acc.tagBg,
                                          color: acc.tagText,
                                        }}
                                      >
                                        {acc.label}
                                      </span>
                                      {ag.selesaiAcara && (
                                        <span
                                          style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: 4,
                                            fontSize: 11,
                                            fontWeight: 500,
                                            color: "#10B981",
                                          }}
                                        >
                                          <CheckCircle2 size={12} /> Selesai
                                        </span>
                                      )}
                                      {itemConflicts.length > 0 && (
                                        <span
                                          style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: 4,
                                            fontSize: 11,
                                            fontWeight: 600,
                                            color: "#D97706",
                                          }}
                                        >
                                          <AlertTriangle size={12} /> Bentrok
                                        </span>
                                      )}
                                    </div>
                                    <div
                                      style={{
                                        fontSize: 12,
                                        color: ui.textMuted,
                                        marginTop: 2,
                                      }}
                                    >
                                      {ag.lokasi} ·{" "}
                                      {ag.labelPeserta ||
                                        `${ag.peserta} peserta`}
                                    </div>
                                  </div>
                                </div>

                                {/* Subtle Executive Outline Buttons */}
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <button
                                    type="button"
                                    onClick={() => toggleAgendaDone(ag.id)}
                                    style={{
                                      ...outlineActionBtn,
                                      color: ag.selesaiAcara
                                        ? ui.textSecondary
                                        : ui.textPrimary,
                                    }}
                                  >
                                    <Check
                                      size={13}
                                      color={
                                        ag.selesaiAcara
                                          ? "#10B981"
                                          : ui.textSecondary
                                      }
                                    />
                                    <span>
                                      {ag.selesaiAcara ? "Selesai" : "Tandai"}
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openCreateNotulenFromAgenda(ag)
                                    }
                                    style={outlineActionBtn}
                                  >
                                    <FilePlus2
                                      size={13}
                                      color={ui.notulenAccent}
                                    />
                                    <span>Notulen</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openEditModal(ag)}
                                    style={outlineActionBtn}
                                  >
                                    <Edit3 size={13} color={ui.textSecondary} />
                                    <span>Ubah</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}

                          {dayNotulens.map((nt) => (
                            <div
                              key={`lst-nt-${nt.id}`}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 16,
                                flexWrap: "wrap",
                                padding: "12px 16px",
                                borderRadius: 11,
                                border: `1px solid ${ui.cardNotulenBorder}`,
                                background: ui.cardNotulen,
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 14,
                                  minWidth: 240,
                                  flex: 1,
                                }}
                              >
                                <span
                                  style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 8,
                                    background: ui.notulenBadgeBg,
                                    color: ui.notulenAccent,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                  }}
                                >
                                  <FileText size={15} />
                                </span>

                                <div
                                  style={{
                                    width: 84,
                                    flexShrink: 0,
                                    fontSize: 12,
                                    fontWeight: 500,
                                    color: ui.textSecondary,
                                    fontVariantNumeric: "tabular-nums",
                                  }}
                                >
                                  {(nt.jam || "09:00").split(/[–—-]/)[0]?.trim().replace(".", ":")}{" "}
                                  WITA
                                </div>

                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 8,
                                      flexWrap: "wrap",
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: 14,
                                        fontWeight: 600,
                                        color: ui.textPrimary,
                                      }}
                                    >
                                      {nt.judul}
                                    </span>
                                    <span
                                      style={{
                                        fontSize: 11,
                                        fontWeight: 600,
                                        padding: "1px 7px",
                                        borderRadius: 6,
                                        background: ui.notulenBadgeBg,
                                        color: ui.notulenAccent,
                                      }}
                                    >
                                      Dokumen Notulen
                                    </span>
                                  </div>
                                  <div
                                    style={{
                                      fontSize: 12,
                                      color: ui.textMuted,
                                      marginTop: 2,
                                    }}
                                  >
                                    {nt.lokasi || "Ruang Rapat Utama"} ·{" "}
                                    {nt.keputusan.length} poin keputusan
                                  </div>
                                </div>
                              </div>

                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                  flexWrap: "wrap",
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    readNotulenAloud(nt.id, "lengkap")
                                  }
                                  style={outlineActionBtn}
                                >
                                  <Volume2 size={13} color={ui.notulenAccent} />
                                  <span>Bacakan</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setInspectedNotulen(nt)}
                                  style={outlineActionBtn}
                                >
                                  <span>Ringkasan</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL DETAIL JADWAL AGENDA */}
      {inspectedAgenda && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 82,
            background: "rgba(10, 13, 20, 0.55)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setInspectedAgenda(null)}
        >
          <div
            className="c"
            style={{
              width: "100%",
              maxWidth: 460,
              background: ui.elevated,
              color: ui.textPrimary,
              border: `1px solid ${ui.border}`,
              borderRadius: 16,
              padding: 22,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <div>
                <span
                  style={{
                    display: "inline-block",
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: 6,
                    background: getAgendaAccent(inspectedAgenda.jenis, isDark)
                      .tagBg,
                    color: getAgendaAccent(inspectedAgenda.jenis, isDark)
                      .tagText,
                    marginBottom: 8,
                  }}
                >
                  Jadwal ·{" "}
                  {getAgendaAccent(inspectedAgenda.jenis, isDark).label}
                </span>
                <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.3 }}>
                  {inspectedAgenda.judul}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectedAgenda(null)}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  border: `1px solid ${ui.border}`,
                  background: ui.subtleBg,
                  color: ui.textSecondary,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={15} />
              </button>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 7,
                fontSize: 13,
                color: ui.textSecondary,
                background: ui.subtleBg,
                padding: 12,
                borderRadius: 10,
                border: `1px solid ${ui.border}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Calendar size={14} color={ui.textMuted} />
                <span>{formatFullDateId(inspectedAgenda.tanggal)}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Clock size={14} color={ui.textMuted} />
                <span>
                  {inspectedAgenda.mulai} – {inspectedAgenda.selesai} WITA
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <MapPin size={14} color={ui.textMuted} />
                <span>{inspectedAgenda.lokasi}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Users size={14} color={ui.textMuted} />
                <span>
                  {inspectedAgenda.labelPeserta ||
                    `${inspectedAgenda.peserta} peserta`}
                </span>
              </div>
              {inspectedAgenda.berulang !== "tidak" && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Repeat size={14} color={ui.textMuted} />
                  <span>Berulang {inspectedAgenda.berulang}</span>
                </div>
              )}
            </div>

            {inspectedAgenda.catatan && (
              <div
                style={{
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: ui.textSecondary,
                }}
              >
                {inspectedAgenda.catatan}
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 8,
                paddingTop: 4,
              }}
            >
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => {
                    toggleAgendaDone(inspectedAgenda.id);
                    setInspectedAgenda(null);
                  }}
                  style={outlineActionBtn}
                >
                  <Check size={13} color="#10B981" />
                  <span>
                    {inspectedAgenda.selesaiAcara
                      ? "Buka Kembali"
                      : "Tandai Selesai"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const target = inspectedAgenda;
                    setInspectedAgenda(null);
                    openCreateNotulenFromAgenda(target);
                  }}
                  style={outlineActionBtn}
                >
                  <FilePlus2 size={13} color={ui.notulenAccent} />
                  <span>Buat Notulen</span>
                </button>
              </div>

              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  onClick={() => openEditModal(inspectedAgenda)}
                  style={outlineActionBtn}
                >
                  <Edit3 size={13} />
                  <span>Ubah</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    requestDeleteAgenda(inspectedAgenda.id);
                    setInspectedAgenda(null);
                  }}
                  style={{
                    ...outlineActionBtn,
                    color: "#EF4444",
                  }}
                  title="Hapus jadwal"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PREVIEW NOTULEN RAPAT */}
      {inspectedNotulen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 82,
            background: "rgba(10, 13, 20, 0.55)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setInspectedNotulen(null)}
        >
          <div
            className="c"
            style={{
              width: "100%",
              maxWidth: 540,
              maxHeight: "86vh",
              overflowY: "auto",
              background: ui.elevated,
              color: ui.textPrimary,
              border: `1px solid ${ui.border}`,
              borderRadius: 16,
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <div>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: 6,
                    background: ui.notulenBadgeBg,
                    color: ui.notulenAccent,
                    marginBottom: 8,
                  }}
                >
                  <FileText size={11} /> Dokumen Notulen Rapat
                </span>
                <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.3 }}>
                  {inspectedNotulen.judul}
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    color: ui.textSecondary,
                    marginTop: 4,
                  }}
                >
                  {inspectedNotulen.tanggal} ·{" "}
                  {inspectedNotulen.jam || "09.00"} WITA ·{" "}
                  {inspectedNotulen.lokasi || "Ruang Rapat Utama"}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInspectedNotulen(null)}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  border: `1px solid ${ui.border}`,
                  background: ui.subtleBg,
                  color: ui.textSecondary,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={15} />
              </button>
            </div>

            <div
              style={{
                background: ui.subtleBg,
                border: `1px solid ${ui.border}`,
                padding: 13,
                borderRadius: 10,
                fontSize: 13,
                lineHeight: 1.55,
                color: ui.textPrimary,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: ui.textMuted,
                  marginBottom: 4,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Ringkasan Eksekutif
              </div>
              {inspectedNotulen.ringkasan}
            </div>

            {inspectedNotulen.keputusan.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: ui.textSecondary,
                    marginBottom: 6,
                  }}
                >
                  Poin Keputusan ({inspectedNotulen.keputusan.length})
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 6 }}
                >
                  {inspectedNotulen.keputusan.map((k, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        gap: 8,
                        fontSize: 12.5,
                        lineHeight: 1.45,
                        color: ui.textPrimary,
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 600,
                          color: ui.textMuted,
                          flexShrink: 0,
                        }}
                      >
                        {idx + 1}.
                      </span>
                      <span>{k}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                flexWrap: "wrap",
                paddingTop: 6,
              }}
            >
              <button
                type="button"
                onClick={() => readNotulenAloud(inspectedNotulen.id, "lengkap")}
                style={{
                  ...outlineActionBtn,
                  height: 36,
                  padding: "0 13px",
                }}
              >
                <Volume2 size={14} color={ui.notulenAccent} />
                <span>Bacakan Notulen</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = inspectedNotulen.id;
                  setInspectedNotulen(null);
                  setSelectedNotulenId(id);
                  navigate({ to: "/notulen" });
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  height: 36,
                  padding: "0 14px",
                  borderRadius: 9,
                  border: 0,
                  background: ui.primaryBtnBg,
                  color: ui.primaryBtnText,
                  fontSize: 12.5,
                  fontWeight: 600,
                  fontFamily: "inherit",
                  cursor: "pointer",
                }}
              >
                <span>Buka Halaman Notulen</span>
                <ExternalLink size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH / UBAH AGENDA MANUAL */}
      {formOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 84,
            background: "rgba(10, 13, 20, 0.55)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setFormOpen(false)}
        >
          <div
            className="c"
            style={{
              width: "100%",
              maxWidth: 520,
              background: ui.elevated,
              color: ui.textPrimary,
              border: `1px solid ${ui.border}`,
              borderRadius: 16,
              padding: 24,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 17 }}>
                {editingId !== null ? "Ubah Jadwal Agenda" : "Agenda Baru Dirut"}
              </div>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: `1px solid ${ui.border}`,
                  background: ui.subtleBg,
                  color: ui.textSecondary,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={15} />
              </button>
            </div>

            {conflicts.length > 0 && (
              <div
                style={{
                  marginTop: 12,
                  background: isDark ? "rgba(245, 158, 11, 0.12)" : "#FFFBEB",
                  border: "1px solid #F59E0B",
                  borderRadius: 10,
                  padding: "9px 12px",
                  fontSize: 12.5,
                  color: isDark ? "#FCD34D" : "#92400E",
                  display: "flex",
                  gap: 8,
                }}
              >
                <AlertTriangle
                  size={15}
                  style={{ flexShrink: 0, marginTop: 1 }}
                />
                <span>
                  <b>Bentrok Jadwal!</b> Waktu bertabrakan dengan{" "}
                  {conflicts
                    .map((c) => `${c.judul} (${c.mulai}–${c.selesai})`)
                    .join(", ")}
                  .
                </span>
              </div>
            )}

            <form
              onSubmit={handleSaveManual}
              style={{
                marginTop: 14,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    marginBottom: 4,
                    color: ui.textSecondary,
                  }}
                >
                  Judul Kegiatan
                </label>
                <input
                  required
                  value={judul}
                  onChange={(e) => setJudul(e.target.value)}
                  placeholder="Contoh: Rapat Evaluasi Kehilangan Air (NRW)"
                  style={modalInputStyle}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.25fr 1fr 1fr",
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
                      color: ui.textSecondary,
                    }}
                  >
                    Tanggal
                  </label>
                  <input
                    type="date"
                    value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)}
                    style={modalInputStyle}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      fontWeight: 600,
                      marginBottom: 4,
                      color: ui.textSecondary,
                    }}
                  >
                    Mulai
                  </label>
                  <input
                    value={mulai}
                    onChange={(e) => setMulai(e.target.value)}
                    placeholder="09.00"
                    style={modalInputStyle}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      fontWeight: 600,
                      marginBottom: 4,
                      color: ui.textSecondary,
                    }}
                  >
                    Selesai
                  </label>
                  <input
                    value={selesai}
                    onChange={(e) => setSelesai(e.target.value)}
                    placeholder="10.30"
                    style={modalInputStyle}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.3fr 1fr",
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
                      color: ui.textSecondary,
                    }}
                  >
                    Lokasi
                  </label>
                  <input
                    value={lokasi}
                    onChange={(e) => setLokasi(e.target.value)}
                    style={modalInputStyle}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      fontWeight: 600,
                      marginBottom: 4,
                      color: ui.textSecondary,
                    }}
                  >
                    Kategori
                  </label>
                  <select
                    value={jenis}
                    onChange={(e) => setJenis(e.target.value as JenisAgenda)}
                    style={modalInputStyle}
                  >
                    <option value="rapat">Rapat</option>
                    <option value="kunjungan">Kunjungan</option>
                    <option value="lainnya">Kegiatan Lain</option>
                  </select>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
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
                      color: ui.textSecondary,
                    }}
                  >
                    Jumlah Peserta
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={peserta}
                    onChange={(e) => setPeserta(Number(e.target.value))}
                    style={modalInputStyle}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      fontWeight: 600,
                      marginBottom: 4,
                      color: ui.textSecondary,
                    }}
                  >
                    Pengulangan
                  </label>
                  <select
                    value={berulang}
                    onChange={(e) =>
                      setBerulang(e.target.value as RecurrenceType)
                    }
                    style={modalInputStyle}
                  >
                    <option value="tidak">Tidak berulang</option>
                    <option value="mingguan">Mingguan</option>
                    <option value="bulanan">Bulanan</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    marginBottom: 4,
                    color: ui.textSecondary,
                  }}
                >
                  Catatan Kegiatan
                </label>
                <textarea
                  rows={2}
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  style={modalInputStyle}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                  marginTop: 6,
                }}
              >
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  style={{ ...outlineActionBtn, height: 36, padding: "0 14px" }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    height: 36,
                    padding: "0 16px",
                    borderRadius: 9,
                    border: 0,
                    background: ui.primaryBtnBg,
                    color: ui.primaryBtnText,
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: "inherit",
                    cursor: "pointer",
                  }}
                >
                  Simpan Agenda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
