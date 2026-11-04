# Asisten Virtual Dirut (Web)

Next.js (App Router) + React + TypeScript. Tampilan dashboard dari desain. Data contoh ada di `lib/demo-data.ts` (agenda, notulen, tugas, log WhatsApp, pengingat suara).

## Menjalankan
```
npm install
npm run dev     # http://localhost:3000
npm run build && npm start
```

## Struktur
- `app/layout.tsx`: layout dan font
- `app/page.tsx`: halaman dashboard
- `app/manifest.ts`: manifest PWA (tambahkan ikon 192 dan 512 px di `public/`, lalu isi `icons`)
- `app/globals.css`: gaya dasar dan responsif
- `lib/demo-data.ts`: data contoh (ganti dengan API)
- `components/Dashboard.tsx`: dashboard yang membaca data contoh; suara asisten perempuan (Web Speech API), tombol Tunda/Tutup, dan centang tugas sudah berfungsi

## Langkah berikutnya
Route handler untuk agenda dan notulen, database PostgreSQL, service worker untuk notifikasi push, WebSocket/SSE untuk pengumuman suara. Lihat PRD.
