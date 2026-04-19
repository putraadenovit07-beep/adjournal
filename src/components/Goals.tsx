import { useState } from 'react';
import { Goals, Milestone, Entry } from '../lib/storage';
import { fRp, fN, getMilestoneInfo, todayStr } from '../lib/helpers';

interface Props {
  goals: Goals;
  entries: Entry[];
  onSave: (g: Goals) => void;
}

export default function GoalsPage({ goals: initialGoals, entries, onSave }: Props) {
  const [goals, setGoals] = useState<Goals>(initialGoals);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState('');
  const today = todayStr();

  function updateGoals(updated: Goals) {
    setGoals(updated);
  }

  function addMilestone() {
    const updated = { ...goals, milestones: [...goals.milestones, { clicks: 0, days: 7 }] };
    updateGoals(updated);
  }

  function deleteMilestone(idx: number) {
    const ms = goals.milestones.filter((_, i) => i !== idx);
    updateGoals({ ...goals, milestones: ms });
  }

  function updateMilestone(idx: number, field: 'clicks' | 'days', val: string) {
    const ms = goals.milestones.map((m, i) => i === idx ? { ...m, [field]: parseInt(val) || 0 } : m);
    updateGoals({ ...goals, milestones: ms });
  }

  function handleSave() {
    const updated = { ...goals, locked: true };
    setGoals(updated);
    onSave(updated);
    setMsg('Goals berhasil disimpan & dikunci!');
    setOpen(false);
    setTimeout(() => setMsg(''), 3000);
  }

  function handleUnlock() {
    const updated = { ...goals, locked: false };
    setGoals(updated);
    onSave(updated);
    setOpen(true);
  }

  const ms = goals.milestones.filter(m => m.clicks > 0 && m.days > 0);
  const locked = goals.locked;

  // Balik modal calc
  const totalRevenue = entries.reduce((s, e) => s + (e.revenue || 0), 0);
  const sisaBalik = goals.modal > 0 ? goals.modal - totalRevenue : 0;
  const sudahBalik = totalRevenue >= goals.modal && goals.modal > 0;

  return (
    <div className="page">
      <div className="ph">
        <h1>Goals &amp; Target</h1>
        <p>Milestone klik: berapa klik yang ingin dicapai dalam berapa hari</p>
      </div>

      <div className="goals-toggle" onClick={() => setOpen(o => !o)}>
        <div className="goals-toggle-left">
          <div className="goals-icon-wrap">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>
          </div>
          <div>
            <div className="goals-toggle-title">{locked ? 'Goals Terkunci' : 'Setting Goals'}</div>
            <div className="goals-toggle-sub">Klik untuk {open ? 'tutup' : 'buka'} &amp; isi milestone target klik</div>
          </div>
        </div>
        <div className="goals-toggle-right">
          <span className={`lock-pill ${locked ? 'locked' : 'unlocked'}`}>
            <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 019.9-1" /></svg>
            {locked ? 'Terkunci' : 'Belum dikunci'}
          </span>
          <div className={`chev ${open ? 'open' : ''}`}>
            <svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9" /></svg>
          </div>
        </div>
      </div>

      {open && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="card-h">
            <span className="card-h-title">Input Goals — Milestone Klik</span>
            <span className="card-h-tag" style={{ color: locked ? 'var(--g)' : 'var(--a)' }}>
              {locked ? 'Terkunci' : 'Bisa diubah'}
            </span>
          </div>
          <div className="card-b">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
              <div className="fg">
                <label>Modal Awal (Rp)</label>
                <input type="number" placeholder="Contoh: 900000" min="0" value={goals.modal || ''} disabled={locked} onChange={e => updateGoals({ ...goals, modal: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="fg">
                <label>Tanggal Start ADS</label>
                <input type="date" value={goals.start} disabled={locked} onChange={e => updateGoals({ ...goals, start: e.target.value })} />
              </div>
            </div>

            <div style={{ fontSize: 11, color: 'var(--t3)', lineHeight: 1.65, padding: '9px 12px', background: 'rgba(139,124,248,0.06)', borderRadius: 'var(--rad-s)', border: '1px solid rgba(139,124,248,0.12)', marginBottom: 16 }}>
              Isi setiap milestone dengan <strong style={{ color: 'var(--p)' }}>target total klik per hari</strong> dan <strong style={{ color: 'var(--b)' }}>berapa hari</strong> untuk mencapainya.
            </div>

            <div className="milestone-list">
              {goals.milestones.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 20, fontSize: 12, color: 'var(--t3)', border: '1px dashed var(--brd)', borderRadius: 'var(--rad-s)' }}>
                  Belum ada milestone. Klik "+ Tambah Milestone" di bawah.
                </div>
              ) : (
                goals.milestones.map((m, idx) => {
                  const info = getMilestoneInfo(m, idx, goals.milestones, goals.start, today);
                  const numCls = info.status === 'active' ? 'active-num' : info.status === 'done' ? 'done-num' : '';
                  return (
                    <div key={idx} className="milestone-row">
                      <div className={`milestone-num ${numCls}`}>{idx + 1}</div>
                      <div className="milestone-inputs">
                        <div className="milestone-mini-fg">
                          <label>Target Klik / Hari</label>
                          <input type="number" placeholder="cth: 100" min="1" value={m.clicks || ''} disabled={locked} onChange={e => updateMilestone(idx, 'clicks', e.target.value)} style={{ color: 'var(--p)' }} />
                        </div>
                        <div className="milestone-mini-fg">
                          <label>Durasi (hari)</label>
                          <input type="number" placeholder="cth: 3" min="1" value={m.days || ''} disabled={locked} onChange={e => updateMilestone(idx, 'days', e.target.value)} style={{ color: 'var(--b)' }} />
                        </div>
                      </div>
                      <div className={`milestone-badge ${info.status === 'active' ? 'active-badge' : info.status === 'done' ? 'done-badge' : ''}`}>
                        {info.status === 'active' ? (
                          <>
                            <span style={{ color: 'var(--g)', fontSize: 10, fontWeight: 700 }}>● Aktif</span><br />
                            {info.daysLeft != null && info.daysLeft <= 2
                              ? <span style={{ color: 'var(--a)', fontSize: 10 }}>⚠ {info.daysLeft} hari lagi</span>
                              : <span style={{ fontSize: 10 }}>Sisa {info.daysLeft} hari</span>}
                          </>
                        ) : info.status === 'done' ? (
                          <>
                            <span style={{ color: 'var(--tc)', fontSize: 10, fontWeight: 700 }}>✓ Selesai</span><br />
                            <span style={{ fontSize: 10 }}>{info.pct}%</span>
                          </>
                        ) : info.startDate ? (
                          <span style={{ fontSize: 10 }}>Mulai {info.daysUntilStart} hari lagi</span>
                        ) : null}
                      </div>
                      <button className="del-ms-btn" disabled={locked} onClick={() => deleteMilestone(idx)}>
                        <svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12" /></svg>
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {!locked && (
              <button className="add-milestone-btn" onClick={addMilestone}>
                <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                Tambah Milestone
              </button>
            )}

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
              {!locked ? (
                <button className="btn-primary" onClick={handleSave}>
                  <svg style={{ width: 13, height: 13, stroke: '#fff', fill: 'none', strokeWidth: 2.5 }} viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                  Simpan &amp; Kunci
                </button>
              ) : (
                <button className="btn-secondary" onClick={handleUnlock}>Buka Kunci &amp; Ubah</button>
              )}
            </div>
            {msg && <div className="msg msg-ok">{msg}</div>}
          </div>
        </div>
      )}

      {/* Live Progress */}
      {ms.length > 0 && goals.start && locked && (
        <div className="card">
          <div className="card-h">
            <span className="card-h-title">Progress Milestone Klik</span>
            <span className="card-h-tag" style={{ color: 'var(--p)' }}>
              {(() => {
                const activeIdx = ms.findIndex((m, i) => getMilestoneInfo(m, i, ms, goals.start, today).status === 'active');
                return activeIdx >= 0 ? `MS ${activeIdx + 1} Aktif` : 'Progress';
              })()}
            </span>
          </div>
          <div className="card-b">
            {goals.modal > 0 && (
              <div className="modal-bar" style={{ marginBottom: 12 }}>
                <div className="modal-bar-item">
                  <span className="modal-bar-label">Modal Awal</span>
                  <span className="modal-bar-val cr">{fRp(goals.modal)}</span>
                </div>
                <div className="modal-bar-item">
                  <span className="modal-bar-label">Total Penghasilan</span>
                  <span className="modal-bar-val cg">{fRp(entries.reduce((s, e) => s + (e.revenue || 0), 0))}</span>
                </div>
                <div className="modal-bar-item">
                  <span className="modal-bar-label">Status Balik Modal</span>
                  <span className="modal-bar-val" style={{ color: sudahBalik ? 'var(--g)' : 'var(--a)' }}>
                    {sudahBalik ? '✓ Balik Modal' : `Kurang ${fRp(sisaBalik)}`}
                  </span>
                </div>
              </div>
            )}
            <div className="ms-live-cards">
              {ms.map((m, idx) => {
                const info = getMilestoneInfo(m, idx, ms, goals.start, today);
                const cardCls = `ms-live-card ${info.status === 'active' ? 'active-card' : info.status === 'done' ? 'done-card' : 'upcoming-card'}`;
                const labelColor = info.status === 'active' ? 'var(--g)' : info.status === 'done' ? 'var(--tc)' : 'var(--t3)';
                const fillColor = info.status === 'active' ? 'var(--g)' : info.status === 'done' ? 'var(--tc)' : 'rgba(139,124,248,0.4)';
                const msEntries = entries.filter(e => info.startDate && info.endDate && e.date >= info.startDate && e.date <= info.endDate);
                const actualClicks = msEntries.reduce((s, e) => s + (e.adclicks || 0), 0);

                return (
                  <div key={idx} className={cardCls}>
                    <div className="ms-card-top">
                      <span className="ms-card-label" style={{ color: labelColor }}>Milestone {idx + 1}</span>
                      <span className={`ms-card-status ${info.status === 'active' ? 'active-st' : info.status === 'done' ? 'done-st' : 'upcoming-st'}`}>
                        {info.status === 'active' ? '● Aktif' : info.status === 'done' ? '✓ Selesai' : 'Segera'}
                      </span>
                    </div>
                    <div className="ms-card-main">
                      <span className="ms-card-clicks" style={{ color: 'var(--b)' }}>{fN(actualClicks)}</span>
                      <span className="ms-card-in">klik dalam</span>
                      <span className="ms-card-days">{m.days}</span>
                      <span className="ms-card-days-label">hari</span>
                    </div>
                    <div className="ms-prog-track">
                      <div className="ms-prog-fill" style={{ width: `${info.pct}%`, background: fillColor }} />
                    </div>
                    <div className="ms-prog-row">
                      <span className="ms-prog-txt">{info.pct}%</span>
                      <span className="ms-prog-txt">Target: {fN(m.clicks)} klik/hari</span>
                    </div>
                    {info.startDate && (
                      <div className="ms-dates">{info.startDate} → {info.endDate}</div>
                    )}
                    {info.status === 'active' && info.daysLeft != null && info.daysLeft <= 2 && (
                      <div className="ms-warn">⚠ Sisa {info.daysLeft} hari lagi!</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
