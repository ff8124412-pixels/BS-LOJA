import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useERP } from '@/hooks/useERPContext';
import type { Notification } from '@/types/erp';

const TYPE_STYLE: Record<string, { icon: string; color: string; bg: string }> = {
  info:    { icon: 'ri-information-line', color: '#818cf8', bg: 'rgba(129,140,248,0.12)' },
  warning: { icon: 'ri-alert-line',       color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  error:   { icon: 'ri-error-warning-line', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  success: { icon: 'ri-checkbox-circle-line', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
};

export default function NotificationPanel() {
  const { notifications, markNotificationRead, markAllNotificationsRead, deleteNotification, unreadNotifications } = useERP();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleClick = (n: Notification) => {
    markNotificationRead(n.id);
    if (n.link) navigate(n.link);
    setOpen(false);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer transition-all"
        style={{ background: open ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.06)', color: open ? '#f59e0b' : '#9ca3af' }}>
        <i className="ri-notification-3-line text-base"></i>
        {unreadNotifications > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center rounded-full text-xs font-bold"
            style={{ background: '#ef4444', color: 'white', fontSize: '9px' }}>
            {unreadNotifications > 9 ? '9+' : unreadNotifications}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl overflow-hidden z-50"
          style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
          <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-2">
              <p className="text-white font-semibold text-sm">Notificações</p>
              {unreadNotifications > 0 && (
                <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#ef4444', color: 'white' }}>{unreadNotifications}</span>
              )}
            </div>
            {unreadNotifications > 0 && (
              <button onClick={markAllNotificationsRead}
                className="text-xs cursor-pointer whitespace-nowrap" style={{ color: '#f59e0b' }}>
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-10 h-10 flex items-center justify-center rounded-xl mb-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <i className="ri-notification-off-line text-xl" style={{ color: '#4b5563' }}></i>
                </div>
                <p className="text-sm" style={{ color: '#6b7280' }}>Nenhuma notificação</p>
              </div>
            ) : (
              notifications.slice(0, 20).map(n => {
                const ts = TYPE_STYLE[n.type] || TYPE_STYLE.info;
                return (
                  <div key={n.id}
                    className="flex items-start gap-3 px-4 py-3 cursor-pointer transition-all relative"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: n.read ? 'transparent' : 'rgba(245,158,11,0.04)' }}
                    onClick={() => handleClick(n)}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = n.read ? 'transparent' : 'rgba(245,158,11,0.04)'; }}>
                    {!n.read && (
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full" style={{ background: '#f59e0b' }}></span>
                    )}
                    <div className="w-8 h-8 flex items-center justify-center rounded-xl flex-shrink-0" style={{ background: ts.bg }}>
                      <i className={`${ts.icon} text-sm`} style={{ color: ts.color }}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white leading-tight">{n.title}</p>
                      <p className="text-xs mt-0.5 leading-relaxed" style={{ color: '#6b7280' }}>{n.message}</p>
                      <p className="text-xs mt-1" style={{ color: '#4b5563' }}>{n.createdAt}</p>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); deleteNotification(n.id); }}
                      className="w-5 h-5 flex items-center justify-center rounded flex-shrink-0 opacity-0 group-hover:opacity-100 cursor-pointer"
                      style={{ color: '#4b5563' }}>
                      <i className="ri-close-line text-xs"></i>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
