import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { KK_CENTER, KK_BOUNDS, KK_DEFAULT_ZOOM, THAILAND_BOUNDS, hotspots, getTemperatureColor } from '../data/mockData';
import TemperatureLayer from './layers/TemperatureLayer';
import PM25Layer from './layers/PM25Layer';
import HeatAccumulationLayer from './layers/HeatAccumulationLayer';
import TMDTempTileLayer from './layers/TMDTempTileLayer';
import StreamLayer from './layers/StreamLayer';
import NASATempMonthlyLayer from './layers/NASATempMonthlyLayer';
import HotspotLayer from './layers/HotspotLayer';
import HimawariLayer, { HIMAWARI_BANDS, generateFrames } from './layers/HimawariLayer';
import PinLayer from './layers/PinLayer';
import Map3DView from './Map3DView';
import 'leaflet/dist/leaflet.css';

// ข้อมูลแหล่งดาวเทียมแต่ละปี (2000–2024)
const HIST_MIN_YEAR = 2000;
const HIST_MAX_YEAR = 2026;

function getHistSource(year) {
  // 2025–2026: Esri World Imagery (ล่าสุด, ความละเอียดสูง)
  if (year >= 2025) {
    return {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      satellite: 'Esri Latest',
      resolution: '0.3m+',
      maxNativeZoom: 19,
      attr: 'Tiles &copy; Esri — World Imagery (latest)',
      color: '#10b981',
    };
  }
  // 2016–2024: Sentinel-2 cloudless annual (EOxCloudless)
  if (year >= 2016) {
    return {
      url: `https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-${year}_3857/default/g/{z}/{y}/{x}.jpg`,
      satellite: 'Sentinel-2',
      resolution: '10m',
      maxNativeZoom: 14,
      attr: `Sentinel-2 cloudless ${year} &copy; <a href="https://eox.at">EOxCloudless</a>`,
      color: '#6366f1',
    };
  }
  // 2000–2015: NASA MODIS Terra
  return {
    url: `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/${year}-01-15/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`,
    satellite: 'Satellite',
    resolution: '250m',
    maxNativeZoom: 9,
    attr: `NASA GIBS · MODIS Terra ${year}`,
    color: '#0ea5e9',
  };
}

const BASEMAPS = {
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    label: 'ดาวเทียม',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/>
        <line x1="4.93" y1="4.93" x2="9.17" y2="9.17"/><line x1="14.83" y1="14.83" x2="19.07" y2="19.07"/>
        <line x1="14.83" y1="9.17" x2="19.07" y2="4.93"/><line x1="4.93" y1="19.07" x2="9.17" y2="14.83"/>
      </svg>
    ),
  },
  street: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    label: 'แผนที่',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
        <line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>
      </svg>
    ),
  },
  historical: {
    url: null,
    label: 'ย้อนเวลา',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="1 4 1 10 7 10"/>
        <path d="M3.51 15a9 9 0 1 0 .49-4.09"/>
      </svg>
    ),
  },
};


function HistoryYearPanel({ selectedYear, onSelect }) {
  const src = getHistSource(selectedYear);
  const allYears = Array.from(
    { length: HIST_MAX_YEAR - HIST_MIN_YEAR + 1 },
    (_, i) => HIST_MAX_YEAR - i
  );

  return (
    <div
      className="absolute right-3 z-[1000] rounded-xl overflow-hidden"
      style={{
        bottom: '5.5rem',
        width: '210px',
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(0,0,0,0.1)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
      }}
    >
      {/* Header + ดาวเทียมที่กำลังใช้ */}
      <div className="px-3 pt-2.5 pb-2 border-b border-black/[0.06]">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">
          ภาพย้อนหลัง (2000–2026)
        </p>
        <div className="flex items-center gap-1.5">
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
            style={{
              background: src.satellite.startsWith('Sentinel') ? 'rgba(99,102,241,0.12)' : 'rgba(239,68,68,0.1)',
              color: src.satellite.startsWith('Sentinel') ? '#4f46e5' : '#dc2626',
            }}
          >
            {src.satellite}
          </span>
          <span className="text-[10px] text-slate-400">{src.resolution}/pixel</span>
        </div>
      </div>

      {/* ตำแหน่งปี */}
      <div
        className="px-3 py-2 grid grid-cols-4 gap-1"
        style={{ maxHeight: '180px', overflowY: 'auto', scrollbarWidth: 'thin' }}
      >
        {allYears.map((y) => {
          const src = getHistSource(y);
          const active = selectedYear === y;
          return (
            <button
              key={y}
              onClick={() => onSelect(y)}
              className="py-1 rounded-md text-[11px] font-semibold transition-all"
              style={{
                background: active ? src.color : 'rgba(0,0,0,0.04)',
                color: active ? '#fff' : src.color,
                border: `1px solid ${active ? src.color : `${src.color}40`}`,
              }}
            >
              {y}
            </button>
          );
        })}
      </div>

      <div className="px-3 pb-2.5 space-y-1">
        {[
          { color: '#10b981', label: 'Esri Latest · 0.3m+' },
          { color: '#6366f1', label: 'Sentinel-2 · 10m' },
          { color: '#0ea5e9', label: 'Satellite · 250m' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: color }} />
            <span className="text-[10px] text-slate-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Himawari animated satellite panel ── */
function HimawariPanel({ band, onBandChange, playing, onTogglePlay, frameIdx, frames, onScrub }) {
  const currentTime = frames[frameIdx] ?? '';
  const timeStr = currentTime
    ? new Date(currentTime).toLocaleString('th-TH', {
        hour: '2-digit', minute: '2-digit',
        day: 'numeric', month: 'short',
        timeZone: 'Asia/Bangkok',
      })
    : '--:--';

  return (
    <div
      className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] rounded-xl overflow-hidden"
      style={{
        background: 'rgba(15,23,42,0.93)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(8,145,178,0.4)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
        minWidth: '260px',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-2">
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${playing ? 'bg-cyan-400 animate-pulse' : 'bg-slate-500'}`} />
          <span className="text-[11px] font-bold text-cyan-300 uppercase tracking-widest">Himawari-9 AHI</span>
        </div>
        <span className="text-[10px] text-slate-300 font-mono">{timeStr} ICT</span>
      </div>

      {/* Band selector */}
      <div className="flex gap-1 px-1.5 pt-1.5">
        {HIMAWARI_BANDS.map(b => (
          <button
            key={b.id}
            onClick={() => onBandChange(b.id)}
            title={b.desc}
            className="flex-1 py-1.5 px-1 rounded-lg text-[10px] font-semibold transition-all duration-150 leading-tight text-center"
            style={{
              background: band === b.id ? 'rgba(8,145,178,0.85)' : 'rgba(255,255,255,0.07)',
              color:      band === b.id ? '#fff' : '#94a3b8',
              border:     `1px solid ${band === b.id ? 'rgba(8,145,178,0.6)' : 'transparent'}`,
            }}
          >
            {b.label}
          </button>
        ))}
      </div>

      {/* Timeline scrubber */}
      <div className="px-3 pt-2">
        <input
          type="range"
          min={0}
          max={frames.length - 1}
          value={frameIdx}
          onChange={e => onScrub(Number(e.target.value))}
          className="w-full h-1 rounded-full cursor-pointer"
          style={{ accentColor: '#0891b2' }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between px-3 py-2">
        <button
          onClick={onTogglePlay}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-150"
          style={{
            background: playing ? 'rgba(8,145,178,0.85)' : 'rgba(255,255,255,0.1)',
            color:      playing ? '#fff' : '#94a3b8',
            border:     `1px solid ${playing ? 'rgba(8,145,178,0.6)' : 'rgba(255,255,255,0.1)'}`,
          }}
        >
          {playing ? (
            <>
              <svg width="9" height="10" viewBox="0 0 9 10" fill="currentColor">
                <rect x="0" y="0" width="3.5" height="10" rx="1"/>
                <rect x="5.5" y="0" width="3.5" height="10" rx="1"/>
              </svg>
              หยุด
            </>
          ) : (
            <>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                <polygon points="0,0 10,5 0,10"/>
              </svg>
              เล่น
            </>
          )}
        </button>

        <div className="flex items-center gap-1.5">
          {/* Frame dots */}
          <div className="flex gap-0.5">
            {frames.map((_, i) => (
              <button
                key={i}
                onClick={() => onScrub(i)}
                className="rounded-full transition-all duration-100"
                style={{
                  width:  i === frameIdx ? '10px' : '4px',
                  height: '4px',
                  background: i <= frameIdx ? '#0891b2' : 'rgba(255,255,255,0.2)',
                  flexShrink: 0,
                }}
              />
            ))}
          </div>
          <span className="text-[9px] text-slate-500 font-mono ml-1">
            {frameIdx + 1}/{frames.length}
          </span>
        </div>
      </div>

      {/* Resolution note */}
      <div className="px-3 pb-2 text-[9px] text-slate-600 border-t border-white/[0.05] pt-1.5">
        {HIMAWARI_BANDS.find(b => b.id === band)?.desc} · ทุก 10 นาที · 2 ชั่วโมงย้อนหลัง
      </div>
    </div>
  );
}

function BoundsLocker() {
  const map = useMap();
  useEffect(() => {
    map.setMaxBounds(THAILAND_BOUNDS);
    map.options.maxBoundsViscosity = 0.7;
    map.options.minZoom = 6;
  }, [map]);
  return null;
}

function MapClickHandler({ onMapClick, onPointClick, pinMode, onAddPin }) {
  const map = useMap();
  useEffect(() => {
    const fn = (e) => {
      if (pinMode) {
        onAddPin?.(e.latlng.lat, e.latlng.lng);
      } else {
        onMapClick();
        onPointClick(e.latlng.lat, e.latlng.lng);
      }
    };
    map.on('click', fn);
    return () => map.off('click', fn);
  }, [map, onMapClick, onPointClick, pinMode, onAddPin]);
  return null;
}

/* ── Temperature popup at arbitrary clicked point ── */
function TempPointMarker({ point, onClose }) {
  const markerRef = useRef(null);

  // Auto-open popup when marker appears on map
  const onAdd = useCallback((e) => { e.target.openPopup(); }, []);

  if (!point) return null;

  const tc   = point.temp != null ? getTemperatureColor(Math.round(point.temp)) : '#3b82f6';
  const icon = L.divIcon({
    className: '',
    html: `<div style="
      width:13px;height:13px;border-radius:50%;
      background:#3b82f6;border:2.5px solid white;
      box-shadow:0 0 0 5px rgba(59,130,246,0.2),0 2px 10px rgba(59,130,246,0.5);
    "></div>`,
    iconSize:   [13, 13],
    iconAnchor: [6.5, 6.5],
  });

  return (
    <Marker
      ref={markerRef}
      position={[point.lat, point.lng]}
      icon={icon}
      eventHandlers={{ add: onAdd }}
    >
      <Popup
        autoPan={false}
        closeButton
        onClose={onClose}
        offset={[0, -10]}
        className="temp-point-popup"
      >
        <div style={{ fontFamily: 'Noto Sans Thai, Inter, sans-serif', minWidth: '160px', padding: '2px 0' }}>
          {point.status === 'loading' && (
            <div style={{ color: '#94a3b8', fontSize: '12px' }}>
              <div style={{ width: '80px', height: '32px', borderRadius: '6px', background: '#f1f5f9', marginBottom: '6px' }} />
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ width: '48px', height: '12px', borderRadius: '4px', background: '#f1f5f9' }} />
                <div style={{ width: '48px', height: '12px', borderRadius: '4px', background: '#f1f5f9' }} />
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>กำลังโหลด...</div>
            </div>
          )}

          {point.status === 'error' && (
            <div style={{ color: '#ef4444', fontSize: '12px' }}>โหลดข้อมูลไม่สำเร็จ</div>
          )}

          {point.status === 'ok' && (
            <>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                🌡️ อุณหภูมิ ณ จุดนี้
              </div>
              <div style={{ fontSize: '30px', fontWeight: 900, color: tc, lineHeight: 1.1 }}>
                {point.temp?.toFixed(1)}
                <span style={{ fontSize: '15px', fontWeight: 700 }}>°C</span>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '12px', color: '#475569' }}>
                <span>💧 {point.humidity}%</span>
                <span>🌬️ {point.wind} km/h</span>
              </div>
              <div style={{ fontSize: '9px', color: '#cbd5e1', marginTop: '8px', fontFamily: 'monospace' }}>
                {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
              </div>
            </>
          )}
        </div>
      </Popup>
    </Marker>
  );
}

function FlyToHandler({ target }) {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    map.flyTo([target.lat, target.lng], target.zoom ?? 14, { animate: true, duration: 1.2 });
  }, [map, target?.ts]);
  return null;
}

export default function MapView({ activeLayers, tambons, selectedDistrict, onDistrictClick, onMapClick, forecastDatetime, layerSettings, selectedMonth, flyToTarget, pins, onAddPin, onDeleteLastPin, pinCount, isSupabase }) {
  const [basemap, setBasemap] = useState('satellite');
  const [historyYear, setHistoryYear] = useState(2026);
  const [show3D, setShow3D] = useState(false);
  const [tempPoint, setTempPoint] = useState(null);
  const [pinMode, setPinMode] = useState(false);
  const [himawariband, setHimawariband] = useState('visible');
  const [himawariFrames] = useState(() => generateFrames(12));
  const [himawariFrameIdx, setHimawariFrameIdx] = useState(11); // start at latest
  const [himawariPlaying, setHimawariPlaying] = useState(false);

  // Advance frame every 700ms when playing
  useEffect(() => {
    if (!himawariPlaying) return;
    const id = setInterval(() => {
      setHimawariFrameIdx(i => (i + 1) % himawariFrames.length);
    }, 1500);
    return () => clearInterval(id);
  }, [himawariPlaying, himawariFrames.length]);

  const handlePointClick = useCallback((lat, lng) => {
    setTempPoint({ lat, lng, status: 'loading' });
    fetch(
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat.toFixed(6)}&longitude=${lng.toFixed(6)}` +
      `&current=temperature_2m,relative_humidity_2m,wind_speed_10m` +
      `&timezone=Asia%2FBangkok&wind_speed_unit=kmh`
    )
      .then(r => r.json())
      .then(d => setTempPoint({
        lat, lng, status: 'ok',
        temp:     d.current?.temperature_2m,
        humidity: d.current?.relative_humidity_2m,
        wind:     d.current?.wind_speed_10m,
      }))
      .catch(() => setTempPoint(p => p ? { ...p, status: 'error' } : null));
  }, []);

  const selectedId = selectedDistrict?.id;
  const s = (id) => layerSettings?.[id] ?? { visible: true, opacity: 0.75 };
  const has = (id) => activeLayers?.has(id) ?? false;

  const histSrc = getHistSource(historyYear);

  const tileUrl = basemap === 'satellite' ? BASEMAPS.satellite.url
    : basemap === 'street' ? BASEMAPS.street.url
    : histSrc.url;

  const tileAttr = basemap === 'satellite' ? BASEMAPS.satellite.attribution
    : basemap === 'street' ? BASEMAPS.street.attribution
    : histSrc.attr;

  const tileKey = basemap === 'historical' ? `hist-${historyYear}` : basemap;
  const nativeZoom = basemap === 'historical' ? histSrc.maxNativeZoom : 19;

  if (show3D) {
    return <Map3DView onClose={() => setShow3D(false)} />;
  }

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={KK_CENTER}
        zoom={KK_DEFAULT_ZOOM}
        maxBounds={THAILAND_BOUNDS}
        maxBoundsViscosity={0.7}
        minZoom={6}
        maxZoom={17}
        zoomControl={false}
        style={{ width: '100%', height: '100%' }}
        className="z-0"
      >
        <TileLayer
          key={tileKey}
          url={tileUrl}
          attribution={tileAttr}
          maxZoom={19}
          maxNativeZoom={nativeZoom}
        />

        <BoundsLocker />
        <MapClickHandler
          onMapClick={onMapClick}
          onPointClick={handlePointClick}
          pinMode={pinMode}
          onAddPin={onAddPin}
        />
        <FlyToHandler target={flyToTarget} />
        <TempPointMarker point={tempPoint} onClose={() => setTempPoint(null)} />
        {pins?.length > 0 && <PinLayer pins={pins} />}

        {/* Zoom control — bottom right */}
        <div className="leaflet-control-container">
          <div className="leaflet-bottom leaflet-right">
            <div className="leaflet-control-zoom leaflet-bar leaflet-control" />
          </div>
        </div>

        {has('temperature') && s('temperature').visible && forecastDatetime && (
          <TMDTempTileLayer datetime={forecastDatetime} opacity={s('temperature').opacity} />
        )}
        {has('temperature') && s('temperature').visible && (
          <TemperatureLayer districts={tambons} onDistrictClick={onDistrictClick} selectedId={selectedId} opacity={s('temperature').opacity} />
        )}
        {has('pm25') && s('pm25').visible && (
          <PM25Layer districts={tambons} onDistrictClick={onDistrictClick} selectedId={selectedId} opacity={s('pm25').opacity} />
        )}
        {has('heat') && s('heat').visible && (
          <HeatAccumulationLayer districts={tambons} onDistrictClick={onDistrictClick} selectedId={selectedId} opacity={s('heat').opacity} />
        )}
        {has('stream') && s('stream').visible && (
          <StreamLayer opacity={s('stream').opacity} />
        )}
        {has('monthly_temp') && s('monthly_temp').visible && selectedMonth && (
          <NASATempMonthlyLayer month={selectedMonth} opacity={s('monthly_temp').opacity} />
        )}
        {has('hotspot') && s('hotspot').visible && (
          <HotspotLayer hotspots={hotspots} opacity={s('hotspot').opacity} />
        )}
        {/* Render all frames simultaneously — inactive ones opacity=0 so tiles are cached */}
        {has('himawari') && himawariFrames.map((t, i) => (
          <HimawariLayer
            key={`${himawariband}-${t}`}
            band={himawariband}
            opacity={s('himawari').visible && i === himawariFrameIdx
              ? s('himawari').opacity
              : 0}
            time={t}
          />
        ))}
      </MapContainer>

      {/* Himawari animated panel */}
      {has('himawari') && (
        <HimawariPanel
          band={himawariband}
          onBandChange={setHimawariband}
          playing={himawariPlaying}
          onTogglePlay={() => setHimawariPlaying(v => !v)}
          frameIdx={himawariFrameIdx}
          frames={himawariFrames}
          onScrub={(i) => { setHimawariFrameIdx(i); setHimawariPlaying(false); }}
        />
      )}

      {/* Year panel ภาพย้อนหลัง */}
      {basemap === 'historical' && (
        <HistoryYearPanel selectedYear={historyYear} onSelect={setHistoryYear} />
      )}

      {/* ── Pin controls ── */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col items-end gap-2">
        {/* Pin mode toggle */}
        <button
          onClick={() => setPinMode(v => !v)}
          title={pinMode ? 'ออกจากโหมดวาง Box' : 'วาง Pixel Box บนแผนที่'}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all duration-200"
          style={{
            background: pinMode ? 'rgba(59,130,246,0.95)' : 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            color: pinMode ? '#fff' : '#3b82f6',
            border: `1px solid ${pinMode ? 'rgba(59,130,246,0.6)' : '#e0eaff'}`,
            boxShadow: pinMode ? '0 4px 16px rgba(59,130,246,0.4)' : '0 2px 8px rgba(0,0,0,0.1)',
            imageRendering: 'pixelated',
          }}
        >
          {/* Pixel box icon */}
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="1" width="11" height="11" rx="1.5" fill="currentColor" opacity="0.9"/>
            <rect x="2" y="2" width="3" height="3" fill="white" opacity="0.5"/>
            <rect x="5" y="5" width="3" height="3" fill="white" opacity="0.85"/>
          </svg>
          {pinMode ? 'คลิกเพื่อวาง' : 'วาง Box'}
        </button>

        {/* Pin count + delete — show only when there are pins */}
        {(pinCount ?? 0) > 0 && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{
              background: 'rgba(255,255,255,0.97)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid #e0eaff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            {/* Count badge */}
            <div className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="#6366f1">
                <rect x="1" y="1" width="10" height="10" rx="1.5"/>
                <rect x="2" y="2" width="3" height="3" fill="white" opacity="0.5"/>
                <rect x="5" y="5" width="2" height="2" fill="white" opacity="0.8"/>
              </svg>
              <span className="text-[11px] font-bold text-slate-700">
                {pinCount} box{isSupabase ? '' : ' (local)'}
              </span>
            </div>

            <div className="w-px h-4 bg-slate-200" />

            {/* Delete last */}
            <button
              onClick={onDeleteLastPin}
              title="ลบ Box ล่าสุด"
              className="flex items-center gap-1 text-[11px] font-semibold text-red-400 hover:text-red-600 transition-colors"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
              ลบล่าสุด
            </button>
          </div>
        )}
      </div>

      {/* Cursor crosshair when in pin mode */}
      {pinMode && (
        <div className="absolute inset-0 z-[999] pointer-events-none"
          style={{ cursor: 'crosshair' }} />
      )}

      {/* Basemap toggle */}
      <div className="absolute bottom-6 right-3 z-[1000] flex flex-col items-end gap-2">
        {/* 3D button */}
        <button
          onClick={() => setShow3D(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all duration-200"
          style={{
            background: 'rgba(15,23,42,0.9)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            color: '#a5b4fc',
            border: '1px solid rgba(99,102,241,0.4)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          </svg>
          3D
        </button>

        {/* Basemap row */}
        <div
          className="flex rounded-xl overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.96)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(0,0,0,0.1)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          }}
        >
          {Object.entries(BASEMAPS).map(([key, meta], i, arr) => (
            <button
              key={key}
              onClick={() => setBasemap(key)}
              className="flex flex-col items-center gap-1 px-3.5 py-2.5 text-[11px] font-medium transition-all duration-200"
              style={{
                background: basemap === key ? 'rgba(99,102,241,0.1)' : 'transparent',
                color: basemap === key ? '#4f46e5' : '#94a3b8',
                borderRight: i < arr.length - 1 ? '1px solid rgba(0,0,0,0.07)' : 'none',
              }}
            >
              <span style={{ color: basemap === key ? '#4f46e5' : '#94a3b8' }}>{meta.icon}</span>
              {meta.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
