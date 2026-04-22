import { useState } from 'react';
import type { GistData, ProfileData, ProfileSettings, ThemeName } from '../lib/github-db';
import { EMPTY_PROFILE, EMPTY_SETTINGS } from '../lib/github-db';
import { testTelegram, fetchChatIdFromBot } from '../lib/telegram';

interface Props {
  username: string;
  gistData: GistData;
  onSelect: (profileName: string, profileData: ProfileData, updatedGist: GistData) => void;
  onLogout: () => void;
  onDeleteProfile: (profileName: string, updatedGist: GistData) => void;
  onUpdateSettings: (profileName: string, newSettings: ProfileSettings) => void;
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

export default function ProfileSelect({ username, gistData, onSelect, onLogout, onDeleteProfile, onUpdateSettings }: Props) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [settingsFor, setSettingsFor] = useState<string | null>(null);
  const [draftSettings, setDraftSettings] = useState<ProfileSettings>({ ...EMPTY_SETTINGS });
  const [tgTesting, setTgTesting] = useState(false);
  const [tgResult, setTgResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [tgFetching, setTgFetching] = useState(false);

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
      setTgResult({ ok: true, msg: `Chat ID terisi otomatis: ${r.chatId}${r.chatTitle ? ' (' + r.chatTitle + ')' : ''}` });
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
  }

  function saveSettings() {
    if (!settingsFor) return;
    onUpdateSettings(settingsFor, draftSettings);
    setSettingsFor(null);
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
                  </div>
                  <svg className="profile-card-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
                <button
                  className="profile-card-set"
                  onClick={(e) => { e.stopPropagation(); openSettings(name); }}
                  title="Pengaturan akun"
                  aria-label="Pengaturan akun"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
                </button>
                <button
                  className="profile-card-del"
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(name); }}
                  title="Hapus akun"
                  aria-label="Hapus akun"
                >
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
              <input
                type="text"
                placeholder="Contoh: Akun Facebook Ads, Client A, dsb"
                value={newName}
                onChange={e => { setNewName(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                autoFocus
                maxLength={40}
              />
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
            <div className="profile-confirm-modal" onClick={(e) => e.stopPropagation()}>
              <div className="profile-confirm-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <div className="profile-confirm-title">Hapus akun ini?</div>
              <div className="profile-confirm-msg">
                Akun <strong>{confirmDelete}</strong> akan dihapus permanen beserta semua campaign, entri, dan data modal-nya.
                <br/><br/>
                <span style={{ color: 'var(--r)', fontWeight: 600 }}>Tindakan ini tidak bisa dibatalkan.</span>
              </div>
              <div className="profile-confirm-acts">
                <button className="profile-confirm-no" onClick={() => setConfirmDelete(null)}>
                  Tidak, Batal
                </button>
                <button className="profile-confirm-yes" onClick={() => handleConfirmDelete(confirmDelete)}>
                  Ya, Hapus
                </button>
              </div>
            </div>
          </div>
        )}

        {settingsFor && (
          <div className="profile-confirm-backdrop" onClick={() => setSettingsFor(null)}>
            <div className="profile-confirm-modal profile-settings-modal" onClick={(e) => e.stopPropagation()}>
              <div className="profile-settings-head">
                <div className="profile-settings-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
                </div>
                <div>
                  <div className="profile-confirm-title" style={{ marginTop: 0 }}>Pengaturan Tampilan</div>
                  <div className="profile-settings-sub">Akun: <strong>{settingsFor}</strong></div>
                </div>
              </div>
              <div className="profile-settings-scroll">
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

                <div className="profile-settings-section">
                  <div className="profile-settings-section-title">Tema Tampilan</div>
                  <div className="theme-picker">
                    {([
                      { id: 'default', name: 'Default', sub: 'Gelap & ungu', c1: '#0f0f17', c2: '#8b7cf8', c3: '#f4f4f8' },
                      { id: 'adsense', name: 'Adsense', sub: 'Putih & biru Google', c1: '#ffffff', c2: '#1a73e8', c3: '#202124' },
                    ] as { id: ThemeName; name: string; sub: string; c1: string; c2: string; c3: string }[]).map(t => (
                      <button
                        key={t.id}
                        type="button"
                        className={`theme-card ${(draftSettings.theme || 'default') === t.id ? 'active' : ''}`}
                        onClick={() => setDraftSettings(s => ({ ...s, theme: t.id }))}
                      >
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
                          <span className="theme-check">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

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
                        <input
                          type="password"
                          placeholder="123456789:ABC..."
                          value={draftSettings.telegramBotToken || ''}
                          onChange={e => { setDraftSettings(s => ({ ...s, telegramBotToken: e.target.value })); setTgResult(null); }}
                        />
                      </div>
                      <div className="fg">
                        <label>Chat ID <span className="tg-label-hint">(angka, bukan token)</span></label>
                        <div className="tg-chatid-row">
                          <input
                            type="text"
                            placeholder="contoh: 123456789 atau -1001234567890"
                            value={draftSettings.telegramChatId || ''}
                            onChange={e => { setDraftSettings(s => ({ ...s, telegramChatId: e.target.value })); setTgResult(null); }}
                          />
                          <button type="button" className="tg-fetch-btn" onClick={handleFetchChatId} disabled={tgFetching} title="Auto-isi dari bot">
                            {tgFetching ? '...' : '🔍 Auto'}
                          </button>
                        </div>
                      </div>
                      <div className="tg-help">
                        <strong>Cara pakai auto-detect:</strong> 1) Buat bot via <strong>@BotFather</strong> & paste token di atas. 2) Buka chat bot di Telegram, kirim <code>/start</code>. 3) Klik tombol <strong>🔍 Auto</strong> — Chat ID terisi otomatis.
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
                <button className="profile-confirm-no" onClick={() => setSettingsFor(null)}>Batal</button>
                <button className="profile-confirm-yes profile-settings-save" onClick={saveSettings}>Simpan</button>
              </div>
            </div>
          </div>
        )}

        <button className="profile-logout" onClick={onLogout}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Ganti Token / Keluar
        </button>
      </div>
    </div>
  );
}
