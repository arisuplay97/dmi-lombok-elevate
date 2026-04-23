import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const Route = createFileRoute("/berita")({
  head: () => ({
    meta: [
      { title: "Berita — DMI Kabupaten Lombok Tengah" },
      {
        name: "description",
        content: "Kabar terbaru dari DMI Kabupaten Lombok Tengah dan jaringan masjid binaan.",
      },
      { property: "og:title", content: "Berita DMI Lombok Tengah" },
      { property: "og:description", content: "Kabar terbaru DMI Kabupaten Lombok Tengah." },
    ],
  }),
  component: () => (
    <PagePlaceholder
      eyebrow="Berita"
      title="Kabar terbaru dari masjid dan umat."
      description="Liputan kegiatan, pengumuman resmi, dan kabar program DMI Kabupaten Lombok Tengah akan dipublikasikan secara berkala di laman ini."
    />
  ),
});
