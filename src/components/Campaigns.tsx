import { useState } from 'react';
import { Campaign, Entry } from '../lib/storage';
import { fRp, todayStr } from '../lib/helpers';

interface Props {
  campaigns: Campaign[];
  entries: Entry[];
  onAdd: (cp: Omit<Campaign, 'id'>) => void;
  onDelete: (id: number) => void;
  onQuickCatat: (id: number) => void;
}

export default function Campaigns({ campaigns, entries, onAdd, onDelete, onQuickCatat }: Props) {
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState('');
  const [startdate, setStartdate] = useState(todayStr());
  const [desc, setDesc] = useState('');
  const [msg, setMsg] = useState('');

  function handleCreate() {
    if (!name.trim()) { alert('Nama campaign wajib diisi!'); return; }
    onAdd({ name: name.trim(), platform, startdate, desc });
    setName(''); setPlatform(''); setDesc(''); setStartdate(todayStr());
    setMsg('Campaign berhasil dibuat!');
    setTimeout(() => setMsg(''), 3000);
  }

  return (
    <div className="page">
      <div className="ph">
        <h1>Kelola Campaign</h1>
        <p>Buat campaign dulu sebelum mencatat data harian</p>
      </div>

      <div className="card">
        <div className="card-h"><span className="card-h-title">Buat Campaign Baru</span></div>
        <div className="card-b">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, alignItems: 'end' }}>
            <div className="fg">
              <label>Nama Campaign</label>
              <input type="text" placeholder="Contoh: FB Ads — Blog Tech" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="fg">
              <label>Platform</label>
              <select value={platform} onChange={e => setPlatform(e.target.value)}>
                <option value="">Pilih platform</option>
                <option value="Facebook Ads">Facebook Ads</option>
                <option value="Google Ads">Google Ads</option>
                <option value="TikTok Ads">TikTok Ads</option>
                <option value="Instagram Ads">Instagram Ads</option>
                <option value="Twitter Ads">Twitter Ads</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>
            <div className="fg">
              <label>Tanggal Mulai</label>
              <input type="date" value={startdate} onChange={e => setStartdate(e.target.value)} />
            </div>
          </div>
          <div className="fg" style={{ marginTop: 14 }}>
            <label>Deskripsi (opsional)</label>
            <input type="text" placeholder="Contoh: Traffic ke blog teknologi, target CPC Rp 150" value={desc} onChange={e => setDesc(e.target.value)} />
          </div>
          <div className="btn-row">
            <button className="btn-primary" onClick={handleCreate}>
              <svg style={{ width: 14, height: 14, stroke: '#fff', fill: 'none', strokeWidth: 2 }} viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Buat Campaign
            </button>
          </div>
          {msg && <div className="msg msg-ok">{msg}</div>}
        </div>
      </div>

      <div className="card">
        <div className="card-h">
          <span className="card-h-title">Daftar Campaign</span>
          <span className="card-h-tag">{campaigns.length} campaign</span>
        </div>
        <div className="card-b">
          {campaigns.length === 0 ? (
            <div className="empty">Belum ada campaign. Buat di atas!</div>
          ) : (
            campaigns.map(cp => {
              const cpEntries = entries.filter(e => String(e.campaignId) === String(cp.id));
              const totalRev = cpEntries.reduce((s, e) => s + (e.revenue || 0), 0);
              const totalSpend = cpEntries.reduce((s, e) => s + (e.spend || 0), 0);
              const profit = totalRev - totalSpend;
              return (
                <div key={cp.id} className="cp-item">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                      <span className="cp-name">{cp.name}</span>
                      {cp.platform && (
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 100, background: 'var(--p2)', color: 'var(--p)', border: '1px solid rgba(139,124,248,0.2)' }}>
                          {cp.platform}
                        </span>
                      )}
                    </div>
                    {cp.desc && <div className="cp-meta">{cp.desc}</div>}
                    <div className="cp-meta" style={{ marginTop: 4 }}>
                      {cp.startdate ? `Start: ${cp.startdate} · ` : ''}{cpEntries.length} entri · Profit:{' '}
                      <span style={{ color: profit >= 0 ? 'var(--g)' : 'var(--r)' }}>{fRp(profit)}</span>
                    </div>
                  </div>
                  <div className="cp-actions">
                    <button className="btn-e" onClick={() => onQuickCatat(cp.id)}>+ Catat</button>
                    <button className="btn-d" onClick={() => {
                      const msg2 = `Hapus campaign "${cp.name}"?${cpEntries.length > 0 ? ` (${cpEntries.length} entri data ikut terhapus!)` : ''}`;
                      if (confirm(msg2)) onDelete(cp.id);
                    }}>Hapus</button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
