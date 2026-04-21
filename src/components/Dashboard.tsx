import { Campaign, Entry, Goals } from '../lib/storage';
import { fRp, fN, todayStr } from '../lib/helpers';

interface Props {
  campaigns: Campaign[];
  entries: Entry[];
  goals: Goals;
  onGoTo: (page: string) => void;
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

function totalsForDate(entries: Entry[], date: string) {
  const dayEntries = entries.filter(e => e.date === date);
  const spend = dayEntries.reduce((s, e) => s + (e.spend || 0), 0);
  const revenue = dayEntries.reduce((s, e) => s + (e.revenue || 0), 0);
  const clicks = dayEntries.reduce((s, e) => s + (e.adclicks || 0), 0);
  return { spend, revenue, profit: revenue - spend, clicks, count: dayEntries.length };
}

function delta(now: number, prev: number) {
  const diff = now - prev;
  let pct = 0;
  if (prev !== 0) pct = (diff / Math.abs(prev)) * 100;
  else if (now !== 0) pct = 100;
  return { diff, pct };
}

interface DeltaCardProps {
  label: string;
  value: string;
  prevValue: string;
  delta: { diff: number; pct: number };
  isMoney?: boolean;
  invertColor?: boolean;
  color: string;
}

function DeltaCard({ label, value, prevValue, delta: d, isMoney, invertColor, color }: DeltaCardProps) {
  const positive = invertColor ? d.diff < 0 : d.diff > 0;
  const negative = invertColor ? d.diff > 0 : d.diff < 0;
  const deltaColor = d.diff === 0 ? 'var(--t3)' : positive ? 'var(--g)' : negative ? 'var(--r)' : 'var(--t3)';
  const arrow = d.diff === 0 ? '·' : d.diff > 0 ? '↑' : '↓';
  const sign = d.diff > 0 ? '+' : '';
  const deltaTxt = isMoney ? sign + fRp(d.diff) : sign + fN(d.diff);

  return (
    <div className="day-card">
      <div className="day-card-label">{label}</div>
      <div className="day-card-val" style={{ color }}>{value}</div>
      <div className="day-card-delta" style={{ color: deltaColor }}>
        <span className="day-card-arrow">{arrow}</span>
        <span>{deltaTxt}</span>
        <span className="day-card-pct">({sign}{d.pct.toFixed(1)}%)</span>
      </div>
      <div className="day-card-prev">Kemarin: {prevValue}</div>
    </div>
  );
}

export default function Dashboard({ campaigns, entries, goals, onGoTo }: Props) {
  const totalSpend = entries.reduce((s, e) => s + (e.spend || 0), 0);
  const totalRevenue = entries.reduce((s, e) => s + (e.revenue || 0), 0);
  const netProfit = totalRevenue - totalSpend;
  const roi = totalSpend > 0 ? (netProfit / totalSpend) * 100 : 0;

  const today = todayStr();
  const yest = yesterdayStr();
  const td = totalsForDate(entries, today);
  const yd = totalsForDate(entries, yest);

  const modalNum = goals.modal || 0;
  const pctBalik = modalNum > 0 ? Math.min(100, Math.max(0, (netProfit / modalNum) * 100)) : 0;
  const sisaBEP = Math.max(0, modalNum - netProfit);
  const sudahBalik = modalNum > 0 && netProfit >= modalNum;

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

      {/* Minimal Modal Strip */}
      {modalNum > 0 ? (
        <div className="modal-strip" onClick={() => onGoTo('analytics')}>
          <div className="modal-strip-left">
            <div className="modal-strip-icon" style={{ background: sudahBalik ? 'rgba(0,217,139,0.12)' : 'rgba(139,124,248,0.12)', color: sudahBalik ? 'var(--g)' : 'var(--p)' }}>
              {sudahBalik ? '✓' : '%'}
            </div>
            <div>
              <div className="modal-strip-title">{sudahBalik ? 'Modal Sudah Balik' : 'Balik Modal'}</div>
              <div className="modal-strip-sub">
                {fRp(Math.max(0, netProfit))} dari {fRp(modalNum)}
                {!sudahBalik && <> · sisa <strong style={{color:'var(--a)'}}>{fRp(sisaBEP)}</strong></>}
              </div>
            </div>
          </div>
          <div className="modal-strip-right">
            <div className="modal-strip-pct" style={{ color: sudahBalik ? 'var(--g)' : 'var(--p)' }}>{pctBalik.toFixed(1)}%</div>
            <div className="modal-strip-bar">
              <div className="modal-strip-fill" style={{ width: `${pctBalik}%`, background: sudahBalik ? 'var(--g)' : 'var(--p)' }} />
            </div>
            <div className="modal-strip-link">Detail di Analitik →</div>
          </div>
        </div>
      ) : (
        <div className="modal-strip-empty" onClick={() => onGoTo('modal')}>
          <span>💡 Set modal awal untuk tracker balik modal</span>
          <span className="modal-strip-link">Atur sekarang →</span>
        </div>
      )}

      {/* Hari Ini vs Kemarin - Adsense style */}
      <div className="card">
        <div className="card-h">
          <span className="card-h-title">Performa Hari Ini</span>
          <span className="card-h-tag">vs Kemarin</span>
        </div>
        <div className="card-b" style={{ padding: 0 }}>
          {td.count === 0 && yd.count === 0 ? (
            <div className="empty" style={{ padding: '32px 20px' }}>
              Belum ada entri hari ini atau kemarin.<br/>
              <span style={{ color: 'var(--p)', cursor: 'pointer', fontWeight: 600 }} onClick={() => onGoTo('entry')}>+ Catat sekarang</span>
            </div>
          ) : (
            <div className="day-grid">
              <DeltaCard
                label="Profit Bersih"
                value={fRp(td.profit)}
                prevValue={fRp(yd.profit)}
                delta={delta(td.profit, yd.profit)}
                isMoney
                color={td.profit >= 0 ? 'var(--g)' : 'var(--r)'}
              />
              <DeltaCard
                label="Penghasilan Adsense"
                value={fRp(td.revenue)}
                prevValue={fRp(yd.revenue)}
                delta={delta(td.revenue, yd.revenue)}
                isMoney
                color="var(--g)"
              />
              <DeltaCard
                label="Spend Iklan"
                value={fRp(td.spend)}
                prevValue={fRp(yd.spend)}
                delta={delta(td.spend, yd.spend)}
                isMoney
                invertColor
                color="var(--r)"
              />
              <DeltaCard
                label="Klik Iklan"
                value={fN(td.clicks)}
                prevValue={fN(yd.clicks)}
                delta={delta(td.clicks, yd.clicks)}
                color="var(--b)"
              />
            </div>
          )}
        </div>
      </div>

      {/* Hero Total Stats - Pro Adsense panel */}
      <div className="hero-stats">
        <div className="hero-stats-head">
          <div>
            <div className="hero-stats-title">Ringkasan Keseluruhan</div>
            <div className="hero-stats-sub">{entries.length} entri · {campaigns.length} kampanye</div>
          </div>
          <div className={`hero-stats-roi ${roi >= 0 ? 'pos' : 'neg'}`}>
            <span className="hero-stats-roi-label">ROI</span>
            <span className="hero-stats-roi-val">{roi >= 0 ? '+' : ''}{roi.toFixed(2)}%</span>
          </div>
        </div>
        <div className="hero-stats-grid">
          <div className="hero-stats-cell">
            <div className="hero-stats-cell-icon" style={{ background: 'rgba(0,217,139,0.12)', color: 'var(--g)' }}>↑</div>
            <div>
              <div className="hero-stats-cell-label">Penghasilan</div>
              <div className="hero-stats-cell-val cg">{fRp(totalRevenue)}</div>
            </div>
          </div>
          <div className="hero-stats-cell">
            <div className="hero-stats-cell-icon" style={{ background: 'rgba(255,77,109,0.12)', color: 'var(--r)' }}>↓</div>
            <div>
              <div className="hero-stats-cell-label">Spend Iklan</div>
              <div className="hero-stats-cell-val cr">{fRp(totalSpend)}</div>
            </div>
          </div>
          <div className="hero-stats-cell hero-stats-cell-net">
            <div className="hero-stats-cell-icon" style={{ background: netProfit >= 0 ? 'rgba(0,217,139,0.18)' : 'rgba(255,77,109,0.18)', color: netColor }}>
              {netProfit >= 0 ? '✓' : '!'}
            </div>
            <div>
              <div className="hero-stats-cell-label">Profit Bersih</div>
              <div className="hero-stats-cell-val" style={{ color: netColor }}>{netProfit >= 0 ? '+' : ''}{fRp(netProfit)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-h">
          <span className="card-h-title">Campaign Terbaru</span>
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
  );
}
