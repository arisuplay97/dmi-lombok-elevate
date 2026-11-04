'use client';

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import {
  agendaHariIni, agendaMingguan, notulenRingkasan, notulenTerbaru,
  tugas, tugasTerbuka, logWA, pengingat, type StatusNotulen,
} from '@/lib/demo-data';

const INDIGO = '#6B7BFF', LIME = '#A6F23A', INK = '#14171F';
const muted: CSSProperties = { fontSize: 12, color: '#4A505C' };
const tag: CSSProperties = { fontSize: 12, border: '1px solid #D5D8DD', borderRadius: 999, padding: '4px 10px', color: '#4A505C', height: 'fit-content' };
const row: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center' };

function Stat({ title, chip, value, note }: { title: string; chip: string; value: ReactNode; note: string }) {
  return (
    <section className="c">
      <div style={row}><span style={{ fontSize: 18 }}>{title}</span><span style={tag}>{chip}</span></div>
      <div style={{ fontSize: 48, fontWeight: 600, marginTop: 22 }}>{value}</div>
      <div style={{ fontSize: 13, color: '#4A505C', marginTop: 4 }}>{note}</div>
    </section>
  );
}

function Bar({ v, color }: { v: number; color?: string }) {
  return <i className={color ? undefined : 'h'} style={{ width: 16, height: v * 44, borderRadius: '9px 9px 0 0', background: color }} />;
}

function StatusChip({ s }: { s: StatusNotulen }) {
  const label = { selesai: 'Selesai', diperiksa: 'Diperiksa', diproses: 'Diproses' }[s];
  const st: CSSProperties = { fontSize: 12, borderRadius: 999, padding: '5px 12px', fontWeight: 600 };
  if (s === 'selesai') return <span style={{ ...st, background: LIME }}>{label}</span>;
  if (s === 'diperiksa') return <span style={{ ...st, background: '#E4E7FF', color: '#2F3DB5' }}>{label}</span>;
  return <span className="h" style={st}>{label}</span>;
}

export default function Dashboard() {
  const [tutup, setTutup] = useState(false);
  const [tunda, setTunda] = useState(false);
  const [selesai, setSelesai] = useState<Record<number, boolean>>({});
  const [aktif, setAktif] = useState(false);
  const [bicara, setBicara] = useState(false);
  // Pilih suara perempuan berbahasa Indonesia yang tersedia di perangkat (mis. Gadis, Damayanti, Google)
  const pilihSuaraWanita = () => {
    const id = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('id'));
    const pria = /andika|ardi|\bmale\b|pria|laki/i;
    const wanita = /gadis|damayanti|female|perempuan|wanita|google bahasa indonesia/i;
    return id.find((v) => wanita.test(v.name) && !pria.test(v.name)) ?? id.find((v) => !pria.test(v.name));
  };
  const ucap = (teks: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(teks);
    u.lang = 'id-ID';
    const suara = pilihSuaraWanita();
    if (suara) u.voice = suara;
    u.onstart = () => setBicara(true);
    u.onend = () => setBicara(false);
    u.onerror = () => setBicara(false);
    window.speechSynthesis.speak(u);
  };
  const diam = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    setBicara(false);
  };
  // Daftar suara dimuat browser secara bertahap
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  }, []);
  // Simulasi: setelah suara diaktifkan, 3 detik kemudian asisten mengumumkan jadwal sendiri
  useEffect(() => {
    if (!aktif || tutup) return;
    const t = setTimeout(() => { setTunda(false); ucap(pengingat.teks); }, 3000);
    return () => clearTimeout(t);
  }, [aktif, tutup]);
  const doneCount = Object.values(selesai).filter(Boolean).length;
  const berikutnya = agendaHariIni.find((a) => !a.selesaiAcara);
  const akanDatang = agendaHariIni.filter((a) => !a.selesaiAcara);
  const jumlahSelesai = agendaHariIni.length - akanDatang.length;
  const segera = tugas.filter((t) => t.segera && !selesai[t.id]).length;
  const bars = [60, 110, 84, 36, 100, 50, 90, 26, 72];

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif", color: INK, maxWidth: 1360, margin: '0 auto', padding: '28px 32px 40px', boxSizing: 'border-box' }}>
      <header style={{ ...row, gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 20 }}>
          <span style={{ width: 32, height: 32, borderRadius: 10, background: INDIGO, display: 'inline-block' }} />Asisten Dirut
        </div>
        <nav style={{ display: 'flex', gap: 8 }}>
          {['Beranda', 'Agenda', 'Notulen', 'Tugas', 'Pengaturan'].map((n, i) => (
            <button key={n} className="pill" style={i === 0 ? { background: INK, color: '#fff' } : undefined}>{n}</button>
          ))}
        </nav>
        <span style={{ width: 44, height: 44, borderRadius: '50%', background: INK, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 14 }}>DR</span>
      </header>

      <h1 style={{ margin: '36px 0 22px', fontSize: 44, fontWeight: 600, letterSpacing: '-.02em' }}>
        Selamat pagi, <span style={{ color: '#7A808C' }}>[Nama Dirut]</span>
      </h1>

      <div className="g">
        <section className="c s2" style={{ background: INK, color: '#fff', gridRow: 'span 2', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={row}>
            <span style={{ fontSize: 18, fontWeight: 500 }}>Asisten</span>
            <span style={{ fontSize: 12, background: LIME, color: INK, borderRadius: 999, padding: '5px 12px', fontWeight: 600 }}>{tutup ? 'Siaga' : bicara ? 'Berbicara' : aktif ? 'Mendengarkan' : 'Suara mati'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, height: 110 }}>
            {bars.map((h, i) => <i key={i} style={{ width: 6, height: tutup ? 10 : h, borderRadius: 3, background: i % 3 === 1 ? INDIGO : LIME, animation: bicara ? `wave 0.8s ease-in-out ${i * 0.08}s infinite` : undefined }} />)}
          </div>
          {!tutup && (
            <div style={{ background: '#232833', borderRadius: 18, padding: 16 }}>
              <div style={{ fontSize: 12, color: '#B4BAC6' }}>{pengingat.waktu} · Pengingat suara</div>
              <p style={{ margin: '6px 0 0', fontSize: 17, lineHeight: 1.45 }}>{tunda ? 'Ditunda 5 menit. Saya akan mengingatkan lagi.' : pengingat.teks}</p>
            </div>
          )}
          {!tutup && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="pill" style={{ background: LIME }} onClick={() => { setTunda(true); ucap('Baik, saya ingatkan lagi lima menit.'); }}>Tunda 5 menit</button>
              <button className="pill" style={{ background: '#232833', color: '#fff' }} onClick={() => { setTutup(true); diam(); }}>Tutup</button>
            </div>
          )}
          <button
            className="pill"
            style={{ marginTop: 'auto', background: INDIGO, color: '#fff', padding: 14 }}
            onClick={() => {
              if (aktif) { setAktif(false); diam(); return; }
              setAktif(true); setTutup(false); ucap('Asisten aktif. Saya akan mengingatkan jadwal Bapak.');
            }}
          >
            {aktif ? 'Matikan suara asisten' : 'Aktifkan suara asisten'}
          </button>
          <div style={{ fontSize: 12, color: '#B4BAC6' }}>Klik sekali agar browser mengizinkan suara. Pengingat diucapkan 3 detik kemudian.</div>
        </section>

        <Stat title="Agenda hari ini" chip="Terjadwal" value={agendaHariIni.length} note={berikutnya ? `Berikutnya pukul ${berikutnya.mulai}` : 'Semua selesai'} />
        <Stat title="Notulen" chip="Total" value={notulenRingkasan.total} note={`${notulenRingkasan.bulanIni} bulan ini · ${notulenRingkasan.diproses} diproses · ${notulenRingkasan.diperiksa} diperiksa`} />
        <Stat title="Tugas terbuka" chip="Minggu ini" value={tugasTerbuka - doneCount} note={`${segera} jatuh tempo dalam 2 hari`} />

        <section className="c s3" style={{ gridColumn: 'span 2' }}>
          <div style={row}>
            <span style={{ fontSize: 18 }}>Agenda minggu ini</span>
            <span style={{ display: 'flex', gap: 14, ...muted }}><span>Rapat</span><span>Kunjungan</span><span>Lainnya</span></span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', height: 190, marginTop: 18, borderBottom: '1px solid #E3E5E9' }}>
            {agendaMingguan.map((d) => (
              <div key={d.hari} style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
                <Bar v={d.rapat} color={INDIGO} /><Bar v={d.kunjungan} color={LIME} /><Bar v={d.lainnya} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-around', ...muted, marginTop: 8 }}>
            {agendaMingguan.map((d) => <span key={d.hari} style={d.hari === 'Rab' ? { color: INK, fontWeight: 700 } : undefined}>{d.hari}</span>)}
          </div>
        </section>

        <section className="c s3" style={{ gridRow: 'span 2', background: '#F7F7F8', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 18 }}>Jadwal hari ini</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, display: 'flex', height: 22, borderRadius: 12, overflow: 'hidden' }}>
              <i style={{ width: `${(jumlahSelesai / agendaHariIni.length) * 100}%`, background: LIME }} /><i className="h" style={{ flex: 1 }} />
            </div>
            <b style={{ fontSize: 20 }}>{jumlahSelesai}/{agendaHariIni.length}</b>
          </div>
          {akanDatang.map((a) => (
            <div key={a.id} style={{ background: '#fff', borderRadius: 18, padding: 14 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{a.judul}</div>
              <div style={{ ...muted, marginTop: 2 }}>{a.peserta} peserta</div>
              <div style={{ ...row, fontSize: 12, marginTop: 12, borderTop: '1px solid #ECEDF0', paddingTop: 10 }}><span>{a.mulai} – {a.selesai}</span><span>{a.lokasi}</span></div>
            </div>
          ))}
          <div style={muted}>{jumlahSelesai} agenda sudah selesai</div>
        </section>

        <section className="c">
          <div style={{ fontSize: 18 }}>Pengiriman WhatsApp</div>
          <div style={muted}>Ke Dirut dan sekretariat</div>
          {logWA.map((l) => (
            <div key={l.id} style={{ ...row, fontSize: 13, marginTop: 14, gap: 8 }}>
              <span><b>{l.waktu}</b> {l.isi}</span>
              <b style={{ color: l.status === 'Terkirim' ? INK : '#4B5BE0', whiteSpace: 'nowrap' }}>{l.status}</b>
            </div>
          ))}
        </section>

        <section className="c" style={{ gridColumn: 'span 2' }}>
          <div style={row}><span style={{ fontSize: 18 }}>Notulen terbaru</span><button className="pill" style={{ background: INK, color: '#fff' }}>Unggah audio</button></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginTop: 18 }}>
            {[[notulenRingkasan.total, 'Total notulen'], [notulenRingkasan.bulanIni, 'Bulan ini'], [notulenRingkasan.tugas, 'Tugas dihasilkan'], [`${notulenRingkasan.jamRekaman} jam`, 'Total rekaman']].map(([v, l]) => (
              <div key={l as string}><div style={{ fontSize: 30, fontWeight: 600 }}>{v}</div><div style={muted}>{l}</div></div>
            ))}
          </div>
          <div style={{ display: 'flex', height: 14, borderRadius: 8, overflow: 'hidden', marginTop: 16 }}>
            <i style={{ width: `${(notulenRingkasan.selesai / notulenRingkasan.total) * 100}%`, background: LIME }} />
            <i style={{ width: `${(notulenRingkasan.diperiksa / notulenRingkasan.total) * 100}%`, background: INDIGO }} />
            <i className="h" style={{ flex: 1 }} />
          </div>
          <div style={{ display: 'flex', gap: 16, ...muted, margin: '8px 0 6px' }}>
            <span><b style={{ color: INK }}>{notulenRingkasan.selesai}</b> selesai</span>
            <span><b style={{ color: INK }}>{notulenRingkasan.diperiksa}</b> diperiksa</span>
            <span><b style={{ color: INK }}>{notulenRingkasan.diproses}</b> diproses</span>
          </div>
          {notulenTerbaru.map((n) => (
            <div key={n.id} style={{ ...row, padding: '12px 0', borderTop: '1px solid #ECEDF0' }}>
              <div><div style={{ fontWeight: 600, fontSize: 14 }}>{n.judul}</div><div style={muted}>{n.tanggal} · {n.info}</div></div>
              <StatusChip s={n.status} />
            </div>
          ))}
        </section>

        <section className="c" style={{ gridColumn: '1 / -1' }}>
          <div style={row}><span style={{ fontSize: 18 }}>Tugas dari notulen</span><span style={tag}>{tugasTerbuka - doneCount} terbuka</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', columnGap: 32, marginTop: 8 }}>
            {tugas.map((t) => (
              <label key={t.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #ECEDF0', cursor: 'pointer' }}>
                <input type="checkbox" checked={!!selesai[t.id]} onChange={() => setSelesai({ ...selesai, [t.id]: !selesai[t.id] })} style={{ width: 20, height: 20, accentColor: INDIGO }} />
                <span style={{ flex: 1, textDecoration: selesai[t.id] ? 'line-through' : 'none', color: selesai[t.id] ? '#7A808C' : INK }}>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 600 }}>{t.judul}</span>
                  <span style={muted}>{t.pj}</span>
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, borderRadius: 999, padding: '4px 10px', background: t.segera ? LIME : '#F1F2F4' }}>{t.tenggat}</span>
              </label>
            ))}
          </div>
        </section>
      </div>
      <p style={{ fontSize: 12, color: '#5B616E', margin: '20px 0 0' }}>Data pada tampilan ini hanya contoh (lib/demo-data.ts).</p>
    </div>
  );
}
