import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="eyebrow">404</div>
        <h1 className="mt-3 font-display text-5xl font-bold text-ink">Halaman tidak ditemukan</h1>
        <p className="mt-4 text-base text-ink-muted">
          Halaman yang Anda cari tidak tersedia atau telah dipindahkan.
        </p>
        <div className="mt-8">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-brand-deep px-5 py-3 text-sm font-semibold text-white hover:bg-brand transition-colors"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Dewan Masjid Indonesia — Kabupaten Lombok Tengah" },
      {
        name: "description",
        content:
          "Situs resmi Dewan Masjid Indonesia (DMI) Kabupaten Lombok Tengah. Memakmurkan masjid, menguatkan umat, membangun peradaban.",
      },
      { name: "author", content: "DMI Kabupaten Lombok Tengah" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "DMI Kabupaten Lombok Tengah" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <>
      <Navbar />
      <main className="pt-0">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
