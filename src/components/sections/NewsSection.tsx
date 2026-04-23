import { ArrowUpRight, CalendarDays } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";
import { NEWS } from "@/data/site";

export function NewsSection() {
  const featured = NEWS.find((n) => n.featured) ?? NEWS[0];
  const rest = NEWS.filter((n) => n !== featured);

  return (
    <section className="bg-white py-24 lg:py-32 border-t border-line">
      <div className="container-page">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-16">
          <SectionHeading eyebrow="Berita Terbaru" title="Kabar dari masjid dan umat Lombok Tengah." />
          <Reveal delay={0.15}>
            <Link
              to="/berita"
              className="inline-flex items-center gap-2 text-sm font-semibold text-brand-deep hover:gap-3 transition-all"
            >
              Semua berita
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Reveal>
        </div>

        <div className="grid grid-cols-12 gap-8 lg:gap-10">
          {/* Featured */}
          <Reveal className="col-span-12 lg:col-span-7">
            <a href={featured.href} className="group block">
              <div className="aspect-[16/10] overflow-hidden bg-muted rounded-sm">
                <img
                  src={featured.image}
                  alt={featured.title}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  loading="lazy"
                  width={1280}
                  height={800}
                />
              </div>
              <div className="mt-6">
                <div className="flex items-center gap-3 text-xs">
                  <span className="px-2.5 py-1 bg-brand-tint text-brand-deep font-semibold uppercase tracking-wider rounded-sm">
                    {featured.category}
                  </span>
                  <span className="flex items-center gap-1.5 text-ink-muted">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {featured.date}
                  </span>
                </div>
                <h3 className="mt-4 font-display font-bold text-ink text-2xl md:text-[1.75rem] leading-tight text-balance group-hover:text-brand-deep transition-colors">
                  {featured.title}
                </h3>
                <p className="mt-3 text-base text-ink-muted leading-relaxed max-w-2xl">{featured.excerpt}</p>
                <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand-deep">
                  Baca selengkapnya
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </div>
            </a>
          </Reveal>

          {/* Side list */}
          <div className="col-span-12 lg:col-span-5 flex flex-col divide-y divide-line">
            {rest.map((n, i) => (
              <Reveal key={n.title} delay={0.1 + i * 0.08}>
                <a href={n.href} className="group flex gap-5 py-6 first:pt-0 last:pb-0">
                  <div className="h-24 w-32 shrink-0 overflow-hidden rounded-sm bg-muted">
                    <img
                      src={n.image}
                      alt={n.title}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      loading="lazy"
                      width={400}
                      height={250}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-3 text-[0.7rem]">
                      <span className="font-semibold uppercase tracking-wider text-brand-deep">{n.category}</span>
                      <span className="text-ink-muted">{n.date}</span>
                    </div>
                    <h4 className="mt-2 font-display font-semibold text-ink leading-snug group-hover:text-brand-deep transition-colors text-balance">
                      {n.title}
                    </h4>
                  </div>
                </a>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
