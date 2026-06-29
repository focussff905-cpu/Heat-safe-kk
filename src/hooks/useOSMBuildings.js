import { useState, useEffect } from 'react';

const CACHE_KEY = 'osm_buildings_kk_v1';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 วัน

// bounding box เมืองขอนแก่น
const BBOX = '16.35,102.75,16.55,102.95';
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const QUERY = `[out:json][timeout:60];(way["building"](${BBOX}););out center;`;

export function useOSMBuildings() {
  const [points, setPoints] = useState(null);
  const [count, setCount]   = useState(0);
  const [status, setStatus] = useState('idle'); // idle | loading | ok | error

  useEffect(() => {
    // ลอง cache ก่อน
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const { ts, data } = JSON.parse(raw);
        if (Date.now() - ts < CACHE_TTL) {
          setPoints(data);
          setCount(data.length);
          setStatus('ok');
          return;
        }
      }
    } catch {
      // cache เสีย — ดึงใหม่
    }

    setStatus('loading');

    fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(QUERY)}`,
    })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(json => {
        // แต่ละ element มี center.lat / center.lon
        const pts = json.elements
          .filter(el => el.center)
          .map(el => [el.center.lat, el.center.lon, 1.0]);

        setPoints(pts);
        setCount(pts.length);
        setStatus('ok');

        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: pts }));
        } catch {
          // localStorage เต็ม — ไม่ cache
        }
      })
      .catch(() => setStatus('error'));
  }, []);

  return { points, count, status };
}
