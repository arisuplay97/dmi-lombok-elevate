import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const Route = createFileRoute("/tentang")({
  component: () => (
    <PagePlaceholder
      eyebrow="Tentang Kami"
      title="Mengenal lebih dekat DMI Lombok Tengah."
      description="Sejarah, visi, misi, struktur kepengurusan, serta komitmen pelayanan Dewan Masjid Indonesia Kabupaten Lombok Tengah—akan segera tersedia di laman ini."
    />
  ),
});

