# PRD: Asisten Virtual Dirut (MVP)

Perumdam Tirta Ardhia Rinjani · Versi 0.1 · November 2026

## 1. Ringkasan
Aplikasi web (PWA) berperan sebagai sekretaris virtual untuk Direktur Utama. Tahap awal fokus pada dua hal: **agenda** dan **notulen rapat**, dengan input manual maupun suara, serta pengiriman jadwal otomatis ke WhatsApp.

## 2. Tujuan
- Dirut mengetahui jadwal harian tanpa menanyakan ke staf.
- Notulen rapat tersedia cepat dan rapi dari rekaman audio.
- Agenda bisa dicatat lewat ketikan atau perintah suara.
- Jadwal dan pengingat diumumkan langsung oleh asisten lewat suara saat waktunya tiba, dan dikirim otomatis ke WhatsApp.

## 3. Pengguna
- **Dirut**: melihat agenda, mendengar briefing, membaca notulen.
- **Sekretariat**: input agenda, unggah audio rapat, koreksi hasil notulen.
- Hak akses dibedakan per peran (Dirut, sekretariat).

## 4. Ruang Lingkup MVP
**Termasuk**

1. Manajemen agenda (tambah, ubah, hapus, lihat harian/mingguan).
2. Input agenda lewat suara (contoh: "Tambah rapat dengan Kabag Teknik Jumat jam 9").
3. Pengumuman suara otomatis oleh asisten saat jadwal tiba, serta pengiriman jadwal ke WhatsApp (briefing pagi dan pengingat sebelum acara).
4. Notulen dari unggah audio: transkrip, ringkasan, keputusan, daftar tugas.
5. Mode PWA (dapat dipasang di layar utama, notifikasi push).

**Di luar MVP (tahap berikutnya)**

- Surat disposisi dan draf surat.
- Wake word "Hey Jarvis" tanpa tombol.
- Integrasi data Siaga Tiara dan monitoring aksesoris.
- Persetujuan dokumen lewat WA.

## 5. Kebutuhan Fungsional

### 5.1 Agenda
- Field: judul, tanggal, jam mulai-selesai, lokasi, peserta, catatan, status.
- Deteksi bentrok jadwal dan beri peringatan. Agenda disimpan hanya di aplikasi (tanpa sinkron Google Calendar).
- Agenda berulang (rapat mingguan/bulanan).
- Input suara: rekam perintah, diubah ke teks (STT), AI mengekstrak field agenda, **ditampilkan untuk dikonfirmasi** sebelum disimpan.

### 5.2 Pengiriman WhatsApp
- Briefing pagi (default 06.30) berisi agenda hari ini.
- Pengingat sebelum acara (default 30 menit, bisa diatur).
- Penerima bisa lebih dari satu (Dirut, sekretariat).
- Modul pengirim dibuat sebagai adapter sehingga gateway (Fonnte atau lainnya) dapat diganti.
- Log pengiriman dan status gagal/ulang.

### 5.3 Notulen
- Unggah file audio (mp3, m4a, wav) dengan batas ukuran yang ditentukan.
- Proses di latar belakang dengan status: diunggah, diproses, diperiksa, selesai, gagal.
- Hasil: transkrip lengkap, ringkasan, poin keputusan, daftar tugas (penanggung jawab dan tenggat bila disebut).
- Sekretariat dapat mengedit hasil sebelum dikunci/dibagikan.
- Ekspor ke PDF/Word dan kirim ringkasan ke WA.
- Pencarian notulen berdasarkan kata kunci dan tanggal.

### 5.4 Suara
- Tombol rekam untuk perintah suara (MVP).
- Balasan suara (TTS) untuk briefing harian, opsional diaktifkan.
- **Pengumuman otomatis**: saat jadwal tiba (usulan 30 menit dan 5 menit sebelum acara, serta tepat waktu mulai), asisten langsung berbicara tanpa diminta. Contoh: "Pak, rapat dengan Kabag Teknik dimulai 5 menit lagi."
- Pengumuman disertai bunyi "ting" dan banner di layar, dengan tombol tunda dan tutup.
- Berlaku di perangkat Dirut dan sekretariat yang sedang membuka aplikasi. Browser memblokir suara otomatis sebelum ada interaksi pertama, jadi saat aplikasi dibuka ada satu ketukan "Aktifkan asisten".
- Bila aplikasi tertutup, pengingat tetap dikirim lewat WhatsApp dan notifikasi push.
- Pengaturan: pilih perangkat penerima suara, jam senyap, dan matikan suara per pengguna.

### 5.5 PWA
- Dapat dipasang, tampilan responsif (HP dan PC).
- Notifikasi push; agenda dan notulen terakhir dapat dilihat offline.

## 6. Kebutuhan Non-Fungsional
- **Keamanan**: login wajib, peran pengguna, HTTPS, audio dan transkrip disimpan dengan akses terbatas.
- **Data sensitif**: notulen boleh diproses, tetapi pilih penyedia AI yang kebijakan datanya jelas, catat siapa mengakses, dan sediakan fitur hapus audio setelah transkrip jadi.
- **Kinerja**: agenda tampil di bawah 2 detik; notulen rapat 1 jam selesai dalam kisaran 10-15 menit (target awal).
- **Keandalan**: pengiriman WA diulang otomatis bila gagal; ada cadangan data harian.

## 7. Arsitektur Singkat
- **Frontend**: PWA dengan Next.js (App Router), React, dan TypeScript. Komponen UI dari desain dashboard; service worker untuk notifikasi push; MediaRecorder API untuk rekam suara; Web Speech API untuk suara bawaan browser (prototipe).
- **Backend**: route handler Next.js untuk API, dengan worker terpisah untuk penjadwal dan antrean. Fungsi: API + penjadwal (cron/queue) untuk pengingat, pengumuman suara (dikirim real-time ke aplikasi lewat WebSocket/SSE), dan pemrosesan audio.
- **AI**: STT bahasa Indonesia (Whisper atau setara), LLM (Claude API) untuk ekstraksi agenda dan ringkasan notulen, TTS untuk balasan suara.
- **WhatsApp**: adapter ke Fonnte atau gateway lain, nomor khusus asisten.
- **Database**: PostgreSQL (agenda, notulen, tugas, log pengiriman, pengguna).
- **Penyimpanan file**: audio dan dokumen hasil ekspor.

## 8. Model Data (ringkas)
- `users` (id, nama, peran, no_wa)
- `agenda` (id, judul, mulai, selesai, lokasi, peserta, catatan, sumber [manual/suara], status)
- `reminders` (id, agenda_id, waktu_kirim, penerima, status)
- `meetings` (id, judul, tanggal, audio_path, status_proses)
- `minutes` (id, meeting_id, transkrip, ringkasan, keputusan)
- `action_items` (id, minutes_id, tugas, penanggung_jawab, tenggat, status)
- `wa_logs` (id, tujuan, isi, status, waktu)

## 9. Alur Utama
1. **Agenda suara**: tekan rekam, ucapkan perintah, sistem menampilkan hasil, pengguna konfirmasi, tersimpan, pengingat terjadwal.
2. **Briefing pagi**: scheduler, ambil agenda hari ini, kirim WA ke penerima dan umumkan lewat suara bila aplikasi terbuka.
3. **Notulen**: unggah audio, antrean pemrosesan, transkrip dan ringkasan, sekretariat periksa, dibagikan.

## 10. Metrik Keberhasilan
- Persentase agenda yang masuk lewat aplikasi (target awal: mayoritas agenda Dirut).
- Waktu pembuatan notulen dibanding cara manual.
- Tingkat keberhasilan pengiriman WA (target 98% atau lebih).
- Kepuasan Dirut dan sekretariat setelah pemakaian 1 bulan.

## 11. Risiko dan Mitigasi
- **Akurasi STT** (logat, istilah teknis): sediakan edit manual dan kamus istilah PDAM.
- **Gateway WA diblokir**: nomor khusus, adapter yang bisa diganti, pertimbangkan WhatsApp Business API resmi bila dipakai jangka panjang.
- **Kebocoran data rapat**: batasi akses, enkripsi, kebijakan hapus audio.
- **Salah tafsir perintah suara**: selalu minta konfirmasi sebelum menyimpan.

## 12. Rencana Tahap
- **Tahap 1 (MVP)**: agenda manual, pengumuman suara dan pengiriman WA, notulen upload audio, PWA.
- **Tahap 2**: input agenda suara penuh, briefing suara, tugas dari notulen dengan penagihan progres.
- **Tahap 3**: wake word "Hey Jarvis", disposisi dan draf surat, integrasi data operasional.

## 13. Pertanyaan Terbuka
- Siapa saja anggota sekretariat yang memegang akun?
- Berapa menit sebelum acara asisten berbicara (usulan: 30 dan 5 menit)?
- Penyedia AI dan lokasi server yang disetujui manajemen?
- Batas durasi rekaman rapat per unggahan?
