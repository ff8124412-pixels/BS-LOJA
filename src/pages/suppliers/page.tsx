import { useState, useMemo } from 'react';
import ERPLayout from '@/components/feature/ERPLayout';
import { useERP } from '@/hooks/useERPContext';
import type { Supplier } from '@/types/erp';

const CATEGORIES = ['Cimentos', 'Ferragens', 'Cerâmica', 'Tintas', 'Hidráulica', 'Elétrica', 'Areia e Brita', 'Telhas', 'Outros'];
const STATES = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

export default function SuppliersPage() {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier } = useERP();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('Todos');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Supplier | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [form, setForm] = useState({
    name: '', document: '', email: '', phone: '',
    category: CATEGORIES[0], city: '', state: 'SP', status: 'Ativo' as 'Ativo' | 'Inativo',
  });

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const filtered = useMemo(() => suppliers.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.document.includes(search) || s.email.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'Todos' || s.category === catFilter;
    const matchStatus = statusFilter === 'Todos' || s.status === statusFilter;
    return matchSearch && matchCat && matchStatus;
  }), [suppliers, search, catFilter, statusFilter]);

  const openAdd = () => {
    setEditItem(null);
    setForm({ name: '', document: '', email: '', phone: '', category: CATEGORIES[0], city: '', state: 'SP', status: 'Ativo' });
    setShowModal(true);
  };

  const openEdit = (s: Supplier) => {
    setEditItem(s);
    setForm({ name: s.name, document: s.document, email: s.email, phone: s.phone, category: s.category, city: s.city, state: s.state, status: s.status });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.name || !form.document) return;
    if (editItem) { updateSupplier(editItem.id, form); showToast('Fornecedor atualizado!'); }
    else { addSupplier(form); showToast('Fornecedor cadastrado!'); }
    setShowModal(false);
  };

  const exportCSV = () => {
    const header = 'Razão Social,CNPJ,Categoria,E-mail,Telefone,Cidade,UF,Status\n';
    const rows = filtered.map(s =>
      `"${s.name}","${s.document}","${s.category}","${s.email}","${s.phone}","${s.city}",${s.state},${s.status}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `fornecedores_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exportado!');
  };

  return (
    <ERPLayout title="Fornecedores" subtitle="Cadastro de fornecedores e pedidos de compra">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total de Fornecedores', value: String(suppliers.length), icon: 'ri-store-2-line', color: '#8b5cf6' },
          { label: 'Fornecedores Ativos', value: String(suppliers.filter(s => s.status === 'Ativo').length), icon: 'ri-checkbox-circle-line', color: '#10b981' },
          { label: 'Inativos', value: String(suppliers.filter(s => s.status === 'Inativo').length), icon: 'ri-close-circle-line', color: '#6b7280' },
          { label: 'Total a Pagar', value: `R$ ${suppliers.reduce((s, sup) => s + sup.balance, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: 'ri-arrow-down-circle-line', color: '#ef4444' },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl p-4" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="w-9 h-9 flex items-center justify-center rounded-xl mb-3" style={{ background: `${c.color}20` }}>
              <i className={`${c.icon} text-base`} style={{ color: c.color }}></i>
            </div>
            <p className="text-white font-bold text-lg">{c.value}</p>
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
            <input type="text" placeholder="Buscar fornecedor, CNPJ ou e-mail..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-xl text-sm outline-none w-64"
              style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
          </div>
          {/* Categoria */}
          <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm outline-none cursor-pointer"
            style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }}>
            <option value="Todos">Todas categorias</option>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          {/* Status */}
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#1a1f2e' }}>
            {['Todos', 'Ativo', 'Inativo'].map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer whitespace-nowrap transition-all"
                style={statusFilter === s ? { background: '#f59e0b', color: '#000' } : { color: '#6b7280' }}>{s}</button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: '#6b7280' }}>{filtered.length} fornecedor{filtered.length !== 1 ? 'es' : ''}</span>
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium cursor-pointer whitespace-nowrap"
            style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
            <i className="ri-download-line"></i> CSV
          </button>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap" style={{ background: '#f59e0b', color: '#000' }}>
            <i className="ri-add-line"></i> Novo Fornecedor
          </button>
        </div>
      </div>

      {/* Tabela */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}>
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-14 h-14 flex items-center justify-center rounded-2xl mx-auto mb-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <i className="ri-store-2-line text-3xl" style={{ color: '#4b5563' }}></i>
            </div>
            <p className="text-white font-medium">Nenhum fornecedor encontrado</p>
            <p className="text-sm mt-1" style={{ color: '#6b7280' }}>
              {suppliers.length === 0 ? 'Cadastre seus fornecedores para controlar pedidos de compra' : 'Tente ajustar os filtros'}
            </p>
            {suppliers.length === 0 && <button onClick={openAdd} className="mt-4 px-5 py-2 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap" style={{ background: '#f59e0b', color: '#000' }}>Cadastrar fornecedor</button>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Fornecedor', 'CNPJ', 'Categoria', 'Contato', 'Cidade/UF', 'Saldo a Pagar', 'Status', 'Ações'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: '#4b5563' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="transition-all" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0" style={{ background: 'rgba(139,92,246,0.15)', color: '#8b5cf6' }}>{s.name.slice(0, 2).toUpperCase()}</div>
                        <p className="text-sm font-medium text-white whitespace-nowrap">{s.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: '#9ca3af' }}>{s.document}</td>
                    <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-md" style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>{s.category}</span></td>
                    <td className="px-4 py-3">
                      <p className="text-xs whitespace-nowrap" style={{ color: '#9ca3af' }}>{s.email}</p>
                      <p className="text-xs" style={{ color: '#6b7280' }}>{s.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: '#9ca3af' }}>{s.city}/{s.state}</td>
                    <td className="px-4 py-3 text-sm font-bold whitespace-nowrap" style={{ color: s.balance > 0 ? '#ef4444' : '#10b981' }}>R$ {s.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                        style={s.status === 'Ativo' ? { background: 'rgba(16,185,129,0.12)', color: '#10b981' } : { background: 'rgba(107,114,128,0.12)', color: '#6b7280' }}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(s)} className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer transition-all" style={{ color: '#6b7280' }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#f59e0b'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#6b7280'; }}>
                          <i className="ri-edit-line text-sm"></i>
                        </button>
                        <button onClick={() => setDeleteConfirm(s.id)} className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer transition-all" style={{ color: '#6b7280' }}
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="rounded-2xl p-6 w-full max-w-lg" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg">{editItem ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h3>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer" style={{ color: '#6b7280' }}>
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Razão Social *', key: 'name', placeholder: 'Nome da empresa', full: true },
                { label: 'CNPJ *', key: 'document', placeholder: '00.000.000/0001-00' },
                { label: 'E-mail', key: 'email', placeholder: 'email@fornecedor.com' },
                { label: 'Telefone', key: 'phone', placeholder: '(11) 3456-7890' },
                { label: 'Cidade', key: 'city', placeholder: 'São Paulo' },
              ].map((f) => (
                <div key={f.key} className={f.full ? 'col-span-2' : ''}>
                  <label className="text-xs font-medium block mb-1" style={{ color: '#6b7280' }}>{f.label}</label>
                  <input type="text" placeholder={f.placeholder} value={(form as Record<string, string>)[f.key]}
                    onChange={(e) => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
                </div>
              ))}
              {[
                { label: 'Estado', key: 'state', options: STATES },
                { label: 'Categoria', key: 'category', options: CATEGORIES },
                { label: 'Status', key: 'status', options: ['Ativo', 'Inativo'] },
              ].map((f) => (
                <div key={f.key}>
                  <label className="text-xs font-medium block mb-1" style={{ color: '#6b7280' }}>{f.label}</label>
                  <select value={(form as Record<string, string>)[f.key]} onChange={(e) => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none cursor-pointer"
                    style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }}>
                    {f.options.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium cursor-pointer whitespace-nowrap" style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>Cancelar</button>
              <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap" style={{ background: '#f59e0b', color: '#000' }}>
                {editItem ? 'Salvar Alterações' : 'Cadastrar Fornecedor'}
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
            <p className="text-white font-bold text-lg mb-1">Excluir fornecedor?</p>
            <p className="text-sm mb-5" style={{ color: '#6b7280' }}>Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium cursor-pointer whitespace-nowrap" style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>Cancelar</button>
              <button onClick={() => { deleteSupplier(deleteConfirm); setDeleteConfirm(null); showToast('Fornecedor excluído.'); }} className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap" style={{ background: '#ef4444', color: '#fff' }}>Excluir</button>
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
