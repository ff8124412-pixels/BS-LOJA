interface MetricCardProps {
  title: string;
  value: string;
  change: number;
  positive: boolean;
  icon: string;
  color: string;
}

export default function MetricCard({ title, value, change, positive, icon, color }: MetricCardProps) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-4 transition-all duration-200 cursor-default"
      style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'; }}
    >
      <div className="flex items-start justify-between">
        <div
          className="w-10 h-10 flex items-center justify-center rounded-xl"
          style={{ background: `${color}20` }}
        >
          <i className={`${icon} text-lg`} style={{ color }}></i>
        </div>
        <span
          className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full`}
          style={{
            background: positive ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
            color: positive ? '#10b981' : '#ef4444',
          }}
        >
          <i className={`${positive ? 'ri-arrow-up-line' : 'ri-arrow-down-line'} text-xs`}></i>
          {Math.abs(change)}{typeof change === 'number' && change % 1 !== 0 ? '' : ''}
        </span>
      </div>
      <div>
        <p className="text-2xl font-bold text-white leading-tight">{value}</p>
        <p className="text-sm mt-1" style={{ color: '#6b7280' }}>{title}</p>
      </div>
    </div>
  );
}
