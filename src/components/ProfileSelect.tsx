import { useState, useEffect } from 'react';
import type { GistData, ProfileData, ProfileSettings, ThemeName, GlobalModalConfig } from '../lib/github-db';
import { EMPTY_PROFILE, EMPTY_SETTINGS } from '../lib/github-db';
import { testTelegram, fetchChatIdFromBot } from '../lib/telegram';
import { fRp } from '../lib/helpers';
import { fetchUsdToIdr, getCachedRate } from '../lib/currency';
import type { Goals } from '../lib/storage';

interface Props {
  username: string;
  gistData: GistData;
  onSelect: (profileName: string, profileData: ProfileData, updatedGist: GistData) => void;
  onLogout: () => void;
  onDeleteProfile: (profileName: string, updatedGist: GistData) => void;
  onUpdateSettings: (profileName: string, newSettings: ProfileSettings) => void;
  onSaveGistData: (g: GistData) => void;
}

const PROFILE_COLORS = [
  '#8b7cf8', '#00d98b', '#5b9ef9', '#ffaa00', '#ff4d6d', '#38d9c0',
  '#f97316', '#a78bfa', '#34d399', '#60a5fa',
];

function getColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PROFILE_COLORS[Math.abs(hash) % PROFILE_COLORS.length];
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function profileSisaModal(gistData: GistData, name: string) {
  const p = gistData.profiles[name];
  if (!p) return null;
  const modal = p.goals?.modal || 0;
  if (!modal) return null;
  const totalSpend = (p.entries || []).reduce((s, e) => s + (e.spend || 0), 0);
  const totalRevenue = (p.entries || []).reduce((s, e) => s + (e.revenue || 0), 0);
  const netProfit = totalRevenue - totalSpend;
  const sisa = Math.max(0, modal - netProfit);
  const tercapai = netProfit >= modal;
  return { modal, sisa, tercapai, netProfit, totalSpend };
}

export default function ProfileSelect({ username, gistData, onSelect, onLogout, onDeleteProfile, onUpdateSettings, onSaveGistData }: Props) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [settingsFor, setSettingsFor] = useState<string | null>(null);
  const [draftSettings, setDraftSettings] = useState<ProfileSettings>({ ...EMPTY_SETTINGS });
  const [tgTesting, setTgTesting] = useState(false);
  const [tgResult, setTgResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [tgFetching, setTgFetching] = useState(false);

  // Modal settings state
  const [mTab, setMTab] = useState<'per-akun' | 'semua-akun'>('per-akun');
  const [mAmount, setMAmount] = useState('');
  const [mCurrency, setMCurrency] = useState<'idr' | 'usd'>('idr');
  const [mStart, setMStart] = useState('');
  const [mSaved, setMSaved] = useState(false);
  const [gmEnabled, setGmEnabled] = useState(false);
  const [gmAmount, setGmAmount] = useState('');
  const [gmCurrency, setGmCurrency] = useState<'idr' | 'usd'>('idr');
  const [gmOrder, setGmOrder] = useState<string[]>([]);
  const [gmSaved, setGmSaved] = useState(false);
  const [usdRate, setUsdRate] = useState(getCachedRate());

  useEffect(() => {
    fetchUsdToIdr().then(r => setUsdRate(r));
  }, []);

  async function handleTestTelegram() {
    if (!settingsFor) return;
    setTgTesting(true); setTgResult(null);
    const r = await testTelegram(draftSettings, settingsFor);
    setTgResult({ ok: r.ok, msg: r.ok ? 'Berhasil! Cek Telegram kamu.' : (r.error || 'Gagal kirim') });
    setTgTesting(false);
  }

  async function handleFetchChatId() {
    setTgFetching(true); setTgResult(null);
    const r = await fetchChatIdFromBot(draftSettings.telegramBotToken || '');
    if (r.ok && r.chatId) {
      setDraftSettings(s => ({ ...s, telegramChatId: r.chatId! }));
      setTgResult({ ok: true, msg: `Chat ID terisi: ${r.chatId}${r.chatTitle ? ' (' + r.chatTitle + ')' : ''}` });
    } else {
      setTgResult({ ok: false, msg: r.error || 'Gagal ambil chat ID' });
    }
    setTgFetching(false);
  }

  function openSettings(name: string) {
    const current = gistData.profiles[name]?.settings || EMPTY_SETTINGS;
    setDraftSettings({ ...EMPTY_SETTINGS, ...current });
    setTgResult(null);
    setSettingsFor(name);
    setMTab('per-akun');
    setMSaved(false);
    setGmSaved(false);

    // Init per-akun modal
    const goals = gistData.profiles[name]?.goals;
    if (goals?.modalCurrency === 'usd' && goals.modalUsdAmount) {
      setMCurrency('usd');
      setMAmount(String(goals.modalUsdAmount));
    } else {
      setMCurrency('idr');
      setMAmount(goals?.modal ? String(goals.modal) : '');
    }
    setMStart(goals?.start || '');

    // Init global modal
    const gm = gistData.globalModal;
    setGmEnabled(gm?.enabled ?? false);
    if (gm?.currency === 'usd' && gm.usdAmount) {
      setGmCurrency('usd');
      setGmAmount(String(gm.usdAmount));
    } else {
      setGmCurrency('idr');
      setGmAmount(gm?.amount ? String(gm.amount) : '');
    }
    const profiles = Object.keys(gistData.profiles);
    setGmOrder(gm?.profileOrder?.length ? gm.profileOrder : profiles);
  }

  function saveSettings() {
    if (!settingsFor) return;
    onUpdateSettings(settingsFor, draftSettings);
    setSettingsFor(null);
  }

  function savePerAkunModal() {
    if (!settingsFor) return;
    const v = parseFloat(mAmount) || 0;
    const idrVal = mCurrency === 'usd' ? Math.round(v * usdRate) : v;
    const existing = gistData.profiles[settingsFor];
    const updatedGoals: Goals = {
      ...(existing?.goals || { modal: 0, start: '', milestones: [], locked: false }),
      modal: idrVal,
      start: mStart,
      modalCurrency: mCurrency,
      modalUsdAmount: mCurrency === 'usd' ? v : undefined,
    };
    const updatedGist: GistData = {
      ...gistData,
      profiles: {
        ...gistData.profiles,
        [settingsFor]: { ...existing, goals: updatedGoals },
      },
      version: Date.now(),
    };
    onSaveGistData(updatedGist);
    setMSaved(true);
    setTimeout(() => setMSaved(false), 2200);
  }

  function moveGmOrder(idx: number, dir: -1 | 1) {
    const arr = [...gmOrder];
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= arr.length) return;
    [arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]];
    setGmOrder(arr);
  }

  function calcCascade(totalIdr: number): Record<string, number> {
    const result: Record<string, number> = {};
    let remaining = totalIdr;
    for (const pName of gmOrder) {
      result[pName] = Math.max(0, remaining);
      const pSpend = (gistData.profiles[pName]?.entries || []).reduce((s, e) => s + (e.spend || 0), 0);
      remaining = Math.max(0, remaining - pSpend);
    }
    return result;
  }

  function saveGlobalModal() {
    const v = parseFloat(gmAmount) || 0;
    if (!v) return;
    const idrVal = gmCurrency === 'usd' ? Math.round(v * usdRate) : v;
    const cascade = calcCascade(idrVal);

    const config: GlobalModalConfig = {
      enabled: gmEnabled,
      amount: idrVal,
      currency: gmCurrency,
      usdAmount: gmCurrency === 'usd' ? v : undefined,
      profileOrder: [...gmOrder],
    };

    const updatedProfiles = { ...gistData.profiles };
    if (gmEnabled) {
      for (const pName of gmOrder) {
        if (updatedProfiles[pName]) {
          updatedProfiles[pName] = {
            ...updatedProfiles[pName],
            goals: { ...updatedProfiles[pName].goals, modal: cascade[pName] },
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
    setGmSaved(true);
    setTimeout(() => setGmSaved(false), 2500);
  }

  const profiles = Object.keys(gistData.profiles);

  function handleSelect(name: string) {
    const profileData = gistData.profiles[name] || { ...EMPTY_PROFILE };
    onSelect(name, profileData, gistData);
  }

  function handleConfirmDelete(name: string) {
    const newProfiles = { ...gistData.profiles };
    delete newProfiles[name];
    const updated: GistData = { ...gistData, profiles: newProfiles, version: Date.now() };
    setConfirmDelete(null);
    onDeleteProfile(name, updated);
  }

  function handleCreate() {
    const name = newName.trim();
    if (!name) { setError('Nama akun tidak boleh kosong'); return; }
    if (gistData.profiles[name]) { setError('Nama akun sudah ada'); return; }
    const updated: GistData = {
      ...gistData,
      profiles: {
        ...gistData.profiles,
        [name]: { ...EMPTY_PROFILE, campaigns: [], entries: [], goals: { modal: 0, start: '', milestones: [], locked: false } }
      }
    };
    onSelect(name, updated.profiles[name], updated);
  }

  // Cascade preview for keseluruhan tab
  const gmIdrVal = gmCurrency === 'usd' ? Math.round((parseFloat(gmAmount) || 0) * usdRate) : (parseFloat(gmAmount) || 0);
  const cascade = gmIdrVal > 0 ? calcCascade(gmIdrVal) : null;

  return (
    <div className="profile-screen">
      <div className="profile-box">
        <div className="profile-header">
          <div className="login-brand">Ad<span>Journal</span></div>
          <div className="profile-user">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.6 }}><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            {username}
          </div>
        </div>

        <div className="profile-title">Pilih Akun</div>
        <div className="profile-subtitle">
          {profiles.length === 0
            ? 'Belum ada akun. Buat akun pertamamu.'
            : `${profiles.length} akun tersedia — pilih atau buat akun baru`}
        </div>

        <div className="profile-list">
          {profiles.map(name => {
            const p = gistData.profiles[name];
            const color = getColor(name);
            const entryCount = (p?.entries || []).length;
            const cpCount = (p?.campaigns || []).length;
            const ms = profileSisaModal(gistData, name);
            return (
              <div key={name} className="profile-card-wrap">
                <button className="profile-card" onClick={() => handleSelect(name)}>
                  <div className="profile-avatar" style={{ background: color + '22', border: `2px solid ${color}44`, color }}>
                    {getInitials(name)}
                  </div>
                  <div className="profile-card-info">
                    <div className="profile-card-name">{name}</div>
                    <div className="profile-card-meta">
                      {cpCount} campaign · {entryCount} entri
                    </div>
                    {ms && (
                      <div style={{ fontSize: 11, fontWeight: 700, color: ms.tercapai ? 'var(--g)' : 'var(--a)', marginTop: 2 }}>
                        Sisa Modal: {ms.tercapai ? '✓ BEP Tercapai' : fRp(ms.sisa)}
                      </div>
                    )}
                  </div>
                  <svg className="profile-card-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
                <button className="profile-card-set" onClick={e => { e.stopPropagation(); openSettings(name); }} title="Pengaturan akun" aria-label="Pengaturan akun">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
                </button>
                <button className="profile-card-del" onClick={e => { e.stopPropagation(); setConfirmDelete(name); }} title="Hapus akun" aria-label="Hapus akun">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                </button>
              </div>
            );
          })}
        </div>

        {creating ? (
          <div className="profile-create-form">
            <div className="fg">
              <label>Nama Akun Baru</label>
              <input type="text" placeholder="Contoh: Adsense 1, Client A, dsb" value={newName}
                onChange={e => { setNewName(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleCreate()} autoFocus maxLength={40} />
            </div>
            {error && <div className="login-error" style={{ marginTop: 6 }}>{error}</div>}
            <div className="btn-row" style={{ marginTop: 12 }}>
              <button className="btn-primary" onClick={handleCreate}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Buat & Masuk
              </button>
              <button className="btn-secondary" onClick={() => { setCreating(false); setNewName(''); setError(''); }}>Batal</button>
            </div>
          </div>
        ) : (
          <button className="profile-add-btn" onClick={() => setCreating(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Tambah Akun Baru
          </button>
        )}

        {confirmDelete && (
          <div className="profile-confirm-backdrop" onClick={() => setConfirmDelete(null)}>
            <div className="profile-confirm-modal" onClick={e => e.stopPropagation()}>
              <div className="profile-confirm-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <div className="profile-confirm-title">Hapus akun ini?</div>
              <div className="profile-confirm-msg">
                Akun <strong>{confirmDelete}</strong> akan dihapus permanen beserta semua data-nya.
                <br/><span style={{ color: 'var(--r)', fontWeight: 600 }}>Tindakan ini tidak bisa dibatalkan.</span>
              </div>
              <div className="profile-confirm-acts">
                <button className="profile-confirm-no" onClick={() => setConfirmDelete(null)}>Tidak, Batal</button>
                <button className="profile-confirm-yes" onClick={() => handleConfirmDelete(confirmDelete)}>Ya, Hapus</button>
              </div>
            </div>
          </div>
        )}

        {settingsFor && (
          <div className="profile-confirm-backdrop" onClick={() => setSettingsFor(null)}>
            <div className="profile-confirm-modal profile-settings-modal" onClick={e => e.stopPropagation()}>
              <div className="profile-settings-head">
                <div className="profile-settings-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
                </div>
                <div>
                  <div className="profile-confirm-title" style={{ marginTop: 0 }}>Pengaturan Akun</div>
                  <div className="profile-settings-sub">Akun: <strong>{settingsFor}</strong></div>
                </div>
              </div>

              <div className="profile-settings-scroll">

                {/* ===== PENGATURAN MODAL ===== */}
                <div className="profile-settings-section">
                  <div className="profile-settings-section-title">Pengaturan Modal</div>
                  <div className="modal-tab-bar" style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                    {(['per-akun', 'semua-akun'] as const).map(t => (
                      <button key={t} type="button"
                        style={{
                          flex: 1, padding: '6px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                          background: mTab === t ? 'var(--p)' : 'rgba(255,255,255,0.05)',
                          color: mTab === t ? '#fff' : 'var(--t2)',
                          transition: 'all .15s',
                        }}
                        onClick={() => setMTab(t)}
                      >
                        {t === 'per-akun' ? 'Per Akun Ini' : 'Keseluruhan Akun'}
                      </button>
                    ))}
                  </div>

                  {mTab === 'per-akun' && (
                    <div>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                        {(['idr', 'usd'] as const).map(c => (
                          <button key={c} type="button"
                            style={{
                              padding: '5px 14px', borderRadius: 7, border: '1px solid var(--brd)', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                              background: mCurrency === c ? 'var(--p)' : 'transparent',
                              color: mCurrency === c ? '#fff' : 'var(--t2)',
                            }}
                            onClick={() => {
                              if (c === mCurrency) return;
                              const v = parseFloat(mAmount) || 0;
                              if (mCurrency === 'idr' && c === 'usd' && usdRate > 0) {
                                setMAmount(v > 0 ? (v / usdRate).toFixed(2) : '');
                              } else if (mCurrency === 'usd' && c === 'idr') {
                                setMAmount(v > 0 ? String(Math.round(v * usdRate)) : '');
                              }
                              setMCurrency(c);
                            }}
                          >{c.toUpperCase()}</button>
                        ))}
                      </div>
                      <div className="fg" style={{ marginBottom: 8 }}>
                        <label>Modal Awal ({mCurrency.toUpperCase()})</label>
                        <input type="number" placeholder={mCurrency === 'usd' ? 'Contoh: 100.00' : 'Contoh: 900000'}
                          value={mAmount} onChange={e => setMAmount(e.target.value)} inputMode="decimal" />
                        {mCurrency === 'usd' && usdRate > 0 && parseFloat(mAmount) > 0 && (
                          <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>
                            ≈ {fRp(Math.round(parseFloat(mAmount) * usdRate))} (rate: Rp {usdRate.toLocaleString('id-ID')}/USD)
                          </div>
                        )}
                      </div>
                      <div className="fg" style={{ marginBottom: 10 }}>
                        <label>Tanggal Mulai</label>
                        <input type="date" value={mStart} onChange={e => setMStart(e.target.value)} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <button type="button" className="btn-primary" style={{ flex: 1, padding: '8px 0', fontSize: 13 }} onClick={savePerAkunModal}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                          Simpan Modal
                        </button>
                        {mSaved && <span style={{ fontSize: 12, color: 'var(--g)', fontWeight: 700 }}>✓ Tersimpan</span>}
                      </div>
                    </div>
                  )}

                  {mTab === 'semua-akun' && (
                    <div>
                      <label className="profile-settings-row" style={{ marginBottom: 10 }}>
                        <div className="profile-settings-row-info">
                          <div className="profile-settings-row-name">Aktifkan Mode Keseluruhan</div>
                          <div className="profile-settings-row-desc">Modal dibagi otomatis ke semua akun secara cascade</div>
                        </div>
                        <span className={`profile-toggle ${gmEnabled ? 'on' : ''}`} onClick={() => setGmEnabled(v => !v)}>
                          <span className="profile-toggle-knob" />
                        </span>
                      </label>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                        {(['idr', 'usd'] as const).map(c => (
                          <button key={c} type="button"
                            style={{
                              padding: '5px 14px', borderRadius: 7, border: '1px solid var(--brd)', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                              background: gmCurrency === c ? 'var(--p)' : 'transparent',
                              color: gmCurrency === c ? '#fff' : 'var(--t2)',
                            }}
                            onClick={() => {
                              if (c === gmCurrency) return;
                              const v = parseFloat(gmAmount) || 0;
                              if (gmCurrency === 'idr' && c === 'usd' && usdRate > 0) {
                                setGmAmount(v > 0 ? (v / usdRate).toFixed(2) : '');
                              } else if (gmCurrency === 'usd' && c === 'idr') {
                                setGmAmount(v > 0 ? String(Math.round(v * usdRate)) : '');
                              }
                              setGmCurrency(c);
                            }}
                          >{c.toUpperCase()}</button>
                        ))}
                      </div>
                      <div className="fg" style={{ marginBottom: 12 }}>
                        <label>Total Modal ({gmCurrency.toUpperCase()})</label>
                        <input type="number" placeholder={gmCurrency === 'usd' ? 'Contoh: 100.00' : 'Contoh: 2700000'}
                          value={gmAmount} onChange={e => setGmAmount(e.target.value)} inputMode="decimal" />
                        {gmCurrency === 'usd' && usdRate > 0 && parseFloat(gmAmount) > 0 && (
                          <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>
                            ≈ {fRp(Math.round(parseFloat(gmAmount) * usdRate))}
                          </div>
                        )}
                      </div>
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                          Urutan Cascade (▲▼ untuk ubah)
                        </div>
                        {gmOrder.map((pName, idx) => {
                          const pData = gistData.profiles[pName];
                          const pSpend = (pData?.entries || []).reduce((s, e) => s + (e.spend || 0), 0);
                          const allocIdr = cascade ? cascade[pName] : null;
                          return (
                            <div key={pName} style={{
                              display: 'flex', alignItems: 'center', gap: 8,
                              padding: '8px 10px', borderRadius: 8,
                              background: pName === settingsFor ? 'rgba(139,124,248,0.12)' : 'rgba(255,255,255,0.03)',
                              border: `1px solid ${pName === settingsFor ? 'rgba(139,124,248,0.3)' : 'var(--brd)'}`,
                              marginBottom: 4, fontSize: 12,
                            }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <button type="button" onClick={() => moveGmOrder(idx, -1)} disabled={idx === 0}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', padding: '0 2px', lineHeight: 1, opacity: idx === 0 ? 0.3 : 1 }}>▲</button>
                                <button type="button" onClick={() => moveGmOrder(idx, 1)} disabled={idx === gmOrder.length - 1}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', padding: '0 2px', lineHeight: 1, opacity: idx === gmOrder.length - 1 ? 0.3 : 1 }}>▼</button>
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 700, color: 'var(--t1)' }}>
                                  #{idx + 1} {pName}
                                  {pName === settingsFor && <span style={{ color: 'var(--p)', marginLeft: 4, fontSize: 10 }}>● akun ini</span>}
                                </div>
                                <div style={{ color: 'var(--t3)', fontSize: 11 }}>
                                  Terpakai: {fRp(pSpend)}
                                  {allocIdr !== null && gmEnabled && (
                                    <span style={{ color: 'var(--p)', marginLeft: 8 }}>→ Modal: {fRp(allocIdr)}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <button type="button" className="btn-primary" style={{ flex: 1, padding: '8px 0', fontSize: 13 }}
                          onClick={saveGlobalModal} disabled={!gmIdrVal}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                          {gmEnabled ? 'Terapkan ke Semua Akun' : 'Simpan Konfigurasi'}
                        </button>
                        {gmSaved && <span style={{ fontSize: 12, color: 'var(--g)', fontWeight: 700 }}>✓ Diterapkan</span>}
                      </div>
                    </div>
                  )}
                </div>

                {/* ===== SEMBUNYIKAN ===== */}
                <div className="profile-settings-section">
                  <div className="profile-settings-section-title">Sembunyikan di Dashboard</div>
                  <label className="profile-settings-row">
                    <div className="profile-settings-row-info">
                      <div className="profile-settings-row-name">Modal Awal</div>
                      <div className="profile-settings-row-desc">Tracker BEP/balik modal di atas Dashboard</div>
                    </div>
                    <span className={`profile-toggle ${draftSettings.hideModalAwal ? 'on' : ''}`}
                      onClick={() => setDraftSettings(s => ({ ...s, hideModalAwal: !s.hideModalAwal }))}>
                      <span className="profile-toggle-knob" />
                    </span>
                  </label>
                  <label className="profile-settings-row">
                    <div className="profile-settings-row-info">
                      <div className="profile-settings-row-name">Campaign Terbaru</div>
                      <div className="profile-settings-row-desc">Daftar 5 campaign terakhir di bawah Dashboard</div>
                    </div>
                    <span className={`profile-toggle ${draftSettings.hideRecentCampaigns ? 'on' : ''}`}
                      onClick={() => setDraftSettings(s => ({ ...s, hideRecentCampaigns: !s.hideRecentCampaigns }))}>
                      <span className="profile-toggle-knob" />
                    </span>
                  </label>
                </div>

                {/* ===== TEMA ===== */}
                <div className="profile-settings-section">
                  <div className="profile-settings-section-title">Tema Tampilan</div>
                  <div className="theme-picker">
                    {([
                      { id: 'default', name: 'Default', sub: 'Gelap & ungu', c1: '#0f0f17', c2: '#8b7cf8', c3: '#f4f4f8' },
                      { id: 'adsense', name: 'Adsense', sub: 'Putih & biru Google', c1: '#ffffff', c2: '#1a73e8', c3: '#202124' },
                    ] as { id: ThemeName; name: string; sub: string; c1: string; c2: string; c3: string }[]).map(t => (
                      <button key={t.id} type="button"
                        className={`theme-card ${(draftSettings.theme || 'default') === t.id ? 'active' : ''}`}
                        onClick={() => setDraftSettings(s => ({ ...s, theme: t.id }))}>
                        <div className="theme-swatch" style={{ background: t.c1, border: `1px solid ${t.id === 'adsense' ? '#dadce0' : 'rgba(255,255,255,0.08)'}` }}>
                          <span className="theme-dot" style={{ background: t.c2 }} />
                          <span className="theme-bar" style={{ background: t.c3, opacity: 0.85 }} />
                          <span className="theme-bar short" style={{ background: t.c3, opacity: 0.5 }} />
                        </div>
                        <div className="theme-meta">
                          <div className="theme-name">{t.name}</div>
                          <div className="theme-sub">{t.sub}</div>
                        </div>
                        {(draftSettings.theme || 'default') === t.id && (
                          <span className="theme-check"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg></span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ===== TELEGRAM ===== */}
                <div className="profile-settings-section">
                  <div className="profile-settings-section-title">Notifikasi Telegram</div>
                  <label className="profile-settings-row">
                    <div className="profile-settings-row-info">
                      <div className="profile-settings-row-name">Aktifkan Alert</div>
                      <div className="profile-settings-row-desc">Kirim pesan ke Telegram setiap catat / edit jurnal</div>
                    </div>
                    <span className={`profile-toggle ${draftSettings.telegramEnabled ? 'on' : ''}`}
                      onClick={() => setDraftSettings(s => ({ ...s, telegramEnabled: !s.telegramEnabled }))}>
                      <span className="profile-toggle-knob" />
                    </span>
                  </label>
                  {draftSettings.telegramEnabled && (
                    <div className="tg-fields">
                      <div className="fg">
                        <label>Bot Token</label>
                        <input type="password" placeholder="123456789:ABC..."
                          value={draftSettings.telegramBotToken || ''}
                          onChange={e => { setDraftSettings(s => ({ ...s, telegramBotToken: e.target.value })); setTgResult(null); }} />
                      </div>
                      <div className="fg">
                        <label>Chat ID <span className="tg-label-hint">(angka)</span></label>
                        <div className="tg-chatid-row">
                          <input type="text" placeholder="contoh: 123456789"
                            value={draftSettings.telegramChatId || ''}
                            onChange={e => { setDraftSettings(s => ({ ...s, telegramChatId: e.target.value })); setTgResult(null); }} />
                          <button type="button" className="tg-fetch-btn" onClick={handleFetchChatId} disabled={tgFetching}>
                            {tgFetching ? '...' : '🔍 Auto'}
                          </button>
                        </div>
                      </div>
                      <div className="tg-help">
                        <strong>Cara:</strong> Buat bot via <strong>@BotFather</strong>, kirim <code>/start</code> ke bot, lalu klik <strong>🔍 Auto</strong>.
                      </div>
                      <button type="button" className="tg-test-btn" onClick={handleTestTelegram} disabled={tgTesting}>
                        {tgTesting ? 'Mengirim...' : 'Tes Kirim Pesan'}
                      </button>
                      {tgResult && (
                        <div className={`tg-result ${tgResult.ok ? 'ok' : 'err'}`}>{tgResult.msg}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="profile-confirm-acts">
                <button className="profile-confirm-no" onClick={() => setSettingsFor(null)}>Tutup</button>
                <button className="profile-confirm-yes profile-settings-save" onClick={saveSettings}>Simpan Tampilan</button>
              </div>
            </div>
          </div>
        )}

        <button className="profile-logout" onClick={onLogout}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Ganti Token / Keluar
        </button>

        {gistData.globalModal?.enabled && (
          <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,170,0,0.07)', border: '1px solid rgba(255,170,0,0.28)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>⚠️</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--a)', marginBottom: 2 }}>Mode Modal Keseluruhan Aktif</div>
              <div style={{ fontSize: 11, color: 'var(--t3)', lineHeight: 1.5 }}>
                Modal dibagi otomatis ke semua akun secara <em>cascade</em>. Untuk mengubah, buka ⚙️ Pengaturan di salah satu akun → tab Keseluruhan Akun.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
