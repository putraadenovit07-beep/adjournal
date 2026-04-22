import { useState, useEffect, useCallback, type ReactNode } from 'react';
import './index.css';
import type { Campaign, Entry, Goals, Payout } from './lib/storage';
import { formatDate, fRp } from './lib/helpers';
import { getToken, clearToken, getUsername, getLastProfile, setLastProfile } from './lib/auth';
import { writeDb, loginWithToken, recomputeGlobalModalCascade, EMPTY_PROFILE, EMPTY_SETTINGS } from './lib/github-db';
import type { GistData, ProfileData, ProfileSettings } from './lib/github-db';
import { sendTelegram, buildEntryMessage, buildPayoutMessage } from './lib/telegram';
import Login from './components/Login';
import ProfileSelect from './components/ProfileSelect';
import Dashboard from './components/Dashboard';
import Campaigns from './components/Campaigns';
import EntryForm from './components/Entry';
import Journal from './components/Journal';
import ModalAwalPage from './components/ModalAwal';
import Analytics from './components/Analytics';

type Page = 'dashboard' | 'campaigns' | 'entry' | 'journal' | 'modal' | 'analytics';

const EMPTY_GOALS: Goals = { modal: 0, start: '', milestones: [], locked: false };

export default function App() {
  const [username, setUsername] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);

  // Multi-profile
  const [gistData, setGistData] = useState<GistData | null>(null);
  const [activeProfile, setActiveProfile] = useState<string | null>(null);

  const [page, setPage] = useState<Page>('dashboard');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [goals, setGoals] = useState<Goals>(EMPTY_GOALS);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [settings, setSettings] = useState<ProfileSettings>({ ...EMPTY_SETTINGS });
  const [editEntry, setEditEntry] = useState<Entry | null>(null);
  const [prefillCampaignId, setPrefillCampaignId] = useState<number | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'ok' | 'err'>('idle');
  const [toast, setToast] = useState<{ kind: 'ok' | 'err' | 'info'; msg: string } | null>(null);

  function showToast(kind: 'ok' | 'err' | 'info', msg: string, ms = 3200) {
    setToast({ kind, msg });
    window.setTimeout(() => setToast(t => (t && t.msg === msg ? null : t)), ms);
  }

  // Auto-login if token is cached
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    const cachedUser = getUsername();
    if (!cachedUser) return;
    setSyncStatus('syncing');
    loginWithToken(token).then(result => {
      if (result) {
        setUsername(result.username);
        setGistData(result.gistData);
        setLoggedIn(true);
        setSyncStatus('ok');
        setTimeout(() => setSyncStatus('idle'), 2000);
        const last = getLastProfile();
        if (last && result.gistData.profiles[last]) {
          setActiveProfile(last);
          loadProfileData(result.gistData.profiles[last]);
        }
      } else {
        clearToken();
        setSyncStatus('idle');
      }
    }).catch(() => setSyncStatus('idle'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function loadProfileData(profileData: ProfileData) {
    setCampaigns(profileData.campaigns || []);
    setEntries(profileData.entries || []);
    setGoals(profileData.goals || EMPTY_GOALS);
    setPayouts(profileData.payouts || []);
    setSettings({ ...EMPTY_SETTINGS, ...(profileData.settings || {}) });
  }

  // Apply theme to <html> based on current settings
  useEffect(() => {
    const theme = settings.theme || 'default';
    if (theme === 'default') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [settings.theme]);

  function handleLogin(user: string, data: GistData) {
    setUsername(user);
    setGistData(data);
    setLoggedIn(true);
  }

  function handleSelectProfile(profileName: string, profileData: ProfileData, updatedGist: GistData) {
    setGistData(updatedGist);
    setActiveProfile(profileName);
    setLastProfile(profileName);
    loadProfileData(profileData);
    if (!gistData?.profiles[profileName]) {
      writeDb(updatedGist).catch(() => {});
    }
  }

  function handleBackToProfiles() {
    setActiveProfile(null);
    setEditEntry(null);
    setPrefillCampaignId(null);
    setPage('dashboard');
  }

  function handleDeleteProfile(profileName: string, updatedGist: GistData) {
    setGistData(updatedGist);
    if (activeProfile === profileName) {
      setActiveProfile(null);
      setCampaigns([]);
      setEntries([]);
      setGoals(EMPTY_GOALS);
    }
    writeDb(updatedGist).catch(() => {});
  }

  function handleLogout() {
    clearToken();
    setLoggedIn(false);
    setUsername('');
    setGistData(null);
    setActiveProfile(null);
    setCampaigns([]);
    setEntries([]);
    setGoals(EMPTY_GOALS);
    setPayouts([]);
  }

  const syncDb = useCallback(async (cams: Campaign[], ents: Entry[], gls: Goals, currentGist: GistData, profile: string, sett?: ProfileSettings, pos?: Payout[]) => {
    setSyncStatus('syncing');
    try {
      const prev = currentGist.profiles[profile];
      const prevSettings = prev?.settings;
      const prevPayouts = prev?.payouts;
      const draft: GistData = {
        ...currentGist,
        profiles: {
          ...currentGist.profiles,
          [profile]: {
            campaigns: cams,
            entries: ents,
            goals: gls,
            settings: sett ?? prevSettings ?? { ...EMPTY_SETTINGS },
            payouts: pos ?? prevPayouts ?? [],
          }
        },
        version: Date.now(),
      };
      // Re-apply shared-pool allocation so every account's modal stays in
      // sync with the latest spend totals across all accounts.
      const updated = recomputeGlobalModalCascade(draft);
      setGistData(updated);
      // Sync local goals state if the active profile's modal changed.
      const refreshed = updated.profiles[profile]?.goals;
      if (refreshed && refreshed.modal !== gls.modal) {
        setGoals(refreshed);
      }
      await writeDb(updated);
      setSyncStatus('ok');
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch {
      setSyncStatus('err');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  }, []);

  function handleUpdateProfileSettings(profileName: string, newSettings: ProfileSettings) {
    if (!gistData) return;
    const existing = gistData.profiles[profileName] || { ...EMPTY_PROFILE };
    const updated: GistData = {
      ...gistData,
      profiles: {
        ...gistData.profiles,
        [profileName]: { ...existing, settings: newSettings },
      },
      version: Date.now(),
    };
    setGistData(updated);
    if (activeProfile === profileName) setSettings(newSettings);
    writeDb(updated).catch(() => {});
  }

  function goTo(p: Page) {
    setPage(p);
    if (p !== 'entry') { setEditEntry(null); setPrefillCampaignId(null); }
  }

  function addCampaign(data: Omit<Campaign, 'id'>) {
    const cp: Campaign = { id: Date.now(), ...data };
    const updated = [cp, ...campaigns];
    setCampaigns(updated);
    syncDb(updated, entries, goals, gistData!, activeProfile!);
  }

  function deleteCampaign(id: number) {
    const newCampaigns = campaigns.filter(c => c.id !== id);
    const newEntries = entries.filter(e => e.campaignId !== id);
    setCampaigns(newCampaigns);
    setEntries(newEntries);
    syncDb(newCampaigns, newEntries, goals, gistData!, activeProfile!);
  }

  function handleSaveEntry(data: Omit<Entry, 'id'>, editId?: number) {
    let updated: Entry[];
    if (editId) {
      updated = entries.map(e => String(e.id) === String(editId) ? { ...e, ...data } : e);
      setEditEntry(null);
    } else {
      updated = [{ id: Date.now(), ...data }, ...entries];
    }
    setEntries(updated);
    syncDb(campaigns, updated, goals, gistData!, activeProfile!);

    showToast('ok', editId ? 'Jurnal berhasil diperbarui' : 'Jurnal berhasil disimpan');

    if (settings.telegramEnabled && settings.telegramBotToken && settings.telegramChatId && activeProfile) {
      const cp = campaigns.find(c => String(c.id) === String(data.campaignId));
      const msg = buildEntryMessage({ profileName: activeProfile, campaign: cp, entry: data, isEdit: !!editId, allEntries: updated });
      sendTelegram(msg, settings)
        .then(() => showToast('info', '📨 Alert Telegram terkirim'))
        .catch(err => showToast('err', '❌ Telegram gagal: ' + (err?.message || 'cek token/chat ID')));
    }
  }

  function handleDeleteEntry(id: number) {
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    syncDb(campaigns, updated, goals, gistData!, activeProfile!);
  }

  function handleEditEntry(e: Entry) {
    setEditEntry(e);
    goTo('entry');
  }

  function handleQuickCatat(cpId: number) {
    setEditEntry(null);
    setPrefillCampaignId(cpId);
    goTo('entry');
  }

  function handleSaveGoals(g: Goals) {
    setGoals(g);
    syncDb(campaigns, entries, g, gistData!, activeProfile!);
  }

  // Save entire GistData (used by global modal feature)
  function handleSaveGistData(updatedGist: GistData) {
    setGistData(updatedGist);
    // Sync active profile goals (per-akun or global cascade)
    if (activeProfile) {
      const updatedProfile = updatedGist.profiles[activeProfile];
      if (updatedProfile?.goals) {
        setGoals(updatedProfile.goals);
      }
    }
    setSyncStatus('syncing');
    writeDb(updatedGist)
      .then(() => { setSyncStatus('ok'); setTimeout(() => setSyncStatus('idle'), 2000); })
      .catch(() => { setSyncStatus('err'); setTimeout(() => setSyncStatus('idle'), 3000); });
    showToast('ok', 'Pengaturan modal tersimpan');
  }

  function handleSavePayouts(pos: Payout[]) {
    const oldMap = new Map(payouts.map(p => [p.id, p]));
    const alerts: { payout: Payout; kind: 'created-sukses' | 'pending-to-sukses' }[] = [];
    for (const p of pos) {
      const prev = oldMap.get(p.id);
      if (!prev && p.status === 'sukses') {
        alerts.push({ payout: p, kind: 'created-sukses' });
      } else if (prev && prev.status === 'pending' && p.status === 'sukses') {
        alerts.push({ payout: p, kind: 'pending-to-sukses' });
      }
    }
    setPayouts(pos);
    syncDb(campaigns, entries, goals, gistData!, activeProfile!, undefined, pos);
    showToast('ok', 'Payout tersimpan');

    if (alerts.length && settings.telegramEnabled && settings.telegramBotToken && settings.telegramChatId && activeProfile) {
      const totalSukses = pos.filter(p => p.status === 'sukses').reduce((s, p) => s + (p.amount || 0), 0);
      const totalPending = pos.filter(p => p.status === 'pending').reduce((s, p) => s + (p.amount || 0), 0);
      const countSukses = pos.filter(p => p.status === 'sukses').length;
      for (const a of alerts) {
        const msg = buildPayoutMessage({ profileName: activeProfile, payout: a.payout, kind: a.kind, totalSukses, totalPending, countSukses });
        sendTelegram(msg, settings)
          .then(ok => {
            if (ok) showToast('info', a.kind === 'pending-to-sukses' ? '📨 Alert "Payout Cair" terkirim' : '📨 Alert Payout terkirim');
            else showToast('err', '❌ Telegram gagal kirim');
          })
          .catch(err => showToast('err', '❌ Telegram gagal: ' + (err?.message || 'cek koneksi')));
      }
    }
  }

  function handleCancelEdit() {
    setEditEntry(null);
    setPrefillCampaignId(null);
    goTo('journal');
  }

  const navItems: { id: Page; label: string; icon: ReactNode }[] = [
    { id: 'dashboard', label: 'Dasbor', icon: <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg> },
    { id: 'campaigns', label: 'Campaign', icon: <svg viewBox="0 0 24 24"><path d="M3 3h18v4H3z"/><path d="M3 10h11v4H3z"/><path d="M3 17h7v4H3z"/><circle cx="19" cy="19" r="3"/><line x1="17" y1="19" x2="21" y2="19"/><line x1="19" y1="17" x2="19" y2="21"/></svg> },
    { id: 'entry', label: 'Catat', icon: <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> },
    { id: 'journal', label: 'Jurnal', icon: <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg> },
    { id: 'modal', label: 'Modal', icon: <svg viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><line x1="6" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="18" y2="12"/></svg> },
    { id: 'analytics', label: 'Analitik', icon: <svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
  ];

  if (!loggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  if (!activeProfile || !gistData) {
    return (
      <ProfileSelect
        username={username}
        gistData={gistData || { profiles: {}, version: 0 }}
        onSelect={handleSelectProfile}
        onLogout={handleLogout}
        onDeleteProfile={handleDeleteProfile}
        onUpdateSettings={handleUpdateProfileSettings}
        onSaveGistData={handleSaveGistData}
      />
    );
  }

  const profileColor = getProfileColor(activeProfile);

  return (
    <>
      <div className="topbar">
        <button className="topbar-profile-btn" onClick={handleBackToProfiles} title="Ganti akun">
          <div className="topbar-profile-avatar" style={{ background: profileColor + '22', color: profileColor, borderColor: profileColor + '55' }}>
            {activeProfile.slice(0, 2).toUpperCase()}
          </div>
          <div className="topbar-profile-info">
            <span className="topbar-profile-name">{activeProfile}</span>
            <span className="topbar-profile-switch">Ganti akun</span>
          </div>
        </button>
        <div className="topbar-right">
          <span className={`sync-pill ${syncStatus}`} title="Status sync GitHub Gist">
            {syncStatus === 'syncing' && <svg className="spin" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>}
            {syncStatus === 'ok' && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
            {syncStatus === 'err' && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
            {syncStatus === 'idle' && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>}
            <span className="sync-label">
              {syncStatus === 'syncing' ? 'Sync...' : syncStatus === 'ok' ? 'Tersimpan' : syncStatus === 'err' ? 'Gagal' : 'GitHub'}
            </span>
          </span>
          <span className="topbar-date">{formatDate()}</span>
        </div>
      </div>

      {page === 'dashboard' && <Dashboard campaigns={campaigns} entries={entries} goals={goals} payouts={payouts} settings={settings} modalNote={(() => {
        const gm = gistData?.globalModal;
        if (!gm?.enabled || !gm.amount || !activeProfile) return undefined;
        const others = Object.entries(gistData!.profiles)
          .filter(([n]) => n !== activeProfile)
          .map(([n, p]) => ({ name: n, spend: (p.entries || []).reduce((s, e) => s + (e.spend || 0), 0) }))
          .filter(o => o.spend > 0);
        if (others.length === 0) return `Saldo total ${fRp(gm.amount)}`;
        const parts = others.map(o => fRp(o.spend)).join(' − ');
        return `${fRp(gm.amount)} − ${parts}`;
      })()} onGoTo={goTo} />}
      {page === 'campaigns' && <Campaigns campaigns={campaigns} entries={entries} onAdd={addCampaign} onDelete={deleteCampaign} onQuickCatat={handleQuickCatat} />}
      {page === 'entry' && (
        <EntryForm campaigns={campaigns} editEntry={editEntry} prefillCampaignId={prefillCampaignId} onSave={handleSaveEntry} onCancel={handleCancelEdit} onGoToCampaigns={() => goTo('campaigns')} />
      )}
      {page === 'journal' && <Journal campaigns={campaigns} entries={entries} onEdit={handleEditEntry} onDelete={handleDeleteEntry} onQuickCatat={handleQuickCatat} onGoTo={goTo} />}
      {page === 'modal' && (
        <ModalAwalPage
          goals={goals}
          entries={entries}
          payouts={payouts}
          onSavePayouts={handleSavePayouts}
        />
      )}
      {page === 'analytics' && <Analytics campaigns={campaigns} entries={entries} goals={goals} />}

      <nav className="fnav">
        {navItems.map(item => (
          <button
            key={item.id}
            className={`fnav-item${item.id === 'modal' ? ' goals-nav' : ''}${page === item.id ? ' active' : ''}`}
            onClick={() => goTo(item.id)}
          >
            {item.icon}
            <span className="fnav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      {toast && (
        <div className={`app-toast ${toast.kind}`} onClick={() => setToast(null)}>
          {toast.msg}
        </div>
      )}
    </>
  );
}

const PROFILE_COLORS = ['#8b7cf8','#00d98b','#5b9ef9','#ffaa00','#ff4d6d','#38d9c0','#f97316','#a78bfa','#34d399','#60a5fa'];
function getProfileColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PROFILE_COLORS[Math.abs(hash) % PROFILE_COLORS.length];
}
