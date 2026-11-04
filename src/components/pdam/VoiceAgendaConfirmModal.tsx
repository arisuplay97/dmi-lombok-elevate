import { useEffect, useState } from "react";
import { AlertTriangle, Check, Mic, X } from "lucide-react";
import { usePdamStore } from "@/lib/pdam-store";
import { detectScheduleConflicts } from "@/lib/tiara-speech";
import type { JenisAgenda } from "@/lib/types";

export function VoiceAgendaConfirmModal() {
  const { voiceDraft, setVoiceDraft, agendas, addAgenda } = usePdamStore();

  const [judul, setJudul] = useState("");
  const [tanggal, setTanggal] = useState("2026-11-04");
  const [mulai, setMulai] = useState("09.00");
  const [selesai, setSelesai] = useState("10.00");
  const [lokasi, setLokasi] = useState("Ruang Rapat Utama");
  const [jenis, setJenis] = useState<JenisAgenda>("rapat");
  const [peserta, setPeserta] = useState(5);
  const [catatan, setCatatan] = useState("");

  useEffect(() => {
    if (!voiceDraft) return;
    setJudul(voiceDraft.judul);
    setTanggal(voiceDraft.tanggal);
    setMulai(voiceDraft.mulai);
    setSelesai(voiceDraft.selesai);
    setLokasi(voiceDraft.lokasi);
    setJenis(voiceDraft.jenis);
    setPeserta(voiceDraft.peserta);
    setCatatan(voiceDraft.catatan);
  }, [voiceDraft]);

  if (!voiceDraft) return null;

  const conflicts = detectScheduleConflicts(
    { tanggal, mulai, selesai },
    agendas
  );

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!judul.trim()) return;
    addAgenda({
      judul: judul.trim(),
      tanggal,
      mulai,
      selesai,
      lokasi: lokasi.trim() || "Ruang Rapat Utama",
      jenis,
      peserta: Number(peserta) || 1,
      labelPeserta:
        jenis === "kunjungan" ? "Kunjungan lapangan" : `${peserta} peserta`,
      catatan,
      sumber: "suara",
      berulang: "tidak",
      selesaiAcara: false,
    });
    setVoiceDraft(null);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(20, 23, 31, 0.55)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={() => setVoiceDraft(null)}
    >
      <div
        className="c"
        style={{
          width: "100%",
          maxWidth: 540,
          boxShadow: "0 24px 60px rgba(20,23,31,0.25)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                background: "#6B7BFF",
                color: "#fff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Mic size={18} />
            </span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 17 }}>
                Konfirmasi Agenda Suara
              </div>
              <div style={{ fontSize: 12, color: "#4A505C" }}>
                Hasil ekstraksi AI dari perintah suara — periksa sebelum simpan
              </div>
            </div>
          </div>
          <button
            type="button"
            className="pill"
            style={{ width: 36, height: 36, padding: 0 }}
            onClick={() => setVoiceDraft(null)}
            aria-label="Tutup"
          >
            <X size={16} />
          </button>
        </div>

        <div
          style={{
            marginTop: 14,
            background: "#14171F",
            color: "#fff",
            borderRadius: 16,
            padding: "12px 14px",
            fontSize: 13,
          }}
        >
          <span style={{ color: "#A6F23A", fontWeight: 600 }}>
            Ucapan terdengar:{" "}
          </span>
          “{voiceDraft.kalimatAsli}”
        </div>

        {conflicts.length > 0 && (
          <div
            style={{
              marginTop: 12,
              background: "#FFF4E5",
              border: "1px solid #F59E0B",
              borderRadius: 16,
              padding: "10px 14px",
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              fontSize: 13,
              color: "#92400E",
            }}
          >
            <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <b>Peringatan Bentrok Jadwal!</b> Waktu ini beririsan dengan:{" "}
              {conflicts
                .map((c) => `${c.judul} (${c.mulai}–${c.selesai})`)
                .join(", ")}
              .
            </div>
          </div>
        )}

        <form
          onSubmit={handleSave}
          style={{
            marginTop: 16,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              Judul Agenda
            </label>
            <input
              value={judul}
              onChange={(e) => setJudul(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid #D5D8DD",
                fontSize: 14,
                boxSizing: "border-box",
              }}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 1fr 1fr",
              gap: 10,
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                Tanggal
              </label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid #D5D8DD",
                  fontSize: 13,
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                Mulai
              </label>
              <input
                value={mulai}
                onChange={(e) => setMulai(e.target.value)}
                placeholder="09.00"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid #D5D8DD",
                  fontSize: 13,
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                Selesai
              </label>
              <input
                value={selesai}
                onChange={(e) => setSelesai(e.target.value)}
                placeholder="10.00"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid #D5D8DD",
                  fontSize: 13,
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 1fr 0.7fr",
              gap: 10,
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                Lokasi
              </label>
              <input
                value={lokasi}
                onChange={(e) => setLokasi(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid #D5D8DD",
                  fontSize: 13,
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                Kategori
              </label>
              <select
                value={jenis}
                onChange={(e) => setJenis(e.target.value as JenisAgenda)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid #D5D8DD",
                  fontSize: 13,
                  background: "#fff",
                  boxSizing: "border-box",
                }}
              >
                <option value="rapat">Rapat</option>
                <option value="kunjungan">Kunjungan</option>
                <option value="lainnya">Lainnya</option>
              </select>
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                Peserta
              </label>
              <input
                type="number"
                min={1}
                value={peserta}
                onChange={(e) => setPeserta(Number(e.target.value))}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid #D5D8DD",
                  fontSize: 13,
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              marginTop: 6,
            }}
          >
            <button
              type="button"
              className="pill"
              onClick={() => setVoiceDraft(null)}
            >
              Batal
            </button>
            <button
              type="submit"
              className="pill"
              style={{ background: "#A6F23A", color: "#14171F", fontWeight: 700 }}
            >
              <Check size={16} /> Konfirmasi & Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
