import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";
import "./styles.css";

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

declare global {
  interface Window {
    __pdamDeferredPrompt?: BeforeInstallPromptEvent | null;
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    window.__pdamDeferredPrompt = e as BeforeInstallPromptEvent;
    window.dispatchEvent(new Event("pdam-install-available"));
  });

  window.addEventListener("appinstalled", () => {
    window.__pdamDeferredPrompt = null;
    window.dispatchEvent(new Event("pdam-install-available"));
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Abaikan bila dijalankan di lingkungan non-HTTPS non-localhost
      });
    });
  }
}

const router = getRouter();

const rootElement = document.getElementById("root")!;
createRoot(rootElement).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
