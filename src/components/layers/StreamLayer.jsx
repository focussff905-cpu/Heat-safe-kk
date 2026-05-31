import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

export default function StreamLayer({ opacity = 1 }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    fetch('/geo.geojson')
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        const layer = L.geoJSON(data, {
          style: {
            color: '#38bdf8',
            weight: 2,
            opacity,
            fillOpacity: 0,
            lineCap: 'round',
            lineJoin: 'round',
          },
          onEachFeature: (feature, l) => {
            const name = feature.properties?.Name;
            const desc = feature.properties?.descriptio;
            if (name || desc) {
              l.bindTooltip(
                `<b>${desc ?? 'ร่องน้ำ'}</b><br/>${name ? `พื้นที่: ${name}` : ''}`,
                { sticky: true }
              );
            }
          },
        });
        layer.addTo(map);
        layerRef.current = layer;
      })
      .catch(err => console.error('StreamLayer fetch error:', err));

    return () => {
      cancelled = true;
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map]);

  // Update opacity without re-fetching
  useEffect(() => {
    if (layerRef.current) {
      layerRef.current.setStyle({ color: '#38bdf8', weight: 2, opacity, fillOpacity: 0 });
    }
  }, [opacity]);

  return null;
}
