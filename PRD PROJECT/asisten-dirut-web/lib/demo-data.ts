// Data contoh untuk demo. Ganti dengan data dari API/database nanti.

export type Jenis = 'rapat' | 'kunjungan' | 'lainnya';

export const agendaHariIni = [
  { id: 1, judul: 'Penandatanganan berkas', mulai: '07.00', selesai: '07.30', lokasi: 'Ruang Dirut', jenis: 'lainnya' as Jenis, peserta: 1, selesaiAcara: true },
  { id: 2, judul: 'Koordinasi Bagian Keuangan', mulai: '07.30', selesai: '08.15', lokasi: 'Ruang Rapat Kecil', jenis: 'rapat' as Jenis, peserta: 4, selesaiAcara: true },
  { id: 3, judul: 'Pemantauan Posko Pengaduan', mulai: '08.15', selesai: '08.45', lokasi: 'Kantor Pelayanan', jenis: 'kunjungan' as Jenis, peserta: 2, selesaiAcara: true },
  { id: 4, judul: 'Rapat Direksi', mulai: '09.00', selesai: '10.30', lokasi: 'Ruang Rapat Utama', jenis: 'rapat' as Jenis, peserta: 8, selesaiAcara: false },
  { id: 5, judul: 'Tinjauan Instalasi Pengolahan', mulai: '11.00', selesai: '12.00', lokasi: 'Lokasi IPA', jenis: 'kunjungan' as Jenis, peserta: 5, selesaiAcara: false },
  { id: 6, judul: 'Koordinasi Kabag Teknik', mulai: '14.00', selesai: '15.00', lokasi: 'Ruang Dirut', jenis: 'rapat' as Jenis, peserta: 3, selesaiAcara: false },
];

// Jumlah agenda per hari, Rabu = hari ini (sama dengan agendaHariIni)
export const agendaMingguan = [
  { hari: 'Sen', rapat: 2, kunjungan: 1, lainnya: 1 },
  { hari: 'Sel', rapat: 3, kunjungan: 1, lainnya: 2 },
  { hari: 'Rab', rapat: 3, kunjungan: 2, lainnya: 1 },
  { hari: 'Kam', rapat: 2, kunjungan: 0, lainnya: 3 },
  { hari: 'Jum', rapat: 1, kunjungan: 2, lainnya: 1 },
];

export type StatusNotulen = 'selesai' | 'diperiksa' | 'diproses';

export const notulenRingkasan = { total: 48, bulanIni: 9, tugas: 126, jamRekaman: 62, selesai: 45, diperiksa: 1, diproses: 2 };

export const notulenTerbaru = [
  { id: 1, judul: 'Rapat Direksi Bulanan', tanggal: '2 Nov', info: '3 keputusan · 5 tugas', status: 'selesai' as StatusNotulen },
  { id: 2, judul: 'Koordinasi Unit Pelayanan', tanggal: '3 Nov', info: 'Menunggu pemeriksaan sekretariat', status: 'diperiksa' as StatusNotulen },
  { id: 3, judul: 'Rapat Evaluasi Triwulan', tanggal: '4 Nov', info: 'Audio 1 jam 12 menit', status: 'diproses' as StatusNotulen },
  { id: 4, judul: 'Rapat Anggaran Pemeliharaan', tanggal: '4 Nov', info: 'Audio 48 menit', status: 'diproses' as StatusNotulen },
  { id: 5, judul: 'Rapat Koordinasi Bagian Teknik', tanggal: '30 Okt', info: '2 keputusan · 4 tugas', status: 'selesai' as StatusNotulen },
];

export const tugasTerbuka = 11; // total tugas terbuka (daftar di bawah hanya sebagian)

export const tugas = [
  { id: 1, judul: 'Susun rencana perbaikan jaringan pipa wilayah barat', pj: 'Bagian Teknik', tenggat: 'Besok', segera: true },
  { id: 2, judul: 'Laporan realisasi pendapatan Oktober', pj: 'Bagian Keuangan', tenggat: 'Besok', segera: true },
  { id: 3, judul: 'Jawaban aduan pelanggan yang berulang', pj: 'Hubungan Langganan', tenggat: 'Jum, 6 Nov', segera: true },
  { id: 4, judul: 'Revisi anggaran pemeliharaan IPA', pj: 'Bagian Teknik', tenggat: '10 Nov', segera: false },
  { id: 5, judul: 'Jadwal pelatihan pegawai', pj: 'Bagian Umum', tenggat: '12 Nov', segera: false },
  { id: 6, judul: 'Evaluasi kinerja pengaduan bulanan', pj: 'Hubungan Langganan', tenggat: '13 Nov', segera: false },
];

export const logWA = [
  { id: 1, waktu: '06.30', isi: 'Briefing pagi', status: 'Terkirim' },
  { id: 2, waktu: '07.00', isi: 'Pengingat: Koordinasi Keuangan', status: 'Terkirim' },
  { id: 3, waktu: '08.30', isi: 'Pengingat 30 menit: Rapat Direksi', status: 'Terkirim' },
  { id: 4, waktu: '08.55', isi: 'Pengingat 5 menit: Rapat Direksi', status: 'Terjadwal' },
];

export const pengingat = {
  waktu: '08.55',
  teks: 'Pak, Rapat Direksi dimulai 5 menit lagi di Ruang Rapat Utama.',
};
