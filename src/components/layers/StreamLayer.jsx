import { useEffect, useState } from 'react';
import { GeoJSON } from 'react-leaflet';

export default function StreamLayer({ opacity = 1 }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/geo.geojson')
      .then(r => r.json())
      .then(d => { if (!cancelled) setData(d); })
      .catch(console.error);
    return () => { cancelled = true; };
  }, []);

  if (!data) return null;

  return (
    <GeoJSON
      key={opacity}
      data={data}
      style={() => ({
        color: '#38bdf8',
        weight: 2,
        opacity,
        fillOpacity: 0,
        lineCap: 'round',
        lineJoin: 'round',
      })}
      onEachFeature={(feature, layer) => {
        const name = feature.properties?.Name;
        const desc = feature.properties?.descriptio;
        if (name || desc) {
          layer.bindTooltip(
            `<div style="font-size:12px"><b>${desc ?? 'ร่องน้ำ'}</b><br/>${name ? `พื้นที่: ${name}` : ''}</div>`,
            { sticky: true }
          );
        }
      }}
    />
  );
}
