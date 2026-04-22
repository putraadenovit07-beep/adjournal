import { useState, useEffect } from 'react';
import type { Goals, Entry, Payout } from '../lib/storage';
import { fRp } from '../lib/helpers';
import { fetchUsdToIdr, getCachedRate, formatRate } from '../lib/currency';
import type { GistData, GlobalModalConfig } from '../lib/github-db';

interface Props {
  goals: Goals;
  entries: Entry[];
  payouts: Payout[];
  onSave: (g: Goals) => void;
  onSavePayouts: (p: Payout[]) => void;
  gistData: GistData;
  activeProfile: string;
  onSaveGistData: (g: GistData) => void;
}

const todayIso = () => new Date().toISOString().split('T')[0];

export default function ModalAwalPage({
  goals, entries, payouts, onSave, onSavePayouts,
  gistData, activeProfile, onSaveGistData,
}: Props) {
  const [tab, setTab] = useState<'per-akun' | 'semua-akun'>('per-akun');

  // Per-akun state
  const [modal, setModal] = useState<string>(goals.modal ? String(goals.modal) : '');
  const [start, setStart] = useState<string>(goals.start || '');
  const [perCurrency, setPerCurrency] = useState<'idr' | 'usd'>(goals.modalCurrency || 'idr');
  const [savedMsg, setSavedMsg] = useState(false);

  // Keseluruhan akun state
  const gm = gistData.globalModal;
  const [globalEnabled, setGlobalEnabled] = useState<boolean>(gm?.enabled ?? false);
  const [globalAmount, setGlobalAmount] = useState<string>(
    gm ? (gm.currency === 'usd' && gm.usdAmount ? String(gm.usdAmount) : (gm.amount ? String(gm.amount) : '')) : ''
  );
  const [globalCurrency, setGlobalCurrency] = useState<'idr' | 'usd'>(gm?.currency || 'idr');
  const [profileOrder, setProfileOrder] = useState<string[]>(() => {
    if (gm?.profileOrder?.length) return gm.profileOrder;
    return Object.keys(gistData.profiles);
  });
  const [globalSavedMsg, setGlobalSavedMsg] = useState(false);

  // USD rate
  const [usdRate, setUsdRate] = useState<number>(getCachedRate());
  useEffect(() => { fetchUsdToIdr().then(r => setUsdRate(r)); }, []);

  // Sync per-akun state when goals prop changes
  useEffect(() => {
    setModal(goals.modal ? String(goals.modal) : '');
    setStart(goals.start || '');
    setPerCurrency(goals.modalCurrency || 'idr');
  }, [goals]);

  // Sync global state when gistData.globalModal changes
  useEffect(() => {
    const g = gistData.globalModal;
    if (g) {
      setGlobalEnabled(g.enabled);
      setGlobalAmount(g.currency === 'usd' && g.usdAmount ? String(g.usdAmount) : (g.amount ? String(g.amount) : ''));
      setGlobalCurrency(g.currency || 'idr');
      if (g.profileOrder?.length) setProfileOrder(g.profileOrder);
    }
  }, [gistData.globalModal]);

  // Sync profile order when profiles change
  useEffect(() => {
    const allProfiles = Object.keys(gistData.profiles);
    setProfileOrder(prev => {
      const withNew = [...prev, ...allProfiles.filter(p => !prev.includes(p))];
      return withNew.filter(p => allProfiles.includes(p));
    });
  }, [gistData.profiles]);

  // Per-akun helpers
  const parsePerAmountIdr = (): number => {
    const v = parseFloat(modal) || 0;
    return perCurrency === 'usd' ? Math.round(v * usdRate) : v;
  };
  const perAmountIdr = parsePerAmountIdr();

  // Per-akun BEP
  const totalSpend = entries.reduce((s, e) => s + (e.spend || 0), 0);
  const totalRevenue = entries.reduce((s, e) => s + (e.revenue || 0), 0);
  const netProfit = totalRevenue - totalSpend;
  const pctBalik = goals.modal > 0 ? Math.min(100, Math.max(0, (netProfit / goals.modal) * 100)) : 0;
  const sisaBEP = Math.max(0, goals.modal - netProfit);
  const sudahBalik = goals.modal > 0 && netProfit >= goals.modal;

  function handleSave() {
    const idrVal = parsePerAmountIdr();
    const updatedGoals: Goals = {
      ...goals,
      modal: idrVal,
      start: start || '',
      modalCurrency: perCurrency,
      modalUsdAmount: perCurrency === 'usd' ? (parseFloat(modal) || 0) : undefined,
    };
    onSave(updatedGoals);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2000);
  }

  // Global helpers
  const parseGlobalAmountIdr = (): number => {
    const v = parseFloat(globalAmount) || 0;
    return globalCurrency === 'usd' ? Math.round(v * usdRate) : v;
  };
  const globalAmountIdr = parseGlobalAmountIdr();

  function calcCascade(orderList: string[], totalIdr: number): Record<string, { inheritedModal: number; totalSpend: number; remaining: number }> {
    const result: Record<string, { inheritedModal: number; totalSpend: number; remaining: number }> = {};
    let remaining = totalIdr;
    for (const pName of orderList) {
      const pData = gistData.profiles[pName];
      const pSpend = pData ? (pData.entries || []).reduce((s, e) => s + (e.spend || 0), 0) : 0;
      const inheritedModal = Math.max(0, remaining);
      result[pName] = { inheritedModal, totalSpend: pSpend, remaining: Math.max(0, inheritedModal - pSpend) };
      remaining = Math.max(0, remaining - pSpend);
    }
    return result;
  }

  const cascadeData = globalAmountIdr > 0 ? calcCascade(profileOrder, globalAmountIdr) : null;

  function moveProfile(idx: number, dir: -1 | 1) {
    const next = [...profileOrder];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setProfileOrder(next);
  }

  function handleApplyGlobal() {
    if (!globalAmountIdr) return;
    const cascade = calcCascade(profileOrder, globalAmountIdr);
    const config: GlobalModalConfig = {
      enabled: globalEnabled,
      amount: globalAmountIdr,
      currency: globalCurrency,
      usdAmount: globalCurrency === 'usd' ? (parseFloat(globalAmount) || 0) : undefined,
      profileOrder: [...profileOrder],
    };
    const updatedProfiles = { ...gistData.profiles };
    if (globalEnabled) {
      for (const pName of profileOrder) {
        if (updatedProfiles[pName]) {
          updatedProfiles[pName] = {
            ...updatedProfiles[pName],
            goals: { ...updatedProfiles[pName].goals, modal: cascade[pName].inheritedModal },
          };
        }
      }
    }
    const updatedGist: GistData = {
      ...gistData,
      profiles: updatedProfiles,
      globalModal: config,
      version: Date.now(),
    };
    onSaveGistData(updatedGist);
    setGlobalSavedMsg(true);
    setTimeout(() => setGlobalSavedMsg(false), 2500);
  }

  // Switch currency helper
  function switchPerCurrency(to: 'idr' | 'usd') {
    if (to === perCurrency) return;
    if (modal) {
      const v = parseFloat(modal) || 0;
      if (to === 'usd') setModal((v / usdRate).toFixed(2));
      else setModal(String(Math.round(v * usdRate)));
    }
    setPerCurrency(to);
  }

  function switchGlobalCurrency(to: 'idr' | 'usd') {
    if (to === globalCurrency) return;
    if (globalAmount) {
      const v = parseFloat(globalAmount) || 0;
      if (to === 'usd') setGlobalAmount((v / usdRate).toFixed(2));
      else setGlobalAmount(String(Math.round(v * usdRate)));
    }
    setGlobalCurrency(to);
  }

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
  }

  function togglePayoutStatus(id: number) {
    onSavePayouts(payouts.map(p => p.id === id ? { ...p, status: p.status === 'pending' ? 'sukses' : 'pending' } : p));
  }

  function deletePayout(id: number) {
    if (!confirm('Hapus payout ini?')) return;
    onSavePayouts(payouts.filter(p => p.id !== id));
    if (poEditId === id) resetPoForm();
  }

  const tabBtnStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, fontSize: 13, padding: '9px 0', borderRadius: 7, cursor: 'pointer',
    border: active ? 'none' : '1px solid var(--border)',
    background: active ? 'var(--p)' : 'transparent',
    color: active ? '#fff' : 'var(--text)',
    fontWeight: active ? 700 : 500,
    transition: 'all .15s',
  });

  const currBtnStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, fontSize: 12, padding: '7px 0', borderRadius: 6, cursor: 'pointer',
    border: active ? 'none' : '1px solid var(--border)',
    background: active ? 'var(--p)' : 'transparent',
    color: active ? '#fff' : 'var(--text)',
    fontWeight: active ? 700 : 400,
    transition: 'all .15s',
  });

  return (
    <div className="page">
      <div className="ph">
        <h1>Modal &amp; Payout</h1>
        <p>Atur modal awal &amp; catat payout Adsense</p>
      </div>

      {/* Tab selector */}
      <div className="card" style={{ padding: '8px' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={tabBtnStyle(tab === 'per-akun')} onClick={() => setTab('per-akun')}>Per Akun</button>
          <button style={tabBtnStyle(tab === 'semua-akun')} onClick={() => setTab('semua-akun')}>Keseluruhan Akun</button>
        </div>
      </div>

      {/* ── PER AKUN TAB ── */}
      {tab === 'per-akun' && (
        <>
          <div className="card">
            <div className="card-h">
              <span className="card-h-title">Modal: {activeProfile}</span>
              {gm?.enabled && (
                <span className="card-h-tag" style={{ color: 'var(--a)', fontSize: 11 }}>Mode Global Aktif</span>
              )}
            </div>
            <div className="card-b">
              {gm?.enabled && (
                <div style={{ background: 'var(--bg2)', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: 'var(--a)', lineHeight: 1.5 }}>
                  ⚠ Mode "Keseluruhan Akun" sedang aktif. Modal akun ini otomatis dihitung dari modal global. Kamu masih bisa override di sini.
                </div>
              )}

              {/* Currency toggle */}
              <div className="fg">
                <label>Mata Uang Input</label>
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <button style={currBtnStyle(perCurrency === 'idr')} onClick={() => switchPerCurrency('idr')}>IDR (Rupiah)</button>
                  <button style={currBtnStyle(perCurrency === 'usd')} onClick={() => switchPerCurrency('usd')}>USD (Dollar)</button>
                </div>
                {perCurrency === 'usd' && (
                  <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>
                    {formatRate(usdRate)} · diperbarui tiap jam · tampilan tetap Rupiah
                  </div>
                )}
              </div>

              <div className="two-col">
                <div className="fg">
                  <label>Modal Awal {perCurrency === 'usd' ? '(USD $)' : '(Rp)'}</label>
                  <input
                    type="number"
                    placeholder={perCurrency === 'usd' ? 'Cth: 56.25' : 'Cth: 900000'}
                    value={modal}
                    onChange={e => setModal(e.target.value)}
                    inputMode="decimal"
                    step={perCurrency === 'usd' ? '0.01' : '1000'}
                  />
                  {perCurrency === 'usd' && modal && perAmountIdr > 0 && (
                    <div style={{ fontSize: 12, color: 'var(--p)', marginTop: 4, fontWeight: 600 }}>
                      = {fRp(perAmountIdr)}
                    </div>
                  )}
                </div>
                <div className="fg">
                  <label>Tanggal Mulai (opsional)</label>
                  <input type="date" value={start} onChange={e => setStart(e.target.value)} />
                </div>
              </div>

              <div className="btn-row">
                <button className="btn-primary" onClick={handleSave}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                  Simpan
                </button>
                {savedMsg && <span style={{ fontSize: 12, color: 'var(--g)', fontWeight: 600 }}>✓ Tersimpan</span>}
              </div>
            </div>
          </div>

          {goals.modal > 0 && (
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
                    <span className="modal-bar-val" style={{ color: 'var(--p)' }}>{fRp(goals.modal)}</span>
                    {goals.modalCurrency === 'usd' && goals.modalUsdAmount && (
                      <span style={{ fontSize: 11, opacity: 0.6 }}>≈ ${goals.modalUsdAmount.toFixed(2)}</span>
                    )}
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
                    <span className="d-ms-prog-txt" style={{ fontSize: 12 }}>{fRp(netProfit)} / {fRp(goals.modal)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── KESELURUHAN AKUN TAB ── */}
      {tab === 'semua-akun' && (
        <div className="card">
          <div className="card-h">
            <span className="card-h-title">Modal Keseluruhan Akun</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={globalEnabled} onChange={e => setGlobalEnabled(e.target.checked)} style={{ width: 15, height: 15 }} />
              Aktifkan
            </label>
          </div>
          <div className="card-b">
            <div style={{ fontSize: 12, opacity: 0.65, marginBottom: 12, lineHeight: 1.6 }}>
              Set satu modal untuk semua akun Adsense. Sisa modal akun ke-1 otomatis menjadi modal akun ke-2, begitu seterusnya.
            </div>

            {/* Currency toggle */}
            <div className="fg">
              <label>Mata Uang Input</label>
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <button style={currBtnStyle(globalCurrency === 'idr')} onClick={() => switchGlobalCurrency('idr')}>IDR (Rupiah)</button>
                <button style={currBtnStyle(globalCurrency === 'usd')} onClick={() => switchGlobalCurrency('usd')}>USD (Dollar)</button>
              </div>
              {globalCurrency === 'usd' && (
                <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>
                  {formatRate(usdRate)} · diperbarui tiap jam · kalkulasi & simpan dalam Rupiah
                </div>
              )}
            </div>

            <div className="fg">
              <label>Total Modal {globalCurrency === 'usd' ? '(USD $)' : '(Rp)'}</label>
              <input
                type="number"
                placeholder={globalCurrency === 'usd' ? 'Cth: 56.25' : 'Cth: 900000'}
                value={globalAmount}
                onChange={e => setGlobalAmount(e.target.value)}
                inputMode="decimal"
                step={globalCurrency === 'usd' ? '0.01' : '1000'}
              />
              {globalCurrency === 'usd' && globalAmount && globalAmountIdr > 0 && (
                <div style={{ fontSize: 12, color: 'var(--p)', marginTop: 4, fontWeight: 600 }}>
                  = {fRp(globalAmountIdr)}
                </div>
              )}
            </div>

            {/* Profile order + cascade preview */}
            <div className="fg" style={{ marginTop: 8 }}>
              <label>Urutan Akun Adsense</label>
              <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 8 }}>
                Gunakan ▲▼ untuk atur urutan. Sisa modal diteruskan bertahap ke akun berikutnya.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {profileOrder.map((profileName, idx) => {
                  const cascade = cascadeData?.[profileName];
                  const isActive = profileName === activeProfile;
                  return (
                    <div key={profileName} style={{
                      background: 'var(--bg2)', borderRadius: 9, padding: '10px 12px',
                      border: isActive ? '1.5px solid var(--p)' : '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                      {/* Up/down controls */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <button onClick={() => moveProfile(idx, -1)} disabled={idx === 0}
                          style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.25 : 0.8, padding: 2, color: 'var(--text)' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15" /></svg>
                        </button>
                        <button onClick={() => moveProfile(idx, 1)} disabled={idx === profileOrder.length - 1}
                          style={{ background: 'none', border: 'none', cursor: idx === profileOrder.length - 1 ? 'default' : 'pointer', opacity: idx === profileOrder.length - 1 ? 0.25 : 0.8, padding: 2, color: 'var(--text)' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
                        </button>
                      </div>
                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: 13, color: isActive ? 'var(--p)' : 'var(--text)' }}>
                            #{idx + 1} {profileName}
                          </span>
                          {isActive && (
                            <span style={{ fontSize: 10, background: 'var(--p)', color: '#fff', borderRadius: 4, padding: '1px 6px' }}>Aktif</span>
                          )}
                        </div>
                        {cascade && globalAmountIdr > 0 ? (
                          <div style={{ marginTop: 5, display: 'flex', flexWrap: 'wrap', gap: '3px 14px', fontSize: 12 }}>
                            <span style={{ opacity: 0.7 }}>Modal: <strong style={{ color: 'var(--p)' }}>{fRp(cascade.inheritedModal)}</strong></span>
                            <span style={{ opacity: 0.7 }}>Terpakai: <strong style={{ color: 'var(--r)' }}>{fRp(cascade.totalSpend)}</strong></span>
                            <span style={{ opacity: 0.7 }}>Sisa: <strong style={{ color: cascade.remaining > 0 ? 'var(--g)' : 'var(--r)' }}>{fRp(cascade.remaining)}</strong></span>
                          </div>
                        ) : (
                          <div style={{ fontSize: 11, opacity: 0.5, marginTop: 3 }}>Isi total modal di atas untuk lihat kalkulasi</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="btn-row" style={{ marginTop: 14 }}>
              <button className="btn-primary" onClick={handleApplyGlobal} disabled={!globalAmountIdr}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                {globalEnabled ? 'Terapkan ke Semua Akun' : 'Simpan Pengaturan'}
              </button>
              {globalSavedMsg && (
                <span style={{ fontSize: 12, color: 'var(--g)', fontWeight: 600 }}>
                  ✓ {globalEnabled ? 'Diterapkan ke semua akun' : 'Tersimpan'}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── PAYOUT SECTION ── */}
      <div className="card">
        <div className="card-h">
          <span className="card-h-title">{poEditId ? 'Edit Payout Adsense' : 'Tambah Payout Adsense'}</span>
          {poEditId && <span className="card-h-tag" style={{ cursor: 'pointer' }} onClick={resetPoForm}>Batal Edit</span>}
        </div>
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
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
              {poEditId ? 'Update Payout' : 'Tambah Payout'}
            </button>
            {poSavedMsg && <span style={{ fontSize: 12, color: 'var(--g)', fontWeight: 600 }}>✓ Tersimpan</span>}
          </div>
        </div>
      </div>

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
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    </button>
                    <button className="po-btn po-btn-del" onClick={() => deletePayout(p.id)} title="Hapus">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-2 14a2 2 0 01-2 2H9a2 2 0 01-2-2L5 6" /></svg>
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
