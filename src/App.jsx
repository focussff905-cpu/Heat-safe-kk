import { useState, useCallback, useEffect } from 'react';
import MapView from './components/MapView';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import HomeView from './components/HomeView';
import SimulationView from './components/SimulationView';
import RiskAreasView from './components/RiskAreasView';
import RecurringView from './components/RecurringView';
import ChatBotView from './components/ChatBotView';
import ForecastTimePicker, { toApiStr } from './components/ForecastTimePicker';
import MonthPicker from './components/MonthPicker';
import { useRealtimeWeather } from './hooks/useRealtimeWeather';
import { useTMDWeather } from './hooks/useTMDWeather';
import AdminView from './components/AdminView';

export default function App() {
  const { tambons, forecast, dailyMax: omDailyMax, dailyMin: omDailyMin, status: weatherStatus, lastUpdated, refresh: refreshWeather } = useRealtimeWeather();
  const { data: tmdData } = useTMDWeather();

  // Admin mode: accessible via ?admin in URL (hidden from regular nav)
  const [isAdmin] = useState(() => new URLSearchParams(window.location.search).has('admin'));
  const [activeTab, setActiveTab] = useState('home');
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
    himawari:     { visible: true, opacity: 0.85 },
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
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setInfoLayer(id);
  }, []);

  const [flyToTarget, setFlyToTarget] = useState(null);
  const handleFlyTo = useCallback(({ lat, lng }) => setFlyToTarget({ lat, lng, ts: Date.now() }), []);
  const handleMapClick = useCallback(() => setSelectedDistrict(null), []);
  const handleDistrictSelect = useCallback((district) => {
    setSelectedDistrict(district);
    if (district) { setSearchQuery(''); setFlyToTarget({ lat: district.lat, lng: district.lng, ts: Date.now() }); }
  }, []);

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    if (tab === 'map') setSidebarOpen(true);
  }, []);

  const onMap = activeTab === 'map';

  return (
    <div className="relative w-full overflow-hidden bg-[#f8faff]"
      style={{ height: '100dvh' }}>

      {/* ── Map tab ── */}
      {onMap && (
        <>
          {/* Map area: offset left for desktop rail, bottom for mobile bar */}
          <div className="absolute right-0"
            style={{ top: 'var(--nav-top)', left: 'var(--nav-x)', bottom: 'var(--nav-bottom)' }}>
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
          </div>
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
            onToggle={() => setSidebarOpen(v => !v)}
            layerSettings={layerSettings}
            onLayerSettingChange={updateLayerSetting}
          />
          {activeLayers.has('temperature') && (
            <ForecastTimePicker datetime={forecastDatetime} onChange={setForecastDatetime} sidebarOpen={sidebarOpen} />
          )}
          {activeLayers.has('monthly_temp') && (
            <MonthPicker selectedMonth={selectedMonth} onChange={setSelectedMonth} sidebarOpen={sidebarOpen} />
          )}
        </>
      )}

      {/* ── Home tab ── */}
      {activeTab === 'home' && (
        <HomeView
          tambons={tambons}
          forecast={forecast}
          weatherStatus={weatherStatus}
          lastUpdated={lastUpdated}
          onRefresh={refreshWeather}
          tmdTempMax={tmdData?.tempMax ?? omDailyMax}
          tmdTempMin={tmdData?.tempMin ?? omDailyMin}
          tmdData={tmdData}
          onTambonClick={(tambon) => {
            setFlyToTarget({ lat: tambon.lat, lng: tambon.lng, ts: Date.now() });
            setSelectedDistrict(tambon);
            setSidebarOpen(true);
            setActiveTab('map');
          }}
        />
      )}

      {/* ── Simulation tab ── */}
      {activeTab === 'simulation' && <SimulationView />}

      {/* ── Risk Areas tab ── */}
      {activeTab === 'risk-areas' && (
        <RiskAreasView
          tambons={tambons}
          onLocationClick={({ lat, lng }) => {
            setFlyToTarget({ lat, lng, ts: Date.now() });
            setSidebarOpen(true);
            setActiveTab('map');
          }}
        />
      )}

      {/* ── Recurring tab ── */}
      {activeTab === 'recurring' && <RecurringView />}

      {/* ── ChatBot tab ── */}
      {activeTab === 'chatbot' && <ChatBotView />}

      {/* ── Admin (hidden route via ?admin in URL) ── */}
      {isAdmin && <AdminView />}

      {/* ── Bottom nav (hidden in admin mode) ── */}
      {!isAdmin && <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />}
    </div>
  );
}
