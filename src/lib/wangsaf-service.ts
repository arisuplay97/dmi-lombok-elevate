import type { AssistantSettings } from "@/lib/types";

/**
 * Normalisasi nomor telepon Indonesia (misal "0812-3700-0001" atau "+62 819-1744-2210")
 * menjadi format standar Wangsaf ("6281237000001")
 */
export function normalizeWhatsappTarget(rawPhone: string): string {
  const trimmed = rawPhone.trim();
  if (trimmed.endsWith("@s.whatsapp.net") || trimmed.endsWith("@g.us")) {
    return trimmed;
  }
  let digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith("0")) {
    digits = `62${digits.slice(1)}`;
  } else if (digits.startsWith("8")) {
    digits = `62${digits}`;
  }
  return digits;
}

/**
 * Memanggil endpoint resmi Wangsaf v1 melalui relay same-origin (/api-wangsaf pada Vite
 * atau ./api/wangsaf-proxy.php pada Laragon Apache) agar bebas dari pemblokiran CORS browser.
 */
async function callWangsafApi(
  baseUrl: string,
  subPath: "/device/status" | "/chat/send-text",
  apiKey: string,
  bodyObj?: Record<string, unknown>
): Promise<{ ok: boolean; status: number; json: Record<string, unknown> | null }> {
  const cleanBase = (baseUrl.trim() || "https://api.wangsaf.com/v1").replace(
    /\/$/,
    ""
  );
  const isOfficialWangsaf = /api\.wangsaf\.com/i.test(cleanBase);

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "Api-Key": apiKey,
  };
  const bodyStr = JSON.stringify(bodyObj ?? {});

  if (isOfficialWangsaf) {
    // 1. Jalur utama: Proxy same-origin Vite (/api-wangsaf/...)
    try {
      const proxyRes = await fetch(`/api-wangsaf${subPath}`, {
        method: "POST",
        headers,
        body: bodyStr,
      });
      const contentType = proxyRes.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const json = (await proxyRes.json().catch(() => null)) as Record<
          string,
          unknown
        > | null;
        return { ok: proxyRes.ok, status: proxyRes.status, json };
      }
    } catch {
      // Lanjut ke fallback relay PHP Laragon
    }

    // 2. Fallback: Relay PHP Laragon (./api/wangsaf-proxy.php) bila dibuka lewat Apache/Nginx
    try {
      const phpRes = await fetch(
        `./api/wangsaf-proxy.php?path=${encodeURIComponent(subPath)}`,
        {
          method: "POST",
          headers,
          body: bodyStr,
        }
      );
      const contentType = phpRes.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const json = (await phpRes.json().catch(() => null)) as Record<
          string,
          unknown
        > | null;
        return { ok: phpRes.ok, status: phpRes.status, json };
      }
    } catch {
      // Lanjut ke percobaan langsung terakhir
    }
  }

  // 3. Endpoint custom internal atau percobaan langsung
  const directRes = await fetch(`${cleanBase}${subPath}`, {
    method: "POST",
    headers,
    body: bodyStr,
  });
  const json = (await directRes.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  return { ok: directRes.ok, status: directRes.status, json };
}

export interface WangsafDeviceStatusResult {
  ok: boolean;
  connected: boolean;
  deviceName?: string;
  jid?: string;
  message: string;
}

/**
 * Cek status koneksi perangkat Wangsaf sesuai dokumentasi resmi https://docs.wangsaf.com
 * Endpoint: POST {baseUrl}/device/status (Header: Api-Key, 0 token)
 */
export async function checkWangsafDeviceStatus(
  settings: AssistantSettings
): Promise<WangsafDeviceStatusResult> {
  const apiKey = settings.waApiToken.trim().replace(/^["']|["']$/g, "");
  const baseUrl = settings.waBaseUrl.trim() || "https://api.wangsaf.com/v1";

  if (!apiKey) {
    return {
      ok: false,
      connected: false,
      message:
        "Api-Key Perangkat Wangsaf belum diisi. Salin Api-Key dari menu Perangkat di dashboard Wangsaf.",
    };
  }

  try {
    const { ok, status, json } = await callWangsafApi(
      baseUrl,
      "/device/status",
      apiKey
    );

    if (!ok) {
      const errMsg =
        (typeof json?.message === "string" ? json.message : "") ||
        `HTTP ${status} saat mengecek status perangkat`;
      return {
        ok: false,
        connected: false,
        message: `Gagal mengecek perangkat Wangsaf: ${errMsg}`,
      };
    }

    const dataObj = (json?.data ?? {}) as Record<string, unknown>;
    const deviceName = String(dataObj.name || "Perangkat Wangsaf");
    const isConnected = Boolean(dataObj.is_connected);
    const jid = String(dataObj.jid || "");

    return {
      ok: true,
      connected: isConnected,
      deviceName,
      jid,
      message: isConnected
        ? `Terhubung: "${deviceName}" (${jid || "Online"}) — 0 token terpakai.`
        : `Perangkat "${deviceName}" terdaftar di Wangsaf namun WhatsApp belum tertaut (scan QR terlebih dahulu di dashboard Wangsaf).`,
    };
  } catch {
    return {
      ok: false,
      connected: false,
      message:
        "Tidak dapat menjangkau server Wangsaf. Pastikan koneksi internet aktif.",
    };
  }
}

export interface SendWhatsappResult {
  ok: boolean;
  simulated: boolean;
  chatId?: string;
  errorMessage?: string;
}

/**
 * Pengiriman pesan teks WhatsApp melalui Wangsaf API v1
 * Endpoint: POST {baseUrl}/chat/send-text
 * Header: Api-Key: <API_KEY_PERANGKAT>, Content-Type: application/json
 * Body: { "target": "628...", "message": "..." }
 */
export async function sendWhatsappViaGateway(params: {
  targetPhone: string;
  message: string;
  settings: AssistantSettings;
}): Promise<SendWhatsappResult> {
  const { targetPhone, message, settings } = params;
  const apiKey = settings.waApiToken.trim().replace(/^["']|["']$/g, "");
  const target = normalizeWhatsappTarget(targetPhone);

  if (!target || target.length < 8) {
    return {
      ok: false,
      simulated: false,
      errorMessage: "Nomor tujuan WhatsApp tidak valid",
    };
  }

  // Jika Api-Key belum diisi, jalankan sebagai mode simulasi aman tanpa error
  if (!apiKey) {
    return { ok: true, simulated: true };
  }

  const baseUrl = (
    settings.waBaseUrl.trim() || "https://api.wangsaf.com/v1"
  ).replace(/\/$/, "");

  try {
    if (settings.waGateway === "Wangsaf") {
      const { ok, status, json } = await callWangsafApi(
        baseUrl,
        "/chat/send-text",
        apiKey,
        {
          target,
          message,
          is_forwarded: false,
        }
      );

      if (!ok) {
        const msg =
          (typeof json?.message === "string" ? json.message : "") ||
          `Wangsaf HTTP ${status}`;
        return {
          ok: false,
          simulated: false,
          errorMessage: msg,
        };
      }

      const dataObj = (json?.data ?? {}) as Record<string, unknown>;
      return {
        ok: true,
        simulated: false,
        chatId: dataObj.chat_id ? String(dataObj.chat_id) : undefined,
      };
    }

    // Custom Webhook / WhatsApp Business API
    const endpoint =
      settings.waGateway === "Custom Webhook"
        ? baseUrl
        : `${baseUrl}/messages`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ target, to: target, message, text: message }),
    });

    if (!res.ok) {
      return {
        ok: false,
        simulated: false,
        errorMessage: `${settings.waGateway} HTTP ${res.status}`,
      };
    }
    return { ok: true, simulated: false };
  } catch {
    return {
      ok: false,
      simulated: false,
      errorMessage: "Gagal menghubungi server gateway WhatsApp",
    };
  }
}
