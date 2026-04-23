import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Building2, HandHeart, BookOpen, HeartHandshake, Users, Handshake } from "lucide-react";
import { Reveal, Stagger, StaggerItem } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";
import { PROGRAMS } from "@/data/site";

const ICONS = {
  Building2, HandHeart, BookOpen, HeartHandshake, Users, Handshake,
} as const;

export function Programs() {
  return (
    <section className="bg-white py-24 lg:py-32 border-y border-line">
      <div className="container-page">
        <div className="grid grid-cols-12 gap-8 mb-16 items-end">
          <div className="col-span-12 lg:col-span-8">
            <SectionHeading
              eyebrow="Program Unggulan"
              title={
                <>
                  Enam pilar pelayanan yang menggerakkan{" "}
                  <span className="text-brand-deep">masjid sebagai pusat peradaban</span>.
                </>
              }
            />
          </div>
          <div className="col-span-12 lg:col-span-4 lg:text-right">
            <Reveal delay={0.15}>
              <Link
                to="/program"
                className="inline-flex items-center gap-2 text-sm font-semibold text-brand-deep hover:gap-3 transition-all"
              >
                Lihat semua program
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Reveal>
          </div>
        </div>

        <Stagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-line">
          {PROGRAMS.map((p, i) => {
            const Icon = ICONS[p.icon as keyof typeof ICONS];
            return (
              <StaggerItem key={p.title}>
                <article className="group relative bg-white p-8 lg:p-10 h-full flex flex-col transition-colors hover:bg-brand-tint/40 cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-md bg-brand-tint text-brand-deep transition-all group-hover:bg-brand-deep group-hover:text-white">
                      <Icon className="h-6 w-6" strokeWidth={1.5} />
                    </div>
                    <span className="text-[0.7rem] font-mono text-ink-muted/60 mt-1.5">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <h3 className="mt-8 font-display font-bold text-xl text-ink leading-tight">
                    {p.title}
                  </h3>
                  <p className="mt-3 text-sm text-ink-muted leading-relaxed flex-1">{p.desc}</p>

                  <div className="mt-8 flex items-center gap-2 text-sm font-semibold text-brand-deep opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                    Selengkapnya
                    <ArrowUpRight className="h-4 w-4" />
                  </div>
                </article>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </section>
  );
}
