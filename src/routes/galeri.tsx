import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const Route = createFileRoute("/galeri")({
  component: () => (
    <PagePlaceholder
      eyebrow="Galeri"
      title="Dokumentasi kegiatan dan jaringan masjid."
      description="Galeri foto dan video lengkap dari setiap kegiatan, pelatihan, dan pelayanan DMI Lombok Tengah—akan tersedia di laman ini."
    />
  ),
});
