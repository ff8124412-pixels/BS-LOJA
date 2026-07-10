import { useState } from 'react';
import ERPLayout from '@/components/feature/ERPLayout';
import { customers } from '@/mocks/customers';

const statusStyle: Record<string, { bg: string; color: string }> = {
  'Adimplente': { bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
  'Inadimplente': { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
};

export default function ClientsPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Todos');
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<typeof customers[0] | null>(null);

  const filtered = customers.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.document.includes(search);
    const matchFilter = filter === 'Todos' || c.status === filter;
    return matchSearch && matchFilter;
  });

  const totalCredit = customers.reduce((s, c) => s + c.creditLimit, 0);
  const totalDebt = customers.reduce((s, c) => s + c.balance, 0);
  const totalPurchases = customers.reduce((s, c) => s + c.totalPurchases, 0);

  return (
    <ERPLayout title="Clientes" subtitle="Cadastro, histórico de compras e controle de crédito">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total de Clientes', value: String(customers.length), icon: 'ri-user-3-line', color: '#10b981' },
          { label: 'Inadimplentes', value: String(customers.filter(c => c.status === 'Inadimplente').length), icon: 'ri-error-warning-line', color: '#ef4444' },
          { label: 'Limite de Crédito Total', value: `R$ ${totalCredit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: 'ri-bank-card-line', color: '#f59e0b' },
          { label: 'Total em Compras', value: `R$ ${totalPurchases.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: 'ri-shopping-bag-line', color: '#8b5cf6' },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl p-4" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="w-9 h-9 flex items-center justify-center rounded-xl mb-3" style={{ background: `${c.color}20` }}>
              <i className={`${c.icon} text-base`} style={{ color: c.color }}></i>
            </div>
            <p className="text-white font-bold text-lg leading-tight">{c.value}</p>
            <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{c.label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-4 h-4 flex items-center justify-center absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#6b7280' }}>
              <i className="ri-search-line text-sm"></i>
            </div>
            <input type="text" placeholder="Buscar por nome ou CPF/CNPJ..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-xl text-sm outline-none w-72"
              style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
          </div>
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#1a1f2e' }}>
            {['Todos', 'Adimplente', 'Inadimplente'].map((s) => (
              <button key={s} onClick={() => setFilter(s)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer whitespace-nowrap transition-all"
                style={filter === s ? { background: '#f59e0b', color: '#000' } : { color: '#6b7280' }}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap"
          style={{ background: '#f59e0b', color: '#000' }}>
          <i className="ri-user-add-line"></i> Novo Cliente
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Cliente', 'Tipo', 'CPF / CNPJ', 'Contato', 'Cidade', 'Limite de Crédito', 'Saldo Devedor', 'Total Compras', 'Último Pedido', 'Status', 'Ações'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: '#4b5563' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const st = statusStyle[c.status] || { bg: 'rgba(107,114,128,0.12)', color: '#6b7280' };
                return (
                  <tr key={c.id} className="transition-all cursor-pointer" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0"
                          style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>{c.avatar}</div>
                        <p className="text-sm font-medium text-white whitespace-nowrap">{c.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-md font-medium"
                        style={c.type === 'PJ' ? { background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' } : { background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                        {c.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: '#9ca3af' }}>{c.document}</td>
                    <td className="px-4 py-3">
                      <p className="text-xs whitespace-nowrap" style={{ color: '#9ca3af' }}>{c.email}</p>
                      <p className="text-xs whitespace-nowrap" style={{ color: '#6b7280' }}>{c.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: '#9ca3af' }}>{c.city}/{c.state}</td>
                    <td className="px-4 py-3 text-sm font-medium whitespace-nowrap" style={{ color: '#d1d5db' }}>
                      R$ {c.creditLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold whitespace-nowrap" style={{ color: c.balance > 0 ? '#ef4444' : '#10b981' }}>
                      R$ {c.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium whitespace-nowrap" style={{ color: '#10b981' }}>
                      R$ {c.totalPurchases.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: '#6b7280' }}>{c.lastPurchase}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: st.bg, color: st.color }}>{c.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {[{ icon: 'ri-eye-line', color: '#9ca3af' }, { icon: 'ri-edit-line', color: '#f59e0b' }, { icon: 'ri-history-line', color: '#9ca3af' }].map((btn) => (
                          <button key={btn.icon} className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer transition-all" style={{ color: '#6b7280' }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = btn.color; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#6b7280'; }}>
                            <i className={`${btn.icon} text-sm`}></i>
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="rounded-2xl p-6 w-full max-w-lg mx-4" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg">Novo Cliente</h3>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer" style={{ color: '#6b7280' }}>
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Tipo de Pessoa', type: 'select', options: ['PF - Pessoa Física', 'PJ - Pessoa Jurídica'] },
                { label: 'CPF / CNPJ', type: 'text', placeholder: '000.000.000-00' },
                { label: 'Nome / Razão Social', type: 'text', placeholder: 'Nome completo', full: true },
                { label: 'E-mail', type: 'email', placeholder: 'email@exemplo.com' },
                { label: 'Telefone', type: 'text', placeholder: '(11) 99999-9999' },
                { label: 'Cidade', type: 'text', placeholder: 'São Paulo' },
                { label: 'Estado', type: 'text', placeholder: 'SP' },
                { label: 'Limite de Crédito (R$)', type: 'number', placeholder: '0,00' },
              ].map((f) => (
                <div key={f.label} className={f.full ? 'col-span-2' : ''}>
                  <label className="text-xs font-medium block mb-1" style={{ color: '#6b7280' }}>{f.label}</label>
                  {f.type === 'select' ? (
                    <select className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }}>
                      {f.options?.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input type={f.type} placeholder={f.placeholder} className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                      style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium cursor-pointer whitespace-nowrap" style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>Cancelar</button>
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap" style={{ background: '#f59e0b', color: '#000' }}>Salvar Cliente</button>
            </div>
          </div>
        </div>
      )}
    </ERPLayout>
  );
}
