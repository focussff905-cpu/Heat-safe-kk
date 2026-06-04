import { useState, useRef, useEffect, useCallback } from 'react';
import {
  FaThermometerHalf,
  FaWind,
  FaFireAlt,
  FaSun,
  FaSearch,
  FaChevronLeft,
  FaChevronRight,
  FaTimes,
  FaMapMarkerAlt,
  FaTint,
  FaLeaf,
  FaEye,
  FaEyeSlash,
  FaWater,
  FaSatelliteDish,
} from 'react-icons/fa';
import { MdLocationCity } from 'react-icons/md';
import {
  layerInfo,
  getTemperatureColor,
  getPM25Color,
  getPM25Level,
  getHeatColor,
  getHeatLevel,
} from '../data/mockData';

const LAYER_BUTTONS = [
  {
    id: 'temperature',
    label: 'อุณหภูมิ',
    icon: FaThermometerHalf,
    activeColor: 'from-orange-500 to-red-500',
    activeBg: 'rgba(249,115,22,0.12)',
    activeBorder: 'rgba(249,115,22,0.5)',
    iconColor: '#FB923C',
  },
  {
    id: 'pm25',
    label: 'ฝุ่น PM2.5',
    icon: FaWind,
    activeColor: 'from-green-500 to-lime-400',
    activeBg: 'rgba(34,197,94,0.12)',
    activeBorder: 'rgba(34,197,94,0.5)',
    iconColor: '#22C55E',
  },
  {
    id: 'heat',
    label: 'การสะสมความร้อน',
    icon: FaFireAlt,
    activeColor: 'from-red-600 to-orange-400',
    activeBg: 'rgba(239,68,68,0.12)',
    activeBorder: 'rgba(239,68,68,0.5)',
    iconColor: '#EF4444',
  },
  {
    id: 'stream',
    label: 'ร่องน้ำ',
    icon: FaWater,
    activeColor: 'from-sky-500 to-cyan-400',
    activeBg: 'rgba(14,165,233,0.12)',
    activeBorder: 'rgba(14,165,233,0.5)',
    iconColor: '#0EA5E9',
  },
  {
    id: 'monthly_temp',
    label: 'อุณหภูมิ MODIS รายเดือน',
    icon: FaSatelliteDish,
    activeColor: 'from-violet-500 to-purple-400',
    activeBg: 'rgba(139,92,246,0.12)',
    activeBorder: 'rgba(139,92,246,0.5)',
    iconColor: '#8B5CF6',
  },
  {
    id: 'hotspot',
    label: 'จุดความร้อนสูง',
    icon: FaSun,
    activeColor: 'from-red-500 to-yellow-400',
    activeBg: 'rgba(255,80,0,0.12)',
    activeBorder: 'rgba(255,80,0,0.5)',
    iconColor: '#FF5000',
  },
];

function LiveBadge({ status, lastUpdated, onRefresh }) {
  const timeStr = lastUpdated
    ? lastUpdated.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    : null;

  const dot = {
    loading:    { cls: 'bg-blue-400 animate-pulse', shadow: '' },
    refreshing: { cls: 'bg-blue-400 animate-pulse', shadow: '' },
    ok:         { cls: 'bg-green-400 live-dot', shadow: '0 0 6px #4ade80' },
    error:      { cls: 'bg-red-400', shadow: '0 0 6px #f87171' },
  }[status] ?? { cls: 'bg-slate-400', shadow: '' };

  return (
    <div className="flex items-center gap-1.5 text-xs text-slate-500">
      <span
        className={`w-2 h-2 rounded-full inline-block flex-shrink-0 ${dot.cls}`}
        style={{ boxShadow: dot.shadow }}
      />
      <span className="flex-1">
        {status === 'loading' && 'กำลังโหลดข้อมูล...'}
        {status === 'refreshing' && 'กำลังรีเฟรช...'}
        {status === 'ok' && `เรียลไทม์ · ${timeStr}`}
        {status === 'error' && 'โหลดไม่สำเร็จ (ข้อมูลเดิม)'}
      </span>
      <button
        onClick={onRefresh}
        title="รีเฟรชข้อมูล"
        className="p-0.5 rounded text-slate-400 hover:text-slate-600 transition-colors"
        disabled={status === 'loading' || status === 'refreshing'}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
        </svg>
      </button>
    </div>
  );
}

function LayerLegend({ layer }) {
  const info = layerInfo[layer];
  return (
    <div className="space-y-1.5">
      {info.legend.map((item) => (
        <div key={item.label} className="flex items-center gap-2.5">
          <span
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: item.color, boxShadow: `0 0 6px ${item.color}60` }}
          />
          <span className="text-xs text-slate-600 flex-1">{item.label}</span>
          <span className="text-xs text-slate-400">{item.desc}</span>
        </div>
      ))}
    </div>
  );
}

function LayerRanking({ tambons, field, unit, colorFn, hiLabel, loLabel, decimals = 1 }) {
  if (!tambons || tambons.length === 0) return null;
  const sorted = [...tambons].sort((a, b) => b[field] - a[field]);
  const max = sorted[0][field];
  const min = sorted[sorted.length - 1][field];
  const avg = tambons.reduce((s, d) => s + d[field], 0) / tambons.length;
  const fmt = (v) => Number(v).toFixed(decimals);

  return (
    <div className="mt-3 space-y-2">
      <div className="grid grid-cols-3 gap-1.5">
        {[
          { label: 'สูงสุด', value: `${fmt(max)}${unit}`, color: '#ef4444' },
          { label: 'เฉลี่ย',  value: `${fmt(avg)}${unit}`, color: '#f97316' },
          { label: 'ต่ำสุด', value: `${fmt(min)}${unit}`, color: '#3b82f6' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg p-2 text-center" style={{ background: `${color}10`, border: `1px solid ${color}30` }}>
            <p className="text-[10px] text-slate-500">{label}</p>
            <p className="text-xs font-bold mt-0.5" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest pt-1">
        อันดับตำบล ({hiLabel} → {loLabel})
      </p>
      <div className="space-y-1">
        {sorted.map((d, i) => {
          const pct = (d[field] - min) / (max - min || 1);
          const color = colorFn(d[field]);
          return (
            <div key={d.id} className="flex items-center gap-2">
              <span className="text-[10px] font-bold w-4 text-right shrink-0" style={{ color: i < 3 ? '#ef4444' : '#94a3b8' }}>
                {i + 1}
              </span>
              <span className="text-xs text-slate-700 w-20 shrink-0 truncate">ต.{d.name}</span>
              <div className="flex-1 h-1.5 rounded-full bg-black/5 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct * 100}%`, background: color }} />
              </div>
              <span className="text-[11px] font-semibold w-14 text-right shrink-0" style={{ color }}>
                {fmt(d[field])}{unit}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InfoCard({ selectedDistrict, activeLayer, onClear, tambons }) {
  const info = layerInfo[activeLayer];

  if (!selectedDistrict) {
    return (
      <div className="animate-fade-in">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
            คำอธิบายเลเยอร์
          </span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed mb-4">
          {info.description}
        </p>
        <div className="border-t border-slate-200 pt-3">
          <p className="text-xs text-slate-500 mb-2">ระดับค่า ({info.unit})</p>
          <LayerLegend layer={activeLayer} />
        </div>

        {/* Layer rankings */}
        {activeLayer === 'temperature' && tambons?.length > 0 && (
          <div className="mt-3 border-t border-slate-200 pt-3">
            <LayerRanking tambons={tambons} field="temperature" unit="°C"
              colorFn={getTemperatureColor} hiLabel="ร้อน" loLabel="เย็น" />
          </div>
        )}
        {activeLayer === 'pm25' && tambons?.length > 0 && (
          <div className="mt-3 border-t border-slate-200 pt-3">
            <LayerRanking tambons={tambons} field="pm25" unit=" µg" decimals={0}
              colorFn={getPM25Color} hiLabel="มาก" loLabel="น้อย" />
          </div>
        )}

        {activeLayer !== 'temperature' && activeLayer !== 'pm25' && (
          <div className="mt-4 rounded-lg p-3" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)' }}>
            <p className="text-xs text-indigo-600">
              คลิกที่วงกลมบนแผนที่เพื่อดูข้อมูลรายละเอียดของแต่ละอำเภอ
            </p>
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

  const typeLabel = {
    urban: 'เขตเมือง',
    'semi-urban': 'กึ่งเมือง',
    rural: 'ชนบท',
    industrial: 'อุตสาหกรรม',
  }[d.type] || 'ชนบท';

  return (
    <div className="animate-fade-in">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <FaMapMarkerAlt className="text-indigo-500 text-xs" />
            <span className="text-xs text-indigo-600 font-medium">{typeLabel}</span>
          </div>
          <h3 className="text-slate-900 font-semibold text-base leading-tight">
            ต.{d.name}
          </h3>
          <p className="text-slate-400 text-xs">อ.เมืองขอนแก่น · จ.ขอนแก่น</p>
        </div>
        <button
          onClick={onClear}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-black/5 transition-all"
        >
          <FaTimes size={12} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2 mb-3">
        {/* Temperature */}
        <div
          className="rounded-xl p-3 flex items-center justify-between"
          style={{
            background: `${tempColor}12`,
            border: `1px solid ${tempColor}40`,
          }}
        >
          <div className="flex items-center gap-2.5">
            <FaThermometerHalf style={{ color: tempColor }} size={16} />
            <div>
              <p className="text-xs text-slate-500">อุณหภูมิ</p>
              <p className="font-bold text-slate-900 text-lg leading-tight">{d.temperature}°C</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-slate-500 text-xs">
            <div className="text-center">
              <FaTint size={10} className="mx-auto mb-0.5 text-blue-400" />
              <span>{d.humidity}%</span>
            </div>
            <div className="text-center">
              <FaWind size={10} className="mx-auto mb-0.5 text-slate-400" />
              <span>{d.windSpeed} km</span>
            </div>
          </div>
        </div>

        {/* PM2.5 */}
        <div
          className="rounded-xl p-3"
          style={{
            background: `${pm25Color}12`,
            border: `1px solid ${pm25Color}40`,
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <FaWind style={{ color: pm25Color }} size={16} />
              <div>
                <p className="text-xs text-slate-500">ฝุ่น PM2.5</p>
                <p className="font-bold text-slate-900 text-lg leading-tight">{d.pm25} AQI</p>
              </div>
            </div>
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ color: pm25Level.color, background: `${pm25Level.color}20` }}
            >
              {pm25Level.label}
            </span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-black/5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(d.pm25, 150) / 1.5}%`,
                background: `linear-gradient(90deg, ${pm25Color}90, ${pm25Color})`,
              }}
            />
          </div>
        </div>

        {/* Heat Accumulation */}
        <div
          className="rounded-xl p-3"
          style={{
            background: `${heatColor}12`,
            border: `1px solid ${heatColor}40`,
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <FaFireAlt style={{ color: heatColor }} size={16} />
              <div>
                <p className="text-xs text-slate-500">การสะสมความร้อน</p>
                <p className="font-bold text-slate-900 text-lg leading-tight">
                  {Math.round(d.heatValue * 100)}%
                </p>
              </div>
            </div>
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ color: heatLevel.color, background: `${heatLevel.color}20` }}
            >
              {heatLevel.label}
            </span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-black/5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${d.heatValue * 100}%`,
                background: `linear-gradient(90deg, #60A5FA, #34D399, #FBBF24, ${heatColor})`,
              }}
            />
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-3">
        <p className="text-xs text-slate-500 mb-2">ระดับค่า ({info.unit})</p>
        <LayerLegend layer={activeLayer} />
      </div>
    </div>
  );
}

export default function Sidebar({
  activeLayers,
  infoLayer,
  onLayerToggle,
  tambons,
  weatherStatus,
  lastUpdated,
  onRefreshWeather,
  onFlyTo,
  selectedDistrict,
  onDistrictSelect,
  searchQuery,
  onSearchChange,
  isOpen,
  onToggle,
  layerSettings,
  onLayerSettingChange,
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [externalResults, setExternalResults] = useState([]);
  const [externalLoading, setExternalLoading] = useState(false);
  const searchRef = useRef(null);

  const filtered = searchQuery.trim()
    ? tambons.filter((d) =>
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        `ตำบล${d.name}`.includes(searchQuery)
      )
    : [];

  // Nominatim geocoding — ค้นหาทั่วประเทศไทย
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || q.length < 2) {
      setExternalResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setExternalLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&countrycodes=th&limit=5&accept-language=th`,
          { headers: { 'User-Agent': 'KKMapHeat/1.0' } }
        );
        const data = await res.json();
        setExternalResults(data);
      } catch {
        setExternalResults([]);
      } finally {
        setExternalLoading(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const handleClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSuggestionClick = (district) => {
    onDistrictSelect(district);
    onSearchChange(district.name);
    setShowSuggestions(false);
    setExternalResults([]);
  };

  const handleExternalClick = useCallback((place) => {
    const label = place.display_name.split(',')[0].trim();
    onFlyTo({ lat: parseFloat(place.lat), lng: parseFloat(place.lon) });
    onSearchChange(label);
    setShowSuggestions(false);
    setExternalResults([]);
  }, [onFlyTo, onSearchChange]);

  const currentLayer = LAYER_BUTTONS.find((l) => l.id === infoLayer);

  return (
    <>
      {/* Toggle button — always visible */}
      <button
        onClick={onToggle}
        className="fixed top-1/2 -translate-y-1/2 z-[1000] flex items-center justify-center w-7 h-16 rounded-r-xl transition-all duration-300"
        style={{
          left: isOpen ? 'min(340px, 85vw)' : '0',
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(0,0,0,0.1)',
          borderLeft: 'none',
          boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
        }}
        aria-label="Toggle sidebar"
      >
        {isOpen ? (
          <FaChevronLeft className="text-slate-500" size={12} />
        ) : (
          <FaChevronRight className="text-slate-500" size={12} />
        )}
      </button>

      {/* Sidebar panel */}
      <aside
        className="fixed top-0 left-0 h-full z-[999] flex flex-col sidebar-transition"
        style={{
          width: 'min(340px, 85vw)',
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          opacity: isOpen ? 1 : 0,
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRight: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '4px 0 24px rgba(0,0,0,0.08)',
        }}
      >
        {/* Header */}
        <div
          className="flex-shrink-0 px-5 py-4"
          style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}
        >
          <div className="flex items-center gap-3 mb-1">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            >
              <MdLocationCity className="text-white" size={16} />
            </div>
            <div className="min-w-0">
              <h1 className="text-slate-900 font-semibold text-sm leading-tight truncate">
                ระบบติดตามสภาพแวดล้อม
              </h1>
              <p className="text-slate-500 text-xs truncate">อ.เมืองขอนแก่น · รายตำบล</p>
            </div>
          </div>
          <div className="mt-2">
            <LiveBadge status={weatherStatus} lastUpdated={lastUpdated} onRefresh={onRefreshWeather} />
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Search box */}
          <div ref={searchRef} className="relative">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
              ค้นหา
            </label>
            <div className="relative">
              <FaSearch
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={12}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  onSearchChange(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="ค้นหาตำบล หรือสถานที่ทั่วไทย..."
                className="w-full pl-9 pr-9 py-2.5 text-sm rounded-xl text-slate-800 placeholder-slate-400 outline-none transition-all"
                style={{
                  background: 'rgba(0,0,0,0.04)',
                  border: '1px solid rgba(0,0,0,0.1)',
                  fontFamily: 'Noto Sans Thai, sans-serif',
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setShowSuggestions(false);
                    onSearchChange('');
                    setExternalResults([]);
                  }
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => { onSearchChange(''); setShowSuggestions(false); setExternalResults([]); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <FaTimes size={10} />
                </button>
              )}
            </div>

            {/* Suggestions dropdown */}
            {showSuggestions && (filtered.length > 0 || externalLoading || externalResults.length > 0) && (
              <div
                className="absolute left-0 right-0 top-full mt-1.5 rounded-xl overflow-hidden z-50 animate-fade-in"
                style={{
                  background: 'rgba(255,255,255,0.98)',
                  border: '1px solid rgba(0,0,0,0.1)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                  backdropFilter: 'blur(16px)',
                  maxHeight: '320px',
                  overflowY: 'auto',
                }}
              >
                {/* ผลลัพธ์ตำบลในอ.เมืองขอนแก่น */}
                {filtered.length > 0 && (
                  <>
                    <div className="px-3.5 pt-2.5 pb-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                        ตำบลในอ.เมืองขอนแก่น
                      </span>
                    </div>
                    {filtered.slice(0, 5).map((d) => (
                      <button
                        key={d.id}
                        onClick={() => handleSuggestionClick(d)}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left hover:bg-black/5 transition-colors"
                      >
                        <FaMapMarkerAlt className="text-indigo-500 flex-shrink-0" size={11} />
                        <div className="min-w-0">
                          <p className="text-sm text-slate-800">ต.{d.name}</p>
                          <p className="text-xs text-slate-500 truncate">
                            {d.temperature}°C · PM2.5 {d.pm25} µg/m³
                          </p>
                        </div>
                      </button>
                    ))}
                  </>
                )}

                {/* Divider */}
                {filtered.length > 0 && (externalLoading || externalResults.length > 0) && (
                  <div style={{ height: '1px', background: 'rgba(0,0,0,0.06)', margin: '4px 0' }} />
                )}

                {/* ผลลัพธ์ทั่วประเทศไทย (Nominatim) */}
                {externalLoading ? (
                  <div className="px-3.5 py-3 flex items-center gap-2 text-xs text-slate-400">
                    <div className="w-3 h-3 border border-slate-300 border-t-indigo-500 rounded-full animate-spin" />
                    กำลังค้นหา...
                  </div>
                ) : externalResults.length > 0 && (
                  <>
                    <div className="px-3.5 pt-2.5 pb-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                        สถานที่ในประเทศไทย
                      </span>
                    </div>
                    {externalResults.map((place) => {
                      const parts = place.display_name.split(',');
                      const primary = parts[0].trim();
                      const secondary = parts.slice(1, 3).join(',').trim();
                      return (
                        <button
                          key={place.place_id}
                          onClick={() => handleExternalClick(place)}
                          className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left hover:bg-black/5 transition-colors"
                        >
                          <FaSearch className="text-slate-400 flex-shrink-0" size={10} />
                          <div className="min-w-0">
                            <p className="text-sm text-slate-800 truncate">{primary}</p>
                            <p className="text-xs text-slate-400 truncate">{secondary}</p>
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
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
              เลือกเลเยอร์ข้อมูล
            </label>
            <div className="space-y-2">
              {LAYER_BUTTONS.map((btn) => {
                const Icon = btn.icon;
                const isActive = activeLayers?.has(btn.id) ?? false;
                const settings = layerSettings?.[btn.id] ?? { visible: true, opacity: 0.75 };
                return (
                  <div
                    key={btn.id}
                    className="rounded-xl overflow-hidden transition-all duration-200"
                    style={{
                      border: `1px solid ${isActive ? btn.activeBorder : 'rgba(0,0,0,0.08)'}`,
                      boxShadow: isActive ? `0 0 16px ${btn.activeBorder}40` : 'none',
                    }}
                  >
                    {/* Layer toggle button */}
                    <button
                      onClick={() => onLayerToggle(btn.id)}
                      className="w-full flex items-center gap-3 px-3.5 py-3 text-left transition-all duration-200"
                      style={{
                        background: isActive ? btn.activeBg : 'rgba(0,0,0,0.02)',
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: isActive ? `${btn.iconColor}20` : 'rgba(0,0,0,0.05)' }}
                      >
                        <Icon size={14} style={{ color: isActive ? btn.iconColor : '#94a3b8' }} />
                      </div>
                      <span className="text-sm font-medium" style={{ color: isActive ? '#1e293b' : '#94a3b8' }}>
                        {btn.label}
                      </span>
                      {/* Toggle switch indicator */}
                      <div
                        className="ml-auto flex-shrink-0 w-8 h-4 rounded-full transition-all duration-200 relative"
                        style={{
                          background: isActive ? btn.iconColor : 'rgba(0,0,0,0.15)',
                        }}
                      >
                        <div
                          className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all duration-200"
                          style={{ left: isActive ? '17px' : '2px' }}
                        />
                      </div>
                    </button>

                    {/* Mini-stats row for temperature / pm25 layers */}
                    {isActive && (btn.id === 'temperature' || btn.id === 'pm25') && tambons.length > 0 && (() => {
                      const field = btn.id === 'temperature' ? 'temperature' : 'pm25';
                      const unit  = btn.id === 'temperature' ? '°C' : ' µg';
                      const dec   = btn.id === 'temperature' ? 1 : 0;
                      const vals  = tambons.map(d => d[field]);
                      const avg   = (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(dec);
                      const max   = Math.max(...vals).toFixed(dec);
                      const min   = Math.min(...vals).toFixed(dec);
                      return (
                        <div className="grid grid-cols-3 divide-x divide-black/5 text-center"
                          style={{ background: `${btn.iconColor}06`, borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                          {[['ต่ำสุด', `${min}${unit}`, '#3b82f6'], ['เฉลี่ย', `${avg}${unit}`, '#f97316'], ['สูงสุด', `${max}${unit}`, '#ef4444']].map(([lbl, val, clr]) => (
                            <div key={lbl} className="py-1.5">
                              <p className="text-[9px] text-slate-400">{lbl}</p>
                              <p className="text-[11px] font-bold" style={{ color: clr }}>{val}</p>
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    {/* Opacity + visibility controls — shown only when layer is on */}
                    {isActive && (
                      <div
                        className="flex items-center gap-2.5 px-3.5 py-2"
                        style={{
                          background: `${btn.iconColor}08`,
                          borderTop: '1px solid rgba(0,0,0,0.05)',
                        }}
                      >
                        {/* Toggle visibility */}
                        <button
                          onClick={() => onLayerSettingChange(btn.id, 'visible', !settings.visible)}
                          title={settings.visible ? 'ซ่อนเลเยอร์' : 'แสดงเลเยอร์'}
                          className="shrink-0 p-1 rounded transition-colors hover:bg-black/5"
                        >
                          {settings.visible
                            ? <FaEye size={12} style={{ color: btn.iconColor }} />
                            : <FaEyeSlash size={12} className="text-slate-400" />}
                        </button>

                        {/* Opacity slider */}
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={settings.opacity}
                          disabled={!settings.visible}
                          onChange={(e) => onLayerSettingChange(btn.id, 'opacity', parseFloat(e.target.value))}
                          className="flex-1 h-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
                          style={{ accentColor: btn.iconColor }}
                        />

                        {/* Opacity % label */}
                        <span
                          className="text-[11px] font-mono w-8 text-right shrink-0"
                          style={{ color: settings.visible ? btn.iconColor : '#94a3b8' }}
                        >
                          {Math.round(settings.opacity * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: '1px', background: 'rgba(0,0,0,0.06)' }} />

          {/* Info card */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
              {selectedDistrict ? 'ข้อมูลพื้นที่' : 'ข้อมูลเลเยอร์'}
            </label>
            <InfoCard
              selectedDistrict={selectedDistrict}
              activeLayer={infoLayer}
              onClear={() => onDistrictSelect(null)}
              tambons={tambons}
            />
          </div>

          {/* Stats summary */}
          <div style={{ height: '1px', background: 'rgba(0,0,0,0.06)' }} />
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
              ภาพรวมจังหวัด
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  label: 'อุณหภูมิเฉลี่ย',
                  value: `${(tambons.reduce((s, d) => s + d.temperature, 0) / tambons.length).toFixed(1)}°C`,
                  icon: FaThermometerHalf,
                  color: '#FB923C',
                },
                {
                  label: 'PM2.5 เฉลี่ย',
                  value: `${(tambons.reduce((s, d) => s + d.pm25, 0) / tambons.length).toFixed(1)} µg/m³`,
                  icon: FaWind,
                  color: '#22C55E',
                },
                {
                  label: 'ความชื้นเฉลี่ย',
                  value: `${Math.round(tambons.reduce((s, d) => s + (d.humidity ?? 0), 0) / tambons.length)}%`,
                  icon: FaTint,
                  color: '#38bdf8',
                },
                {
                  label: 'จำนวนตำบล',
                  value: `${tambons.length} ตำบล`,
                  icon: FaLeaf,
                  color: '#6366f1',
                },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className="rounded-xl p-2.5 text-center"
                    style={{
                      background: 'rgba(0,0,0,0.03)',
                      border: '1px solid rgba(0,0,0,0.07)',
                    }}
                  >
                    <Icon style={{ color: stat.color }} size={13} className="mx-auto mb-1" />
                    <p className="text-slate-800 font-bold text-xs leading-tight">{stat.value}</p>
                    <p className="text-slate-400 text-[10px] leading-tight mt-0.5">{stat.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex-shrink-0 px-5 py-3"
          style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}
        >
          <p className="text-slate-400 text-[10px] text-center">
            ข้อมูลจำลองเพื่อการพัฒนา · {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </aside>
    </>
  );
}
