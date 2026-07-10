import { useState, useMemo } from 'react';
import ERPLayout from '@/components/feature/ERPLayout';
import { useERP } from '@/hooks/useERPContext';

type Period = '7d' | '30d' | '90d' | 'all';

const PERIOD_LABELS: Record<Period, string> = {
  '7d': 'Últimos 7 dias',
  '30d': 'Últimos 30 dias',
  '90d': 'Últimos 90 dias',
  'all': 'Todo período',
};

// ─── Line Chart ───────────────────────────────────────────────────────────────
function LineChart({ data, color = '#f59e0b', label }: { data: { label: string; value: number }[]; color?: string; label: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const w = 600;
  const h = 120;
  const pad = { left: 8, right: 8, top: 10, bottom: 24 };
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;

  const points = data.map((d, i) => ({
    x: pad.left + (i / Math.max(data.length - 1, 1)) * innerW,
    y: pad.top + innerH - (d.value / max) * innerH,
    ...d,
  }));

  const polyline = points.map(p => `${p.x},${p.y}`).join(' ');
  const area = `${points[0]?.x ?? 0},${pad.top + innerH} ${polyline} ${points[points.length - 1]?.x ?? w},${pad.top + innerH}`;

  return (
    <div>
      <p className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: '#6b7280' }}>{label}</p>
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ minWidth: 280, height: 120 }}>
          <defs>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
            <line key={i}
              x1={pad.left} y1={pad.top + innerH * (1 - pct)}
              x2={pad.left + innerW} y2={pad.top + innerH * (1 - pct)}
              stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          ))}
          {/* Area fill */}
          <polygon points={area} fill="url(#lineGrad)" />
          {/* Line */}
          <polyline points={polyline} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {/* Dots + labels */}
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="3" fill={color} />
              <text x={p.x} y={h - 4} textAnchor="middle" fill="#4b5563" fontSize="8">{p.label}</text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────
function BarChart({ data, color = '#f59e0b', label }: { data: { label: string; value: number }[]; color?: string; label: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div>
      <p className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: '#6b7280' }}>{label}</p>
      <div className="flex items-end gap-1.5" style={{ height: '120px' }}>
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div
              className="w-full rounded-t-md transition-all"
              style={{ height: `${Math.max((d.value / max) * 100, 2)}%`, background: color, opacity: 0.85 }}
            ></div>
            <span className="text-xs whitespace-nowrap" style={{ color: '#4b5563', fontSize: '9px' }}>{d.label}</span>
            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-10"
              style={{ background: '#0f1117', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
              {d.value >= 100
                ? `R$ ${d.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                : d.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────
function DonutChart({ segments, size = 120 }: { segments: { label: string; value: number; color: string }[]; size?: number }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return (
    <div className="flex items-center justify-center" style={{ width: size, height: size }}>
      <p className="text-xs" style={{ color: '#4b5563' }}>Sem dados</p>
    </div>
  );

  let cumulative = 0;
  const radius = 45;
  const cx = 60;
  const cy = 60;
  const strokeWidth = 18;

  const paths = segments.map((seg) => {
    const pct = seg.value / total;
    const startAngle = cumulative * 2 * Math.PI - Math.PI / 2;
    cumulative += pct;
    const endAngle = cumulative * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);
    const largeArc = pct > 0.5 ? 1 : 0;
    return { ...seg, d: `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`, pct };
  });

  return (
    <svg width={size} height={size} viewBox="0 0 120 120">
      {paths.map((p, i) => (
        <path key={i} d={p.d} fill="none" stroke={p.color} strokeWidth={strokeWidth} strokeLinecap="butt" />
      ))}
      <circle cx={cx} cy={cy} r={radius - strokeWidth / 2 - 2} fill="#1a1f2e" />
      <text x={cx} y={cy - 4} textAnchor="middle" fill="#fff" fontSize="11" fontWeight="bold">{total}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="#6b7280" fontSize="8">vendas</text>
    </svg>
  );
}

// ─── Monthly Comparison Chart ─────────────────────────────────────────────────
function MonthlyComparisonChart({ sales }: { sales: ReturnType<typeof useERP>['sales'] }) {
  const months = useMemo(() => {
    const map: Record<string, { revenue: number; count: number }> = {};
    sales.filter(s => s.status !== 'Cancelado').forEach(s => {
      const parts = s.createdAt.split('/');
      if (parts.length !== 3) return;
      const key = `${parts[1]}/${parts[2].slice(2)}`;
      if (!map[key]) map[key] = { revenue: 0, count: 0 };
      map[key].revenue += s.total;
      map[key].count += 1;
    });
    return Object.entries(map)
      .sort((a, b) => {
        const [am, ay] = a[0].split('/');
        const [bm, by] = b[0].split('/');
        return Number(ay + am) - Number(by + bm);
      })
      .slice(-6)
      .map(([label, v]) => ({ label, ...v }));
  }, [sales]);

  if (months.length === 0) return (
    <div className="py-10 text-center">
      <p className="text-sm" style={{ color: '#4b5563' }}>Nenhum dado mensal disponível</p>
    </div>
  );

  const maxRev = Math.max(...months.map(m => m.revenue), 1);
  const currentMonth = months[months.length - 1];
  const prevMonth = months[months.length - 2];
  const growth = prevMonth && prevMonth.revenue > 0
    ? ((currentMonth.revenue - prevMonth.revenue) / prevMonth.revenue) * 100
    : 0;

  return (
    <div>
      {/* Growth badge */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1"
          style={growth >= 0
            ? { background: 'rgba(16,185,129,0.12)', color: '#10b981' }
            : { background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
          <i className={`${growth >= 0 ? 'ri-arrow-up-line' : 'ri-arrow-down-line'} text-xs`}></i>
          {Math.abs(growth).toFixed(1)}% vs mês anterior
        </span>
        <span className="text-xs" style={{ color: '#6b7280' }}>
          Mês atual: <strong className="text-white">R$ {currentMonth.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
        </span>
      </div>

      {/* Bar comparison */}
      <div className="flex items-end gap-3" style={{ height: 140 }}>
        {months.map((m, i) => {
          const pct = (m.revenue / maxRev) * 100;
          const isLast = i === months.length - 1;
          return (
            <div key={m.label} className="flex-1 flex flex-col items-center gap-1 group relative">
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-10 whitespace-nowrap px-2 py-1 rounded-lg text-xs font-bold"
                style={{ background: '#0f1117', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
                R$ {m.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })} · {m.count} vendas
              </div>
              <div className="w-full rounded-t-lg transition-all duration-500"
                style={{
                  height: `${Math.max(pct, 4)}%`,
                  background: isLast
                    ? 'linear-gradient(180deg, #f59e0b, #d97706)'
                    : 'rgba(255,255,255,0.1)',
                  minHeight: 4,
                }}></div>
              <span className="text-xs" style={{ color: isLast ? '#f59e0b' : '#4b5563', fontWeight: isLast ? 700 : 400 }}>{m.label}</span>
            </div>
          );
        })}
      </div>

      {/* Monthly table */}
      <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="grid grid-cols-3 gap-2">
          {months.slice(-3).reverse().map((m, i) => (
            <div key={m.label} className="rounded-xl p-3" style={{ background: i === 0 ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.03)', border: i === 0 ? '1px solid rgba(245,158,11,0.2)' : '1px solid rgba(255,255,255,0.04)' }}>
              <p className="text-xs mb-1" style={{ color: i === 0 ? '#f59e0b' : '#6b7280' }}>{m.label} {i === 0 ? '(atual)' : ''}</p>
              <p className="text-sm font-bold text-white">R$ {(m.revenue / 1000).toFixed(1)}k</p>
              <p className="text-xs mt-0.5" style={{ color: '#4b5563' }}>{m.count} vendas</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const { sales, products, customers } = useERP();
  const [period, setPeriod] = useState<Period>('30d');
  const [tab, setTab] = useState<'overview' | 'sales' | 'products' | 'customers' | 'payments'>('overview');

  const filteredSales = useMemo(() => {
    const now = new Date();
    return sales.filter(s => {
      if (s.status === 'Cancelado') return false;
      if (period === 'all') return true;
      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      const parts = s.createdAt.split('/');
      if (parts.length !== 3) return true;
      const saleDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      const diff = (now.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24);
      return diff <= days;
    });
  }, [sales, period]);

  // Sales by day
  const salesByDay = useMemo(() => {
    const days = period === '7d' ? 7 : period === '30d' ? 14 : 10;
    const map: Record<string, number> = {};
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      map[key] = 0;
    }
    filteredSales.forEach(s => {
      const parts = s.createdAt.split('/');
      if (parts.length < 2) return;
      const key = `${parts[0]}/${parts[1]}`;
      if (key in map) map[key] += s.total;
    });
    return Object.entries(map).map(([label, value]) => ({ label, value }));
  }, [filteredSales, period]);

  // Top products
  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number }> = {};
    filteredSales.forEach(s => {
      s.items.forEach(item => {
        if (!map[item.productId]) map[item.productId] = { name: item.productName, qty: 0, revenue: 0 };
        map[item.productId].qty += item.quantity;
        map[item.productId].revenue += item.total;
      });
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  }, [filteredSales]);

  // Payment methods
  const paymentData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredSales.forEach(s => {
      if (s.payments && s.payments.length > 1) {
        s.payments.forEach(p => { map[p.method] = (map[p.method] || 0) + 1; });
      } else {
        map[s.payment] = (map[s.payment] || 0) + 1;
      }
    });
    const colors = ['#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#3b82f6', '#f97316'];
    return Object.entries(map).map(([label, value], i) => ({ label, value, color: colors[i % colors.length] }));
  }, [filteredSales]);

  // Top customers
  const topCustomers = useMemo(() => {
    const map: Record<string, { name: string; total: number; count: number }> = {};
    filteredSales.forEach(s => {
      const key = s.customerId || s.customerName;
      if (!map[key]) map[key] = { name: s.customerName, total: 0, count: 0 };
      map[key].total += s.total;
      map[key].count += 1;
    });
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 8);
  }, [filteredSales]);

  // Summary metrics
  const totalRevenue = filteredSales.reduce((s, sale) => s + sale.total, 0);
  const totalSalesCount = filteredSales.length;
  const avgTicket = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;
  const totalDiscount = filteredSales.reduce((s, sale) => s + sale.discount, 0);
  const lowStockCount = products.filter(p => p.quantity <= p.minQuantity && p.status === 'Ativo').length;
  const activeCustomers = new Set(filteredSales.map(s => s.customerId || s.customerName)).size;

  const maxProductRevenue = Math.max(...topProducts.map(p => p.revenue), 1);

  // Export CSV
  const exportCSV = () => {
    const rows = [
      ['ID', 'Cliente', 'Data', 'Total', 'Pagamento', 'Status'],
      ...filteredSales.map(s => [s.id.slice(0, 8), s.customerName, s.createdAt, s.total.toFixed(2), s.payment, s.status])
    ];
    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'relatorio-vendas.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ERPLayout title="Relatórios & Análises" subtitle="Visão completa do desempenho do negócio">
      {/* Period selector */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#1a1f2e' }}>
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className="px-4 py-2 rounded-lg text-xs font-medium cursor-pointer whitespace-nowrap transition-all"
              style={period === p ? { background: '#f59e0b', color: '#000' } : { color: '#6b7280' }}>
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
        <button onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap"
          style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.08)' }}>
          <i className="ri-download-line"></i> Exportar CSV
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        {[
          { label: 'Faturamento', value: `R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: 'ri-money-dollar-circle-line', color: '#10b981' },
          { label: 'Vendas', value: String(totalSalesCount), icon: 'ri-shopping-cart-2-line', color: '#f59e0b' },
          { label: 'Ticket Médio', value: `R$ ${avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: 'ri-bar-chart-line', color: '#8b5cf6' },
          { label: 'Descontos', value: `R$ ${totalDiscount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: 'ri-price-tag-3-line', color: '#ef4444' },
          { label: 'Clientes Ativos', value: String(activeCustomers), icon: 'ri-user-3-line', color: '#06b6d4' },
          { label: 'Estoque Crítico', value: String(lowStockCount), icon: 'ri-alert-line', color: '#f97316' },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl p-4" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="w-8 h-8 flex items-center justify-center rounded-xl mb-2" style={{ background: `${c.color}20` }}>
              <i className={`${c.icon} text-sm`} style={{ color: c.color }}></i>
            </div>
            <p className="text-white font-bold text-base leading-tight">{c.value}</p>
            <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{c.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl mb-5 w-fit flex-wrap" style={{ background: '#1a1f2e' }}>
        {[
          { key: 'overview', label: 'Visão Geral', icon: 'ri-dashboard-line' },
          { key: 'sales', label: 'Vendas por Dia', icon: 'ri-line-chart-line' },
          { key: 'products', label: 'Top Produtos', icon: 'ri-archive-stack-line' },
          { key: 'customers', label: 'Top Clientes', icon: 'ri-user-3-line' },
          { key: 'payments', label: 'Pagamentos', icon: 'ri-bank-card-line' },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer whitespace-nowrap transition-all"
            style={tab === t.key ? { background: '#f59e0b', color: '#000' } : { color: '#6b7280' }}>
            <i className={t.icon}></i> {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: VISÃO GERAL ── */}
      {tab === 'overview' && (
        <div className="flex flex-col gap-4">
          {/* Monthly comparison */}
          <div className="rounded-2xl p-6" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-white font-semibold">Faturamento Mensal</p>
                <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>Comparativo dos últimos 6 meses</p>
              </div>
              <div className="w-8 h-8 flex items-center justify-center rounded-xl" style={{ background: 'rgba(245,158,11,0.12)' }}>
                <i className="ri-bar-chart-grouped-line text-sm" style={{ color: '#f59e0b' }}></i>
              </div>
            </div>
            <MonthlyComparisonChart sales={sales} />
          </div>

          {/* Two columns: line chart + payment donut */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl p-6" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-white font-semibold mb-1">Tendência de Faturamento</p>
              <p className="text-xs mb-4" style={{ color: '#6b7280' }}>Evolução diária no período selecionado</p>
              {filteredSales.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm" style={{ color: '#4b5563' }}>Nenhuma venda no período</p>
                </div>
              ) : (
                <LineChart data={salesByDay} color="#10b981" label="Faturamento diário (R$)" />
              )}
            </div>

            <div className="rounded-2xl p-6" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-white font-semibold mb-1">Formas de Pagamento</p>
              <p className="text-xs mb-4" style={{ color: '#6b7280' }}>Distribuição no período</p>
              {paymentData.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm" style={{ color: '#4b5563' }}>Nenhum dado disponível</p>
                </div>
              ) : (
                <div className="flex items-center gap-6">
                  <DonutChart segments={paymentData} size={140} />
                  <div className="flex flex-col gap-2 flex-1">
                    {paymentData.map((p, i) => {
                      const total = paymentData.reduce((s, d) => s + d.value, 0);
                      const pct = total > 0 ? ((p.value / total) * 100).toFixed(1) : '0';
                      return (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color }}></div>
                          <span className="text-xs text-white flex-1 truncate">{p.label}</span>
                          <span className="text-xs font-bold" style={{ color: p.color }}>{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Top 3 products + top 3 customers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl p-6" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-white font-semibold mb-4">Top 5 Produtos</p>
              {topProducts.length === 0 ? (
                <p className="text-sm text-center py-6" style={{ color: '#4b5563' }}>Nenhum produto vendido</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {topProducts.slice(0, 5).map((p, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs font-bold w-5 text-center flex-shrink-0" style={{ color: i < 3 ? '#f59e0b' : '#4b5563' }}>#{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-white truncate">{p.name}</p>
                          <span className="text-xs font-bold ml-2 flex-shrink-0" style={{ color: '#10b981' }}>R$ {(p.revenue / 1000).toFixed(1)}k</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          <div className="h-full rounded-full" style={{ width: `${(p.revenue / maxProductRevenue) * 100}%`, background: i < 3 ? '#f59e0b' : '#374151' }}></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl p-6" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-white font-semibold mb-4">Top 5 Clientes</p>
              {topCustomers.length === 0 ? (
                <p className="text-sm text-center py-6" style={{ color: '#4b5563' }}>Nenhum cliente no período</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {topCustomers.slice(0, 5).map((c, i) => {
                    const maxTotal = Math.max(...topCustomers.map(x => x.total), 1);
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs font-bold w-5 text-center flex-shrink-0" style={{ color: i < 3 ? '#10b981' : '#4b5563' }}>#{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium text-white truncate">{c.name}</p>
                            <span className="text-xs font-bold ml-2 flex-shrink-0" style={{ color: '#10b981' }}>R$ {(c.total / 1000).toFixed(1)}k</span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <div className="h-full rounded-full" style={{ width: `${(c.total / maxTotal) * 100}%`, background: i < 3 ? '#10b981' : '#374151' }}></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: VENDAS POR DIA ── */}
      {tab === 'sales' && (
        <div className="rounded-2xl p-6" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}>
          {filteredSales.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 flex items-center justify-center rounded-2xl mx-auto mb-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <i className="ri-bar-chart-2-line text-3xl" style={{ color: '#4b5563' }}></i>
              </div>
              <p className="text-white font-medium">Nenhuma venda no período</p>
              <p className="text-sm mt-1" style={{ color: '#6b7280' }}>Registre vendas pelo PDV para ver os gráficos</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <BarChart data={salesByDay} color="#f59e0b" label="Faturamento por dia (R$)" />
                <LineChart data={salesByDay} color="#10b981" label="Tendência de faturamento" />
              </div>
              <div className="mt-6 pt-5 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <p className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: '#6b7280' }}>Últimas vendas</p>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        {['ID', 'Cliente', 'Data', 'Pagamento', 'Total'].map(h => (
                          <th key={h} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: '#4b5563' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSales.slice(0, 10).map(s => (
                        <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td className="px-3 py-2 text-xs font-mono" style={{ color: '#f59e0b' }}>{s.id.slice(0, 8)}</td>
                          <td className="px-3 py-2 text-sm text-white whitespace-nowrap">{s.customerName}</td>
                          <td className="px-3 py-2 text-xs whitespace-nowrap" style={{ color: '#6b7280' }}>{s.createdAt}</td>
                          <td className="px-3 py-2 text-xs whitespace-nowrap" style={{ color: '#9ca3af' }}>{s.payment}</td>
                          <td className="px-3 py-2 text-sm font-bold whitespace-nowrap" style={{ color: '#10b981' }}>R$ {s.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── TAB: TOP PRODUTOS ── */}
      {tab === 'products' && (
        <div className="rounded-2xl p-6" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}>
          {topProducts.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 flex items-center justify-center rounded-2xl mx-auto mb-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <i className="ri-archive-stack-line text-3xl" style={{ color: '#4b5563' }}></i>
              </div>
              <p className="text-white font-medium">Nenhum produto vendido no período</p>
            </div>
          ) : (
            <>
              <p className="text-xs font-semibold mb-4 uppercase tracking-wider" style={{ color: '#6b7280' }}>Produtos mais vendidos por faturamento</p>
              <div className="flex flex-col gap-3">
                {topProducts.map((p, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <span className="text-xs font-bold w-5 text-center flex-shrink-0" style={{ color: i < 3 ? '#f59e0b' : '#4b5563' }}>#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-white truncate">{p.name}</p>
                        <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                          <span className="text-xs" style={{ color: '#6b7280' }}>{p.qty} un.</span>
                          <span className="text-sm font-bold" style={{ color: '#10b981' }}>R$ {p.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${(p.revenue / maxProductRevenue) * 100}%`, background: i < 3 ? '#f59e0b' : '#374151' }}></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── TAB: TOP CLIENTES ── */}
      {tab === 'customers' && (
        <div className="rounded-2xl p-6" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}>
          {topCustomers.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 flex items-center justify-center rounded-2xl mx-auto mb-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <i className="ri-user-3-line text-3xl" style={{ color: '#4b5563' }}></i>
              </div>
              <p className="text-white font-medium">Nenhum cliente no período</p>
            </div>
          ) : (
            <>
              <p className="text-xs font-semibold mb-4 uppercase tracking-wider" style={{ color: '#6b7280' }}>Clientes que mais compraram</p>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {['#', 'Cliente', 'Compras', 'Total Gasto', 'Ticket Médio'].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: '#4b5563' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {topCustomers.map((c, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td className="px-3 py-3 text-xs font-bold" style={{ color: i < 3 ? '#f59e0b' : '#4b5563' }}>#{i + 1}</td>
                        <td className="px-3 py-3 text-sm font-medium text-white whitespace-nowrap">{c.name}</td>
                        <td className="px-3 py-3 text-sm text-center" style={{ color: '#9ca3af' }}>{c.count}</td>
                        <td className="px-3 py-3 text-sm font-bold whitespace-nowrap" style={{ color: '#10b981' }}>R$ {c.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td className="px-3 py-3 text-sm whitespace-nowrap" style={{ color: '#9ca3af' }}>R$ {(c.total / c.count).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── TAB: PAGAMENTOS ── */}
      {tab === 'payments' && (
        <div className="rounded-2xl p-6" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}>
          {paymentData.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 flex items-center justify-center rounded-2xl mx-auto mb-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <i className="ri-bank-card-line text-3xl" style={{ color: '#4b5563' }}></i>
              </div>
              <p className="text-white font-medium">Nenhum dado de pagamento</p>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row items-start gap-8">
              <div className="flex-shrink-0">
                <p className="text-xs font-semibold mb-4 uppercase tracking-wider" style={{ color: '#6b7280' }}>Distribuição por método</p>
                <DonutChart segments={paymentData} size={160} />
              </div>
              <div className="flex-1 w-full">
                <p className="text-xs font-semibold mb-4 uppercase tracking-wider" style={{ color: '#6b7280' }}>Detalhamento</p>
                <div className="flex flex-col gap-3">
                  {paymentData.map((p, i) => {
                    const total = paymentData.reduce((s, d) => s + d.value, 0);
                    const pct = total > 0 ? ((p.value / total) * 100).toFixed(1) : '0';
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: p.color }}></div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-white">{p.label}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-xs" style={{ color: '#6b7280' }}>{p.value} vendas</span>
                              <span className="text-sm font-bold" style={{ color: p.color }}>{pct}%</span>
                            </div>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: p.color }}></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </ERPLayout>
  );
}
