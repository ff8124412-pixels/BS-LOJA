import { useState, useMemo } from 'react';
import ERPLayout from '@/components/feature/ERPLayout';
import { useERP } from '@/hooks/useERPContext';
import type { SalesGoal } from '@/types/erp';

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  'Em andamento': { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
  'Atingida':     { bg: 'rgba(16,185,129,0.15)',  color: '#10b981' },
  'Não atingida': { bg: 'rgba(239,68,68,0.15)',   color: '#ef4444' },
};

const EMPTY_FORM = {
  sellerName: '',
  period: '',
  targetRevenue: 0,
  targetSales: 0,
};

export default function GoalsPage() {
  const { salesGoals, addSalesGoal, updateSalesGoal, deleteSalesGoal, sales, users, auth } = useERP();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [periodFilter, setPeriodFilter] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'ranking'>('cards');

  const isAdmin = auth.user?.role === 'Administrador' || auth.user?.role === 'Gerente';

  const filtered = useMemo(() => {
    return salesGoals.filter(g => !periodFilter || g.period === periodFilter);
  }, [salesGoals, periodFilter]);

  // Compute current progress from sales
  const goalsWithProgress = useMemo(() => {
    return filtered.map(g => {
      const periodSales = sales.filter(s => {
        if (s.status !== 'Concluído') return false;
        const parts = s.createdAt.split('/');
        if (parts.length < 3) return false;
        const month = `${parts[2]}-${parts[1]}`;
        return month === g.period && s.sellerName === g.sellerName;
      });
      const currentRevenue = periodSales.reduce((s, sale) => s + sale.total, 0);
      const currentSales = periodSales.length;
      return { ...g, currentRevenue, currentSales };
    });
  }, [filtered, sales]);

  // Ranking: aggregate by seller across all periods
  const sellerRanking = useMemo(() => {
    const map: Record<string, { name: string; totalRevenue: number; totalTarget: number; goalsCount: number; achieved: number }> = {};
    goalsWithProgress.forEach(g => {
      if (!map[g.sellerName]) map[g.sellerName] = { name: g.sellerName, totalRevenue: 0, totalTarget: 0, goalsCount: 0, achieved: 0 };
      map[g.sellerName].totalRevenue += g.currentRevenue;
      map[g.sellerName].totalTarget += g.targetRevenue;
      map[g.sellerName].goalsCount += 1;
      if (g.currentRevenue >= g.targetRevenue) map[g.sellerName].achieved += 1;
    });
    return Object.values(map).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [goalsWithProgress]);

  const totalGoalRevenue = goalsWithProgress.reduce((s, g) => s + g.targetRevenue, 0);
  const totalCurrentRevenue = goalsWithProgress.reduce((s, g) => s + g.currentRevenue, 0);
  const achievedCount = goalsWithProgress.filter(g => g.currentRevenue >= g.targetRevenue).length;
  const overallPct = totalGoalRevenue > 0 ? Math.min((totalCurrentRevenue / totalGoalRevenue) * 100, 100) : 0;

  const openNew = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setShowModal(true);
  };

  const openEdit = (g: SalesGoal) => {
    setEditingId(g.id);
    setForm({ sellerName: g.sellerName, period: g.period, targetRevenue: g.targetRevenue, targetSales: g.targetSales });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.sellerName || !form.period || form.targetRevenue <= 0) return;
    const payload = {
      sellerId: users.find(u => u.name === form.sellerName)?.id || '',
      sellerName: form.sellerName,
      period: form.period,
      targetRevenue: form.targetRevenue,
      targetSales: form.targetSales,
      currentRevenue: 0,
      currentSales: 0,
      status: 'Em andamento' as SalesGoal['status'],
    };
    if (editingId) {
      updateSalesGoal(editingId, payload);
    } else {
      addSalesGoal(payload);
    }
    setShowModal(false);
  };

  const exportCSV = () => {
    const rows = [
      ['Vendedor', 'Período', 'Meta Faturamento', 'Faturamento Atual', 'Meta Vendas', 'Vendas Atuais', 'Progresso %', 'Status'],
      ...goalsWithProgress.map(g => {
        const pct = g.targetRevenue > 0 ? ((g.currentRevenue / g.targetRevenue) * 100).toFixed(1) : '0';
        const status = g.currentRevenue >= g.targetRevenue ? 'Atingida' : 'Em andamento';
        return [g.sellerName, g.period, g.targetRevenue.toFixed(2), g.currentRevenue.toFixed(2), String(g.targetSales), String(g.currentSales), pct, status];
      }),
    ];
    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `metas_${periodFilter || 'todas'}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const sellerNames = ['', ...Array.from(new Set(users.filter(u => ['Vendedor', 'Gerente', 'Administrador'].includes(u.role)).map(u => u.name)))];
  const rankColors = ['#f59e0b', '#9ca3af', '#cd7c2f', '#6b7280', '#6b7280', '#6b7280'];
  const rankIcons = ['ri-trophy-line', 'ri-medal-line', 'ri-award-line'];

  return (
    <ERPLayout title="Metas de Vendas" subtitle="Defina e acompanhe metas por vendedor e período">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total de Metas', value: String(filtered.length), icon: 'ri-flag-2-line', color: '#f59e0b' },
          { label: 'Meta de Faturamento', value: `R$ ${totalGoalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: 'ri-flag-line', color: '#818cf8' },
          { label: 'Faturamento Atual', value: `R$ ${totalCurrentRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: 'ri-money-dollar-circle-line', color: '#10b981' },
          { label: 'Metas Atingidas', value: `${achievedCount}/${filtered.length}`, icon: 'ri-trophy-line', color: '#f59e0b' },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl p-4" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="w-8 h-8 flex items-center justify-center rounded-xl mb-2" style={{ background: `${c.color}20` }}>
              <i className={`${c.icon} text-sm`} style={{ color: c.color }}></i>
            </div>
            <p className="text-white font-bold text-lg leading-tight">{c.value}</p>
            <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{c.label}</p>
          </div>
        ))}
      </div>

      {/* Overall progress bar */}
      {filtered.length > 0 && (
        <div className="rounded-2xl p-5 mb-5" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-white font-semibold">Progresso Geral do Período</p>
              <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>Consolidado de todas as metas filtradas</p>
            </div>
            <span className="text-2xl font-bold" style={{ color: overallPct >= 100 ? '#10b981' : '#f59e0b' }}>{overallPct.toFixed(1)}%</span>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${overallPct}%`, background: overallPct >= 100 ? '#10b981' : 'linear-gradient(90deg, #f59e0b, #d97706)' }}></div>
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs font-semibold text-white">R$ {totalCurrentRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            <span className="text-xs" style={{ color: '#4b5563' }}>/ R$ {totalGoalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <input type="month" value={periodFilter} onChange={e => setPeriodFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
        {periodFilter && (
          <button onClick={() => setPeriodFilter('')}
            className="px-3 py-2.5 rounded-xl text-sm cursor-pointer whitespace-nowrap"
            style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>Limpar filtro</button>
        )}
        {/* View toggle */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#1a1f2e' }}>
          <button onClick={() => setViewMode('cards')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer whitespace-nowrap transition-all"
            style={viewMode === 'cards' ? { background: '#f59e0b', color: '#000' } : { color: '#6b7280' }}>
            <i className="ri-layout-grid-line"></i> Cards
          </button>
          <button onClick={() => setViewMode('ranking')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer whitespace-nowrap transition-all"
            style={viewMode === 'ranking' ? { background: '#f59e0b', color: '#000' } : { color: '#6b7280' }}>
            <i className="ri-trophy-line"></i> Ranking
          </button>
        </div>
        <div className="flex-1"></div>
        {goalsWithProgress.length > 0 && (
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap"
            style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
            <i className="ri-download-line"></i> Exportar CSV
          </button>
        )}
        {isAdmin && (
          <button onClick={openNew}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap"
            style={{ background: '#f59e0b', color: '#000' }}>
            <i className="ri-add-line"></i> Nova Meta
          </button>
        )}
      </div>

      {/* ── RANKING VIEW ── */}
      {viewMode === 'ranking' && (
        <div className="rounded-2xl overflow-hidden" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <p className="text-white font-semibold">Ranking de Vendedores</p>
            <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>Ordenado por faturamento atual</p>
          </div>
          {sellerRanking.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-white font-medium">Nenhum dado disponível</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              {sellerRanking.map((seller, i) => {
                const pct = seller.totalTarget > 0 ? Math.min((seller.totalRevenue / seller.totalTarget) * 100, 100) : 0;
                const maxRev = Math.max(...sellerRanking.map(s => s.totalRevenue), 1);
                return (
                  <div key={seller.name} className="px-5 py-4 flex items-center gap-4 transition-all"
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                    {/* Rank */}
                    <div className="w-10 h-10 flex items-center justify-center rounded-full flex-shrink-0 font-bold text-sm"
                      style={{ background: `${rankColors[i] ?? '#374151'}20`, color: rankColors[i] ?? '#6b7280' }}>
                      {i < 3 ? <i className={rankIcons[i]}></i> : `#${i + 1}`}
                    </div>
                    {/* Avatar */}
                    <div className="w-9 h-9 flex items-center justify-center rounded-full text-sm font-bold text-white flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                      {seller.name.charAt(0)}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-sm font-semibold text-white">{seller.name}</p>
                        <div className="flex items-center gap-4 flex-shrink-0">
                          <span className="text-xs" style={{ color: '#6b7280' }}>{seller.achieved}/{seller.goalsCount} metas</span>
                          <span className="text-xs font-bold" style={{ color: pct >= 100 ? '#10b981' : '#f59e0b' }}>{pct.toFixed(1)}%</span>
                          <span className="text-sm font-bold" style={{ color: '#10b981' }}>R$ {seller.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${(seller.totalRevenue / maxRev) * 100}%`, background: i === 0 ? 'linear-gradient(90deg, #f59e0b, #d97706)' : i === 1 ? '#9ca3af' : i === 2 ? '#cd7c2f' : '#374151' }}></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── CARDS VIEW ── */}
      {viewMode === 'cards' && (
        <>
          {goalsWithProgress.length === 0 ? (
            <div className="rounded-2xl flex flex-col items-center justify-center py-20 text-center" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="w-14 h-14 flex items-center justify-center rounded-2xl mb-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <i className="ri-flag-2-line text-3xl" style={{ color: '#4b5563' }}></i>
              </div>
              <p className="text-white font-medium">Nenhuma meta cadastrada</p>
              <p className="text-sm mt-1" style={{ color: '#6b7280' }}>Crie metas para motivar sua equipe de vendas</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {goalsWithProgress.map(g => {
                const revPct = g.targetRevenue > 0 ? Math.min((g.currentRevenue / g.targetRevenue) * 100, 100) : 0;
                const salesPct = g.targetSales > 0 ? Math.min((g.currentSales / g.targetSales) * 100, 100) : 0;
                const achieved = g.currentRevenue >= g.targetRevenue;
                const st = achieved ? STATUS_STYLE['Atingida'] : STATUS_STYLE['Em andamento'];
                return (
                  <div key={g.id} className="rounded-2xl p-5" style={{ background: '#1a1f2e', border: `1px solid ${achieved ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)'}` }}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 flex items-center justify-center rounded-full text-sm font-bold text-white flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                          {g.sellerName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-white font-semibold">{g.sellerName}</p>
                          <p className="text-xs" style={{ color: '#6b7280' }}>{g.period}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: st.bg, color: st.color }}>
                          {achieved ? 'Atingida' : 'Em andamento'}
                        </span>
                        {isAdmin && (
                          <>
                            <button onClick={() => openEdit(g)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer ml-1"
                              style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                              <i className="ri-edit-line text-xs"></i>
                            </button>
                            <button onClick={() => deleteSalesGoal(g.id)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer"
                              style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                              <i className="ri-delete-bin-line text-xs"></i>
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Revenue Progress */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs" style={{ color: '#6b7280' }}>Faturamento</span>
                        <span className="text-xs font-bold" style={{ color: revPct >= 100 ? '#10b981' : '#f59e0b' }}>{revPct.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${revPct}%`, background: revPct >= 100 ? '#10b981' : 'linear-gradient(90deg, #f59e0b, #d97706)' }}></div>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-xs font-semibold text-white">R$ {g.currentRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        <span className="text-xs" style={{ color: '#4b5563' }}>/ R$ {g.targetRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>

                    {/* Sales Count Progress */}
                    {g.targetSales > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs" style={{ color: '#6b7280' }}>Número de vendas</span>
                          <span className="text-xs font-bold" style={{ color: salesPct >= 100 ? '#10b981' : '#818cf8' }}>{salesPct.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          <div className="h-full rounded-full transition-all" style={{ width: `${salesPct}%`, background: salesPct >= 100 ? '#10b981' : '#818cf8' }}></div>
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-xs font-semibold text-white">{g.currentSales} vendas</span>
                          <span className="text-xs" style={{ color: '#4b5563' }}>/ {g.targetSales} meta</span>
                        </div>
                      </div>
                    )}

                    {achieved && (
                      <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                        <div className="w-4 h-4 flex items-center justify-center" style={{ color: '#10b981' }}>
                          <i className="ri-trophy-line text-sm"></i>
                        </div>
                        <span className="text-xs font-semibold" style={{ color: '#10b981' }}>Meta atingida! Parabéns!</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <p className="text-white font-bold">{editingId ? 'Editar Meta' : 'Nova Meta de Vendas'}</p>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer" style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>
                <i className="ri-close-line"></i>
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold mb-1 block uppercase tracking-wider" style={{ color: '#6b7280' }}>Vendedor *</label>
                <select value={form.sellerName} onChange={e => setForm(f => ({ ...f, sellerName: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none cursor-pointer"
                  style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }}>
                  <option value="">Selecionar vendedor</option>
                  {sellerNames.filter(Boolean).map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold mb-1 block uppercase tracking-wider" style={{ color: '#6b7280' }}>Período *</label>
                <input type="month" value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
              </div>
              <div>
                <label className="text-xs font-semibold mb-1 block uppercase tracking-wider" style={{ color: '#6b7280' }}>Meta de Faturamento (R$) *</label>
                <input type="number" min="0" step="100" value={form.targetRevenue}
                  onChange={e => setForm(f => ({ ...f, targetRevenue: Number(e.target.value) }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
              </div>
              <div>
                <label className="text-xs font-semibold mb-1 block uppercase tracking-wider" style={{ color: '#6b7280' }}>Meta de Número de Vendas</label>
                <input type="number" min="0" value={form.targetSales}
                  onChange={e => setForm(f => ({ ...f, targetSales: Number(e.target.value) }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
              </div>
            </div>
            <div className="px-6 py-4 border-t flex gap-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium cursor-pointer whitespace-nowrap"
                style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>Cancelar</button>
              <button onClick={handleSave} disabled={!form.sellerName || !form.period || form.targetRevenue <= 0}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap"
                style={{ background: form.sellerName && form.period && form.targetRevenue > 0 ? '#f59e0b' : 'rgba(255,255,255,0.06)', color: form.sellerName && form.period && form.targetRevenue > 0 ? '#000' : '#4b5563' }}>
                {editingId ? 'Salvar' : 'Criar Meta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ERPLayout>
  );
}
