import { useState, useCallback, type ReactNode } from 'react';
import './index.css';
import {
  loadCampaigns, saveCampaigns, loadEntries, saveEntries, loadGoals, saveGoals,
  Campaign, Entry, Goals
} from './lib/storage';
import { formatDate } from './lib/helpers';
import { getAuth, getGhToken } from './lib/auth';
import { writeGist, findOrCreateGist } from './lib/github-db';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Campaigns from './components/Campaigns';
import EntryForm from './components/Entry';
import Journal from './components/Journal';
import GoalsPage from './components/Goals';
import Analytics from './components/Analytics';

type Page = 'dashboard' | 'campaigns' | 'entry' | 'journal' | 'goals' | 'analytics';

export default function App() {
  const [loggedIn, setLoggedIn] = useState<boolean>(() => {
    const auth = getAuth();
    const stored = sessionStorage.getItem('adj_session');
    return !!auth && stored === auth.username;
  });

  const [page, setPage] = useState<Page>('dashboard');
  const [campaigns, setCampaigns] = useState<Campaign[]>(loadCampaigns);
  const [entries, setEntries] = useState<Entry[]>(loadEntries);
  const [goals, setGoals] = useState<Goals>(loadGoals);
  const [editEntry, setEditEntry] = useState<Entry | null>(null);
  const [prefillCampaignId, setPrefillCampaignId] = useState<number | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'ok' | 'err'>('idle');

  const syncToGist = useCallback(async (
    cams: Campaign[], ents: Entry[], gls: Goals
  ) => {
    const token = getGhToken();
    if (!token) return;
    setSyncStatus('syncing');
    try {
      await writeGist({ campaigns: cams, entries: ents, goals: gls, version: Date.now() });
      setSyncStatus('ok');
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch {
      setSyncStatus('err');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  }, []);

  async function handleLogin() {
    const auth = getAuth();
    if (auth) sessionStorage.setItem('adj_session', auth.username);

    const token = getGhToken();
    if (token) {
      setSyncStatus('syncing');
      try {
        const local = { campaigns: loadCampaigns(), entries: loadEntries(), goals: loadGoals(), version: 0 };
        const data = await findOrCreateGist(local);
        if (data.version > 0) {
          setCampaigns(data.campaigns || []);
          setEntries(data.entries || []);
          setGoals(data.goals || local.goals);
          saveCampaigns(data.campaigns || []);
          saveEntries(data.entries || []);
          saveGoals(data.goals || local.goals);
        }
        setSyncStatus('ok');
        setTimeout(() => setSyncStatus('idle'), 2000);
      } catch {
        setSyncStatus('err');
        setTimeout(() => setSyncStatus('idle'), 3000);
      }
    }

    setLoggedIn(true);
  }

  function handleLogout() {
    sessionStorage.removeItem('adj_session');
    setLoggedIn(false);
  }

  function goTo(p: Page) {
    setPage(p);
    if (p !== 'entry') { setEditEntry(null); setPrefillCampaignId(null); }
  }

  function addCampaign(data: Omit<Campaign, 'id'>) {
    const cp: Campaign = { id: Date.now(), ...data };
    const updated = [cp, ...campaigns];
    setCampaigns(updated);
    saveCampaigns(updated);
    syncToGist(updated, entries, goals);
  }

  function deleteCampaign(id: number) {
    const newCampaigns = campaigns.filter(c => c.id !== id);
    const newEntries = entries.filter(e => e.campaignId !== id);
    setCampaigns(newCampaigns);
    setEntries(newEntries);
    saveCampaigns(newCampaigns);
    saveEntries(newEntries);
    syncToGist(newCampaigns, newEntries, goals);
  }

  function handleSaveEntry(data: Omit<Entry, 'id'>, editId?: number) {
    let updated: Entry[];
    if (editId) {
      updated = entries.map(e => String(e.id) === String(editId) ? { ...e, ...data } : e);
      setEditEntry(null);
    } else {
      const newEntry: Entry = { id: Date.now(), ...data };
      updated = [newEntry, ...entries];
    }
    setEntries(updated);
    saveEntries(updated);
    syncToGist(campaigns, updated, goals);
  }

  function handleDeleteEntry(id: number) {
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    saveEntries(updated);
    syncToGist(campaigns, updated, goals);
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
    saveGoals(g);
    syncToGist(campaigns, entries, g);
  }

  function handleCancelEdit() {
    setEditEntry(null);
    setPrefillCampaignId(null);
    goTo('journal');
  }

  const navItems: { id: Page; label: string; icon: ReactNode }[] = [
    {
      id: 'dashboard', label: 'Dasbor',
      icon: <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
    },
    {
      id: 'campaigns', label: 'Campaign',
      icon: <svg viewBox="0 0 24 24"><path d="M3 3h18v4H3z" /><path d="M3 10h11v4H3z" /><path d="M3 17h7v4H3z" /><circle cx="19" cy="19" r="3" /><line x1="17" y1="19" x2="21" y2="19" /><line x1="19" y1="17" x2="19" y2="21" /></svg>
    },
    {
      id: 'entry', label: 'Catat',
      icon: <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
    },
    {
      id: 'journal', label: 'Jurnal',
      icon: <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="13" y2="17" /></svg>
    },
    {
      id: 'goals', label: 'Goals',
      icon: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>
    },
    {
      id: 'analytics', label: 'Analitik',
      icon: <svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
    },
  ];

  if (!loggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  const auth = getAuth();
  const hasGh = !!getGhToken();

  return (
    <>
      <div className="topbar">
        <div className="brand">Ad<span>Journal</span></div>
        <div className="topbar-right">
          {hasGh && (
            <span className={`sync-pill ${syncStatus}`} title="Status sync GitHub Gist">
              {syncStatus === 'syncing' && (
                <svg className="spin" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 11-6.219-8.56" /></svg>
              )}
              {syncStatus === 'ok' && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
              )}
              {syncStatus === 'err' && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              )}
              {syncStatus === 'idle' && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" /></svg>
              )}
              <span className="sync-label">
                {syncStatus === 'syncing' ? 'Sync...' : syncStatus === 'ok' ? 'Tersimpan' : syncStatus === 'err' ? 'Gagal' : 'GitHub'}
              </span>
            </span>
          )}
          <span className="topbar-date">{formatDate()}</span>
          <button className="topbar-logout" onClick={handleLogout} title="Keluar">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
            <span className="topbar-logout-label">{auth?.username}</span>
          </button>
        </div>
      </div>

      {page === 'dashboard' && (
        <Dashboard campaigns={campaigns} entries={entries} goals={goals} onGoTo={goTo} />
      )}
      {page === 'campaigns' && (
        <Campaigns campaigns={campaigns} entries={entries} onAdd={addCampaign} onDelete={deleteCampaign} onQuickCatat={handleQuickCatat} />
      )}
      {page === 'entry' && (
        <EntryForm
          campaigns={campaigns}
          editEntry={editEntry}
          prefillCampaignId={prefillCampaignId}
          onSave={handleSaveEntry}
          onCancel={handleCancelEdit}
          onGoToCampaigns={() => goTo('campaigns')}
        />
      )}
      {page === 'journal' && (
        <Journal campaigns={campaigns} entries={entries} onEdit={handleEditEntry} onDelete={handleDeleteEntry} onQuickCatat={handleQuickCatat} onGoTo={goTo} />
      )}
      {page === 'goals' && (
        <GoalsPage goals={goals} entries={entries} onSave={handleSaveGoals} />
      )}
      {page === 'analytics' && (
        <Analytics campaigns={campaigns} entries={entries} goals={goals} />
      )}

      <nav className="fnav">
        {navItems.map(item => (
          <button
            key={item.id}
            className={`fnav-item${item.id === 'goals' ? ' goals-nav' : ''}${page === item.id ? ' active' : ''}`}
            onClick={() => goTo(item.id)}
          >
            {item.icon}
            <span className="fnav-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
