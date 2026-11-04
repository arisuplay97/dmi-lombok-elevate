import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Plus, Trash2, X } from "lucide-react";
import { usePdamStore } from "@/lib/pdam-store";

export const Route = createFileRoute("/tugas")({
  component: TugasPage,
});

const BAGIAN_LIST = [
  "Semua Bagian",
  "Bagian Teknik",
  "Bagian Keuangan",
  "Hubungan Langganan",
  "Bagian Umum",
  "Sekretariat",
];

function TugasPage() {
  const { tugasList, toggleTugas, addTugas, deleteTugas } = usePdamStore();

  const [statusTab, setStatusTab] = useState<
    "semua" | "terbuka" | "segera" | "selesai"
  >("terbuka");
  const [bagianFilter, setBagianFilter] = useState("Semua Bagian");

  const [modalOpen, setModalOpen] = useState(false);
  const [judul, setJudul] = useState("");
  const [pj, setPj] = useState("Bagian Teknik");
  const [tenggat, setTenggat] = useState("8 Nov");
  const [segera, setSegera] = useState(true);

  const openCount = tugasList.filter((t) => !t.selesai).length;
  const urgentCount = tugasList.filter((t) => !t.selesai && t.segera).length;
  const doneCount = tugasList.filter((t) => t.selesai).length;

  const filtered = tugasList.filter((t) => {
    if (statusTab === "terbuka" && t.selesai) return false;
    if (statusTab === "segera" && (t.selesai || !t.segera)) return false;
    if (statusTab === "selesai" && !t.selesai) return false;
    if (bagianFilter !== "Semua Bagian" && t.pj !== bagianFilter) return false;
    return true;
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!judul.trim()) return;
    addTugas({
      judul: judul.trim(),
      pj,
      tenggat: tenggat.trim() || "Minggu ini",
      segera,
      selesai: false,
    });
    setJudul("");
    setModalOpen(false);
  };

  return (
    <div style={{ marginTop: 28 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 36, fontWeight: 600 }}>
            Tugas & Tindak Lanjut
          </h1>
          <div style={{ fontSize: 14, color: "#4A505C", marginTop: 4 }}>
            Daftar penugasan dari hasil keputusan rapat direksi dan unit kerja
            Perumdam Tirta Ardhia Rinjani
          </div>
        </div>
        <button
          type="button"
          className="pill"
          style={{ background: "#14171F", color: "#fff" }}
          onClick={() => setModalOpen(true)}
        >
          <Plus size={16} /> Tambah Tugas Baru
        </button>
      </div>

      {/* Ringkasan 3 Kartu */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginBottom: 18,
        }}
      >
        <div className="c">
          <div style={{ fontSize: 14, color: "#4A505C" }}>Tugas Terbuka</div>
          <div style={{ fontSize: 40, fontWeight: 600, marginTop: 8 }}>
            {openCount}
          </div>
        </div>
        <div className="c">
          <div style={{ fontSize: 14, color: "#4A505C" }}>
            Jatuh Tempo Segera (≤ 2 hari)
          </div>
          <div style={{ fontSize: 40, fontWeight: 600, marginTop: 8 }}>
            {urgentCount}
          </div>
        </div>
        <div className="c">
          <div style={{ fontSize: 14, color: "#4A505C" }}>Telah Selesai</div>
          <div style={{ fontSize: 40, fontWeight: 600, marginTop: 8 }}>
            {doneCount}
          </div>
        </div>
      </div>

      {/* Filter */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {(
            [
              ["terbuka", `Terbuka (${openCount})`],
              ["segera", `Segera (${urgentCount})`],
              ["selesai", `Selesai (${doneCount})`],
              ["semua", `Semua (${tugasList.length})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className="pill"
              style={{
                background: statusTab === key ? "#14171F" : "#fff",
                color: statusTab === key ? "#fff" : "#14171F",
              }}
              onClick={() => setStatusTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <select
          value={bagianFilter}
          onChange={(e) => setBagianFilter(e.target.value)}
          style={{
            padding: "10px 16px",
            borderRadius: 999,
            border: "1px solid #D5D8DD",
            background: "#fff",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          {BAGIAN_LIST.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>

      {/* Daftar Checklist Tugas */}
      <section className="c">
        {filtered.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "28px 12px",
              color: "#4A505C",
            }}
          >
            Tidak ada tugas pada filter ini.
          </div>
        ) : (
          filtered.map((item, idx) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 4px",
                borderBottom:
                  idx === filtered.length - 1 ? "none" : "1px solid #ECEDF0",
              }}
            >
              <button
                type="button"
                onClick={() => toggleTugas(item.id)}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 8,
                  border: item.selesai ? "none" : "2px solid #C4C7CE",
                  background: item.selesai ? "#6B7BFF" : "#fff",
                  color: "#fff",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                {item.selesai && <Check size={15} />}
              </button>

              <div
                onClick={() => toggleTugas(item.id)}
                style={{
                  flex: 1,
                  cursor: "pointer",
                  textDecoration: item.selesai ? "line-through" : "none",
                  color: item.selesai ? "#7A808C" : "#14171F",
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 600 }}>{item.judul}</div>
                <div style={{ fontSize: 12, color: "#4A505C", marginTop: 2 }}>
                  Penanggung Jawab: <b>{item.pj}</b>
                </div>
              </div>

              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 999,
                  padding: "5px 12px",
                  background: item.selesai
                    ? "#F1F2F4"
                    : item.segera
                      ? "#A6F23A"
                      : "#F1F2F4",
                  color: "#14171F",
                  whiteSpace: "nowrap",
                }}
              >
                {item.tenggat}
              </span>

              <button
                type="button"
                className="pill"
                style={{ padding: "7px 10px", color: "#DC2626" }}
                onClick={() => deleteTugas(item.id)}
                title="Hapus tugas"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </section>

      {modalOpen && (
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
          onClick={() => setModalOpen(false)}
        >
          <div
            className="c"
            style={{ width: "100%", maxWidth: 480 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 18 }}>
                Tambah Tugas Tindak Lanjut
              </div>
              <button
                type="button"
                className="pill"
                style={{ width: 36, height: 36, padding: 0 }}
                onClick={() => setModalOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={handleCreate}
              style={{
                marginTop: 14,
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
                  Uraian Tugas
                </label>
                <input
                  required
                  value={judul}
                  onChange={(e) => setJudul(e.target.value)}
                  placeholder="Contoh: Inspeksi tekanan pipa distribusi zona Praya Tengah"
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
                  gridTemplateColumns: "1.2fr 1fr",
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
                    Penanggung Jawab (PIC)
                  </label>
                  <select
                    value={pj}
                    onChange={(e) => setPj(e.target.value)}
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
                    {BAGIAN_LIST.filter((b) => b !== "Semua Bagian").map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
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
                    Tenggat Waktu
                  </label>
                  <input
                    value={tenggat}
                    onChange={(e) => setTenggat(e.target.value)}
                    placeholder="Besok / 10 Nov"
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

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={segera}
                  onChange={(e) => setSegera(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: "#6B7BFF" }}
                />
                Tandai prioritas segera (jatuh tempo ≤ 2 hari)
              </label>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                  marginTop: 4,
                }}
              >
                <button
                  type="button"
                  className="pill"
                  onClick={() => setModalOpen(false)}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="pill"
                  style={{ background: "#14171F", color: "#fff" }}
                >
                  Simpan Tugas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
