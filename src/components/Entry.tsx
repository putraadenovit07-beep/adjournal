import { useState, useEffect, useRef } from 'react';
import { Campaign, Entry } from '../lib/storage';
import { calcROI, fRp, fPct, todayStr } from '../lib/helpers';
import { fetchUsdToIdr, getCachedRate, usdToIdr, formatRate, getRateSource } from '../lib/currency';

interface Props {
  campaigns: Campaign[];
  editEntry: Entry | null;
  prefillCampaignId: number | null;
  onSave: (data: Omit<Entry, 'id'>, editId?: number) => void;
  onCancel: () => void;
  onGoToCampaigns: () => void;
}

export default function EntryForm({ campaigns, editEntry, prefillCampaignId, onSave, onCancel, onGoToCampaigns }: Props) {
  const [campaignId, setCampaignId] = useState('');
  const [date, setDate] = useState(todayStr());
  const [spendUsd, setSpendUsd] = useState('');
  const [spend, setSpend] = useState('');
  const [adclicks, setAdclicks] = useState('');
  const [impressions, setImpressions] = useState('');
  const [revenue, setRevenue] = useState('');
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');
  const [roiPreview, setRoiPreview] = useState('');
  const [usdRate, setUsdRate] = useState(getCachedRate());
  const initialized = useRef(false);

  useEffect(() => {
    fetchUsdToIdr().then(rate => setUsdRate(rate));
  }, []);

  useEffect(() => {
    if (editEntry && !initialized.current) {
      initialized.current = true;
      setCampaignId(String(editEntry.campaignId || ''));
      setDate(editEntry.date);
      setSpend(String(editEntry.spend || ''));
      setSpendUsd('');
      setAdclicks(String(editEntry.adclicks || ''));
      setImpressions(String(editEntry.impressions || ''));
      setRevenue(String(editEntry.revenue || ''));
      setNote(editEntry.note || '');
    } else if (!editEntry) {
      initialized.current = false;
      if (prefillCampaignId) {
        setCampaignId(String(prefillCampaignId));
        const cp = campaigns.find(c => c.id === prefillCampaignId);
        if (cp?.startdate) setDate(cp.startdate);
      }
    }
  }, [editEntry, prefillCampaignId]);

  function handleSpendUsd(v: string) {
    setSpendUsd(v);
    const usd = parseFloat(v);
    if (!isNaN(usd) && usd > 0) {
      setSpend(String(usdToIdr(usd, usdRate)));
    } else if (!v) {
      setSpend('');
    }
  }

  function handleSpendIdr(v: string) {
    setSpend(v);
    setSpendUsd('');
  }

  function handleSave() {
    if (!campaignId) { alert('Pilih campaign dulu!'); return; }
    if (!date) { alert('Tanggal wajib diisi!'); return; }
    const data = {
      campaignId: Number(campaignId),
      date,
      spend: parseFloat(spend) || 0,
      adclicks: parseInt(adclicks) || 0,
      impressions: parseInt(impressions) || 0,
      revenue: parseFloat(revenue) || 0,
      note,
    };
    const profit = data.revenue - data.spend;
    const roi = calcROI(data);
    onSave(data, editEntry?.id);
    setMsg(editEntry ? 'Data berhasil diupdate' : 'Data berhasil disimpan');
    setRoiPreview(`Profit: ${fRp(profit)}  |  ROI: ${fPct(roi)}`);
    setTimeout(() => { setMsg(''); setRoiPreview(''); }, 4000);
    if (!editEntry) {
      setSpend(''); setSpendUsd(''); setAdclicks(''); setImpressions('');
      setRevenue(''); setNote('');
      setDate(todayStr());
    }
  }

  const rateLabel = formatRate(usdRate);
  const rateSource = getRateSource();
  const isEdit = !!editEntry;
  const spendIdrAuto = spendUsd && parseFloat(spendUsd) > 0
    ? usdToIdr(parseFloat(spendUsd), usdRate)
    : null;

  return (
    <div className="page">
      <div className="ph">
        <h1>{isEdit ? 'Edit Entri' : 'Catat Harian'}</h1>
        <p>{isEdit ? `Mengubah data: ${campaigns.find(c => c.id === editEntry?.campaignId)?.name || ''}` : 'Input data harian untuk campaign yang dipilih'}</p>
      </div>

      {campaigns.length === 0 ? (
        <div className="no-cp-banner">
          Belum ada campaign!{' '}
          <span style={{ color: 'var(--p)', cursor: 'pointer', fontWeight: 600 }} onClick={onGoToCampaigns}>
            Buat campaign dulu →
          </span>
        </div>
      ) : (
        <div className="card">
          <div className="card-h">
            <span className="card-h-title">Detail harian</span>
            <span className="card-h-tag" style={isEdit ? { color: 'var(--a)' } : {}}>{isEdit ? 'Edit' : 'Baru'}</span>
          </div>
          <div className="card-b">
            {isEdit && (
              <div className="edit-banner">Mode edit — kamu sedang mengubah data yang sudah ada</div>
            )}

            <div className="entry-top-grid">
              <div className="fg">
                <label>Campaign</label>
                <select value={campaignId} onChange={e => setCampaignId(e.target.value)}>
                  <option value="">— Pilih Campaign —</option>
                  {campaigns.map(cp => (
                    <option key={cp.id} value={cp.id}>{cp.name}{cp.platform ? ` (${cp.platform})` : ''}</option>
                  ))}
                </select>
              </div>
              <div className="fg">
                <label>Tanggal</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
            </div>

            {/* ADS Section — 3 columns */}
            <div className="form-section">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                <span className="form-section-label ads-label" style={{ margin: 0 }}>
                  <svg style={{ width: 11, height: 11, stroke: 'currentColor', fill: 'none', strokeWidth: 2, verticalAlign: 'middle', marginRight: 5 }} viewBox="0 0 24 24"><path d="M3 3h18v4H3z" /><path d="M3 10h11v4H3z" /></svg>
                  Data ADS
                </span>
                <span className="rate-inline-badge">
                  {rateLabel}
                  <span className="rate-inline-src"> · {rateSource}</span>
                </span>
              </div>

              <div className="ads-3col">
                {/* Col 1: SPEND USD */}
                <div className="fg">
                  <label style={{ color: 'var(--a)' }}>Spend ADS (USD)</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, fontWeight: 700, color: 'var(--a)', fontFamily: 'JetBrains Mono, monospace', pointerEvents: 'none' }}>$</span>
                    <input
                      type="number"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      value={spendUsd}
                      onChange={e => handleSpendUsd(e.target.value)}
                      style={{ paddingLeft: 28, background: 'rgba(255,170,0,0.06)', borderColor: 'rgba(255,170,0,0.25)', color: 'var(--a)' }}
                    />
                  </div>
                </div>

                {/* Col 2: SPEND IDR (auto or manual) */}
                <div className="fg">
                  <label>
                    Spend ADS (Rp)
                    {spendIdrAuto && <span style={{ marginLeft: 6, fontSize: 9, color: 'var(--a)', background: 'rgba(255,170,0,0.1)', padding: '1px 6px', borderRadius: 100, border: '1px solid rgba(255,170,0,0.2)', verticalAlign: 'middle' }}>AUTO</span>}
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    min="0"
                    value={spend}
                    onChange={e => handleSpendIdr(e.target.value)}
                  />
                </div>

                {/* Col 3: KLIK ADS */}
                <div className="fg">
                  <label>Klik ADS</label>
                  <input
                    type="number"
                    placeholder="0"
                    min="0"
                    value={adclicks}
                    onChange={e => setAdclicks(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* ADSENSE Section — IDR only */}
            <div className="form-section">
              <span className="form-section-label adsense-label" style={{ marginBottom: 12, display: 'inline-block' }}>
                <svg style={{ width: 11, height: 11, stroke: 'currentColor', fill: 'none', strokeWidth: 2, verticalAlign: 'middle', marginRight: 5 }} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>
                Data ADSENSE
              </span>
              <div className="adsense-2col">
                <div className="fg">
                  <label>Tayangan Adsense</label>
                  <input type="number" placeholder="0" min="0" value={impressions} onChange={e => setImpressions(e.target.value)} />
                </div>
                <div className="fg">
                  <label>Penghasilan Adsense (Rp)</label>
                  <input type="number" placeholder="0" min="0" value={revenue} onChange={e => setRevenue(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="fg">
              <label>Catatan / Note</label>
              <textarea placeholder="Contoh: Depo Rp 50.000, jam 08.00..." style={{ height: 80, lineHeight: 1.5 }} value={note} onChange={e => setNote(e.target.value)} />
            </div>

            <div className="btn-row">
              <button className="btn-primary" onClick={handleSave}>
                <svg style={{ width: 14, height: 14, stroke: '#fff', fill: 'none', strokeWidth: 2 }} viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /></svg>
                {isEdit ? 'Update Data' : 'Simpan Data'}
              </button>
              {isEdit && (
                <button className="btn-secondary" onClick={() => { onCancel(); }}>Batal</button>
              )}
            </div>
            {msg && <div className="msg msg-ok">{msg}</div>}
            {roiPreview && <div className="roi-preview">{roiPreview}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
