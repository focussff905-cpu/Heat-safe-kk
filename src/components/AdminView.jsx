import { useState, useCallback, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const ALERT_COLOR = '#ef4444';
const ALERT_BG    = 'rgba(239,68,68,0.12)';
const ALERT_EMOJI = '🚨';
function fmtDate(ts) {
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString('th-TH', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Bangkok',
  });
}

/* ── PIN pad ─────────────────────────────────────────────────────────────── */
function PinPad({ onSuccess }) {
  const [digits, setDigits] = useState('');
  const [shake,  setShake]  = useState(false);

  const press = useCallback((d) => {
    if (digits.length >= 4) return;
    const next = digits + d;
    setDigits(next);
    if (next.length === 4) {
      if (next === '2569') {
        onSuccess();
      } else {
        setShake(true);
        setTimeout(() => { setDigits(''); setShake(false); }, 700);
      }
    }
  }, [digits, onSuccess]);

  const del = () => setDigits(d => d.slice(0, -1));

  return (
    <div className="flex flex-col items-center gap-6 px-6 py-8">
      <div className="flex flex-col items-center gap-2">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', boxShadow: '0 8px 24px rgba(239,68,68,0.4)' }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <p className="text-lg font-black text-slate-800">ระบบแจ้งเตือนฉุกเฉิน</p>
        <p className="text-xs text-slate-400">เฉพาะเจ้าหน้าที่ที่ได้รับอนุญาตเท่านั้น</p>
      </div>

      <div className={`flex gap-3 transition-all ${shake ? 'animate-bounce' : ''}`}>
        {[0,1,2,3].map(i => (
          <div key={i} className="w-3.5 h-3.5 rounded-full transition-all duration-150"
            style={{
              background: i < digits.length
                ? shake ? '#ef4444' : '#3b82f6'
                : 'rgba(148,163,184,0.3)',
              transform: i < digits.length ? 'scale(1.2)' : 'scale(1)',
            }} />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3 w-full max-w-[240px]">
        {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k) => (
          <button
            key={k}
            onClick={() => k === '⌫' ? del() : k !== '' ? press(k) : null}
            disabled={k === ''}
            className="h-14 rounded-2xl text-xl font-bold transition-all duration-100 active:scale-95"
            style={{
              background: k === '' ? 'transparent' : k === '⌫' ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.9)',
              color: k === '⌫' ? '#ef4444' : '#1e293b',
              boxShadow: k === '' ? 'none' : '0 2px 8px rgba(0,0,0,0.08)',
              border: k === '' ? 'none' : '1px solid rgba(226,232,240,0.8)',
            }}>
            {k}
          </button>
        ))}
      </div>

      {shake && <p className="text-xs text-red-500 font-semibold">รหัสไม่ถูกต้อง</p>}
    </div>
  );
}

/* ── Alert composer ──────────────────────────────────────────────────────── */
function AlertComposer() {
  const [title,   setTitle]  = useState('');
  const [body,    setBody]   = useState('');
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);

  const send = async () => {
    if (!title.trim() || !body.trim() || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: '2569', title, body }),
      });
      const data = await res.json();
      setResult(data.ok
        ? { ok: true,  msg: `ส่งสำเร็จ ${data.sent} คน${data.failed ? ` (ล้มเหลว ${data.failed})` : ''}` }
        : { ok: false, msg: data.error ?? 'เกิดข้อผิดพลาด' }
      );
      if (data.ok) { setTitle(''); setBody(''); }
    } catch {
      setResult({ ok: false, msg: 'ไม่สามารถเชื่อมต่อ server' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">หัวข้อการแจ้งเตือน</p>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base leading-none pointer-events-none">{ALERT_EMOJI}</span>
          <input
            type="text" value={title} onChange={e => setTitle(e.target.value)} maxLength={80}
            placeholder="เช่น พายุฤดูร้อนกำลังเข้า"
            className="w-full pl-9 pr-3 py-3 rounded-xl text-sm font-medium outline-none transition-all"
            style={{ background: 'rgba(255,255,255,0.9)', border: `1.5px solid ${title ? ALERT_COLOR + '50' : 'rgba(226,232,240,0.8)'}`, color: '#1e293b' }}
          />
        </div>
      </div>

      <div>
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">รายละเอียด</p>
        <textarea
          value={body} onChange={e => setBody(e.target.value)} maxLength={200} rows={4}
          placeholder="เช่น มีพายุฤดูร้อนพัดเข้าพื้นที่ขอนแก่น ขอให้ประชาชนระวังอันตราย"
          className="w-full px-3 py-3 rounded-xl text-sm outline-none resize-none transition-all"
          style={{ background: 'rgba(255,255,255,0.9)', border: `1.5px solid ${body ? ALERT_COLOR + '50' : 'rgba(226,232,240,0.8)'}`, color: '#1e293b', lineHeight: 1.6 }}
        />
        <p className="text-[10px] text-slate-400 text-right mt-0.5">{body.length}/200</p>
      </div>

      {(title || body) && (
        <div className="rounded-2xl p-3.5 flex gap-3" style={{ background: ALERT_BG, border: `1px solid ${ALERT_COLOR}30` }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg" style={{ background: ALERT_COLOR + '20' }}>{ALERT_EMOJI}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate" style={{ color: ALERT_COLOR }}>{title || '(หัวข้อ)'}</p>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed line-clamp-2">{body || '(รายละเอียด)'}</p>
          </div>
        </div>
      )}

      {result && (
        <div className="rounded-xl px-4 py-3 text-sm font-semibold text-center"
          style={{ background: result.ok ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', color: result.ok ? '#059669' : '#dc2626', border: `1px solid ${result.ok ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
          {result.ok ? '✓ ' : '✗ '}{result.msg}
        </div>
      )}

      <button
        onClick={send}
        disabled={!title.trim() || !body.trim() || loading}
        className="w-full py-4 rounded-2xl text-white font-black text-sm transition-all active:scale-95"
        style={{
          background: (!title.trim() || !body.trim() || loading) ? 'rgba(148,163,184,0.4)' : `linear-gradient(135deg,${ALERT_COLOR},${ALERT_COLOR}cc)`,
          boxShadow:  (!title.trim() || !body.trim() || loading) ? 'none' : `0 8px 24px ${ALERT_COLOR}40`,
          cursor:     (!title.trim() || !body.trim() || loading) ? 'not-allowed' : 'pointer',
        }}>
        {loading ? '⏳ กำลังส่ง...' : `${ALERT_EMOJI} ส่งการแจ้งเตือนฉุกเฉิน`}
      </button>

      <p className="text-[10px] text-slate-400 text-center">การแจ้งเตือนจะถูกส่งทันทีไปยังทุกคนที่เปิดรับการแจ้งเตือนไว้</p>
    </div>
  );
}

/* ── Reports inbox ───────────────────────────────────────────────────────── */
const STATUS_STYLES = {
  new:      { label: 'ใหม่',       bg: 'rgba(239,68,68,0.1)',   color: '#ef4444' },
  read:     { label: 'รับทราบ',    bg: 'rgba(251,146,60,0.1)',  color: '#f97316' },
  resolved: { label: 'แก้ไขแล้ว', bg: 'rgba(16,185,129,0.1)',  color: '#059669' },
};

function ReportsInbox({ onNewCount }) {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setReports(data);
      onNewCount?.(data.filter(r => r.status === 'new').length);
    });
    return unsub;
  }, [onNewCount]);

  const setStatus = (id, status) => {
    const extra = status === 'read' ? { readAt: serverTimestamp() }
                : status === 'resolved' ? { resolvedAt: serverTimestamp() } : {};
    updateDoc(doc(db, 'reports', id), { status, ...extra });
  };
  const deleteReport = (id) => deleteDoc(doc(db, 'reports', id));

  const newCount = reports.filter(r => r.status === 'new').length;

  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <div className="text-4xl opacity-30">📭</div>
        <p className="text-slate-400 text-sm">ยังไม่มีรายงานจากผู้ใช้</p>
        <p className="text-slate-300 text-xs">รายงานจะปรากฏที่นี่เมื่อมีผู้แจ้งเหตุผ่านลิ้งค์สาธารณะ</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {newCount > 0 && (
        <div className="rounded-xl px-3 py-2 flex items-center gap-2"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
          <p className="text-xs font-semibold text-red-600">มีรายงานใหม่ {newCount} รายการ</p>
        </div>
      )}
      {reports.map(r => {
        const st = STATUS_STYLES[r.status] ?? STATUS_STYLES.new;
        return (
          <div key={r.id} className="rounded-2xl p-4 bg-white space-y-2.5"
            style={{ border: `1.5px solid ${r.status === 'new' ? 'rgba(239,68,68,0.25)' : '#e0eaff'}` }}>
            {/* Top row */}
            <div className="flex items-start gap-2.5">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-slate-800 leading-tight truncate">{r.address ?? r.location}</p>
                {r.lat && r.lng && (
                  <a
                    href={`https://www.google.com/maps?q=${r.lat},${r.lng}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-[10px] font-mono text-blue-500 hover:underline">
                    {r.lat.toFixed(5)}, {r.lng.toFixed(5)} ↗
                  </a>
                )}
                <p className="text-[10px] text-slate-400 mt-0.5">{fmtDate(r.createdAt)}</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ background: st.bg, color: st.color }}>{st.label}</span>
            </div>

            {/* Detail */}
            <div className="space-y-2">
              <p className="text-xs text-slate-600 leading-relaxed">{r.detail}</p>
              {r.image && (
                <img src={r.image} alt="รูปประกอบ"
                  className="w-full rounded-xl object-cover cursor-pointer"
                  style={{ maxHeight: '180px', border: '1px solid #e0eaff' }}
                  onClick={() => window.open(r.image, '_blank')}
                />
              )}
              {r.name !== 'ไม่ระบุ' && (
                <p className="text-[11px] text-slate-400">👤 {r.name}{r.phone !== 'ไม่ระบุ' ? ` · 📞 ${r.phone}` : ''}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              {r.status !== 'read' && r.status !== 'resolved' && (
                <button onClick={() => setStatus(r.id, 'read')}
                  className="text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all"
                  style={{ background: 'rgba(251,146,60,0.1)', color: '#f97316', border: '1px solid rgba(251,146,60,0.3)' }}>
                  รับทราบ
                </button>
              )}
              {r.status !== 'resolved' && (
                <button onClick={() => setStatus(r.id, 'resolved')}
                  className="text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all"
                  style={{ background: 'rgba(16,185,129,0.1)', color: '#059669', border: '1px solid rgba(16,185,129,0.3)' }}>
                  แก้ไขแล้ว
                </button>
              )}
              <button onClick={() => deleteReport(r.id)}
                className="text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all ml-auto"
                style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                ลบ
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Dashboard (post-login) ──────────────────────────────────────────────── */
function Dashboard({ onLogout }) {
  const [tab, setTab] = useState('reports');
  const [newCount, setNewCount] = useState(0);

  return (
    <div className="flex flex-col gap-4 px-4 py-5 max-w-md mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-base font-black text-slate-800">แผงควบคุม Admin</p>
          <p className="text-[11px] text-slate-400">ระบบติดตามสภาพแวดล้อม จ.ขอนแก่น</p>
        </div>
        <button onClick={onLogout}
          className="text-[11px] text-slate-400 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-50">
          ออก
        </button>
      </div>

      {/* Tabs */}
      <div className="flex rounded-2xl overflow-hidden p-1 gap-1"
        style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid #e0eaff' }}>
        {[
          { id: 'reports', label: 'รายงานจากผู้ใช้', badge: newCount },
          { id: 'alert',   label: 'ส่งการแจ้งเตือน', badge: 0 },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all"
            style={{
              background: tab === t.id ? 'white' : 'transparent',
              color:      tab === t.id ? '#1e293b' : '#94a3b8',
              boxShadow:  tab === t.id ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
            }}>
            {t.label}
            {t.badge > 0 && (
              <span className="w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center"
                style={{ background: '#ef4444', color: 'white' }}>{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* Share link */}
      {tab === 'reports' && (
        <div className="rounded-xl px-3.5 py-2.5 flex items-center gap-2.5"
          style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-indigo-600">ลิ้งค์แจ้งเหตุสาธารณะ</p>
            <p className="text-[10px] text-slate-500 truncate font-mono">{window.location.origin}/?report</p>
          </div>
          <button
            onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/?report`)}
            className="text-[10px] font-bold px-2 py-1 rounded-lg transition-all"
            style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>
            คัดลอก
          </button>
        </div>
      )}

      {/* Tab content */}
      {tab === 'reports' ? <ReportsInbox onNewCount={setNewCount} /> : <AlertComposer />}
    </div>
  );
}

/* ── Main AdminView ──────────────────────────────────────────────────────── */
export default function AdminView() {
  const [authed, setAuthed] = useState(false);

  return (
    <div className="absolute inset-0 overflow-y-auto"
      style={{ background: 'linear-gradient(160deg,#fef2f2 0%,#fff1f2 40%,#fdf4ff 100%)' }}>
      <div className="min-h-full flex flex-col justify-center">
        {authed
          ? <Dashboard onLogout={() => setAuthed(false)} />
          : <PinPad onSuccess={() => setAuthed(true)} />
        }
      </div>
    </div>
  );
}
