import { Outlet, Link, createRootRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

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
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

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
