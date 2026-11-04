import { useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Pause, Play, Send, Square } from "lucide-react";
import {
  MINGGUAN_CHART,
  NOTULEN_BASE_STATS,
  TODAY_ISO,
} from "@/data/pdam-data";
import { usePdamStore } from "@/lib/pdam-store";
import type { StatusNotulen } from "@/lib/types";

export const Route = createFileRoute("/")({
  component: DashboardBerandaPage,
});

// Tinggi & warna 9 bar suara persis dari dashboard.html
const VOICE_BARS = [
  { h: 30, color: "#A6F23A" },
  { h: 56, color: "#A6F23A" },
  { h: 84, color: "#A6F23A" },
  { h: 44, color: "#6B7BFF" },
  { h: 100, color: "#A6F23A" },
  { h: 62, color: "#6B7BFF" },
  { h: 36, color: "#A6F23A" },
  { h: 76, color: "#A6F23A" },
  { h: 26, color: "#6B7BFF" },
];

function StatusBadge({ status }: { status: StatusNotulen }) {
  if (status === "selesai") {
    return (
      <span
        style={{
          fontSize: 12,
          background: "#A6F23A",
          color: "#14171F",
          borderRadius: 999,
          padding: "5px 12px",
          fontWeight: 600,
          whiteSpace: "nowrap",
        }}
      >
        Selesai
      </span>
    );
  }
  if (status === "diperiksa") {
    return (
      <span
        style={{
          fontSize: 12,
          background: "#E4E7FF",
          color: "#2F3DB5",
          borderRadius: 999,
          padding: "5px 12px",
          fontWeight: 600,
          whiteSpace: "nowrap",
        }}
      >
        Diperiksa
      </span>
    );
  }
  return (
    <span
      className="h"
      style={{
        fontSize: 12,
        borderRadius: 999,
        padding: "5px 12px",
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      Diproses
    </span>
  );
}

function DashboardBerandaPage() {
  const navigate = useNavigate();
  const {
    agendas,
    notulenList,
    tugasList,
    waLogs,
    settings,
    assistantEnabled,
    isListening,
    isSpeaking,
    isSpeechPaused,
    awaitingCommand,
    dialogStage,
    candidateNotulens,
    liveTranscript,
    lastAssistantReply,
    reminder,
    activateAndGreetTiara,
    sendCommandToTiara,
    selectDisambiguatedNotulen,
    pauseOrResumeSpeech,
    stopTiaraSpeakingOnly,
    snoozeReminder,
    dismissReminder,
    setUploadModalOpen,
    setSelectedNotulenId,
  } = usePdamStore();

  const [quickPrompt, setQuickPrompt] = useState("");

  // Perhitungan metrik real-time dari store
  const agendaHariIni = agendas.filter((a) => a.tanggal === TODAY_ISO);
  const selesaiHariIni = agendaHariIni.filter((a) => a.selesaiAcara);
  const akanDatangHariIni = agendaHariIni.filter((a) => !a.selesaiAcara);
  const berikutnya = akanDatangHariIni[0];
  const progressPct =
    agendaHariIni.length > 0
      ? Math.round((selesaiHariIni.length / agendaHariIni.length) * 100)
      : 0;

  // Statistik Notulen
  const totalNotulen =
    NOTULEN_BASE_STATS.historicalTotalOffset + notulenList.length;
  const bulanIniNotulen =
    NOTULEN_BASE_STATS.historicalBulanIniOffset +
    notulenList.filter((n) => n.tanggalIso.startsWith("2026-11")).length;
  const selesaiNotulen =
    NOTULEN_BASE_STATS.historicalSelesaiOffset +
    notulenList.filter((n) => n.status === "selesai").length;
  const diperiksaNotulen = notulenList.filter(
    (n) => n.status === "diperiksa"
  ).length;
  const diprosesNotulen = notulenList.filter(
    (n) => n.status === "diproses" || n.status === "diunggah"
  ).length;
  const totalTugasDihasilkan =
    NOTULEN_BASE_STATS.historicalTugasOffset + tugasList.length;
  const totalJamRekaman = Math.round(
    NOTULEN_BASE_STATS.historicalJamOffset +
      notulenList.reduce((acc, n) => acc + n.durasiMenit, 0) / 60
  );

  const pctSelesaiNotulen = Math.round((selesaiNotulen / totalNotulen) * 100);
  const pctDiperiksaNotulen = Math.max(
    2,
    Math.round((diperiksaNotulen / totalNotulen) * 100)
  );

  // Statistik Tugas
  const tugasTerbukaList = tugasList.filter((t) => !t.selesai);
  const tugasJatuhTempoSegera = tugasTerbukaList.filter((t) => t.segera).length;

  const statusLabel = isSpeaking
    ? isSpeechPaused
      ? "Dijeda"
      : "Berbicara"
    : dialogStage === "awaiting_notulen_choice"
      ? "Pilih Notulen"
      : awaitingCommand
        ? "Percakapan Aktif"
        : assistantEnabled && isListening
          ? "Mendengarkan"
          : "Mendengarkan";

  const showConversationBubble = Boolean(lastAssistantReply);

  const handleQuickPromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPrompt.trim()) return;
    sendCommandToTiara(quickPrompt);
    setQuickPrompt("");
  };

  return (
    <>
      <h1
        className="greeting-heading"
        style={{
          margin: "36px 0 22px",
          fontSize: 44,
          fontWeight: 600,
          letterSpacing: "-.02em",
          lineHeight: 1.15,
        }}
      >
        Selamat pagi,{" "}
        <span style={{ color: "#7A808C" }}>{settings.namaDirut}</span>
      </h1>

      <div className="g">
        {/* 1. KARTU ASISTEN SUARA TIARA (Span 2 baris) */}
        <section
          className="c s2"
          style={{
            background: "#14171F",
            color: "#fff",
            gridRow: "span 2",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 18, fontWeight: 500 }}>Asisten</span>
            <span
              className={
                isSpeaking || awaitingCommand || isListening ? "pulse-lime" : ""
              }
              style={{
                fontSize: 12,
                background: "#A6F23A",
                color: "#14171F",
                borderRadius: 999,
                padding: "5px 12px",
                fontWeight: 600,
              }}
            >
              {statusLabel}
            </span>
          </div>

          {/* 9 Gelombang Suara Vertikal */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              height: 100,
            }}
          >
            {VOICE_BARS.map((bar, idx) => (
              <i
                key={idx}
                className={
                  (isSpeaking && !isSpeechPaused) || awaitingCommand
                    ? "animate-wave-bar"
                    : undefined
                }
                style={{
                  display: "inline-block",
                  width: 6,
                  height: bar.h,
                  borderRadius: 3,
                  background: bar.color,
                  animationDelay:
                    isSpeaking || awaitingCommand ? `${idx * 0.08}s` : undefined,
                  transition: "height 0.25s ease",
                }}
              />
            ))}
          </div>

          {/* Kotak Pesan Pengingat Suara / Percakapan Multi-Turn "Hey Tiara" */}
          {showConversationBubble ? (
            <div
              style={{
                background: "#232833",
                borderRadius: 18,
                padding: 15,
              }}
            >
              <div style={{ fontSize: 12, color: "#B4BAC6" }}>
                {liveTranscript
                  ? `Pak Dirut: “${liveTranscript}”`
                  : "Tiara · Percakapan Lanjutan"}
              </div>
              <p
                style={{
                  margin: "6px 0 0",
                  fontSize: 15.5,
                  lineHeight: 1.45,
                  maxHeight: 112,
                  overflowY: "auto",
                }}
              >
                {lastAssistantReply}
              </p>

              {/* Jika ada >1 Notulen Berkaitan, tampilkan pilihan konfirmasi */}
              {candidateNotulens.length > 0 && (
                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  {candidateNotulens.map((c, idx) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => selectDisambiguatedNotulen(c.id)}
                      style={{
                        border: "1px solid #3A4254",
                        background: "#14171F",
                        color: "#fff",
                        borderRadius: 11,
                        padding: "7px 10px",
                        textAlign: "left",
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      <b style={{ color: "#A6F23A" }}>{idx + 1}.</b> {c.judul}{" "}
                      <span style={{ color: "#B4BAC6" }}>({c.tanggal})</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Kontrol Jeda / Stop saat sedang membaca panjang */}
              {isSpeaking && (
                <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                  <button
                    type="button"
                    className="pill"
                    style={{
                      padding: "5px 11px",
                      fontSize: 11,
                      background: "#A6F23A",
                      color: "#14171F",
                      fontWeight: 700,
                    }}
                    onClick={pauseOrResumeSpeech}
                  >
                    {isSpeechPaused ? <Play size={12} /> : <Pause size={12} />}
                    {isSpeechPaused ? "Lanjut" : "Jeda"}
                  </button>
                  <button
                    type="button"
                    className="pill"
                    style={{
                      padding: "5px 11px",
                      fontSize: 11,
                      background: "#14171F",
                      color: "#fff",
                    }}
                    onClick={stopTiaraSpeakingOnly}
                  >
                    <Square size={11} /> Stop
                  </button>
                </div>
              )}
            </div>
          ) : reminder.visible ? (
            <div
              style={{
                background: "#232833",
                borderRadius: 18,
                padding: 16,
              }}
            >
              <div style={{ fontSize: 12, color: "#B4BAC6" }}>
                {reminder.waktu} · Pengingat suara
              </div>
              <p
                style={{
                  margin: "6px 0 0",
                  fontSize: 17,
                  lineHeight: 1.45,
                }}
              >
                {reminder.snoozed
                  ? "Ditunda 5 menit. Saya akan mengingatkan Bapak kembali."
                  : reminder.teks}
              </p>
            </div>
          ) : (
            <div
              style={{
                background: "#232833",
                borderRadius: 18,
                padding: 16,
              }}
            >
              <div style={{ fontSize: 12, color: "#B4BAC6" }}>
                Siaga Tiara · Perintah Suara Kontekstual
              </div>
              <p
                style={{
                  margin: "6px 0 0",
                  fontSize: 15,
                  lineHeight: 1.45,
                }}
              >
                Ucapkan <b>“Halo Tiara, carikan notulen bulan ini...”</b> untuk
                membuka & membacakan notulen.
              </p>
            </div>
          )}

          {/* Tombol Tunda 5 menit & Tutup */}
          {reminder.visible && !showConversationBubble && (
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="pill"
                style={{ background: "#A6F23A", color: "#14171F" }}
                onClick={snoozeReminder}
              >
                Tunda 5 menit
              </button>
              <button
                type="button"
                className="pill"
                style={{ background: "#232833", color: "#fff" }}
                onClick={dismissReminder}
              >
                Tutup
              </button>
            </div>
          )}

          {/* Input cepat percakapan jika sedang sesi aktif */}
          {showConversationBubble && (
            <form
              onSubmit={handleQuickPromptSubmit}
              style={{ display: "flex", gap: 6 }}
            >
              <input
                value={quickPrompt}
                onChange={(e) => setQuickPrompt(e.target.value)}
                placeholder="Lanjut bicara / ketik balasan..."
                style={{
                  flex: 1,
                  background: "#232833",
                  border: "1px solid #343B4A",
                  borderRadius: 999,
                  padding: "8px 12px",
                  color: "#fff",
                  fontSize: 12,
                  outline: "none",
                }}
              />
              <button
                type="submit"
                className="pill"
                style={{
                  padding: "8px 12px",
                  background: "#A6F23A",
                  color: "#14171F",
                }}
                title="Kirim balasan lanjutan"
              >
                <Send size={13} />
              </button>
            </form>
          )}

          {/* Tombol Bicara dengan asisten (persis dashboard.html) */}
          <button
            type="button"
            className="pill"
            style={{
              marginTop: "auto",
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              background: "#6B7BFF",
              color: "#fff",
              padding: 14,
            }}
            onClick={activateAndGreetTiara}
            title='Aktifkan mikrofon & panggil "Hey Tiara / Halo Tiara"'
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M5 11a7 7 0 0014 0M12 18v3" />
            </svg>
            {awaitingCommand
              ? "Mendengarkan lanjutan..."
              : assistantEnabled && isListening
                ? 'Aktif · Ucapkan "Hey Tiara"'
                : "Bicara dengan asisten"}
          </button>
        </section>

        {/* 2. STAT AGENDA HARI INI */}
        <section
          className="c"
          style={{ cursor: "pointer" }}
          onClick={() => navigate({ to: "/agenda" })}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 18 }}>Agenda hari ini</span>
            <span
              style={{
                fontSize: 12,
                border: "1px solid #D5D8DD",
                borderRadius: 999,
                padding: "4px 10px",
                color: "#4A505C",
                height: "fit-content",
              }}
            >
              Terjadwal
            </span>
          </div>
          <div style={{ fontSize: 48, fontWeight: 600, marginTop: 22 }}>
            {agendaHariIni.length}
          </div>
          <div style={{ fontSize: 13, color: "#4A505C", marginTop: 4 }}>
            {berikutnya
              ? `Berikutnya pukul ${berikutnya.mulai}`
              : "Semua agenda hari ini selesai"}
          </div>
        </section>

        {/* 3. STAT NOTULEN */}
        <section
          className="c"
          style={{ cursor: "pointer" }}
          onClick={() => navigate({ to: "/notulen" })}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 18 }}>Notulen</span>
            <span
              style={{
                fontSize: 12,
                border: "1px solid #D5D8DD",
                borderRadius: 999,
                padding: "4px 10px",
                color: "#4A505C",
                height: "fit-content",
              }}
            >
              Total
            </span>
          </div>
          <div style={{ fontSize: 48, fontWeight: 600, marginTop: 22 }}>
            {totalNotulen}
          </div>
          <div style={{ fontSize: 13, color: "#4A505C", marginTop: 4 }}>
            {bulanIniNotulen} bulan ini · {diprosesNotulen} diproses ·{" "}
            {diperiksaNotulen} diperiksa
          </div>
        </section>

        {/* 4. STAT TUGAS TERBUKA */}
        <section
          className="c"
          style={{ cursor: "pointer" }}
          onClick={() => navigate({ to: "/tugas" })}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 18 }}>Tugas terbuka</span>
            <span
              style={{
                fontSize: 12,
                border: "1px solid #D5D8DD",
                borderRadius: 999,
                padding: "4px 10px",
                color: "#4A505C",
                height: "fit-content",
              }}
            >
              Minggu ini
            </span>
          </div>
          <div style={{ fontSize: 48, fontWeight: 600, marginTop: 22 }}>
            {tugasTerbukaList.length}
          </div>
          <div style={{ fontSize: 13, color: "#4A505C", marginTop: 4 }}>
            {tugasJatuhTempoSegera} jatuh tempo dalam 2 hari
          </div>
        </section>

        {/* 5. AGENDA MINGGU INI (Span 2 kolom) */}
        <section className="c s3" style={{ gridColumn: "span 2" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 18 }}>Agenda minggu ini</span>
            <span
              style={{
                display: "flex",
                gap: 14,
                fontSize: 12,
                color: "#4A505C",
              }}
            >
              <span>
                <i
                  style={{
                    display: "inline-block",
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    background: "#6B7BFF",
                    marginRight: 5,
                  }}
                />
                Rapat
              </span>
              <span>
                <i
                  style={{
                    display: "inline-block",
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    background: "#A6F23A",
                    marginRight: 5,
                  }}
                />
                Kunjungan
              </span>
              <span>
                <i
                  className="h"
                  style={{
                    display: "inline-block",
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    marginRight: 5,
                  }}
                />
                Lainnya
              </span>
            </span>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-around",
              alignItems: "flex-end",
              height: 190,
              marginTop: 18,
              borderBottom: "1px solid #E3E5E9",
            }}
          >
            {MINGGUAN_CHART.map((d) => (
              <div
                key={d.hari}
                title={`${d.hari}: ${d.rapat} rapat, ${d.kunjungan} kunjungan, ${d.lainnya} lainnya`}
                style={{ display: "flex", alignItems: "flex-end", gap: 4 }}
              >
                <i
                  style={{
                    display: "inline-block",
                    width: 16,
                    height: d.rapatPx,
                    borderRadius: "9px 9px 0 0",
                    background: "#6B7BFF",
                  }}
                />
                <i
                  style={{
                    display: "inline-block",
                    width: 16,
                    height: d.kunjunganPx,
                    borderRadius: "9px 9px 0 0",
                    background: "#A6F23A",
                  }}
                />
                <i
                  className="h"
                  style={{
                    display: "inline-block",
                    width: 16,
                    height: d.lainnyaPx,
                    borderRadius: "9px 9px 0 0",
                  }}
                />
              </div>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-around",
              fontSize: 12,
              color: "#4A505C",
              marginTop: 8,
            }}
          >
            {MINGGUAN_CHART.map((d) =>
              d.aktif ? (
                <b key={d.hari} style={{ color: "#14171F" }}>
                  {d.hari}
                </b>
              ) : (
                <span key={d.hari}>{d.hari}</span>
              )
            )}
          </div>
        </section>

        {/* 6. JADWAL HARI INI (Span 2 baris, bg #F7F7F8) */}
        <section
          className="c s3"
          style={{
            gridRow: "span 2",
            background: "#F7F7F8",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 18 }}>Jadwal hari ini</div>
          <div style={{ fontSize: 12, color: "#4A505C", marginTop: -8 }}>
            Agenda dan kegiatan
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                flex: 1,
                display: "flex",
                height: 22,
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              <i
                style={{
                  display: "inline-block",
                  width: `${progressPct}%`,
                  background: "#A6F23A",
                }}
              />
              <i className="h" style={{ display: "inline-block", flex: 1 }} />
            </div>
            <b style={{ fontSize: 20 }}>
              {selesaiHariIni.length}/{agendaHariIni.length}
            </b>
          </div>

          {akanDatangHariIni.slice(0, 3).map((a) => (
            <div
              key={a.id}
              onClick={() => navigate({ to: "/agenda" })}
              style={{
                background: "#fff",
                borderRadius: 18,
                padding: 14,
                cursor: "pointer",
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 14 }}>{a.judul}</div>
              <div style={{ fontSize: 12, color: "#4A505C", marginTop: 2 }}>
                {a.labelPeserta || `${a.peserta} peserta`}
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                  marginTop: 12,
                  borderTop: "1px solid #ECEDF0",
                  paddingTop: 10,
                }}
              >
                <span>
                  {a.mulai} – {a.selesai}
                </span>
                <span>{a.lokasi}</span>
              </div>
            </div>
          ))}

          {akanDatangHariIni.length === 0 && (
            <div
              style={{
                background: "#fff",
                borderRadius: 18,
                padding: 16,
                fontSize: 13,
                color: "#4A505C",
                textAlign: "center",
              }}
            >
              Seluruh agenda hari ini telah terlaksana.
            </div>
          )}
        </section>

        {/* 7. PENGIRIMAN WHATSAPP */}
        <section
          className="c"
          style={{ cursor: "pointer" }}
          onClick={() => navigate({ to: "/pengaturan" })}
        >
          <div style={{ fontSize: 18 }}>Pengiriman WhatsApp</div>
          <div style={{ fontSize: 12, color: "#4A505C" }}>
            Jadwal otomatis ke Dirut dan sekretariat
          </div>

          {waLogs.slice(0, 3).map((log, idx) => (
            <div
              key={log.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 14,
                marginTop: idx === 0 ? 20 : 10,
                gap: 8,
              }}
            >
              <span>{log.labelDashboard || `Pengingat ${log.waktu}`}</span>
              {log.status === "Terkirim" ? (
                <b>Terkirim</b>
              ) : (
                <b style={{ color: "#4B5BE0" }}>{log.waktu}</b>
              )}
            </div>
          ))}

          <div
            style={{
              display: "flex",
              height: 16,
              borderRadius: 9,
              overflow: "hidden",
              marginTop: 20,
            }}
          >
            <i
              style={{
                display: "inline-block",
                width: "34%",
                background: "#6B7BFF",
              }}
            />
            <i
              style={{
                display: "inline-block",
                width: "34%",
                background: "#A6F23A",
              }}
            />
            <i className="h" style={{ display: "inline-block", flex: 1 }} />
          </div>
        </section>

        {/* 8. NOTULEN TERBARU (Span 2 kolom) */}
        <section className="c" style={{ gridColumn: "span 2" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 18 }}>Notulen terbaru</span>
            <button
              type="button"
              className="pill"
              style={{ background: "#14171F", color: "#fff" }}
              onClick={() => setUploadModalOpen(true)}
            >
              Unggah audio
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: 12,
              marginTop: 18,
            }}
          >
            <div>
              <div style={{ fontSize: 30, fontWeight: 600 }}>
                {totalNotulen}
              </div>
              <div style={{ fontSize: 12, color: "#4A505C" }}>
                Total notulen
              </div>
            </div>
            <div>
              <div style={{ fontSize: 30, fontWeight: 600 }}>
                {bulanIniNotulen}
              </div>
              <div style={{ fontSize: 12, color: "#4A505C" }}>Bulan ini</div>
            </div>
            <div>
              <div style={{ fontSize: 30, fontWeight: 600 }}>
                {totalTugasDihasilkan}
              </div>
              <div style={{ fontSize: 12, color: "#4A505C" }}>
                Tugas dihasilkan
              </div>
            </div>
            <div>
              <div style={{ fontSize: 30, fontWeight: 600 }}>
                {totalJamRekaman} jam
              </div>
              <div style={{ fontSize: 12, color: "#4A505C" }}>
                Total rekaman
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              height: 14,
              borderRadius: 8,
              overflow: "hidden",
              marginTop: 16,
            }}
          >
            <i
              style={{
                display: "inline-block",
                width: `${pctSelesaiNotulen}%`,
                background: "#A6F23A",
              }}
            />
            <i
              style={{
                display: "inline-block",
                width: `${pctDiperiksaNotulen}%`,
                background: "#6B7BFF",
              }}
            />
            <i className="h" style={{ display: "inline-block", flex: 1 }} />
          </div>

          <div
            style={{
              display: "flex",
              gap: 16,
              fontSize: 12,
              color: "#4A505C",
              margin: "8px 0 6px",
            }}
          >
            <span>
              <b style={{ color: "#14171F" }}>{selesaiNotulen}</b> selesai
            </span>
            <span>
              <b style={{ color: "#14171F" }}>{diperiksaNotulen}</b> diperiksa
            </span>
            <span>
              <b style={{ color: "#14171F" }}>{diprosesNotulen}</b> diproses
            </span>
          </div>

          {notulenList.slice(0, 3).map((n, idx, arr) => (
            <div
              key={n.id}
              onClick={() => {
                setSelectedNotulenId(n.id);
                navigate({ to: "/notulen" });
              }}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: idx === arr.length - 1 ? "14px 0 0" : "14px 0",
                borderBottom:
                  idx === arr.length - 1 ? "none" : "1px solid #ECEDF0",
                cursor: "pointer",
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{n.judul}</div>
                <div style={{ fontSize: 12, color: "#4A505C" }}>
                  {n.infoSingkat}
                </div>
              </div>
              <StatusBadge status={n.status} />
            </div>
          ))}

          <Link
            to="/notulen"
            style={{
              display: "inline-block",
              marginTop: 14,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Lihat semua {totalNotulen} notulen
          </Link>
        </section>
      </div>

      <p style={{ fontSize: 12, color: "#5B616E", margin: "20px 0 0" }}>
        Perumdam Tirta Ardhia Rinjani · Ucapkan “Halo Tiara, carikan notulen
        bulan ini tentang pipa” untuk uji pencarian & percakapan berkelanjutan.
      </p>
    </>
  );
}
