import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import logo from "../assets/logo.png";
import { NAV, SITE } from "@/data/site";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <header
      data-scrolled={scrolled}
      className={[
        "group/nav fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-white/95 backdrop-blur-md border-b border-line shadow-[0_1px_20px_-8px_rgba(0,0,0,0.08)]"
          : "bg-transparent border-b border-transparent",
      ].join(" ")}
    >
      <div
        className={[
          "container-page flex items-center justify-between transition-all duration-300",
          scrolled ? "h-16" : "h-20",
        ].join(" ")}
      >
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 group" aria-label="Beranda DMI Lombok Tengah">
          <img
            src={logo}
            alt="Logo DMI"
            className={[
              "transition-all duration-300 select-none object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]",
              scrolled ? "h-11 w-11" : "h-16 w-16",
            ].join(" ")}
            width={120}
            height={120}
          />
          <div className="hidden sm:flex flex-col leading-tight">
            <span className={[
              "font-display font-bold text-[1rem] tracking-tight transition-colors",
              scrolled ? "text-ink" : "text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]",
            ].join(" ")}>
              Dewan Masjid Indonesia
            </span>
            <span className={[
              "text-[0.75rem] font-medium tracking-wide uppercase transition-colors",
              scrolled ? "text-ink-muted" : "text-white/95 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]",
            ].join(" ")}>
              Kabupaten Lombok Tengah
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {NAV.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={[
                  "relative px-3.5 py-2 text-[0.875rem] font-medium transition-colors rounded-md",
                  scrolled
                    ? active ? "text-brand-deep" : "text-ink/80 hover:text-brand-deep"
                    : active ? "text-white" : "text-white/85 hover:text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]",
                ].join(" ")}
              >
                {item.label}
                {active && (
                  <motion.span
                    layoutId="nav-underline"
                    className={[
                      "absolute left-3.5 right-3.5 -bottom-px h-[2px]",
                      scrolled ? "bg-brand" : "bg-white",
                    ].join(" ")}
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* CTA + mobile toggle */}
        <div className="flex items-center gap-2">
          <Link
            to="/kontak"
            className={[
              "hidden lg:inline-flex items-center gap-1.5 px-4 py-2 text-[0.875rem] font-semibold rounded-md transition-colors",
              scrolled
                ? "text-white bg-brand-deep hover:bg-brand"
                : "text-brand-deep bg-white/95 hover:bg-white backdrop-blur-sm",
            ].join(" ")}
          >
            Hubungi Kami
            <ChevronDown className="h-3.5 w-3.5 -rotate-90" />
          </Link>

          <button
            onClick={() => setOpen((v) => !v)}
            className={[
              "lg:hidden inline-flex items-center justify-center h-10 w-10 rounded-md transition-colors",
              scrolled ? "text-ink hover:bg-muted" : "text-white hover:bg-white/10",
            ].join(" ")}
            aria-label="Buka menu"
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="lg:hidden border-t border-line bg-white overflow-hidden"
          >
            <nav className="container-page py-4 flex flex-col">
              {NAV.map((item) => {
                const active = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={[
                      "flex items-center justify-between py-3 border-b border-line/60 text-[0.95rem] font-medium",
                      active ? "text-brand-deep" : "text-ink",
                    ].join(" ")}
                  >
                    {item.label}
                    <ChevronDown className="h-4 w-4 -rotate-90 opacity-40" />
                  </Link>
                );
              })}
              <Link
                to="/kontak"
                className="mt-4 inline-flex items-center justify-center w-full py-3 text-[0.9rem] font-semibold text-white bg-brand-deep rounded-md"
              >
                Hubungi {SITE.shortName}
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
