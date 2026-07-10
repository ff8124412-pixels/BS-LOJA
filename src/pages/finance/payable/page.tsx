import { useState, useMemo } from 'react';
import ERPLayout from '@/components/feature/ERPLayout';
import { useERP } from '@/hooks/useERPContext';
import type { FinancialEntry } from '@/types/erp';

const statusStyle: Record<string, { bg: string; color: string }> = {
  'A vencer': { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  'Vencido': { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
  'Pago': { bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
};

const CATEGORIES = ['Fornecedor', 'Aluguel', 'Salários', 'Impostos', 'Serviços', 'Utilidades', 'Outros'];
const EMPTY_FORM = { entityName: '', value: '', dueDate: '', category: 'Fornecedor', description: '' };

const parseDate = (dateStr: string): string => {
  if (!dateStr) return '';
  if (dateStr.includes('/')) {
    const [d, m, y] = dateStr.split('/');
    return `${y}-${m}-${d}`;
  }
  return dateStr;
};

export default function PayablePage() {
  const { payables, addPayable, updatePayable, deletePayable } = useERP();
  const [filter, setFilter] = useState('Todos');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<FinancialEntry | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const filtered = useMemo(() => {
    return payables.filter(p => {
      const matchStatus = filter === 'Todos' || p.status === filter;
      const matchSearch = !search || p.entityName.toLowerCase().includes(search.toLowerCase()) || (p.description || '').toLowerCase().includes(search.toLowerCase());
      const dateSort = parseDate(p.dueDate);
      const matchFrom = !dateFrom || dateSort >= dateFrom;
      const matchTo = !dateTo || dateSort <= dateTo;
      return matchStatus && matchSearch && matchFrom && matchTo;
    });
  }, [payables, filter, search, dateFrom, dateTo]);

  const totalAVencer = payables.filter(p => p.status === 'A vencer').reduce((s, p) => s + p.value, 0);
  const totalVencido = payables.filter(p => p.status === 'Vencido').reduce((s, p) => s + p.value, 0);
  const totalPago = payables.filter(p => p.status === 'Pago').reduce((s, p) => s + p.value, 0);

  const openAdd = () => { setEditItem(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = (p: FinancialEntry) => {
    setEditItem(p);
    setForm({ entityName: p.entityName, value: String(p.value), dueDate: p.dueDate, category: p.category, description: p.description });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.entityName || !form.value || !form.dueDate) return;
    if (editItem) {
      updatePayable(editItem.id, {
        entityName: form.entityName,
        value: parseFloat(form.value),
        dueDate: form.dueDate,
        category: form.category,
        description: form.description,
      });
      showToast('Conta atualizada!');
    } else {
      addPayable({
        type: 'Despesa',
        category: form.category,
        description: form.description,
        value: parseFloat(form.value),
        dueDate: form.dueDate,
        status: 'A vencer',
        entityName: form.entityName,
      });
      showToast('Conta adicionada!');
    }
    setShowModal(false);
    setForm(EMPTY_FORM);
  };

  const exportCSV = () => {
    const header = 'Fornecedor/Credor,Categoria,Descrição,Valor,Vencimento,Status\n';
    const rows = filtered.map(p =>
      `"${p.entityName}","${p.category}","${p.description || ''}",${p.value.toFixed(2)},${p.dueDate},${p.status}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contas_pagar_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exportado!');
  };

  return (
    <ERPLayout title="Contas a Pagar" subtitle="Controle de pagamentos e obrigações financeiras">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'A Vencer', value: totalAVencer, color: '#f59e0b', icon: 'ri-time-line', count: payables.filter(p => p.status === 'A vencer').length },
          { label: 'Vencido', value: totalVencido, color: '#ef4444', icon: 'ri-error-warning-line', count: payables.filter(p => p.status === 'Vencido').length },
          { label: 'Pago', value: totalPago, color: '#10b981', icon: 'ri-check-double-line', count: payables.filter(p => p.status === 'Pago').length },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl p-5" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 flex items-center justify-center rounded-xl" style={{ background: `${c.color}20` }}>
                <i className={`${c.icon} text-lg`} style={{ color: c.color }}></i>
              </div>
              <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: `${c.color}15`, color: c.color }}>{c.count} títulos</span>
            </div>
            <p className="text-2xl font-bold text-white">R$ {c.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            <p className="text-xs mt-1" style={{ color: '#6b7280' }}>{c.label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#1a1f2e' }}>
            {['Todos', 'A vencer', 'Vencido', 'Pago'].map((s) => (
              <button key={s} onClick={() => setFilter(s)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer whitespace-nowrap transition-all"
                style={filter === s ? { background: '#f59e0b', color: '#000' } : { color: '#6b7280' }}>{s}</button>
            ))}
          </div>
          {/* Busca */}
          <div className="relative">
            <div className="w-4 h-4 flex items-center justify-center absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#6b7280' }}>
              <i className="ri-search-line text-sm"></i>
            </div>
            <input type="text" placeholder="Buscar fornecedor..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-xl text-sm outline-none w-44"
              style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
          </div>
          {/* Período */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs whitespace-nowrap" style={{ color: '#6b7280' }}>De</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="px-2 py-2 rounded-xl text-sm outline-none cursor-pointer"
              style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
            <label className="text-xs whitespace-nowrap" style={{ color: '#6b7280' }}>Até</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="px-2 py-2 rounded-xl text-sm outline-none cursor-pointer"
              style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(''); setDateTo(''); }}
                className="text-xs px-2 py-1.5 rounded-lg cursor-pointer" style={{ color: '#6b7280' }}>✕</button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: '#6b7280' }}>{filtered.length} conta{filtered.length !== 1 ? 's' : ''}</span>
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium cursor-pointer whitespace-nowrap"
            style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
            <i className="ri-download-line"></i> CSV
          </button>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap" style={{ background: '#f59e0b', color: '#000' }}>
            <i className="ri-add-line"></i> Nova Conta
          </button>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}>
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-14 h-14 flex items-center justify-center rounded-2xl mx-auto mb-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <i className="ri-arrow-down-circle-line text-3xl" style={{ color: '#4b5563' }}></i>
            </div>
            <p className="text-white font-medium">Nenhuma conta a pagar</p>
            <p className="text-sm mt-1" style={{ color: '#6b7280' }}>
              {payables.length === 0 ? 'Registre suas obrigações financeiras' : 'Tente ajustar os filtros'}
            </p>
            {payables.length === 0 && (
              <button onClick={openAdd} className="mt-4 px-5 py-2 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap" style={{ background: '#f59e0b', color: '#000' }}>
                Adicionar conta
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['#', 'Fornecedor / Credor', 'Categoria', 'Valor', 'Vencimento', 'Status', 'Ações'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: '#4b5563' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => {
                  const st = statusStyle[p.status] || { bg: 'rgba(107,114,128,0.12)', color: '#6b7280' };
                  return (
                    <tr key={p.id} className="transition-all" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                      <td className="px-5 py-3 text-xs" style={{ color: '#4b5563' }}>{String(i + 1).padStart(3, '0')}</td>
                      <td className="px-5 py-3 text-sm font-medium text-white">{p.entityName}</td>
                      <td className="px-5 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-md" style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>{p.category}</span>
                      </td>
                      <td className="px-5 py-3 text-sm font-bold whitespace-nowrap" style={{ color: '#ef4444' }}>R$ {p.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="px-5 py-3 text-xs whitespace-nowrap" style={{ color: p.status === 'Vencido' ? '#ef4444' : '#6b7280' }}>{p.dueDate}</td>
                      <td className="px-5 py-3">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: st.bg, color: st.color }}>{p.status}</span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          {p.status !== 'Pago' && (
                            <button onClick={() => { updatePayable(p.id, { status: 'Pago', paidAt: new Date().toLocaleDateString('pt-BR') }); showToast('Marcado como pago!'); }}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs cursor-pointer whitespace-nowrap"
                              style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                              <i className="ri-money-dollar-circle-line"></i> Pagar
                            </button>
                          )}
                          <button onClick={() => openEdit(p)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer transition-all" style={{ color: '#6b7280' }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#f59e0b'; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#6b7280'; }}>
                            <i className="ri-edit-line text-sm"></i>
                          </button>
                          <button onClick={() => setDeleteConfirm(p.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer transition-all" style={{ color: '#6b7280' }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#6b7280'; }}>
                            <i className="ri-delete-bin-line text-sm"></i>
                          </button>
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="rounded-2xl p-6 w-full max-w-md" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg">{editItem ? 'Editar Conta' : 'Nova Conta a Pagar'}</h3>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer" style={{ color: '#6b7280' }}>
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {[
                { label: 'Fornecedor / Credor *', key: 'entityName', placeholder: 'Nome', type: 'text' },
                { label: 'Valor (R$) *', key: 'value', placeholder: '0,00', type: 'number' },
                { label: 'Data de Vencimento *', key: 'dueDate', placeholder: '', type: 'date' },
                { label: 'Descrição', key: 'description', placeholder: 'Referente a...', type: 'text' },
              ].map((f) => (
                <div key={f.key}>
                  <label className="text-xs font-medium block mb-1" style={{ color: '#6b7280' }}>{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder} value={(form as Record<string, string>)[f.key]}
                    onChange={(e) => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
                </div>
              ))}
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: '#6b7280' }}>Categoria</label>
                <select value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none cursor-pointer"
                  style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium cursor-pointer whitespace-nowrap" style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>Cancelar</button>
              <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap" style={{ background: '#f59e0b', color: '#000' }}>
                {editItem ? 'Salvar Alterações' : 'Adicionar Conta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="rounded-2xl p-6 w-full max-w-sm text-center" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="w-12 h-12 flex items-center justify-center rounded-2xl mx-auto mb-4" style={{ background: 'rgba(239,68,68,0.12)' }}>
              <i className="ri-delete-bin-line text-2xl" style={{ color: '#ef4444' }}></i>
            </div>
            <p className="text-white font-bold text-lg mb-1">Excluir conta?</p>
            <p className="text-sm mb-5" style={{ color: '#6b7280' }}>Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium cursor-pointer whitespace-nowrap" style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>Cancelar</button>
              <button onClick={() => { deletePayable(deleteConfirm); setDeleteConfirm(null); showToast('Conta excluída.'); }} className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap" style={{ background: '#ef4444', color: '#fff' }}>Excluir</button>
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
