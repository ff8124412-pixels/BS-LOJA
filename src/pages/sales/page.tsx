import { useState, useMemo } from 'react';
import ERPLayout from '@/components/feature/ERPLayout';
import { useERP } from '@/hooks/useERPContext';
import type { Sale } from '@/types/erp';
import PrintReceipt from '@/components/feature/PrintReceipt';

const statusStyle: Record<string, { bg: string; color: string }> = {
  'Concluído': { bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
  'Pendente': { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  'Em andamento': { bg: 'rgba(99,102,241,0.12)', color: '#818cf8' },
  'Cancelado': { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
};

export default function SalesPage() {
  const { sales, updateSale, users } = useERP();
  const [filter, setFilter] = useState('Todos');
  const [search, setSearch] = useState('');
  const [sellerFilter, setSellerFilter] = useState('Todos');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [viewSale, setViewSale] = useState<Sale | null>(null);
  const [printSale, setPrintSale] = useState<Sale | null>(null);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const sellers = useMemo(() => {
    const names = new Set(sales.map(s => s.sellerName));
    return ['Todos', ...Array.from(names)];
  }, [sales]);

  const parseDate = (str: string) => {
    const parts = str.split('/');
    if (parts.length !== 3) return null;
    return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
  };

  const filtered = useMemo(() => sales.filter((s) => {
    const matchFilter = filter === 'Todos' || s.status === filter;
    const matchSearch = s.customerName.toLowerCase().includes(search.toLowerCase())
      || s.id.includes(search)
      || s.sellerName.toLowerCase().includes(search.toLowerCase());
    const matchSeller = sellerFilter === 'Todos' || s.sellerName === sellerFilter;
    let matchDate = true;
    const saleDate = parseDate(s.createdAt);
    if (saleDate) {
      if (dateFrom) {
        const from = new Date(dateFrom + 'T00:00:00');
        if (saleDate < from) matchDate = false;
      }
      if (dateTo && matchDate) {
        const to = new Date(dateTo + 'T23:59:59');
        if (saleDate > to) matchDate = false;
      }
    }
    return matchFilter && matchSearch && matchSeller && matchDate;
  }), [sales, filter, search, sellerFilter, dateFrom, dateTo]);

  const totalMonth = filtered.filter(s => s.status === 'Concluído').reduce((s, sale) => s + sale.total, 0);
  const avgTicket = filtered.filter(s => s.status === 'Concluído').length > 0
    ? totalMonth / filtered.filter(s => s.status === 'Concluído').length : 0;

  const exportCSV = () => {
    const header = 'ID,Data,Cliente,Vendedor,Itens,Pagamento,Desconto,Total,Status\n';
    const rows = filtered.map(s =>
      `${s.id},${s.createdAt},"${s.customerName}","${s.sellerName}",${s.items.length},${s.payment},${s.discount.toFixed(2)},${s.total.toFixed(2)},${s.status}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vendas_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exportado com sucesso!');
  };

  const clearFilters = () => { setDateFrom(''); setDateTo(''); setSellerFilter('Todos'); setFilter('Todos'); setSearch(''); };
  const hasFilters = dateFrom || dateTo || sellerFilter !== 'Todos' || filter !== 'Todos' || search;

  return (
    <ERPLayout title="Vendas & Pedidos" subtitle="Histórico completo de vendas e gestão de pedidos">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Faturamento Filtrado', value: `R$ ${totalMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: 'ri-money-dollar-circle-line', color: '#10b981' },
          { label: 'Total de Vendas', value: String(filtered.filter(s => s.status === 'Concluído').length), icon: 'ri-file-list-3-line', color: '#f59e0b' },
          { label: 'Ticket Médio', value: `R$ ${avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: 'ri-bar-chart-line', color: '#8b5cf6' },
          { label: 'Cancelamentos', value: String(filtered.filter(s => s.status === 'Cancelado').length), icon: 'ri-close-circle-line', color: '#ef4444' },
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
      <div className="flex flex-col gap-3 mb-5">
        {/* Linha 1: Status + Busca */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#1a1f2e' }}>
            {['Todos', 'Concluído', 'Pendente', 'Em andamento', 'Cancelado'].map((s) => (
              <button key={s} onClick={() => setFilter(s)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer whitespace-nowrap transition-all"
                style={filter === s ? { background: '#f59e0b', color: '#000' } : { color: '#6b7280' }}>
                {s}
              </button>
            ))}
          </div>
          <div className="relative">
            <div className="w-4 h-4 flex items-center justify-center absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#6b7280' }}>
              <i className="ri-search-line text-sm"></i>
            </div>
            <input type="text" placeholder="Buscar cliente, vendedor ou ID..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-xl text-sm outline-none w-56"
              style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
          </div>
        </div>

        {/* Linha 2: Filtros de data + vendedor + ações */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs whitespace-nowrap" style={{ color: '#6b7280' }}>De</span>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 rounded-xl text-sm outline-none"
              style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
            <span className="text-xs whitespace-nowrap" style={{ color: '#6b7280' }}>Até</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 rounded-xl text-sm outline-none"
              style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
          </div>
          <select value={sellerFilter} onChange={(e) => setSellerFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm outline-none cursor-pointer"
            style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }}>
            {sellers.map(s => <option key={s} value={s}>{s === 'Todos' ? 'Todos os vendedores' : s}</option>)}
          </select>
          {hasFilters && (
            <button onClick={clearFilters}
              className="px-3 py-2 rounded-xl text-xs cursor-pointer whitespace-nowrap"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>
              <i className="ri-close-line mr-1"></i>Limpar filtros
            </button>
          )}
          <div className="flex-1"></div>
          <span className="text-xs" style={{ color: '#6b7280' }}>{filtered.length} venda{filtered.length !== 1 ? 's' : ''}</span>
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap transition-all"
            style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(16,185,129,0.2)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(16,185,129,0.12)'; }}>
            <i className="ri-download-line"></i> Exportar CSV
          </button>
        </div>
      </div>

      {/* Tabela */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}>
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-14 h-14 flex items-center justify-center rounded-2xl mx-auto mb-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <i className="ri-shopping-cart-line text-3xl" style={{ color: '#4b5563' }}></i>
            </div>
            <p className="text-white font-medium">Nenhuma venda encontrada</p>
            <p className="text-sm mt-1" style={{ color: '#6b7280' }}>
              {sales.length === 0 ? 'Registre vendas pelo PDV para visualizá-las aqui' : 'Tente ajustar os filtros'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['ID', 'Cliente', 'Data', 'Itens', 'Pagamento', 'Vendedor', 'Desconto', 'Total', 'Status', 'Ações'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: '#4b5563' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => {
                  const st = statusStyle[o.status] || { bg: 'rgba(107,114,128,0.12)', color: '#6b7280' };
                  return (
                    <tr key={o.id} className="transition-all cursor-pointer" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: '#f59e0b' }}>{o.id.slice(0, 8)}</td>
                      <td className="px-4 py-3 text-sm text-white whitespace-nowrap">{o.customerName}</td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: '#6b7280' }}>{o.createdAt}</td>
                      <td className="px-4 py-3 text-sm text-center" style={{ color: '#9ca3af' }}>{o.items.length}</td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: '#9ca3af' }}>{o.payment}</td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: '#9ca3af' }}>{o.sellerName}</td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: o.discount > 0 ? '#ef4444' : '#4b5563' }}>
                        {o.discount > 0 ? `- R$ ${o.discount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold whitespace-nowrap" style={{ color: '#10b981' }}>R$ {o.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: st.bg, color: st.color }}>{o.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => setViewSale(o)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer transition-all" style={{ color: '#6b7280' }}
                            title="Ver detalhes"
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#f59e0b'; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#6b7280'; }}>
                            <i className="ri-eye-line text-sm"></i>
                          </button>
                          <button onClick={() => setPrintSale(o)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer transition-all" style={{ color: '#6b7280' }}
                            title="Imprimir cupom"
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#8b5cf6'; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#6b7280'; }}>
                            <i className="ri-printer-line text-sm"></i>
                          </button>
                          {o.status === 'Pendente' && (
                            <button onClick={() => updateSale(o.id, { status: 'Concluído' })}
                              className="text-xs px-2 py-1 rounded-lg cursor-pointer whitespace-nowrap"
                              style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>Aprovar</button>
                          )}
                          {(o.status === 'Pendente' || o.status === 'Em andamento') && (
                            <button onClick={() => updateSale(o.id, { status: 'Cancelado' })}
                              className="text-xs px-2 py-1 rounded-lg cursor-pointer whitespace-nowrap"
                              style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>Cancelar</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Rodapé com totais */}
              <tfoot>
                <tr style={{ borderTop: '2px solid rgba(255,255,255,0.08)' }}>
                  <td colSpan={6} className="px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: '#6b7280' }}>
                    Totais do período ({filtered.filter(s => s.status === 'Concluído').length} concluídas)
                  </td>
                  <td className="px-4 py-3 text-sm font-bold whitespace-nowrap" style={{ color: '#ef4444' }}>
                    - R$ {filtered.reduce((s, o) => s + o.discount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold whitespace-nowrap" style={{ color: '#f59e0b' }}>
                    R$ {filtered.filter(s => s.status === 'Concluído').reduce((s, o) => s + o.total, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Sale Detail Modal */}
      {viewSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0" style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#1a1f2e' }}>
              <div>
                <h3 className="text-white font-bold">Venda #{viewSale.id.slice(0, 8)}</h3>
                <p className="text-xs" style={{ color: '#6b7280' }}>{viewSale.createdAt} — {viewSale.payment}</p>
              </div>
              <button onClick={() => setViewSale(null)} className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer" style={{ color: '#6b7280' }}>
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-3 mb-5">
                {[
                  { label: 'Cliente', value: viewSale.customerName },
                  { label: 'Vendedor', value: viewSale.sellerName },
                  { label: 'Pagamento', value: viewSale.payment },
                  { label: 'Status', value: viewSale.status },
                ].map((f) => (
                  <div key={f.label} className="p-3 rounded-xl" style={{ background: '#0f1117' }}>
                    <p className="text-xs mb-1" style={{ color: '#6b7280' }}>{f.label}</p>
                    <p className="text-sm font-medium text-white">{f.value}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: '#6b7280' }}>Itens da Venda</p>
              <div className="rounded-xl overflow-hidden mb-4" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                <table className="w-full">
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                      {['Produto', 'Qtd', 'Unit.', 'Total'].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-semibold" style={{ color: '#4b5563' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {viewSale.items.map((item, idx) => (
                      <tr key={idx} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                        <td className="px-3 py-2 text-sm text-white">{item.productName}</td>
                        <td className="px-3 py-2 text-sm text-center" style={{ color: '#9ca3af' }}>{item.quantity}</td>
                        <td className="px-3 py-2 text-sm whitespace-nowrap" style={{ color: '#9ca3af' }}>R$ {item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td className="px-3 py-2 text-sm font-bold whitespace-nowrap" style={{ color: '#10b981' }}>R$ {item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 rounded-xl" style={{ background: '#0f1117' }}>
                <div className="flex justify-between text-sm mb-2" style={{ color: '#9ca3af' }}>
                  <span>Subtotal</span>
                  <span>R$ {viewSale.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                {viewSale.discount > 0 && (
                  <div className="flex justify-between text-sm mb-2" style={{ color: '#ef4444' }}>
                    <span>Desconto</span>
                    <span>- R$ {viewSale.discount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <span className="text-white">Total</span>
                  <span style={{ color: '#f59e0b' }}>R$ {viewSale.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
              {viewSale.notes && (
                <div className="mt-3 p-3 rounded-xl" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
                  <p className="text-xs font-semibold mb-1" style={{ color: '#f59e0b' }}>Observações</p>
                  <p className="text-sm" style={{ color: '#9ca3af' }}>{viewSale.notes}</p>
                </div>
              )}
              <div className="flex gap-3 mt-4 flex-wrap">
                <button onClick={() => { setPrintSale(viewSale); setViewSale(null); }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap"
                  style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <i className="ri-printer-line"></i> Imprimir Cupom
                </button>
                {viewSale.status === 'Pendente' && (
                  <button onClick={() => { updateSale(viewSale.id, { status: 'Concluído' }); setViewSale(null); }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap"
                    style={{ background: '#10b981', color: '#fff' }}>
                    <i className="ri-check-line mr-1"></i> Aprovar Venda
                  </button>
                )}
                {(viewSale.status === 'Pendente' || viewSale.status === 'Em andamento') && (
                  <button onClick={() => { updateSale(viewSale.id, { status: 'Cancelado' }); setViewSale(null); }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap"
                    style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                    <i className="ri-close-line mr-1"></i> Cancelar Venda
                  </button>
                )}
                <button onClick={() => setViewSale(null)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium cursor-pointer whitespace-nowrap"
                  style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {printSale && <PrintReceipt sale={printSale} onClose={() => setPrintSale(null)} />}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl" style={{ background: '#10b981', color: 'white' }}>
          <div className="w-5 h-5 flex items-center justify-center"><i className="ri-check-line"></i></div>
          <p className="text-sm font-semibold">{toast}</p>
        </div>
      )}
    </ERPLayout>
  );
}
