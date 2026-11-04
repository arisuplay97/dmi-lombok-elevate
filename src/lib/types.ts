export type UserRole = "dirut" | "sekretariat";

export type JenisAgenda = "rapat" | "kunjungan" | "lainnya";

export type RecurrenceType = "tidak" | "mingguan" | "bulanan";

export interface AgendaItem {
  id: number;
  judul: string;
  tanggal: string; // YYYY-MM-DD
  mulai: string; // HH.mm
  selesai: string; // HH.mm
  lokasi: string;
  jenis: JenisAgenda;
  peserta: number;
  labelPeserta?: string;
  catatan?: string;
  sumber: "manual" | "suara";
  berulang: RecurrenceType;
  selesaiAcara: boolean;
}

export interface MingguanBar {
  hari: string;
  rapat: number;
  kunjungan: number;
  lainnya: number;
  aktif?: boolean;
}

export type StatusNotulen =
  | "diunggah"
  | "diproses"
  | "diperiksa"
  | "selesai"
  | "gagal";

export interface NotulenPhoto {
  id: string;
  url: string;
  caption: string;
}

export interface NotulenItem {
  id: number;
  judul: string;
  tanggal: string; // e.g. "2 Nov 2026"
  tanggalIso: string; // YYYY-MM-DD
  jam?: string; // e.g. "09.00 – 10.35"
  lokasi?: string; // e.g. "Ruang Rapat Utama"
  pimpinan?: string; // e.g. "Direktur Utama"
  peserta?: number;
  sumberInput?: "audio" | "manual";
  durasi: string; // e.g. "1 jam 12 menit"
  durasiMenit: number;
  audioFileName?: string;
  audioDihapus?: boolean;
  dokumentasiFoto?: NotulenPhoto[];
  status: StatusNotulen;
  infoSingkat: string;
  ringkasan: string;
  keputusan: string[];
  transkrip: string;
  tugasCount: number;
}

export interface TugasItem {
  id: number;
  notulenId?: number;
  judul: string;
  pj: string;
  tenggat: string;
  segera: boolean;
  selesai: boolean;
}

export interface WaLogItem {
  id: number;
  waktu: string;
  labelDashboard?: string;
  tujuan: string;
  isi: string;
  status: "Terkirim" | "Terjadwal" | "Gagal";
  chatId?: string;
}

export interface WaRecipient {
  id: number;
  nama: string;
  peran: UserRole;
  noWa: string;
  aktif: boolean;
}

export type AiLlmProvider =
  | "gemini"
  | "openai"
  | "anthropic"
  | "groq"
  | "custom";

export type AiAuthScheme =
  | "bearer"
  | "x-api-key"
  | "api-key"
  | "custom-header"
  | "none";

export type AiSttProvider =
  | "browser"
  | "openai-whisper"
  | "groq-whisper"
  | "custom";

export type AiTtsProvider =
  | "browser"
  | "openai-tts"
  | "elevenlabs"
  | "cartesia"
  | "custom";

export type WaGatewayProvider =
  | "Wangsaf"
  | "WhatsApp Business API"
  | "Custom Webhook";

export interface AssistantSettings {
  namaDirut: string;
  peranAktif: UserRole;
  darkMode: boolean;
  wakeWordAktif: boolean;
  ttsBriefingAktif: boolean;
  pengingatMenit: number[];
  jamSenyapMulai: string;
  jamSenyapSelesai: string;
  jamBriefingPagi: string;
  selectedVoiceURI: string;
  speechRate: number;

  // Anti-Echo / Anti Dengar Suara Sendiri
  echoGuardAktif: boolean;
  micResumeDelayMs: number;

  // Keamanan Penyimpanan Kunci API
  persistSecretsOnDevice: boolean;

  // Pengaturan WhatsApp Gateway (Default: Wangsaf API v1)
  waGateway: WaGatewayProvider;
  waBaseUrl: string;
  waNomorKhusus: string;
  waApiToken: string; // Header Api-Key perangkat Wangsaf (tidak pernah di-hardcode)

  // Pengaturan Engine & API AI Terpadu (+ Custom AI)
  aiProvider: AiLlmProvider;
  aiCustomName: string;
  aiModel: string;
  aiApiKey: string;
  aiBaseUrl: string;
  aiCustomPath: string;
  aiAuthScheme: AiAuthScheme;
  aiCustomHeader: string;

  sttProvider: AiSttProvider;
  sttBaseUrl: string;
  sttApiKey: string;

  ttsProvider: AiTtsProvider;
  ttsBaseUrl: string;
  ttsApiKey: string;
  ttsVoiceId: string;
  ttsModelId: string;

  // Cartesia Sonic TTS (https://docs.cartesia.ai)
  cartesiaApiKey: string;
  cartesiaModelId: string;
  cartesiaVoiceId: string;
  cartesiaBaseUrl: string;
  cartesiaVersion: string;
}

export interface VoiceAgendaDraft {
  judul: string;
  tanggal: string;
  mulai: string;
  selesai: string;
  lokasi: string;
  jenis: JenisAgenda;
  peserta: number;
  catatan: string;
  kalimatAsli: string;
}

export interface NotulenFormPrefill {
  judul: string;
  tanggalIso: string;
  jam: string;
  lokasi: string;
  peserta: number;
  catatanAwal?: string;
}

export interface ChatTurn {
  id: number;
  role: "user" | "assistant";
  text: string;
  waktu: string;
}

export type DialogStage =
  | "idle"
  | "active_session"
  | "awaiting_notulen_choice"
  | "awaiting_notulen_followup";

export type NotulenReadScope = "lengkap" | "keputusan" | "tugas";
