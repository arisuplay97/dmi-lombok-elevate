import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const Route = createFileRoute("/program")({
  component: () => (
    <PagePlaceholder
      eyebrow="Program"
      title="Program pembinaan dan pemberdayaan umat."
      description="Detail lengkap setiap program unggulan DMI Lombok Tengah—mulai dari manajemen masjid, pendidikan dakwah, kegiatan sosial, hingga pelatihan remaja masjid—segera hadir di laman ini."
    />
  ),
});
