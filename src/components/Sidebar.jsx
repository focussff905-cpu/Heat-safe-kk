import { useState, useRef, useEffect, useCallback } from 'react';
import {
  FaThermometerHalf, FaWind, FaFireAlt, FaSun, FaSearch, FaChevronLeft,
  FaChevronRight, FaTimes, FaMapMarkerAlt, FaTint, FaLeaf, FaEye,
  FaEyeSlash, FaWater, FaSatelliteDish, FaSatellite,
} from 'react-icons/fa';
import {
  layerInfo, getTemperatureColor, getPM25Color, getPM25Level,
  getHeatColor, getHeatLevel,
} from '../data/mockData';

const LAYER_BUTTONS = [
  { id: 'temperature', label: 'อุณหภูมิ',               icon: FaThermometerHalf, activeBg: 'rgba(249,115,22,0.10)',  activeBorder: 'rgba(249,115,22,0.4)',  iconColor: '#FB923C' },
  { id: 'pm25',        label: 'ฝุ่น PM2.5',              icon: FaWind,            activeBg: 'rgba(34,197,94,0.10)',   activeBorder: 'rgba(34,197,94,0.4)',   iconColor: '#22C55E' },
  { id: 'heat',        label: 'การสะสมความร้อน',         icon: FaFireAlt,         activeBg: 'rgba(239,68,68,0.10)',   activeBorder: 'rgba(239,68,68,0.4)',   iconColor: '#EF4444' },
  { id: 'stream',      label: 'ร่องน้ำ',                 icon: FaWater,           activeBg: 'rgba(14,165,233,0.10)',  activeBorder: 'rgba(14,165,233,0.4)',  iconColor: '#0EA5E9' },
  { id: 'monthly_temp',label: 'อุณหภูมิ MODIS รายเดือน', icon: FaSatelliteDish,   activeBg: 'rgba(139,92,246,0.10)', activeBorder: 'rgba(139,92,246,0.4)', iconColor: '#8B5CF6' },
  { id: 'hotspot',     label: 'จุดความร้อนสูง',          icon: FaSun,             activeBg: 'rgba(255,80,0,0.10)',   activeBorder: 'rgba(255,80,0,0.4)',   iconColor: '#FF5000' },
  { id: 'himawari',   label: 'ภาพ Himawari-9 AHI',      icon: FaSatellite,       activeBg: 'rgba(8,145,178,0.10)',  activeBorder: 'rgba(8,145,178,0.4)', iconColor: '#0891b2' },
];

/* ── Weather illustration SVG ── */
function WeatherIllustration() {
  return (
    <svg width="72" height="60" viewBox="0 0 72 60" fill="none" aria-hidden="true">
      <circle cx="50" cy="20" r="16" fill="#FEF3C7" opacity="0.5" />
      <circle cx="50" cy="20" r="11" fill="#FDE68A" />
      {[0,45,90,135,180,225,270,315].map((deg, i) => {
        const r = Math.PI * deg / 180;
        return <line key={i} x1={50+Math.cos(r)*14} y1={20+Math.sin(r)*14} x2={50+Math.cos(r)*18} y2={20+Math.sin(r)*18} stroke="#FBBF24" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />;
      })}
      <ellipse cx="22" cy="42" rx="18" ry="11" fill="white" opacity="0.92" />
      <ellipse cx="37" cy="37" rx="15" ry="11" fill="white" opacity="0.88" />
      <ellipse cx="51" cy="43" rx="13" ry="9"  fill="white" opacity="0.84" />
    </svg>
  );
}

/* ── Live badge ── */
function LiveBadge({ status, lastUpdated, onRefresh }) {
  const timeStr = lastUpdated?.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  const dot = {
    loading:    { cls: 'bg-blue-400 animate-pulse', shadow: '' },
    refreshing: { cls: 'bg-blue-400 animate-pulse', shadow: '' },
    ok:         { cls: 'bg-emerald-400 live-dot',   shadow: '0 0 6px #34d399' },
    error:      { cls: 'bg-red-400',                shadow: '0 0 6px #f87171' },
  }[status] ?? { cls: 'bg-slate-400', shadow: '' };
  return (
    <div className="flex items-center gap-1.5 text-xs text-blue-700/70">
      <span className={`w-2 h-2 rounded-full inline-block flex-shrink-0 ${dot.cls}`} style={{ boxShadow: dot.shadow }} />
      <span className="flex-1 truncate">
        {status === 'loading'    && 'กำลังโหลดข้อมูล...'}
        {status === 'refreshing' && 'กำลังรีเฟรช...'}
        {status === 'ok'         && `เรียลไทม์ · ${timeStr}`}
        {status === 'error'      && 'โหลดไม่สำเร็จ'}
      </span>
      <button onClick={onRefresh} disabled={status === 'loading' || status === 'refreshing'}
        className="p-0.5 rounded text-blue-400 hover:text-blue-600 transition-colors disabled:opacity-40">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
        </svg>
      </button>
    </div>
  );
}

/* ── Layer legend ── */
function LayerLegend({ layer }) {
  const info = layerInfo[layer];
  return (
    <div className="space-y-1.5">
      {info.legend.map(item => (
        <div key={item.label} className="flex items-center gap-2.5">
          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color, boxShadow: `0 0 5px ${item.color}50` }} />
          <span className="text-xs text-slate-600 flex-1">{item.label}</span>
          <span className="text-xs text-slate-400">{item.desc}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Layer ranking ── */
function LayerRanking({ tambons, field, unit, colorFn, hiLabel, loLabel, decimals = 1 }) {
  if (!tambons?.length) return null;
  const sorted = [...tambons].sort((a, b) => b[field] - a[field]);
  const max = sorted[0][field], min = sorted[sorted.length - 1][field];
  const avg = tambons.reduce((s, d) => s + d[field], 0) / tambons.length;
  const fmt = v => Number(v).toFixed(decimals);
  return (
    <div className="mt-3 space-y-2">
      <div className="grid grid-cols-3 gap-1.5">
        {[['สูงสุด',fmt(max)+unit,'#ef4444'],['เฉลี่ย',fmt(avg)+unit,'#f97316'],['ต่ำสุด',fmt(min)+unit,'#3b82f6']].map(([lbl,val,clr]) => (
          <div key={lbl} className="rounded-xl p-2 text-center" style={{ background: `${clr}10`, border: `1px solid ${clr}30` }}>
            <p className="text-[10px] text-slate-500">{lbl}</p>
            <p className="text-xs font-bold mt-0.5" style={{ color: clr }}>{val}</p>
          </div>
        ))}
      </div>
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest pt-1">อันดับ ({hiLabel} → {loLabel})</p>
      <div className="space-y-1">
        {sorted.map((d, i) => {
          const pct = (d[field] - min) / (max - min || 1);
          const color = colorFn(d[field]);
          return (
            <div key={d.id} className="flex items-center gap-2">
              <span className="text-[10px] font-bold w-4 text-right shrink-0" style={{ color: i < 3 ? '#ef4444' : '#94a3b8' }}>{i+1}</span>
              <span className="text-xs text-slate-700 w-20 shrink-0 truncate">ต.{d.name}</span>
              <div className="flex-1 h-1.5 rounded-full bg-black/5 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct*100}%`, background: color }} />
              </div>
              <span className="text-[11px] font-semibold w-14 text-right shrink-0" style={{ color }}>{fmt(d[field])}{unit}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── District info card ── */
function InfoCard({ selectedDistrict, activeLayer, onClear, tambons }) {
  const info = layerInfo[activeLayer];
  if (!info) {
    return (
      <div className="rounded-2xl p-3 text-center" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
        <p className="text-xs text-indigo-600">คลิกที่วงกลมบนแผนที่เพื่อดูข้อมูลรายละเอียด</p>
      </div>
    );
  }
  if (!selectedDistrict) {
    return (
      <div className="animate-fade-in">
        <p className="text-xs text-slate-500 leading-relaxed mb-3">{info.description}</p>
        <div className="rounded-2xl p-3" style={{ background: '#f0f7ff', border: '1px solid #e0eaff' }}>
          <p className="text-xs text-blue-600 mb-2 font-medium">ระดับค่า ({info.unit})</p>
          <LayerLegend layer={activeLayer} />
        </div>
        {activeLayer === 'temperature' && tambons?.length > 0 && (
          <div className="mt-3"><LayerRanking tambons={tambons} field="temperature" unit="°C" colorFn={getTemperatureColor} hiLabel="ร้อน" loLabel="เย็น" /></div>
        )}
        {activeLayer === 'pm25' && tambons?.length > 0 && (
          <div className="mt-3"><LayerRanking tambons={tambons} field="pm25" unit=" µg" decimals={0} colorFn={getPM25Color} hiLabel="มาก" loLabel="น้อย" /></div>
        )}
        {activeLayer !== 'temperature' && activeLayer !== 'pm25' && (
          <div className="mt-3 rounded-2xl p-3" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <p className="text-xs text-indigo-600">คลิกที่วงกลมบนแผนที่เพื่อดูข้อมูลรายละเอียด</p>
          </div>
        )}
      </div>
    );
  }

  const d = selectedDistrict;
  const tempColor = getTemperatureColor(d.temperature);
  const pm25Color = getPM25Color(d.pm25);
  const pm25Level = getPM25Level(d.pm25);
  const heatColor = getHeatColor(d.heatValue);
  const heatLevel = getHeatLevel(d.heatValue);
  const typeLabel = { urban:'เขตเมือง','semi-urban':'กึ่งเมือง',rural:'ชนบท',industrial:'อุตสาหกรรม' }[d.type] || 'ชนบท';

  return (
    <div className="animate-fade-in space-y-2">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <FaMapMarkerAlt className="text-blue-500" size={11} />
            <span className="text-xs text-blue-600 font-medium">{typeLabel}</span>
          </div>
          <h3 className="text-slate-900 font-bold text-base leading-tight">ต.{d.name}</h3>
          <p className="text-slate-400 text-xs">อ.เมืองขอนแก่น · จ.ขอนแก่น</p>
        </div>
        <button onClick={onClear} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-black/5 transition-all">
          <FaTimes size={12} />
        </button>
      </div>
      <div className="rounded-2xl p-3 flex items-center justify-between" style={{ background: `${tempColor}10`, border: `1px solid ${tempColor}35` }}>
        <div className="flex items-center gap-2.5">
          <FaThermometerHalf style={{ color: tempColor }} size={15} />
          <div><p className="text-xs text-slate-500">อุณหภูมิ</p><p className="font-bold text-slate-900 text-lg leading-tight">{d.temperature}°C</p></div>
        </div>
        <div className="flex gap-3 text-xs text-slate-500">
          <div className="text-center"><FaTint size={9} className="mx-auto mb-0.5 text-blue-400" /><span>{d.humidity}%</span></div>
          <div className="text-center"><FaWind size={9} className="mx-auto mb-0.5 text-slate-400" /><span>{d.windSpeed}km</span></div>
        </div>
      </div>
      <div className="rounded-2xl p-3" style={{ background: `${pm25Color}10`, border: `1px solid ${pm25Color}35` }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FaWind style={{ color: pm25Color }} size={13} />
            <div><p className="text-xs text-slate-500">PM2.5</p><p className="font-bold text-slate-900 text-base">{d.pm25} AQI</p></div>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: pm25Level.color, background: `${pm25Level.color}20` }}>{pm25Level.label}</span>
        </div>
        <div className="h-1.5 rounded-full bg-black/5 overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${Math.min(d.pm25,150)/1.5}%`, background: `linear-gradient(90deg,${pm25Color}90,${pm25Color})` }} />
        </div>
      </div>
      <div className="rounded-2xl p-3" style={{ background: `${heatColor}10`, border: `1px solid ${heatColor}35` }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FaFireAlt style={{ color: heatColor }} size={13} />
            <div><p className="text-xs text-slate-500">ความร้อนสะสม</p><p className="font-bold text-slate-900 text-base">{Math.round(d.heatValue*100)}%</p></div>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: heatLevel.color, background: `${heatLevel.color}20` }}>{heatLevel.label}</span>
        </div>
        <div className="h-1.5 rounded-full bg-black/5 overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${d.heatValue*100}%`, background: `linear-gradient(90deg,#60A5FA,#34D399,#FBBF24,${heatColor})` }} />
        </div>
      </div>
      <div className="rounded-2xl p-3" style={{ background: '#f0f7ff', border: '1px solid #e0eaff' }}>
        <p className="text-xs text-blue-600 mb-2 font-medium">ระดับค่า ({info.unit})</p>
        <LayerLegend layer={activeLayer} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════ MAIN SIDEBAR ═══════════════════════════════ */
export default function Sidebar({
  activeLayers, infoLayer, onLayerToggle,
  tambons, weatherStatus, lastUpdated, onRefreshWeather,
  onFlyTo, selectedDistrict, onDistrictSelect,
  searchQuery, onSearchChange,
  isOpen, onToggle,
  layerSettings, onLayerSettingChange,
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [externalResults, setExternalResults] = useState([]);
  const [externalLoading, setExternalLoading] = useState(false);
  const searchRef = useRef(null);

  const filtered = searchQuery.trim()
    ? tambons.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()) || `ตำบล${d.name}`.includes(searchQuery))
    : [];

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || q.length < 2) { setExternalResults([]); return; }
    const timer = setTimeout(async () => {
      setExternalLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&countrycodes=th&limit=5&accept-language=th`,
          { headers: { 'User-Agent': 'KKMapHeat/1.0' } }
        );
        setExternalResults(await res.json());
      } catch { setExternalResults([]); }
      finally { setExternalLoading(false); }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const fn = e => { if (searchRef.current && !searchRef.current.contains(e.target)) setShowSuggestions(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const handleSuggestionClick = d => { onDistrictSelect(d); onSearchChange(d.name); setShowSuggestions(false); setExternalResults([]); };
  const handleExternalClick = useCallback(place => {
    onFlyTo({ lat: parseFloat(place.lat), lng: parseFloat(place.lon) });
    onSearchChange(place.display_name.split(',')[0].trim());
    setShowSuggestions(false); setExternalResults([]);
  }, [onFlyTo, onSearchChange]);

  const avgTemp     = tambons.length > 0 ? (tambons.reduce((s,d)=>s+d.temperature,0)/tambons.length).toFixed(1) : '--';
  const avgHumidity = tambons.length > 0 ? Math.round(tambons.reduce((s,d)=>s+(d.humidity??0),0)/tambons.length) : '--';
  const avgWind     = tambons.length > 0 ? (tambons.reduce((s,d)=>s+(d.windSpeed??0),0)/tambons.length).toFixed(1) : '--';
  const avgPM25     = tambons.length > 0 ? (tambons.reduce((s,d)=>s+d.pm25,0)/tambons.length).toFixed(1) : '--';

  const dateStr = new Date().toLocaleDateString('th-TH', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <>
      {/* ── Toggle button ── */}
      <button
        onClick={onToggle}
        className="fixed top-1/2 -translate-y-1/2 z-[1000] flex items-center justify-center w-7 h-16 rounded-r-2xl transition-all duration-300"
        style={{
          left: isOpen
            ? 'calc(var(--nav-x, 0px) + min(340px, 85vw))'
            : 'var(--nav-x, 0px)',
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(12px)',
          border: '1px solid #e0eaff',
          borderLeft: 'none',
          boxShadow: '2px 0 12px rgba(59,130,246,0.1)',
          transition: 'left 0.3s cubic-bezier(0.4,0,0.2,1)',
        }}
        aria-label="Toggle sidebar"
      >
        {isOpen ? <FaChevronLeft className="text-blue-400" size={11} /> : <FaChevronRight className="text-blue-400" size={11} />}
      </button>

      {/* ── Panel ── */}
      <aside
        className="fixed top-0 z-[999] flex flex-col sidebar-transition"
        style={{
          left: 'var(--nav-x, 0px)',
          width: 'min(340px, 85vw)',
          height: 'calc(100vh - var(--nav-bottom, 0px))',
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          opacity: isOpen ? 1 : 0,
          background: '#f8faff',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRight: '1px solid #e0eaff',
          boxShadow: '4px 0 32px rgba(59,130,246,0.10)',
        }}
      >
        {/* ── Mobile: compact 1-line header ── */}
        <div className="md:hidden flex-shrink-0 px-3 py-2 flex items-center justify-between"
          style={{ borderBottom: '1px solid #e0eaff' }}>
          <div className="flex items-center gap-1.5 min-w-0">
            <FaMapMarkerAlt className="text-blue-400 flex-shrink-0" size={10} />
            <span className="text-blue-700 text-xs font-bold truncate">แผนที่ขอนแก่น</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <LiveBadge status={weatherStatus} lastUpdated={lastUpdated} onRefresh={onRefreshWeather} />
            <span className="text-blue-900 text-sm font-black ml-1">{avgTemp}°</span>
          </div>
        </div>

        {/* ── Desktop: full hero card ── */}
        <div className="hidden md:block flex-shrink-0 px-4 pt-4 pb-3">
          <div className="rounded-3xl p-4"
            style={{
              background: 'linear-gradient(135deg,#dbeafe 0%,#bfdbfe 55%,#93c5fd 100%)',
              border: '1px solid rgba(147,197,253,0.5)',
              boxShadow: '0 4px 20px rgba(59,130,246,0.12)',
            }}>
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <FaMapMarkerAlt className="text-blue-500 flex-shrink-0" size={11} />
                  <span className="text-blue-700 text-xs font-semibold truncate">แผนที่ขอนแก่น</span>
                </div>
                <p className="text-blue-600/70 text-[11px] mb-2">{dateStr}</p>
                <div className="flex items-end gap-1.5">
                  <span className="text-3xl font-black text-blue-900 leading-none">{avgTemp}°</span>
                  <span className="text-blue-600 text-sm mb-0.5">C เฉลี่ย</span>
                </div>
              </div>
              <WeatherIllustration />
            </div>
            <div className="mt-2.5 pt-2.5 border-t border-blue-200/60">
              <LiveBadge status={weatherStatus} lastUpdated={lastUpdated} onRefresh={onRefreshWeather} />
            </div>
          </div>
        </div>

        {/* ── Scrollable content ── */}
        <div className="flex-1 overflow-y-auto px-3 md:px-4 pb-6 pt-2.5 md:pt-0 flex flex-col gap-2.5 md:gap-4">

          {/* Quick stats — desktop only */}
          <div className="hidden md:grid grid-cols-3 gap-2">
            {[
              { icon: FaWind, label: 'ลม', value: avgWind, unit: 'km/h', color: '#3b82f6' },
              { icon: FaTint, label: 'ความชื้น', value: avgHumidity, unit: '%', color: '#0ea5e9' },
              { icon: FaSun,  label: 'UV', value: 'ปาน', unit: 'กลาง', color: '#f59e0b' },
            ].map(s => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="rounded-2xl p-2.5 bg-white flex flex-col items-center gap-0.5"
                  style={{ border: '1px solid #e0eaff' }}>
                  <Icon size={14} style={{ color: s.color }} />
                  <span className="text-slate-800 font-bold text-xs leading-none">{s.value}</span>
                  <span className="text-[9px] text-slate-400 leading-none">{s.unit}</span>
                </div>
              );
            })}
          </div>

          {/* Search */}
          <div ref={searchRef} className="relative order-2 md:order-none">
            <label className="block text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1.5">ค้นหา</label>
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300" size={11} />
              <input
                type="text" value={searchQuery}
                onChange={e => { onSearchChange(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="ค้นหาตำบล หรือสถานที่ทั่วไทย..."
                className="w-full pl-9 pr-9 py-2.5 text-sm rounded-2xl text-slate-700 placeholder-blue-200 outline-none"
                style={{ background: 'white', border: '1.5px solid #e0eaff', fontFamily: 'Noto Sans Thai, sans-serif' }}
                onKeyDown={e => { if (e.key === 'Escape') { setShowSuggestions(false); onSearchChange(''); setExternalResults([]); } }}
              />
              {searchQuery && (
                <button onClick={() => { onSearchChange(''); setShowSuggestions(false); setExternalResults([]); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-blue-300 hover:text-blue-500 transition-colors">
                  <FaTimes size={10} />
                </button>
              )}
            </div>
            {showSuggestions && (filtered.length > 0 || externalLoading || externalResults.length > 0) && (
              <div className="absolute left-0 right-0 top-full mt-1.5 rounded-2xl overflow-hidden z-50 animate-fade-in"
                style={{ background: 'rgba(255,255,255,0.99)', border: '1px solid #e0eaff', boxShadow: '0 8px 32px rgba(59,130,246,0.12)', maxHeight: '260px', overflowY: 'auto' }}>
                {filtered.length > 0 && (
                  <>
                    <div className="px-3.5 pt-2.5 pb-1"><span className="text-[10px] font-bold text-blue-300 uppercase tracking-widest">ตำบลในอ.เมืองขอนแก่น</span></div>
                    {filtered.slice(0,5).map(d => (
                      <button key={d.id} onClick={() => handleSuggestionClick(d)}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left hover:bg-blue-50 transition-colors">
                        <FaMapMarkerAlt className="text-blue-400 flex-shrink-0" size={10} />
                        <div className="min-w-0">
                          <p className="text-sm text-slate-700">ต.{d.name}</p>
                          <p className="text-xs text-slate-400 truncate">{d.temperature}°C · PM {d.pm25}µg/m³</p>
                        </div>
                      </button>
                    ))}
                  </>
                )}
                {filtered.length > 0 && (externalLoading || externalResults.length > 0) && <div style={{ height: '1px', background: '#e0eaff', margin: '4px 0' }} />}
                {externalLoading ? (
                  <div className="px-3.5 py-3 flex items-center gap-2 text-xs text-blue-400">
                    <div className="w-3 h-3 border border-blue-200 border-t-blue-500 rounded-full animate-spin" />กำลังค้นหา...
                  </div>
                ) : externalResults.length > 0 && (
                  <>
                    <div className="px-3.5 pt-2.5 pb-1"><span className="text-[10px] font-bold text-blue-300 uppercase tracking-widest">สถานที่ในประเทศไทย</span></div>
                    {externalResults.map(place => {
                      const parts = place.display_name.split(',');
                      return (
                        <button key={place.place_id} onClick={() => handleExternalClick(place)}
                          className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left hover:bg-blue-50 transition-colors">
                          <FaSearch className="text-blue-300 flex-shrink-0" size={9} />
                          <div className="min-w-0">
                            <p className="text-sm text-slate-700 truncate">{parts[0].trim()}</p>
                            <p className="text-xs text-slate-400 truncate">{parts.slice(1,3).join(',').trim()}</p>
                          </div>
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Layer controls */}
          <div className="order-3 md:order-none">
            <label className="block text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">เลเยอร์ข้อมูล</label>
            <div className="space-y-2">
              {LAYER_BUTTONS.map(btn => {
                const Icon = btn.icon;
                const isActive = activeLayers?.has(btn.id) ?? false;
                const settings = layerSettings?.[btn.id] ?? { visible: true, opacity: 0.75 };
                return (
                  <div key={btn.id} className="rounded-2xl overflow-hidden bg-white transition-all duration-200"
                    style={{ border: `1.5px solid ${isActive ? btn.activeBorder : '#e0eaff'}`, boxShadow: isActive ? `0 0 16px ${btn.activeBorder}25` : 'none' }}>
                    <button onClick={() => onLayerToggle(btn.id)}
                      className="w-full flex items-center gap-2.5 px-3 md:px-3.5 py-2 md:py-3 text-left"
                      style={{ background: isActive ? btn.activeBg : 'transparent' }}>
                      <div className="w-7 h-7 md:w-8 md:h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: isActive ? `${btn.iconColor}18` : '#f0f7ff' }}>
                        <Icon size={12} style={{ color: isActive ? btn.iconColor : '#93c5fd' }} />
                      </div>
                      <span className="text-xs md:text-sm font-medium flex-1" style={{ color: isActive ? '#1e293b' : '#94a3b8' }}>{btn.label}</span>
                      <div className="w-8 h-4 rounded-full flex-shrink-0 relative transition-all" style={{ background: isActive ? btn.iconColor : '#e0eaff' }}>
                        <div className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all" style={{ left: isActive ? '17px' : '2px' }} />
                      </div>
                    </button>

                    {/* Mini stats — desktop only */}
                    {isActive && (btn.id === 'temperature' || btn.id === 'pm25') && tambons.length > 0 && (() => {
                      const field = btn.id === 'temperature' ? 'temperature' : 'pm25';
                      const unit  = btn.id === 'temperature' ? '°C' : ' µg';
                      const dec   = btn.id === 'temperature' ? 1 : 0;
                      const vals  = tambons.map(d => d[field]);
                      const avg   = (vals.reduce((s,v)=>s+v,0)/vals.length).toFixed(dec);
                      return (
                        <div className="hidden md:grid grid-cols-3 divide-x divide-blue-50 text-center"
                          style={{ background: `${btn.iconColor}06`, borderTop: `1px solid ${btn.activeBorder}` }}>
                          {[['ต่ำสุด',`${Math.min(...vals).toFixed(dec)}${unit}`,'#3b82f6'],['เฉลี่ย',`${avg}${unit}`,'#f97316'],['สูงสุด',`${Math.max(...vals).toFixed(dec)}${unit}`,'#ef4444']].map(([lbl,val,clr])=>(
                            <div key={lbl} className="py-1.5">
                              <p className="text-[9px] text-slate-400">{lbl}</p>
                              <p className="text-[11px] font-bold" style={{ color: clr }}>{val}</p>
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    {/* Opacity controls — desktop only */}
                    {isActive && (
                      <div className="hidden md:flex items-center gap-2.5 px-3.5 py-2"
                        style={{ background: `${btn.iconColor}06`, borderTop: `1px solid ${btn.activeBorder}` }}>
                        <button onClick={() => onLayerSettingChange(btn.id,'visible',!settings.visible)}
                          className="shrink-0 p-1 rounded-lg hover:bg-black/5 transition-colors">
                          {settings.visible ? <FaEye size={12} style={{ color: btn.iconColor }} /> : <FaEyeSlash size={12} className="text-slate-400" />}
                        </button>
                        <input type="range" min={0} max={1} step={0.05} value={settings.opacity}
                          disabled={!settings.visible}
                          onChange={e => onLayerSettingChange(btn.id,'opacity',parseFloat(e.target.value))}
                          className="flex-1 h-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
                          style={{ accentColor: btn.iconColor }} />
                        <span className="text-[11px] font-mono w-8 text-right shrink-0" style={{ color: settings.visible ? btn.iconColor : '#94a3b8' }}>
                          {Math.round(settings.opacity*100)}%
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Info card */}
          <div className="order-1 md:order-none">
            <label className="block text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1.5">
              {selectedDistrict ? 'ข้อมูลพื้นที่' : 'ข้อมูลเลเยอร์'}
            </label>
            <div className="rounded-2xl md:rounded-3xl p-3 md:p-4 bg-white" style={{ border: '1px solid #e0eaff' }}>
              <InfoCard selectedDistrict={selectedDistrict} activeLayer={infoLayer} onClear={() => onDistrictSelect(null)} tambons={tambons} />
            </div>
          </div>

          {/* Province summary — desktop only */}
          <div className="hidden md:block">
            <label className="block text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">ภาพรวม</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'อุณหภูมิเฉลี่ย', value: `${avgTemp}°C`,     icon: FaThermometerHalf, color: '#FB923C' },
                { label: 'PM2.5 เฉลี่ย',  value: `${avgPM25} µg/m³`, icon: FaWind,            color: '#22C55E' },
                { label: 'ความชื้นเฉลี่ย', value: `${avgHumidity}%`,  icon: FaTint,            color: '#38bdf8' },
                { label: 'จำนวนตำบล',     value: `${tambons.length}`, icon: FaLeaf,            color: '#6366f1' },
              ].map(stat => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="rounded-2xl p-2.5 text-center bg-white" style={{ border: '1px solid #e0eaff' }}>
                    <Icon style={{ color: stat.color }} size={12} className="mx-auto mb-1" />
                    <p className="text-slate-800 font-bold text-xs leading-tight">{stat.value}</p>
                    <p className="text-slate-400 text-[10px] leading-tight mt-0.5">{stat.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex-shrink-0 px-5 py-3" style={{ borderTop: '1px solid #e0eaff' }}>
          <p className="text-blue-300 text-[10px] text-center">
            {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </aside>
    </>
  );
}
