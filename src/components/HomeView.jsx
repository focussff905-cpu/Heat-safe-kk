import { useState, useEffect, useRef } from 'react';
import { FaWind, FaTint, FaMapMarkerAlt, FaThermometerHalf, FaSun, FaCrosshairs, FaCloudRain } from 'react-icons/fa';
import { getTemperatureColor, getPM25Color, getPM25Level } from '../data/mockData';

function useGeolocationName() {
  const [name, setName]   = useState(null);
  const [state, setState] = useState('idle');

  function request() {
    if (!navigator.geolocation) { setState('error'); return; }
    setState('requesting');
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude, longitude } }) => {
        try {
          const res  = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=th`,
            { headers: { 'Accept-Language': 'th' } }
          );
          const data = await res.json();
          const a    = data.address ?? {};
          const road = a.road ? (a.house_number ? `${a.road} ${a.house_number}` : a.road) : null;
          const best = a.tourism || a.amenity || a.building || a.leisure
                    || a.shop    || a.office  || a.man_made
                    || road
                    || a.neighbourhood || a.suburb
                    || data.display_name?.split(',')[0];
          setName(best ?? 'ตำแหน่งปัจจุบัน');
          setState('ok');
        } catch {
          setName('ตำแหน่งปัจจุบัน');
          setState('ok');
        }
      },
      () => setState('denied'),
      { timeout: 10000, maximumAge: 60000 }
    );
  }

  useEffect(() => { request(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return { name, state, retry: request };
}

function getUVLevel(uv) {
  if (uv <= 2)  return { label: 'ต่ำ',      color: '#10b981', bg: 'linear-gradient(135deg,#d1fae5,#6ee7b7)' };
  if (uv <= 5)  return { label: 'ปานกลาง', color: '#d97706', bg: 'linear-gradient(135deg,#fef3c7,#fde68a)' };
  if (uv <= 7)  return { label: 'สูง',       color: '#ea580c', bg: 'linear-gradient(135deg,#ffedd5,#fdba74)' };
  if (uv <= 10) return { label: 'สูงมาก',   color: '#dc2626', bg: 'linear-gradient(135deg,#fee2e2,#fca5a5)' };
  return               { label: 'อันตราย', color: '#7c3aed', bg: 'linear-gradient(135deg,#ede9fe,#c4b5fd)' };
}

const DAY_TH   = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];
const MONTH_TH = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];

/* ── Animated sun illustration ── */
function SunCloud() {
  return (
    <svg width="88" height="72" viewBox="0 0 88 72" fill="none" aria-hidden="true">
      {/* Sun glow */}
      <circle cx="62" cy="22" r="20" fill="#FDE68A" opacity="0.35" />
      <circle cx="62" cy="22" r="14" fill="#FBBF24" opacity="0.6" />
      <circle cx="62" cy="22" r="9"  fill="#F59E0B" />
      {/* Sun rays */}
      {[0,45,90,135,180,225,270,315].map((deg, i) => {
        const r = (Math.PI * deg) / 180;
        return <line key={i}
          x1={62+Math.cos(r)*12} y1={22+Math.sin(r)*12}
          x2={62+Math.cos(r)*17} y2={22+Math.sin(r)*17}
          stroke="#FCD34D" strokeWidth="2" strokeLinecap="round" />;
      })}
      {/* Cloud */}
      <ellipse cx="26" cy="52" rx="20" ry="13" fill="white" opacity="0.95" />
      <ellipse cx="42" cy="45" rx="18" ry="13" fill="white" opacity="0.9" />
      <ellipse cx="57" cy="53" rx="15" ry="11" fill="white" opacity="0.85" />
      <ellipse cx="40" cy="56" rx="22" ry="10" fill="white" opacity="0.92" />
    </svg>
  );
}

/* ── Radar iframe (scale-to-fit, no distortion) ── */
const RADAR_URL    = 'https://weather.tmd.go.th/kkn240_HQ_Loop_edit2.php';
const RADAR_ORIG_W = 980;
const RADAR_ORIG_H = 780;

function RadarFrame() {
  const wrapRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver(([e]) => {
      setScale(e.contentRect.width / RADAR_ORIG_W);
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={wrapRef} className="w-full overflow-hidden rounded-2xl"
      style={{ height: `${RADAR_ORIG_H * scale}px` }}>
      <iframe
        src={RADAR_URL}
        title="เรดาร์ฝนขอนแก่น"
        scrolling="no"
        loading="lazy"
        style={{
          width:           `${RADAR_ORIG_W}px`,
          height:          `${RADAR_ORIG_H}px`,
          border:          'none',
          transform:       `scale(${scale})`,
          transformOrigin: 'top left',
          display:         'block',
        }}
      />
    </div>
  );
}

/* ── Rain cloud SVG with animated drops ── */
function RainCloud({ rain, prob = 0, isActive }) {
  const intensity = prob <= 0 ? 0 : prob < 30 ? 1 : prob < 70 ? 2 : 3;
  const dropCount = [0, 2, 3, 4][intensity];
  const dur       = ['2s', '2s', '1.4s', '0.9s'][intensity];
  const cloudFill = isActive
    ? 'rgba(255,255,255,0.9)'
    : intensity === 0 ? '#cbd5e1' : intensity === 1 ? '#93c5fd' : intensity === 2 ? '#60a5fa' : '#3b82f6';
  const dropCol   = isActive ? 'rgba(186,230,253,0.9)' : '#3b82f6';
  // 4 possible drop x positions
  const dropXs = [7, 13, 19, 25];

  return (
    <svg width="36" height="30" viewBox="0 0 36 30" fill="none" aria-hidden="true" style={{ overflow: 'visible' }}>
      {/* Cloud */}
      <path
        d="M8 18 Q4 18 4 14 Q4 10 8 10 Q9 6 13 6 Q16 3 20 5 Q24 3 27 7 Q31 7 31 11 Q34 11 34 15 Q34 18 30 18 Z"
        fill={cloudFill}
        style={{ filter: intensity > 0 ? 'drop-shadow(0 2px 4px rgba(59,130,246,0.3))' : 'none' }}
      />
      {/* Animated drops */}
      {dropXs.slice(0, dropCount).map((x, i) => (
        <rect
          key={i}
          x={x} y={18}
          width="2" height="5"
          rx="1"
          fill={dropCol}
          className="rain-drop"
          style={{ animationDuration: dur, animationDelay: `${i * (parseFloat(dur) / dropCount)}s` }}
        />
      ))}
    </svg>
  );
}

/* ── Forecast strip ── */
function ForecastStrip({ forecast, tmdData }) {
  if (!forecast || forecast.length === 0) {
    return (
      <div className="rounded-3xl p-4" style={{
        background: 'linear-gradient(135deg,rgba(255,255,255,0.9),rgba(240,249,255,0.9))',
        border: '1px solid rgba(186,230,253,0.6)',
        backdropFilter: 'blur(12px)',
      }}>
        <p className="text-[10px] font-bold uppercase tracking-widest mb-3"
          style={{ background: 'linear-gradient(90deg,#f97316,#8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          พยากรณ์รายชั่วโมง
        </p>
        <p className="text-xs text-blue-300 animate-pulse text-center py-3">กำลังโหลด...</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl" style={{
      background: 'linear-gradient(135deg,rgba(255,255,255,0.92),rgba(240,249,255,0.88))',
      border: '1px solid rgba(186,230,253,0.5)',
      backdropFilter: 'blur(12px)',
    }}>
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <p className="text-[11px] font-extrabold uppercase tracking-widest"
          style={{ background: 'linear-gradient(90deg,#f97316,#8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          พยากรณ์รายชั่วโมง
        </p>
        <div className="flex items-center gap-1.5 text-[9px] text-slate-400">
          <span className="flex items-center gap-0.5"><FaCloudRain size={7} className="text-blue-400" /> ฝน %</span>
          <span className="flex items-center gap-0.5"><FaThermometerHalf size={7} className="text-orange-400" /> °C</span>
        </div>
      </div>

      <div className="overflow-x-auto pb-3 px-3"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
        <div className="flex gap-1.5" style={{ width: 'max-content' }}>
          {forecast.slice(0, 12).map((h) => {
            const tc   = getTemperatureColor(h.temperature);
            const rain = h.isCurrent && tmdData?.rainfall != null
              ? tmdData.rainfall
              : (h.precipitation ?? 0);
            const prob    = h.precipProbability ?? 0;
            const hasRain = prob > 0;
            return (
              <div key={h.time}
                className="flex-shrink-0 rounded-2xl flex flex-col items-center gap-1 py-2.5 px-1.5"
                style={{
                  width: '56px',
                  background: h.isCurrent
                    ? 'linear-gradient(160deg,#f97316,#db2777,#8b5cf6)'
                    : 'rgba(255,255,255,0.7)',
                  border:    h.isCurrent ? 'none' : '1px solid rgba(186,230,253,0.6)',
                  boxShadow: h.isCurrent ? '0 4px 16px rgba(219,39,119,0.3)' : 'none',
                }}>
                {/* เวลา */}
                <span className="text-[10px] font-bold leading-none"
                  style={{ color: h.isCurrent ? 'rgba(255,255,255,0.8)' : '#94a3b8' }}>
                  {String(h.hour).padStart(2,'0')}:00
                </span>
                {/* ก้อนเมฆจำลองฝน */}
                <RainCloud rain={rain} prob={prob} isActive={h.isCurrent} />
                {/* โอกาสฝน % */}
                <span className="text-[9px] font-bold leading-none -mt-0.5"
                  style={{ color: h.isCurrent ? (hasRain ? '#bae6fd' : 'rgba(255,255,255,0.4)') : (hasRain ? '#2563eb' : '#94a3b8') }}>
                  {prob > 0 ? `${prob}%` : '0%'}
                </span>
                {/* เส้นคั่น */}
                <div className="w-full h-px my-0.5" style={{ background: h.isCurrent ? 'rgba(255,255,255,0.2)' : '#e2e8f0' }} />
                {/* อุณหภูมิ */}
                <span className="text-[17px] font-black leading-none"
                  style={{ color: h.isCurrent ? 'white' : tc }}>
                  {h.temperature}°
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Clothing recommendation ── */
function getClothingAdvice(temp) {
  const t = parseFloat(temp);
  if (t >= 38) return { icon: '🥵', outfit: 'เสื้อผ้าบางมาก สีอ่อน', tip: 'สวมหมวก + ครีมกันแดด หลีกเลี่ยงออกแดด' };
  if (t >= 35) return { icon: '☀️', outfit: 'เสื้อแขนสั้นบาง สีอ่อน', tip: 'สวมหมวกและแว่นกันแดด' };
  if (t >= 32) return { icon: '🌤️', outfit: 'เสื้อแขนสั้ต ระบายอากาศดี', tip: 'หลีกเลี่ยงเสื้อสีเข้ม' };
  if (t >= 28) return { icon: '😊', outfit: 'เสื้อแขนสั้นสบาย', tip: 'อากาศดี เหมาะออกกิจกรรม' };
  if (t >= 24) return { icon: '🌥️', outfit: 'เสื้อแขนสั้น หรือแขนยาวเบา', tip: 'อากาศเย็นสบาย' };
  if (t >= 20) return { icon: '🌬️', outfit: 'เสื้อแขนยาว หรือแจ็กเก็ตบาง', tip: 'เตรียมเสื้อกันหนาวบางไว้' };
  return          { icon: '🧥', outfit: 'เสื้อกันหนาว + แจ็กเก็ต', tip: 'อากาศหนาว ใส่เสื้อหนาหลายชั้น' };
}

/* ── Weather activity assessment (กลางวันอิง temp+UV, กลางคืนอิง temp) ── */
function getWeatherAlert(temp, humidity, uv, pm25, hour) {
  const t      = parseFloat(temp);
  const u      = parseFloat(uv ?? 0);
  const isDay  = hour >= 6 && hour < 18;

  if (isDay) {
    if (t >= 40 || u >= 11)
      return { title: 'อันตรายมาก', desc: 'ห้ามออกแดด เสี่ยงโรคลมแดด',       color: '#ef4444' };
    if (t >= 37 || u >= 8)
      return { title: 'ร้อนจัด',    desc: 'จำกัดเวลากลางแจ้ง ดื่มน้ำมากๆ',  color: '#f97316' };
    if (t >= 34 || u >= 6)
      return { title: 'ร้อน',       desc: 'ทาครีมกันแดด สวมหมวก',            color: '#eab308' };
    if (t >= 30 || u >= 3)
      return { title: 'อุ่น',       desc: 'ดื่มน้ำสม่ำเสมอ',                 color: '#84cc16' };
    if (t >= 25)
      return { title: 'สบาย',       desc: 'เหมาะสำหรับกิจกรรมกลางแจ้ง',     color: '#22c55e' };
    return   { title: 'เย็นสบาย',  desc: 'อากาศดี เหมาะออกกำลังกาย',        color: '#10b981' };
  }

  // กลางคืน — UV ไม่มีผล อิงอุณหภูมิอย่างเดียว
  if (t >= 32)
    return { title: 'คืนร้อนอบอ้าว', desc: 'เปิดแอร์/พัดลม นอนหลับยาก',    color: '#f97316' };
  if (t >= 28)
    return { title: 'คืนร้อน',        desc: 'อากาศอุ่น ดื่มน้ำก่อนนอน',     color: '#eab308' };
  if (t >= 24)
    return { title: 'คืนอุ่น',        desc: 'อากาศพอดี นอนหลับสบาย',        color: '#22c55e' };
  if (t >= 20)
    return { title: 'คืนเย็น',        desc: 'อากาศเย็นสบาย เหมาะพักผ่อน',   color: '#10b981' };
  return     { title: 'คืนหนาว',      desc: 'อากาศเย็น ห่มผ้าเพิ่ม',         color: '#06b6d4' };
}

/* ═══════════════════════════════════════════════
   Main component
   ═══════════════════════════════════════════════ */
export default function HomeView({ tambons, forecast, weatherStatus, lastUpdated, tmdTempMax, tmdTempMin, tmdData, onTambonClick, needsNotifyBanner = false, onEnableNotify }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  const dateStr = `วัน${DAY_TH[now.getDay()]} ${now.getDate()} ${MONTH_TH[now.getMonth()]} ${now.getFullYear() + 543}`;
  const geo     = useGeolocationName();

  if (!tambons || tambons.length === 0) {
    return (
      <div className="absolute top-0 right-0 flex items-center justify-center"
        style={{ left: 'var(--nav-x)', bottom: 'var(--nav-bottom)', background: 'linear-gradient(160deg,#cffafe,#e0e7ff,#fce7f3)' }}>
        <div className="text-indigo-400 text-sm animate-pulse">กำลังโหลดข้อมูล...</div>
      </div>
    );
  }

  /* ── Derived data (fallback from tambons) ── */
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

  /* ── TMD station 48381 overrides (use when available) ── */
  const displayTemp     = tmdData?.temperature != null ? tmdData.temperature.toFixed(1) : avgTemp;
  const displayHumidity = tmdData?.humidity     != null ? Math.round(tmdData.humidity) : avgHumidity;
  const displayWind     = tmdData?.windSpeed    != null ? tmdData.windSpeed.toFixed(1)  : avgWind;
  const displayRainfall = tmdData?.rainfall     != null ? tmdData.rainfall : null;
  const hasTMDLive      = tmdData != null;
  const pm25Color   = getPM25Color(parseFloat(avgPM25));

  const displayMin    = tmdTempMin ?? minTemp;
  const displayMax    = tmdTempMax ?? maxTemp;
  const hasTMD      = tmdTempMax != null && tmdTempMin != null;
  const tempPct     = Math.max(0, Math.min(100, ((parseFloat(displayTemp) - displayMin) / (displayMax - displayMin || 1)) * 100));
  const currentUV   = forecast?.[0]?.uvIndex ?? null;
  const uvLevel     = currentUV !== null ? getUVLevel(currentUV) : null;
  const weatherAlert  = getWeatherAlert(displayTemp, displayHumidity, currentUV, avgPM25, now.getHours());
  const clothingAdvice = getClothingAdvice(displayTemp);

  /* Live dot */
  const dotCfg = {
    loading:    { cls: 'bg-violet-400 animate-pulse', label: 'กำลังโหลด...',  col: '#8b5cf6' },
    refreshing: { cls: 'bg-violet-400 animate-pulse', label: 'กำลังรีเฟรช...', col: '#8b5cf6' },
    ok:         { cls: 'bg-emerald-400 live-dot',     label: 'เรียลไทม์',       col: '#10b981' },
    error:      { cls: 'bg-rose-400',                 label: 'ออฟไลน์',         col: '#f43f5e' },
  }[weatherStatus] ?? { cls: 'bg-slate-400', label: '—', col: '#94a3b8' };

  return (
    <div className="absolute right-0 overflow-y-auto"
      style={{ top: 'var(--nav-top)', left: 'var(--nav-x)', bottom: 'var(--nav-bottom)', background: 'linear-gradient(160deg,#cffafe 0%,#e0e7ff 45%,#fce7f3 100%)' }}>

      <div className="max-w-md md:max-w-4xl lg:max-w-5xl mx-auto px-4 md:px-6 lg:px-8 pt-5 pb-8 space-y-4">

        {/* ── Notification permission banner ── */}
        {needsNotifyBanner && (
          <button
            onClick={onEnableNotify}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 4px 16px rgba(99,102,241,0.35)' }}>
            <span className="text-2xl">🔔</span>
            <div className="flex-1">
              <p className="text-white font-semibold text-sm">เปิดรับการแจ้งเตือนสภาพอากาศ</p>
              <p className="text-indigo-200 text-xs mt-0.5">แตะเพื่อรับแจ้งเตือนเมื่อสภาพอากาศเปลี่ยนแปลง</p>
            </div>
            <span className="text-white text-lg">›</span>
          </button>
        )}

        {/* ══ HEADER ══ */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {/* Location pin chip */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 2px 12px rgba(99,102,241,0.35)' }}>
                <FaMapMarkerAlt size={10} color="white" />
                {geo.state === 'requesting' ? (
                  <span className="text-white text-xs font-semibold animate-pulse">กำลังระบุ...</span>
                ) : geo.state === 'ok' ? (
                  <span className="text-white text-xs font-semibold">{geo.name}</span>
                ) : geo.state === 'denied' ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-white text-xs font-semibold">อ.เมืองขอนแก่น</span>
                    <button onClick={geo.retry} title="ขอตำแหน่ง"
                      className="flex items-center gap-0.5 bg-white/20 hover:bg-white/30 transition-colors rounded-full px-1.5 py-0.5">
                      <FaCrosshairs size={8} color="white" />
                    </button>
                  </div>
                ) : (
                  <span className="text-white text-xs font-semibold">อ.เมืองขอนแก่น</span>
                )}
              </div>
            </div>
            <p className="text-slate-500 text-xs pl-0.5">{dateStr}</p>
          </div>

          {/* Live badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full"
            style={{ background: 'rgba(255,255,255,0.7)', border: `1px solid ${dotCfg.col}30`, backdropFilter: 'blur(8px)' }}>
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotCfg.cls}`} />
            <span className="text-[11px] font-semibold" style={{ color: dotCfg.col }}>{dotCfg.label}</span>
            {lastUpdated && weatherStatus === 'ok' && (
              <span className="text-[10px] text-slate-400">
                · {lastUpdated.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>

        {/* ══ TWO-COLUMN ══ */}
        <div className="md:flex md:gap-4 lg:gap-5 md:items-start">

          {/* ── Left column ── */}
          <div className="md:flex-1 space-y-3">

            {/* Hero temperature card */}
            <div className="rounded-3xl p-5 relative overflow-hidden" style={{
              background: 'linear-gradient(135deg,#0f172a 0%,#1d4ed8 40%,#0891b2 75%,#06b6d4 100%)',
              boxShadow: '0 16px 48px rgba(6,182,212,0.28), 0 4px 16px rgba(0,0,0,0.2)',
            }}>
              {/* Decorative blobs */}
              <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-20"
                style={{ background: 'radial-gradient(circle,#67e8f9,transparent)' }} />
              <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full opacity-15"
                style={{ background: 'radial-gradient(circle,#a78bfa,transparent)' }} />

              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-cyan-200 text-xs font-medium tracking-wide mb-1">
                    {hasTMDLive ? 'สถานีขอนแก่น (กรมอุตุฯ)' : 'อุณหภูมิปัจจุบัน'}
                  </p>
                  <div className="flex items-end gap-1">
                    <span className="text-6xl md:text-7xl font-black text-white leading-none">{displayTemp}</span>
                    <span className="text-2xl font-bold text-cyan-300 mb-2">°C</span>
                  </div>
                  {/* Weather alert — inline, no box */}
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className="text-xs font-black leading-none" style={{ color: weatherAlert.color }}>{weatherAlert.title}</span>
                    <span className="text-[11px] text-white/60 leading-none">· {weatherAlert.desc}</span>
                    {parseFloat(displayTemp) >= 35 && <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.3)', color: '#fca5a5' }}>ร้อนจัด</span>}
                    {parseFloat(displayHumidity) >= 85 && <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(6,182,212,0.3)', color: '#67e8f9' }}>ชื้นมาก</span>}
                    {parseFloat(avgPM25) >= 50 && <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(249,115,22,0.3)', color: '#fdba74' }}>ฝุ่นสูง</span>}
                    {currentUV >= 6 && <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(234,179,8,0.3)', color: '#fde68a' }}>UV สูง</span>}
                  </div>
                  <p className="text-white/40 text-[10px] mt-1.5">
                    {hasTMDLive ? `อัปเดต ${tmdData.observedAt ?? ''}` : `${tambons.length} ตำบล · ขอนแก่น`}
                  </p>
                </div>
                <SunCloud />
              </div>

              {/* Max / Min row */}
              <div className="relative flex gap-4 mt-3 px-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-orange-300 text-xs font-black">↑</span>
                  <div>
                    <p className="text-orange-200/70 text-[9px] leading-none">สูงสุด</p>
                    <p className="text-white text-lg font-black leading-tight">
                      {displayMax != null ? displayMax : '--'}°<span className="text-xs">C</span>
                    </p>
                  </div>
                </div>
                <div className="w-px self-stretch" style={{ background: 'rgba(255,255,255,0.15)' }} />
                <div className="flex items-center gap-1.5">
                  <span className="text-cyan-300 text-xs font-black">↓</span>
                  <div>
                    <p className="text-cyan-200/70 text-[9px] leading-none">ต่ำสุด</p>
                    <p className="text-white text-lg font-black leading-tight">
                      {displayMin != null ? displayMin : '--'}°<span className="text-xs">C</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Clothing advice */}
              <div className="relative mt-3 px-3 py-2.5 rounded-2xl flex items-center gap-2.5"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <span className="text-xl leading-none flex-shrink-0">{clothingAdvice.icon}</span>
                <div className="min-w-0">
                  <p className="text-white text-[11px] font-bold leading-none">👕 {clothingAdvice.outfit}</p>
                  <p className="text-white/55 text-[10px] mt-1 leading-none">{clothingAdvice.tip}</p>
                </div>
              </div>

            </div>

            {/* ── Hourly forecast ── */}
            <ForecastStrip forecast={forecast} tmdData={tmdData} />

            {/* ── 6 stat cards ── */}
            <div className="grid grid-cols-3 gap-2.5">
              {[
                {
                  icon: <FaThermometerHalf color="white" size={13} />,
                  iconBg: 'linear-gradient(135deg,#ef4444,#f97316)',
                  label: 'อุณหภูมิอากาศ',
                  value: displayTemp,
                  unit: '°C',
                },
                {
                  icon: <FaCloudRain color="white" size={13} />,
                  iconBg: 'linear-gradient(135deg,#3b82f6,#2563eb)',
                  label: 'ปริมาณฝนสะสม',
                  value: displayRainfall != null ? displayRainfall : '--',
                  unit: 'mm',
                },
                {
                  icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/>
                  </svg>,
                  iconBg: 'linear-gradient(135deg,#10b981,#059669)',
                  label: 'ความเร็วลม',
                  value: displayWind,
                  unit: 'km/h',
                },
                {
                  icon: <FaTint color="white" size={13} />,
                  iconBg: 'linear-gradient(135deg,#06b6d4,#0891b2)',
                  label: 'ความชื้นสัมพัทธ์',
                  value: displayHumidity,
                  unit: '%',
                  extra: <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(99,102,241,0.12)' }}>
                    <div className="h-full rounded-full" style={{ width: `${displayHumidity}%`, background: 'linear-gradient(90deg,#22d3ee,#6366f1)' }} />
                  </div>,
                },
                {
                  icon: <FaSun color="white" size={13} />,
                  iconBg: uvLevel ? `linear-gradient(135deg,${uvLevel.color}cc,${uvLevel.color})` : 'linear-gradient(135deg,#eab308,#ca8a04)',
                  label: 'UV Index',
                  value: currentUV ?? '--',
                  unit: uvLevel?.label ?? '',
                },
                {
                  icon: <FaWind color="white" size={13} />,
                  iconBg: 'linear-gradient(135deg,#f97316,#fb923c)',
                  label: 'ฝุ่น PM2.5',
                  value: avgPM25,
                  unit: 'µg/m³',
                  extra: <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: `${pm25Color}20`, color: pm25Color, border: `1px solid ${pm25Color}40` }}>
                    {pm25Level.label}
                  </span>,
                },
              ].map(({ icon, iconBg, label, value, unit, extra }) => (
                <div key={label} className="rounded-2xl p-3 flex flex-col items-center gap-1.5" style={{
                  background: 'rgba(255,255,255,0.6)',
                  border: '1px solid rgba(186,230,253,0.55)',
                  backdropFilter: 'blur(12px)',
                  boxShadow: '0 2px 12px rgba(99,102,241,0.07)',
                }}>
                  <div className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: iconBg, boxShadow: '0 3px 10px rgba(0,0,0,0.15)' }}>
                    {icon}
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium leading-none text-center">{label}</p>
                  <p className="text-xl font-black text-slate-700 leading-none">{value}</p>
                  <p className="text-[9px] text-slate-400 leading-none">{unit}</p>
                  {extra}
                </div>
              ))}
            </div>

            {/* ── Radar ── */}
            <div className="rounded-3xl overflow-hidden" style={{
              background: 'linear-gradient(145deg,#0f172a,#1e1b4b,#0c1a3a)',
              boxShadow: '0 20px 60px rgba(6,182,212,0.2), 0 4px 16px rgba(0,0,0,0.3)',
            }}>
              <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                      style={{ background: '#22d3ee' }} />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5"
                      style={{ background: '#06b6d4' }} />
                  </span>
                  <div>
                    <p className="text-[13px] font-extrabold tracking-wide text-white leading-none">เรดาร์ฝนขอนแก่น</p>
                    <p className="text-[9px] text-cyan-400/70 mt-0.5 leading-none">Khon Kaen Doppler Radar · TMD</p>
                  </div>
                </div>
                <a href="https://weather.tmd.go.th/kkn240_HQ_Loop_edit2.php"
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-semibold transition-all hover:scale-105"
                  style={{ background: 'rgba(34,211,238,0.15)', border: '1px solid rgba(34,211,238,0.3)', color: '#67e8f9' }}>
                  เต็มจอ
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                </a>
              </div>
              <div className="px-4 pb-5">
                <div className="rounded-2xl overflow-hidden" style={{
                  boxShadow: '0 0 0 1px rgba(34,211,238,0.2), 0 8px 32px rgba(0,0,0,0.4)',
                }}>
                  <RadarFrame />
                </div>
              </div>
            </div>

          </div>

          {/* ── Right column: tambon list ── */}
          <div className="mt-3 md:mt-0 md:w-72 lg:w-80 md:flex-shrink-0 md:sticky md:top-0">
            <div className="flex items-center gap-2 mb-2.5">
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg,#6366f1,transparent)' }} />
              <p className="text-[10px] font-extrabold uppercase tracking-widest px-1"
                style={{ background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {tambons.length} ตำบล
              </p>
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg,transparent,#8b5cf6)' }} />
            </div>

            <div className="space-y-1.5 md:max-h-[calc(100dvh-180px)] md:overflow-y-auto md:pr-1">
              {[...tambons].sort((a,b) => b.temperature - a.temperature).map((d, idx) => {
                const tc = getTemperatureColor(d.temperature);
                const pc = getPM25Color(d.pm25);
                return (
                  <div key={d.id}
                    className="rounded-2xl px-3 py-2.5 flex items-center gap-2.5 transition-transform hover:scale-[1.01] cursor-pointer active:scale-[0.98]"
                    style={{
                      background: 'rgba(255,255,255,0.75)',
                      border: `1px solid ${tc}30`,
                      backdropFilter: 'blur(8px)',
                      boxShadow: idx === 0 ? `0 4px 16px ${tc}18` : 'none',
                    }}
                    onClick={() => onTambonClick?.(d)}>
                    {/* Temp badge */}
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `linear-gradient(135deg,${tc}22,${tc}44)`, border: `1.5px solid ${tc}50` }}>
                      <span className="text-xs font-black" style={{ color: tc }}>{d.temperature}°</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-700 truncate">ต.{d.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[9px] text-slate-400 flex items-center gap-0.5">
                          <FaTint size={7} className="text-cyan-400" />{d.humidity}%
                        </span>
                        <span className="text-[9px] text-slate-300">·</span>
                        <span className="text-[9px] font-semibold" style={{ color: pc }}>PM{d.pm25}µg</span>
                        <span className="text-[9px] text-slate-300">·</span>
                        <span className="text-[9px] text-slate-400">{d.windSpeed}km</span>
                      </div>
                    </div>
                    {/* Rank dot for top 3 */}
                    {idx < 3 && (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-black text-white"
                        style={{ background: ['linear-gradient(135deg,#f59e0b,#d97706)', 'linear-gradient(135deg,#94a3b8,#64748b)', 'linear-gradient(135deg,#cd7c2f,#92400e)'][idx] }}>
                        {idx + 1}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>



      </div>
    </div>
  );
}
