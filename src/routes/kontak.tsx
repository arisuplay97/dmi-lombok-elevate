import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const Route = createFileRoute("/kontak")({
  component: () => (
    <PagePlaceholder
      eyebrow="Kontak"
      title="Mari berkolaborasi untuk umat."
      description="Sekretariat DMI Kabupaten Lombok Tengah terbuka untuk kemitraan, konsultasi, dan masukan. Formulir kontak lengkap dan peta lokasi akan segera tersedia di sini."
    />
  ),
});
