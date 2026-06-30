import { useState, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, GeoJSON, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { KK_CENTER, KK_DEFAULT_ZOOM } from '../data/mockData';

const ORS_KEY = import.meta.env.VITE_ORS_KEY;

const MODES = [
  { id: 'driving-car',     label: 'รถยนต์',    icon: '🚗' },
  { id: 'foot-walking',    label: 'เดินเท้า',  icon: '🚶' },
  { id: 'cycling-regular', label: 'จักรยาน',   icon: '🚲' },
];

const TIME_OPTIONS = [15, 30, 45, 60];

const RING_STYLE = {
  15: { color: '#16a34a', fillColor: '#22c55e', fillOpacity: 0.25, weight: 2 },
  30: { color: '#ca8a04', fillColor: '#eab308', fillOpacity: 0.22, weight: 2 },
  45: { color: '#ea580c', fillColor: '#f97316', fillOpacity: 0.20, weight: 2 },
  60: { color: '#dc2626', fillColor: '#ef4444', fillOpacity: 0.18, weight: 2 },
};

const originIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:18px;height:18px;border-radius:50%;
    background:#3b82f6;border:3px solid #fff;
    box-shadow:0 2px 8px rgba(59,130,246,0.6)">
  </div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function MapClickHandler({ onClick }) {
  useMapEvents({ click: e => onClick(e.latlng) });
  return null;
}

async function fetchIsochrones(lat, lng, profile, minutes) {
  const res = await fetch(
    `https://api.openrouteservice.org/v2/isochrones/${profile}`,
    {
      method: 'POST',
      headers: { Authorization: ORS_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locations: [[lng, lat]],
        range: minutes.map(m => m * 60),
        range_type: 'time',
        smoothing: 0.5,
      }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export default function TravelTimeView() {
  const [origin, setOrigin]         = useState(null);
  const [mode, setMode]             = useState('driving-car');
  const [times, setTimes]           = useState([15, 30]);
  const [geojson, setGeojson]       = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const geojsonKey = useRef(0);

  const toggleTime = useCallback((t) => {
    setTimes(prev =>
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t].sort((a, b) => a - b)
    );
  }, []);

  const handleMapClick = useCallback(async (latlng) => {
    if (!ORS_KEY) { setError('ยังไม่ได้ตั้งค่า VITE_ORS_KEY ใน .env'); return; }
    if (times.length === 0) { setError('เลือกช่วงเวลาอย่างน้อย 1 รายการ'); return; }

    setOrigin(latlng);
    setError(null);
    setLoading(true);
    setGeojson(null);

    try {
      const data = await fetchIsochrones(latlng.lat, latlng.lng, mode, times);
      geojsonKey.current += 1;
      setGeojson(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [mode, times]);

  const styleFeature = useCallback((feature) => {
    const seconds = feature.properties?.value ?? 0;
    const minutes = Math.round(seconds / 60);
    const closest = TIME_OPTIONS.reduce((a, b) =>
      Math.abs(b - minutes) < Math.abs(a - minutes) ? b : a
    );
    return RING_STYLE[closest] ?? RING_STYLE[60];
  }, []);

  const onEachFeature = useCallback((feature, layer) => {
    const minutes = Math.round((feature.properties?.value ?? 0) / 60);
    layer.bindTooltip(`${minutes} นาที`, { sticky: true });
  }, []);

  return (
    <div className="relative w-full" style={{ height: '100dvh' }}>

      {/* ── Map ── */}
      <MapContainer
        center={KK_CENTER}
        zoom={KK_DEFAULT_ZOOM}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='© OpenStreetMap © CARTO'
        />
        <MapClickHandler onClick={handleMapClick} />

        {/* Isochrone polygons — render largest first so smaller ones sit on top */}
        {geojson && (
          <GeoJSON
            key={geojsonKey.current}
            data={{
              ...geojson,
              features: [...geojson.features].sort(
                (a, b) => (b.properties?.value ?? 0) - (a.properties?.value ?? 0)
              ),
            }}
            style={styleFeature}
            onEachFeature={onEachFeature}
          />
        )}

        {origin && <Marker position={origin} icon={originIcon} />}
      </MapContainer>

      {/* ── Control panel ── */}
      <div
        className="absolute top-3 left-1/2 z-[1000] w-[calc(100%-24px)] max-w-sm"
        style={{ transform: 'translateX(-50%)' }}
      >
        <div style={{
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(16px)',
          borderRadius: 16,
          boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
          padding: '14px 16px',
        }}>

          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => window.location.href = '/'}
              className="flex items-center justify-center rounded-full"
              style={{ width: 32, height: 32, background: '#f1f5f9', flexShrink: 0 }}
            >
              <span style={{ fontSize: 16 }}>←</span>
            </button>
            <div>
              <div className="font-bold text-sm" style={{ color: '#1e293b' }}>Travel Time Map</div>
              <div className="text-[10px]" style={{ color: '#94a3b8' }}>คลิกบนแผนที่เพื่อเลือกจุดเริ่มต้น</div>
            </div>
          </div>

          {/* Travel mode */}
          <div className="flex gap-2 mb-3">
            {MODES.map(m => (
              <button
                key={m.id}
                onClick={() => { setMode(m.id); setGeojson(null); setError(null); }}
                className="flex-1 flex flex-col items-center gap-0.5 rounded-xl py-2 transition-all"
                style={{
                  background: mode === m.id ? '#3b82f6' : '#f1f5f9',
                  color: mode === m.id ? '#fff' : '#475569',
                  fontWeight: mode === m.id ? 700 : 400,
                  border: 'none',
                  fontSize: 11,
                }}
              >
                <span style={{ fontSize: 18 }}>{m.icon}</span>
                {m.label}
              </button>
            ))}
          </div>

          {/* Time range */}
          <div className="flex gap-2">
            {TIME_OPTIONS.map(t => {
              const active = times.includes(t);
              const style  = RING_STYLE[t];
              return (
                <button
                  key={t}
                  onClick={() => toggleTime(t)}
                  className="flex-1 rounded-xl py-1.5 text-xs font-semibold transition-all"
                  style={{
                    background: active ? style.fillColor : '#f1f5f9',
                    color:      active ? '#fff'           : '#64748b',
                    border:     active ? `2px solid ${style.color}` : '2px solid transparent',
                  }}
                >
                  {t} นาที
                </button>
              );
            })}
          </div>

          {/* Legend */}
          {geojson && (
            <div className="flex gap-3 mt-3 flex-wrap">
              {times.map(t => (
                <div key={t} className="flex items-center gap-1">
                  <div style={{
                    width: 10, height: 10, borderRadius: 2,
                    background: RING_STYLE[t].fillColor,
                    border: `1.5px solid ${RING_STYLE[t].color}`,
                  }} />
                  <span className="text-[10px]" style={{ color: '#475569' }}>{t} นาที</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status messages */}
        {loading && (
          <div className="mt-2 text-center text-xs font-medium py-2 px-4 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.95)', color: '#3b82f6' }}>
            ⏳ กำลังคำนวณเส้นทาง…
          </div>
        )}
        {error && (
          <div className="mt-2 text-xs py-2 px-4 rounded-xl"
            style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
            ⚠️ {error}
          </div>
        )}
        {!ORS_KEY && (
          <div className="mt-2 text-xs py-2 px-4 rounded-xl"
            style={{ background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' }}>
            ⚙️ ตั้งค่า <code>VITE_ORS_KEY</code> ใน .env เพื่อใช้งาน<br />
            รับ API key ฟรีที่ openrouteservice.org
          </div>
        )}
      </div>
    </div>
  );
}
