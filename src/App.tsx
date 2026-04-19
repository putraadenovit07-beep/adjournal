import { useState, useEffect } from 'react';
import './index.css';
import {
  loadCampaigns, saveCampaigns, loadEntries, saveEntries, loadGoals, saveGoals,
  Campaign, Entry, Goals
} from './lib/storage';
import { formatDate, todayStr } from './lib/helpers';
import Dashboard from './components/Dashboard';
import Campaigns from './components/Campaigns';
import EntryForm from './components/Entry';
import Journal from './components/Journal';
import GoalsPage from './components/Goals';
import Analytics from './components/Analytics';

type Page = 'dashboard' | 'campaigns' | 'entry' | 'journal' | 'goals' | 'analytics';

export default function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const [campaigns, setCampaigns] = useState<Campaign[]>(loadCampaigns);
  const [entries, setEntries] = useState<Entry[]>(loadEntries);
  const [goals, setGoals] = useState<Goals>(loadGoals);
  const [editEntry, setEditEntry] = useState<Entry | null>(null);
  const [prefillCampaignId, setPrefillCampaignId] = useState<number | null>(null);

  function goTo(p: Page) {
    setPage(p);
    if (p !== 'entry') { setEditEntry(null); setPrefillCampaignId(null); }
  }

  function addCampaign(data: Omit<Campaign, 'id'>) {
    const cp: Campaign = { id: Date.now(), ...data };
    const updated = [cp, ...campaigns];
    setCampaigns(updated);
    saveCampaigns(updated);
  }

  function deleteCampaign(id: number) {
    const newCampaigns = campaigns.filter(c => c.id !== id);
    const newEntries = entries.filter(e => e.campaignId !== id);
    setCampaigns(newCampaigns);
    setEntries(newEntries);
    saveCampaigns(newCampaigns);
    saveEntries(newEntries);
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
  }

  function handleDeleteEntry(id: number) {
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    saveEntries(updated);
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
  }

  function handleCancelEdit() {
    setEditEntry(null);
    setPrefillCampaignId(null);
    goTo('journal');
  }

  const navItems: { id: Page; label: string; icon: React.ReactNode }[] = [
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

  return (
    <>
      <div className="topbar">
        <div className="brand">Ad<span>Journal</span></div>
        <div className="topbar-info">{formatDate()}</div>
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
