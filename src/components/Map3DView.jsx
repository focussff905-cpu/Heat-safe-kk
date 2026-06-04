import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const KK_CENTER_LNG = 102.8359;
const KK_CENTER_LAT = 16.4322;

const DEM_MODES = [
  { id: 'none',      label: 'ปิด' },
  { id: 'hillshade', label: 'Hillshade' },
  { id: 'colordem',  label: 'Elevation Color' },
];

export default function Map3DView({ onClose }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const [pitch, setPitch] = useState(55);
  const [exaggeration, setExaggeration] = useState(2);
  const [bearing, setBearing] = useState(-20);
  const [demMode, setDemMode] = useState('none');
  const [hillshadeIntensity, setHillshadeIntensity] = useState(0.5);
  const [demOpacity, setDemOpacity] = useState(0.6);
  const [satOpacity, setSatOpacity] = useState(1);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
        sources: {
          satellite: {
            type: 'raster',
            tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
            tileSize: 256,
            attribution: '© Esri — World Imagery',
          },
          terrain: {
            type: 'raster-dem',
            tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
            tileSize: 256,
            encoding: 'terrarium',
          },
          // Esri Shaded Relief — colored elevation layer (free, no key)
          shadedrelief: {
            type: 'raster',
            tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}'],
            tileSize: 256,
            attribution: '© Esri — World Shaded Relief',
            maxzoom: 13,
          },
        },
        layers: [
          {
            id: 'satellite',
            type: 'raster',
            source: 'satellite',
            paint: { 'raster-opacity': 1 },
          },
          // Hillshade layer — uses raster-dem source directly
          {
            id: 'hillshade',
            type: 'hillshade',
            source: 'terrain',
            layout: { visibility: 'none' },
            paint: {
              'hillshade-exaggeration': 0.5,
              'hillshade-shadow-color': '#1a202c',
              'hillshade-highlight-color': '#ffffff',
              'hillshade-accent-color': '#4a5568',
              'hillshade-illumination-direction': 335,
              'hillshade-illumination-anchor': 'map',
            },
          },
          // Esri Shaded Relief colored DEM overlay
          {
            id: 'colordem',
            type: 'raster',
            source: 'shadedrelief',
            layout: { visibility: 'none' },
            paint: { 'raster-opacity': 0.6 },
          },
        ],
        terrain: { source: 'terrain', exaggeration: 2 },
        sky: {
          'sky-color': '#87CEEB',
          'sky-horizon-blend': 0.5,
          'horizon-color': '#c8e8ff',
          'horizon-fog-blend': 0.3,
          'fog-color': '#d8eeff',
          'fog-ground-blend': 0.5,
        },
      },
      center: [KK_CENTER_LNG, KK_CENTER_LAT],
      zoom: 9,
      pitch: 55,
      bearing: -20,
      maxPitch: 85,
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');

    map.on('load', () => {
      map.setTerrain({ source: 'terrain', exaggeration: 2 });
    });

    map.on('pitchend', () => setPitch(Math.round(map.getPitch())));
    map.on('rotateend', () => setBearing(Math.round(map.getBearing())));

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ---- handlers ----

  const applyExaggeration = (val) => {
    setExaggeration(val);
    mapRef.current?.setTerrain({ source: 'terrain', exaggeration: val });
  };

  const applyPitch = (val) => {
    setPitch(val);
    mapRef.current?.setPitch(val);
  };

  const applyDemMode = (mode) => {
    const map = mapRef.current;
    if (!map) return;
    setDemMode(mode);

    // hide all DEM layers first
    map.setLayoutProperty('hillshade', 'visibility', 'none');
    map.setLayoutProperty('colordem', 'visibility', 'none');

    if (mode === 'hillshade') {
      map.setLayoutProperty('hillshade', 'visibility', 'visible');
      map.setPaintProperty('hillshade', 'hillshade-exaggeration', hillshadeIntensity);
    } else if (mode === 'colordem') {
      map.setLayoutProperty('colordem', 'visibility', 'visible');
      map.setPaintProperty('colordem', 'raster-opacity', demOpacity);
    }
  };

  const applyHillshadeIntensity = (val) => {
    setHillshadeIntensity(val);
    if (demMode === 'hillshade') {
      mapRef.current?.setPaintProperty('hillshade', 'hillshade-exaggeration', val);
    }
  };

  const applyDemOpacity = (val) => {
    setDemOpacity(val);
    if (demMode === 'colordem') {
      mapRef.current?.setPaintProperty('colordem', 'raster-opacity', val);
    }
  };

  const applySatOpacity = (val) => {
    setSatOpacity(val);
    mapRef.current?.setPaintProperty('satellite', 'raster-opacity', val);
  };

  const resetView = () => {
    if (!mapRef.current) return;
    mapRef.current.flyTo({
      center: [KK_CENTER_LNG, KK_CENTER_LAT],
      zoom: 9, pitch: 55, bearing: -20, duration: 1500,
    });
    setPitch(55);
    setBearing(-20);
  };

  // ---- render ----

  const modeColor = { none: '#94a3b8', hillshade: '#f59e0b', colordem: '#10b981' };

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {/* Header badge */}
      <div
        className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold"
        style={{
          background: 'rgba(15,23,42,0.85)',
          backdropFilter: 'blur(12px)',
          color: '#a5b4fc',
          border: '1px solid rgba(99,102,241,0.4)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        </svg>
        3D Terrain · DEM
      </div>

      {/* Controls panel */}
      <div
        className="absolute top-4 right-14 z-10 rounded-xl p-3 flex flex-col gap-3"
        style={{
          width: '190px',
          background: 'rgba(15,23,42,0.9)',
          backdropFilter: 'blur(14px)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.45)',
        }}
      >
        {/* --- Terrain section --- */}
        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest -mb-1">Terrain</p>

        <div>
          <div className="flex justify-between mb-1">
            <span className="text-[10px] font-semibold text-slate-400">มุมก้ม</span>
            <span className="text-[10px] font-bold text-indigo-400">{pitch}°</span>
          </div>
          <input type="range" min={0} max={85} value={pitch}
            onChange={(e) => applyPitch(Number(e.target.value))}
            className="w-full h-1 rounded-full appearance-none cursor-pointer"
            style={{ accentColor: '#6366f1' }} />
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <span className="text-[10px] font-semibold text-slate-400">ความสูง</span>
            <span className="text-[10px] font-bold text-emerald-400">{exaggeration}x</span>
          </div>
          <input type="range" min={1} max={5} step={0.5} value={exaggeration}
            onChange={(e) => applyExaggeration(Number(e.target.value))}
            className="w-full h-1 rounded-full appearance-none cursor-pointer"
            style={{ accentColor: '#10b981' }} />
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <span className="text-[10px] font-semibold text-slate-400">ดาวเทียม</span>
            <span className="text-[10px] font-bold text-sky-400">{Math.round(satOpacity * 100)}%</span>
          </div>
          <input type="range" min={0} max={1} step={0.05} value={satOpacity}
            onChange={(e) => applySatOpacity(Number(e.target.value))}
            className="w-full h-1 rounded-full appearance-none cursor-pointer"
            style={{ accentColor: '#0ea5e9' }} />
        </div>

        {/* --- DEM section --- */}
        <div className="pt-1 border-t border-white/10">
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">DEM Layer</p>

          {/* Mode buttons */}
          <div className="flex gap-1 mb-2">
            {DEM_MODES.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => applyDemMode(id)}
                className="flex-1 py-1 rounded-md text-[9px] font-bold transition-all"
                style={{
                  background: demMode === id ? `${modeColor[id]}22` : 'rgba(255,255,255,0.05)',
                  color: demMode === id ? modeColor[id] : '#475569',
                  border: `1px solid ${demMode === id ? `${modeColor[id]}60` : 'rgba(255,255,255,0.08)'}`,
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Hillshade intensity */}
          {demMode === 'hillshade' && (
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[10px] font-semibold text-amber-400">ความเข้ม</span>
                <span className="text-[10px] font-bold text-amber-400">{Math.round(hillshadeIntensity * 100)}%</span>
              </div>
              <input type="range" min={0} max={1} step={0.05} value={hillshadeIntensity}
                onChange={(e) => applyHillshadeIntensity(Number(e.target.value))}
                className="w-full h-1 rounded-full appearance-none cursor-pointer"
                style={{ accentColor: '#f59e0b' }} />
              <p className="text-[9px] text-slate-500 mt-1">เงาแสงจาก DEM (terrarium)</p>
            </div>
          )}

          {/* Elevation color opacity */}
          {demMode === 'colordem' && (
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[10px] font-semibold text-emerald-400">ความทึบ</span>
                <span className="text-[10px] font-bold text-emerald-400">{Math.round(demOpacity * 100)}%</span>
              </div>
              <input type="range" min={0} max={1} step={0.05} value={demOpacity}
                onChange={(e) => applyDemOpacity(Number(e.target.value))}
                className="w-full h-1 rounded-full appearance-none cursor-pointer"
                style={{ accentColor: '#10b981' }} />
              <p className="text-[9px] text-slate-500 mt-1">Esri Shaded Relief (สีระดับความสูง)</p>
            </div>
          )}

          {demMode === 'none' && (
            <p className="text-[9px] text-slate-600 leading-relaxed">เลือก Hillshade หรือ Elevation Color เพื่อแสดงข้อมูล DEM บนแผนที่</p>
          )}
        </div>

        {/* Status + reset */}
        <div className="flex flex-col gap-1 pt-1 border-t border-white/10">
          <div className="flex justify-between">
            <span className="text-[10px] text-slate-500">หมุน</span>
            <span className="text-[10px] text-slate-300">{bearing}°</span>
          </div>
          <p className="text-[9px] text-slate-600">คลิกขวาลาก หรือ Ctrl+drag</p>
        </div>

        <button
          onClick={resetView}
          className="w-full py-1.5 rounded-lg text-[10px] font-semibold transition-all"
          style={{
            background: 'rgba(99,102,241,0.2)',
            color: '#a5b4fc',
            border: '1px solid rgba(99,102,241,0.3)',
          }}
        >
          รีเซ็ตมุมมอง
        </button>
      </div>

      {/* Back to 2D */}
      <button
        onClick={onClose}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold"
        style={{
          background: 'rgba(15,23,42,0.9)',
          backdropFilter: 'blur(12px)',
          color: '#e2e8f0',
          border: '1px solid rgba(255,255,255,0.15)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>
        </svg>
        กลับสู่โหมด 2D
      </button>
    </div>
  );
}
