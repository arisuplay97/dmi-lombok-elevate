import { Quote } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import ketuaImg from "../../assets/ketua2.png";
import { KETUA } from "@/data/site";

export function KetuaMessage() {
  return (
    <section className="bg-background py-24 lg:py-32">
      <div className="container-page">
        <div className="grid grid-cols-12 gap-8 lg:gap-16 items-center">
          {/* Image */}
          <div className="col-span-12 lg:col-span-5">
            <Reveal>
              <div className="relative">
                <div className="overflow-hidden">
                  <img
                    src={ketuaImg}
                    alt={KETUA.name}
                    className="h-auto w-full object-contain"
                    loading="lazy"
                    width={1024}
                    height={1280}
                  />
                </div>
                {/* offset accent block */}
                <div className="absolute -bottom-6 -right-6 hidden md:block">
                  <div className="bg-brand-deep text-white px-6 py-5 max-w-[14rem] shadow-elevated">
                    <div className="text-[0.7rem] uppercase tracking-[0.18em] text-white/70">Kepemimpinan</div>
                    <div className="mt-1.5 font-display font-semibold text-base leading-tight">
                      Periode 2023 — 2028
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Message */}
          <div className="col-span-12 lg:col-span-7 lg:pl-8">
            <Reveal>
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-brand" />
                <span className="eyebrow">Sambutan Ketua</span>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="relative mt-8">
                <Quote
                  className="absolute -top-6 -left-2 h-20 w-20 text-brand-tint"
                  strokeWidth={1}
                  aria-hidden
                />
                <blockquote className="relative font-display font-semibold text-2xl md:text-[1.75rem] lg:text-[2rem] leading-[1.3] text-ink text-balance">
                  &ldquo;{KETUA.quote}&rdquo;
                </blockquote>
              </div>
            </Reveal>

            <Reveal delay={0.18}>
              <div className="mt-8 space-y-5 text-base text-ink-muted leading-relaxed max-w-2xl">
                {KETUA.body.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </Reveal>

            <Reveal delay={0.25}>
              <div className="mt-10 pt-6 border-t border-line flex items-center gap-4">
                <div>
                  <div className="font-display font-bold text-ink text-xl md:text-2xl">{KETUA.name}</div>
                  <div className="text-base text-ink-muted mt-1.5 font-medium">{KETUA.title}</div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
