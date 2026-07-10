import { useState, useMemo } from 'react';
import ERPLayout from '@/components/feature/ERPLayout';
import { useERP } from '@/hooks/useERPContext';
import type { Commission } from '@/types/erp';

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  'Pendente':  { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
  'Aprovado':  { bg: 'rgba(99,102,241,0.15)',  color: '#818cf8' },
  'Pago':      { bg: 'rgba(16,185,129,0.15)',  color: '#10b981' },
};

const COMMISSION_RATES: Record<string, number> = {
  'Administrador': 0,
  'Gerente': 3,
  'Vendedor': 5,
  'Caixa': 2,
  'Estoquista': 0,
  'Contador': 0,
};

export default function CommissionsPage() {
  const { commissions, addCommission, updateCommission, sales, users, auth } = useERP();
  const [sellerFilter, setSellerFilter] = useState('Todos');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [periodFilter, setPeriodFilter] = useState('');
  const [showRateModal, setShowRateModal] = useState(false);
  const [rates, setRates] = useState<Record<string, number>>({ ...COMMISSION_RATES });
  const [showGenModal, setShowGenModal] = useState(false);
  const [genPeriod, setGenPeriod] = useState('');

  const sellers = useMemo(() => {
    const names = new Set(commissions.map(c => c.sellerName));
    return ['Todos', ...Array.from(names)];
  }, [commissions]);

  const filtered = useMemo(() => {
    return commissions.filter(c => {
      const matchSeller = sellerFilter === 'Todos' || c.sellerName === sellerFilter;
      const matchStatus = statusFilter === 'Todos' || c.status === statusFilter;
      const matchPeriod = !periodFilter || c.period === periodFilter;
      return matchSeller && matchStatus && matchPeriod;
    });
  }, [commissions, sellerFilter, statusFilter, periodFilter]);

  const totalPending = filtered.filter(c => c.status === 'Pendente').reduce((s, c) => s + c.value, 0);
  const totalApproved = filtered.filter(c => c.status === 'Aprovado').reduce((s, c) => s + c.value, 0);
  const totalPaid = filtered.filter(c => c.status === 'Pago').reduce((s, c) => s + c.value, 0);

  const handleGenerate = () => {
    if (!genPeriod) return;
    const periodSales = sales.filter(s => {
      if (s.status !== 'Concluído') return false;
      const parts = s.createdAt.split('/');
      if (parts.length < 3) return false;
      const month = `${parts[2]}-${parts[1]}`;
      return month === genPeriod;
    });

    const sellerMap: Record<string, { name: string; total: number; saleIds: string[] }> = {};
    periodSales.forEach(s => {
      if (!sellerMap[s.sellerId]) sellerMap[s.sellerId] = { name: s.sellerName, total: 0, saleIds: [] };
      sellerMap[s.sellerId].total += s.total;
      sellerMap[s.sellerId].saleIds.push(s.id);
    });

    Object.entries(sellerMap).forEach(([sellerId, data]) => {
      const user = users.find(u => u.id === sellerId);
      const role = user?.role || 'Vendedor';
      const rate = rates[role] || 5;
      if (rate === 0) return;
      const alreadyExists = commissions.some(c => c.sellerId === sellerId && c.period === genPeriod);
      if (alreadyExists) return;
      addCommission({
        sellerId,
        sellerName: data.name,
        saleId: data.saleIds[0],
        saleTotal: data.total,
        rate,
        value: (data.total * rate) / 100,
        status: 'Pendente',
        period: genPeriod,
      });
    });
    setShowGenModal(false);
    setGenPeriod('');
  };

  const handleApproveAll = () => {
    filtered.filter(c => c.status === 'Pendente').forEach(c => updateCommission(c.id, { status: 'Aprovado' }));
  };

  const handlePayAll = () => {
    filtered.filter(c => c.status === 'Aprovado').forEach(c => updateCommission(c.id, { status: 'Pago' }));
  };

  const exportCSV = () => {
    const header = 'Vendedor,Período,Faturamento,Taxa (%),Comissão,Status\n';
    const rows = filtered.map(c =>
      `"${c.sellerName}",${c.period},${c.saleTotal.toFixed(2)},${c.rate},${c.value.toFixed(2)},${c.status}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comissoes_${periodFilter || new Date().toISOString().slice(0, 7)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ERPLayout title="Comissões de Vendedores" subtitle="Controle e pagamento de comissões por período">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Pendente', value: `R$ ${totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: 'ri-time-line', color: '#f59e0b' },
          { label: 'Total Aprovado', value: `R$ ${totalApproved.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: 'ri-checkbox-circle-line', color: '#818cf8' },
          { label: 'Total Pago', value: `R$ ${totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: 'ri-money-dollar-circle-line', color: '#10b981' },
          { label: 'Registros', value: String(filtered.length), icon: 'ri-user-star-line', color: '#9ca3af' },
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

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <select value={sellerFilter} onChange={e => setSellerFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl text-sm outline-none cursor-pointer"
          style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }}>
          {sellers.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl text-sm outline-none cursor-pointer"
          style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }}>
          {['Todos', 'Pendente', 'Aprovado', 'Pago'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="month" value={periodFilter} onChange={e => setPeriodFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
        <div className="flex-1"></div>
        {auth.user?.role === 'Administrador' || auth.user?.role === 'Gerente' ? (
          <>
            <button onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap"
              style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
              <i className="ri-download-line"></i> Exportar CSV
            </button>
            <button onClick={() => setShowRateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.08)' }}>
              <i className="ri-percent-line"></i> Taxas
            </button>
            <button onClick={handleApproveAll}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap"
              style={{ background: 'rgba(129,140,248,0.15)', color: '#818cf8' }}>
              <i className="ri-checkbox-circle-line"></i> Aprovar Pendentes
            </button>
            <button onClick={handlePayAll}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap"
              style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
              <i className="ri-money-dollar-circle-line"></i> Pagar Aprovados
            </button>
            <button onClick={() => setShowGenModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap"
              style={{ background: '#f59e0b', color: '#000' }}>
              <i className="ri-add-line"></i> Gerar Comissões
            </button>
          </>
        ) : null}
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 flex items-center justify-center rounded-2xl mb-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <i className="ri-user-star-line text-3xl" style={{ color: '#4b5563' }}></i>
            </div>
            <p className="text-white font-medium">Nenhuma comissão encontrada</p>
            <p className="text-sm mt-1" style={{ color: '#6b7280' }}>Gere comissões a partir das vendas do período</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Vendedor', 'Período', 'Faturamento', 'Taxa', 'Comissão', 'Status', 'Ações'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: '#4b5563' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const st = STATUS_STYLE[c.status] || STATUS_STYLE['Pendente'];
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold text-white flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                            {c.sellerName.charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-white">{c.sellerName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm" style={{ color: '#9ca3af' }}>{c.period}</td>
                      <td className="px-5 py-3 text-sm font-semibold whitespace-nowrap" style={{ color: '#d1d5db' }}>
                        R$ {c.saleTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-sm font-bold px-2 py-0.5 rounded-lg" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>{c.rate}%</span>
                      </td>
                      <td className="px-5 py-3 text-base font-bold whitespace-nowrap" style={{ color: '#10b981' }}>
                        R$ {c.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: st.bg, color: st.color }}>{c.status}</span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          {c.status === 'Pendente' && (
                            <button onClick={() => updateCommission(c.id, { status: 'Aprovado' })}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap"
                              style={{ background: 'rgba(129,140,248,0.15)', color: '#818cf8' }}>Aprovar</button>
                          )}
                          {c.status === 'Aprovado' && (
                            <button onClick={() => updateCommission(c.id, { status: 'Pago' })}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap"
                              style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>Pagar</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Generate Modal */}
      {showGenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-sm rounded-2xl overflow-hidden" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <p className="text-white font-bold">Gerar Comissões</p>
              <button onClick={() => setShowGenModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer" style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>
                <i className="ri-close-line"></i>
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold mb-2 block uppercase tracking-wider" style={{ color: '#6b7280' }}>Período (mês/ano)</label>
                <input type="month" value={genPeriod} onChange={e => setGenPeriod(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
              </div>
              <p className="text-xs" style={{ color: '#6b7280' }}>
                As comissões serão calculadas automaticamente com base nas vendas concluídas do período selecionado e nas taxas configuradas por perfil.
              </p>
            </div>
            <div className="px-6 py-4 border-t flex gap-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <button onClick={() => setShowGenModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium cursor-pointer whitespace-nowrap"
                style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>Cancelar</button>
              <button onClick={handleGenerate} disabled={!genPeriod}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap"
                style={{ background: genPeriod ? '#f59e0b' : 'rgba(255,255,255,0.06)', color: genPeriod ? '#000' : '#4b5563' }}>
                Gerar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rates Modal */}
      {showRateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-sm rounded-2xl overflow-hidden" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <p className="text-white font-bold">Taxas de Comissão por Perfil</p>
              <button onClick={() => setShowRateModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer" style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>
                <i className="ri-close-line"></i>
              </button>
            </div>
            <div className="p-6 flex flex-col gap-3">
              {Object.entries(rates).map(([role, rate]) => (
                <div key={role} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-white">{role}</span>
                  <div className="flex items-center gap-2">
                    <input type="number" min="0" max="100" step="0.5" value={rate}
                      onChange={e => setRates(r => ({ ...r, [role]: Number(e.target.value) }))}
                      className="w-20 px-2 py-1.5 rounded-lg text-sm text-center outline-none"
                      style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
                    <span className="text-sm" style={{ color: '#6b7280' }}>%</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <button onClick={() => setShowRateModal(false)}
                className="w-full py-2.5 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap"
                style={{ background: '#f59e0b', color: '#000' }}>Salvar Taxas</button>
            </div>
          </div>
        </div>
      )}
    </ERPLayout>
  );
}
