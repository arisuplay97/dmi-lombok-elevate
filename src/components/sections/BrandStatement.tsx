import { Reveal } from "@/components/Reveal";

export function BrandStatement() {
  return (
    <section className="bg-background py-24 lg:py-32">
      <div className="container-page">
        <div className="grid grid-cols-12 gap-8 lg:gap-16">
          <div className="col-span-12 lg:col-span-4">
            <Reveal>
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-brand" />
                <span className="eyebrow">Sejak 2002</span>
              </div>
              <div className="mt-8 font-display font-bold text-ink leading-none">
                <div className="text-[5.5rem] md:text-[7rem] lg:text-[8rem] tracking-tighter">22</div>
                <div className="text-2xl md:text-3xl text-ink-muted -mt-2 font-medium">Tahun pengabdian</div>
              </div>
              <div className="mt-8 hairline" />
              <div className="mt-6 text-sm text-ink-muted leading-relaxed">
                Mengakar di Lombok Tengah, melayani umat dari masjid ke masjid,
                dari pengurus ke pengurus, dari generasi ke generasi.
              </div>
            </Reveal>
          </div>

          <div className="col-span-12 lg:col-span-8 lg:pl-12 lg:border-l lg:border-line">
            <Reveal delay={0.1}>
              <p className="font-display text-[1.5rem] md:text-[2rem] lg:text-[2.5rem] leading-[1.25] tracking-tight text-ink text-balance">
                Dewan Masjid Indonesia Kabupaten Lombok Tengah hadir sebagai{" "}
                <span className="text-brand-deep">simpul keumatan</span> yang menggerakkan
                pembinaan, pemberdayaan, dan pelayanan masjid menjadi pusat
                ibadah, pendidikan, dan penguatan masyarakat yang berkelanjutan.
              </p>
            </Reveal>

            <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 lg:gap-8">
              {[
                { label: "Pembinaan", desc: "Tata kelola dan kapasitas pengurus masjid yang profesional dan akuntabel." },
                { label: "Pemberdayaan", desc: "Ekonomi keumatan, pendidikan, dan kesejahteraan jamaah berbasis masjid." },
                { label: "Pelayanan", desc: "Layanan keagamaan, sosial, dan kemanusiaan yang menyentuh akar persoalan." },
              ].map((it, i) => (
                <Reveal key={it.label} delay={0.15 + i * 0.08}>
                  <div className="border-t border-ink pt-5">
                    <div className="text-xs font-semibold text-brand-deep uppercase tracking-[0.18em]">
                      {String(i + 1).padStart(2, "0")} · {it.label}
                    </div>
                    <p className="mt-3 text-sm text-ink-muted leading-relaxed">{it.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
