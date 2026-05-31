import { useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { KK_CENTER, KK_BOUNDS, KK_DEFAULT_ZOOM, districts } from '../data/mockData';
import TemperatureLayer from './layers/TemperatureLayer';
import PM25Layer from './layers/PM25Layer';
import HeatAccumulationLayer from './layers/HeatAccumulationLayer';
import TMDTempTileLayer from './layers/TMDTempTileLayer';
import StreamLayer from './layers/StreamLayer';
import 'leaflet/dist/leaflet.css';

function BoundsLocker() {
  const map = useMap();
  useEffect(() => {
    map.setMaxBounds(KK_BOUNDS);
    map.options.maxBoundsViscosity = 0.85;
    map.options.minZoom = 8;
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

export default function MapView({ activeLayer, selectedDistrict, onDistrictClick, onMapClick, forecastDatetime, layerSettings }) {
  const selectedId = selectedDistrict?.id;
  const s = (id) => layerSettings?.[id] ?? { visible: true, opacity: 0.75 };

  return (
    <MapContainer
      center={KK_CENTER}
      zoom={KK_DEFAULT_ZOOM}
      maxBounds={KK_BOUNDS}
      maxBoundsViscosity={0.85}
      minZoom={8}
      maxZoom={14}
      zoomControl={false}
      style={{ width: '100%', height: '100%' }}
      className="z-0"
    >
      {/* Satellite basemap */}
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        maxZoom={19}
      />

      <BoundsLocker />
      <MapClickHandler onMapClick={onMapClick} />

      {/* Zoom control — bottom right */}
      <div className="leaflet-control-container">
        <div className="leaflet-bottom leaflet-right">
          <div className="leaflet-control-zoom leaflet-bar leaflet-control" />
        </div>
      </div>

      {activeLayer === 'temperature' && s('temperature').visible && forecastDatetime && (
        <TMDTempTileLayer datetime={forecastDatetime} opacity={s('temperature').opacity} />
      )}

      {activeLayer === 'temperature' && s('temperature').visible && (
        <TemperatureLayer
          districts={districts}
          onDistrictClick={onDistrictClick}
          selectedId={selectedId}
          opacity={s('temperature').opacity}
        />
      )}

      {activeLayer === 'pm25' && s('pm25').visible && (
        <PM25Layer
          districts={districts}
          onDistrictClick={onDistrictClick}
          selectedId={selectedId}
          opacity={s('pm25').opacity}
        />
      )}

      {activeLayer === 'heat' && s('heat').visible && (
        <HeatAccumulationLayer
          districts={districts}
          onDistrictClick={onDistrictClick}
          selectedId={selectedId}
          opacity={s('heat').opacity}
        />
      )}

      {activeLayer === 'stream' && s('stream').visible && (
        <StreamLayer opacity={s('stream').opacity} />
      )}
    </MapContainer>
  );
}
