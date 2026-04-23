import { CountUp } from "@/components/CountUp";
import { Reveal } from "@/components/Reveal";
import { METRICS } from "@/data/site";

export function MetricsBand() {
  return (
    <section className="bg-brand-deep text-white relative overflow-hidden">
      <div className="absolute inset-0 grain pointer-events-none opacity-50" />
      <div className="container-page py-16 lg:py-20 relative">
        <div className="grid grid-cols-12 gap-8 items-end mb-12">
          <div className="col-span-12 md:col-span-6">
            <Reveal>
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-white/50" />
                <span className="text-[0.7rem] font-semibold tracking-[0.18em] uppercase text-white/70">
                  Dampak DMI Lombok Tengah
                </span>
              </div>
              <h2 className="mt-5 font-display font-bold text-white text-3xl md:text-[2.25rem] leading-tight text-balance">
                Jejak pelayanan yang terus tumbuh setiap tahun.
              </h2>
            </Reveal>
          </div>
          <div className="col-span-12 md:col-span-6 md:text-right">
            <Reveal delay={0.1}>
              <p className="text-sm md:text-base text-white/65 leading-relaxed max-w-md md:ml-auto">
                Angka-angka di bawah merefleksikan kerja kolektif pengurus, jamaah,
                dan mitra di seluruh wilayah Kabupaten Lombok Tengah.
              </p>
            </Reveal>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4">
          {METRICS.map((m, i) => (
            <Reveal key={m.label} delay={i * 0.08}>
              <div
                className={[
                  "py-8 lg:py-10 px-1 lg:px-6 border-t border-white/15",
                  i !== 0 ? "lg:border-l lg:border-white/15" : "",
                ].join(" ")}
              >
                <div className="font-display font-bold text-white text-5xl md:text-6xl lg:text-[4.5rem] leading-none tracking-tight">
                  <CountUp to={m.value} suffix={m.suffix} />
                </div>
                <div className="mt-5 text-sm md:text-base font-semibold text-white">{m.label}</div>
                <div className="mt-1 text-xs md:text-sm text-white/55">{m.caption}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
