import fs from "node:fs";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

const DATA_DIR = path.resolve(process.cwd(), ".data");
const SETTINGS_FILE = path.join(DATA_DIR, "tiara-settings.json");
const STATE_FILE = path.join(DATA_DIR, "tiara-state.json");

function ensureDataDirProtected(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const htaccessPath = path.join(DATA_DIR, ".htaccess");
  if (!fs.existsSync(htaccessPath)) {
    fs.writeFileSync(
      htaccessPath,
      "<IfModule mod_authz_core.c>\n  Require all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\n  Order deny,allow\n  Deny from all\n</IfModule>\n",
      "utf-8"
    );
  }
}

function handleSettingsSyncMiddleware(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void
): void {
  const urlPath = (req.url || "").split("?")[0];
  if (urlPath !== "/api/settings-sync") {
    next();
    return;
  }

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");

  if (req.method === "GET") {
    try {
      if (!fs.existsSync(SETTINGS_FILE)) {
        res.statusCode = 200;
        res.end(JSON.stringify({ ok: true, found: false }));
        return;
      }
      const raw = fs.readFileSync(SETTINGS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      res.statusCode = 200;
      res.end(
        JSON.stringify({
          ok: true,
          found: true,
          updatedAt: parsed?.updatedAt || null,
          settings: parsed?.settings || null,
          elevenVoices: parsed?.elevenVoices || null,
          cartesiaVoices: parsed?.cartesiaVoices || null,
        })
      );
    } catch {
      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true, found: false }));
    }
    return;
  }

  if (req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
      if (body.length > 512_000) {
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        const incoming = JSON.parse(body || "{}");
        if (!incoming || typeof incoming !== "object" || !incoming.settings) {
          res.statusCode = 400;
          res.end(
            JSON.stringify({ ok: false, message: "Payload pengaturan tidak valid" })
          );
          return;
        }
        ensureDataDirProtected();
        let existing: Record<string, unknown> = {};
        if (fs.existsSync(SETTINGS_FILE)) {
          try {
            existing = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
          } catch {
            existing = {};
          }
        }
        const updatedAt = new Date().toISOString();
        const toSave = {
          ...existing,
          updatedAt,
          settings: incoming.settings,
          ...(Array.isArray(incoming.elevenVoices)
            ? { elevenVoices: incoming.elevenVoices }
            : {}),
          ...(Array.isArray(incoming.cartesiaVoices)
            ? { cartesiaVoices: incoming.cartesiaVoices }
            : {}),
        };
        const tmpFile = `${SETTINGS_FILE}.tmp`;
        fs.writeFileSync(tmpFile, JSON.stringify(toSave, null, 2), "utf-8");
        fs.renameSync(tmpFile, SETTINGS_FILE);

        res.statusCode = 200;
        res.end(JSON.stringify({ ok: true, updatedAt }));
      } catch {
        res.statusCode = 500;
        res.end(
          JSON.stringify({
            ok: false,
            message: "Gagal menyimpan pengaturan ke server",
          })
        );
      }
    });
    return;
  }

  res.statusCode = 405;
  res.end(JSON.stringify({ ok: false, message: "Method not allowed" }));
}

function handleStateSyncMiddleware(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void
): void {
  const urlPath = (req.url || "").split("?")[0];
  if (urlPath !== "/api/state-sync") {
    next();
    return;
  }

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");

  if (req.method === "GET") {
    try {
      if (!fs.existsSync(STATE_FILE)) {
        res.statusCode = 200;
        res.end(JSON.stringify({ ok: true, found: false }));
        return;
      }
      const raw = fs.readFileSync(STATE_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      res.statusCode = 200;
      res.end(
        JSON.stringify({
          ok: true,
          found: true,
          updatedAt: parsed?.updatedAt || null,
          agendas: parsed?.agendas || null,
          notulenList: parsed?.notulenList || null,
          tugasList: parsed?.tugasList || null,
          waLogs: parsed?.waLogs || null,
          recipients: parsed?.recipients || null,
        })
      );
    } catch {
      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true, found: false }));
    }
    return;
  }

  if (req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
      if (body.length > 10_485_760) {
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        const incoming = JSON.parse(body || "{}");
        if (!incoming || typeof incoming !== "object" || !Array.isArray(incoming.agendas)) {
          res.statusCode = 400;
          res.end(
            JSON.stringify({ ok: false, message: "Payload state tidak valid" })
          );
          return;
        }
        ensureDataDirProtected();
        const updatedAt = new Date().toISOString();
        const toSave = {
          updatedAt,
          agendas: incoming.agendas,
          notulenList: Array.isArray(incoming.notulenList) ? incoming.notulenList : [],
          tugasList: Array.isArray(incoming.tugasList) ? incoming.tugasList : [],
          waLogs: Array.isArray(incoming.waLogs) ? incoming.waLogs : [],
          recipients: Array.isArray(incoming.recipients) ? incoming.recipients : [],
        };
        const tmpFile = `${STATE_FILE}.tmp`;
        fs.writeFileSync(tmpFile, JSON.stringify(toSave), "utf-8");
        fs.renameSync(tmpFile, STATE_FILE);

        res.statusCode = 200;
        res.end(JSON.stringify({ ok: true, updatedAt }));
      } catch {
        res.statusCode = 500;
        res.end(
          JSON.stringify({
            ok: false,
            message: "Gagal menyimpan state ke server",
          })
        );
      }
    });
    return;
  }

  res.statusCode = 405;
  res.end(JSON.stringify({ ok: false, message: "Method not allowed" }));
}

function pdamServerSyncPlugin(): Plugin {
  return {
    name: "pdam-server-settings-sync",
    configureServer(server) {
      server.middlewares.use(handleSettingsSyncMiddleware);
      server.middlewares.use(handleStateSyncMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handleSettingsSyncMiddleware);
      server.middlewares.use(handleStateSyncMiddleware);
    },
  };
}

const sharedProxy = {
  "/api-wangsaf": {
    target: "https://api.wangsaf.com/v1",
    changeOrigin: true,
    secure: true,
    rewrite: (p: string) => p.replace(/^\/api-wangsaf/, ""),
  },
  "/api-cartesia": {
    target: "https://api.cartesia.ai",
    changeOrigin: true,
    secure: true,
    rewrite: (p: string) => p.replace(/^\/api-cartesia/, ""),
  },
};

export default defineConfig({
  plugins: [
    pdamServerSyncPlugin(),
    TanStackRouterVite({ autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    tsconfigPaths({ projects: ["./tsconfig.json"] }),
  ],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  server: {
    proxy: sharedProxy,
  },
  preview: {
    proxy: sharedProxy,
  },
  build: {
    outDir: "dist",
  },
});
