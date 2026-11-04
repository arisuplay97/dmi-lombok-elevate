import { Outlet, Link, createRootRoute } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { PdamStoreProvider } from "@/lib/pdam-store";
import { AppShell } from "@/components/pdam/AppShell";

function NotFoundComponent() {
  return (
    <div className="c" style={{ textAlign: "center", padding: "56px 24px", marginTop: 28 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#6B7BFF" }}>404</div>
      <h1 style={{ fontSize: 32, fontWeight: 700, margin: "8px 0 10px" }}>
        Halaman tidak ditemukan
      </h1>
      <p style={{ fontSize: 14, color: "#4A505C", margin: "0 0 22px" }}>
        Modul yang Anda cari tidak tersedia di portal Asisten Virtual Dirut.
      </p>
      <Link
        to="/"
        className="pill"
        style={{ background: "#14171F", color: "#fff" }}
      >
        Kembali ke Beranda
      </Link>
    </div>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootComponent() {
  return (
    <PdamStoreProvider>
      <AppShell>
        <Outlet />
      </AppShell>
      <Toaster position="bottom-right" richColors />
    </PdamStoreProvider>
  );
}
