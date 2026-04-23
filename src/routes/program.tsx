import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const Route = createFileRoute("/program")({
  head: () => ({
    meta: [
      { title: "Program — DMI Kabupaten Lombok Tengah" },
      {
        name: "description",
        content:
          "Daftar lengkap program pembinaan, pemberdayaan, pendidikan, dan pelayanan DMI Kabupaten Lombok Tengah.",
      },
      { property: "og:title", content: "Program DMI Lombok Tengah" },
      { property: "og:description", content: "Pembinaan, pemberdayaan, pendidikan, pelayanan." },
    ],
  }),
  component: () => (
    <PagePlaceholder
      eyebrow="Program"
      title="Program pembinaan dan pemberdayaan umat."
      description="Detail lengkap setiap program unggulan DMI Lombok Tengah—mulai dari manajemen masjid, pendidikan dakwah, kegiatan sosial, hingga pelatihan remaja masjid—segera hadir di laman ini."
    />
  ),
});
