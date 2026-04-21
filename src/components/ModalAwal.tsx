import { useState } from 'react';
import type { Goals, Entry } from '../lib/storage';
import { fRp } from '../lib/helpers';

interface Props {
  goals: Goals;
  entries: Entry[];
  onSave: (g: Goals) => void;
}

export default function ModalAwalPage({ goals, entries, onSave }: Props) {
  const [modal, setModal] = useState<string>(goals.modal ? String(goals.modal) : '');
  const [start, setStart] = useState<string>(goals.start || '');
  const [savedMsg, setSavedMsg] = useState(false);

  const totalSpend = entries.reduce((s, e) => s + (e.spend || 0), 0);
  const totalRevenue = entries.reduce((s, e) => s + (e.revenue || 0), 0);
  const netProfit = totalRevenue - totalSpend;
  const modalNum = parseFloat(modal) || 0;
  const pctBalik = modalNum > 0 ? Math.min(100, Math.max(0, (netProfit / modalNum) * 100)) : 0;
  const sisaBEP = Math.max(0, modalNum - netProfit);
  const sudahBalik = modalNum > 0 && netProfit >= modalNum;

  function handleSave() {
    onSave({
      ...goals,
      modal: modalNum,
      start: start || '',
    });
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2000);
  }

  return (
    <div className="page">
      <div className="ph">
        <h1>Modal Awal</h1>
        <p>Atur modal awal untuk tracker balik modal di dashboard</p>
      </div>

      <div className="card">
        <div className="card-h">
          <span className="card-h-title">Pengaturan Modal</span>
        </div>
        <div className="card-b">
          <div className="two-col">
            <div className="fg">
              <label>Modal Awal (Rp)</label>
              <input
                type="number"
                placeholder="Contoh: 5000000"
                value={modal}
                onChange={e => setModal(e.target.value)}
                inputMode="numeric"
              />
            </div>
            <div className="fg">
              <label>Tanggal Mulai (opsional)</label>
              <input
                type="date"
                value={start}
                onChange={e => setStart(e.target.value)}
              />
            </div>
          </div>
          <div className="btn-row">
            <button className="btn-primary" onClick={handleSave}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Simpan
            </button>
            {savedMsg && <span style={{ fontSize: 12, color: 'var(--g)', fontWeight: 600 }}>✓ Tersimpan</span>}
          </div>
        </div>
      </div>

      {modalNum > 0 && (
        <div className="card">
          <div className="card-h">
            <span className="card-h-title">Status Balik Modal</span>
            <span className="card-h-tag" style={{ color: sudahBalik ? 'var(--g)' : 'var(--a)' }}>
              {sudahBalik ? '✓ BEP Tercapai' : 'Belum BEP'}
            </span>
          </div>
          <div className="card-b">
            <div className="modal-bar">
              <div className="modal-bar-item">
                <span className="modal-bar-label">Modal Awal</span>
                <span className="modal-bar-val" style={{ color: 'var(--p)' }}>{fRp(modalNum)}</span>
              </div>
              <div className="modal-bar-item">
                <span className="modal-bar-label">Profit Bersih</span>
                <span className="modal-bar-val" style={{ color: netProfit >= 0 ? 'var(--g)' : 'var(--r)' }}>
                  {netProfit >= 0 ? '+' : ''}{fRp(netProfit)}
                </span>
              </div>
              <div className="modal-bar-item">
                <span className="modal-bar-label">Sisa untuk BEP</span>
                <span className="modal-bar-val" style={{ color: sudahBalik ? 'var(--g)' : 'var(--a)' }}>
                  {sudahBalik ? 'Lunas ✓' : fRp(sisaBEP)}
                </span>
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <div className="d-ms-prog-track" style={{ height: 10 }}>
                <div className="d-ms-prog-fill" style={{
                  width: `${pctBalik}%`,
                  background: sudahBalik ? 'var(--g)' : 'var(--p)'
                }} />
              </div>
              <div className="d-ms-prog-row" style={{ marginTop: 6 }}>
                <span className="d-ms-prog-txt" style={{ fontSize: 12 }}>{pctBalik.toFixed(1)}% balik modal</span>
                <span className="d-ms-prog-txt" style={{ fontSize: 12 }}>{fRp(netProfit)} / {fRp(modalNum)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
