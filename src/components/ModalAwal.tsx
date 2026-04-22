import { useState } from 'react';
import type { Goals, Entry, Payout } from '../lib/storage';
import { fRp } from '../lib/helpers';

interface Props {
  goals: Goals;
  entries: Entry[];
  payouts: Payout[];
  onSavePayouts: (p: Payout[]) => void;
}

const todayIso = () => new Date().toISOString().split('T')[0];

export default function ModalAwalPage({ goals, entries, payouts, onSavePayouts }: Props) {
  const [payoutOpen, setPayoutOpen] = useState(false);

  // BEP calculations
  const totalSpend = entries.reduce((s, e) => s + (e.spend || 0), 0);
  const totalRevenue = entries.reduce((s, e) => s + (e.revenue || 0), 0);
  const netProfit = totalRevenue - totalSpend;
  const modalNum = goals.modal || 0;

  // Payout state
  const [poEditId, setPoEditId] = useState<number | null>(null);
  const [poDate, setPoDate] = useState<string>(todayIso());
  const [poAmount, setPoAmount] = useState<string>('');
  const [poStatus, setPoStatus] = useState<'pending' | 'sukses'>('pending');
  const [poBank, setPoBank] = useState<string>('');
  const [poAccNo, setPoAccNo] = useState<string>('');
  const [poHolder, setPoHolder] = useState<string>('');
  const [poNote, setPoNote] = useState<string>('');
  const [poSavedMsg, setPoSavedMsg] = useState(false);

  const totPending = payouts.filter(p => p.status === 'pending').reduce((s, p) => s + (p.amount || 0), 0);
  const totSukses = payouts.filter(p => p.status === 'sukses').reduce((s, p) => s + (p.amount || 0), 0);
  const sortedPayouts = [...payouts].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  function resetPoForm() {
    setPoEditId(null); setPoDate(todayIso()); setPoAmount('');
    setPoStatus('pending'); setPoBank(''); setPoAccNo(''); setPoHolder(''); setPoNote('');
  }

  function handleSavePayout() {
    const amt = parseFloat(poAmount) || 0;
    if (!poDate || amt <= 0) return;
    let next: Payout[];
    if (poEditId) {
      next = payouts.map(p => p.id === poEditId
        ? { ...p, date: poDate, amount: amt, status: poStatus, bankName: poBank, accountNo: poAccNo, accountHolder: poHolder, note: poNote }
        : p);
    } else {
      const np: Payout = { id: Date.now(), date: poDate, amount: amt, status: poStatus, bankName: poBank, accountNo: poAccNo, accountHolder: poHolder, note: poNote };
      next = [np, ...payouts];
    }
    onSavePayouts(next);
    resetPoForm();
    setPoSavedMsg(true);
    setTimeout(() => setPoSavedMsg(false), 1800);
  }

  function startEditPayout(p: Payout) {
    setPoEditId(p.id); setPoDate(p.date); setPoAmount(String(p.amount));
    setPoStatus(p.status); setPoBank(p.bankName || ''); setPoAccNo(p.accountNo || '');
    setPoHolder(p.accountHolder || ''); setPoNote(p.note || '');
    setPayoutOpen(true);
  }

  function togglePayoutStatus(id: number) {
    onSavePayouts(payouts.map(p => p.id === id ? { ...p, status: p.status === 'pending' ? 'sukses' : 'pending' } : p));
  }

  function deletePayout(id: number) {
    if (!confirm('Hapus payout ini?')) return;
    onSavePayouts(payouts.filter(p => p.id !== id));
    if (poEditId === id) resetPoForm();
  }

  return (
    <div className="page">
      <div className="ph">
        <h1>Modal &amp; Payout</h1>
        <p>Tracker balik modal &amp; catatan payout Adsense</p>
      </div>

      {/* Hint: set modal from profile settings */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-b" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>
              Modal Saat Ini: <span style={{ color: 'var(--p)' }}>{modalNum > 0 ? fRp(modalNum) : 'Belum diatur'}</span>
              {goals.modalCurrency === 'usd' && goals.modalUsdAmount && (
                <span style={{ fontSize: 11, opacity: 0.6, marginLeft: 6 }}>≈ ${goals.modalUsdAmount.toFixed(2)}</span>
              )}
            </div>
            <div style={{ fontSize: 11, opacity: 0.6, marginTop: 3 }}>
              Ubah modal dari ⚙️ Pengaturan Akun di halaman Pilih Akun
            </div>
          </div>
        </div>
      </div>

      </span>
              </div>
              <div className="modal-bar-item">
                <span className="modal-bar-label">Terpakai</span>
                <span className="modal-bar-val" style={{ color: 'var(--r)' }}>{fRp(totalSpend)}</span>
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
                <div className="d-ms-prog-fill" style={{ width: `${pctBalik}%`, background: sudahBalik ? 'var(--g)' : 'var(--p)' }} />
              </div>
              <div className="d-ms-prog-row" style={{ marginTop: 6 }}>
                <span className="d-ms-prog-txt" style={{ fontSize: 12 }}>{pctBalik.toFixed(1)}% balik modal</span>
                <span className="d-ms-prog-txt" style={{ fontSize: 12 }}>{fRp(netProfit)} / {fRp(modalNum)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payout Form — Collapsible */}
      <div className="card">
        <div className="card-h" style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => { setPayoutOpen(o => !o); }}>
          <span className="card-h-title">{poEditId ? 'Edit Payout Adsense' : 'Tambah Payout Adsense'}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {poEditId && (
              <span className="card-h-tag" style={{ cursor: 'pointer' }} onClick={e => { e.stopPropagation(); resetPoForm(); setPayoutOpen(false); }}>
                Batal Edit
              </span>
            )}
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ transform: payoutOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s', opacity: 0.7 }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </div>
        {payoutOpen && (
          <div className="card-b">
            <div className="two-col">
              <div className="fg">
                <label>Tanggal PO</label>
                <input type="date" value={poDate} onChange={e => setPoDate(e.target.value)} />
              </div>
              <div className="fg">
                <label>Status</label>
                <select value={poStatus} onChange={e => setPoStatus(e.target.value as 'pending' | 'sukses')}>
                  <option value="pending">Pending (belum cair)</option>
                  <option value="sukses">Sukses (sudah cair)</option>
                </select>
              </div>
            </div>
            <div className="fg">
              <label>Nominal Payout (Rp)</label>
              <input type="number" placeholder="Contoh: 1500000" value={poAmount} onChange={e => setPoAmount(e.target.value)} inputMode="numeric" />
            </div>
            <div className="two-col">
              <div className="fg">
                <label>Nama Bank</label>
                <input type="text" placeholder="BCA / Mandiri / BRI…" value={poBank} onChange={e => setPoBank(e.target.value)} />
              </div>
              <div className="fg">
                <label>No. Rekening</label>
                <input type="text" placeholder="1234567890" value={poAccNo} onChange={e => setPoAccNo(e.target.value)} />
              </div>
            </div>
            <div className="fg">
              <label>Atas Nama</label>
              <input type="text" placeholder="Nama pemilik rekening" value={poHolder} onChange={e => setPoHolder(e.target.value)} />
            </div>
            <div className="fg">
              <label>Catatan (opsional)</label>
              <input type="text" placeholder="Misal: payout Maret 2026" value={poNote} onChange={e => setPoNote(e.target.value)} />
            </div>
            <div className="btn-row">
              <button className="btn-primary" onClick={handleSavePayout} disabled={!poDate || !(parseFloat(poAmount) > 0)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                {poEditId ? 'Update Payout' : 'Tambah Payout'}
              </button>
              {poSavedMsg && <span style={{ fontSize: 12, color: 'var(--g)', fontWeight: 600 }}>✓ Tersimpan</span>}
            </div>
          </div>
        )}
      </div>

      {/* Payout History */}
      <div className="card">
        <div className="card-h">
          <span className="card-h-title">Riwayat Payout</span>
          <span className="card-h-tag">{payouts.length} entri</span>
        </div>
        <div className="card-b">
          {payouts.length > 0 && (
            <div className="po-summary">
              <div className="po-summary-item">
                <span className="po-summary-lbl">Total Pending</span>
                <span className="po-summary-val" style={{ color: 'var(--a)' }}>{fRp(totPending)}</span>
              </div>
              <div className="po-summary-item">
                <span className="po-summary-lbl">Total Sukses</span>
                <span className="po-summary-val" style={{ color: 'var(--g)' }}>{fRp(totSukses)}</span>
              </div>
            </div>
          )}
          {sortedPayouts.length === 0 ? (
            <div className="empty">Belum ada payout. Tambah lewat form di atas.</div>
          ) : (
            <div className="po-list">
              {sortedPayouts.map(p => (
                <div key={p.id} className="po-item">
                  <div className="po-item-main">
                    <div className="po-item-top">
                      <span className="po-item-date">{p.date}</span>
                      <span className={`po-status ${p.status}`} onClick={() => togglePayoutStatus(p.id)} title="Klik untuk ubah status">
                        {p.status === 'sukses' ? '✓ Sukses' : '⏳ Pending'}
                      </span>
                    </div>
                    <div className="po-item-amount">{fRp(p.amount)}</div>
                    {(p.bankName || p.accountNo || p.accountHolder) && (
                      <div className="po-item-bank">
                        {p.bankName} {p.accountNo ? `· ${p.accountNo}` : ''} {p.accountHolder ? `· a.n. ${p.accountHolder}` : ''}
                      </div>
                    )}
                    {p.note && <div className="po-item-note">📝 {p.note}</div>}
                  </div>
                  <div className="po-item-actions">
                    {p.status === 'pending' && (
                      <button className="po-btn po-btn-cair" onClick={() => togglePayoutStatus(p.id)} title="Tandai sukses cair">
                        💵 Cairkan
                      </button>
                    )}
                    <button className="po-btn" onClick={() => startEditPayout(p)} title="Edit">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button className="po-btn po-btn-del" onClick={() => deletePayout(p.id)} title="Hapus">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 01-2 2H9a2 2 0 01-2-2L5 6"/></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
