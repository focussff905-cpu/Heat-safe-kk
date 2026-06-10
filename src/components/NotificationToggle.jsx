import { usePushNotifications } from '../hooks/usePushNotifications';

const SCHEDULE_LABEL = 'สรุป 7:00·10:00·12:00·13:00·16:00·19:00 · แจ้งทันทีเมื่อ UV/ฝุ่น/อุณหภูมิเกินเกณฑ์';

export default function NotificationToggle() {
  const { supported, permission, subscribed, loading, toggle } = usePushNotifications();

  if (!supported) return null;

  const denied = permission === 'denied';

  return (
    <div
      className="rounded-2xl px-4 py-3 flex items-center gap-3"
      style={{
        background: 'rgba(255,255,255,0.6)',
        border: '1px solid rgba(186,230,253,0.55)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Bell icon */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{
          background: subscribed
            ? 'linear-gradient(135deg,#38bdf8,#0ea5e9)'
            : 'rgba(148,163,184,0.15)',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke={subscribed ? 'white' : '#94a3b8'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          {subscribed && <line x1="1" y1="1" x2="23" y2="23" stroke="none"/>}
        </svg>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-700 leading-tight">
          แจ้งเตือนสภาพอากาศ
        </p>
        <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
          {denied
            ? '⚠️ บล็อกการแจ้งเตือนไว้ — เปิดใน Settings ของเบราว์เซอร์'
            : subscribed
            ? `✓ เปิดอยู่ · ${SCHEDULE_LABEL}`
            : SCHEDULE_LABEL}
        </p>
      </div>

      {/* Toggle */}
      {!denied && (
        <button
          onClick={toggle}
          disabled={loading}
          className="flex-shrink-0 relative transition-all duration-200"
          style={{ width: 44, height: 24 }}
        >
          <div
            className="absolute inset-0 rounded-full transition-all duration-200"
            style={{ background: subscribed ? '#0ea5e9' : 'rgba(148,163,184,0.3)' }}
          />
          <div
            className="absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200"
            style={{ left: subscribed ? 24 : 4, opacity: loading ? 0.5 : 1 }}
          />
        </button>
      )}
    </div>
  );
}
