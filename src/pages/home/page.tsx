import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ERPLayout from '@/components/feature/ERPLayout';
import { useERP } from '@/hooks/useERPContext';

// ─── Mini Sparkline ───────────────────────────────────────────────────────────
function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const w = 80;
  const h = 28;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - (v / max) * h;
    return `${x},${y}`;
  });
  const polyline = pts.join(' ');
  const area = `0,${h} ${polyline} ${w},${h}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <defs>
        <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#sg-${color.replace('#', '')})`} />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Bar Chart (últimos 7 dias) ───────────────────────────────────────────────
function SalesBarChart({ sales }: { sales: ReturnType<typeof useERP>['sales'] }) {
  const days = useMemo(() => {
    const result: { label: string; value: number; date: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
      const dateStr = d.toLocaleDateString('pt-BR');
      const value = sales
        .filter(s => s.status === 'Concluído' && s.createdAt === dateStr)
        .reduce((sum, s) => sum + s.total, 0);
      result.push({ label, value, date: dateStr });
    }
    return result;
  }, [sales]);

  const max = Math.max(...days.map(d => d.value), 1);
  const today = new Date().toLocaleDateString('pt-BR');

  return (
    <div className="flex items-end gap-2 h-28 mt-2">
      {days.map((d) => {
        const pct = (d.value / max) * 100;
        const isToday = d.date === today;
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
              <div className="px-2 py-1 rounded-lg text-xs font-semibold whitespace-nowrap" style={{ background: '#0f1117', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
                R$ {d.value.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
              </div>
            </div>
            <div className="w-full rounded-t-md transition-all duration-500 relative overflow-hidden"
              style={{
                height: `${Math.max(pct, 4)}%`,
                background: isToday
                  ? 'linear-gradient(180deg, #f59e0b, #d97706)'
                  : 'rgba(255,255,255,0.08)',
                minHeight: 4,
              }}>
              {isToday && <div className="absolute inset-0 opacity-30" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.3), transparent)' }} />}
            </div>
            <span className="text-xs capitalize" style={{ color: isToday ? '#f59e0b' : '#4b5563', fontWeight: isToday ? 700 : 400 }}>{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ icon, title, desc, action, onAction }: { icon: string; title: string; desc: string; action?: string; onAction?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="w-12 h-12 flex items-center justify-center rounded-2xl mb-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <i className={`${icon} text-2xl`} style={{ color: '#4b5563' }}></i>
      </div>
      <p className="text-sm font-medium" style={{ color: '#6b7280' }}>{title}</p>
      <p className="text-xs mt-1" style={{ color: '#4b5563' }}>{desc}</p>
      {action && onAction && (
        <button onClick={onAction} className="mt-3 px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap"
          style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>{action}</button>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { sales, products, receivables, payables, criticalStockProducts, pendingSales, todaySales, auditLogs, auth, salesGoals } = useERP();
  const navigate = useNavigate();

  const today = new Date().toLocaleDateString('pt-BR');
  const monthSales = sales.filter((s) => s.status === 'Concluído');
  const totalMonth = monthSales.reduce((s, sale) => s + sale.total, 0);
  const totalReceivable = receivables.filter((r) => r.status !== 'Pago').reduce((s, r) => s + r.value, 0);
  const totalPayable = payables.filter((p) => p.status !== 'Pago').reduce((s, p) => s + p.value, 0);
  const overdueReceivable = receivables.filter(r => r.status === 'Vencido').length;
  const overduePayable = payables.filter(p => p.status === 'Vencido').length;

  // Current month goals
  const currentMonthStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const currentMonthGoals = useMemo(() => {
    return salesGoals
      .filter(g => g.period === currentMonthStr)
      .map(g => {
        const periodSales = sales.filter(s => {
          if (s.status !== 'Concluído') return false;
          const parts = s.createdAt.split('/');
          if (parts.length < 3) return false;
          const month = `${parts[2]}-${parts[1]}`;
          return month === g.period && s.sellerName === g.sellerName;
        });
        const currentRevenue = periodSales.reduce((s, sale) => s + sale.total, 0);
        return { ...g, currentRevenue };
      });
  }, [salesGoals, sales, currentMonthStr]);

  // Sparkline data: últimos 7 dias de faturamento
  const sparklineData = useMemo(() => {
    const result: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('pt-BR');
      const val = sales.filter(s => s.status === 'Concluído' && s.createdAt === dateStr).reduce((sum, s) => sum + s.total, 0);
      result.push(val);
    }
    return result;
  }, [sales]);

  const todayCount = sales.filter(s => s.createdAt === today).length;

  const metrics = [
    {
      title: 'Vendas Hoje', value: `R$ ${todaySales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: 'ri-money-dollar-circle-line', color: '#10b981',
      sub: `${todayCount} transaç${todayCount === 1 ? 'ão' : 'ões'} hoje`, link: '/sales',
      spark: sparklineData,
    },
    {
      title: 'Pedidos Pendentes', value: String(pendingSales.length),
      icon: 'ri-shopping-bag-3-line', color: '#f59e0b',
      sub: 'aguardando aprovação', link: '/sales',
      spark: null,
    },
    {
      title: 'Estoque Crítico', value: String(criticalStockProducts.length),
      icon: 'ri-error-warning-line', color: '#ef4444',
      sub: 'itens abaixo do mínimo', link: '/inventory',
      spark: null,
    },
    {
      title: 'A Receber', value: `R$ ${totalReceivable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: 'ri-bank-card-line', color: '#8b5cf6',
      sub: `${receivables.filter(r => r.status !== 'Pago').length} títulos em aberto`, link: '/receivable',
      spark: null,
    },
  ];

  const topProducts = useMemo(() => [...products]
    .sort((a, b) => {
      const aQty = sales.flatMap(s => s.items).filter(i => i.productId === a.id).reduce((s, i) => s + i.quantity, 0);
      const bQty = sales.flatMap(s => s.items).filter(i => i.productId === b.id).reduce((s, i) => s + i.quantity, 0);
      return bQty - aQty;
    })
    .slice(0, 5), [products, sales]);

  const statusStyle: Record<string, { bg: string; color: string }> = {
    'success': { bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
    'info': { bg: 'rgba(99,102,241,0.12)', color: '#818cf8' },
    'warning': { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
    'error': { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
  };

  // Faturamento mensal acumulado (últimos 3 meses)
  const monthlyRevenue = useMemo(() => {
    const months: Record<string, number> = {};
    sales.filter(s => s.status === 'Concluído').forEach(s => {
      const parts = s.createdAt.split('/');
      if (parts.length === 3) {
        const key = `${parts[1]}/${parts[2]}`;
        months[key] = (months[key] || 0) + s.total;
      }
    });
    return months;
  }, [sales]);

  const currentMonth = new Date().toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' }).replace('/', '/');
  const currentMonthRevenue = monthlyRevenue[currentMonth] || 0;
  const prevMonthDate = new Date();
  prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
  const prevMonth = prevMonthDate.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' }).replace('/', '/');
  const prevMonthRevenue = monthlyRevenue[prevMonth] || 0;
  const growthPct = prevMonthRevenue > 0 ? ((currentMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100 : 0;

  return (
    <ERPLayout title="Dashboard" subtitle={`Bem-vindo, ${auth.user?.name} — ${today}`}>

      {/* ── Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {metrics.map((m) => (
          <div key={m.title} onClick={() => navigate(m.link)}
            className="rounded-2xl p-5 flex flex-col gap-3 cursor-pointer transition-all duration-200 relative overflow-hidden"
            style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = `${m.color}40`; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'; }}>
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 flex items-center justify-center rounded-xl" style={{ background: `${m.color}20` }}>
                <i className={`${m.icon} text-lg`} style={{ color: m.color }}></i>
              </div>
              <div className="w-6 h-6 flex items-center justify-center" style={{ color: '#4b5563' }}>
                <i className="ri-arrow-right-up-line text-sm"></i>
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-white leading-tight">{m.value}</p>
              <p className="text-sm mt-0.5" style={{ color: '#6b7280' }}>{m.title}</p>
              <p className="text-xs mt-1" style={{ color: '#4b5563' }}>{m.sub}</p>
            </div>
            {m.spark && (
              <div className="absolute bottom-3 right-3 opacity-60">
                <Sparkline values={m.spark} color={m.color} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Row 2: Gráfico de Vendas + Top Produtos ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">

        {/* Sales Chart + Summary */}
        <div className="lg:col-span-2 rounded-2xl p-5" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-white font-semibold">Faturamento — Últimos 7 dias</p>
              <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>Vendas concluídas por dia</p>
            </div>
            <div className="flex items-center gap-2">
              {growthPct !== 0 && (
                <span className="text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1"
                  style={growthPct >= 0
                    ? { background: 'rgba(16,185,129,0.12)', color: '#10b981' }
                    : { background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                  {growthPct >= 0 ? <i className="ri-arrow-up-line text-xs"></i> : <i className="ri-arrow-down-line text-xs"></i>}
                  {Math.abs(growthPct).toFixed(1)}% vs mês ant.
                </span>
              )}
              <button onClick={() => navigate('/sales')} className="text-xs font-medium px-3 py-1.5 rounded-lg cursor-pointer whitespace-nowrap"
                style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>Ver vendas</button>
            </div>
          </div>

          {/* KPIs rápidos */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: 'Faturamento Total', value: `R$ ${totalMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, color: '#10b981' },
              { label: 'Total de Vendas', value: String(monthSales.length), color: '#f59e0b' },
              { label: 'Ticket Médio', value: monthSales.length > 0 ? `R$ ${(totalMonth / monthSales.length).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ 0,00', color: '#8b5cf6' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl p-3" style={{ background: '#0f1117' }}>
                <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Bar Chart */}
          <SalesBarChart sales={sales} />

          {/* Últimas vendas */}
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: '#4b5563' }}>Últimas Vendas</p>
            <div className="flex flex-col gap-1">
              {sales.slice(0, 3).map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2 rounded-lg px-2 transition-all cursor-pointer"
                  onClick={() => navigate('/sales')}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 flex items-center justify-center rounded-lg flex-shrink-0" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <i className="ri-shopping-cart-line text-xs" style={{ color: '#6b7280' }}></i>
                    </div>
                    <div>
                      <p className="text-sm text-white leading-tight">{s.customerName}</p>
                      <p className="text-xs" style={{ color: '#6b7280' }}>{s.createdAt} · {s.payment}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color: '#10b981' }}>R$ {s.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={s.status === 'Concluído' ? { background: 'rgba(16,185,129,0.12)', color: '#10b981' } : { background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                      {s.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Products */}
        <div className="rounded-2xl p-5" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white font-semibold">Top Produtos</p>
              <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>Mais vendidos</p>
            </div>
            <button onClick={() => navigate('/inventory')} className="text-xs font-medium px-3 py-1.5 rounded-lg cursor-pointer whitespace-nowrap"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>Ver estoque</button>
          </div>
          {topProducts.length === 0 ? (
            <EmptyState icon="ri-archive-line" title="Nenhum produto cadastrado" desc="Cadastre produtos no módulo de Estoque" action="Cadastrar produto" onAction={() => navigate('/inventory')} />
          ) : (
            <div className="flex flex-col gap-4">
              {topProducts.map((p, i) => {
                const sold = sales.flatMap(s => s.items).filter(item => item.productId === p.id).reduce((s, item) => s + item.quantity, 0);
                const revenue = sales.flatMap(s => s.items).filter(item => item.productId === p.id).reduce((s, item) => s + item.total, 0);
                const maxSold = Math.max(...topProducts.map(tp => sales.flatMap(s => s.items).filter(item => item.productId === tp.id).reduce((s, item) => s + item.quantity, 0)), 1);
                const rankColors = ['#f59e0b', '#9ca3af', '#cd7c2f', '#6b7280', '#6b7280'];
                return (
                  <div key={p.id} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full flex-shrink-0 text-center"
                          style={{ background: `${rankColors[i]}20`, color: rankColors[i] }}>{i + 1}</span>
                        <span className="text-sm font-medium text-white truncate">{p.name}</span>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-bold" style={{ color: '#f59e0b' }}>{sold} un</p>
                        <p className="text-xs" style={{ color: '#4b5563' }}>R$ {(revenue / 1000).toFixed(1)}k</p>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${(sold / maxSold) * 100}%`, background: `linear-gradient(90deg, ${rankColors[i]}, ${rankColors[i]}99)` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Margem média */}
          <div className="mt-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: '#4b5563' }}>Margem por Categoria</p>
            {(() => {
              const catMap: Record<string, { revenue: number; cost: number }> = {};
              sales.filter(s => s.status === 'Concluído').forEach(s => {
                s.items.forEach(item => {
                  const prod = products.find(p => p.id === item.productId);
                  if (!prod) return;
                  if (!catMap[prod.category]) catMap[prod.category] = { revenue: 0, cost: 0 };
                  catMap[prod.category].revenue += item.total;
                  catMap[prod.category].cost += prod.cost * item.quantity;
                });
              });
              return Object.entries(catMap).slice(0, 3).map(([cat, { revenue, cost }]) => {
                const margin = revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0;
                return (
                  <div key={cat} className="flex items-center justify-between mb-2">
                    <span className="text-xs truncate max-w-[120px]" style={{ color: '#9ca3af' }}>{cat}</span>
                    <span className="text-xs font-bold" style={{ color: margin > 30 ? '#10b981' : margin > 15 ? '#f59e0b' : '#ef4444' }}>
                      {margin.toFixed(1)}%
                    </span>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>

      {/* ── Row 3: Financeiro + Alertas ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">

        {/* Financial */}
        <div className="rounded-2xl p-5" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-white font-semibold">Posição Financeira</p>
            <button onClick={() => navigate('/cashflow')} className="text-xs font-medium px-3 py-1.5 rounded-lg cursor-pointer whitespace-nowrap"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>Fluxo de caixa</button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: 'A Receber', value: totalReceivable, color: '#10b981', icon: 'ri-arrow-up-circle-line', link: '/receivable', alert: overdueReceivable },
              { label: 'A Pagar', value: totalPayable, color: '#ef4444', icon: 'ri-arrow-down-circle-line', link: '/payable', alert: overduePayable },
            ].map((f) => (
              <div key={f.label} onClick={() => navigate(f.link)}
                className="rounded-xl p-4 cursor-pointer transition-all relative"
                style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.04)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = `${f.color}30`; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.04)'; }}>
                <div className="w-8 h-8 flex items-center justify-center rounded-lg mb-2" style={{ background: `${f.color}15` }}>
                  <i className={`${f.icon} text-sm`} style={{ color: f.color }}></i>
                </div>
                <p className="text-lg font-bold text-white">R$ {f.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{f.label}</p>
                {f.alert > 0 && (
                  <span className="absolute top-2 right-2 text-xs font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                    {f.alert} venc.
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Saldo projetado */}
          <div className="rounded-xl p-3" style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.04)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs" style={{ color: '#6b7280' }}>Saldo Projetado</p>
                <p className="text-lg font-bold mt-0.5" style={{ color: totalReceivable - totalPayable >= 0 ? '#10b981' : '#ef4444' }}>
                  R$ {(totalReceivable - totalPayable).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-10 h-10 flex items-center justify-center rounded-xl" style={{ background: totalReceivable - totalPayable >= 0 ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)' }}>
                <i className={`ri-scales-line text-lg`} style={{ color: totalReceivable - totalPayable >= 0 ? '#10b981' : '#ef4444' }}></i>
              </div>
            </div>
          </div>
        </div>

        {/* Critical Stock */}
        <div className="rounded-2xl p-5" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white font-semibold">Alertas de Estoque</p>
              <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>Produtos abaixo do mínimo</p>
            </div>
            <button onClick={() => navigate('/inventory')} className="text-xs font-medium px-3 py-1.5 rounded-lg cursor-pointer whitespace-nowrap"
              style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>Ver estoque</button>
          </div>
          {criticalStockProducts.length === 0 ? (
            <EmptyState icon="ri-checkbox-circle-line" title="Estoque em dia!" desc="Nenhum produto abaixo do estoque mínimo" />
          ) : (
            <div className="flex flex-col gap-2">
              {criticalStockProducts.slice(0, 5).map((p) => {
                const pct = Math.min((p.quantity / p.minQuantity) * 100, 100);
                return (
                  <div key={p.id} className="rounded-xl p-3"
                    style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-white">{p.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>SKU: {p.sku} · {p.warehouse}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold" style={{ color: '#ef4444' }}>{p.quantity} {p.unit}</p>
                        <p className="text-xs" style={{ color: '#6b7280' }}>mín: {p.minQuantity}</p>
                      </div>
                    </div>
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct < 30 ? '#ef4444' : '#f59e0b' }}></div>
                    </div>
                  </div>
                );
              })}
              {criticalStockProducts.length > 5 && (
                <button onClick={() => navigate('/inventory')} className="text-xs text-center py-2 cursor-pointer" style={{ color: '#6b7280' }}>
                  + {criticalStockProducts.length - 5} outros produtos críticos
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Row 4: Metas do Mês ── */}
      {currentMonthGoals.length > 0 && (
        <div className="rounded-2xl overflow-hidden mb-6" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <div>
              <p className="text-white font-semibold">Metas do Mês Atual</p>
              <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>Progresso de cada vendedor no mês corrente</p>
            </div>
            <button onClick={() => navigate('/goals')} className="text-xs font-medium px-3 py-1.5 rounded-lg cursor-pointer whitespace-nowrap"
              style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>Ver todas as metas</button>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {currentMonthGoals.map(g => {
              const pct = g.targetRevenue > 0 ? Math.min((g.currentRevenue / g.targetRevenue) * 100, 100) : 0;
              const achieved = g.currentRevenue >= g.targetRevenue;
              return (
                <div key={g.id} className="rounded-xl p-4" style={{ background: '#0f1117', border: `1px solid ${achieved ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.04)'}` }}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold text-white flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                      {g.sellerName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{g.sellerName}</p>
                      {achieved && (
                        <span className="text-xs font-semibold" style={{ color: '#10b981' }}>
                          <i className="ri-trophy-line mr-0.5"></i>Atingida!
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mb-2">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs" style={{ color: '#6b7280' }}>Progresso</span>
                      <span className="text-xs font-bold" style={{ color: achieved ? '#10b981' : '#f59e0b' }}>{pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: achieved ? '#10b981' : 'linear-gradient(90deg, #f59e0b, #d97706)' }}></div>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs font-semibold text-white">R$ {(g.currentRevenue / 1000).toFixed(1)}k</span>
                    <span className="text-xs" style={{ color: '#4b5563' }}>/ R$ {(g.targetRevenue / 1000).toFixed(1)}k</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Audit Log ── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div>
            <p className="text-white font-semibold">Atividades Recentes</p>
            <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>Últimas ações no sistema</p>
          </div>
          <button onClick={() => navigate('/settings')} className="text-xs font-medium px-3 py-1.5 rounded-lg cursor-pointer whitespace-nowrap"
            style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>Ver todos os logs</button>
        </div>
        {auditLogs.length === 0 ? (
          <div className="px-5 py-8">
            <EmptyState icon="ri-history-line" title="Nenhuma atividade registrada" desc="As ações do sistema aparecerão aqui" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  {['Data/Hora', 'Módulo', 'Ação', 'Usuário', 'IP', 'Tipo'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: '#4b5563' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {auditLogs.slice(0, 8).map((log) => {
                  const st = statusStyle[log.type] || { bg: 'rgba(107,114,128,0.12)', color: '#6b7280' };
                  return (
                    <tr key={log.id} className="transition-all" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                      <td className="px-5 py-3 text-xs whitespace-nowrap" style={{ color: '#6b7280' }}>{log.createdAt}</td>
                      <td className="px-5 py-3"><span className="text-xs px-2 py-0.5 rounded-md" style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>{log.module}</span></td>
                      <td className="px-5 py-3 text-sm" style={{ color: '#d1d5db' }}>{log.action}</td>
                      <td className="px-5 py-3 text-sm" style={{ color: '#9ca3af' }}>{log.userName}</td>
                      <td className="px-5 py-3 text-xs" style={{ color: '#4b5563' }}>{log.ip}</td>
                      <td className="px-5 py-3">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: st.bg, color: st.color }}>
                          {log.type}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ERPLayout>
  );
}
