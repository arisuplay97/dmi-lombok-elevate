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

export const Route = createFileRoute("/")({
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
