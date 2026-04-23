import { ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Reveal } from "@/components/Reveal";
import hero4 from "@/assets/hero-4.jpg";

export function CTABand() {
  return (
    <section className="relative overflow-hidden bg-brand-deep">
      <div className="absolute inset-0">
        <img
          src={hero4}
          alt=""
          className="h-full w-full object-cover opacity-20"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-deep via-brand-deep/95 to-brand-deep/80" />
      </div>

      <div className="container-page relative py-24 lg:py-32">
        <div className="grid grid-cols-12 gap-8 items-center">
          <Reveal className="col-span-12 lg:col-span-8">
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-white/60" />
              <span className="text-[0.7rem] font-semibold tracking-[0.18em] uppercase text-white/75">
                Bergerak Bersama
              </span>
            </div>
            <h2 className="mt-6 font-display font-bold text-white text-3xl md:text-5xl lg:text-[3.5rem] leading-[1.05] text-balance">
              Bersama Memakmurkan Masjid di Lombok Tengah.
            </h2>
            <p className="mt-6 text-base lg:text-lg text-white/75 leading-relaxed max-w-2xl">
              Bergabunglah dalam ikhtiar pembinaan, pelayanan, dan pemberdayaan masjid yang
              berdampak nyata bagi umat dan masyarakat luas.
            </p>
          </Reveal>

          <Reveal delay={0.15} className="col-span-12 lg:col-span-4 lg:text-right">
            <div className="flex flex-col sm:flex-row lg:flex-col items-stretch gap-3 lg:items-end">
              <Link
                to="/kontak"
                className="group inline-flex items-center justify-center gap-2 px-6 py-4 bg-white text-brand-deep font-semibold text-sm rounded-md hover:bg-brand-tint transition-colors"
              >
                Hubungi Kami
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/program"
                className="inline-flex items-center justify-center gap-2 px-6 py-4 border border-white/30 text-white font-semibold text-sm rounded-md hover:bg-white/10 transition-colors"
              >
                Jelajahi Program
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
