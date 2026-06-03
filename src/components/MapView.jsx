import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { KK_CENTER, KK_BOUNDS, KK_DEFAULT_ZOOM, THAILAND_BOUNDS, hotspots } from '../data/mockData';
import TemperatureLayer from './layers/TemperatureLayer';
import PM25Layer from './layers/PM25Layer';
import HeatAccumulationLayer from './layers/HeatAccumulationLayer';
import TMDTempTileLayer from './layers/TMDTempTileLayer';
import StreamLayer from './layers/StreamLayer';
import NASATempMonthlyLayer from './layers/NASATempMonthlyLayer';
import HotspotLayer from './layers/HotspotLayer';
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

function BoundsLocker() {
  const map = useMap();
  useEffect(() => {
    map.setMaxBounds(THAILAND_BOUNDS);
    map.options.maxBoundsViscosity = 0.7;
    map.options.minZoom = 6;
  }, [map]);
  return null;
}

function MapClickHandler({ onMapClick }) {
  const map = useMap();
  useEffect(() => {
    map.on('click', onMapClick);
    return () => map.off('click', onMapClick);
  }, [map, onMapClick]);
  return null;
}

function FlyToHandler({ target }) {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    map.flyTo([target.lat, target.lng], target.zoom ?? 14, { animate: true, duration: 1.2 });
  }, [map, target?.ts]);
  return null;
}

export default function MapView({ activeLayers, tambons, selectedDistrict, onDistrictClick, onMapClick, forecastDatetime, layerSettings, selectedMonth, flyToTarget }) {
  const [basemap, setBasemap] = useState('satellite');
  const [historyYear, setHistoryYear] = useState(2026);

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
        <MapClickHandler onMapClick={onMapClick} />
        <FlyToHandler target={flyToTarget} />

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
      </MapContainer>

      {/* Year panel ภาพย้อนหลัง */}
      {basemap === 'historical' && (
        <HistoryYearPanel selectedYear={historyYear} onSelect={setHistoryYear} />
      )}

      {/* Basemap toggle */}
      <div
        className="absolute bottom-6 right-3 z-[1000] flex rounded-xl overflow-hidden"
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
  );
}
