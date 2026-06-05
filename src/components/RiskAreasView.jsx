import { useState, useEffect } from 'react';
import { FaExclamationTriangle, FaThermometerHalf, FaTint, FaMapMarkerAlt } from 'react-icons/fa';
import { getHeatColor, getHeatLevel, hotspots } from '../data/mockData';

/* ── Parse Nominatim reverse-geocode response → {name, sub} ── */
function parsePlaceName(data, fallback) {
  if (!data || data.error) return { name: fallback, sub: '' };
  const a = data.address ?? {};

  // Best primary label: named POI → road → suburb/quarter
  const name =
    a.amenity          ||
    a.building         ||
    a.shop             ||
    a.office           ||
    a.tourism          ||
    a.leisure          ||
    a.historic         ||
    (a.road ? `ถ.${a.road}` : null) ||
    a.suburb           ||
    data.display_name?.split(',')[0] ||
    fallback;

  // Secondary label: neighbourhood / tambon
  const sub = [
    a.neighbourhood || a.quarter || a.suburb,
    a.city_district || a.town,
  ].filter(Boolean).join(' · ') || a.road || '';

  return { name, sub };
}

export default function RiskAreasView({ tambons }) {
  const riskTambons = [...(tambons || [])].sort((a, b) => b.heatValue - a.heatValue).slice(0, 8);
  const [geoNames, setGeoNames] = useState({});
  const [geoStatus, setGeoStatus] = useState('loading'); // loading | ok | error

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const results = await Promise.allSettled(
          hotspots.map(h =>
            fetch(
              `https://nominatim.openstreetmap.org/reverse` +
              `?lat=${h.lat}&lon=${h.lng}&format=json&accept-language=th&zoom=17`,
              { headers: { 'User-Agent': 'KKMapHeat/1.0' } }
            ).then(r => r.json())
          )
        );

        if (cancelled) return;

        const map = {};
        results.forEach((res, i) => {
          const h = hotspots[i];
          map[h.id] = res.status === 'fulfilled'
            ? parsePlaceName(res.value, h.description)
            : { name: h.description, sub: '' };
        });
        setGeoNames(map);
        setGeoStatus('ok');
      } catch {
        if (!cancelled) setGeoStatus('error');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div
      className="absolute top-0 right-0 overflow-y-auto"
      style={{ left: 'var(--nav-x)', bottom: 'var(--nav-bottom)', background: 'linear-gradient(180deg,#fff7ed 0%,#f8faff 100%)' }}
    >
      <div className="max-w-md md:max-w-2xl mx-auto px-4 md:px-8 pt-5 pb-4 space-y-3">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#fed7aa,#fdba74)' }}>
            <FaExclamationTriangle className="text-orange-600" size={16} />
          </div>
          <div>
            <h2 className="font-bold text-slate-800 text-base">พื้นที่เสี่ยงภัย</h2>
            <p className="text-xs text-slate-400">อ.เมืองขอนแก่น · ข้อมูลจากจุด GPS จริง</p>
          </div>
        </div>

        {/* Hotspot cards */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">
              จุดความร้อนสูงสุด
            </p>
            {geoStatus === 'loading' && (
              <span className="text-[9px] text-blue-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse inline-block" />
                กำลังโหลดชื่อสถานที่...
              </span>
            )}
          </div>

          <div className="space-y-2">
            {hotspots.map(h => {
              const isExtreme = h.intensity === 'extreme';
              const dotColor  = isExtreme ? '#ef4444' : '#f97316';
              const place     = geoNames[h.id];
              return (
                <div key={h.id} className="rounded-2xl p-4 bg-white"
                  style={{ border: `1.5px solid ${isExtreme ? '#fca5a5' : '#fed7aa'}` }}>
                  <div className="flex items-start gap-3">

                    {/* Pulsing dot */}
                    <div className="relative flex-shrink-0 mt-1">
                      <div className="w-3 h-3 rounded-full" style={{ background: dotColor }} />
                      <div className="absolute inset-0 rounded-full animate-ping"
                        style={{ background: dotColor, opacity: 0.35 }} />
                    </div>

                    <div className="flex-1 min-w-0">
                      {place ? (
                        <>
                          {/* Real place name from geocoding */}
                          <p className="font-bold text-slate-800 text-sm leading-tight">
                            {place.name}
                          </p>
                          {place.sub && (
                            <p className="text-xs text-slate-500 mt-0.5 leading-tight">
                              {place.sub}
                            </p>
                          )}
                        </>
                      ) : (
                        /* Loading skeleton */
                        <div className="space-y-1">
                          <div className="h-3.5 w-40 rounded-full bg-orange-100 animate-pulse" />
                          <div className="h-2.5 w-28 rounded-full bg-orange-50 animate-pulse" />
                        </div>
                      )}

                      {/* Coordinates */}
                      <div className="flex items-center gap-1 mt-1.5">
                        <FaMapMarkerAlt size={8} className="text-slate-300 flex-shrink-0" />
                        <p className="text-[9px] text-slate-300 font-mono">
                          {h.lat.toFixed(4)}, {h.lng.toFixed(4)}
                        </p>
                      </div>
                    </div>

                    {/* Temp + badge */}
                    <div className="text-right flex-shrink-0">
                      <p className="font-black text-base leading-tight" style={{ color: dotColor }}>
                        {h.temperature}°C
                      </p>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: `${dotColor}15`, color: dotColor }}>
                        {isExtreme ? 'วิกฤต' : 'สูง'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* High-risk tambons */}
        <div>
          <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-2">
            ตำบลเสี่ยงสูง (ความร้อนสะสม)
          </p>
          <div className="space-y-2">
            {riskTambons.map((d, i) => {
              const hColor = getHeatColor(d.heatValue);
              const hLevel = getHeatLevel(d.heatValue);
              return (
                <div key={d.id} className="rounded-2xl px-4 py-3 bg-white flex items-center gap-3"
                  style={{ border: '1px solid #ffe4cc' }}>
                  <span className="text-sm font-black w-5 text-right flex-shrink-0"
                    style={{ color: i < 3 ? '#ef4444' : '#f97316' }}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700 truncate">ต.{d.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                        <FaThermometerHalf size={8} className="text-orange-300" />{d.temperature}°C
                      </span>
                      <span className="text-[10px] text-slate-300">·</span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                        <FaTint size={8} className="text-blue-300" />{d.humidity}%
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-black" style={{ color: hColor }}>
                      {Math.round(d.heatValue * 100)}%
                    </p>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: `${hColor}15`, color: hColor }}>
                      {hLevel.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
