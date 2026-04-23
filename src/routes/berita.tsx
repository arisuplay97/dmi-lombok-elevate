import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const Route = createFileRoute("/berita")({
  component: () => (
    <PagePlaceholder
      eyebrow="Berita"
      title="Kabar terbaru dari masjid dan umat."
      description="Liputan kegiatan, pengumuman resmi, dan kabar program DMI Kabupaten Lombok Tengah akan dipublikasikan secara berkala di laman ini."
    />
  ),
});
