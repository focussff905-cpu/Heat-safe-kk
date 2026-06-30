import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../../firebase';

const STATUS_COLOR = {
  new:         '#ef4444',
  in_progress: '#f97316',
  resolved:    '#22c55e',
};

const TYPE_META = {
  flood:    { label: 'น้ำท่วม',    icon: '🌊' },
  accident: { label: 'อุบัติเหตุ', icon: '🚨' },
  complain: { label: 'ร้องเรียน',  icon: '📢' },
  rain:     { label: 'ฝนตก',       icon: '🌧️' },
  weather:  { label: 'สภาพอากาศ', icon: '⛅' },
};

function makeIcon(status) {
  const color = STATUS_COLOR[status] ?? STATUS_COLOR.new;
  return L.divIcon({
    className: '',
    html: `<div style="
      width:30px;height:30px;border-radius:50%;
      background:${color};border:3px solid #fff;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 2px 8px rgba(0,0,0,0.30);
      font-size:15px;cursor:pointer;">⚠️</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -18],
  });
}

function timeAgo(ts) {
  if (!ts) return '';
  const ms = Date.now() - (ts.toMillis ? ts.toMillis() : +ts);
  const m = Math.floor(ms / 60000);
  if (m < 1)  return 'เมื่อกี้';
  if (m < 60) return `${m} นาทีที่แล้ว`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ชั่วโมงที่แล้ว`;
  return `${Math.floor(h / 24)} วันที่แล้ว`;
}

export default function ReportPinsLayer() {
  const map = useMap();
  const layerRef = useRef(null);
  const markersRef = useRef({});

  useEffect(() => {
    const lyr = L.layerGroup().addTo(map);
    layerRef.current = lyr;

    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const seen = new Set();

      snap.docs.forEach((docSnap) => {
        const id   = docSnap.id;
        const data = docSnap.data();
        seen.add(id);

        if (markersRef.current[id]) {
          markersRef.current[id].setIcon(makeIcon(data.status));
          return;
        }

        const marker = L.marker([data.lat, data.lng], { icon: makeIcon(data.status) });

        const imgHtml = data.image
          ? `<img src="${data.image}" style="width:100%;border-radius:8px;margin-top:6px;display:block" />`
          : '';

        const typeMeta = TYPE_META[data.type];
        const typeHtml = typeMeta
          ? `<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;background:rgba(0,0,0,0.07);display:inline-block;margin-bottom:4px">${typeMeta.icon} ${typeMeta.label}</span>`
          : '';

        marker.bindPopup(`
          <div style="min-width:200px;max-width:260px;font-family:sans-serif">
            ${typeHtml}
            <div style="font-weight:700;font-size:13px;color:#1e293b;margin-bottom:4px">
              ⚠️ แจ้งเหตุ
            </div>
            <div style="font-size:12px;color:#475569;margin-bottom:2px">
              📍 ${data.address ?? `${data.lat?.toFixed(5)}, ${data.lng?.toFixed(5)}`}
            </div>
            <div style="font-size:12px;color:#1e293b;margin:6px 0">
              ${data.detail ?? ''}
            </div>
            ${imgHtml}
            <div style="font-size:10px;color:#94a3b8;margin-top:6px;display:flex;justify-content:space-between">
              <span>${data.name ?? ''}</span>
              <span>${timeAgo(data.createdAt)}</span>
            </div>
          </div>
        `, { maxWidth: 280 });

        lyr.addLayer(marker);
        markersRef.current[id] = marker;
      });

      // ลบ marker ที่ถูกลบออกจาก Firestore แล้ว
      Object.keys(markersRef.current).forEach((id) => {
        if (!seen.has(id)) {
          lyr.removeLayer(markersRef.current[id]);
          delete markersRef.current[id];
        }
      });
    });

    return () => {
      unsub();
      map.removeLayer(lyr);
      layerRef.current = null;
      markersRef.current = {};
    };
  }, [map]);

  return null;
}
