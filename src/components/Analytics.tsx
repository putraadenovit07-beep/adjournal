import { Campaign, Entry, Goals } from '../lib/storage';
import { fRp, fN, calcProfit, calcROI } from '../lib/helpers';

interface Props {
  campaigns: Campaign[];
  entries: Entry[];
  goals: Goals;
}

export default function Analytics({ campaigns, entries, goals }: Props) {
  // Per-campaign stats
  const cpStats = campaigns.map(cp => {
    const cpEntries = entries.filter(e => String(e.campaignId) === String(cp.id));
    const spend = cpEntries.reduce((s, e) => s + (e.spend || 0), 0);
    const revenue = cpEntries.reduce((s, e) => s + (e.revenue || 0), 0);
    const clicks = cpEntries.reduce((s, e) => s + (e.adclicks || 0), 0);
    const profit = revenue - spend;
    const roi = spend > 0 ? (profit / spend) * 100 : 0;
    return { ...cp, spend, revenue, clicks, profit, roi };
  }).filter(cp => cp.spend > 0 || cp.revenue > 0);

  const sortedByRoi = [...cpStats].sort((a, b) => b.roi - a.roi);
  const sortedByRev = [...cpStats].sort((a, b) => b.revenue - a.revenue);

  const maxRoi = Math.max(...sortedByRoi.map(c => Math.abs(c.roi)), 1);
  const maxRev = Math.max(...sortedByRev.map(c => c.revenue), 1);

  const totalSpend = entries.reduce((s, e) => s + (e.spend || 0), 0);
  const totalRevenue = entries.reduce((s, e) => s + (e.revenue || 0), 0);
  const totalClicks = entries.reduce((s, e) => s + (e.adclicks || 0), 0);
  const totalImpressions = entries.reduce((s, e) => s + (e.impressions || 0), 0);
  const netProfit = totalRevenue - totalSpend;
  const roiOverall = totalSpend > 0 ? (netProfit / totalSpend) * 100 : 0;

  const notesEntries = entries.filter(e => e.note);

  return (
    <div className="page">
      <div className="ph"><h1>Analitik</h1><p>Performa dan breakdown keuangan keseluruhan</p></div>

      {/* Overall Stats */}
      <div className="sg4" style={{ marginBottom: 14 }}>
        <div className="sc">
          <div className="sc-accent" style={{ background: 'var(--r)' }} />
          <div className="sc-label">Total Spend</div>
          <div className="sc-val cr">{fRp(totalSpend)}</div>
          <div className="sc-sub">{campaigns.length} kampanye</div>
        </div>
        <div className="sc">
          <div className="sc-accent" style={{ background: 'var(--g)' }} />
          <div className="sc-label">Total Revenue</div>
          <div className="sc-val cg">{fRp(totalRevenue)}</div>
          <div className="sc-sub">{entries.length} entri</div>
        </div>
        <div className="sc">
          <div className="sc-accent" style={{ background: 'var(--b)' }} />
          <div className="sc-label">Total Klik</div>
          <div className="sc-val cb">{fN(totalClicks)}</div>
          <div className="sc-sub">{fN(totalImpressions)} tayangan</div>
        </div>
        <div className="sc">
          <div className="sc-accent" style={{ background: 'var(--p)' }} />
          <div className="sc-label">ROI Keseluruhan</div>
          <div className="sc-val" style={{ color: roiOverall >= 0 ? 'var(--g)' : 'var(--r)' }}>{roiOverall.toFixed(2)}%</div>
          <div className="sc-sub">Net: {fRp(netProfit)}</div>
        </div>
      </div>

      {/* Goals balik modal */}
      {goals.modal > 0 && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="card-h">
            <span className="card-h-title">Goals &amp; Balik Modal</span>
            <span className="card-h-tag" style={{ color: totalRevenue >= goals.modal ? 'var(--g)' : 'var(--a)' }}>
              {totalRevenue >= goals.modal ? '✓ Balik Modal' : 'Belum Balik Modal'}
            </span>
          </div>
          <div className="card-b">
            <div className="modal-bar">
              <div className="modal-bar-item">
                <span className="modal-bar-label">Modal Awal</span>
                <span className="modal-bar-val cr">{fRp(goals.modal)}</span>
              </div>
              <div className="modal-bar-item">
                <span className="modal-bar-label">Total Penghasilan</span>
                <span className="modal-bar-val cg">{fRp(totalRevenue)}</span>
              </div>
              <div className="modal-bar-item">
                <span className="modal-bar-label">{totalRevenue >= goals.modal ? 'Untung' : 'Sisa Kurang'}</span>
                <span className="modal-bar-val" style={{ color: totalRevenue >= goals.modal ? 'var(--g)' : 'var(--r)' }}>
                  {fRp(Math.abs(totalRevenue - goals.modal))}
                </span>
              </div>
            </div>
            {goals.modal > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'var(--g)', borderRadius: 4, width: `${Math.min(100, (totalRevenue / goals.modal) * 100)}%`, transition: 'width 0.7s' }} />
                </div>
                <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 4, fontFamily: 'JetBrains Mono, monospace' }}>
                  {Math.min(100, ((totalRevenue / goals.modal) * 100)).toFixed(1)}% dari target balik modal
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="two-col">
        {/* Top ROI */}
        <div className="card">
          <div className="card-h"><span className="card-h-title">Top ROI per Campaign</span></div>
          <div className="card-b">
            {sortedByRoi.length === 0 ? <div className="empty">Belum ada data</div> : (
              <div className="chart-list">
                {sortedByRoi.slice(0, 8).map(cp => (
                  <div key={cp.id} className="chart-row">
                    <span className="chart-label" title={cp.name}>{cp.name}</span>
                    <div className="chart-track">
                      <div className="chart-fill" style={{
                        width: `${(Math.abs(cp.roi) / maxRoi) * 100}%`,
                        background: cp.roi >= 0 ? 'var(--g)' : 'var(--r)'
                      }} />
                    </div>
                    <span className="chart-num" style={{ color: cp.roi >= 0 ? 'var(--g)' : 'var(--r)' }}>
                      {cp.roi >= 0 ? '+' : ''}{cp.roi.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top Revenue */}
        <div className="card">
          <div className="card-h"><span className="card-h-title">Top Penghasilan</span></div>
          <div className="card-b">
            {sortedByRev.length === 0 ? <div className="empty">Belum ada data</div> : (
              <div className="chart-list">
                {sortedByRev.slice(0, 8).map(cp => (
                  <div key={cp.id} className="chart-row">
                    <span className="chart-label" title={cp.name}>{cp.name}</span>
                    <div className="chart-track">
                      <div className="chart-fill" style={{ width: `${(cp.revenue / maxRev) * 100}%`, background: 'var(--g)' }} />
                    </div>
                    <span className="chart-num cg">{fRp(cp.revenue)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notes */}
      {notesEntries.length > 0 && (
        <div className="card">
          <div className="card-h"><span className="card-h-title">Catatan Terbaru</span><span className="card-h-tag">{notesEntries.length} catatan</span></div>
          <div className="card-b">
            {notesEntries.slice(0, 10).map(e => {
              const cp = campaigns.find(c => c.id === e.campaignId);
              return (
                <div key={e.id} style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--p)', fontWeight: 600 }}>{cp?.name || 'Tanpa Campaign'}</span>
                    <span style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'JetBrains Mono, monospace' }}>{e.date}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--t2)' }}>📝 {e.note}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
