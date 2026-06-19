import { useState, useEffect, useRef } from 'react';
import {
  collection, query, orderBy, onSnapshot,
  addDoc, serverTimestamp, doc,
} from 'firebase/firestore';
import { db } from '../firebase';

const POST_STATUS = {
  new:      { label: 'แจ้งเหตุใหม่',       color: '#ef4444', bg: 'rgba(239,68,68,0.1)'   },
  read:     { label: 'กำลังดำเนินการ',     color: '#f97316', bg: 'rgba(251,146,60,0.1)'  },
  resolved: { label: 'ดำเนินการแล้ว',      color: '#059669', bg: 'rgba(16,185,129,0.1)'  },
};

function timeAgo(ts) {
  if (!ts) return '';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  const s = (Date.now() - d) / 1000;
  if (s < 60)    return 'เมื่อกี้';
  if (s < 3600)  return `${Math.floor(s / 60)} นาทีที่แล้ว`;
  if (s < 86400) return `${Math.floor(s / 3600)} ชั่วโมงที่แล้ว`;
  if (s < 604800) return `${Math.floor(s / 86400)} วันที่แล้ว`;
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
}

/* ── Comment section for one post ─────────────────────────────────────────── */
function CommentSection({ postId }) {
  const [comments,  setComments]  = useState([]);
  const [text,      setText]      = useState('');
  const [author,    setAuthor]    = useState('');
  const [sending,   setSending]   = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    const q = query(
      collection(db, 'reports', postId, 'comments'),
      orderBy('createdAt', 'asc'),
    );
    return onSnapshot(q, snap =>
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, [postId]);

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await addDoc(collection(db, 'reports', postId, 'comments'), {
        text:      text.trim(),
        author:    author.trim() || 'ไม่ระบุชื่อ',
        createdAt: serverTimestamp(),
      });
      setText('');
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border-t pt-3 mt-3 space-y-2.5" style={{ borderColor: '#f1f5f9' }}>
      {comments.length === 0 && (
        <p className="text-xs text-slate-400 text-center py-1">ยังไม่มีความคิดเห็น เป็นคนแรกได้เลย</p>
      )}

      {comments.map(c => (
        <div key={c.id} className="flex gap-2.5">
          <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black"
            style={{ background: 'linear-gradient(135deg,#bfdbfe,#93c5fd)', color: '#1d4ed8' }}>
            {(c.author?.[0] ?? '?').toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="rounded-2xl rounded-tl-sm px-3 py-2 inline-block max-w-full"
              style={{ background: '#f8faff', border: '1px solid #e0eaff' }}>
              <p className="text-[11px] font-bold text-blue-600 mb-0.5">{c.author}</p>
              <p className="text-xs text-slate-700 leading-relaxed">{c.text}</p>
            </div>
            <p className="text-[9px] text-slate-400 mt-0.5 ml-1">{timeAgo(c.createdAt)}</p>
          </div>
        </div>
      ))}

      <div ref={bottomRef} />

      {/* Comment input */}
      <div className="flex gap-2 pt-1">
        <div className="flex-1 space-y-1.5">
          <input
            value={author} onChange={e => setAuthor(e.target.value)}
            placeholder="ชื่อ (ไม่บังคับ)"
            className="w-full px-3 py-1.5 rounded-xl text-xs outline-none"
            style={{ background: '#f8faff', border: '1px solid #e0eaff', color: '#1e293b' }}
          />
          <div className="flex gap-2">
            <input
              value={text} onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="แสดงความคิดเห็น..."
              className="flex-1 px-3 py-2 rounded-xl text-xs outline-none"
              style={{ background: '#f8faff', border: `1.5px solid ${text ? '#bfdbfe' : '#e0eaff'}`, color: '#1e293b' }}
            />
            <button onClick={send} disabled={!text.trim() || sending}
              className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 flex-shrink-0"
              style={{
                background: text.trim() ? 'linear-gradient(135deg,#3b82f6,#2563eb)' : 'rgba(148,163,184,0.25)',
                color: text.trim() ? 'white' : '#94a3b8',
              }}>
              {sending ? '...' : 'ส่ง'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Single post card ──────────────────────────────────────────────────────── */
function PostCard({ post }) {
  const [expanded, setExpanded] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const st = POST_STATUS[post.status] ?? POST_STATUS.new;

  useEffect(() => {
    const q = query(collection(db, 'reports', post.id, 'comments'), orderBy('createdAt'));
    return onSnapshot(q, snap => setCommentCount(snap.size));
  }, [post.id]);

  return (
    <div className="rounded-2xl overflow-hidden bg-white"
      style={{ border: '1.5px solid #e8f0fe', boxShadow: '0 2px 12px rgba(59,130,246,0.06)' }}>

      {/* Post header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#fde68a,#fbbf24)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-700 truncate">
                {post.address?.split(',')[0] ?? 'ไม่ระบุสถานที่'}
              </p>
              <p className="text-[10px] text-slate-400">{timeAgo(post.createdAt)}</p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
            style={{ background: st.bg, color: st.color }}>
            {st.label}
          </span>
        </div>

        {/* Detail */}
        <p className="text-sm text-slate-800 leading-relaxed">{post.detail}</p>
      </div>

      {/* Image */}
      {post.image && (
        <div className="px-4 pb-3">
          <img src={post.image} alt="ภาพประกอบ"
            className="w-full rounded-xl object-cover cursor-pointer"
            style={{ maxHeight: '220px', border: '1px solid #e0eaff' }}
            onClick={() => window.open(post.image, '_blank')}
          />
        </div>
      )}

      {/* Footer — comment toggle */}
      <div className="px-4 pb-3">
        <button onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-1.5 text-xs font-semibold transition-colors"
          style={{ color: expanded ? '#3b82f6' : '#94a3b8' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          {commentCount > 0 ? `${commentCount} ความคิดเห็น` : 'แสดงความคิดเห็น'}
          <span style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
          </span>
        </button>

        {expanded && <CommentSection postId={post.id} />}
      </div>
    </div>
  );
}

/* ── Main CommunityView ────────────────────────────────────────────────────── */
export default function CommunityView() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, snap => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, []);

  return (
    <div className="absolute inset-0 overflow-y-auto"
      style={{ background: 'linear-gradient(180deg,#eff6ff 0%,#f8faff 100%)' }}>
      <div className="max-w-lg mx-auto px-3 pt-4 pb-6"
        style={{ paddingBottom: 'calc(1.5rem + var(--nav-bottom))' }}>

        {/* Header */}
        <div className="px-1 mb-4">
          <p className="text-lg font-black text-slate-800">ชุมชนข่าว</p>
          <p className="text-xs text-slate-400">รายงานสภาพแวดล้อมจากชาวขอนแก่น</p>
        </div>

        {/* Report button */}
        <a href="/?report"
          className="flex items-center gap-3 px-4 py-3 rounded-2xl mb-4 transition-all active:scale-95"
          style={{ background: 'white', border: '1.5px dashed #bfdbfe', boxShadow: '0 2px 8px rgba(59,130,246,0.06)' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(59,130,246,0.1)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </div>
          <p className="text-sm text-slate-500">พบเหตุผิดปกติ? แจ้งเหตุให้ชุมชนทราบ...</p>
        </a>

        {/* Feed */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-8 h-8 border-3 border-blue-100 border-t-blue-400 rounded-full animate-spin" style={{ borderWidth: 3 }} />
            <p className="text-xs text-slate-400">กำลังโหลด...</p>
          </div>
        )}

        {!loading && posts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <div className="text-4xl opacity-30">📭</div>
            <p className="text-sm font-bold text-slate-500">ยังไม่มีรายงาน</p>
            <p className="text-xs text-slate-400">เป็นคนแรกที่แจ้งเหตุในชุมชนได้เลย</p>
          </div>
        )}

        <div className="space-y-3">
          {posts.map(post => <PostCard key={post.id} post={post} />)}
        </div>
      </div>
    </div>
  );
}
