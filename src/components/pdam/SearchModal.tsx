import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Calendar, CheckSquare, FileText, Search, X } from "lucide-react";
import { usePdamStore } from "@/lib/pdam-store";

export function SearchModal() {
  const {
    searchModalOpen,
    setSearchModalOpen,
    agendas,
    notulenList,
    tugasList,
  } = usePdamStore();
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  if (!searchModalOpen) return null;

  const q = query.trim().toLowerCase();

  const matchedAgendas = q
    ? agendas.filter(
        (a) =>
          a.judul.toLowerCase().includes(q) ||
          a.lokasi.toLowerCase().includes(q) ||
          (a.catatan || "").toLowerCase().includes(q)
      )
    : agendas.slice(0, 3);

  const matchedNotulen = q
    ? notulenList.filter(
        (n) =>
          n.judul.toLowerCase().includes(q) ||
          n.ringkasan.toLowerCase().includes(q) ||
          n.transkrip.toLowerCase().includes(q)
      )
    : notulenList.slice(0, 3);

  const matchedTugas = q
    ? tugasList.filter(
        (t) =>
          t.judul.toLowerCase().includes(q) || t.pj.toLowerCase().includes(q)
      )
    : tugasList.slice(0, 3);

  const goTo = (to: string) => {
    setSearchModalOpen(false);
    navigate({ to });
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 85,
        background: "rgba(20, 23, 31, 0.55)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "64px 16px 16px",
      }}
      onClick={() => setSearchModalOpen(false)}
    >
      <div
        className="c"
        style={{
          width: "100%",
          maxWidth: 620,
          maxHeight: "80vh",
          overflowY: "auto",
          boxShadow: "0 24px 60px rgba(20,23,31,0.28)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "#F1F2F4",
            borderRadius: 16,
            padding: "10px 14px",
          }}
        >
          <Search size={18} color="#4A505C" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari agenda Dirut, kata kunci notulen, transkrip, atau tugas..."
            style={{
              flex: 1,
              border: 0,
              background: "transparent",
              outline: "none",
              fontSize: 14,
              color: "#14171F",
            }}
          />
          <button
            type="button"
            onClick={() => setSearchModalOpen(false)}
            style={{
              border: 0,
              background: "transparent",
              cursor: "pointer",
              padding: 4,
              display: "flex",
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ marginTop: 18 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#4A505C",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 8,
            }}
          >
            Agenda ({matchedAgendas.length})
          </div>
          {matchedAgendas.length === 0 ? (
            <div style={{ fontSize: 13, color: "#7A808C", paddingBottom: 8 }}>
              Tidak ada agenda cocok.
            </div>
          ) : (
            matchedAgendas.map((a) => (
              <div
                key={a.id}
                onClick={() => goTo("/agenda")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 10px",
                  borderRadius: 12,
                  cursor: "pointer",
                }}
              >
                <Calendar size={15} color="#6B7BFF" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{a.judul}</div>
                  <div style={{ fontSize: 12, color: "#4A505C" }}>
                    {a.tanggal} · {a.mulai}–{a.selesai} · {a.lokasi}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ marginTop: 14 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#4A505C",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 8,
            }}
          >
            Notulen Rapat ({matchedNotulen.length})
          </div>
          {matchedNotulen.length === 0 ? (
            <div style={{ fontSize: 13, color: "#7A808C", paddingBottom: 8 }}>
              Tidak ada notulen cocok.
            </div>
          ) : (
            matchedNotulen.map((n) => (
              <div
                key={n.id}
                onClick={() => goTo("/notulen")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 10px",
                  borderRadius: 12,
                  cursor: "pointer",
                }}
              >
                <FileText size={15} color="#14171F" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{n.judul}</div>
                  <div style={{ fontSize: 12, color: "#4A505C" }}>
                    {n.tanggal} · {n.infoSingkat}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ marginTop: 14 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#4A505C",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 8,
            }}
          >
            Tugas Tindak Lanjut ({matchedTugas.length})
          </div>
          {matchedTugas.length === 0 ? (
            <div style={{ fontSize: 13, color: "#7A808C" }}>
              Tidak ada tugas cocok.
            </div>
          ) : (
            matchedTugas.map((t) => (
              <div
                key={t.id}
                onClick={() => goTo("/tugas")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 10px",
                  borderRadius: 12,
                  cursor: "pointer",
                }}
              >
                <CheckSquare size={15} color="#6B7BFF" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{t.judul}</div>
                  <div style={{ fontSize: 12, color: "#4A505C" }}>
                    PIC: {t.pj} · Tenggat: {t.tenggat}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
