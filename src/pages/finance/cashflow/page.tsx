import { useState, useMemo } from 'react';
import ERPLayout from '@/components/feature/ERPLayout';
import { useERP } from '@/hooks/useERPContext';
import type { FinancialEntry } from '@/types/erp';

const CATEGORIES_RECEITA = ['Vendas', 'Recebimento', 'Outros'];
const CATEGORIES_DESPESA = ['Fornecedor', 'Aluguel', 'Salários', 'Impostos', 'Serviços', 'Utilidades', 'Outros'];

interface ManualEntry {
  type: 'Receita' | 'Despesa';
  description: string;
  category: string;
  value: string;
  date: string;
}

const EMPTY_MANUAL: ManualEntry = {
  type: 'Receita',
  description: '',
  category: 'Outros',
  value: '',
  date: new Date().toISOString().slice(0, 10),
};

export default function CashFlowPage() {
  const { receivables, payables, sales, addReceivable, addPayable } = useERP();

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [typeFilter, setTypeFilter] = useState<'Todos' | 'Receita' | 'Despesa'>('Todos');
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualForm, setManualForm] = useState<ManualEntry>(EMPTY_MANUAL);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  // Parse date string dd/mm/yyyy or yyyy-mm-dd to comparable string
  const parseDate = (dateStr: string): string => {
    if (!dateStr) return '';
    if (dateStr.includes('/')) {
      const [d, m, y] = dateStr.split('/');
      return `${y}-${m}-${d}`;
    }
    return dateStr;
  };

  const allEntries = useMemo(() => {
    const entries: { id: string; date: string; dateSort: string; description: string; category: string; type: 'Receita' | 'Despesa'; value: number }[] = [];

    // Vendas concluídas
    sales.filter(s => s.status === 'Concluído').forEach(s => {
      entries.push({
        id: s.id,
        date: s.createdAt,
        dateSort: parseDate(s.createdAt),
        description: `Venda — ${s.customerName}`,
        category: 'Vendas',
        type: 'Receita',
        value: s.total,
      });
    });

    // Recebíveis pagos
    receivables.filter(r => r.status === 'Pago').forEach(r => {
      entries.push({
        id: r.id,
        date: r.paidAt || r.dueDate,
        dateSort: parseDate(r.paidAt || r.dueDate),
        description: r.description || r.entityName,
        category: r.category,
        type: 'Receita',
        value: r.value,
      });
    });

    // Pagáveis pagos
    payables.filter(p => p.status === 'Pago').forEach(p => {
      entries.push({
        id: p.id,
        date: p.paidAt || p.dueDate,
        dateSort: parseDate(p.paidAt || p.dueDate),
        description: p.description || p.entityName,
        category: p.category,
        type: 'Despesa',
        value: p.value,
      });
    });

    return entries.sort((a, b) => b.dateSort.localeCompare(a.dateSort));
  }, [sales, receivables, payables]);

  const filtered = useMemo(() => {
    return allEntries.filter(e => {
      const matchType = typeFilter === 'Todos' || e.type === typeFilter;
      const matchFrom = !dateFrom || e.dateSort >= dateFrom;
      const matchTo = !dateTo || e.dateSort <= dateTo;
      return matchType && matchFrom && matchTo;
    });
  }, [allEntries, typeFilter, dateFrom, dateTo]);

  const totalIncome = filtered.filter(e => e.type === 'Receita').reduce((s, e) => s + e.value, 0);
  const totalExpense = filtered.filter(e => e.type === 'Despesa').reduce((s, e) => s + e.value, 0);
  const balance = totalIncome - totalExpense;

  // Running balance (saldo acumulado)
  const entriesWithBalance = useMemo(() => {
    let running = 0;
    return [...filtered].reverse().map(e => {
      running += e.type === 'Receita' ? e.value : -e.value;
      return { ...e, runningBalance: running };
    }).reverse();
  }, [filtered]);

  const handleSaveManual = async () => {
    if (!manualForm.description || !manualForm.value || !manualForm.date) return;
    setSaving(true);
    try {
      const entry: Omit<FinancialEntry, 'id'> = {
        type: manualForm.type,
        category: manualForm.category,
        description: manualForm.description,
        value: parseFloat(manualForm.value.replace(',', '.')) || 0,
        dueDate: manualForm.date.split('-').reverse().join('/'),
        paidAt: manualForm.date.split('-').reverse().join('/'),
        status: 'Pago',
        entityName: manualForm.description,
      };
      if (manualForm.type === 'Receita') {
        await addReceivable(entry);
      } else {
        await addPayable(entry);
      }
      setShowManualModal(false);
      setManualForm(EMPTY_MANUAL);
      showToast('Lançamento registrado com sucesso!');
    } finally {
      setSaving(false);
    }
  };

  const exportCSV = () => {
    const header = 'Data,Descrição,Categoria,Tipo,Valor,Saldo Acumulado\n';
    const rows = entriesWithBalance.map(e =>
      `${e.date},"${e.description}","${e.category}",${e.type},${e.value.toFixed(2)},${e.runningBalance.toFixed(2)}`
    ).join('\n');
    const period = dateFrom && dateTo ? `_${dateFrom}_a_${dateTo}` : '';
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fluxo_caixa${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exportado!');
  };

  return (
    <ERPLayout title="Fluxo de Caixa" subtitle="Entradas, saídas e saldo do período">

      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total de Entradas', value: totalIncome, color: '#10b981', icon: 'ri-arrow-up-circle-line' },
          { label: 'Total de Saídas', value: totalExpense, color: '#ef4444', icon: 'ri-arrow-down-circle-line' },
          { label: 'Saldo do Período', value: balance, color: balance >= 0 ? '#10b981' : '#ef4444', icon: 'ri-scales-line' },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl p-5" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="w-10 h-10 flex items-center justify-center rounded-xl mb-3" style={{ background: `${c.color}20` }}>
              <i className={`${c.icon} text-lg`} style={{ color: c.color }}></i>
            </div>
            <p className="text-2xl font-bold" style={{ color: c.color }}>
              {balance < 0 && c.label === 'Saldo do Período' ? '-' : ''}R$ {Math.abs(c.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs mt-1" style={{ color: '#6b7280' }}>{c.label}</p>
          </div>
        ))}
      </div>

      {/* Filtros e ações */}
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Tipo */}
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#1a1f2e' }}>
            {(['Todos', 'Receita', 'Despesa'] as const).map((t) => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer whitespace-nowrap transition-all"
                style={typeFilter === t ? { background: '#f59e0b', color: '#000' } : { color: '#6b7280' }}>{t}</button>
            ))}
          </div>
          {/* Período */}
          <div className="flex items-center gap-2">
            <label className="text-xs whitespace-nowrap" style={{ color: '#6b7280' }}>De</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 rounded-xl text-sm outline-none cursor-pointer"
              style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
            <label className="text-xs whitespace-nowrap" style={{ color: '#6b7280' }}>Até</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 rounded-xl text-sm outline-none cursor-pointer"
              style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(''); setDateTo(''); }}
                className="text-xs px-2 py-1.5 rounded-lg cursor-pointer whitespace-nowrap"
                style={{ color: '#6b7280' }}>Limpar</button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: '#6b7280' }}>{filtered.length} lançamento{filtered.length !== 1 ? 's' : ''}</span>
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium cursor-pointer whitespace-nowrap"
            style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
            <i className="ri-download-line"></i> CSV
          </button>
          <button onClick={() => { setManualForm(EMPTY_MANUAL); setShowManualModal(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap"
            style={{ background: '#f59e0b', color: '#000' }}>
            <i className="ri-add-line"></i> Lançamento Manual
          </button>
        </div>
      </div>

      {/* Tabela */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}>
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-14 h-14 flex items-center justify-center rounded-2xl mx-auto mb-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <i className="ri-line-chart-line text-3xl" style={{ color: '#4b5563' }}></i>
            </div>
            <p className="text-white font-medium">Nenhum lançamento encontrado</p>
            <p className="text-sm mt-1" style={{ color: '#6b7280' }}>
              {allEntries.length === 0
                ? 'Os lançamentos aparecerão aqui conforme você registrar vendas e pagamentos'
                : 'Tente ajustar os filtros de data'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor', 'Saldo Acumulado'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: '#4b5563' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entriesWithBalance.map((e) => (
                  <tr key={e.id + e.date} className="transition-all" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                    onMouseEnter={(ev) => { (ev.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
                    onMouseLeave={(ev) => { (ev.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                    <td className="px-5 py-3 text-xs whitespace-nowrap" style={{ color: '#6b7280' }}>{e.date}</td>
                    <td className="px-5 py-3 text-sm text-white">{e.description}</td>
                    <td className="px-5 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-md" style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>{e.category}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                        style={e.type === 'Receita'
                          ? { background: 'rgba(16,185,129,0.12)', color: '#10b981' }
                          : { background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                        {e.type}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm font-bold whitespace-nowrap" style={{ color: e.type === 'Receita' ? '#10b981' : '#ef4444' }}>
                      {e.type === 'Receita' ? '+' : '-'}R$ {e.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3 text-sm font-bold whitespace-nowrap" style={{ color: e.runningBalance >= 0 ? '#10b981' : '#ef4444' }}>
                      R$ {e.runningBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid rgba(255,255,255,0.08)' }}>
                  <td colSpan={4} className="px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: '#6b7280' }}>
                    Total do período ({filtered.length} lançamentos)
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-bold" style={{ color: '#10b981' }}>+R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      <span className="text-xs font-bold" style={{ color: '#ef4444' }}>-R$ {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-base font-bold whitespace-nowrap" style={{ color: balance >= 0 ? '#10b981' : '#ef4444' }}>
                    R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Modal — Lançamento Manual */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="rounded-2xl p-6 w-full max-w-md" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg">Lançamento Manual</h3>
              <button onClick={() => setShowManualModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer" style={{ color: '#6b7280' }}>
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>

            {/* Tipo */}
            <div className="flex gap-2 mb-4">
              {(['Receita', 'Despesa'] as const).map((t) => (
                <button key={t} onClick={() => setManualForm(f => ({ ...f, type: t, category: t === 'Receita' ? 'Outros' : 'Outros' }))}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap transition-all"
                  style={manualForm.type === t
                    ? { background: t === 'Receita' ? '#10b981' : '#ef4444', color: '#fff' }
                    : { background: 'rgba(255,255,255,0.05)', color: '#6b7280', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <i className={`${t === 'Receita' ? 'ri-arrow-up-circle-line' : 'ri-arrow-down-circle-line'} mr-2`}></i>
                  {t}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: '#6b7280' }}>Descrição *</label>
                <input type="text" placeholder="Ex: Pagamento de aluguel, Recebimento de cliente..."
                  value={manualForm.description}
                  onChange={(e) => setManualForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                  style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: '#6b7280' }}>Valor (R$) *</label>
                  <input type="text" placeholder="0,00"
                    value={manualForm.value}
                    onChange={(e) => setManualForm(f => ({ ...f, value: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: '#6b7280' }}>Data *</label>
                  <input type="date"
                    value={manualForm.date}
                    onChange={(e) => setManualForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none cursor-pointer"
                    style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: '#6b7280' }}>Categoria</label>
                <select value={manualForm.category}
                  onChange={(e) => setManualForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none cursor-pointer"
                  style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }}>
                  {(manualForm.type === 'Receita' ? CATEGORIES_RECEITA : CATEGORIES_DESPESA).map(c => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowManualModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium cursor-pointer whitespace-nowrap"
                style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>Cancelar</button>
              <button onClick={handleSaveManual} disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap"
                style={{ background: saving ? 'rgba(245,158,11,0.5)' : '#f59e0b', color: '#000' }}>
                {saving ? 'Salvando...' : 'Registrar Lançamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl"
          style={{ background: '#10b981', color: 'white' }}>
          <div className="w-5 h-5 flex items-center justify-center">
            <i className="ri-check-line"></i>
          </div>
          <p className="text-sm font-semibold">{toast}</p>
        </div>
      )}
    </ERPLayout>
  );
}
