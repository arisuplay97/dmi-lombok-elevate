import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const Route = createFileRoute("/layanan")({
  component: () => (
    <PagePlaceholder
      eyebrow="Layanan"
      title="Layanan untuk masjid, pengurus, dan umat."
      description="Bentuk-bentuk layanan DMI Lombok Tengah—konsultasi manajemen, pendampingan administrasi, hingga rujukan dakwah dan kegiatan sosial—akan dijabarkan di laman ini."
    />
  ),
});
