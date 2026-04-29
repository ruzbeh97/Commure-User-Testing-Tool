'use client';
import { useNotificationPermission, useBroadcastListener } from '@/hooks/useNotification';
import { useState } from 'react';
import { Bell, X } from 'lucide-react';
import Link from 'next/link';

export function NotificationInit() {
  useNotificationPermission();
  const [toasts, setToasts] = useState<{ id: number; title: string; body: string; url?: string }[]>([]);

  useBroadcastListener((msg) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, ...msg }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 6000);
  });

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto bg-white border border-gray-200 rounded-xl shadow-lg p-4 flex items-start gap-3 max-w-sm animate-slide-in">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <Bell size={16} className="text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">{toast.title}</p>
            <p className="text-xs text-gray-500 mt-0.5">{toast.body}</p>
            {toast.url && (
              <Link href={toast.url} className="text-xs text-indigo-600 hover:text-indigo-700 mt-1 block">
                View results →
              </Link>
            )}
          </div>
          <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="text-gray-400 hover:text-gray-600">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
