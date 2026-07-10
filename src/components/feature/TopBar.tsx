import NotificationPanel from '@/components/feature/NotificationPanel';

interface TopBarProps { title: string; subtitle?: string; }

export default function TopBar({ title, subtitle }: TopBarProps) {
  const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <header className="h-16 flex items-center justify-between px-6 sticky top-0 z-30"
      style={{ background: '#0f1117', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div>
        <h1 className="text-white font-bold text-lg leading-tight">{title}</h1>
        {subtitle && <p className="text-xs" style={{ color: '#6b7280' }}>{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        <NotificationPanel />
        {/* Date */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af' }}>
          <div className="w-4 h-4 flex items-center justify-center">
            <i className="ri-calendar-line text-sm"></i>
          </div>
          <span className="text-xs font-medium">{today}</span>
        </div>
      </div>
    </header>
  );
}
