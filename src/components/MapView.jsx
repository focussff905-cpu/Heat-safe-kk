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
};

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

  const selectedId = selectedDistrict?.id;
  const s = (id) => layerSettings?.[id] ?? { visible: true, opacity: 0.75 };
  const has = (id) => activeLayers?.has(id) ?? false;
  const bm = BASEMAPS[basemap];

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
          key={basemap}
          url={bm.url}
          attribution={bm.attribution}
          maxZoom={19}
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
          <TemperatureLayer
            districts={tambons}
            onDistrictClick={onDistrictClick}
            selectedId={selectedId}
            opacity={s('temperature').opacity}
          />
        )}

        {has('pm25') && s('pm25').visible && (
          <PM25Layer
            districts={tambons}
            onDistrictClick={onDistrictClick}
            selectedId={selectedId}
            opacity={s('pm25').opacity}
          />
        )}

        {has('heat') && s('heat').visible && (
          <HeatAccumulationLayer
            districts={tambons}
            onDistrictClick={onDistrictClick}
            selectedId={selectedId}
            opacity={s('heat').opacity}
          />
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

      {/* Basemap toggle — bottom right, above zoom control */}
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
