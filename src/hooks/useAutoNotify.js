import { useEffect } from 'react';

const VAPID_PUBLIC = 'BPK1ArKe9auD9PmUHEyqKDJv-Y_tucS3I73HCpGIIZSskw2_FnvxKqYxk2I4V9nVROtEtQbLDBdr63cAkMx1UnY';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

async function autoSubscribe() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return;

  // Already denied — can't do anything
  if (Notification.permission === 'denied') return;

  const reg = await navigator.serviceWorker.ready;

  // Already subscribed — nothing to do
  const existing = await reg.pushManager.getSubscription();
  if (existing) return;

  // Request permission (shows browser prompt)
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return;

  // Subscribe
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
  });

  // Save to server
  await fetch('/api/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription: sub.toJSON(), action: 'subscribe' }),
  });
}

export function useAutoNotify() {
  useEffect(() => {
    // Small delay so the page renders first before the permission dialog appears
    const t = setTimeout(() => { autoSubscribe().catch(() => {}); }, 1500);
    return () => clearTimeout(t);
  }, []);
}
