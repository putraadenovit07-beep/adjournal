import { useState } from 'react';
import type { GistData, ProfileData } from '../lib/github-db';
import { EMPTY_PROFILE } from '../lib/github-db';

interface Props {
  username: string;
  gistData: GistData;
  onSelect: (profileName: string, profileData: ProfileData, updatedGist: GistData) => void;
  onLogout: () => void;
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

export default function ProfileSelect({ username, gistData, onSelect, onLogout }: Props) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');

  const profiles = Object.keys(gistData.profiles);

  function handleSelect(name: string) {
    const profileData = gistData.profiles[name] || { ...EMPTY_PROFILE };
    onSelect(name, profileData, gistData);
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
              <button key={name} className="profile-card" onClick={() => handleSelect(name)}>
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

        <button className="profile-logout" onClick={onLogout}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Ganti Token / Keluar
        </button>
      </div>
    </div>
  );
}
