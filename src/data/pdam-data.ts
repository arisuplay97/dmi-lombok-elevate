import type {
  AgendaItem,
  AssistantSettings,
  NotulenItem,
  TugasItem,
  WaLogItem,
  WaRecipient,
} from "@/lib/types";

/**
 * Mengambil tanggal hari ini secara dinamis berdasarkan Zona Waktu Indonesia Tengah (WITA / UTC+8).
 * Wilayah: Lombok Tengah, NTB, Bali, Makassar.
 */
export function getWitaIsoDate(): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Makassar",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    const now = new Date();
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
    const dt = new Date(utcMs + 8 * 3600000);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const d = String(dt.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
}

export const TODAY_ISO = getWitaIsoDate();

export const INITIAL_SETTINGS: AssistantSettings = {
  namaDirut: "Pak Dirut",
  peranAktif: "dirut",
  darkMode: false,
  wakeWordAktif: true,
  ttsBriefingAktif: true,
  pengingatMenit: [30, 5, 0],
  jamSenyapMulai: "21:00",
  jamSenyapSelesai: "06:00",
  jamBriefingPagi: "06:30",
  selectedVoiceURI: "",
  speechRate: 1.02,

  // Proteksi Anti-Gema agar asisten tidak pernah mendengar suaranya sendiri dari speaker
  echoGuardAktif: true,
  micResumeDelayMs: 1200,

  // Simpan pengaturan & kredensial di perangkat agar tidak ter-reset saat refresh halaman
  persistSecretsOnDevice: true,

  // WhatsApp Gateway: Wangsaf API v1 (https://docs.wangsaf.com)
  waGateway: "Wangsaf",
  waBaseUrl: import.meta.env.VITE_WANGSAF_BASE_URL || "https://api.wangsaf.com/v1",
  waNomorKhusus: "+62 819-0700-1122 (Perangkat Wangsaf Tiara)",
  waApiToken: "",

  // Default AI Engine Settings (tanpa kunci hardcode)
  aiProvider: "gemini",
  aiCustomName: "OpenRouter / DeepSeek / Ollama",
  aiModel: "gemini-2.5-flash",
  aiApiKey: "",
  aiBaseUrl: import.meta.env.VITE_AI_CUSTOM_BASE_URL || "",
  aiCustomPath: "/chat/completions",
  aiAuthScheme: "bearer",
  aiCustomHeader: "X-API-Key",

  sttProvider: "browser",
  sttBaseUrl: "",
  sttApiKey: "",

  ttsProvider: "browser",
  ttsBaseUrl: "",
  ttsApiKey: "",
  ttsVoiceId: "EXAVITQu4vr4xnSDxMaL",
  ttsModelId: "eleven_flash_v2_5",

  // Cartesia Sonic TTS (https://docs.cartesia.ai)
  cartesiaApiKey: "",
  cartesiaModelId: "sonic-3",
  cartesiaVoiceId: "f786b574-daa5-4673-aa0c-cbe3e8534c02",
  cartesiaBaseUrl: "https://api.cartesia.ai",
  cartesiaVersion: "2025-04-16",
};

export const INITIAL_RECIPIENTS: WaRecipient[] = [
  {
    id: 1,
    nama: "Direktur Utama",
    peran: "dirut",
    noWa: "0812-3700-0001",
    aktif: true,
  },
  {
    id: 2,
    nama: "Kasubbag Sekretariat & Humas",
    peran: "sekretariat",
    noWa: "0819-1744-2210",
    aktif: true,
  },
  {
    id: 3,
    nama: "Staf Protokol & Agenda Dirut",
    peran: "sekretariat",
    noWa: "0878-6412-8890",
    aktif: true,
  },
];

export const INITIAL_AGENDA: AgendaItem[] = [
  {
    id: 1,
    judul: "Penandatanganan berkas",
    tanggal: "2026-11-04",
    mulai: "07.00",
    selesai: "07.30",
    lokasi: "Ruang Dirut",
    jenis: "lainnya",
    peserta: 1,
    labelPeserta: "Sekretariat Direksi",
    catatan: "Penandatanganan SK pengadaan pipa distribusi & surat keluar.",
    sumber: "manual",
    berulang: "tidak",
    selesaiAcara: true,
  },
  {
    id: 2,
    judul: "Koordinasi Bagian Keuangan",
    tanggal: "2026-11-04",
    mulai: "07.30",
    selesai: "08.15",
    lokasi: "Ruang Rapat Kecil",
    jenis: "rapat",
    peserta: 4,
    labelPeserta: "4 peserta",
    catatan: "Review realisasi penerimaan rekening air Oktober 2026.",
    sumber: "manual",
    berulang: "mingguan",
    selesaiAcara: true,
  },
  {
    id: 3,
    judul: "Pemantauan Posko Pengaduan",
    tanggal: "2026-11-04",
    mulai: "08.15",
    selesai: "08.45",
    lokasi: "Kantor Pelayanan",
    jenis: "kunjungan",
    peserta: 2,
    labelPeserta: "Siaga Tiara",
    catatan: "Pengecekan respon cepat laporan gangguan distribusi pelanggan.",
    sumber: "manual",
    berulang: "tidak",
    selesaiAcara: true,
  },
  {
    id: 4,
    judul: "Rapat Direksi",
    tanggal: "2026-11-04",
    mulai: "09.00",
    selesai: "10.30",
    lokasi: "Ruang Rapat Utama",
    jenis: "rapat",
    peserta: 8,
    labelPeserta: "8 peserta",
    catatan:
      "Evaluasi capaian layanan triwulan IV & percepatan sambungan rumah baru.",
    sumber: "manual",
    berulang: "mingguan",
    selesaiAcara: false,
  },
  {
    id: 5,
    judul: "Tinjauan Instalasi Pengolahan",
    tanggal: "2026-11-04",
    mulai: "11.00",
    selesai: "12.00",
    lokasi: "Lokasi IPA",
    jenis: "kunjungan",
    peserta: 5,
    labelPeserta: "Kunjungan lapangan",
    catatan:
      "Inspeksi debit air baku, kualitas kekeruhan, dan pompa distribusi IPA.",
    sumber: "manual",
    berulang: "tidak",
    selesaiAcara: false,
  },
  {
    id: 6,
    judul: "Koordinasi Kabag Teknik",
    tanggal: "2026-11-04",
    mulai: "14.00",
    selesai: "15.00",
    lokasi: "Ruang Dirut",
    jenis: "rapat",
    peserta: 3,
    labelPeserta: "3 peserta",
    catatan:
      "Pembahasan penurunan tingkat kehilangan air (NRW) zona wilayah barat.",
    sumber: "suara",
    berulang: "tidak",
    selesaiAcara: false,
  },
  {
    id: 7,
    judul: "Apel Pagi & Pengarahan Pegawai",
    tanggal: "2026-11-02",
    mulai: "07.30",
    selesai: "08.15",
    lokasi: "Halaman Kantor Pusat Perumdam",
    jenis: "lainnya",
    peserta: 65,
    labelPeserta: "Seluruh staf pusat",
    catatan: "Arahan kedisiplinan dan pelayanan prima pelanggan.",
    sumber: "manual",
    berulang: "mingguan",
    selesaiAcara: true,
  },
  {
    id: 8,
    judul: "Rapat Evaluasi Cabang Praya & Pujut",
    tanggal: "2026-11-05",
    mulai: "09.30",
    selesai: "11.30",
    lokasi: "Ruang Rapat Utama",
    jenis: "rapat",
    peserta: 10,
    labelPeserta: "10 peserta",
    catatan: "Evaluasi distribusi kawasan selatan & KEK Mandalika.",
    sumber: "manual",
    berulang: "bulanan",
    selesaiAcara: false,
  },
  {
    id: 9,
    judul: "Koordinasi Pengawasan Mutu Air & Lab",
    tanggal: "2026-11-05",
    mulai: "13.30",
    selesai: "14.30",
    lokasi: "Ruang Rapat Kecil",
    jenis: "rapat",
    peserta: 6,
    labelPeserta: "Tim Penguji Lab Air",
    catatan: "Verifikasi standar kekeruhan dan desinfeksi sebelum musim penghujan.",
    sumber: "manual",
    berulang: "tidak",
    selesaiAcara: false,
  },
  {
    id: 10,
    judul: "Briefing Tim Reaksi Cepat Aduan",
    tanggal: "2026-11-05",
    mulai: "15.00",
    selesai: "16.00",
    lokasi: "Posko Siaga Tiara",
    jenis: "rapat",
    peserta: 8,
    labelPeserta: "Petugas Lapangan & Operator",
    catatan: "Optimalisasi respon cepat tiket aduan WhatsApp pelanggan.",
    sumber: "suara",
    berulang: "tidak",
    selesaiAcara: false,
  },
  {
    id: 11,
    judul: "Kunjungan Sumber Mata Air Aik Berik",
    tanggal: "2026-11-06",
    mulai: "08.30",
    selesai: "11.00",
    lokasi: "Batukliang Utara",
    jenis: "kunjungan",
    peserta: 6,
    labelPeserta: "Tim Teknik & Transmisi",
    catatan:
      "Monitoring perlindungan mata air dan jaringan pipa transmisi utama.",
    sumber: "suara",
    berulang: "tidak",
    selesaiAcara: false,
  },
];

export const MINGGUAN_CHART = [
  {
    hari: "Sen",
    rapatPx: 60,
    kunjunganPx: 30,
    lainnyaPx: 40,
    rapat: 2,
    kunjungan: 1,
    lainnya: 1,
  },
  {
    hari: "Sel",
    rapatPx: 100,
    kunjunganPx: 50,
    lainnyaPx: 30,
    rapat: 3,
    kunjungan: 2,
    lainnya: 1,
  },
  {
    hari: "Rab",
    rapatPx: 130,
    kunjunganPx: 150,
    lainnyaPx: 60,
    rapat: 3,
    kunjungan: 2,
    lainnya: 1,
    aktif: true,
  },
  {
    hari: "Kam",
    rapatPx: 70,
    kunjunganPx: 20,
    lainnyaPx: 80,
    rapat: 2,
    kunjungan: 1,
    lainnya: 3,
  },
  {
    hari: "Jum",
    rapatPx: 50,
    kunjunganPx: 90,
    lainnyaPx: 30,
    rapat: 1,
    kunjungan: 3,
    lainnya: 1,
  },
];

export const NOTULEN_BASE_STATS = {
  historicalTotalOffset: 42, // 42 arsip + 6 item aktif = 48 total
  historicalBulanIniOffset: 4, // 4 + 5 bulan Nov = 9 bulan ini
  historicalTugasOffset: 115, // 115 + 11 = 126 tugas dihasilkan
  historicalJamOffset: 56, // ~62 jam total rekaman
  historicalSelesaiOffset: 42, // 42 + 3 selesai = 45 selesai
};

// Placeholder ilustrasi dokumentasi rapat SVG ringan untuk contoh awal
const SAMPLE_MEETING_SVG_1 =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="380" viewBox="0 0 640 380">
      <rect width="640" height="380" fill="#14171F"/>
      <rect x="28" y="28" width="584" height="324" rx="20" fill="#232833"/>
      <circle cx="150" cy="155" r="36" fill="#6B7BFF"/>
      <circle cx="320" cy="145" r="42" fill="#A6F23A"/>
      <circle cx="490" cy="155" r="36" fill="#6B7BFF"/>
      <rect x="90" y="220" width="460" height="70" rx="14" fill="#14171F"/>
      <text x="320" y="260" text-anchor="middle" fill="#FFFFFF" font-family="sans-serif" font-size="16" font-weight="bold">Dokumentasi Rapat Direksi Bulanan · Ruang Rapat Utama</text>
    </svg>`
  );

export const INITIAL_NOTULEN: NotulenItem[] = [
  {
    id: 1,
    judul: "Rapat Direksi Bulanan",
    tanggal: "2 Nov 2026",
    tanggalIso: "2026-11-02",
    jam: "09.00 – 10.35",
    lokasi: "Ruang Rapat Utama",
    pimpinan: "Direktur Utama",
    peserta: 12,
    sumberInput: "audio",
    durasi: "1 jam 35 menit",
    durasiMenit: 95,
    audioFileName: "rapat-direksi-bulanan-02nov.m4a",
    audioDihapus: false,
    dokumentasiFoto: [
      {
        id: "foto-init-1",
        url: SAMPLE_MEETING_SVG_1,
        caption: "Suasana Rapat Direksi Bulanan bersama para Kepala Bagian",
      },
    ],
    status: "selesai",
    infoSingkat: "3 keputusan · 5 tugas",
    ringkasan:
      "Evaluasi kinerja operasional dan keuangan Perumdam Tirta Ardhia Rinjani bulan Oktober 2026. Fokus utama diarahkan pada percepatan perbaikan kebocoran jaringan pipa distribusi wilayah barat, optimalisasi penagihan rekening air, serta peningkatan waktu tanggap layanan pengaduan pelanggan.",
    keputusan: [
      "Menyetujui alokasi percepatan penggantian pipa distribusi tua sepanjang 1,8 kilometer di jalur wilayah barat pada pertengahan November.",
      "Mewajibkan respon awal posko pengaduan pelanggan maksimal 30 menit sejak laporan diterima oleh sistem Siaga Tiara.",
      "Laporan realisasi pendapatan dan efisiensi biaya operasional diserahkan setiap tanggal 5 bulan berjalan kepada Direktur Utama.",
    ],
    transkrip: `[00:00:12] Direktur Utama: Bismillahirrahmanirrahim, assalamualaikum warahmatullahi wabarakatuh. Pagi ini kita bahas evaluasi capaian Oktober dan prioritas November untuk Perumdam Tirta Ardhia Rinjani.\n[00:04:25] Kabag Teknik: Izin melaporkan Pak Dirut, tekanan distribusi wilayah barat sempat menurun karena kebocoran di dua titik pipa PVC lama. Tim sudah menyiapkan rencana penggantian sepanjang 1,8 kilometer.\n[00:12:40] Kabag Keuangan: Untuk realisasi penerimaan rekening air Oktober mencapai 93,4 persen dari target. Rekap rincian per cabang sedang kami finalisasi besok.\n[00:25:10] Kabag Hubungan Langganan: Terkait aduan berulang di dua perumahan Praya Barat, kami sudah jadwalkan inspeksi meter dan jam gilir aliran.\n[00:41:05] Direktur Utama: Baik, saya minta tiga hal dikunci hari ini: rencana perbaikan pipa wilayah barat diselesaikan besok, laporan realisasi Oktober masuk meja saya besok sore, dan aduan pelanggan berulang tuntas Jumat ini.`,
    tugasCount: 5,
  },
  {
    id: 2,
    judul: "Koordinasi Unit Pelayanan",
    tanggal: "3 Nov 2026",
    tanggalIso: "2026-11-03",
    jam: "10.00 – 10.54",
    lokasi: "Ruang Rapat Pelayanan",
    pimpinan: "Direktur Utama",
    peserta: 9,
    sumberInput: "audio",
    durasi: "54 menit",
    durasiMenit: 54,
    audioFileName: "koordinasi-unit-pelayanan-03nov.mp3",
    audioDihapus: false,
    dokumentasiFoto: [],
    status: "diperiksa",
    infoSingkat: "Menunggu pemeriksaan sekretariat",
    ringkasan:
      "Pembahasan sinkronisasi loket pembayaran digital, penertiban tunggakan pelanggan lebih dari 3 bulan, serta kesiapan petugas baca meter di seluruh unit pelayanan cabang Lombok Tengah.",
    keputusan: [
      "Penerapan notifikasi tagihan WhatsApp lebih awal setiap tanggal 3 bagi pelanggan dengan riwayat keterlambatan.",
      "Kalibrasi ulang jadwal dan rute petugas baca meter zona padat pelanggan sebelum tanggal 10 setiap bulan.",
    ],
    transkrip: `[00:00:08] Direktur Utama: Kita evaluasi alur pelayanan cabang supaya masyarakat makin mudah mengakses layanan air bersih maupun pengaduan.\n[00:08:19] Kepala Unit Pelayanan: Saat ini 68 persen pembayaran sudah melalui kanal digital dan mitra loket, namun masih ada beberapa titik dengan akurasi foto meter yang perlu ditingkatkan.\n[00:19:42] Sekretariat: Catatan draf keputusan dan penugasan ke Hubungan Langganan sudah diekstrak oleh AI dan siap diverifikasi sebelum dibagikan ke seluruh Kepala Unit.`,
    tugasCount: 3,
  },
  {
    id: 3,
    judul: "Rapat Koordinasi Sekper",
    tanggal: "4 Nov 2026",
    tanggalIso: "2026-11-04",
    jam: "07.30 – 08.15",
    lokasi: "Ruang Rapat Sekretariat",
    pimpinan: "Kasubbag Sekper & Humas",
    peserta: 6,
    sumberInput: "audio",
    durasi: "45 menit",
    durasiMenit: 45,
    audioFileName: "rakor-sekper-04nov.m4a",
    audioDihapus: false,
    dokumentasiFoto: [],
    status: "selesai",
    infoSingkat: "2 keputusan · 2 tugas",
    ringkasan:
      "Koordinasi internal Sekretariat Perusahaan mengenai tata kelola surat masuk/keluar, pengelolaan jadwal harian Direktur Utama, serta sinkronisasi diseminasi informasi publik lewat media massa.",
    keputusan: [
      "Penertiban alur disposisi digital Direktur Utama maksimal 1 jam setelah surat diterima.",
      "Laporan mingguan kliping media dan sentimen publik disampaikan setiap hari Jumat.",
    ],
    transkrip:
      "[00:00:15] Kasubbag Sekper: Kita bahas alur disposisi surat Dirut dan protokoler agenda direksi.\n[00:15:30] Staf Protokol: Agenda harian sudah sinkron ke sistem Tiara dan siap diakses pimpinan.",
    tugasCount: 2,
  },
  {
    id: 4,
    judul: "Rapat Sekretariat",
    tanggal: "4 Nov 2026",
    tanggalIso: "2026-11-04",
    jam: "08.30 – 09.30",
    lokasi: "Ruang Rapat Kecil",
    pimpinan: "Kasubbag Umum & Kepegawaian",
    peserta: 8,
    sumberInput: "audio",
    durasi: "1 jam",
    durasiMenit: 60,
    audioFileName: "rapat-sekretariat-04nov.mp3",
    audioDihapus: false,
    dokumentasiFoto: [],
    status: "selesai",
    infoSingkat: "2 keputusan · 1 tugas",
    ringkasan:
      "Rapat pemantapan sarana prasarana operasional kantor pusat, pengadaan ATK penunjang pelayanan pelanggan, dan evaluasi kedisiplinan staf administrasi umum.",
    keputusan: [
      "Optimalisasi ketersediaan formulir pendaftaran pelanggan dan sarana front office.",
      "Inventarisasi aset perangkat komputer dan jaringan kantor cabang Lombok Tengah.",
    ],
    transkrip:
      "[00:00:10] Kasubbag Umum: Agenda kita pagi ini memastikan kesiapan fasilitas pelayanan dan ketertiban administrasi.\n[00:30:15] Staf Umum: Pengadaan ATK triwulan IV sudah memasuki tahap final verifikasi.",
    tugasCount: 1,
  },
  {
    id: 5,
    judul: "Rapat Bulanan",
    tanggal: "4 Nov 2026",
    tanggalIso: "2026-11-04",
    jam: "10.00 – 11.45",
    lokasi: "Ruang Rapat Utama",
    pimpinan: "Direktur Utama",
    peserta: 14,
    sumberInput: "audio",
    durasi: "1 jam 45 menit",
    durasiMenit: 105,
    audioFileName: "rapat-bulanan-04nov.m4a",
    audioDihapus: false,
    dokumentasiFoto: [],
    status: "diperiksa",
    infoSingkat: "Menunggu pemeriksaan sekretariat",
    ringkasan:
      'Hasil ekstraksi rapat "rapat bulanan". Dibahas evaluasi teknis distribusi air bersih Perumdam Tirta Ardhia Rinjani, langkah percepatan penanganan laporan warga, serta penugasan lintas bagian dengan target terukur.',
    keputusan: [
      "Menetapkan tindak lanjut prioritas hasil rapat bulanan untuk dieksekusi pekan ini.",
      "Monitoring progres dilaporkan ke Direktur Utama melalui Sekretariat dalam 3 hari kerja.",
    ],
    transkrip:
      '[00:00:10] Direktur Utama: Kita mulai rapat bulanan evaluasi distribusi air bersih dan penanganan laporan warga.\n[00:45:20] Kabag Teknik: Laporan perbaikan jaringan transmisi dan pompa booster sudah siap dieksekusi.\n[01:10:00] Direktur Utama: Tetapkan tindak lanjut prioritas pekan ini dan pantau progresnya dalam 3 hari kerja.',
    tugasCount: 2,
  },
  {
    id: 6,
    judul: "Rapat Evaluasi Triwulan",
    tanggal: "4 Nov 2026",
    tanggalIso: "2026-11-04",
    jam: "13.30 – 15.00",
    lokasi: "Ruang Rapat Utama",
    pimpinan: "Direktur Utama",
    peserta: 12,
    sumberInput: "audio",
    durasi: "1 jam 30 menit",
    durasiMenit: 90,
    audioFileName: "evaluasi-triwulan-iv-04nov.wav",
    audioDihapus: false,
    dokumentasiFoto: [],
    status: "selesai",
    infoSingkat: "2 keputusan · 2 tugas",
    ringkasan:
      "Evaluasi capaian cakupan layanan triwulan berjalan, rasio efisiensi penagihan cabang, serta target penambahan sambungan rumah (SR) baru akhir tahun.",
    keputusan: [
      "Percepatan verifikasi calon pelanggan sambungan rumah baru di 4 kecamatan prioritas.",
      "Penetapan target efisiensi penagihan cabang minimal 95% sebelum tutup tahun buku.",
    ],
    transkrip:
      "[00:00:12] Direktur Utama: Evaluasi kinerja triwulan ini menitikberatkan pada penambahan sambungan baru dan rasio efisiensi penagihan cabang.\n[00:50:00] Kabag Keuangan: Rasio penagihan bergerak naik dan target 95% optimis tercapai.",
    tugasCount: 2,
  },
  {
    id: 7,
    judul: "Penanganan Pipa & Distribusi Wilayah Barat",
    tanggal: "1 Nov 2026",
    tanggalIso: "2026-11-01",
    jam: "13.30 – 14.40",
    lokasi: "Ruang Dirut",
    pimpinan: "Direktur Utama",
    peserta: 7,
    sumberInput: "manual",
    durasi: "1 jam 10 menit",
    durasiMenit: 70,
    audioDihapus: true,
    dokumentasiFoto: [],
    status: "selesai",
    infoSingkat: "2 keputusan · 2 tugas",
    ringkasan:
      "Rapat khusus pembahasan penurunan kehilangan air (NRW) dan stabilisasi tekanan aliran pada jam puncak di jalur distribusi Praya Barat dan Jonggat.",
    keputusan: [
      "Pemasangan katup pengatur tekanan (PRV) pada percabangan utama jalur barat.",
      "Patroli kebocoran malam hari dilaksanakan dua kali sepekan oleh tim reaksi cepat teknik.",
    ],
    transkrip: `Catatan Notulen Sekretariat:\n1. Tim teknik memaparkan peta titik rawan kebocoran pipa PVC lama.\n2. Direktur Utama menginstruksikan pemasangan PRV dan patroli tekanan malam hari agar keluhan aliran kecil di ujung jaringan teratasi.`,
    tugasCount: 2,
  },
  {
    id: 8,
    judul: "Rapat Koordinasi Bagian Teknik",
    tanggal: "30 Okt 2026",
    tanggalIso: "2026-10-30",
    jam: "09.00 – 10.20",
    lokasi: "Ruang Rapat Utama",
    pimpinan: "Direktur Utama",
    peserta: 10,
    sumberInput: "audio",
    durasi: "1 jam 20 menit",
    durasiMenit: 80,
    audioFileName: "rakor-teknik-30okt.mp3",
    audioDihapus: true,
    dokumentasiFoto: [],
    status: "selesai",
    infoSingkat: "2 keputusan · 4 tugas",
    ringkasan:
      "Koordinasi kesiapan menghadapi musim penghujan terhadap kekeruhan air baku di IPA dan pengamanan panel pompa intake dari gangguan kelistrikan.",
    keputusan: [
      "Stok koagulan PAC dan kaporit dijaga minimal untuk kebutuhan operasional 45 hari.",
      "Pemasangan proteksi surja tambahan pada panel pompa utama selesai sebelum pekan kedua November.",
    ],
    transkrip: `[00:01:02] Kabag Teknik: Mengantisipasi curah hujan tinggi di hulu Rinjani, tingkat kekeruhan air baku meningkat pada sore hari sehingga dosis koagulan perlu penyesuaian cepat.\n[00:15:30] Direktur Utama: Pastikan ketersediaan bahan kimia pengolahan aman minimal satu setengah bulan ke depan, jangan sampai distribusi ke pelanggan terganggu.`,
    tugasCount: 3,
  },
];

export const INITIAL_TUGAS: TugasItem[] = [
  {
    id: 1,
    notulenId: 1,
    judul: "Susun rencana perbaikan jaringan pipa wilayah barat",
    pj: "Bagian Teknik",
    tenggat: "Besok",
    segera: true,
    selesai: false,
  },
  {
    id: 2,
    notulenId: 1,
    judul: "Laporan realisasi pendapatan Oktober",
    pj: "Bagian Keuangan",
    tenggat: "Besok",
    segera: true,
    selesai: false,
  },
  {
    id: 3,
    notulenId: 1,
    judul: "Jawaban aduan pelanggan yang berulang",
    pj: "Hubungan Langganan",
    tenggat: "Jum, 6 Nov",
    segera: true,
    selesai: false,
  },
  {
    id: 4,
    notulenId: 1,
    judul: "Revisi anggaran pemeliharaan IPA",
    pj: "Bagian Teknik",
    tenggat: "10 Nov",
    segera: false,
    selesai: false,
  },
  {
    id: 5,
    notulenId: 1,
    judul: "Jadwal pelatihan pegawai pelayanan & baca meter",
    pj: "Bagian Umum",
    tenggat: "12 Nov",
    segera: false,
    selesai: false,
  },
  {
    id: 6,
    notulenId: 2,
    judul: "Evaluasi kinerja pengaduan bulanan",
    pj: "Hubungan Langganan",
    tenggat: "13 Nov",
    segera: false,
    selesai: false,
  },
  {
    id: 7,
    notulenId: 2,
    judul: "Audit akurasi foto meter cabang Praya & Jonggat",
    pj: "Hubungan Langganan",
    tenggat: "14 Nov",
    segera: false,
    selesai: false,
  },
  {
    id: 8,
    notulenId: 6,
    judul: "Verifikasi stok bahan kimia PAC & desinfektan 45 hari",
    pj: "Bagian Teknik",
    tenggat: "15 Nov",
    segera: false,
    selesai: false,
  },
  {
    id: 9,
    notulenId: 6,
    judul: "Pemasangan proteksi panel listrik pompa intake utama",
    pj: "Bagian Teknik",
    tenggat: "16 Nov",
    segera: false,
    selesai: false,
  },
  {
    id: 10,
    notulenId: 2,
    judul: "Rekapitulasi piutang pelanggan aktif > 3 bulan",
    pj: "Bagian Keuangan",
    tenggat: "18 Nov",
    segera: false,
    selesai: false,
  },
  {
    id: 11,
    notulenId: 5,
    judul: "Penyusunan jadwal patroli kebocoran pipa malam hari",
    pj: "Bagian Teknik",
    tenggat: "20 Nov",
    segera: false,
    selesai: false,
  },
];

export const INITIAL_WA_LOGS: WaLogItem[] = [
  {
    id: 1,
    waktu: "06.30",
    labelDashboard: "Briefing pagi 06.30",
    tujuan: "Dirut & Sekretariat (3 nomor)",
    isi: "Selamat pagi Pak Dirut, berikut 6 agenda hari ini (Rabu, 4 Nov): 07.00 Penandatanganan berkas, 07.30 Koordinasi Keuangan, 08.15 Posko Pengaduan, 09.00 Rapat Direksi...",
    status: "Terkirim",
  },
  {
    id: 2,
    waktu: "08.30",
    labelDashboard: "Pengingat 30 menit",
    tujuan: "Dirut & Sekretariat",
    isi: "Pengingat 30 menit: Rapat Direksi pukul 09.00 – 10.30 di Ruang Rapat Utama (8 peserta).",
    status: "Terkirim",
  },
  {
    id: 3,
    waktu: "08.55",
    labelDashboard: "Pengingat 5 menit",
    tujuan: "Dirut & Sekretariat",
    isi: "Pengingat 5 menit: Rapat Direksi segera dimulai pukul 09.00 di Ruang Rapat Utama.",
    status: "Terjadwal",
  },
];

export const INITIAL_REMINDER = {
  waktu: "08.55",
  judulAcara: "Rapat Direksi",
  teks: "Pak, Rapat Direksi dimulai 5 menit lagi di Ruang Rapat Utama.",
};
