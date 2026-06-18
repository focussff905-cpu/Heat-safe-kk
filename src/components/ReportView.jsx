import { useState } from 'react';

const REPORT_TYPES = [
  { id: 'heat',    label: 'ความร้อนผิดปกติ', emoji: '🌡️' },
  { id: 'dust',    label: 'ฝุ่นควันหนาแน่น',  emoji: '💨' },
  { id: 'fire',    label: 'ไฟป่า/เผาไร่',     emoji: '🔥' },
  { id: 'flood',   label: 'น้ำท่วมขัง',        emoji: '🌊' },
  { id: 'other',   label: 'อื่นๆ',             emoji: '📋' },
];

const LS_KEY = 'kkmap_reports';

function saveReport(report) {
  const existing = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  existing.unshift(report);
  localStorage.setItem(LS_KEY, JSON.stringify(existing));
}

export default function ReportView() {
  const [type,     setType]     = useState('');
  const [location, setLocation] = useState('');
  const [detail,   setDetail]   = useState('');
  const [name,     setName]     = useState('');
  const [phone,    setPhone]    = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const canSubmit = type && location.trim() && detail.trim();

  const handleSubmit = () => {
    if (!canSubmit || loading) return;
    setError('');
    setLoading(true);
    try {
      saveReport({
        id:          Date.now(),
        type,
        typeLabel:   REPORT_TYPES.find(t => t.id === type)?.label ?? type,
        typeEmoji:   REPORT_TYPES.find(t => t.id === type)?.emoji ?? '📋',
        location:    location.trim(),
        detail:      detail.trim(),
        name:        name.trim() || 'ไม่ระบุ',
        phone:       phone.trim() || 'ไม่ระบุ',
        createdAt:   new Date().toISOString(),
        status:      'new',
      });
      setSubmitted(true);
    } catch {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  const handleAgain = () => {
    setType(''); setLocation(''); setDetail(''); setName(''); setPhone('');
    setSubmitted(false); setError('');
  };

  /* ── Success screen ── */
  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
        style={{ background: 'linear-gradient(160deg,#f0fdf4 0%,#ecfdf5 60%,#f8faff 100%)' }}>
        <div className="w-full max-w-sm text-center space-y-5">
          <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center text-4xl"
            style={{ background: 'rgba(16,185,129,0.12)', border: '2px solid rgba(16,185,129,0.3)' }}>
            ✓
          </div>
          <div>
            <p className="text-xl font-black text-slate-800">แจ้งเหตุสำเร็จ</p>
            <p className="text-sm text-slate-500 mt-1">ข้อมูลของคุณถูกส่งไปยังเจ้าหน้าที่แล้ว ขอบคุณที่ช่วยดูแลชุมชน</p>
          </div>
          <div className="rounded-2xl p-4 text-left space-y-1"
            style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
            <p className="text-xs text-emerald-700 font-semibold">
              {REPORT_TYPES.find(t => t.id === type)?.emoji} {REPORT_TYPES.find(t => t.id === type)?.label}
            </p>
            <p className="text-sm text-slate-700 font-medium">📍 {location}</p>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={handleAgain}
              className="w-full py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white', boxShadow: '0 6px 20px rgba(16,185,129,0.35)' }}>
              แจ้งเหตุอีกครั้ง
            </button>
            <a href="/"
              className="w-full py-3.5 rounded-2xl text-sm font-bold text-center transition-all active:scale-95 block"
              style={{ background: 'white', color: '#475569', border: '1.5px solid #e0eaff' }}>
              กลับหน้าหลัก
            </a>
          </div>
        </div>
      </div>
    );
  }

  /* ── Form ── */
  return (
    <div className="min-h-screen overflow-y-auto"
      style={{ background: 'linear-gradient(160deg,#fff7ed 0%,#fef3c7 30%,#f8faff 100%)' }}>
      <div className="max-w-md mx-auto px-4 pt-8 pb-12 space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <a href="/" className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-white/60"
            style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid #e0eaff' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
          </a>
          <div>
            <p className="font-black text-slate-800 text-lg leading-tight">แจ้งเหตุ</p>
            <p className="text-xs text-slate-400">ระบบติดตามสภาพแวดล้อม จ.ขอนแก่น</p>
          </div>
        </div>

        {/* Type selector */}
        <div>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2">ประเภทเหตุการณ์ <span className="text-red-400">*</span></p>
          <div className="grid grid-cols-2 gap-2">
            {REPORT_TYPES.map(t => (
              <button
                key={t.id}
                onClick={() => setType(t.id)}
                className="flex items-center gap-2.5 px-3.5 py-3 rounded-2xl text-left transition-all active:scale-95"
                style={{
                  background: type === t.id ? 'rgba(251,146,60,0.12)' : 'white',
                  border:     `1.5px solid ${type === t.id ? '#fb923c' : '#e0eaff'}`,
                  boxShadow:  type === t.id ? '0 0 0 3px rgba(251,146,60,0.12)' : 'none',
                }}>
                <span className="text-lg leading-none">{t.emoji}</span>
                <span className="text-sm font-medium leading-tight" style={{ color: type === t.id ? '#c2410c' : '#475569' }}>
                  {t.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Location */}
        <div>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">สถานที่เกิดเหตุ <span className="text-red-400">*</span></p>
          <input
            type="text"
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="เช่น ถนนมิตรภาพ หน้าเซ็นทรัลขอนแก่น"
            className="w-full px-4 py-3 rounded-2xl text-sm outline-none"
            style={{
              background: 'white',
              border:     `1.5px solid ${location ? '#fb923c60' : '#e0eaff'}`,
              fontFamily: 'Noto Sans Thai, sans-serif',
              color: '#1e293b',
            }}
          />
        </div>

        {/* Detail */}
        <div>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">รายละเอียด <span className="text-red-400">*</span></p>
          <textarea
            value={detail}
            onChange={e => setDetail(e.target.value)}
            placeholder="อธิบายสิ่งที่พบ เช่น อุณหภูมิสูงมาก ผู้คนหน้ามืด มีควันสีดำ..."
            rows={4}
            maxLength={300}
            className="w-full px-4 py-3 rounded-2xl text-sm outline-none resize-none"
            style={{
              background: 'white',
              border:     `1.5px solid ${detail ? '#fb923c60' : '#e0eaff'}`,
              fontFamily: 'Noto Sans Thai, sans-serif',
              color: '#1e293b',
              lineHeight: 1.6,
            }}
          />
          <p className="text-[10px] text-slate-400 text-right mt-0.5">{detail.length}/300</p>
        </div>

        {/* Optional fields */}
        <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid #e0eaff' }}>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">ข้อมูลผู้แจ้ง (ไม่บังคับ)</p>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="ชื่อ-นามสกุล"
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'white', border: '1.5px solid #e0eaff', fontFamily: 'Noto Sans Thai, sans-serif', color: '#1e293b' }}
          />
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="เบอร์โทรติดต่อกลับ"
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'white', border: '1.5px solid #e0eaff', color: '#1e293b' }}
          />
        </div>

        {error && (
          <div className="rounded-xl px-4 py-3 text-sm font-semibold text-center"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.25)' }}>
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || loading}
          className="w-full py-4 rounded-2xl text-white font-black text-sm transition-all active:scale-95"
          style={{
            background: canSubmit && !loading
              ? 'linear-gradient(135deg,#f97316,#ef4444)'
              : 'rgba(148,163,184,0.4)',
            boxShadow: canSubmit && !loading ? '0 8px 24px rgba(249,115,22,0.35)' : 'none',
            cursor: canSubmit && !loading ? 'pointer' : 'not-allowed',
          }}>
          {loading ? '⏳ กำลังส่ง...' : '📢 ส่งการแจ้งเหตุ'}
        </button>

        <p className="text-[10px] text-slate-400 text-center">
          ข้อมูลที่ส่งจะถูกส่งตรงถึงเจ้าหน้าที่ผู้รับผิดชอบ
        </p>
      </div>
    </div>
  );
}
