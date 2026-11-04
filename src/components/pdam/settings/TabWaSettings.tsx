import { useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  Plus,
  RefreshCw,
  Save,
  Send,
  Wifi,
} from "lucide-react";
import { usePdamStore } from "@/lib/pdam-store";
import type { UserRole, WaGatewayProvider } from "@/lib/types";

interface TabWaSettingsProps {
  showWaKey: boolean;
  setShowWaKey: (show: boolean) => void;
  inputStyle: React.CSSProperties;
}

export function TabWaSettings({
  showWaKey,
  setShowWaKey,
  inputStyle,
}: TabWaSettingsProps) {
  const {
    settings,
    updateSettings,
    saveSettingsNow,
    checkWaDeviceStatus,
    recipients,
    toggleRecipient,
    addRecipient,
    waLogs,
    sendTestWaBriefing,
    sendDirectTestWhatsapp,
    retryWaLog,
  } = usePdamStore();

  const [checkingWa, setCheckingWa] = useState(false);
  const [sendingDirectWa, setSendingDirectWa] = useState(false);
  const [directWaPhone, setDirectWaPhone] = useState(() => {
    const digits = settings.waNomorKhusus.replace(/[^\d+]/g, "");
    return digits.length >= 9 ? digits : "";
  });
  const [waDeviceStatus, setWaDeviceStatus] = useState<{
    ok: boolean;
    connected: boolean;
    msg: string;
  } | null>(null);

  const [newNama, setNewNama] = useState("");
  const [newNoWa, setNewNoWa] = useState("");
  const [newPeran, setNewPeran] = useState<UserRole>("sekretariat");

  const handleCheckDevice = async () => {
    setCheckingWa(true);
    setWaDeviceStatus(null);
    const res = await checkWaDeviceStatus();
    setCheckingWa(false);
    setWaDeviceStatus({
      ok: res.ok,
      connected: res.connected,
      msg: res.message,
    });
  };

  const handleSendDirect = async () => {
    if (!directWaPhone.trim()) return;
    setSendingDirectWa(true);
    await sendDirectTestWhatsapp(directWaPhone.trim());
    setSendingDirectWa(false);
  };

  const handleAddRecipient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNama.trim() || !newNoWa.trim()) return;
    addRecipient({
      nama: newNama.trim(),
      noWa: newNoWa.trim(),
      peran: newPeran,
      aktif: true,
    });
    setNewNama("");
    setNewNoWa("");
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
        gap: 16,
      }}
    >
      {/* KARTU 1: KONFIGURASI WANGSAF API v1 */}
      <section
        className="c"
        style={{
          border: "2px solid #E4E7FF",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              background: "#14171F",
              color: "#A6F23A",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Send size={20} />
          </span>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              Integrasi WhatsApp Gateway (Wangsaf)
            </div>
            <div style={{ fontSize: 12, color: "#4A505C" }}>
              Kirim otomatis ringkasan notulen rapat & briefing pagi ke WhatsApp
            </div>
          </div>
        </div>

        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 4,
            }}
          >
            <label style={{ fontSize: 12, fontWeight: 600 }}>
              Adapter Provider Gateway
            </label>
            <a
              href="https://docs.wangsaf.com"
              target="_blank"
              rel="noreferrer"
              style={{
                fontSize: 11,
                color: "#6B7BFF",
                fontWeight: 600,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              Dokumentasi Wangsaf <ExternalLink size={11} />
            </a>
          </div>
          <select
            value={settings.waGateway}
            onChange={(e) =>
              updateSettings({
                waGateway: e.target.value as WaGatewayProvider,
              })
            }
            style={inputStyle}
          >
            <option value="Wangsaf">Wangsaf API v1 (Utama)</option>
            <option value="WhatsApp Business API">WhatsApp Business Cloud API</option>
            <option value="Custom Webhook">Custom Webhook Relay</option>
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
            Base URL Endpoint Wangsaf v1
          </label>
          <input
            value={settings.waBaseUrl}
            onChange={(e) => updateSettings({ waBaseUrl: e.target.value })}
            placeholder="https://api.wangsaf.com/v1"
            style={inputStyle}
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
            Api-Key Perangkat Wangsaf (Header Api-Key)
          </label>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              type={showWaKey ? "text" : "password"}
              autoComplete="off"
              spellCheck={false}
              value={settings.waApiToken}
              onChange={(e) => updateSettings({ waApiToken: e.target.value })}
              placeholder="Tempel Api-Key perangkat Wangsaf (panjang)"
              style={inputStyle}
            />
            <button
              type="button"
              className="pill"
              style={{ padding: "0 12px" }}
              onClick={() => setShowWaKey(!showWaKey)}
            >
              {showWaKey ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <div style={{ fontSize: 11, color: "#4A505C", marginTop: 4 }}>
            Kosongkan untuk mode simulasi lokal. Saat diisi, pesan dikirim nyata ke
            POST /chat/send-text dengan header Api-Key.
          </div>
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
            Label / Nomor Perangkat Pengirim
          </label>
          <input
            value={settings.waNomorKhusus}
            onChange={(e) => updateSettings({ waNomorKhusus: e.target.value })}
            placeholder="+62881080610640"
            style={inputStyle}
          />
        </div>

        {/* FEEDBACK STATUS DEVICE */}
        {waDeviceStatus && (
          <div
            style={{
              background: waDeviceStatus.ok ? "#F3FCE6" : "#FFF4F2",
              border: `1px solid ${waDeviceStatus.ok ? "#C9EE8F" : "#FECACA"}`,
              borderRadius: 12,
              padding: "10px 14px",
              fontSize: 12.5,
              color: waDeviceStatus.ok ? "#2E6814" : "#B42318",
            }}
          >
            {waDeviceStatus.msg}
          </div>
        )}

        {/* TOMBOL AKSI WANGSAF */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            marginTop: 4,
          }}
        >
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className="pill"
              style={{ background: "#14171F", color: "#fff", fontWeight: 600 }}
              onClick={handleCheckDevice}
              disabled={checkingWa}
            >
              <Wifi size={14} />
              {checkingWa ? "Memeriksa Perangkat..." : "Cek Perangkat Wangsaf"}
            </button>

            <button
              type="button"
              className="pill"
              style={{ background: "#6B7BFF", color: "#fff", fontWeight: 600 }}
              onClick={sendTestWaBriefing}
            >
              <Send size={14} /> Uji Kirim Briefing Pagi
            </button>
          </div>

          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              value={directWaPhone}
              onChange={(e) => setDirectWaPhone(e.target.value)}
              placeholder="Uji kirim ke nomor WhatsApp (628xx)"
              style={{ ...inputStyle, flex: 1 }}
            />
            <button
              type="button"
              className="pill"
              style={{
                background: "#A6F23A",
                color: "#14171F",
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
              onClick={handleSendDirect}
              disabled={sendingDirectWa}
            >
              {sendingDirectWa ? "Mengirim..." : "Kirim Uji"}
            </button>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
            <button
              type="button"
              className="pill"
              style={{ background: "#14171F", color: "#fff", fontWeight: 700 }}
              onClick={() => saveSettingsNow("Pengaturan WhatsApp Gateway")}
            >
              <Save size={14} /> Simpan Pengaturan WhatsApp
            </button>
          </div>
        </div>
      </section>

      {/* KARTU 2: DAFTAR PENERIMA & LOG WHATSAPP */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* DAFTAR PENERIMA JADWAL WA */}
        <section
          className="c"
          style={{
            border: "2px solid #E4E7FF",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700 }}>
            Daftar Penerima Notulen & Briefing (628xx)
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              maxHeight: 220,
              overflowY: "auto",
            }}
          >
            {recipients.map((r) => (
              <label
                key={r.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 10px",
                  background: "#F7F7F8",
                  borderRadius: 10,
                  cursor: "pointer",
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{r.nama}</div>
                  <div style={{ fontSize: 11.5, color: "#4A505C" }}>
                    {r.noWa} · {r.peran === "dirut" ? "Direktur Utama" : "Sekretariat"}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={r.aktif}
                  onChange={() => toggleRecipient(r.id)}
                  style={{ width: 18, height: 18, accentColor: "#6B7BFF" }}
                />
              </label>
            ))}
          </div>

          <form
            onSubmit={handleAddRecipient}
            style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}
          >
            <input
              value={newNama}
              onChange={(e) => setNewNama(e.target.value)}
              placeholder="Nama staf / pejabat"
              style={{ ...inputStyle, flex: "1 1 120px" }}
            />
            <input
              value={newNoWa}
              onChange={(e) => setNewNoWa(e.target.value)}
              placeholder="628xx"
              style={{ ...inputStyle, flex: "1 1 110px" }}
            />
            <select
              value={newPeran}
              onChange={(e) => setNewPeran(e.target.value as UserRole)}
              style={{ ...inputStyle, width: "auto" }}
            >
              <option value="sekretariat">Sekretariat</option>
              <option value="dirut">Dirut</option>
            </select>
            <button
              type="submit"
              className="pill"
              style={{ background: "#14171F", color: "#fff", padding: "0 14px" }}
            >
              <Plus size={14} /> Tambah
            </button>
          </form>
        </section>

        {/* LOG PENGIRIMAN WHATSAPP */}
        <section
          className="c"
          style={{
            border: "1px solid #E2E5EC",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700 }}>
            Riwayat Log WhatsApp Terakhir
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              maxHeight: 240,
              overflowY: "auto",
            }}
          >
            {waLogs.length === 0 ? (
              <div style={{ fontSize: 12, color: "#4A505C", fontStyle: "italic" }}>
                Belum ada pengiriman WhatsApp hari ini.
              </div>
            ) : (
              waLogs.slice(0, 5).map((log) => (
                <div
                  key={log.id}
                  style={{
                    background: "#F7F7F8",
                    borderRadius: 12,
                    padding: "9px 12px",
                    fontSize: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <b>
                      {log.waktu} · {log.tujuan}
                    </b>
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        borderRadius: 999,
                        padding: "2px 8px",
                        background:
                          log.status === "Terkirim"
                            ? "#A6F23A"
                            : log.status === "Gagal"
                            ? "#FEE2E2"
                            : "#E4E7FF",
                        color:
                          log.status === "Terkirim"
                            ? "#14171F"
                            : log.status === "Gagal"
                            ? "#B42318"
                            : "#2F3DB5",
                      }}
                    >
                      {log.status}
                    </span>
                  </div>
                  <div style={{ color: "#4A505C", marginTop: 3 }}>{log.isi}</div>
                  {log.status !== "Terkirim" && (
                    <button
                      type="button"
                      className="pill"
                      style={{ marginTop: 5, padding: "3px 8px", fontSize: 10.5 }}
                      onClick={() => retryWaLog(log.id)}
                    >
                      <RefreshCw size={11} /> Kirim Ulang
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
