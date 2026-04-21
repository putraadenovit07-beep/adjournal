import { Campaign, Entry, Goals } from '../lib/storage';
import { fRp, todayStr } from '../lib/helpers';

interface Props {
  campaigns: Campaign[];
  entries: Entry[];
  goals: Goals;
}

function addDaysIso(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function calcProjection(entries: Entry[], modal: number, currentNet: number) {
  const today = todayStr();
  const cutoff = addDaysIso(today, -7);
  const recent = entries.filter(e => e.date >= cutoff && e.date <= today);
  const recentProfit = recent.reduce((s, e) => s + ((e.revenue || 0) - (e.spend || 0)), 0);

  // Determine number of distinct days
  const days = new Set(recent.map(e => e.date)).size || 1;
  const avgDailyProfit = recentProfit / days;
  const sisa = Math.max(0, modal - currentNet);

  if (avgDailyProfit <= 0 || sisa === 0) {
    return {
      avgDailyProfit,
      sisa,
      daysToBEP: null as number | null,
      etaDate: null as string | null,
      done: sisa === 0 && modal > 0,
      noTrend: avgDailyProfit <= 0 && sisa > 0,
      sampleDays: days,
    };
  }
  const daysToBEP = Math.ceil(sisa / avgDailyProfit);
  const etaDate = addDaysIso(today, daysToBEP);
  return { avgDailyProfit, sisa, daysToBEP, etaDate, done: false, noTrend: false, sampleDays: days };
}

function fmtIDDate(iso: string): string {
  const d = new Date(iso);
  const mn = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  return `${d.getDate()} ${mn[d.getMonth()]} ${d.getFullYear()}`;
}

export default function Analytics({ campaigns, entries, goals }: Props) {
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
  const netProfit = totalRevenue - totalSpend;

  const modalNum = goals.modal || 0;
  const sisaBEP = Math.max(0, modalNum - netProfit);
  const pctBalik = modalNum > 0 ? Math.min(100, Math.max(0, (netProfit / modalNum) * 100)) : 0;
  const sudahBalik = modalNum > 0 && netProfit >= modalNum;

  const proj = calcProjection(entries, modalNum, netProfit);

  const notesEntries = entries.filter(e => e.note);

  return (
    <div className="page">
      <div className="ph"><h1>Analitik</h1><p>Performa, balik modal & proyeksi</p></div>

      {/* Tracker Balik Modal + Proyeksi - PRETTY ADSENSE STYLE */}
      {modalNum > 0 ? (
        <div className="bep-card">
          <div className="bep-header">
            <div>
              <div className="bep-title">Tracker Balik Modal</div>
              <div className="bep-subtitle">{sudahBalik ? '🎉 Modal sudah balik!' : 'Progress menuju Break Even Point'}</div>
            </div>
            <div className={`bep-status ${sudahBalik ? 'done' : 'progress'}`}>
              {sudahBalik ? '✓ BEP Tercapai' : `${pctBalik.toFixed(1)}%`}
            </div>
          </div>

          {/* Big metrics row */}
          <div className="bep-metrics">
            <div className="bep-metric">
              <div className="bep-metric-label">Modal Awal</div>
              <div className="bep-metric-val" style={{ color: 'var(--p)' }}>{fRp(modalNum)}</div>
            </div>
            <div className="bep-metric-sep" />
            <div className="bep-metric">
              <div className="bep-metric-label">Profit Bersih</div>
              <div className="bep-metric-val" style={{ color: netProfit >= 0 ? 'var(--g)' : 'var(--r)' }}>
                {netProfit >= 0 ? '+' : ''}{fRp(netProfit)}
              </div>
            </div>
            <div className="bep-metric-sep" />
            <div className="bep-metric">
              <div className="bep-metric-label">{sudahBalik ? 'Lebihan' : 'Sisa untuk BEP'}</div>
              <div className="bep-metric-val" style={{ color: sudahBalik ? 'var(--g)' : 'var(--a)' }}>
                {sudahBalik ? '+' + fRp(netProfit - modalNum) : fRp(sisaBEP)}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="bep-progress-wrap">
            <div className="bep-progress-track">
              <div className="bep-progress-fill" style={{
                width: `${pctBalik}%`,
                background: sudahBalik ? 'linear-gradient(90deg, var(--g), var(--tc))' : 'linear-gradient(90deg, var(--p), #b8acff)'
              }} />
            </div>
            <div className="bep-progress-labels">
              <span>0</span>
              <span style={{ color: 'var(--t1)', fontWeight: 600 }}>{pctBalik.toFixed(1)}% balik modal</span>
              <span>{fRp(modalNum)}</span>
            </div>
          </div>

          {/* Projection sub-section */}
          <div className="bep-projection">
            <div className="bep-proj-header">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
              <span>Proyeksi Balik Modal</span>
              <span className="bep-proj-tag">Berdasarkan rata-rata 7 hari ({proj.sampleDays} hari aktif)</span>
            </div>
            <div className="bep-proj-body">
              {proj.done ? (
                <div className="bep-proj-done">
                  ✓ Modal sudah balik. Selamat! 🎉
                </div>
              ) : proj.noTrend ? (
                <div className="bep-proj-warn">
                  ⚠ Belum bisa diproyeksikan — profit harian rata-rata masih ≤ 0.
                  <br/><span style={{ fontSize: 11, color: 'var(--t3)' }}>Tingkatkan profit harian dulu agar BEP bisa dihitung.</span>
                </div>
              ) : (
                <div className="bep-proj-grid">
                  <div className="bep-proj-item highlight">
                    <div className="bep-proj-label">Estimasi Balik Modal</div>
                    <div className="bep-proj-big">{proj.daysToBEP} hari lagi</div>
                    <div className="bep-proj-sub">≈ {fmtIDDate(proj.etaDate!)}</div>
                  </div>
                  <div className="bep-proj-item">
                    <div className="bep-proj-label">Profit Harian (rata-rata)</div>
                    <div className="bep-proj-big" style={{ color: 'var(--g)' }}>{fRp(proj.avgDailyProfit)}</div>
                    <div className="bep-proj-sub">Per hari aktif terakhir</div>
                  </div>
                  <div className="bep-proj-item">
                    <div className="bep-proj-label">Sisa Target</div>
                    <div className="bep-proj-big" style={{ color: 'var(--a)' }}>{fRp(proj.sisa)}</div>
                    <div className="bep-proj-sub">Untuk capai BEP</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="card-b">
            <div className="empty">
              💡 Belum ada modal awal. Atur dulu di menu <strong style={{ color: 'var(--p)' }}>Modal</strong> untuk lihat tracker & proyeksi balik modal.
            </div>
          </div>
        </div>
      )}

      <div className="two-col">
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
