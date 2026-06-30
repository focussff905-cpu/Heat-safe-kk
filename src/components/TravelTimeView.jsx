import { useState, useCallback, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, GeoJSON, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { KK_CENTER, KK_DEFAULT_ZOOM, KK_BOUNDS } from '../data/mockData';

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

const schoolIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:28px;height:28px;border-radius:8px;
    background:#fff;border:2px solid #3b82f6;
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 2px 6px rgba(0,0,0,0.15);
    font-size:16px;cursor:pointer;">🏫</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

function MapClickHandler({ onClick }) {
  useMapEvents({ click: e => onClick(e.latlng) });
  return null;
}

function kmlDocToGeoJson(doc) {
  const features = [];
  const parseCoords = t => (t || '').trim().split(/\s+/).map(c => {
    const p = c.split(',');
    return [parseFloat(p[0]), parseFloat(p[1])];
  }).filter(([x, y]) => !isNaN(x) && !isNaN(y));

  for (const pm of doc.getElementsByTagName('Placemark')) {
    const name = pm.querySelector('name')?.textContent || '';
    const ptc = pm.querySelector('Point coordinates');
    if (ptc) {
      const p = ptc.textContent.trim().split(',');
      features.push({ type: 'Feature', properties: { name }, geometry: { type: 'Point', coordinates: [+p[0], +p[1]] } });
    }
  }
  return { type: 'FeatureCollection', features };
}

function SchoolLayer({ onSchoolClick }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch('/kmz/school.kmz');
        if (!res.ok || cancelled) return;
        const buf = await res.arrayBuffer();

        let kmlText = null;
        if (window.JSZip) {
          const zip = await window.JSZip.loadAsync(buf);
          for (const [fn, file] of Object.entries(zip.files)) {
            if (fn.toLowerCase().endsWith('.kml')) { kmlText = await file.async('text'); break; }
          }
        }
        if (!kmlText || cancelled) return;

        const doc = new DOMParser().parseFromString(kmlText, 'text/xml');
        const gj = window.toGeoJSON ? window.toGeoJSON.kml(doc) : kmlDocToGeoJson(doc);
        if (cancelled) return;

        const lyr = L.geoJSON(gj, {
          filter: f => {
            if (f.geometry?.type !== 'Point') return false;
            const [lng, lat] = f.geometry.coordinates;
            return lat >= KK_BOUNDS[0][0] && lat <= KK_BOUNDS[1][0]
                && lng >= KK_BOUNDS[0][1] && lng <= KK_BOUNDS[1][1];
          },
          pointToLayer: (feature, ll) => {
            const marker = L.marker(ll, { icon: schoolIcon });
            marker.bindTooltip(feature.properties?.name || 'โรงเรียน', { direction: 'top', offset: [0, -14] });
            marker.on('click', (e) => {
              L.DomEvent.stopPropagation(e);
              onSchoolClick({ lat: ll.lat, lng: ll.lng }, feature.properties?.name || 'โรงเรียน');
            });
            return marker;
          },
        });
        lyr.addTo(map);
        layerRef.current = lyr;
      } catch (e) {
        console.warn('School KMZ load error:', e);
      }
    }

    load();
    return () => {
      cancelled = true;
      if (layerRef.current) { map.removeLayer(layerRef.current); layerRef.current = null; }
    };
  }, [map, onSchoolClick]);

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
  const [originName, setOriginName] = useState(null);
  const [mode, setMode]             = useState('driving-car');
  const [times, setTimes]           = useState([15, 30]);
  const [geojson, setGeojson]       = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [showSchools, setShowSchools] = useState(true);
  const geojsonKey = useRef(0);

  const toggleTime = useCallback((t) => {
    setTimes(prev =>
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t].sort((a, b) => a - b)
    );
  }, []);

  const runIsochrone = useCallback(async (latlng, name = null) => {
    if (!ORS_KEY) { setError('ยังไม่ได้ตั้งค่า VITE_ORS_KEY ใน .env'); return; }
    if (times.length === 0) { setError('เลือกช่วงเวลาอย่างน้อย 1 รายการ'); return; }

    setOrigin(latlng);
    setOriginName(name);
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

  const handleMapClick  = useCallback((latlng) => runIsochrone(latlng, null), [runIsochrone]);
  const handleSchoolClick = useCallback((latlng, name) => runIsochrone(latlng, name), [runIsochrone]);

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
        {showSchools && <SchoolLayer onSchoolClick={handleSchoolClick} />}

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

      {/* ── Layer toggles (right) ── */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
        <button
          onClick={() => setShowSchools(v => !v)}
          className="flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-semibold shadow-md transition-all"
          style={{
            background: showSchools ? '#eff6ff' : 'rgba(255,255,255,0.97)',
            color:      showSchools ? '#3b82f6' : '#94a3b8',
            border:     showSchools ? '1.5px solid #93c5fd' : '1.5px solid #e2e8f0',
            backdropFilter: 'blur(12px)',
          }}
        >
          <span style={{ fontSize: 16 }}>🏫</span>
          โรงเรียน
        </button>
      </div>

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
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm" style={{ color: '#1e293b' }}>Travel Time Map</div>
              <div className="text-[10px] truncate" style={{ color: '#94a3b8' }}>
                {originName ? `📍 ${originName}` : 'คลิกแผนที่หรือ 🏫 โรงเรียนเพื่อเลือกจุดเริ่มต้น'}
              </div>
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
            ⚙️ ตั้งค่า <code>VITE_ORS_KEY</code> ใน .env เพื่อใช้งาน
          </div>
        )}
      </div>
    </div>
  );
}
