import { useState, useCallback } from 'react';
import { KK_CENTER, KK_DEFAULT_ZOOM } from './data/mockData';
import MapView from './components/MapView';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import HomeView from './components/HomeView';
import SimulationView from './components/SimulationView';
import RiskAreasView from './components/RiskAreasView';
import CommunityView from './components/CommunityView';
import ForecastTimePicker, { toApiStr } from './components/ForecastTimePicker';
import MonthPicker from './components/MonthPicker';
import { useRealtimeWeather } from './hooks/useRealtimeWeather';
import { useTMDWeather } from './hooks/useTMDWeather';
import { useAutoNotify } from './hooks/useAutoNotify';
import AdminView from './components/AdminView';
import ReportView from './components/ReportView';
import TrackView from './components/TrackView';
import WelcomePopup from './components/WelcomePopup';

export default function App() {
  const { tambons, forecast, dailyMax: omDailyMax, dailyMin: omDailyMin, status: weatherStatus, lastUpdated, refresh: refreshWeather } = useRealtimeWeather();
  const { data: tmdData } = useTMDWeather();
  const { needsBanner, requestNow } = useAutoNotify();

  // Special routes via URL query params
  const [isAdmin]  = useState(() => new URLSearchParams(window.location.search).has('admin'));
  const [isReport] = useState(() => new URLSearchParams(window.location.search).has('report'));
  const [isTrack]  = useState(() => new URLSearchParams(window.location.search).has('track'));
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

  const [mapPosition, setMapPosition] = useState({ center: KK_CENTER, zoom: KK_DEFAULT_ZOOM });
  const handleMapMove = useCallback((center, zoom) => setMapPosition({ center, zoom }), []);

  const [basemap, setBasemap] = useState('satellite');
  const [heatRiskFilter, setHeatRiskFilter] = useState('all');

  const [mapPin, setMapPin] = useState(null);
  const [flyToTarget, setFlyToTarget] = useState(null);

  const handleLayerToggle = useCallback((id) => {
    const beingAdded = !activeLayers.has(id);
    setActiveLayers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      // heatmap เปิด/ปิดพร้อมกับ heatrisk เสมอ
      if (id === 'heatrisk') {
        if (next.has('heatrisk')) next.add('heatmap'); else next.delete('heatmap');
      }
      return next;
    });
    setInfoLayer(id);
    if (id === 'himawari' && beingAdded) {
      setFlyToTarget({ lat: 15.0, lng: 101.0, zoom: 6, ts: Date.now() });
    }
  }, [activeLayers]);
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

  const onMap = !isAdmin && !isReport && activeTab === 'map';

  if (isReport) return <ReportView />;
  if (isTrack)  return <TrackView />;

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
              initialCenter={mapPosition.center}
              initialZoom={mapPosition.zoom}
              onMapMove={handleMapMove}
              mapPin={mapPin}
              basemap={basemap}
              heatRiskFilter={heatRiskFilter}
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
            basemap={basemap}
            onBasemapChange={setBasemap}
            heatRiskFilter={heatRiskFilter}
            onHeatRiskFilterChange={setHeatRiskFilter}
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
      {!isAdmin && activeTab === 'home' && (
        <HomeView
          tambons={tambons}
          forecast={forecast}
          weatherStatus={weatherStatus}
          lastUpdated={lastUpdated}
          onRefresh={refreshWeather}
          tmdTempMax={tmdData?.tempMax ?? omDailyMax}
          tmdTempMin={tmdData?.tempMin ?? omDailyMin}
          tmdData={tmdData}
          needsNotifyBanner={needsBanner}
          onEnableNotify={requestNow}
          onTambonClick={(tambon) => {
            setFlyToTarget({ lat: tambon.lat, lng: tambon.lng, ts: Date.now() });
            setSelectedDistrict(tambon);
            setMapPin({ name: `ต.${tambon.name}`, lat: tambon.lat, lng: tambon.lng, temperature: tambon.temperature, humidity: tambon.humidity, wind: tambon.windSpeed });
            setSidebarOpen(true);
            setActiveTab('map');
          }}
        />
      )}

      {/* ── Simulation tab ── */}
      {!isAdmin && activeTab === 'simulation' && <SimulationView />}

      {/* ── Risk Areas tab ── */}
      {!isAdmin && activeTab === 'risk-areas' && (
        <RiskAreasView
          tambons={tambons}
          onLocationClick={({ lat, lng, name, temperature, humidity, wind }) => {
            setFlyToTarget({ lat, lng, ts: Date.now() });
            setMapPin({ name, lat, lng, temperature, humidity, wind });
            setSidebarOpen(true);
            setActiveTab('map');
          }}
        />
      )}


      {/* ── Community tab ── */}
      {!isAdmin && activeTab === 'community' && <CommunityView />}

      {/* ── Admin (hidden route via ?admin in URL) ── */}
      {isAdmin && <AdminView />}

      {/* ── Welcome popup ── */}
      {!isAdmin && <WelcomePopup tmdData={tmdData} tambons={tambons} forecast={forecast} />}

      {/* ── Bottom nav (hidden in admin mode) ── */}
      {!isAdmin && <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />}
    </div>
  );
}
