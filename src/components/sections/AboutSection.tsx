import { Compass, Sparkles, ShieldCheck, Network } from "lucide-react";
import { Reveal, Stagger, StaggerItem } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";

const HIGHLIGHTS = [
  {
    icon: Compass,
    title: "Visi Berkelanjutan",
    desc: "Menjadi rujukan pemakmuran masjid di Lombok Tengah dengan tata kelola modern dan dampak nyata.",
  },
  {
    icon: Sparkles,
    title: "Dakwah Moderat",
    desc: "Mengusung wasathiyah, menjaga harmoni, dan merawat keberagaman sosial-budaya Sasak.",
  },
  {
    icon: ShieldCheck,
    title: "Akuntabel",
    desc: "Transparansi pengelolaan dan pelaporan publik sebagai komitmen kepercayaan umat.",
  },
  {
    icon: Network,
    title: "Sinergi Luas",
    desc: "Berjejaring lintas masjid, lembaga, pemerintah, dan masyarakat sipil untuk kemaslahatan bersama.",
  },
];

export function AboutSection() {
  return (
    <section className="bg-background py-24 lg:py-32">
      <div className="container-page">
        <div className="grid grid-cols-12 gap-8 lg:gap-16">
          <div className="col-span-12 lg:col-span-5">
            <SectionHeading
              eyebrow="Tentang DMI Lombok Tengah"
              title={
                <>
                  Lembaga keumatan yang melayani masjid sebagai{" "}
                  <span className="text-brand-deep">pusat peradaban modern</span>.
                </>
              }
              description="Kami menghimpun pengurus masjid se-Kabupaten Lombok Tengah untuk berkolaborasi dalam pembinaan, pelayanan, dan pemberdayaan umat. Dari Praya hingga pelosok desa, dari kajian rutin hingga inisiatif sosial—semua bergerak dalam satu visi peradaban."
            />

            <Reveal delay={0.2}>
              <div className="mt-10 grid grid-cols-2 gap-6 max-w-md">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-deep">Visi</div>
                  <p className="mt-2 text-sm text-ink leading-relaxed">
                    Masjid yang makmur, umat yang berdaya, peradaban yang bermartabat.
                  </p>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-deep">Misi</div>
                  <p className="mt-2 text-sm text-ink leading-relaxed">
                    Membina, memberdayakan, dan memfasilitasi sinergi antar masjid dan umat.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>

          <div className="col-span-12 lg:col-span-7">
            <Stagger className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {HIGHLIGHTS.map((h, i) => (
                <StaggerItem key={h.title}>
                  <div
                    className={[
                      "h-full p-7 bg-white border border-line rounded-sm transition-all hover:shadow-elevated hover:-translate-y-0.5",
                      i % 2 === 1 ? "sm:mt-12" : "",
                    ].join(" ")}
                  >
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-brand/20 bg-brand-tint text-brand-deep">
                      <h.icon className="h-5 w-5" strokeWidth={1.5} />
                    </div>
                    <h3 className="mt-6 font-display font-bold text-lg text-ink">{h.title}</h3>
                    <p className="mt-2 text-sm text-ink-muted leading-relaxed">{h.desc}</p>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </div>
      </div>
    </section>
  );
}
