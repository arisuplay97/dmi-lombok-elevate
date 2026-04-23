import { useState } from "react";
import { X, ArrowUpRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { Reveal, Stagger, StaggerItem } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";
import { GALLERY } from "@/data/site";

const SPAN_CLASS: Record<string, string> = {
  normal: "row-span-1 col-span-1",
  tall: "row-span-2 col-span-1",
  wide: "row-span-1 col-span-1 md:col-span-2",
};

export function GallerySection() {
  const [active, setActive] = useState<number | null>(null);

  return (
    <section className="bg-background py-24 lg:py-32">
      <div className="container-page">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-16">
          <SectionHeading
            eyebrow="Galeri Kegiatan"
            title="Bingkai kegiatan yang menghidupkan masjid dan umat."
          />
          <Reveal delay={0.15}>
            <Link
              to="/galeri"
              className="inline-flex items-center gap-2 text-sm font-semibold text-brand-deep hover:gap-3 transition-all"
            >
              Lihat galeri lengkap
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Reveal>
        </div>

        <Stagger
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 auto-rows-[200px] md:auto-rows-[240px] gap-3 md:gap-4"
          stagger={0.06}
        >
          {GALLERY.map((g, i) => (
            <StaggerItem key={i} className={SPAN_CLASS[g.span] ?? SPAN_CLASS.normal}>
              <button
                type="button"
                onClick={() => setActive(i)}
                className="group relative h-full w-full overflow-hidden rounded-sm bg-muted block"
                aria-label={g.alt}
              >
                <img
                  src={g.src}
                  alt={g.alt}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white text-sm font-semibold opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 flex items-center justify-between">
                  <span className="text-balance">{g.alt}</span>
                  <ArrowUpRight className="h-4 w-4 shrink-0" />
                </div>
              </button>
            </StaggerItem>
          ))}
        </Stagger>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {active !== null && (
          <motion.div
            className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActive(null)}
          >
            <button
              onClick={() => setActive(null)}
              className="absolute top-6 right-6 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              aria-label="Tutup"
            >
              <X className="h-5 w-5" />
            </button>
            <motion.img
              key={active}
              src={GALLERY[active].src}
              alt={GALLERY[active].alt}
              className="max-h-[85vh] max-w-[90vw] object-contain rounded-sm shadow-deep"
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
