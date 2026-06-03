import { useState, useCallback } from 'react';
import MapView from './components/MapView';
import Sidebar from './components/Sidebar';
import ChatBot from './components/ChatBot';
import ForecastTimePicker, { toApiStr } from './components/ForecastTimePicker';
import MonthPicker from './components/MonthPicker';
import { useRealtimeWeather } from './hooks/useRealtimeWeather';
import { KK_CENTER, KK_DEFAULT_ZOOM } from './data/mockData';

export default function App() {
  const { tambons, status: weatherStatus, lastUpdated, refresh: refreshWeather } = useRealtimeWeather();
  const [activeLayers, setActiveLayers] = useState(new Set());
  const [infoLayer, setInfoLayer] = useState('temperature');
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [layerSettings, setLayerSettings] = useState({
    temperature:  { visible: true, opacity: 0.75 },
    pm25:         { visible: true, opacity: 0.78 },
    heat:         { visible: true, opacity: 0.78 },
    stream:       { visible: true, opacity: 0.85 },
    monthly_temp: { visible: true, opacity: 0.80 },
    hotspot:      { visible: true, opacity: 0.90 },
  });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const updateLayerSetting = useCallback((id, key, value) => {
    setLayerSettings(prev => ({ ...prev, [id]: { ...prev[id], [key]: value } }));
  }, []);
  const [forecastDatetime, setForecastDatetime] = useState(() => {
    const now = new Date();
    const h = Math.floor(now.getUTCHours() / 3) * 3;
    return toApiStr(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), h)));
  });

  const handleLayerToggle = useCallback((id) => {
    setActiveLayers(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setInfoLayer(id);
  }, []);

  const [flyToTarget, setFlyToTarget] = useState(null);

  const handleFlyTo = useCallback(({ lat, lng }) => {
    setFlyToTarget({ lat, lng, ts: Date.now() });
  }, []);

  const handleResetView = useCallback(() => {
    setFlyToTarget({ lat: KK_CENTER[0], lng: KK_CENTER[1], zoom: KK_DEFAULT_ZOOM, ts: Date.now() });
  }, []);

  const handleMapClick = useCallback(() => {
    setSelectedDistrict(null);
  }, []);

  const handleDistrictSelect = useCallback((district) => {
    setSelectedDistrict(district);
    if (district) {
      setSearchQuery('');
      setFlyToTarget({ lat: district.lat, lng: district.lng, ts: Date.now() });
    }
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-950">
      <MapView
        activeLayers={activeLayers}
        tambons={tambons}
        selectedDistrict={selectedDistrict}
        onDistrictClick={handleDistrictSelect}
        onMapClick={handleMapClick}
        forecastDatetime={forecastDatetime}
        layerSettings={layerSettings}
        selectedMonth={selectedMonth}
        flyToTarget={flyToTarget}
      />
      <Sidebar
        activeLayers={activeLayers}
        infoLayer={infoLayer}
        onLayerToggle={handleLayerToggle}
        tambons={tambons}
        weatherStatus={weatherStatus}
        lastUpdated={lastUpdated}
        onRefreshWeather={refreshWeather}
        onFlyTo={handleFlyTo}
        selectedDistrict={selectedDistrict}
        onDistrictSelect={handleDistrictSelect}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
        layerSettings={layerSettings}
        onLayerSettingChange={updateLayerSetting}
      />
      {activeLayers.has('temperature') && (
        <ForecastTimePicker
          datetime={forecastDatetime}
          onChange={setForecastDatetime}
          sidebarOpen={sidebarOpen}
        />
      )}
      {activeLayers.has('monthly_temp') && (
        <MonthPicker
          selectedMonth={selectedMonth}
          onChange={setSelectedMonth}
          sidebarOpen={sidebarOpen}
        />
      )}
      <ChatBot />

      {/* ปุ่มแบบจำลองการเกิดเกาะความร้อน — fixed top-right */}
      <a
        href="https://air-sim.vercel.app/"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed top-4 right-4 z-[1001] flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 hover:scale-105"
        style={{
          background: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(239,68,68,0.3)',
          boxShadow: '0 4px 16px rgba(239,68,68,0.15)',
        }}
      >
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #ef4444, #f97316)' }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
            <path d="M12 2c0 0-6 6-6 12a6 6 0 0 0 12 0c0-6-6-12-6-12zm0 16a4 4 0 0 1-4-4c0-2.5 2-5.5 4-8 2 2.5 4 5.5 4 8a4 4 0 0 1-4 4z"/>
          </svg>
        </div>
        <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">
          แบบจำลองการเกิดเกาะความร้อน
        </span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
          <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
      </a>
    </div>
  );
}
