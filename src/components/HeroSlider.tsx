import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { HERO_SLIDES } from "@/data/site";

export function HeroSlider() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, duration: 35 });
  const [selected, setSelected] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelected(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    onSelect();
    const id = setInterval(() => emblaApi.scrollNext(), 7000);
    return () => {
      clearInterval(id);
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  const scrollPrev = () => emblaApi?.scrollPrev();
  const scrollNext = () => emblaApi?.scrollNext();
  const scrollTo = (i: number) => emblaApi?.scrollTo(i);

  const slide = HERO_SLIDES[selected];

  return (
    <section className="relative w-full h-[100svh] min-h-[640px] max-h-[900px] overflow-hidden bg-[#0a0f0c]">
      {/* Embla viewport for backgrounds */}
      <div ref={emblaRef} className="absolute inset-0 overflow-hidden">
        <div className="flex h-full">
          {HERO_SLIDES.map((s, i) => (
            <div key={i} className="relative flex-[0_0_100%] h-full">
              <img
                src={s.image}
                alt=""
                className={[
                  "absolute inset-0 h-full w-full object-cover",
                  selected === i ? "animate-kenburns" : "scale-105",
                ].join(" ")}
                fetchPriority={i === 0 ? "high" : "low"}
                loading={i === 0 ? "eager" : "lazy"}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Layered gradients — strong enough for white text on bright images */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/30" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40" />
      <div className="absolute inset-0 grain pointer-events-none" />

      {/* Content */}
      <div className="relative h-full container-page flex flex-col justify-end pb-28 lg:pb-32 pt-32">
        <div className="grid grid-cols-12 gap-6 items-end">
          {/* Left: heading block */}
          <div className="col-span-12 lg:col-span-8 xl:col-span-7">
            <AnimatePresence mode="wait">
              <motion.div
                key={selected}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="flex items-center gap-3">
                  <span className="h-px w-10 bg-white/60" />
                  <span className="text-[0.7rem] sm:text-xs font-semibold tracking-[0.18em] uppercase text-white/85">
                    {slide.eyebrow}
                  </span>
                </div>

                <h1 className="mt-6 font-display font-bold text-white text-balance text-[2.25rem] sm:text-5xl lg:text-[4.25rem] xl:text-[4.75rem] leading-[1.02] tracking-tight">
                  {slide.title.map((line, i) => (
                    <span key={i} className="block">
                      {line}
                    </span>
                  ))}
                </h1>

                <p className="mt-7 max-w-xl text-base lg:text-lg text-white/80 leading-relaxed text-pretty">
                  {slide.subtitle}
                </p>

                <div className="mt-10 flex flex-wrap items-center gap-3">
                  <Link
                    to="/program"
                    className="group inline-flex items-center gap-2 px-6 py-3.5 bg-white text-ink font-semibold text-sm rounded-md hover:bg-brand-tint transition-colors"
                  >
                    Lihat Program
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  <Link
                    to="/tentang"
                    className="inline-flex items-center gap-2 px-6 py-3.5 border border-white/30 text-white font-semibold text-sm rounded-md hover:bg-white/10 transition-colors backdrop-blur-sm"
                  >
                    Tentang DMI
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right: meta + slider controls */}
          <div className="col-span-12 lg:col-span-4 xl:col-span-5 lg:pl-8">
            <div className="hidden lg:flex flex-col items-end gap-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`meta-${selected}`}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="text-right"
                >
                  <div className="text-[0.7rem] uppercase tracking-[0.2em] text-white/50">{slide.meta.label}</div>
                  <div className="mt-2 font-display font-semibold text-white text-lg">{slide.meta.value}</div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Bottom controls bar */}
        <div className="mt-16 flex items-center justify-between border-t border-white/15 pt-6">
          <div className="flex items-center gap-6">
            <div className="font-display font-semibold text-white text-sm">
              <span className="text-white">{String(selected + 1).padStart(2, "0")}</span>
              <span className="text-white/40 mx-2">/</span>
              <span className="text-white/50">{String(HERO_SLIDES.length).padStart(2, "0")}</span>
            </div>

            <div className="flex items-center gap-2.5">
              {HERO_SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => scrollTo(i)}
                  aria-label={`Slide ${i + 1}`}
                  className="group relative h-1 w-10 bg-white/20 overflow-hidden rounded-full"
                >
                  <span
                    className={[
                      "absolute inset-y-0 left-0 bg-white transition-all duration-500",
                      selected === i ? "w-full" : "w-0 group-hover:w-1/3",
                    ].join(" ")}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={scrollPrev}
              aria-label="Slide sebelumnya"
              className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-white/25 text-white hover:bg-white hover:text-ink transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={scrollNext}
              aria-label="Slide berikutnya"
              className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-white/25 text-white hover:bg-white hover:text-ink transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
