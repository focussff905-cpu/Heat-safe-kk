import { FaWind, FaTint, FaMapMarkerAlt, FaThermometerHalf } from 'react-icons/fa';
import { getTemperatureColor, getPM25Color, getPM25Level } from '../data/mockData';

const DAY_TH   = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];
const MONTH_TH = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];

/* ── Live status dot ── */
function LiveDot({ status, lastUpdated }) {
  const cfg = {
    loading:    { cls: 'bg-blue-400 animate-pulse', label: 'กำลังโหลด...' },
    refreshing: { cls: 'bg-blue-400 animate-pulse', label: 'กำลังรีเฟรช...' },
    ok:         { cls: 'bg-emerald-400 live-dot',   label: 'เรียลไทม์' },
    error:      { cls: 'bg-red-400',                label: 'ออฟไลน์' },
  }[status] ?? { cls: 'bg-slate-400', label: '—' };
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full inline-block flex-shrink-0 ${cfg.cls}`} />
      <span className="text-xs text-blue-700/70">{cfg.label}</span>
      {lastUpdated && status === 'ok' && (
        <span className="text-[10px] text-blue-300 ml-1">
          · {lastUpdated.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
    </div>
  );
}

/* ── Weather illustration ── */
function WeatherIllustration() {
  return (
    <svg width="72" height="60" viewBox="0 0 72 60" fill="none" aria-hidden="true">
      <circle cx="50" cy="18" r="16" fill="#FEF3C7" opacity="0.5" />
      <circle cx="50" cy="18" r="11" fill="#FDE68A" />
      {[0,45,90,135,180,225,270,315].map((deg, i) => {
        const r = (Math.PI * deg) / 180;
        return <line key={i} x1={50+Math.cos(r)*14} y1={18+Math.sin(r)*14} x2={50+Math.cos(r)*18} y2={18+Math.sin(r)*18} stroke="#FBBF24" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />;
      })}
      <ellipse cx="20" cy="42" rx="17" ry="11" fill="white" opacity="0.92" />
      <ellipse cx="34" cy="36" rx="15" ry="11" fill="white" opacity="0.88" />
      <ellipse cx="47" cy="43" rx="13" ry="9"  fill="white" opacity="0.84" />
    </svg>
  );
}

/* ── Hourly forecast strip ── */
function ForecastStrip({ forecast }) {
  if (!forecast || forecast.length === 0) {
    return (
      <div className="rounded-3xl bg-white p-4" style={{ border: '1px solid #e0eaff' }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">พยากรณ์รายชั่วโมง</p>
        </div>
        <p className="text-xs text-blue-300 animate-pulse text-center py-3">กำลังโหลดข้อมูลพยากรณ์...</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-white" style={{ border: '1px solid #e0eaff', overflow: 'hidden' }}>
      {/* Header */}
      <div className="px-4 pt-3.5 pb-2 flex items-center justify-between">
        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">
          พยากรณ์รายชั่วโมง
        </p>
        <p className="text-[9px] text-slate-400">24 ชั่วโมงข้างหน้า · ขอนแก่น</p>
      </div>

      {/* Legend row */}
      <div className="px-4 pb-2 flex items-center gap-3 text-[9px] text-slate-400">
        <span className="flex items-center gap-0.5"><FaThermometerHalf size={8} className="text-orange-300" /> อุณหภูมิ</span>
        <span className="flex items-center gap-0.5"><FaWind size={8} className="text-green-400" /> PM2.5</span>
        <span className="flex items-center gap-0.5"><FaTint size={8} className="text-blue-400" /> ความชื้น</span>
        <span>· ลม</span>
      </div>

      {/* Scrollable cards */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-4"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {forecast.map((h) => {
          const tc = getTemperatureColor(h.temperature);
          const pc = getPM25Color(h.pm25);
          return (
            <div key={h.time}
              className="flex-shrink-0 rounded-2xl flex flex-col items-center gap-1.5 pt-2.5 pb-2 px-1.5"
              style={{
                width: '64px',
                background: h.isCurrent ? 'linear-gradient(160deg,#3b82f6,#1d4ed8)' : '#f8faff',
                border:     h.isCurrent ? '1.5px solid #2563eb' : '1px solid #e8f0ff',
                boxShadow:  h.isCurrent ? '0 4px 16px rgba(59,130,246,0.28)' : 'none',
              }}>
              {h.dateLabel && (
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full leading-none"
                  style={{ background: h.isCurrent ? 'rgba(255,255,255,0.2)' : '#dbeafe', color: h.isCurrent ? 'white' : '#3b82f6' }}>
                  วันถัดไป
                </span>
              )}
              <span className="text-[11px] font-bold leading-none" style={{ color: h.isCurrent ? '#bfdbfe' : '#94a3b8' }}>
                {String(h.hour).padStart(2,'0')}:00
              </span>
              <span className="text-[15px] font-black leading-none" style={{ color: h.isCurrent ? 'white' : tc }}>
                {h.temperature}°
              </span>
              <div className="w-full h-px" style={{ background: h.isCurrent ? 'rgba(255,255,255,0.2)' : '#e0eaff' }} />
              <span className="text-[9px] font-semibold leading-none" style={{ color: h.isCurrent ? '#bfdbfe' : pc }}>
                {h.pm25}µg
              </span>
              <span className="text-[9px] leading-none" style={{ color: h.isCurrent ? '#bfdbfe' : '#60a5fa' }}>
                {h.humidity}%
              </span>
              <span className="text-[9px] leading-none" style={{ color: h.isCurrent ? '#bfdbfe' : '#94a3b8' }}>
                {h.windSpeed}km
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Main component
   ══════════════════════════════════════════════════════════════ */
export default function HomeView({ tambons, forecast, weatherStatus, lastUpdated }) {
  const now     = new Date();
  const dateStr = `วัน${DAY_TH[now.getDay()]} ${now.getDate()} ${MONTH_TH[now.getMonth()]} ${now.getFullYear() + 543}`;

  if (!tambons || tambons.length === 0) {
    return (
      <div className="absolute top-0 right-0 bottom-0 flex items-center justify-center"
        style={{ left: 'var(--nav-x)', background: 'linear-gradient(180deg,#eff6ff,#f8faff)' }}>
        <div className="text-blue-300 text-sm animate-pulse">กำลังโหลดข้อมูล...</div>
      </div>
    );
  }

  /* ── Derived averages ── */
  const temps  = tambons.map(d => d.temperature);
  const pm25s  = tambons.map(d => d.pm25);
  const humids = tambons.map(d => d.humidity ?? 0);
  const winds  = tambons.map(d => d.windSpeed ?? 0);

  const avgTemp     = (temps.reduce((s,v)=>s+v,0) / temps.length).toFixed(1);
  const minTemp     = Math.min(...temps);
  const maxTemp     = Math.max(...temps);
  const avgPM25     = (pm25s.reduce((s,v)=>s+v,0) / pm25s.length).toFixed(1);
  const avgHumidity = Math.round(humids.reduce((s,v)=>s+v,0) / humids.length);
  const avgWind     = (winds.reduce((s,v)=>s+v,0) / winds.length).toFixed(1);
  const pm25Level   = getPM25Level(parseFloat(avgPM25));
  const pm25Color   = getPM25Color(parseFloat(avgPM25));
  const tempPct     = Math.max(0, Math.min(100, ((parseFloat(avgTemp) - minTemp) / (maxTemp - minTemp || 1)) * 100));

  return (
    <div className="absolute top-0 right-0 bottom-0 overflow-y-auto"
      style={{ left: 'var(--nav-x)', background: 'linear-gradient(180deg,#eff6ff,#f8faff)' }}>

      <div className="max-w-md md:max-w-5xl mx-auto px-4 md:px-8 pt-5 pb-[76px] md:pb-10 space-y-4">

        {/* ══ HEADER (full width) ══ */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <FaMapMarkerAlt className="text-blue-500" size={12} />
              <span className="text-blue-700 text-sm font-bold">อ.เมืองขอนแก่น</span>
            </div>
            <p className="text-blue-400 text-xs">{dateStr}</p>
          </div>
          <LiveDot status={weatherStatus} lastUpdated={lastUpdated} />
        </div>

        {/* ══ TWO-COLUMN: hero+stats | tambon list ══ */}
        <div className="md:flex md:gap-5 md:items-start">

          {/* Left — hero card + 3 stats */}
          <div className="md:flex-1 space-y-3">

            {/* Hero temperature card */}
            <div className="rounded-3xl p-4 md:p-5" style={{
              background: 'linear-gradient(135deg,#dbeafe 0%,#bfdbfe 55%,#93c5fd 100%)',
              border: '1px solid rgba(147,197,253,0.5)',
              boxShadow: '0 8px 32px rgba(59,130,246,0.14)',
            }}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-blue-600/80 text-xs font-medium mb-1">อุณหภูมิเฉลี่ย</p>
                  <div className="flex items-end gap-2">
                    <span className="text-5xl md:text-6xl font-black text-blue-900 leading-none">{avgTemp}</span>
                    <span className="text-xl md:text-2xl font-bold text-blue-700 mb-1">°C</span>
                  </div>
                  <p className="text-blue-600/70 text-xs mt-1">{tambons.length} ตำบล · อ.เมืองขอนแก่น</p>
                </div>
                <WeatherIllustration />
              </div>
              {/* Min/Max range bar */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-blue-600/80 mb-1.5">
                  <span>ต่ำสุด {minTemp}°C</span>
                  <span>สูงสุด {maxTemp}°C</span>
                </div>
                <div className="h-2 rounded-full bg-blue-200/50 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: '100%', background: 'linear-gradient(90deg,#60a5fa,#fb923c,#ef4444)', opacity: 0.8 }} />
                </div>
                <div className="relative h-0">
                  <div className="absolute -top-3.5 w-3 h-3 rounded-full bg-white border-2 border-blue-500 shadow"
                    style={{ left: `calc(${tempPct}% - 6px)` }} />
                </div>
              </div>
            </div>

            {/* 3 stat cards */}
            <div className="grid grid-cols-3 gap-2 md:gap-3">
              {/* PM2.5 */}
              <div className="rounded-2xl md:rounded-3xl p-2.5 md:p-3 bg-white flex flex-col items-center gap-1"
                style={{ border: `1.5px solid ${pm25Color}30`, boxShadow: `0 4px 16px ${pm25Color}12` }}>
                <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl md:rounded-2xl flex items-center justify-center" style={{ background: `${pm25Color}15` }}>
                  <FaWind style={{ color: pm25Color }} size={14} />
                </div>
                <p className="text-[9px] md:text-[10px] text-slate-400 leading-none">ฝุ่น PM2.5</p>
                <p className="text-base md:text-lg font-black text-slate-800 leading-none">{avgPM25}</p>
                <p className="text-[8px] md:text-[9px] leading-none" style={{ color: pm25Color }}>µg/m³</p>
                <span className="text-[8px] md:text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: `${pm25Color}15`, color: pm25Color }}>{pm25Level.label}</span>
              </div>

              {/* Humidity */}
              <div className="rounded-2xl md:rounded-3xl p-2.5 md:p-3 bg-white flex flex-col items-center gap-1"
                style={{ border: '1.5px solid #bfdbfe', boxShadow: '0 4px 16px rgba(59,130,246,0.08)' }}>
                <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl md:rounded-2xl flex items-center justify-center" style={{ background: '#eff6ff' }}>
                  <FaTint className="text-blue-400" size={14} />
                </div>
                <p className="text-[9px] md:text-[10px] text-slate-400 leading-none">ความชื้น</p>
                <p className="text-base md:text-lg font-black text-slate-800 leading-none">{avgHumidity}</p>
                <p className="text-[8px] md:text-[9px] text-blue-400 leading-none">%</p>
                <div className="w-full h-1.5 rounded-full bg-blue-100 overflow-hidden">
                  <div className="h-full rounded-full bg-blue-400" style={{ width: `${avgHumidity}%` }} />
                </div>
              </div>

              {/* Wind */}
              <div className="rounded-2xl md:rounded-3xl p-2.5 md:p-3 bg-white flex flex-col items-center gap-1"
                style={{ border: '1.5px solid #e0eaff', boxShadow: '0 4px 16px rgba(59,130,246,0.06)' }}>
                <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl md:rounded-2xl flex items-center justify-center" style={{ background: '#f0f7ff' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round">
                    <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/>
                  </svg>
                </div>
                <p className="text-[9px] md:text-[10px] text-slate-400 leading-none">ลม</p>
                <p className="text-base md:text-lg font-black text-slate-800 leading-none">{avgWind}</p>
                <p className="text-[8px] md:text-[9px] text-slate-400 leading-none">km/h</p>
              </div>
            </div>
          </div>

          {/* Right — tambon list */}
          <div className="mt-3 md:mt-0 md:w-72 lg:w-80 md:flex-shrink-0">
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">
              ข้อมูลรายตำบล ({tambons.length} ตำบล)
            </p>
            {/* On desktop: fixed-height scrollable list; on mobile: full list */}
            <div className="space-y-1.5 md:space-y-2 md:max-h-[420px] lg:max-h-[480px] md:overflow-y-auto md:pr-1">
              {[...tambons].sort((a,b) => b.temperature - a.temperature).map(d => {
                const tc = getTemperatureColor(d.temperature);
                const pc = getPM25Color(d.pm25);
                return (
                  <div key={d.id}
                    className="rounded-xl md:rounded-2xl px-3 md:px-4 py-2.5 md:py-3 bg-white flex items-center gap-2.5 md:gap-3"
                    style={{ border: '1px solid #e8f0ff' }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${tc}15`, border: `1.5px solid ${tc}30` }}>
                      <span className="text-[11px] font-black leading-none" style={{ color: tc }}>{d.temperature}°</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs md:text-sm font-semibold text-slate-700 truncate">ต.{d.name}</p>
                      <div className="flex items-center gap-1.5 md:gap-2 mt-0.5">
                        <span className="text-[9px] md:text-[10px] text-slate-400 flex items-center gap-0.5">
                          <FaTint size={7} className="text-blue-300" />{d.humidity}%
                        </span>
                        <span className="text-[9px] text-slate-300">·</span>
                        <span className="text-[9px] md:text-[10px]" style={{ color: pc }}>PM{d.pm25}µg</span>
                        <span className="text-[9px] text-slate-300">·</span>
                        <span className="text-[9px] md:text-[10px] text-slate-400">{d.windSpeed}km</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>{/* ════ END TWO-COLUMN ════ */}

        {/* ══ FORECAST STRIP (full width, below both columns) ══ */}
        <ForecastStrip forecast={forecast} />

      </div>
    </div>
  );
}
