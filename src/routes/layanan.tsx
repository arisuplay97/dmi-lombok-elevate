import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const Route = createFileRoute("/layanan")({
  head: () => ({
    meta: [
      { title: "Layanan — DMI Kabupaten Lombok Tengah" },
      {
        name: "description",
        content: "Layanan kepada masjid, pengurus, dan umat di Kabupaten Lombok Tengah.",
      },
      { property: "og:title", content: "Layanan DMI Lombok Tengah" },
      { property: "og:description", content: "Layanan kepada masjid, pengurus, dan umat." },
    ],
  }),
  component: () => (
    <PagePlaceholder
      eyebrow="Layanan"
      title="Layanan untuk masjid, pengurus, dan umat."
      description="Bentuk-bentuk layanan DMI Lombok Tengah—konsultasi manajemen, pendampingan administrasi, hingga rujukan dakwah dan kegiatan sosial—akan dijabarkan di laman ini."
    />
  ),
});
