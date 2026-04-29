'use client';
import { useEffect, useRef } from 'react';

export function useNotificationPermission() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);
}

export function sendNotification(title: string, body: string, url?: string) {
  if (typeof window === 'undefined') return;
  if ('Notification' in window && Notification.permission === 'granted') {
    const n = new Notification(title, { body, icon: '/favicon.ico' });
    if (url) n.onclick = () => window.open(url, '_blank');
  }
  // Broadcast to other open tabs
  try {
    const bc = new BroadcastChannel('ux-platform');
    bc.postMessage({ type: 'session_complete', title, body, url });
    bc.close();
  } catch {}
}

export function useBroadcastListener(onMessage: (msg: { type: string; title: string; body: string; url?: string }) => void) {
  const cb = useRef(onMessage);
  cb.current = onMessage;

  useEffect(() => {
    let bc: BroadcastChannel;
    try {
      bc = new BroadcastChannel('ux-platform');
      bc.onmessage = (e) => cb.current(e.data);
    } catch {}
    return () => bc?.close();
  }, []);
}
