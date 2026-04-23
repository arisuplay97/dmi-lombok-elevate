import { Link } from "@tanstack/react-router";
import { Mail, Phone, MapPin, Instagram, Facebook, Youtube } from "lucide-react";
import logo from "@/assets/logo-dmi.png";
import { NAV, SITE } from "@/data/site";

export function Footer() {
  return (
    <footer className="bg-[#0F1714] text-white/80">
      <div className="container-page py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Brand */}
          <div className="lg:col-span-5">
            <div className="flex items-center gap-3">
              <div className="bg-white/95 rounded-md p-1.5">
                <img src={logo} alt="DMI" className="h-10 w-10" width={40} height={40} />
              </div>
              <div className="leading-tight">
                <div className="font-display font-bold text-white text-base">Dewan Masjid Indonesia</div>
                <div className="text-xs text-white/60 uppercase tracking-wider">{SITE.region}</div>
              </div>
            </div>
            <p className="mt-6 text-sm leading-relaxed text-white/65 max-w-md">
              Lembaga keumatan yang mengkoordinasi pembinaan, pelayanan, dan pemberdayaan masjid sebagai pusat
              ibadah, pendidikan, dan penguatan masyarakat di Kabupaten Lombok Tengah.
            </p>

            <div className="mt-8 flex gap-2">
              {[
                { icon: Instagram, href: SITE.social.instagram, label: "Instagram" },
                { icon: Facebook, href: SITE.social.facebook, label: "Facebook" },
                { icon: Youtube, href: SITE.social.youtube, label: "YouTube" },
              ].map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/15 hover:border-white/40 hover:bg-white/5 transition-colors"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Navigasi */}
          <div className="lg:col-span-3">
            <div className="text-xs uppercase tracking-[0.18em] text-white/50 font-semibold mb-5">Navigasi</div>
            <ul className="space-y-3">
              {NAV.map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className="text-sm text-white/75 hover:text-white transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Kontak */}
          <div className="lg:col-span-4">
            <div className="text-xs uppercase tracking-[0.18em] text-white/50 font-semibold mb-5">Hubungi Kami</div>
            <ul className="space-y-4 text-sm">
              <li className="flex gap-3">
                <MapPin className="h-4 w-4 mt-0.5 text-white/50 shrink-0" />
                <span className="text-white/75 leading-relaxed">{SITE.address}</span>
              </li>
              <li className="flex gap-3">
                <Mail className="h-4 w-4 mt-0.5 text-white/50 shrink-0" />
                <a href={`mailto:${SITE.email}`} className="text-white/75 hover:text-white transition-colors">
                  {SITE.email}
                </a>
              </li>
              <li className="flex gap-3">
                <Phone className="h-4 w-4 mt-0.5 text-white/50 shrink-0" />
                <a href={`tel:${SITE.phone.replace(/\s/g, "")}`} className="text-white/75 hover:text-white transition-colors">
                  {SITE.phone}
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-white/50">
          <div>© {new Date().getFullYear()} Dewan Masjid Indonesia · Kabupaten Lombok Tengah. Hak cipta dilindungi.</div>
          <div className="flex gap-6">
            <span>Kebijakan Privasi</span>
            <span>Ketentuan Layanan</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
