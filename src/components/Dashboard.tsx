import { Campaign, Entry, Goals } from '../lib/storage';
import { fRp } from '../lib/helpers';

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

  const modalNum = goals.modal || 0;
  const pctBalik = modalNum > 0 ? Math.min(100, Math.max(0, (netProfit / modalNum) * 100)) : 0;
  const sisaBEP = Math.max(0, modalNum - netProfit);
  const sudahBalik = modalNum > 0 && netProfit >= modalNum;

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

      {/* Modal Awal Tracker */}
      <div className="card">
        <div className="card-h">
          <span className="card-h-title">Tracker Balik Modal</span>
          {modalNum > 0 ? (
            <span className="card-h-tag" style={{ color: sudahBalik ? 'var(--g)' : 'var(--a)' }}>
              {sudahBalik ? '✓ BEP Tercapai' : 'Belum BEP'}
            </span>
          ) : <span className="card-h-tag">—</span>}
        </div>
        <div className="card-b">
          {modalNum === 0 ? (
            <div className="d-ms-empty">
              Belum set modal awal.{' '}
              <span onClick={() => onGoTo('modal')}>Set modal awal dulu →</span>
            </div>
          ) : (
            <>
              <div className="modal-bar">
                <div className="modal-bar-item">
                  <span className="modal-bar-label">Modal Awal</span>
                  <span className="modal-bar-val" style={{ color: 'var(--p)' }}>{fRp(modalNum)}</span>
                </div>
                <div className="modal-bar-item">
                  <span className="modal-bar-label">Profit Bersih</span>
                  <span className="modal-bar-val" style={{ color: netProfit >= 0 ? 'var(--g)' : 'var(--r)' }}>
                    {netProfit >= 0 ? '+' : ''}{fRp(netProfit)}
                  </span>
                </div>
                <div className="modal-bar-item">
                  <span className="modal-bar-label">Sisa BEP</span>
                  <span className="modal-bar-val" style={{ color: sudahBalik ? 'var(--g)' : 'var(--a)' }}>
                    {sudahBalik ? 'Lunas ✓' : fRp(sisaBEP)}
                  </span>
                </div>
              </div>
              <div style={{ marginTop: 14 }}>
                <div className="d-ms-prog-track" style={{ height: 10 }}>
                  <div className="d-ms-prog-fill" style={{
                    width: `${pctBalik}%`,
                    background: sudahBalik ? 'var(--g)' : 'var(--p)'
                  }} />
                </div>
                <div className="d-ms-prog-row" style={{ marginTop: 6 }}>
                  <span className="d-ms-prog-txt" style={{ fontSize: 12 }}>{pctBalik.toFixed(1)}% balik modal</span>
                  <span className="d-ms-prog-txt" style={{ fontSize: 12 }}>{fRp(Math.max(0, netProfit))} / {fRp(modalNum)}</span>
                </div>
              </div>
            </>
          )}
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
