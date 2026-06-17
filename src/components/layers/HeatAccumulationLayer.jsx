import { CircleMarker, Tooltip } from 'react-leaflet';
import { getHeatColor, getHeatLevel } from '../../data/mockData';
import { COMMERCIAL_POINTS, getCommercialColor } from '../../data/commercialData';

export default function HeatAccumulationLayer({ districts, onDistrictClick, selectedId, opacity = 1 }) {
  return (
    <>
      {districts.map((district) => {
        const color = getHeatColor(district.heatValue);
        const level = getHeatLevel(district.heatValue);
        const isSelected = selectedId === district.id;
        const baseRadius = 20 + district.heatValue * 18;

        return (
          <g key={district.id}>
            {/* Outermost glow ring */}
            <CircleMarker
              center={[district.lat, district.lng]}
              radius={baseRadius + 18}
              pathOptions={{
                fillColor: color,
                fillOpacity: 0.06 * opacity,
                stroke: false,
              }}
            />
            {/* Middle glow */}
            <CircleMarker
              center={[district.lat, district.lng]}
              radius={baseRadius + 8}
              pathOptions={{
                fillColor: color,
                fillOpacity: 0.15 * opacity,
                stroke: false,
              }}
            />
            {/* Inner glow */}
            <CircleMarker
              center={[district.lat, district.lng]}
              radius={baseRadius}
              pathOptions={{
                fillColor: color,
                fillOpacity: 0.30 * opacity,
                stroke: false,
              }}
            />
            {/* Core dot */}
            <CircleMarker
              center={[district.lat, district.lng]}
              radius={isSelected ? 14 : 10}
              pathOptions={{
                fillColor: color,
                fillOpacity: (isSelected ? 1 : 0.88) * opacity,
                color: isSelected ? '#fff' : 'rgba(255,255,255,0.4)',
                weight: isSelected ? 2.5 : 1,
                opacity,
              }}
              eventHandlers={{ click: () => onDistrictClick(district) }}
            >
              <Tooltip
                direction="top"
                offset={[0, -6]}
                className="custom-tooltip"
              >
                <div className="font-medium">{district.name}</div>
                <div style={{ color }}>
                  การสะสมความร้อน: <strong>{level.label}</strong>
                </div>
                <div style={{ color: '#94a3b8', fontSize: '11px' }}>
                  ดัชนีความร้อน: {Math.round(district.heatValue * 100)}%
                </div>
              </Tooltip>
            </CircleMarker>
          </g>
        );
      })}

      {/* Commercial building heat points from KML */}
      {COMMERCIAL_POINTS.map(pt => {
        const color = getCommercialColor(pt.density);
        return (
          <CircleMarker
            key={pt.id}
            center={[pt.lat, pt.lng]}
            radius={7}
            pathOptions={{
              fillColor: color,
              fillOpacity: 0.85 * opacity,
              color: '#fff',
              weight: 1.5,
              opacity,
            }}
          >
            <Tooltip direction="top" offset={[0, -6]} className="custom-tooltip">
              <div className="font-medium">{pt.name}</div>
              <div style={{ color }}>ความหนาแน่นเชิงพาณิชย์: <strong>{pt.density}</strong></div>
              <div style={{ color: '#94a3b8', fontSize: '11px' }}>{pt.type}</div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
}
