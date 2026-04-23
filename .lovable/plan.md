

# DMI Lombok Tengah — Website Resmi Premium

Membangun homepage resmi Dewan Masjid Indonesia Kabupaten Lombok Tengah dengan kualitas visual setara website corporate top Indonesia (Pertamina-grade), bukan template. Fokus penuh ke 1 halaman Beranda yang dipoles maksimal, menu lain jadi route placeholder elegan.

## Arah Desain

**Mood:** corporate premium × institusi keumatan modern. Hijau matang (bukan neon), whitespace luas, tipografi tegas, layering visual matang, animasi halus on-scroll.

**Tipografi:**
- Heading: **Plus Jakarta Sans** (modern, tegas, sangat Indonesia-friendly, bukan kesan template)
- Body: **Inter** (readable, netral premium)
- Tidak ada serif, tidak ada font dakwah/dekoratif

**Palet warna** (sesuai brief):
- Primary `#1E8A5A`, Deep `#166946`, Soft Tint `#EAF5EF`
- Background `#F7F8F7`, Text `#1B1F1D`, Secondary `#5F6B65`
- Aksen warm neutral untuk menghangatkan

## Struktur Halaman Beranda

```text
┌─ NAVBAR (sticky, putih solid, shrink on scroll, shadow halus) ─┐
│ [Logo] DMI Kab. Lombok Tengah    Beranda  Tentang  Program... │
├────────────────────────────────────────────────────────────────┤
│ HERO SLIDER (full-width, 4 slide, cinematic)                  │
│  • image + gradient overlay matang                             │
│  • split: kiri teks editorial, kanan negative space + meta     │
│  • slow zoom parallax, dot indicator minimalis, arrow tipis    │
├────────────────────────────────────────────────────────────────┤
│ BRAND STATEMENT BAND (split: angka tahun + narasi institusi)  │
├────────────────────────────────────────────────────────────────┤
│ IMPACT METRICS (4 angka, garis tipis, count-up, bukan box)    │
├────────────────────────────────────────────────────────────────┤
│ SAMBUTAN KETUA (editorial: foto kiri, kutipan besar kanan)    │
├────────────────────────────────────────────────────────────────┤
│ TENTANG DMI (narasi + 4 highlight cards minimal)              │
├────────────────────────────────────────────────────────────────┤
│ PROGRAM UNGGULAN (grid 3×2, hover elevation halus)            │
├────────────────────────────────────────────────────────────────┤
│ BERITA TERBARU (1 featured besar + 3 secondary, corporate)    │
├────────────────────────────────────────────────────────────────┤
│ GALERI KEGIATAN (masonry asimetris, hover overlay, lightbox)  │
├────────────────────────────────────────────────────────────────┤
│ CTA BAND (full-width hijau deep, headline kuat, 2 button)     │
├────────────────────────────────────────────────────────────────┤
│ FOOTER (4 kolom institusional + bar copyright)                │
└────────────────────────────────────────────────────────────────┘
```

Setiap section punya **rhythm visual berbeda**: full-width → split → band tipis → editorial → grid → featured+grid → masonry → CTA full-bleed → footer. Tidak ada dua section yang bentuknya sama.

## Aset Visual (AI-generated)

Generate ~10 gambar cinematic via Nano Banana Pro:
- **4 hero slides:** masjid megah golden hour, kegiatan pembinaan pengurus, anak-anak belajar Qur'an, suasana masjid Lombok dengan latar Rinjani
- **1 foto ketua** profesional (headshot editorial)
- **6 foto galeri** kegiatan (pelatihan, sosial, remaja masjid, dakwah, kemitraan, ramadan)
- **3 thumbnail berita**

Semua dengan treatment warna konsisten: warm-natural, sedikit desaturated, mood institusional.

## Animasi (halus, bukan AOS)

Pakai **Framer Motion** + Intersection Observer:
- Fade-up + slight slide saat masuk viewport (stagger untuk grid)
- Hero: slow Ken Burns zoom + crossfade slide
- Navbar: shrink + shadow saat scroll > 40px
- Counter count-up pada metrics
- Image hover: subtle scale + overlay reveal
- Timing matang (cubic-bezier easing, 600-800ms)

## Halaman Lain

`/tentang`, `/program`, `/berita`, `/galeri`, `/layanan`, `/kontak` → masing-masing dibuat sebagai route file dengan **placeholder elegan premium** (hero kecil + "Halaman dalam pengembangan" + link kembali). Bukan 404, bukan blank — tetap on-brand. Siap diisi konten penuh di iterasi berikutnya.

## Detail Teknis

- **Stack:** TanStack Start + React 19 + Tailwind v4 + Framer Motion + Embla Carousel (untuk hero slider)
- **Routing:** file-based di `src/routes/`, setiap route punya `head()` SEO sendiri (title, description, og:title, og:description, og:image hero)
- **Design tokens:** semua warna brand di-register di `src/styles.css` sebagai CSS variables + Tailwind theme inline (`--color-brand-primary`, `--color-brand-deep`, `--color-brand-tint`, dll)
- **Komponen reusable** di `src/components/`:
  - `Navbar.tsx`, `Footer.tsx`, `HeroSlider.tsx`
  - `SectionHeading.tsx`, `MetricCounter.tsx`, `ProgramCard.tsx`, `NewsCard.tsx`, `GalleryGrid.tsx`, `CTABand.tsx`
  - `Reveal.tsx` (wrapper Framer Motion untuk fade-up on-scroll)
- **Data dummy** di `src/data/` (programs, news, gallery, metrics) — terstruktur, mudah diganti
- **Image generation script** dijalankan via Lovable AI Gateway (Nano Banana Pro), output disimpan di `src/assets/` dan di-import sebagai URL Vite
- **Responsif:** desktop-first, hamburger menu clean di mobile (drawer dari kanan), hero tetap kuat di mobile
- **Performa:** image lazy load, font preload, animasi pakai `transform/opacity` saja

## Yang Dihindari (eksplisit)

Tidak ada: ornamen bulan sabit/pattern islami berlebihan, hijau neon, serif besar kaku, box statistik generik, hero "gambar masjid + teks putih tengah", ikon murahan, animasi AOS-style heboh, layout simetris monoton.

