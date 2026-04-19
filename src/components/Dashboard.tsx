import { Campaign, Entry, Goals } from '../lib/storage';
import { fRp, fN, calcProfit, calcROI, getMilestoneInfo, todayStr } from '../lib/helpers';

interface Props {
  campaigns: Campaign[];
  entries: Entry[];
  goals: Goals;
  onGoTo: (page: string) => void;
}

export default function Dashboard({ campaigns, entries, goals, onGoTo }: Props) {
  const totalSpend = entries.reduce((s, e) => s + (e.spend || 0), 0);
  const totalRevenue = entries.reduce((s, e) => s + (e.revenue || 0), 0);
  const netProfit = totalRevenue - totalSpend;
  const roi = totalSpend > 0 ? (netProfit / totalSpend) * 100 : 0;
  const today = todayStr();

  const ms = (goals.milestones || []).filter(m => m.clicks > 0 && m.days > 0);

  const roiColor = roi > 0 ? 'var(--g)' : roi < 0 ? 'var(--r)' : 'var(--t1)';
  const netColor = netProfit > 0 ? 'var(--g)' : netProfit < 0 ? 'var(--r)' : 'var(--t1)';

  const recentCampaigns = campaigns.slice(0, 5).map(cp => {
    const cpEntries = entries.filter(e => String(e.campaignId) === String(cp.id));
    const rev = cpEntries.reduce((s, e) => s + (e.revenue || 0), 0);
    const spend = cpEntries.reduce((s, e) => s + (e.spend || 0), 0);
    const profit = rev - spend;
    return { ...cp, profit, entries: cpEntries.length };
  });

  return (
    <div className="page">
      <div className="ph">
        <h1>Dashboard</h1>
        <p>Ringkasan performa paid traffic &amp; Adsense</p>
      </div>

      <div className="sg4">
        <div className="sc">
          <div className="sc-accent" style={{ background: 'var(--r)' }} />
          <div className="sc-label">Total Spend</div>
          <div className="sc-val cr">{fRp(totalSpend)}</div>
          <div className="sc-sub">Total biaya iklan</div>
        </div>
        <div className="sc">
          <div className="sc-accent" style={{ background: 'var(--g)' }} />
          <div className="sc-label">Penghasilan</div>
          <div className="sc-val cg">{fRp(totalRevenue)}</div>
          <div className="sc-sub">Total Penghasilan Adsense</div>
        </div>
        <div className="sc">
          <div className="sc-accent" style={{ background: 'var(--tc)' }} />
          <div className="sc-label">Profit Bersih</div>
          <div className="sc-val" style={{ color: netColor }}>{fRp(netProfit)}</div>
          <div className="sc-sub">Penghasilan − Spend</div>
        </div>
        <div className="sc">
          <div className="sc-accent" style={{ background: 'var(--p)' }} />
          <div className="sc-label">ROI</div>
          <div className="sc-val" style={{ color: roiColor }}>{roi.toFixed(2)}%</div>
          <div className="sc-sub">Profit ÷ Spend × 100</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap' }}>
        {/* Milestone Card */}
        <div className="d-ms-card" style={{ flex: ms.length > 3 ? '0 0 100%' : 1, minWidth: 0 }}>
          <div className="d-ms-card-h">
            <div className="d-ms-card-title">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>
              Progress Milestone
            </div>
            {ms.length > 0 && goals.start ? (
              <span className="card-h-tag">
                {(() => {
                  const activeIdx = ms.findIndex((m, i) => getMilestoneInfo(m, i, ms, goals.start, today).status === 'active');
                  if (activeIdx >= 0) return `Milestone ${activeIdx + 1} Aktif`;
                  if (ms.every((m, i) => getMilestoneInfo(m, i, ms, goals.start, today).status === 'done')) return 'Semua Selesai ✓';
                  return 'Belum Mulai';
                })()}
              </span>
            ) : <span className="card-h-tag">—</span>}
          </div>
          {!ms.length || !goals.start ? (
            <div className="d-ms-empty">
              Belum ada goals milestone.{' '}
              <span onClick={() => onGoTo('goals')}>Set goals dulu →</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: ms.length <= 3 ? 'wrap' : 'nowrap', gap: 12, padding: '16px 20px', overflowX: ms.length > 3 ? 'auto' : 'visible' }}>
              {ms.map((m, idx) => {
                const info = getMilestoneInfo(m, idx, ms, goals.start, today);
                const stCls = info.status === 'active' ? 'active-st' : info.status === 'done' ? 'done-st' : 'upcoming-st';
                const stTxt = info.status === 'active' ? '● Aktif' : info.status === 'done' ? '✓ Selesai' : 'Segera';
                const colCls = `d-ms-col${info.status === 'active' ? ' active-col' : info.status === 'done' ? ' done-col' : ''}`;
                const labelColor = info.status === 'active' ? 'var(--g)' : info.status === 'done' ? 'var(--tc)' : 'var(--p)';
                const fillColor = info.status === 'active' ? 'var(--g)' : info.status === 'done' ? 'var(--tc)' : 'rgba(139,124,248,0.4)';
                const colW = ms.length <= 2 ? 'calc(50% - 6px)' : ms.length === 3 ? 'calc(33.33% - 8px)' : '200px';
                const msEntries = entries.filter(e => {
                  if (!info.startDate || !info.endDate) return false;
                  return e.date >= info.startDate && e.date <= info.endDate;
                });
                const actualClicks = msEntries.reduce((s, e) => s + (e.adclicks || 0), 0);
                const actualImpressions = msEntries.reduce((s, e) => s + (e.impressions || 0), 0);
                const actualRevenue = msEntries.reduce((s, e) => s + (e.revenue || 0), 0);

                return (
                  <div key={idx} className={colCls} style={{ flex: `0 0 ${colW}`, minWidth: 0 }}>
                    <div className="d-ms-col-h">
                      <span className="d-ms-col-label" style={{ color: labelColor }}>Milestone {idx + 1}</span>
                      <span className={`d-ms-col-st ${stCls}`}>{stTxt}</span>
                    </div>
                    <div className="d-ms-col-b">
                      <div className="d-ms-metric">
                        <span className="d-ms-metric-label">Total Klik ADS</span>
                        <span className="d-ms-metric-val" style={{ color: 'var(--b)' }}>{fN(actualClicks)}</span>
                        <span className="d-ms-metric-sub">Target: {fN(m.clicks)} klik / hari</span>
                      </div>
                      <div className="d-ms-divider" />
                      <div className="d-ms-metric">
                        <span className="d-ms-metric-label">Tayangan Adsense</span>
                        <span className="d-ms-metric-val" style={{ color: 'var(--a)' }}>{fN(actualImpressions)}</span>
                        <span className="d-ms-metric-sub">Dalam {m.days} hari</span>
                      </div>
                      <div className="d-ms-divider" />
                      <div className="d-ms-metric">
                        <span className="d-ms-metric-label">Penghasilan Adsense</span>
                        <span className="d-ms-metric-val" style={{ color: 'var(--g)' }}>{fRp(actualRevenue)}</span>
                        <span className="d-ms-metric-sub">
                          {info.status === 'active' && info.daysLeft ? `Sisa ${info.daysLeft} hari` :
                            info.status === 'done' ? 'Selesai' :
                              info.daysUntilStart != null ? `Mulai ${info.daysUntilStart} hari lagi` : '—'}
                        </span>
                      </div>
                      <div className="d-ms-divider" />
                      <div>
                        <div className="d-ms-prog-track">
                          <div className="d-ms-prog-fill" style={{ width: `${info.pct}%`, background: fillColor }} />
                        </div>
                        <div className="d-ms-prog-row">
                          <span className="d-ms-prog-txt">{info.pct}% waktu berlalu</span>
                          <span className="d-ms-prog-txt">
                            {info.status === 'done' ? `${m.days}/${m.days}` : info.status === 'active' ? `${info.daysPassed}/${m.days}` : `0/${m.days}`} hari
                          </span>
                        </div>
                        {info.startDate && (
                          <div className="d-ms-dates">{info.startDate} → {info.endDate}</div>
                        )}
                        {info.status === 'active' && info.daysLeft != null && info.daysLeft <= 2 && (
                          <div style={{ marginTop: 5, padding: '3px 7px', background: 'rgba(255,170,0,0.12)', border: '1px solid rgba(255,170,0,0.25)', borderRadius: 5, fontSize: 9, color: 'var(--a)', fontWeight: 700 }}>
                            ⚠ Sisa {info.daysLeft} hari!
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Campaigns */}
        <div className="card" style={{ flex: '0 0 320px', marginBottom: 0 }}>
          <div className="card-h">
            <span className="card-h-title">Campaign terbaru</span>
          </div>
          <div className="card-b">
            {recentCampaigns.length === 0 ? (
              <div className="empty">Belum ada kampanye.</div>
            ) : (
              recentCampaigns.map(cp => (
                <div key={cp.id} className="camp-item">
                  <div>
                    <div className="camp-name">{cp.name}</div>
                    <div className="camp-date">{cp.platform}{cp.startdate ? ` · ${cp.startdate}` : ''}</div>
                  </div>
                  <div className="camp-right">
                    <div className="camp-val" style={{ color: cp.profit >= 0 ? 'var(--g)' : 'var(--r)' }}>
                      {cp.profit >= 0 ? '+' : ''}{fRp(cp.profit)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--t3)' }}>{cp.entries} entri</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
