import { FaHome, FaMap, FaFireAlt, FaExclamationTriangle, FaWater, FaCommentDots } from 'react-icons/fa';

const TABS = [
  { id: 'home',        label: 'หน้าหลัก',  icon: FaHome },
  { id: 'map',         label: 'แผนที่',     icon: FaMap },
  { id: 'simulation',  label: 'แบบจำลอง',  icon: FaFireAlt },
  { id: 'risk-areas',  label: 'เสี่ยงภัย', icon: FaExclamationTriangle },
  { id: 'recurring',   label: 'ท่วมซ้ำ',   icon: FaWater },
  { id: 'chatbot',     label: 'แชทบอท',    icon: FaCommentDots },
];

export default function BottomNav({ activeTab, onTabChange }) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[1001]"
      style={{
        height: '60px',
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid #e0eaff',
        boxShadow: '0 -4px 24px rgba(59,130,246,0.08)',
      }}
    >
      <div className="flex items-center justify-around h-full">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full min-w-0 transition-all duration-200"
              style={{ color: isActive ? '#3b82f6' : '#94a3b8' }}
            >
              <div
                className="flex items-center justify-center w-8 h-5 rounded-xl transition-all duration-200"
                style={{ background: isActive ? 'rgba(59,130,246,0.12)' : 'transparent' }}
              >
                <Icon size={14} />
              </div>
              <span
                className="text-[8.5px] font-semibold leading-none truncate max-w-full px-0.5"
                style={{ color: isActive ? '#3b82f6' : '#94a3b8' }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
