import { Campaign, Entry, Goals, Payout } from '../lib/storage';
import { fRp, fN, todayStr } from '../lib/helpers';
import type { ProfileSettings } from '../lib/github-db';

interface Props {
  campaigns: Campaign[];
  entries: Entry[];
  goals: Goals;
  payouts?: Payout[];
  settings?: ProfileSettings;
  onGoTo: (page: string) => void;
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

function addDaysIso(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function calcAvgDailyProfit(entries: Entry[], today: string): { avg: number; sampleDays: number } {
  const cutoff = addDaysIso(today, -7);
  const recent = entries.filter(e => e.date >= cutoff && e.date <= today);
  const profit = recent.reduce((s, e) => s + ((e.revenue || 0) - (e.spend || 0)), 0);
  const days = new Set(recent.map(e => e.date)).size || 1;
  return { avg: profit / days, sampleDays: days };
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

export default function Dashboard({ campaigns, entries, goals, payouts, settings, onGoTo }: Props) {
  const hideModalAwal = !!settings?.hideModalAwal;
  const poList = payouts || [];
  const totPoPending = poList.filter(p => p.status === 'pending').reduce((s, p) => s + (p.amount || 0), 0);
  const totPoSukses = poList.filter(p => p.status === 'sukses').reduce((s, p) => s + (p.amount || 0), 0);
  const cntPoPending = poList.filter(p => p.status === 'pending').length;
  const cntPoSukses = poList.filter(p => p.status === 'sukses').length;
  const nextPending = [...poList].filter(p => p.status === 'pending').sort((a, b) => (a.date || '').localeCompare(b.date || ''))[0];
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

  return (
    <div className="page">
      <div className="ph">
        <h1>Dashboard</h1>
        <p>Ringkasan performa paid traffic &amp; Adsense</p>
      </div>

      {/* BEP Compact Tracker */}
      {!hideModalAwal && (modalNum > 0 ? (() => {
        const { avg: avgDaily, sampleDays } = calcAvgDailyProfit(entries, today);
        const canProject = !sudahBalik && avgDaily > 0;
        const daysToBEP = canProject ? Math.ceil(sisaBEP / avgDaily) : null;
        const etaDate = daysToBEP !== null ? addDaysIso(today, daysToBEP) : null;
        const etaTxt = sudahBalik ? '✓ Tercapai' : !canProject ? '— hari' : `${daysToBEP} hari`;
        return (
          <div className={`bep-compact ${sudahBalik ? 'done' : 'progress'}`} onClick={() => onGoTo('analytics')}>
            <div className="bep-compact-row">
              <div className="bep-compact-cell">
                <span className="bep-compact-lbl">Modal Awal</span>
                <span className="bep-compact-val" style={{ color: 'var(--p)' }}>{fRp(modalNum)}</span>
              </div>
              <div className="bep-compact-cell">
                <span className="bep-compact-lbl">Estimasi Balik Modal</span>
                <span className="bep-compact-val" style={{ color: sudahBalik ? 'var(--g)' : canProject ? 'var(--tc)' : 'var(--t3)' }}>
                  {etaTxt}
                </span>
              </div>
              <div className="bep-compact-cell">
                <span className="bep-compact-lbl">Profit Harian (rata-rata)</span>
                <span className="bep-compact-val" style={{ color: avgDaily >= 0 ? 'var(--g)' : 'var(--r)' }}>
                  {avgDaily >= 0 ? '+' : ''}{fRp(avgDaily)}
                </span>
                <span className="bep-compact-sub">{sampleDays}h aktif</span>
              </div>
              <div className="bep-compact-cell">
                <span className="bep-compact-lbl">Sisa BEP</span>
                <span className="bep-compact-val" style={{ color: sudahBalik ? 'var(--g)' : 'var(--a)' }}>
                  {sudahBalik ? 'Rp 0' : fRp(sisaBEP)}
                </span>
              </div>
            </div>
            <div className="bep-compact-bar-wrap">
              <div className="bep-compact-bar-track">
                <div className="bep-compact-bar-fill" style={{
                  width: `${pctBalik}%`,
                  background: sudahBalik ? 'linear-gradient(90deg, var(--g), var(--tc))' : 'linear-gradient(90deg, var(--p), #b8acff)'
                }} />
              </div>
              <div className="bep-compact-bar-meta">
                <span className="bep-compact-bar-pct" style={{ color: sudahBalik ? 'var(--g)' : 'var(--p)' }}>
                  {pctBalik.toFixed(1)}% balik modal
                </span>
                {etaDate && !sudahBalik && (
                  <span className="bep-compact-bar-eta">≈ {etaDate}</span>
                )}
                <span className="bep-compact-link">Detail →</span>
              </div>
            </div>
          </div>
        );
      })() : (
        <div className="modal-strip-empty" onClick={() => onGoTo('modal')}>
          <span>💡 Set modal awal untuk tracker balik modal</span>
          <span className="modal-strip-link">Atur sekarang →</span>
        </div>
      ))}

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
                label="Profit Bersih Hari Ini"
                value={fRp(td.profit)}
                prevValue={fRp(yd.profit)}
                delta={delta(td.profit, yd.profit)}
                isMoney
                color={td.profit >= 0 ? 'var(--g)' : 'var(--r)'}
              />
              <DeltaCard
                label="Penghasilan Adsense Hari Ini"
                value={fRp(td.revenue)}
                prevValue={fRp(yd.revenue)}
                delta={delta(td.revenue, yd.revenue)}
                isMoney
                color="var(--g)"
              />
              <DeltaCard
                label="Spend Iklan Hari Ini"
                value={fRp(td.spend)}
                prevValue={fRp(yd.spend)}
                delta={delta(td.spend, yd.spend)}
                isMoney
                invertColor
                color="var(--r)"
              />
              <DeltaCard
                label="Klik Iklan Hari Ini"
                value={fN(td.clicks)}
                prevValue={fN(yd.clicks)}
                delta={delta(td.clicks, yd.clicks)}
                color="var(--b)"
              />
            </div>
          )}
        </div>
      </div>

      {/* Mosaic Total Stats - hero profit + side stats */}
      <div className="mosaic-stats">
        <div className={`mosaic-hero ${netProfit >= 0 ? 'pos' : 'neg'}`}>
          <div className="mosaic-hero-grid">
            <div className="mosaic-hero-main">
              <div className="mosaic-hero-top">
                <span className="mosaic-hero-label">Profit Bersih Keseluruhan</span>
                <span className={`mosaic-hero-roi ${roi >= 0 ? 'pos' : 'neg'}`}>
                  ROI {roi >= 0 ? '+' : ''}{roi.toFixed(2)}%
                </span>
              </div>
              <div className="mosaic-hero-val" style={{ color: netColor }}>
                {netProfit >= 0 ? '+' : ''}{fRp(netProfit)}
              </div>
              <div className="mosaic-hero-foot">
                <span className="mosaic-hero-dot" style={{ background: netColor }} />
                {entries.length} entri tercatat · {campaigns.length} kampanye
              </div>
            </div>
            <div className="mosaic-hero-aside">
              <div className="hero-aside-row">
                <span className="hero-aside-lbl">💰 Penghasilan</span>
                <span className="hero-aside-val pos">{fRp(totalRevenue)}</span>
              </div>
              <div className="hero-aside-row">
                <span className="hero-aside-lbl">💸 Spend</span>
                <span className="hero-aside-val neg">{fRp(totalSpend)}</span>
              </div>
              <div className="hero-aside-row">
                <span className="hero-aside-lbl">📊 Margin</span>
                <span className="hero-aside-val">{totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0.0'}%</span>
              </div>
              <div className="hero-aside-row">
                <span className="hero-aside-lbl">💵 Payout Cair</span>
                <span className="hero-aside-val">{fRp(totPoSukses)}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="mosaic-side">
          <div className="mosaic-mini">
            <div className="mosaic-mini-bar" style={{ background: 'var(--g)' }} />
            <div className="mosaic-mini-body">
              <span className="mosaic-mini-label">Penghasilan Adsense Keseluruhan</span>
              <span className="mosaic-mini-val cg">{fRp(totalRevenue)}</span>
            </div>
            <span className="mosaic-mini-icon" style={{ color: 'var(--g)' }}>↑</span>
          </div>
          <div className="mosaic-mini">
            <div className="mosaic-mini-bar" style={{ background: 'var(--r)' }} />
            <div className="mosaic-mini-body">
              <span className="mosaic-mini-label">Spend Iklan Keseluruhan</span>
              <span className="mosaic-mini-val cr">{fRp(totalSpend)}</span>
            </div>
            <span className="mosaic-mini-icon" style={{ color: 'var(--r)' }}>↓</span>
          </div>
          <div className="mosaic-mini po-mini" onClick={() => onGoTo('modal')} title="Kelola payout">
            <div className="mosaic-mini-bar" style={{ background: 'var(--tc)' }} />
            <div className="mosaic-mini-body po-mini-body">
              <span className="mosaic-mini-label">Payout Adsense Terbaru</span>
              {(() => {
                const featured = [...poList].sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
                if (!featured) return <span className="po-mini-empty">+ Tambah payout</span>;
                const isSukses = featured.status === 'sukses';
                return (
                  <div className="po-feature-inline">
                    <span className="po-feature-amt" style={{ color: isSukses ? 'var(--g)' : 'var(--a)' }}>{fRp(featured.amount)}</span>
                    <span className="po-feature-sep">|</span>
                    <span className={`po-mini-pill ${isSukses ? 'sukses' : 'pending'}`}>{isSukses ? '✓ Sukses' : '⏳ Pending'}</span>
                    <span className="po-feature-sep">|</span>
                    <span className="po-feature-date">{featured.date}</span>
                  </div>
                );
              })()}
            </div>
            <span className="mosaic-mini-icon" style={{ color: 'var(--tc)' }}>→</span>
          </div>
        </div>
      </div>
    </div>
  );
}
