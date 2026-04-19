import { useState } from 'react';
import { Campaign, Entry } from '../lib/storage';
import { fRp, fN, calcProfit, calcROI } from '../lib/helpers';

interface Props {
  campaigns: Campaign[];
  entries: Entry[];
  onEdit: (e: Entry) => void;
  onDelete: (id: number) => void;
  onQuickCatat: (id: number) => void;
  onGoTo: (page: string) => void;
}

export default function Journal({ campaigns, entries, onEdit, onDelete, onQuickCatat, onGoTo }: Props) {
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

  function toggle(cpId: string) {
    setOpenMap(prev => ({ ...prev, [cpId]: !prev[cpId] }));
  }

  const grouped: Record<string, Entry[]> = {};
  campaigns.forEach(cp => { grouped[String(cp.id)] = []; });
  entries.forEach(e => {
    const cid = String(e.campaignId || 'orphan');
    if (!grouped[cid]) grouped[cid] = [];
    grouped[cid].push(e);
  });

  if (!campaigns.length && !entries.length) {
    return (
      <div className="page">
        <div className="ph"><h1>Jurnal</h1><p>Klik nama campaign untuk lihat semua entri per tanggal</p></div>
        <div className="empty" style={{ padding: '60px 20px' }}>Belum ada data. Buat campaign dan mulai catat!</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="ph"><h1>Jurnal</h1><p>Klik nama campaign untuk lihat semua entri per tanggal</p></div>

      {campaigns.map(cp => {
        const cpEntries = grouped[String(cp.id)] || [];
        const tRev = cpEntries.reduce((s, e) => s + (e.revenue || 0), 0);
        const tSpend = cpEntries.reduce((s, e) => s + (e.spend || 0), 0);
        const profit = tRev - tSpend;
        const roi = tSpend > 0 ? (profit / tSpend * 100) : 0;
        const isOpen = !!openMap[String(cp.id)];
        const colorDot = profit >= 0 ? 'var(--g)' : 'var(--r)';

        return (
          <div key={cp.id} className="j-cp-group">
            <div className="j-cp-header" onClick={() => toggle(String(cp.id))}>
              <div className="j-cp-header-left">
                <div className="j-cp-dot" style={{ background: colorDot }} />
                <div>
                  <div className="j-cp-title">{cp.name}</div>
                  {cp.platform && <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 1 }}>{cp.platform}{cp.startdate ? ` · Start ${cp.startdate}` : ''}</div>}
                </div>
              </div>
              <div className="j-cp-right">
                <div className="j-cp-stats">
                  <span className={`j-cp-stat ${profit >= 0 ? 'green' : 'red'}`}>{profit >= 0 ? '+' : ''}{fRp(profit)}</span>
                  <span className="j-cp-stat">ROI {roi > 0 ? '+' : ''}{roi.toFixed(1)}%</span>
                </div>
                <span className="j-cp-entries">{cpEntries.length} entri</span>
                <div className="chev" style={{ border: 'none' }}>
                  <svg viewBox="0 0 24 24" style={{ width: 12, height: 12, stroke: 'var(--t3)', fill: 'none', strokeWidth: 2, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.28s' }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="j-cp-body" style={{ maxHeight: isOpen ? 2000 : 0 }}>
              {cpEntries.length === 0 ? (
                <div style={{ padding: '16px 18px', borderTop: '1px solid var(--brd)', textAlign: 'center', color: 'var(--t3)', fontSize: 12 }}>
                  Belum ada entri.{' '}
                  <span style={{ color: 'var(--p)', cursor: 'pointer' }} onClick={() => onQuickCatat(cp.id)}>Catat sekarang →</span>
                </div>
              ) : (
                <div className="tw" style={{ borderTop: '1px solid var(--brd)' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Tanggal</th>
                        <th className="th-ads">Spend ADS</th>
                        <th className="th-ads">Klik ADS</th>
                        <th className="th-adsense">Tayangan</th>
                        <th className="th-adsense">Penghasilan</th>
                        <th>Profit</th>
                        <th>ROI</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...cpEntries].sort((a, b) => b.date.localeCompare(a.date)).map(e => {
                        const pr = calcProfit(e);
                        const ri = calcROI(e);
                        const rc = ri > 0 ? 'bdg-g' : ri < 0 ? 'bdg-r' : 'bdg-a';
                        const pc = pr >= 0 ? 'var(--g)' : 'var(--r)';
                        return [
                          <tr key={e.id}>
                            <td className="td-m">{e.date}</td>
                            <td className="td-m" style={{ color: 'var(--r)' }}>{fRp(e.spend)}</td>
                            <td className="td-m">{fN(e.adclicks)}</td>
                            <td className="td-m">{fN(e.impressions)}</td>
                            <td className="td-m" style={{ color: 'var(--g)' }}>{fRp(e.revenue)}</td>
                            <td className="td-m" style={{ color: pc }}>{pr >= 0 ? '+' : ''}{fRp(pr)}</td>
                            <td><span className={`badge ${rc}`}>{ri > 0 ? '+' : ''}{ri.toFixed(2)}%</span></td>
                            <td>
                              <div className="acts">
                                <button className="btn-e" onClick={() => onEdit(e)}>Edit</button>
                                <button className="btn-d" onClick={() => { if (confirm('Yakin hapus data ini?')) onDelete(e.id); }}>Hapus</button>
                              </div>
                            </td>
                          </tr>,
                          e.note ? (
                            <tr key={`note-${e.id}`}>
                              <td colSpan={8} style={{ padding: '6px 14px 10px', color: 'var(--t3)', fontSize: 11, whiteSpace: 'normal', background: 'rgba(255,255,255,0.01)' }}>
                                📝 {e.note}
                              </td>
                            </tr>
                          ) : null
                        ];
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {grouped['orphan'] && grouped['orphan'].length > 0 && (
        <div className="j-cp-group" style={{ borderColor: 'rgba(255,77,109,0.2)' }}>
          <div className="j-cp-header" style={{ background: 'rgba(255,77,109,0.04)' }} onClick={() => toggle('orphan')}>
            <div className="j-cp-header-left">
              <div className="j-cp-dot" style={{ background: 'var(--r)' }} />
              <div>
                <div className="j-cp-title" style={{ color: 'var(--r)' }}>Entri Tanpa Campaign</div>
                <div style={{ fontSize: 10, color: 'var(--t3)' }}>Campaign sudah dihapus</div>
              </div>
            </div>
            <div className="j-cp-right">
              <span className="j-cp-entries">{grouped['orphan'].length} entri</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
