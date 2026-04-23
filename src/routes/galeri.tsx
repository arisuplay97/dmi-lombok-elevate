import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const Route = createFileRoute("/galeri")({
  head: () => ({
    meta: [
      { title: "Galeri — DMI Kabupaten Lombok Tengah" },
      {
        name: "description",
        content: "Dokumentasi visual kegiatan DMI Kabupaten Lombok Tengah dan jaringan masjid binaan.",
      },
      { property: "og:title", content: "Galeri DMI Lombok Tengah" },
      { property: "og:description", content: "Dokumentasi kegiatan dan jaringan masjid binaan." },
    ],
  }),
  component: () => (
    <PagePlaceholder
      eyebrow="Galeri"
      title="Dokumentasi kegiatan dan jaringan masjid."
      description="Galeri foto dan video lengkap dari setiap kegiatan, pelatihan, dan pelayanan DMI Lombok Tengah—akan tersedia di laman ini."
    />
  ),
});
