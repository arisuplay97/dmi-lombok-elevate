import { useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import {
  ChevronDown,
  MessageSquare,
  Mic,
  Pause,
  Play,
  Send,
  Square,
} from "lucide-react";
import { usePdamStore } from "@/lib/pdam-store";

export function FloatingTiaraWidget() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const {
    assistantEnabled,
    isListening,
    isSpeaking,
    isSpeechPaused,
    dialogStage,
    conversationHistory,
    candidateNotulens,
    focusedNotulenId,
    activateAndGreetTiara,
    sendCommandToTiara,
    selectDisambiguatedNotulen,
    readNotulenAloud,
    pauseOrResumeSpeech,
    stopTiaraSpeakingOnly,
  } = usePdamStore();

  const [expanded, setExpanded] = useState(true);
  const [textInput, setTextInput] = useState("");

  // Di Beranda (/), kartu utama Asisten sudah tampil penuh di sisi kiri Bento Grid
  if (pathname === "/") return null;

  const isSessionOpen = dialogStage !== "idle" || isSpeaking;

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    sendCommandToTiara(textInput);
    setTextInput("");
  };

  if (!expanded && !isSpeaking && candidateNotulens.length === 0) {
    return (
      <div
        style={{
          position: "fixed",
          right: 22,
          bottom: 22,
          zIndex: 70,
        }}
      >
        <button
          type="button"
          className="pill"
          onClick={() => setExpanded(true)}
          style={{
            background: "#14171F",
            color: "#fff",
            padding: "12px 18px",
            boxShadow: "0 14px 36px rgba(20,23,31,0.28)",
            gap: 10,
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: isSessionOpen ? "#A6F23A" : "#6B7BFF",
            }}
          />
          <span>
            Asisten Tiara · {isSessionOpen ? "Percakapan Aktif" : "Siaga"}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        right: 22,
        bottom: 22,
        width: 370,
        maxWidth: "calc(100vw - 32px)",
        zIndex: 70,
        background: "#14171F",
        color: "#fff",
        borderRadius: 24,
        padding: 18,
        boxShadow: "0 20px 50px rgba(20,23,31,0.34)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* Header Mini-Tiara */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 3, height: 18 }}>
            {[10, 16, 12, 18, 11].map((h, i) => (
              <i
                key={i}
                className={
                  isSpeaking || isSessionOpen ? "animate-wave-bar" : undefined
                }
                style={{
                  display: "inline-block",
                  width: 3,
                  height: h,
                  borderRadius: 2,
                  background: i % 2 === 0 ? "#A6F23A" : "#6B7BFF",
                  animationDelay: `${i * 0.09}s`,
                }}
              />
            ))}
          </div>
          <b style={{ fontSize: 14 }}>Tiara · Percakapan Lanjutan</b>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              fontSize: 11,
              background: "#A6F23A",
              color: "#14171F",
              borderRadius: 999,
              padding: "3px 10px",
              fontWeight: 700,
            }}
          >
            {isSpeaking
              ? isSpeechPaused
                ? "Dijeda"
                : "Membacakan"
              : dialogStage === "awaiting_notulen_choice"
                ? "Pilih Notulen"
                : assistantEnabled && isListening
                  ? "Mendengarkan"
                  : "Siaga"}
          </span>
          <button
            type="button"
            onClick={() => setExpanded(false)}
            style={{
              border: 0,
              background: "#232833",
              color: "#fff",
              width: 28,
              height: 28,
              borderRadius: "50%",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="Kecilkan panel"
          >
            <ChevronDown size={15} />
          </button>
        </div>
      </div>

      {/* Riwayat Percakapan Multi-Turn */}
      <div
        style={{
          background: "#232833",
          borderRadius: 16,
          padding: 12,
          maxHeight: 165,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          fontSize: 13,
        }}
      >
        {conversationHistory.length === 0 ? (
          <div style={{ color: "#B4BAC6", fontSize: 12 }}>
            Ucapkan <b>“Halo Tiara, carikan notulen bulan ini...”</b> atau ketik
            perintah di bawah. Percakapan nyambung terus tanpa mulai dari awal.
          </div>
        ) : (
          conversationHistory.slice(-4).map((turn) => (
            <div
              key={turn.id}
              style={{
                alignSelf: turn.role === "user" ? "flex-end" : "flex-start",
                background: turn.role === "user" ? "#6B7BFF" : "#14171F",
                color: "#fff",
                padding: "7px 11px",
                borderRadius: 12,
                maxWidth: "92%",
                lineHeight: 1.45,
                fontSize: 12.5,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  opacity: 0.72,
                  marginBottom: 2,
                  fontWeight: 600,
                }}
              >
                {turn.role === "user" ? "Pak Dirut" : "Asisten Tiara"}
              </div>
              {turn.text.length > 220
                ? `${turn.text.slice(0, 220)}...`
                : turn.text}
            </div>
          ))
        )}
      </div>

      {/* Status Konfirmasi jika Pop-up Pilihan Notulen sedang tampil di tengah layar */}
      {candidateNotulens.length === 1 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <button
            type="button"
            onClick={() => selectDisambiguatedNotulen(candidateNotulens[0].id)}
            style={{
              border: "1px solid #384052",
              background: "#232833",
              color: "#fff",
              borderRadius: 12,
              padding: "8px 11px",
              textAlign: "left",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            <b style={{ color: "#A6F23A" }}>Buka:</b>{" "}
            {candidateNotulens[0].judul}{" "}
            <span style={{ color: "#B4BAC6" }}>
              ({candidateNotulens[0].tanggal})
            </span>
          </button>
        </div>
      )}

      {/* Kontrol Suara Saat Membaca Notulen Panjang */}
      {(isSpeaking || focusedNotulenId !== null) && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {isSpeaking && (
            <>
              <button
                type="button"
                className="pill"
                style={{
                  padding: "6px 11px",
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
                  padding: "6px 11px",
                  fontSize: 11,
                  background: "#232833",
                  color: "#fff",
                }}
                onClick={stopTiaraSpeakingOnly}
              >
                <Square size={11} /> Stop Baca
              </button>
            </>
          )}
          {focusedNotulenId !== null && !isSpeaking && (
            <>
              <button
                type="button"
                className="pill"
                style={{
                  padding: "6px 11px",
                  fontSize: 11,
                  background: "#232833",
                  color: "#A6F23A",
                }}
                onClick={() => readNotulenAloud(focusedNotulenId, "lengkap")}
              >
                Baca Lengkap
              </button>
              <button
                type="button"
                className="pill"
                style={{
                  padding: "6px 11px",
                  fontSize: 11,
                  background: "#232833",
                  color: "#fff",
                }}
                onClick={() => readNotulenAloud(focusedNotulenId, "keputusan")}
              >
                Poin Keputusan
              </button>
              <button
                type="button"
                className="pill"
                style={{
                  padding: "6px 11px",
                  fontSize: 11,
                  background: "#232833",
                  color: "#fff",
                }}
                onClick={() => readNotulenAloud(focusedNotulenId, "tugas")}
              >
                Tugas & Progres
              </button>
            </>
          )}
        </div>
      )}

      {/* Input Suara / Lanjut Percakapan */}
      <form
        onSubmit={handleSendText}
        style={{ display: "flex", gap: 6, alignItems: "center" }}
      >
        <button
          type="button"
          onClick={activateAndGreetTiara}
          title="Bicara dengan suara"
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            border: 0,
            background: "#6B7BFF",
            color: "#fff",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <Mic size={16} />
        </button>
        <input
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder="Lanjutkan obrolan / cari notulen..."
          style={{
            flex: 1,
            background: "#232833",
            border: "1px solid #343B4A",
            borderRadius: 999,
            padding: "8px 13px",
            color: "#fff",
            fontSize: 12,
            outline: "none",
          }}
        />
        <button
          type="submit"
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            border: 0,
            background: "#A6F23A",
            color: "#14171F",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
          }}
          title="Kirim perintah"
        >
          {textInput.trim() ? <Send size={14} /> : <MessageSquare size={14} />}
        </button>
      </form>
    </div>
  );
}
