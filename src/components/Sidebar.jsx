import { useState, useRef, useEffect } from 'react';
import {
  FaThermometerHalf,
  FaWind,
  FaFireAlt,
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
} from 'react-icons/fa';
import { MdLocationCity } from 'react-icons/md';
import {
  districts,
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
    activeBg: 'rgba(249,115,22,0.15)',
    activeBorder: 'rgba(249,115,22,0.5)',
    iconColor: '#FB923C',
  },
  {
    id: 'pm25',
    label: 'ฝุ่น PM2.5',
    icon: FaWind,
    activeColor: 'from-green-500 to-lime-400',
    activeBg: 'rgba(34,197,94,0.15)',
    activeBorder: 'rgba(34,197,94,0.5)',
    iconColor: '#22C55E',
  },
  {
    id: 'heat',
    label: 'การสะสมความร้อน',
    icon: FaFireAlt,
    activeColor: 'from-red-600 to-orange-400',
    activeBg: 'rgba(239,68,68,0.15)',
    activeBorder: 'rgba(239,68,68,0.5)',
    iconColor: '#EF4444',
  },
  {
    id: 'stream',
    label: 'ร่องน้ำ',
    icon: FaWater,
    activeColor: 'from-sky-500 to-cyan-400',
    activeBg: 'rgba(14,165,233,0.15)',
    activeBorder: 'rgba(14,165,233,0.5)',
    iconColor: '#0EA5E9',
  },
];

function LiveBadge() {
  return (
    <div className="flex items-center gap-1.5 text-xs text-slate-400">
      <span
        className="w-2 h-2 rounded-full bg-green-400 live-dot inline-block"
        style={{ boxShadow: '0 0 6px #4ade80' }}
      />
      อัปเดตล่าสุด 08:30
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
          <span className="text-xs text-slate-300 flex-1">{item.label}</span>
          <span className="text-xs text-slate-500">{item.desc}</span>
        </div>
      ))}
    </div>
  );
}

function InfoCard({ selectedDistrict, activeLayer, onClear }) {
  const info = layerInfo[activeLayer];

  if (!selectedDistrict) {
    return (
      <div className="animate-fade-in">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
            คำอธิบายเลเยอร์
          </span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed mb-4">
          {info.description}
        </p>
        <div className="border-t border-white/5 pt-3">
          <p className="text-xs text-slate-500 mb-2">ระดับค่า ({info.unit})</p>
          <LayerLegend layer={activeLayer} />
        </div>
        <div className="mt-4 rounded-lg p-3" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
          <p className="text-xs text-indigo-300">
            คลิกที่วงกลมบนแผนที่เพื่อดูข้อมูลรายละเอียดของแต่ละอำเภอ
          </p>
        </div>
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
            <FaMapMarkerAlt className="text-indigo-400 text-xs" />
            <span className="text-xs text-indigo-300 font-medium">{typeLabel}</span>
          </div>
          <h3 className="text-white font-semibold text-base leading-tight">
            อ.{d.name}
          </h3>
          <p className="text-slate-500 text-xs">จ.ขอนแก่น</p>
        </div>
        <button
          onClick={onClear}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all"
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
            border: `1px solid ${tempColor}35`,
          }}
        >
          <div className="flex items-center gap-2.5">
            <FaThermometerHalf style={{ color: tempColor }} size={16} />
            <div>
              <p className="text-xs text-slate-400">อุณหภูมิ</p>
              <p className="font-bold text-white text-lg leading-tight">{d.temperature}°C</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-slate-400 text-xs">
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
            border: `1px solid ${pm25Color}35`,
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <FaWind style={{ color: pm25Color }} size={16} />
              <div>
                <p className="text-xs text-slate-400">ฝุ่น PM2.5</p>
                <p className="font-bold text-white text-lg leading-tight">{d.pm25} AQI</p>
              </div>
            </div>
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ color: pm25Level.color, background: `${pm25Level.color}20` }}
            >
              {pm25Level.label}
            </span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
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
            border: `1px solid ${heatColor}35`,
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <FaFireAlt style={{ color: heatColor }} size={16} />
              <div>
                <p className="text-xs text-slate-400">การสะสมความร้อน</p>
                <p className="font-bold text-white text-lg leading-tight">
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
          <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
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

      <div className="border-t border-white/5 pt-3">
        <p className="text-xs text-slate-500 mb-2">ระดับค่า ({info.unit})</p>
        <LayerLegend layer={activeLayer} />
      </div>
    </div>
  );
}

export default function Sidebar({
  activeLayer,
  onLayerChange,
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
  const searchRef = useRef(null);

  const filtered = searchQuery.trim()
    ? districts.filter((d) =>
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        `อำเภอ${d.name}`.includes(searchQuery)
      )
    : [];

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
  };

  const currentLayer = LAYER_BUTTONS.find((l) => l.id === activeLayer);

  return (
    <>
      {/* Toggle button — always visible */}
      <button
        onClick={onToggle}
        className="fixed top-1/2 -translate-y-1/2 z-[1000] flex items-center justify-center w-7 h-16 rounded-r-xl transition-all duration-300"
        style={{
          left: isOpen ? 'min(340px, 85vw)' : '0',
          background: 'rgba(15,23,42,0.85)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderLeft: 'none',
        }}
        aria-label="Toggle sidebar"
      >
        {isOpen ? (
          <FaChevronLeft className="text-slate-400" size={12} />
        ) : (
          <FaChevronRight className="text-slate-400" size={12} />
        )}
      </button>

      {/* Sidebar panel */}
      <aside
        className="fixed top-0 left-0 h-full z-[999] flex flex-col sidebar-transition"
        style={{
          width: 'min(340px, 85vw)',
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          opacity: isOpen ? 1 : 0,
          background: 'rgba(8,12,26,0.88)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Header */}
        <div
          className="flex-shrink-0 px-5 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div className="flex items-center gap-3 mb-1">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            >
              <MdLocationCity className="text-white" size={16} />
            </div>
            <div className="min-w-0">
              <h1 className="text-white font-semibold text-sm leading-tight truncate">
                ระบบติดตามสภาพแวดล้อม
              </h1>
              <p className="text-slate-400 text-xs truncate">จังหวัดขอนแก่น</p>
            </div>
          </div>
          <div className="mt-2">
            <LiveBadge />
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Search box */}
          <div ref={searchRef} className="relative">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
              ค้นหา
            </label>
            <div className="relative">
              <FaSearch
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
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
                placeholder="ค้นหาอำเภอ หรือสถานที่ในจังหวัดขอนแก่น..."
                className="w-full pl-9 pr-9 py-2.5 text-sm rounded-xl text-white placeholder-slate-500 outline-none transition-all"
                style={{
                  background: 'rgba(30,41,59,0.6)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  fontFamily: 'Noto Sans Thai, sans-serif',
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setShowSuggestions(false);
                    onSearchChange('');
                  }
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => { onSearchChange(''); setShowSuggestions(false); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <FaTimes size={10} />
                </button>
              )}
            </div>

            {/* Suggestions dropdown */}
            {showSuggestions && filtered.length > 0 && (
              <div
                className="absolute left-0 right-0 top-full mt-1.5 rounded-xl overflow-hidden z-50 animate-fade-in"
                style={{
                  background: 'rgba(15,23,42,0.97)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                  backdropFilter: 'blur(16px)',
                }}
              >
                {filtered.slice(0, 6).map((d) => (
                  <button
                    key={d.id}
                    onClick={() => handleSuggestionClick(d)}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left hover:bg-white/5 transition-colors"
                  >
                    <FaMapMarkerAlt className="text-indigo-400 flex-shrink-0" size={11} />
                    <div className="min-w-0">
                      <p className="text-sm text-white">อ.{d.name}</p>
                      <p className="text-xs text-slate-500 truncate">
                        อุณหภูมิ {d.temperature}°C · PM2.5 {d.pm25} AQI
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Layer controls */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
              เลือกเลเยอร์ข้อมูล
            </label>
            <div className="space-y-2">
              {LAYER_BUTTONS.map((btn) => {
                const Icon = btn.icon;
                const isActive = activeLayer === btn.id;
                const settings = layerSettings?.[btn.id] ?? { visible: true, opacity: 0.75 };
                return (
                  <div
                    key={btn.id}
                    className="rounded-xl overflow-hidden transition-all duration-200"
                    style={{
                      border: `1px solid ${isActive ? btn.activeBorder : 'rgba(255,255,255,0.06)'}`,
                      boxShadow: isActive ? `0 0 16px ${btn.activeBorder}` : 'none',
                    }}
                  >
                    {/* Layer select button */}
                    <button
                      onClick={() => onLayerChange(btn.id)}
                      className="w-full flex items-center gap-3 px-3.5 py-3 text-left transition-all duration-200"
                      style={{
                        background: isActive ? btn.activeBg : 'rgba(30,41,59,0.4)',
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: isActive ? `${btn.iconColor}20` : 'rgba(255,255,255,0.04)' }}
                      >
                        <Icon size={14} style={{ color: isActive ? btn.iconColor : '#475569' }} />
                      </div>
                      <span className="text-sm font-medium" style={{ color: isActive ? '#e2e8f0' : '#64748b' }}>
                        {btn.label}
                      </span>
                      {isActive && (
                        <div
                          className="ml-auto w-1.5 h-1.5 rounded-full"
                          style={{ background: btn.iconColor, boxShadow: `0 0 6px ${btn.iconColor}` }}
                        />
                      )}
                    </button>

                    {/* Opacity + toggle controls — shown only when active */}
                    {isActive && (
                      <div
                        className="flex items-center gap-2.5 px-3.5 py-2"
                        style={{
                          background: `${btn.iconColor}0d`,
                          borderTop: '1px solid rgba(255,255,255,0.05)',
                        }}
                      >
                        {/* Toggle visibility */}
                        <button
                          onClick={() => onLayerSettingChange(btn.id, 'visible', !settings.visible)}
                          title={settings.visible ? 'ซ่อนเลเยอร์' : 'แสดงเลเยอร์'}
                          className="shrink-0 p-1 rounded transition-colors hover:bg-white/10"
                        >
                          {settings.visible
                            ? <FaEye size={12} style={{ color: btn.iconColor }} />
                            : <FaEyeSlash size={12} className="text-slate-500" />}
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
                          style={{ color: settings.visible ? btn.iconColor : '#475569' }}
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
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.04)' }} />

          {/* Info card */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
              {selectedDistrict ? 'ข้อมูลพื้นที่' : 'ข้อมูลเลเยอร์'}
            </label>
            <InfoCard
              selectedDistrict={selectedDistrict}
              activeLayer={activeLayer}
              onClear={() => onDistrictSelect(null)}
            />
          </div>

          {/* Stats summary */}
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.04)' }} />
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
              ภาพรวมจังหวัด
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  label: 'อุณหภูมิเฉลี่ย',
                  value: `${(districts.reduce((s, d) => s + d.temperature, 0) / districts.length).toFixed(1)}°C`,
                  icon: FaThermometerHalf,
                  color: '#FB923C',
                },
                {
                  label: 'PM2.5 เฉลี่ย',
                  value: `${Math.round(districts.reduce((s, d) => s + d.pm25, 0) / districts.length)} AQI`,
                  icon: FaWind,
                  color: '#22C55E',
                },
                {
                  label: 'จำนวนอำเภอ',
                  value: '26',
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
                      background: 'rgba(30,41,59,0.5)',
                      border: '1px solid rgba(255,255,255,0.05)',
                    }}
                  >
                    <Icon style={{ color: stat.color }} size={13} className="mx-auto mb-1" />
                    <p className="text-white font-bold text-xs leading-tight">{stat.value}</p>
                    <p className="text-slate-500 text-[10px] leading-tight mt-0.5">{stat.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex-shrink-0 px-5 py-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
        >
          <p className="text-slate-600 text-[10px] text-center">
            ข้อมูลจำลองเพื่อการพัฒนา · {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </aside>
    </>
  );
}
