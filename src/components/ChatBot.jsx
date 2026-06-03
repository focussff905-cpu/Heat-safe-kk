import { useRef } from 'react';

const CHAT_URL = 'https://gemini.google.com/gem/1uGmDnZ2dxkNLG9mKkwLTWd17I75taz8G?usp=sharing';
const WIN_W = 400;
const WIN_H = 700;

export default function ChatBot() {
  const winRef = useRef(null);

  function openChat() {
    if (winRef.current && !winRef.current.closed) {
      winRef.current.focus();
      return;
    }
    const left = window.screen.width - WIN_W - 24;
    const top = window.screen.height - WIN_H - 60;
    winRef.current = window.open(
      CHAT_URL,
      'ai-assistant',
      `width=${WIN_W},height=${WIN_H},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
  }

  return (
    <div className="fixed bottom-6 right-44 z-[1000]">
      <button
        onClick={openChat}
        title="เปิด AI Assistant"
        className="w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
        style={{ background: 'linear-gradient(135deg, #4f8ef7 0%, #8b5cf6 100%)' }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
        </svg>
      </button>
    </div>
  );
}
