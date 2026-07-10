import { useState, useMemo } from 'react';
import ERPLayout from '@/components/feature/ERPLayout';
import { useERP } from '@/hooks/useERPContext';
import type { Customer } from '@/types/erp';

const STATES = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

export default function ClientsPage() {
  const { customers, addCustomer, updateCustomer, deleteCustomer, sales } = useERP();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Todos');
  const [typeFilter, setTypeFilter] = useState('Todos');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Customer | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);
  const [toast, setToast] = useState('');
  const [form, setForm] = useState({
    type: 'PJ' as 'PF' | 'PJ',
    name: '', document: '', email: '', phone: '',
    address: '', city: '', state: 'SP',
    creditLimit: '', status: 'Adimplente' as 'Adimplente' | 'Inadimplente',
  });

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const filtered = useMemo(() => customers.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase())
      || c.document.includes(search)
      || c.email.toLowerCase().includes(search.toLowerCase())
      || c.phone.includes(search);
    const matchFilter = filter === 'Todos' || c.status === filter;
    const matchType = typeFilter === 'Todos' || c.type === typeFilter;
    return matchSearch && matchFilter && matchType;
  }), [customers, search, filter, typeFilter]);

  const openAdd = () => {
    setEditItem(null);
    setForm({ type: 'PJ', name: '', document: '', email: '', phone: '', address: '', city: '', state: 'SP', creditLimit: '', status: 'Adimplente' });
    setShowModal(true);
  };

  const openEdit = (c: Customer) => {
    setEditItem(c);
    setForm({ type: c.type, name: c.name, document: c.document, email: c.email, phone: c.phone, address: c.address || '', city: c.city, state: c.state, creditLimit: String(c.creditLimit), status: c.status });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.name || !form.document) return;
    const data = {
      type: form.type, name: form.name, document: form.document,
      email: form.email, phone: form.phone, address: form.address,
      city: form.city, state: form.state,
      creditLimit: parseFloat(form.creditLimit) || 0, status: form.status,
    };
    if (editItem) { updateCustomer(editItem.id, data); showToast('Cliente atualizado!'); }
    else { addCustomer(data); showToast('Cliente cadastrado!'); }
    setShowModal(false);
  };

  const exportCSV = () => {
    const header = 'Nome,Tipo,CPF/CNPJ,E-mail,Telefone,Cidade,UF,Limite Crédito,Total Compras,Status\n';
    const rows = filtered.map(c =>
      `"${c.name}",${c.type},"${c.document}","${c.email}","${c.phone}","${c.city}",${c.state},${c.creditLimit.toFixed(2)},${c.totalPurchases.toFixed(2)},${c.status}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `clientes_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exportado!');
  };

  // Histórico de compras do cliente selecionado
  const customerSales = useMemo(() => {
    if (!detailCustomer) return [];
    return sales.filter(s => s.customerId === detailCustomer.id || s.customerName === detailCustomer.name)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [detailCustomer, sales]);

  const totalCredit = customers.reduce((s, c) => s + c.creditLimit, 0);
  const totalDebt = customers.reduce((s, c) => s + c.balance, 0);

  return (
    <ERPLayout title="Clientes" subtitle="Cadastro, histórico de compras e controle de crédito">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total de Clientes', value: String(customers.length), icon: 'ri-user-3-line', color: '#10b981' },
          { label: 'Inadimplentes', value: String(customers.filter(c => c.status === 'Inadimplente').length), icon: 'ri-error-warning-line', color: '#ef4444' },
          { label: 'Limite de Crédito Total', value: `R$ ${totalCredit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: 'ri-bank-card-line', color: '#f59e0b' },
          { label: 'Saldo Devedor Total', value: `R$ ${totalDebt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: 'ri-money-dollar-circle-line', color: '#8b5cf6' },
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
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <div className="w-4 h-4 flex items-center justify-center absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#6b7280' }}>
              <i className="ri-search-line text-sm"></i>
            </div>
            <input type="text" placeholder="Buscar por nome, CPF/CNPJ, e-mail ou telefone..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-xl text-sm outline-none w-72"
              style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
          </div>
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#1a1f2e' }}>
            {['Todos', 'Adimplente', 'Inadimplente'].map((s) => (
              <button key={s} onClick={() => setFilter(s)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer whitespace-nowrap transition-all"
                style={filter === s ? { background: '#f59e0b', color: '#000' } : { color: '#6b7280' }}>{s}</button>
            ))}
          </div>
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#1a1f2e' }}>
            {['Todos', 'PF', 'PJ'].map((t) => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer whitespace-nowrap transition-all"
                style={typeFilter === t ? { background: '#f59e0b', color: '#000' } : { color: '#6b7280' }}>{t}</button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: '#6b7280' }}>{filtered.length} cliente{filtered.length !== 1 ? 's' : ''}</span>
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium cursor-pointer whitespace-nowrap"
            style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
            <i className="ri-download-line"></i> CSV
          </button>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap" style={{ background: '#f59e0b', color: '#000' }}>
            <i className="ri-user-add-line"></i> Novo Cliente
          </button>
        </div>
      </div>

      {/* Tabela */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}>
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-14 h-14 flex items-center justify-center rounded-2xl mx-auto mb-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <i className="ri-user-3-line text-3xl" style={{ color: '#4b5563' }}></i>
            </div>
            <p className="text-white font-medium">Nenhum cliente encontrado</p>
            <p className="text-sm mt-1" style={{ color: '#6b7280' }}>{customers.length === 0 ? 'Cadastre seu primeiro cliente' : 'Tente ajustar os filtros'}</p>
            {customers.length === 0 && <button onClick={openAdd} className="mt-4 px-5 py-2 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap" style={{ background: '#f59e0b', color: '#000' }}>Cadastrar cliente</button>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Cliente', 'Tipo', 'CPF/CNPJ', 'Contato', 'Cidade/UF', 'Limite Crédito', 'Total Compras', 'Última Compra', 'Status', 'Ações'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: '#4b5563' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="transition-all cursor-pointer" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                    onClick={() => setDetailCustomer(c)}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0"
                          style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>{c.name.slice(0, 2).toUpperCase()}</div>
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
                      <p className="text-xs" style={{ color: '#6b7280' }}>{c.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: '#9ca3af' }}>{c.city}/{c.state}</td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: '#d1d5db' }}>R$ {c.creditLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-sm font-bold whitespace-nowrap" style={{ color: '#10b981' }}>R$ {c.totalPurchases.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: '#6b7280' }}>{c.lastPurchase || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                        style={c.status === 'Adimplente' ? { background: 'rgba(16,185,129,0.12)', color: '#10b981' } : { background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(c)} className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer transition-all" style={{ color: '#6b7280' }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#f59e0b'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#6b7280'; }}>
                          <i className="ri-edit-line text-sm"></i>
                        </button>
                        <button onClick={() => setDeleteConfirm(c.id)} className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer transition-all" style={{ color: '#6b7280' }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#6b7280'; }}>
                          <i className="ri-delete-bin-line text-sm"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Detalhes do Cliente */}
      {detailCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}
          onClick={() => setDetailCustomer(null)}>
          <div className="rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)' }}
            onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0" style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#1a1f2e' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                  {detailCustomer.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-white font-bold">{detailCustomer.name}</h3>
                  <p className="text-xs" style={{ color: '#6b7280' }}>{detailCustomer.type} · {detailCustomer.document}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={detailCustomer.status === 'Adimplente' ? { background: 'rgba(16,185,129,0.12)', color: '#10b981' } : { background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                  {detailCustomer.status}
                </span>
                <button onClick={() => { openEdit(detailCustomer); setDetailCustomer(null); }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer"
                  style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                  <i className="ri-edit-line text-sm"></i>
                </button>
                <button onClick={() => setDetailCustomer(null)} className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer" style={{ color: '#6b7280' }}>
                  <i className="ri-close-line text-lg"></i>
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Info grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                {[
                  { label: 'E-mail', value: detailCustomer.email || '—' },
                  { label: 'Telefone', value: detailCustomer.phone || '—' },
                  { label: 'Cidade/UF', value: `${detailCustomer.city}/${detailCustomer.state}` },
                  { label: 'Endereço', value: detailCustomer.address || '—' },
                  { label: 'Limite de Crédito', value: `R$ ${detailCustomer.creditLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
                  { label: 'Total em Compras', value: `R$ ${detailCustomer.totalPurchases.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
                ].map((f) => (
                  <div key={f.label} className="p-3 rounded-xl" style={{ background: '#0f1117' }}>
                    <p className="text-xs mb-1" style={{ color: '#6b7280' }}>{f.label}</p>
                    <p className="text-sm font-medium text-white break-all">{f.value}</p>
                  </div>
                ))}
              </div>

              {/* Histórico de compras */}
              <div>
                <p className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: '#6b7280' }}>
                  Histórico de Compras ({customerSales.length})
                </p>
                {customerSales.length === 0 ? (
                  <div className="rounded-xl py-8 text-center" style={{ background: '#0f1117' }}>
                    <p className="text-sm" style={{ color: '#4b5563' }}>Nenhuma compra registrada para este cliente</p>
                  </div>
                ) : (
                  <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                    <table className="w-full">
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                          {['Data', 'Itens', 'Pagamento', 'Desconto', 'Total', 'Status'].map(h => (
                            <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: '#4b5563' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {customerSales.map((s) => (
                          <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            <td className="px-4 py-2.5 text-xs whitespace-nowrap" style={{ color: '#6b7280' }}>{s.createdAt}</td>
                            <td className="px-4 py-2.5 text-sm text-center" style={{ color: '#9ca3af' }}>{s.items.length}</td>
                            <td className="px-4 py-2.5 text-xs whitespace-nowrap" style={{ color: '#9ca3af' }}>{s.payment}</td>
                            <td className="px-4 py-2.5 text-xs whitespace-nowrap" style={{ color: s.discount > 0 ? '#ef4444' : '#4b5563' }}>
                              {s.discount > 0 ? `- R$ ${s.discount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                            </td>
                            <td className="px-4 py-2.5 text-sm font-bold whitespace-nowrap" style={{ color: '#10b981' }}>
                              R$ {s.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-2.5">
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                                style={s.status === 'Concluído' ? { background: 'rgba(16,185,129,0.12)', color: '#10b981' } : { background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                                {s.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ borderTop: '2px solid rgba(255,255,255,0.08)' }}>
                          <td colSpan={4} className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: '#6b7280' }}>
                            Total ({customerSales.length} compras)
                          </td>
                          <td className="px-4 py-2.5 text-sm font-bold whitespace-nowrap" style={{ color: '#f59e0b' }}>
                            R$ {customerSales.reduce((s, sale) => s + sale.total, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cadastro/Edição */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg">{editItem ? 'Editar Cliente' : 'Novo Cliente'}</h3>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer" style={{ color: '#6b7280' }}>
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: '#6b7280' }}>Tipo de Pessoa</label>
                <div className="flex gap-2">
                  {(['PF', 'PJ'] as const).map((t) => (
                    <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))}
                      className="flex-1 py-2 rounded-lg text-sm font-medium cursor-pointer whitespace-nowrap transition-all"
                      style={form.type === t ? { background: '#f59e0b', color: '#000' } : { background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#6b7280' }}>{t}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: '#6b7280' }}>Status</label>
                <select value={form.status} onChange={(e) => setForm(f => ({ ...f, status: e.target.value as 'Adimplente' | 'Inadimplente' }))}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none cursor-pointer"
                  style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }}>
                  <option>Adimplente</option><option>Inadimplente</option>
                </select>
              </div>
              {[
                { label: form.type === 'PJ' ? 'Razão Social *' : 'Nome Completo *', key: 'name', placeholder: 'Nome', full: true },
                { label: form.type === 'PJ' ? 'CNPJ *' : 'CPF *', key: 'document', placeholder: form.type === 'PJ' ? '00.000.000/0001-00' : '000.000.000-00' },
                { label: 'E-mail', key: 'email', placeholder: 'email@exemplo.com' },
                { label: 'Telefone', key: 'phone', placeholder: '(11) 99999-9999' },
                { label: 'Endereço', key: 'address', placeholder: 'Rua, número, bairro', full: true },
                { label: 'Cidade', key: 'city', placeholder: 'São Paulo' },
                { label: 'Limite de Crédito (R$)', key: 'creditLimit', placeholder: '0,00' },
              ].map((f) => (
                <div key={f.key} className={f.full ? 'col-span-2' : ''}>
                  <label className="text-xs font-medium block mb-1" style={{ color: '#6b7280' }}>{f.label}</label>
                  <input type="text" placeholder={f.placeholder} value={(form as Record<string, string>)[f.key]}
                    onChange={(e) => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
                </div>
              ))}
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: '#6b7280' }}>Estado</label>
                <select value={form.state} onChange={(e) => setForm(f => ({ ...f, state: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none cursor-pointer"
                  style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }}>
                  {STATES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium cursor-pointer whitespace-nowrap" style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>Cancelar</button>
              <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap" style={{ background: '#f59e0b', color: '#000' }}>
                {editItem ? 'Salvar Alterações' : 'Cadastrar Cliente'}
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
            <p className="text-white font-bold text-lg mb-1">Excluir cliente?</p>
            <p className="text-sm mb-5" style={{ color: '#6b7280' }}>Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium cursor-pointer whitespace-nowrap" style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>Cancelar</button>
              <button onClick={() => { deleteCustomer(deleteConfirm); setDeleteConfirm(null); showToast('Cliente excluído.'); }} className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap" style={{ background: '#ef4444', color: '#fff' }}>Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl" style={{ background: '#10b981', color: 'white' }}>
          <div className="w-5 h-5 flex items-center justify-center"><i className="ri-check-line"></i></div>
          <p className="text-sm font-semibold">{toast}</p>
        </div>
      )}
    </ERPLayout>
  );
}
