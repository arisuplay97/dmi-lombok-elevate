import type {
  AssistantSettings,
  ChatTurn,
  NotulenItem,
  NotulenPhoto,
  NotulenReadScope,
  TugasItem,
} from "@/lib/types";

const ORDINAL_ID = [
  "Pertama",
  "Kedua",
  "Ketiga",
  "Keempat",
  "Kelima",
  "Keenam",
  "Ketujuh",
  "Kedelapan",
];

const MONTH_MAP: Record<string, string> = {
  januari: "01",
  jan: "01",
  februari: "02",
  feb: "02",
  maret: "03",
  mar: "03",
  april: "04",
  apr: "04",
  mei: "05",
  juni: "06",
  jun: "06",
  juli: "07",
  jul: "07",
  agustus: "08",
  agu: "08",
  ags: "08",
  september: "09",
  sep: "09",
  oktober: "10",
  okt: "10",
  november: "11",
  nov: "11",
  nopember: "11",
  desember: "12",
  des: "12",
};

const STOP_WORDS = new Set([
  "tolong",
  "coba",
  "mohon",
  "carikan",
  "cari",
  "mencari",
  "bukakan",
  "buka",
  "tampilkan",
  "munculkan",
  "perlihatkan",
  "lihat",
  "mana",
  "bacakan",
  "baca",
  "dibacakan",
  "bunyikan",
  "notulen",
  "notulensi",
  "notulensinya",
  "notulennya",
  "hasil",
  "hasilnya",
  "rapat",
  "rapatnya",
  "pertemuan",
  "tentang",
  "mengenai",
  "terkait",
  "soal",
  "masalah",
  "bahas",
  "pembahasan",
  "agenda",
  "tanggal",
  "tgl",
  "bulan",
  "tahun",
  "ini",
  "itu",
  "lalu",
  "kemarin",
  "hari",
  "pada",
  "di",
  "ke",
  "dari",
  "untuk",
  "dengan",
  "oleh",
  "yang",
  "dan",
  "atau",
  "saya",
  "aku",
  "kita",
  "kami",
  "bapak",
  "ibu",
  "dong",
  "ya",
  "pak",
  "dirut",
  "tiara",
  "hey",
  "hei",
  "hai",
  "halo",
  "hallo",
  "ada",
  "apa",
  "saja",
  "semua",
  "daftar",
]);

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Pencocokan kata presisi Bahasa Indonesia (mendukung awalan/akhiran ringan namun mencegah false-positive kata pendek)
 */
function matchesKeywordInText(textLower: string, kw: string): boolean {
  if (!textLower || !kw) return false;
  if (kw.length <= 4) {
    return new RegExp(`\\b${escapeRegExp(kw)}\\b`, "i").test(textLower);
  }
  return new RegExp(`\\b${escapeRegExp(kw)}[a-z0-9]*\\b`, "i").test(textLower);
}

export interface NotulenSearchResult {
  matches: NotulenItem[];
  wantsImmediateRead: boolean;
  queryDescription: string;
  matchReasons: Record<number, string>;
}

/**
 * Pencarian cerdas & presisi tinggi notulen berdasarkan tanggal, bulan, dan topik pembicaraan.
 * Mencegah kemunculan notulen tidak relevan yang hanya menyebut kata umum sekilas di transkrip.
 */
export function searchNotulenSmart(
  rawSpeech: string,
  notulenList: NotulenItem[],
  todayIso = "2026-11-04"
): NotulenSearchResult {
  const lower = rawSpeech.toLowerCase().trim();
  const wantsImmediateRead = /\b(bacakan|baca|dibacakan|bunyikan)\b/i.test(
    lower
  );
  const wantsLatestSingle =
    /\b(terbaru|terakhir|paling baru|baru saja)\b/i.test(lower);

  let targetDay: string | null = null;
  let targetMonth: string | null = null;

  // 1. Cek referensi waktu relatif ("hari ini", "kemarin", "bulan ini", "bulan lalu")
  if (/\bhari ini\b/i.test(lower)) {
    const [, m, d] = todayIso.split("-");
    targetMonth = m;
    targetDay = d;
  } else if (/\bkemarin\b/i.test(lower)) {
    const [y, m, d] = todayIso.split("-").map(Number);
    const prev = new Date(y, m - 1, d - 1);
    targetMonth = String(prev.getMonth() + 1).padStart(2, "0");
    targetDay = String(prev.getDate()).padStart(2, "0");
  } else if (/\bbulan ini\b/i.test(lower)) {
    targetMonth = todayIso.split("-")[1];
  } else if (/\bbulan lalu\b/i.test(lower)) {
    const [y, m] = todayIso.split("-").map(Number);
    const prev = new Date(y, m - 2, 1);
    targetMonth = String(prev.getMonth() + 1).padStart(2, "0");
  }

  // 2. Cek pola eksplisit "tanggal 2 november" / "30 oktober" / "bulan november"
  const explicitDateMatch = lower.match(
    /(?:tanggal\s+|tgl\s+)?(\d{1,2})\s+(januari|jan|februari|feb|maret|mar|april|apr|mei|juni|jun|juli|jul|agustus|agu|ags|september|sep|oktober|okt|november|nov|nopember|desember|des)\b/i
  );
  if (explicitDateMatch) {
    targetDay = String(Number.parseInt(explicitDateMatch[1], 10)).padStart(
      2,
      "0"
    );
    targetMonth = MONTH_MAP[explicitDateMatch[2].toLowerCase()] || null;
  } else {
    const dayOnlyMatch = lower.match(/(?:tanggal|tgl)\s+(\d{1,2})\b/i);
    if (dayOnlyMatch) {
      targetDay = String(Number.parseInt(dayOnlyMatch[1], 10)).padStart(2, "0");
    }
    for (const [mName, mNum] of Object.entries(MONTH_MAP)) {
      if (new RegExp(`\\b${mName}\\b`, "i").test(lower)) {
        targetMonth = mNum;
        break;
      }
    }
  }

  // 3. Ekstrak kata kunci topik (abaikan kata perintah & kata waktu)
  const TIME_REL_WORDS = new Set(["terbaru", "terakhir", "baru"]);
  const rawTokens = lower
    .replace(/[^a-z0-9\s]/gi, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3);

  const keywords = Array.from(
    new Set(
      rawTokens.filter(
        (w) =>
          !STOP_WORDS.has(w) &&
          !TIME_REL_WORDS.has(w) &&
          !MONTH_MAP[w] &&
          !/^\d+$/.test(w)
      )
    )
  );

  // Jika meminta "notulen terbaru / terakhir" tanpa topik lain -> langsung ambil 1 paling baru
  if (wantsLatestSingle && keywords.length === 0 && !targetDay) {
    const sortedLatest = [...notulenList]
      .filter((n) => !targetMonth || n.tanggalIso.split("-")[1] === targetMonth)
      .sort((a, b) => b.tanggalIso.localeCompare(a.tanggalIso));
    const top = sortedLatest[0];
    return {
      matches: top ? [top] : [],
      wantsImmediateRead,
      queryDescription: "notulen terbaru",
      matchReasons: top ? { [top.id]: "Notulen paling baru" } : {},
    };
  }

  const matchReasons: Record<number, string> = {};

  // 4. Filter & beri skor relevansi ketat pada field utama (Judul > Keputusan > Ringkasan > Metadata)
  const candidatesScored = notulenList.map((item) => {
    const [, itemMonth, itemDay] = item.tanggalIso.split("-");
    if (targetMonth && itemMonth !== targetMonth) {
      return {
        item,
        primaryScore: 0,
        transcriptScore: 0,
        matchedKwCount: 0,
        reason: "",
      };
    }
    if (targetDay && itemDay !== targetDay) {
      return {
        item,
        primaryScore: 0,
        transcriptScore: 0,
        matchedKwCount: 0,
        reason: "",
      };
    }

    const titleLower = item.judul.toLowerCase();
    const summaryLower = item.ringkasan.toLowerCase();
    const decisionsLower = item.keputusan.join(" ").toLowerCase();
    const metaLower = `${item.lokasi || ""} ${item.pimpinan || ""}`.toLowerCase();
    const transcriptLower = item.transkrip.toLowerCase();

    if (keywords.length === 0) {
      // Hanya filter tanggal / bulan (atau permintaan umum)
      const dateScore = targetDay ? 20 : targetMonth ? 10 : 0;
      return {
        item,
        primaryScore: dateScore,
        transcriptScore: 0,
        matchedKwCount: 0,
        reason: targetDay
          ? `Tanggal ${item.tanggal}`
          : targetMonth
          ? `Bulan ${item.tanggal.split(" ").slice(1).join(" ")}`
          : "Notulen terbaru",
      };
    }

    let primaryScore = 0;
    let transcriptScore = 0;
    let matchedPrimaryKws = 0;
    const hitFields = new Set<string>();

    // Bonus frasa utuh jika judul memuat gabungan kata kunci berurutan
    const fullPhrase = keywords.join(" ");
    if (keywords.length >= 2 && titleLower.includes(fullPhrase)) {
      primaryScore += 18;
      hitFields.add("Judul Persis");
    }

    for (const kw of keywords) {
      let hitPrimaryThisKw = false;
      if (matchesKeywordInText(titleLower, kw)) {
        primaryScore += 14;
        hitPrimaryThisKw = true;
        hitFields.add("Judul");
      }
      if (matchesKeywordInText(decisionsLower, kw)) {
        primaryScore += 6;
        hitPrimaryThisKw = true;
        hitFields.add("Keputusan");
      }
      if (matchesKeywordInText(summaryLower, kw)) {
        primaryScore += 5;
        hitPrimaryThisKw = true;
        hitFields.add("Ringkasan");
      }
      if (matchesKeywordInText(metaLower, kw)) {
        primaryScore += 4;
        hitPrimaryThisKw = true;
        hitFields.add("Lokasi/Pimpinan");
      }
      if (hitPrimaryThisKw) {
        matchedPrimaryKws += 1;
      } else if (matchesKeywordInText(transcriptLower, kw)) {
        transcriptScore += 2;
      }
    }

    const reasonLabel =
      hitFields.size > 0
        ? `Cocok di ${Array.from(hitFields).slice(0, 2).join(" & ")}`
        : transcriptScore > 0
        ? "Disebut dalam transkrip"
        : "";

    return {
      item,
      primaryScore,
      transcriptScore,
      matchedKwCount: matchedPrimaryKws,
      reason: reasonLabel,
    };
  });

  let finalScored: Array<{ item: NotulenItem; score: number; reason: string }> =
    [];

  if (keywords.length > 0) {
    // Utamakan yang cocok pada Judul / Keputusan / Ringkasan (bukan sekadar disebut sekilas di transkrip!)
    const primaryHits = candidatesScored.filter((c) => c.primaryScore > 0);

    if (primaryHits.length > 0) {
      const maxKwMatched = Math.max(
        ...primaryHits.map((c) => c.matchedKwCount)
      );
      const filteredByCoverage =
        keywords.length >= 2 && maxKwMatched >= 2
          ? primaryHits.filter(
              (c) =>
                c.matchedKwCount >= Math.max(2, maxKwMatched - 1) ||
                c.primaryScore >= 14
            )
          : primaryHits;

      const maxPrimary = Math.max(
        ...filteredByCoverage.map((c) => c.primaryScore)
      );
      // Buang kandidat lemah yang skornya jauh di bawah kandidat utama (< 42% skor tertinggi)
      const threshold = Math.max(5, Math.round(maxPrimary * 0.42));

      finalScored = filteredByCoverage
        .filter((c) => c.primaryScore >= threshold)
        .map((c) => ({
          item: c.item,
          score: c.primaryScore + (targetDay ? 10 : targetMonth ? 4 : 0),
          reason: c.reason,
        }))
        .sort((a, b) => b.score - a.score);
    } else {
      // Fallback hanya ke transkrip bila benar-benar tidak ada di judul/ringkasan/keputusan
      finalScored = candidatesScored
        .filter((c) => c.transcriptScore > 0)
        .map((c) => ({
          item: c.item,
          score: c.transcriptScore,
          reason: c.reason,
        }))
        .sort((a, b) => b.score - a.score);
    }
  } else if (targetDay || targetMonth) {
    finalScored = candidatesScored
      .filter((c) => c.primaryScore > 0)
      .sort((a, b) => b.item.tanggalIso.localeCompare(a.item.tanggalIso))
      .map((c) => ({
        item: c.item,
        score: c.primaryScore,
        reason: c.reason,
      }));
  } else {
    // Jika hanya bilang "carikan notulen" tanpa topik & tanpa tanggal -> tampilkan maks 3 notulen terbaru saja
    finalScored = [...notulenList]
      .sort((a, b) => b.tanggalIso.localeCompare(a.tanggalIso))
      .slice(0, 3)
      .map((item) => ({
        item,
        score: 1,
        reason: "Notulen terbaru",
      }));
  }

  for (const s of finalScored) {
    matchReasons[s.item.id] = s.reason;
  }

  const descParts: string[] = [];
  if (keywords.length > 0) descParts.push(`topik "${keywords.join(" ")}"`);
  if (targetDay) descParts.push(`tanggal ${Number(targetDay)}`);
  if (targetMonth) descParts.push(`bulan ${targetMonth}`);

  return {
    matches: finalScored.map((s) => s.item),
    wantsImmediateRead,
    queryDescription: descParts.join(" ") || "notulen terbaru",
    matchReasons,
  };
}

/**
 * Mencocokkan jawaban lanjutan Dirut saat memilih dari beberapa kandidat notulen
 */
export function resolveCandidateChoice(
  spokenReply: string,
  candidates: NotulenItem[]
): NotulenItem | null {
  if (candidates.length === 0) return null;
  const lower = spokenReply.toLowerCase().trim();

  if (/\b(pertama|kesatu|ke satu|nomor satu|nomor 1|yang satu|awal)\b|^1\b|^satu\b/i.test(lower)) {
    return candidates[0] ?? null;
  }
  if (/\b(kedua|ke dua|nomor dua|nomor 2|yang dua)\b|^2\b|^dua\b/i.test(lower)) {
    return candidates[1] ?? null;
  }
  if (/\b(ketiga|ke tiga|nomor tiga|nomor 3|yang tiga)\b|^3\b|^tiga\b/i.test(lower)) {
    return candidates[2] ?? null;
  }
  if (/\b(keempat|ke empat|nomor empat|nomor 4|yang empat)\b|^4\b|^empat\b/i.test(lower)) {
    return candidates[3] ?? null;
  }
  if (/\b(terakhir|paling bawah|paling akhir)\b/i.test(lower)) {
    return candidates[candidates.length - 1] ?? null;
  }

  // Cek tanggal yang disebut ("yang tanggal 2")
  const dayMatch = lower.match(/(?:tanggal|tgl)?\s*(\d{1,2})\b/);
  if (dayMatch) {
    const dayPad = String(Number.parseInt(dayMatch[1], 10)).padStart(2, "0");
    const byDay = candidates.find((c) => c.tanggalIso.endsWith(`-${dayPad}`));
    if (byDay) return byDay;
  }

  // Cek kemiripan kata pada judul kandidat
  const words = lower
    .replace(/[^a-z0-9\s]/gi, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));

  let best: NotulenItem | null = null;
  let bestScore = 0;
  for (const c of candidates) {
    const hay = `${c.judul} ${c.tanggal} ${c.ringkasan}`.toLowerCase();
    let sc = 0;
    for (const w of words) {
      if (c.judul.toLowerCase().includes(w)) sc += 5;
      else if (hay.includes(w)) sc += 2;
    }
    if (sc > bestScore) {
      bestScore = sc;
      best = c;
    }
  }

  return bestScore > 0 ? best : null;
}

/**
 * Menyusun naskah pembacaan suara lengkap untuk Notulen:
 * mencakup Identitas Rapat, Ringkasan Eksekutif, Poin-poin Keputusan, serta Daftar Tugas & Progres!
 */
export function buildNotulenReadoutText(
  item: NotulenItem,
  allTugas: TugasItem[],
  scope: NotulenReadScope = "lengkap"
): string {
  const relatedTasks = allTugas.filter((t) => t.notulenId === item.id);
  const doneCount = relatedTasks.filter((t) => t.selesai).length;
  const openCount = relatedTasks.length - doneCount;

  const parts: string[] = [];

  if (scope === "lengkap") {
    parts.push(
      `Berikut hasil notulen ${item.judul}, tanggal ${item.tanggal}${
        item.lokasi ? ` bertempat di ${item.lokasi}` : ""
      }.`
    );
    parts.push(`Ringkasan eksekutif: ${item.ringkasan}`);
  }

  if (scope === "lengkap" || scope === "keputusan") {
    if (item.keputusan.length > 0) {
      parts.push(
        `Terdapat ${item.keputusan.length} poin keputusan rapat.`
      );
      item.keputusan.forEach((kep, idx) => {
        const ord = ORDINAL_ID[idx] || `Poin ke-${idx + 1}`;
        parts.push(`Keputusan ${ord.toLowerCase()}: ${kep}`);
      });
    } else {
      parts.push(
        "Poin keputusan rapat ini masih dalam tahap pemrosesan atau pemeriksaan sekretariat."
      );
    }
  }

  if (scope === "lengkap" || scope === "tugas") {
    if (relatedTasks.length > 0) {
      parts.push(
        `Tindak lanjut penugasan sebanyak ${relatedTasks.length} tugas:`
      );
      relatedTasks.forEach((t, idx) => {
        const ord = ORDINAL_ID[idx] || `Tugas ${idx + 1}`;
        parts.push(
          `${ord}, ${t.judul}, penanggung jawab ${t.pj}, tenggat ${t.tenggat}${
            t.selesai ? ", status sudah selesai" : ""
          }.`
        );
      });
      parts.push(
        `Catatan progres: dari ${relatedTasks.length} tugas pada rapat ini, ${doneCount} telah selesai dan ${openCount} tugas masih berjalan.`
      );
    } else if (scope === "tugas") {
      parts.push("Belum ada daftar tugas khusus yang tercatat pada notulen ini.");
    }
  }

  parts.push(
    "Demikian pembacaan notulen, Pak Dirut. Apakah ingin dikirimkan ke WhatsApp atau ada hal lain yang ingin Bapak tanyakan?"
  );

  return parts.join(" ");
}

/**
 * Kompresi gambar dokumentasi rapat via Canvas agar hemat penyimpanan lokal & cepat diekspor
 */
export function compressImageFile(
  file: File,
  captionDefault?: string
): Promise<NotulenPhoto> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca file foto"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Format gambar tidak didukung"));
      img.onload = () => {
        const maxDim = 920;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve({
            id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            url: reader.result as string,
            caption:
              captionDefault ||
              file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "),
          });
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressedUrl = canvas.toDataURL("image/jpeg", 0.78);
        resolve({
          id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          url: compressedUrl,
          caption:
            captionDefault ||
            file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "),
        });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function sanitizeModelOutput(rawText: string): string {
  // Bersihkan blok <think>...</think> dari model reasoning seperti DeepSeek / Qwen agar nyaman dibaca suara TTS
  return rawText.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

function normalizeCustomBaseUrl(rawBase: string): string {
  const trimmed = rawBase.trim().replace(/\/$/, "");
  // Jika user menempel URL portal dokumentasi router.dahono.com, arahkan otomatis ke gateway API resminya
  if (/^https?:\/\/router\.dahono\.com(\/docs)?$/i.test(trimmed)) {
    return "https://gateway.dahono.com/v1";
  }
  return trimmed;
}

const VALID_HTTP_HEADER_NAME = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

export async function fetchCustomProviderModels(
  settings: AssistantSettings
): Promise<{ ok: boolean; models: string[]; message: string }> {
  const key = settings.aiApiKey.trim().replace(/^["']|["']$/g, "");

  if (settings.aiProvider === "gemini") {
    const base = (
      settings.aiBaseUrl.trim() ||
      "https://generativelanguage.googleapis.com/v1beta"
    ).replace(/\/$/, "");
    if (!key) {
      return {
        ok: false,
        models: [],
        message:
          "Masukkan API Key Google AI Studio (diawali AIza...) terlebih dahulu untuk memuat daftar model Gemini.",
      };
    }
    try {
      const res = await fetch(`${base}/models`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "x-goog-api-key": key,
        },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = data?.error?.message || `HTTP ${res.status}`;
        return {
          ok: false,
          models: [],
          message: !key.startsWith("AIza")
            ? "API Key saat ini bukan kunci Google AI Studio (wajib diawali AIza...)."
            : `Gagal memuat model Gemini: ${msg}`,
        };
      }
      const rawModels: Array<{
        name?: string;
        supportedGenerationMethods?: string[];
      }> = Array.isArray(data?.models) ? data.models : [];
      const ids = rawModels
        .filter(
          (m) =>
            !Array.isArray(m.supportedGenerationMethods) ||
            m.supportedGenerationMethods.includes("generateContent")
        )
        .map((m) => String(m.name || "").replace(/^models\//i, ""))
        .filter((id) => id.startsWith("gemini-"));

      return {
        ok: true,
        models: ids,
        message: `Berhasil memuat ${ids.length} model Google Gemini yang aktif.`,
      };
    } catch {
      return {
        ok: false,
        models: [],
        message: "Tidak dapat menghubungi endpoint Google Gemini API.",
      };
    }
  }

  const base = normalizeCustomBaseUrl(
    settings.aiBaseUrl.trim() || "https://gateway.dahono.com/v1"
  ).replace(/\/chat\/completions$/i, "");

  if (!base) {
    return {
      ok: false,
      models: [],
      message:
        "Isi Base URL terlebih dahulu (mis. https://gateway.dahono.com/v1).",
    };
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  if (key && settings.aiAuthScheme !== "none") {
    if (
      settings.aiAuthScheme === "custom-header" &&
      VALID_HTTP_HEADER_NAME.test(settings.aiCustomHeader.trim())
    ) {
      headers[settings.aiCustomHeader.trim()] = key;
    } else if (settings.aiAuthScheme === "x-api-key") {
      headers["x-api-key"] = key;
    } else if (settings.aiAuthScheme === "api-key") {
      headers["Api-Key"] = key;
    } else {
      headers.Authorization = `Bearer ${key}`;
    }
  }

  try {
    const res = await fetch(`${base}/models`, {
      method: "GET",
      headers,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        ok: false,
        models: [],
        message:
          data?.error?.message ||
          data?.message ||
          `Gagal memuat daftar model (HTTP ${res.status})`,
      };
    }
    const rawArr = Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.models)
      ? data.models
      : [];
    const ids: string[] = rawArr
      .map((m: { id?: string; name?: string }) =>
        String(m?.id || m?.name || "")
      )
      .filter(Boolean);

    return {
      ok: true,
      models: ids,
      message: `Berhasil memuat ${ids.length} model dari ${base}/models.`,
    };
  } catch {
    return {
      ok: false,
      models: [],
      message: `Tidak dapat mengakses endpoint ${base}/models.`,
    };
  }
}

function getGeminiFallbackModelId(model: string): string | null {
  const lower = model.toLowerCase();
  if (lower.endsWith("-preview")) {
    return model.slice(0, -"-preview".length);
  }
  if (/^gemini-3/i.test(lower)) {
    return `${model}-preview`;
  }
  return null;
}

/**
 * Uji koneksi & pemanggilan API AI (Gemini / OpenAI / Anthropic / Groq / Custom Endpoint)
 * Keamanan: Kunci API selalu dikirim lewat HTTP Header (tidak pernah ditaruh di query URL).
 */
export async function callConfiguredLlm(
  systemPrompt: string,
  userPrompt: string,
  settings: AssistantSettings
): Promise<string> {
  const key = settings.aiApiKey.trim().replace(/^["']|["']$/g, "");
  const allowsEmptyKey =
    settings.aiProvider === "custom" && settings.aiAuthScheme === "none";

  if (!key && !allowsEmptyKey) {
    throw new Error("API Key belum diisi");
  }

  if (settings.aiProvider === "gemini") {
    const cleanModel = (settings.aiModel.trim() || "gemini-2.5-flash").replace(
      /^models\//i,
      ""
    );
    const base = (
      settings.aiBaseUrl.trim() ||
      "https://generativelanguage.googleapis.com/v1beta"
    ).replace(/\/$/, "");
    const isOfficialGoogle = /generativelanguage\.googleapis\.com/i.test(base);

    const requestGemini = async (targetModel: string) => {
      const url = `${base}/models/${encodeURIComponent(
        targetModel
      )}:generateContent`;
      const isGemini3 = /^gemini-3/i.test(targetModel);
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": key,
        },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: isGemini3
            ? { maxOutputTokens: 1024 }
            : { temperature: 0.3, maxOutputTokens: 1024 },
        }),
      });
      const payload = await res.json().catch(() => null);
      return { res, payload };
    };

    let { res, payload } = await requestGemini(cleanModel);

    // Jika nama model Gemini 3 butuh akhiran -preview (mis. gemini-3.1-flash-lite <-> gemini-3.1-flash-lite-preview), coba otomatis
    if (!res.ok && (res.status === 404 || res.status === 400)) {
      const errMsgFirst = String(payload?.error?.message || "");
      const errReasonFirst = String(
        payload?.error?.details?.[0]?.reason || ""
      );
      const isKeyErr =
        errReasonFirst === "API_KEY_INVALID" ||
        /API key not valid|API_KEY_INVALID/i.test(errMsgFirst);

      const altModel = !isKeyErr ? getGeminiFallbackModelId(cleanModel) : null;
      if (altModel) {
        const retry = await requestGemini(altModel);
        if (retry.res.ok) {
          res = retry.res;
          payload = retry.payload;
        }
      }
    }

    if (!res.ok) {
      const errMsg = String(payload?.error?.message || "").trim();
      const errReason = String(
        payload?.error?.details?.[0]?.reason || payload?.error?.status || ""
      );
      if (
        errReason === "API_KEY_INVALID" ||
        /API key not valid|API_KEY_INVALID/i.test(errMsg)
      ) {
        if (isOfficialGoogle && !key.startsWith("AIza")) {
          throw new Error(
            'API Key saat ini bukan kunci Google AI Studio (kunci Gemini resmi wajib diawali "AIza..."). Ganti kolom API Key dengan kunci dari Google AI Studio, atau ubah Penyedia Layanan ke Custom AI (Dahono Router).'
          );
        }
        throw new Error(
          `API Key Google Gemini tidak valid (${
            errMsg || "periksa kembali kunci AIza... Anda di Google AI Studio"
          })`
        );
      }
      throw new Error(
        `Gemini API HTTP ${res.status}${errMsg ? `: ${errMsg}` : ""}`
      );
    }

    const parts: Array<{ text?: string; thought?: boolean }> =
      payload?.candidates?.[0]?.content?.parts ?? [];
    const nonThoughtText = parts
      .filter((p) => !p?.thought && typeof p?.text === "string")
      .map((p) => p.text)
      .join("")
      .trim();
    const fallbackText = parts
      .map((p) => (typeof p?.text === "string" ? p.text : ""))
      .join("")
      .trim();
    const reply = sanitizeModelOutput(nonThoughtText || fallbackText);
    if (!reply) throw new Error("Respons kosong dari Gemini API");
    return reply;
  }

  if (settings.aiProvider === "openai" || settings.aiProvider === "groq") {
    const defaultBase =
      settings.aiProvider === "groq"
        ? "https://api.groq.com/openai/v1"
        : "https://api.openai.com/v1";
    const base = (settings.aiBaseUrl.trim() || defaultBase).replace(/\/$/, "");
    const model =
      settings.aiModel.trim() ||
      (settings.aiProvider === "groq"
        ? "llama-3.3-70b-versatile"
        : "gpt-4o-mini");

    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        max_tokens: 600,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const detail = data?.error?.message || `HTTP ${res.status}`;
      throw new Error(`${settings.aiProvider.toUpperCase()} API: ${detail}`);
    }
    return sanitizeModelOutput(
      String(data?.choices?.[0]?.message?.content || "")
    );
  }

  if (settings.aiProvider === "anthropic") {
    const base = (
      settings.aiBaseUrl.trim() || "https://api.anthropic.com/v1"
    ).replace(/\/$/, "");
    const model = settings.aiModel.trim() || "claude-3-5-sonnet-latest";
    const res = await fetch(`${base}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 600,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const detail = data?.error?.message || `HTTP ${res.status}`;
      throw new Error(`Anthropic API: ${detail}`);
    }
    return sanitizeModelOutput(String(data?.content?.[0]?.text || ""));
  }

  if (settings.aiProvider === "custom") {
    const rawBase = normalizeCustomBaseUrl(settings.aiBaseUrl);
    if (!rawBase) {
      throw new Error("Base URL Custom AI wajib diisi");
    }
    const rawPath = settings.aiCustomPath.trim();
    const alreadyHasCompletions = /\/chat\/completions$/i.test(rawBase);
    const fullUrl =
      rawPath && !alreadyHasCompletions
        ? `${rawBase}/${rawPath.replace(/^\//, "")}`
        : rawBase;

    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    const isKnownBearerGateway =
      /(?:dahono\.com|openrouter\.ai|deepseek\.com|openai\.com|groq\.com|together\.xyz|fireworks\.ai)/i.test(
        rawBase
      );

    if (settings.aiAuthScheme === "bearer" && key) {
      headers.Authorization = `Bearer ${key}`;
    } else if (settings.aiAuthScheme === "x-api-key" && key) {
      headers["x-api-key"] = key;
    } else if (settings.aiAuthScheme === "api-key" && key) {
      headers["Api-Key"] = key;
    } else if (settings.aiAuthScheme === "custom-header" && key) {
      const candidateHeader = settings.aiCustomHeader.trim();
      if (isKnownBearerGateway && !VALID_HTTP_HEADER_NAME.test(candidateHeader)) {
        // Gateway OpenAI-compatible seperti Dahono Router menggunakan Authorization: Bearer <KEY>
        headers.Authorization = `Bearer ${key}`;
      } else if (!candidateHeader) {
        headers.Authorization = `Bearer ${key}`;
      } else if (!VALID_HTTP_HEADER_NAME.test(candidateHeader)) {
        throw new Error(
          `Nama Header Kustom "${candidateHeader}" tidak valid karena mengandung spasi/simbol. Pilih skema "Authorization: Bearer <KEY>" untuk Dahono Router / OpenAI-compatible.`
        );
      } else {
        headers[candidateHeader] = key;
      }
    }

    const res = await fetch(fullUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: settings.aiModel.trim() || "dahono/deepseek-v4-flash",
        temperature: 0.3,
        max_tokens: 600,
        stream: false,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const detail =
        data?.error?.message ||
        data?.detail?.message ||
        data?.message ||
        `HTTP ${res.status}`;
      throw new Error(
        `${settings.aiCustomName || "Custom AI"}: ${detail}`
      );
    }

    const rawExtracted =
      data?.choices?.[0]?.message?.content ||
      data?.choices?.[0]?.message?.reasoning_content ||
      data?.message?.content ||
      data?.response ||
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      data?.output ||
      data?.reply ||
      data?.text ||
      "";
    const cleanReply = sanitizeModelOutput(String(rawExtracted));
    if (!cleanReply) {
      throw new Error("Format respons Custom AI kosong atau tidak dikenali");
    }
    return cleanReply;
  }

  throw new Error("Provider AI tidak dikenali");
}

export async function generateContextualReplyWithAi(
  userSpeech: string,
  history: ChatTurn[],
  focusedNotulen: NotulenItem | null,
  settings: AssistantSettings
): Promise<string | null> {
  const canCall =
    Boolean(settings.aiApiKey.trim()) ||
    (settings.aiProvider === "custom" &&
      settings.aiAuthScheme === "none" &&
      Boolean(settings.aiBaseUrl.trim()));

  if (!canCall) return null;
  try {
    const recentChat = history
      .slice(-6)
      .map((h) => `${h.role === "user" ? "Pak Dirut" : "Tiara"}: ${h.text}`)
      .join("\n");

    const contextBlock = focusedNotulen
      ? `Notulen yang sedang dibuka saat ini:\nJudul: ${focusedNotulen.judul} (${focusedNotulen.tanggal})\nRingkasan: ${focusedNotulen.ringkasan}\nKeputusan: ${focusedNotulen.keputusan.join("; ")}`
      : "Belum ada notulen spesifik yang dibuka.";

    const systemPrompt =
      "Kamu adalah Tiara, Asisten Virtual Direktur Utama Perumdam Tirta Ardhia Rinjani (PDAM Lombok Tengah). Jawab dengan sopan, ringkas (maksimal 3 kalimat agar nyaman diucapkan suara TTS), berbahasa Indonesia formal eksekutif, dan nyambung dengan percakapan sebelumnya.";

    const userPrompt = `${contextBlock}\n\nRiwayat percakapan terakhir:\n${recentChat}\n\nUcapan terbaru Pak Dirut: "${userSpeech}"`;

    return await callConfiguredLlm(systemPrompt, userPrompt, settings);
  } catch {
    return null;
  }
}
