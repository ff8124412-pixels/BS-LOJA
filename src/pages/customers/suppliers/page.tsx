import { useState } from 'react';
import ERPLayout from '@/components/feature/ERPLayout';
import { suppliers, purchaseOrders } from '@/mocks/customers';

const statusStyle: Record<string, { bg: string; color: string }> = {
  'Ativo': { bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
  'Inativo': { bg: 'rgba(107,114,128,0.12)', color: '#6b7280' },
};

const poStatus: Record<string, { bg: string; color: string }> = {
  'Recebido': { bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
  'Em trânsito': { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  'Pendente': { bg: 'rgba(99,102,241,0.12)', color: '#818cf8' },
};

export default function SuppliersPage() {
  const [tab, setTab] = useState<'suppliers' | 'orders'>('suppliers');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  const filtered = suppliers.filter(
    (s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.document.includes(search)
  );

  const totalPayable = suppliers.reduce((s, sup) => s + sup.balance, 0);

  return (
    <ERPLayout title="Fornecedores" subtitle="Cadastro de fornecedores e pedidos de compra">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total de Fornecedores', value: String(suppliers.length), icon: 'ri-store-2-line', color: '#8b5cf6' },
          { label: 'Fornecedores Ativos', value: String(suppliers.filter(s => s.status === 'Ativo').length), icon: 'ri-checkbox-circle-line', color: '#10b981' },
          { label: 'Total a Pagar', value: `R$ ${totalPayable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: 'ri-arrow-down-circle-line', color: '#ef4444' },
          { label: 'Pedidos de Compra', value: String(purchaseOrders.length), icon: 'ri-shopping-bag-line', color: '#f59e0b' },
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

      {/* Tabs */}
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#1a1f2e' }}>
          {[{ key: 'suppliers', label: 'Fornecedores' }, { key: 'orders', label: 'Pedidos de Compra' }].map((t) => (
            <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
              className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer whitespace-nowrap transition-all"
              style={tab === t.key ? { background: '#f59e0b', color: '#000' } : { color: '#6b7280' }}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {tab === 'suppliers' && (
            <div className="relative">
              <div className="w-4 h-4 flex items-center justify-center absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#6b7280' }}>
                <i className="ri-search-line text-sm"></i>
              </div>
              <input type="text" placeholder="Buscar fornecedor..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-xl text-sm outline-none w-60"
                style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
            </div>
          )}
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap"
            style={{ background: '#f59e0b', color: '#000' }}>
            <i className="ri-add-line"></i>
            {tab === 'suppliers' ? 'Novo Fornecedor' : 'Novo Pedido'}
          </button>
        </div>
      </div>

      {/* Suppliers Table */}
      {tab === 'suppliers' && (
        <div className="rounded-2xl overflow-hidden" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Fornecedor', 'CNPJ', 'Categoria', 'Contato', 'Cidade', 'Saldo a Pagar', 'Último Pedido', 'Status', 'Ações'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: '#4b5563' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  const st = statusStyle[s.status] || { bg: 'rgba(107,114,128,0.12)', color: '#6b7280' };
                  return (
                    <tr key={s.id} className="transition-all cursor-pointer" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0"
                            style={{ background: 'rgba(139,92,246,0.15)', color: '#8b5cf6' }}>{s.avatar}</div>
                          <p className="text-sm font-medium text-white whitespace-nowrap">{s.name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: '#9ca3af' }}>{s.document}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-md" style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>{s.category}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs whitespace-nowrap" style={{ color: '#9ca3af' }}>{s.email}</p>
                        <p className="text-xs whitespace-nowrap" style={{ color: '#6b7280' }}>{s.phone}</p>
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: '#9ca3af' }}>{s.city}/{s.state}</td>
                      <td className="px-4 py-3 text-sm font-bold whitespace-nowrap" style={{ color: '#ef4444' }}>
                        R$ {s.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: '#6b7280' }}>{s.lastOrder}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: st.bg, color: st.color }}>{s.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {[{ icon: 'ri-eye-line' }, { icon: 'ri-edit-line' }, { icon: 'ri-shopping-bag-line' }].map((btn, idx) => (
                            <button key={btn.icon} className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer transition-all" style={{ color: '#6b7280' }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = idx === 2 ? '#f59e0b' : '#9ca3af'; }}
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
      )}

      {/* Purchase Orders */}
      {tab === 'orders' && (
        <div className="rounded-2xl overflow-hidden" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Pedido', 'Fornecedor', 'Data', 'Itens', 'Total', 'Status', 'Ações'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: '#4b5563' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.map((o) => {
                  const st = poStatus[o.status] || { bg: 'rgba(107,114,128,0.12)', color: '#6b7280' };
                  return (
                    <tr key={o.id} className="transition-all" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                      <td className="px-5 py-3 text-sm font-semibold" style={{ color: '#f59e0b' }}>{o.id}</td>
                      <td className="px-5 py-3 text-sm text-white">{o.supplier}</td>
                      <td className="px-5 py-3 text-xs whitespace-nowrap" style={{ color: '#6b7280' }}>{o.date}</td>
                      <td className="px-5 py-3 text-sm text-center" style={{ color: '#9ca3af' }}>{o.items}</td>
                      <td className="px-5 py-3 text-sm font-bold whitespace-nowrap" style={{ color: '#10b981' }}>
                        R$ {o.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: st.bg, color: st.color }}>{o.status}</span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1">
                          {['ri-eye-line', 'ri-edit-line', 'ri-download-line'].map((icon) => (
                            <button key={icon} className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer transition-all" style={{ color: '#6b7280' }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#f59e0b'; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#6b7280'; }}>
                              <i className={`${icon} text-sm`}></i>
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
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="rounded-2xl p-6 w-full max-w-lg mx-4" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg">{tab === 'suppliers' ? 'Novo Fornecedor' : 'Novo Pedido de Compra'}</h3>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer" style={{ color: '#6b7280' }}>
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Razão Social', type: 'text', placeholder: 'Nome da empresa', full: true },
                { label: 'CNPJ', type: 'text', placeholder: '00.000.000/0001-00' },
                { label: 'Categoria', type: 'select', options: ['Cimentos', 'Ferragens', 'Cerâmica', 'Tintas', 'Hidráulica', 'Elétrica', 'Outros'] },
                { label: 'E-mail', type: 'email', placeholder: 'email@fornecedor.com' },
                { label: 'Telefone', type: 'text', placeholder: '(11) 3456-7890' },
                { label: 'Cidade', type: 'text', placeholder: 'São Paulo' },
                { label: 'Estado', type: 'text', placeholder: 'SP' },
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
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap" style={{ background: '#f59e0b', color: '#000' }}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </ERPLayout>
  );
}
