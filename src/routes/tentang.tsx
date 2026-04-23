import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const Route = createFileRoute("/tentang")({
  head: () => ({
    meta: [
      { title: "Tentang Kami — DMI Kabupaten Lombok Tengah" },
      {
        name: "description",
        content:
          "Mengenal Dewan Masjid Indonesia Kabupaten Lombok Tengah: visi, misi, kepengurusan, dan komitmen pelayanan kepada umat.",
      },
      { property: "og:title", content: "Tentang DMI Kabupaten Lombok Tengah" },
      { property: "og:description", content: "Visi, misi, dan kepengurusan DMI Lombok Tengah." },
    ],
  }),
  component: () => (
    <PagePlaceholder
      eyebrow="Tentang Kami"
      title="Mengenal lebih dekat DMI Lombok Tengah."
      description="Sejarah, visi, misi, struktur kepengurusan, serta komitmen pelayanan Dewan Masjid Indonesia Kabupaten Lombok Tengah—akan segera tersedia di laman ini."
    />
  ),
});
