import { createFileRoute } from "@tanstack/react-router";
import { HeroSlider } from "@/components/HeroSlider";
import { BrandStatement } from "@/components/sections/BrandStatement";
import { MetricsBand } from "@/components/sections/MetricsBand";
import { KetuaMessage } from "@/components/sections/KetuaMessage";
import { AboutSection } from "@/components/sections/AboutSection";
import { Programs } from "@/components/sections/Programs";
import { NewsSection } from "@/components/sections/NewsSection";
import { GallerySection } from "@/components/sections/GallerySection";
import { CTABand } from "@/components/sections/CTABand";
import heroOg from "@/assets/hero-1.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Beranda — DMI Kabupaten Lombok Tengah" },
      {
        name: "description",
        content:
          "Dewan Masjid Indonesia Kabupaten Lombok Tengah: pembinaan masjid, pemberdayaan umat, pendidikan dakwah, dan pelayanan sosial untuk peradaban yang bermartabat.",
      },
      { property: "og:title", content: "Dewan Masjid Indonesia — Kabupaten Lombok Tengah" },
      {
        property: "og:description",
        content: "Memakmurkan masjid, menguatkan umat, membangun peradaban di Lombok Tengah.",
      },
      { property: "og:image", content: heroOg },
      { name: "twitter:image", content: heroOg },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <>
      <HeroSlider />
      <BrandStatement />
      <MetricsBand />
      <KetuaMessage />
      <AboutSection />
      <Programs />
      <NewsSection />
      <GallerySection />
      <CTABand />
    </>
  );
}
