import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const Route = createFileRoute("/kontak")({
  head: () => ({
    meta: [
      { title: "Kontak — DMI Kabupaten Lombok Tengah" },
      {
        name: "description",
        content: "Hubungi sekretariat DMI Kabupaten Lombok Tengah untuk kemitraan, konsultasi, atau informasi.",
      },
      { property: "og:title", content: "Kontak DMI Lombok Tengah" },
      { property: "og:description", content: "Hubungi sekretariat DMI Kabupaten Lombok Tengah." },
    ],
  }),
  component: () => (
    <PagePlaceholder
      eyebrow="Kontak"
      title="Mari berkolaborasi untuk umat."
      description="Sekretariat DMI Kabupaten Lombok Tengah terbuka untuk kemitraan, konsultasi, dan masukan. Formulir kontak lengkap dan peta lokasi akan segera tersedia di sini."
    />
  ),
});
