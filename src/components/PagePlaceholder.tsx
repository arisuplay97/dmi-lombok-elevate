import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Reveal } from "@/components/Reveal";

type Props = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PagePlaceholder({ eyebrow, title, description }: Props) {
  return (
    <section className="relative pt-32 pb-32 lg:pt-40 lg:pb-40 bg-background overflow-hidden">
      {/* decorative grid lines */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="container-page h-full">
          <div className="h-full grid grid-cols-12 gap-8">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="border-l border-line/40 h-full" />
            ))}
          </div>
        </div>
      </div>

      <div className="container-page relative">
        <div className="max-w-3xl">
          <Reveal>
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-brand" />
              <span className="eyebrow">{eyebrow}</span>
            </div>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 className="mt-6 font-display font-bold text-ink text-5xl md:text-6xl lg:text-7xl leading-[1.02] tracking-tight text-balance">
              {title}
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-7 text-lg text-ink-muted leading-relaxed max-w-2xl">{description}</p>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="mt-12 inline-flex items-center gap-3 px-5 py-3 rounded-full border border-line bg-white/60 backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-brand animate-pulse" />
              <span className="text-sm font-medium text-ink-muted">
                Halaman ini sedang dalam tahap penyusunan konten.
              </span>
            </div>
          </Reveal>

          <Reveal delay={0.25}>
            <div className="mt-12 flex flex-wrap items-center gap-4">
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-brand-deep text-white font-semibold text-sm rounded-md hover:bg-brand transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Kembali ke Beranda
              </Link>
              <Link
                to="/kontak"
                className="inline-flex items-center gap-2 px-6 py-3.5 border border-line text-ink font-semibold text-sm rounded-md hover:bg-muted transition-colors"
              >
                Hubungi Kami
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
