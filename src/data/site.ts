import hero1 from "@/assets/hero-1.jpg";
import hero2 from "@/assets/hero-2.jpg";
import hero3 from "@/assets/hero-3.jpg";
import hero4 from "@/assets/hero-4.jpg";
import gal1 from "@/assets/gallery-1.jpg";
import gal2 from "@/assets/gallery-2.jpg";
import gal3 from "@/assets/gallery-3.jpg";
import gal4 from "@/assets/gallery-4.jpg";
import gal5 from "@/assets/gallery-5.jpg";
import gal6 from "@/assets/gallery-6.jpg";
import news1 from "@/assets/news-1.jpg";
import news2 from "@/assets/news-2.jpg";
import news3 from "@/assets/news-3.jpg";

export const SITE = {
  name: "Dewan Masjid Indonesia",
  shortName: "DMI",
  region: "Kabupaten Lombok Tengah",
  tagline: "Memakmurkan Masjid, Menguatkan Umat, Membangun Peradaban.",
  address: "Jl. Jenderal Sudirman No. 12, Praya, Lombok Tengah, NTB 83511",
  email: "sekretariat@dmi-lomboktengah.or.id",
  phone: "(0370) 654 321",
  social: {
    instagram: "https://instagram.com/dmi.lomboktengah",
    facebook: "https://facebook.com/dmi.lomboktengah",
    youtube: "https://youtube.com/@dmi-lomboktengah",
  },
};

export const NAV = [
  { label: "Beranda", to: "/" as const },
  { label: "Tentang Kami", to: "/tentang" as const },
  { label: "Program", to: "/program" as const },
  { label: "Berita", to: "/berita" as const },
  { label: "Galeri", to: "/galeri" as const },
  { label: "Layanan", to: "/layanan" as const },
  { label: "Kontak", to: "/kontak" as const },
];

export const HERO_SLIDES = [
  {
    image: hero1,
    eyebrow: "Pusat Pemberdayaan Umat",
    title: ["Memakmurkan Masjid,", "Menguatkan Umat,", "Membangun Peradaban."],
    subtitle:
      "Menghadirkan sinergi, pembinaan, dan pemberdayaan yang menjadikan masjid sebagai pusat ibadah, pendidikan, dan penguatan masyarakat.",
    meta: { label: "Edisi", value: "2025 / Periode IV" },
  },
  {
    image: hero3,
    eyebrow: "Pendidikan & Dakwah",
    title: ["Generasi Qur'ani", "dari Setiap Masjid", "Lombok Tengah."],
    subtitle:
      "Membentuk karakter umat melalui pendidikan Al-Qur'an, kaderisasi remaja masjid, dan penguatan literasi keagamaan yang relevan.",
    meta: { label: "Program", value: "Bina Generasi" },
  },
  {
    image: hero2,
    eyebrow: "Pembinaan Manajemen Masjid",
    title: ["Tata Kelola Masjid", "yang Profesional,", "Akuntabel, Bermartabat."],
    subtitle:
      "Pendampingan manajerial, administrasi, dan keuangan masjid agar lebih transparan, partisipatif, dan berkelanjutan.",
    meta: { label: "Sinergi", value: "Pengurus Masjid" },
  },
  {
    image: hero4,
    eyebrow: "Identitas Lombok Tengah",
    title: ["Akar Tradisi,", "Wajah Modern,", "Satu Pengabdian."],
    subtitle:
      "Bertumbuh dari kearifan lokal Sasak, menapak bersama kemajuan zaman, untuk umat yang berdaya dan berbudaya.",
    meta: { label: "Wilayah", value: "12 Kecamatan" },
  },
];

export const METRICS = [
  { value: 487, suffix: "+", label: "Masjid Binaan", caption: "Tersebar di 12 kecamatan" },
  { value: 24, suffix: "", label: "Program Aktif", caption: "Pembinaan & pemberdayaan" },
  { value: 1200, suffix: "+", label: "Kegiatan Sosial", caption: "Sepanjang 2024" },
  { value: 3500, suffix: "+", label: "Pengurus & Relawan", caption: "Jaringan se-Lombok Tengah" },
];

export const PROGRAMS = [
  {
    icon: "Building2",
    title: "Pembinaan Manajemen Masjid",
    desc: "Penguatan tata kelola, administrasi, dan keuangan masjid yang transparan, partisipatif, dan berkelanjutan.",
  },
  {
    icon: "HandHeart",
    title: "Pemberdayaan Umat",
    desc: "Program ekonomi keumatan, kesejahteraan jamaah, dan pemberdayaan keluarga berbasis masjid.",
  },
  {
    icon: "BookOpen",
    title: "Pendidikan & Dakwah",
    desc: "Penguatan kapasitas dai, pembelajaran Al-Qur'an, dan kajian keislaman yang moderat dan kontekstual.",
  },
  {
    icon: "HeartHandshake",
    title: "Kegiatan Sosial",
    desc: "Aksi kemanusiaan, bantuan sosial, tanggap bencana, dan layanan kesehatan untuk masyarakat luas.",
  },
  {
    icon: "Users",
    title: "Pelatihan Remaja Masjid",
    desc: "Kaderisasi generasi muda masjid agar tumbuh sebagai pemimpin yang berakhlak dan berdaya saing.",
  },
  {
    icon: "Handshake",
    title: "Kemitraan & Kolaborasi",
    desc: "Sinergi lintas sektor bersama pemerintah, akademisi, dan dunia usaha untuk dampak yang lebih luas.",
  },
];

export const NEWS = [
  {
    image: news1,
    category: "Pendidikan",
    title: "Peluncuran Gerakan Literasi Masjid Se-Lombok Tengah",
    excerpt:
      "Inisiatif kolaboratif yang menempatkan masjid sebagai simpul literasi komunitas, menghubungkan 120 masjid di tahap pertama.",
    date: "12 April 2025",
    href: "#",
    featured: true,
  },
  {
    image: news2,
    category: "Pembinaan",
    title: "Standar Baru Tata Kelola Masjid Tahun 2025",
    excerpt: "Pedoman manajemen masjid yang menyatukan praktik administratif, keuangan, dan keterbukaan informasi.",
    date: "5 April 2025",
    href: "#",
  },
  {
    image: news3,
    category: "Sosial",
    title: "Sinergi Aksi Kemanusiaan untuk Wilayah Selatan",
    excerpt: "Konsolidasi relawan dan pengurus masjid menyalurkan bantuan terkoordinasi ke desa-desa terdampak.",
    date: "28 Maret 2025",
    href: "#",
  },
];

export const GALLERY = [
  { src: gal1, alt: "Pelatihan pengurus masjid", span: "tall" },
  { src: gal4, alt: "Kegiatan jamaah di masjid", span: "wide" },
  { src: gal3, alt: "Aktivitas remaja masjid", span: "normal" },
  { src: gal6, alt: "Iftar bersama Ramadan", span: "wide" },
  { src: gal2, alt: "Penyaluran bantuan sosial", span: "tall" },
  { src: gal5, alt: "Kajian dakwah malam", span: "normal" },
];

export const KETUA = {
  name: "H. Lendek Jayadi S.E., M.M",
  title: "Ketua DMI Kabupaten Lombok Tengah",
  quote:
    "Masjid bukan sekadar tempat ibadah, melainkan ruang peradaban tempat umat dibina, diberdayakan, dan dipersatukan untuk kemaslahatan bersama.",
  body: [
    "Assalamu'alaikum warahmatullahi wabarakatuh. Atas nama Pengurus Daerah Dewan Masjid Indonesia Kabupaten Lombok Tengah, kami menyambut hangat kehadiran Anda di laman resmi kami.",
    "Mengemban amanah memakmurkan masjid adalah ikhtiar kolektif yang menghubungkan pengurus, jamaah, dan seluruh pemangku kepentingan. Bersama, kami menapaki jalan pembinaan, pelayanan, dan pemberdayaan agar masjid kembali menjadi mercusuar peradaban Lombok Tengah.",
  ],
};
