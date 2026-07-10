import { useState, useMemo } from 'react';
import ERPLayout from '@/components/feature/ERPLayout';
import { useERP } from '@/hooks/useERPContext';
import type { Purchase, PurchaseItem } from '@/types/erp';
import { printDocument } from '@/utils/printDocument';

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  'Rascunho':   { bg: 'rgba(107,114,128,0.15)', color: '#9ca3af' },
  'Enviado':    { bg: 'rgba(129,140,248,0.15)',  color: '#818cf8' },
  'Confirmado': { bg: 'rgba(245,158,11,0.15)',   color: '#f59e0b' },
  'Recebido':   { bg: 'rgba(16,185,129,0.15)',   color: '#10b981' },
  'Cancelado':  { bg: 'rgba(239,68,68,0.15)',    color: '#ef4444' },
};

const PAYMENT_METHODS = ['À vista', 'Boleto 30d', 'Boleto 60d', 'Boleto 30/60/90d', 'PIX', 'Transferência'];

const EMPTY_FORM = {
  supplierName: '',
  supplierId: '',
  payment: 'Boleto 30d',
  expectedAt: '',
  freight: 0,
  notes: '',
  status: 'Rascunho' as Purchase['status'],
};

export default function PurchasesPage() {
  const { purchases, addPurchase, updatePurchase, deletePurchase, products, suppliers, auth } = useERP();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductDrop, setShowProductDrop] = useState(false);
  const [detailPurchase, setDetailPurchase] = useState<Purchase | null>(null);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showSupplierDrop, setShowSupplierDrop] = useState(false);

  const activeProducts = products.filter(p => p.status === 'Ativo');
  const filteredProducts = activeProducts.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.sku.toLowerCase().includes(productSearch)
  );
  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(supplierSearch.toLowerCase())
  );

  const filtered = useMemo(() => {
    return purchases.filter(p => {
      const matchSearch = p.supplierName.toLowerCase().includes(search.toLowerCase()) || p.number.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'Todos' || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [purchases, search, statusFilter]);

  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const total = subtotal + form.freight;

  const openNew = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setItems([]);
    setSupplierSearch('');
    setShowModal(true);
  };

  const openEdit = (p: Purchase) => {
    setEditingId(p.id);
    setForm({
      supplierName: p.supplierName,
      supplierId: p.supplierId,
      payment: p.payment,
      expectedAt: p.expectedAt,
      freight: p.freight,
      notes: p.notes || '',
      status: p.status,
    });
    setItems(p.items);
    setSupplierSearch(p.supplierName);
    setShowModal(true);
  };

  const addItem = (p: typeof activeProducts[0]) => {
    setItems(prev => {
      const ex = prev.find(i => i.productId === p.id);
      if (ex) return prev.map(i => i.productId === p.id ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.unitCost } : i);
      return [...prev, { productId: p.id, productName: p.name, quantity: 1, unitCost: p.cost, total: p.cost }];
    });
    setProductSearch('');
    setShowProductDrop(false);
  };

  const updateItemQty = (productId: string, qty: number) => {
    if (qty <= 0) { setItems(prev => prev.filter(i => i.productId !== productId)); return; }
    setItems(prev => prev.map(i => i.productId === productId ? { ...i, quantity: qty, total: qty * i.unitCost } : i));
  };

  const updateItemCost = (productId: string, cost: number) => {
    setItems(prev => prev.map(i => i.productId === productId ? { ...i, unitCost: cost, total: i.quantity * cost } : i));
  };

  const handleSave = () => {
    if (!form.supplierName || items.length === 0) return;
    const payload = {
      supplierId: form.supplierId,
      supplierName: form.supplierName,
      items,
      subtotal,
      freight: form.freight,
      total,
      payment: form.payment,
      expectedAt: form.expectedAt,
      notes: form.notes || undefined,
      status: form.status,
      buyerId: auth.user?.id || '',
      buyerName: auth.user?.name || '',
    };
    if (editingId) {
      updatePurchase(editingId, payload);
    } else {
      addPurchase(payload);
    }
    setShowModal(false);
  };

  const handleReceive = (p: Purchase) => {
    updatePurchase(p.id, { status: 'Recebido', receivedAt: new Date().toLocaleDateString('pt-BR') });
    setDetailPurchase(null);
  };

  const exportCSV = () => {
    const header = 'Número,Fornecedor,Itens,Subtotal,Frete,Total,Pagamento,Previsão,Status,Criado em\n';
    const rows = filtered.map(p =>
      `${p.number},"${p.supplierName}",${p.items.length},${p.subtotal.toFixed(2)},${p.freight.toFixed(2)},${p.total.toFixed(2)},"${p.payment}","${p.expectedAt || ''}",${p.status},"${p.createdAt}"`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pedidos_compra_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalValue = filtered.reduce((s, p) => s + p.total, 0);
  const pendingCount = filtered.filter(p => ['Enviado', 'Confirmado'].includes(p.status)).length;
  const receivedCount = filtered.filter(p => p.status === 'Recebido').length;

  const printPurchase = (p: Purchase) => {
    const companyName = 'BS LOJA';
    const companyDoc = '';
    const companyAddress = '';
    const companyPhone = '';

    const statusBadge = (s: string) => {
      const map: Record<string, string> = { 'Recebido': 'badge-green', 'Confirmado': 'badge-yellow', 'Enviado': 'badge-gray', 'Rascunho': 'badge-gray', 'Cancelado': 'badge-red' };
      return `<span class="badge ${map[s] || 'badge-gray'}">${s}</span>`;
    };

    const html = `
      <div class="header">
        <div class="header-left">
          <h1>${companyName}</h1>
          <p>CNPJ: ${companyDoc}</p>
          <p>${companyAddress}</p>
          <p>Tel: ${companyPhone}</p>
        </div>
        <div class="header-right">
          <div class="doc-label">Pedido de Compra</div>
          <div class="doc-number">${p.number}</div>
          <div style="margin-top:6px;">${statusBadge(p.status)}</div>
          <p style="font-size:11px;color:#777;margin-top:4px;">Emitido em: ${p.createdAt}</p>
          ${p.expectedAt ? `<p style="font-size:11px;color:#777;">Previsão de entrega: ${p.expectedAt}</p>` : ''}
        </div>
      </div>

      <div class="grid-2 section">
        <div>
          <div class="section-title">Fornecedor</div>
          <div class="field"><label>Nome / Razão Social</label><span>${p.supplierName}</span></div>
          <div class="field"><label>Forma de Pagamento</label><span>${p.payment}</span></div>
        </div>
        <div>
          <div class="section-title">Comprador Responsável</div>
          <div class="field"><label>Nome</label><span>${p.buyerName}</span></div>
          ${p.receivedAt ? `<div class="field"><label>Data de Recebimento</label><span>${p.receivedAt}</span></div>` : ''}
        </div>
      </div>

      <div class="section">
        <div class="section-title">Itens do Pedido</div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Produto</th>
              <th class="text-center">Quantidade</th>
              <th class="text-right">Custo Unit.</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${p.items.map((item, i) => `
              <tr>
                <td style="color:#999;">${i + 1}</td>
                <td><strong>${item.productName}</strong></td>
                <td class="text-center">${item.quantity}</td>
                <td class="text-right">R$ ${item.unitCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td class="text-right"><strong>R$ ${item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="totals">
          <div class="totals-row"><span>Subtotal</span><span>R$ ${p.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
          ${p.freight > 0 ? `<div class="totals-row"><span>Frete</span><span>R$ ${p.freight.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>` : ''}
          <div class="totals-row total"><span>TOTAL DO PEDIDO</span><span>R$ ${p.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
        </div>
      </div>

      ${p.notes ? `
        <div class="section">
          <div class="section-title">Observações / Instruções de Entrega</div>
          <div class="notes-box">${p.notes}</div>
        </div>
      ` : ''}

      <div class="signature-area">
        <div class="signature-line">Comprador: ${p.buyerName} — ${companyName}</div>
        <div class="signature-line">Fornecedor: ${p.supplierName}</div>
      </div>

      <div class="footer">
        <span>${companyName} · CNPJ ${companyDoc}</span>
        <span>Pedido ${p.number} · Gerado em ${new Date().toLocaleDateString('pt-BR')}</span>
      </div>
    `;
    printDocument(`Pedido de Compra ${p.number} — ${p.supplierName}`, html);
  };

  return (
    <ERPLayout title="Pedidos de Compra" subtitle="Gerencie compras e reposição de estoque com fornecedores">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total de Pedidos', value: String(filtered.length), icon: 'ri-shopping-bag-3-line', color: '#f59e0b' },
          { label: 'Valor Total', value: `R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: 'ri-money-dollar-circle-line', color: '#10b981' },
          { label: 'Aguardando', value: String(pendingCount), icon: 'ri-time-line', color: '#818cf8' },
          { label: 'Recebidos', value: String(receivedCount), icon: 'ri-checkbox-circle-line', color: '#10b981' },
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
        <div className="relative flex-1 min-w-[200px]">
          <div className="w-4 h-4 flex items-center justify-center absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#6b7280' }}>
            <i className="ri-search-line text-sm"></i>
          </div>
          <input type="text" placeholder="Buscar por fornecedor ou número..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
        </div>
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#1a1f2e' }}>
          {['Todos', 'Rascunho', 'Enviado', 'Confirmado', 'Recebido'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer whitespace-nowrap transition-all"
              style={statusFilter === s ? { background: '#f59e0b', color: '#000' } : { color: '#6b7280' }}>
              {s}
            </button>
          ))}
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap"
          style={{ background: '#f59e0b', color: '#000' }}>
          <i className="ri-add-line"></i> Novo Pedido
        </button>
        <button onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap"
          style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
          <i className="ri-download-line"></i> CSV
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 flex items-center justify-center rounded-2xl mb-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <i className="ri-shopping-bag-3-line text-3xl" style={{ color: '#4b5563' }}></i>
            </div>
            <p className="text-white font-medium">Nenhum pedido de compra</p>
            <p className="text-sm mt-1" style={{ color: '#6b7280' }}>Crie pedidos para repor o estoque com seus fornecedores</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Número', 'Fornecedor', 'Itens', 'Frete', 'Total', 'Previsão', 'Status', 'Ações'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: '#4b5563' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const st = STATUS_STYLE[p.status] || STATUS_STYLE['Rascunho'];
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                      <td className="px-5 py-3 text-xs font-mono font-bold" style={{ color: '#f59e0b' }}>{p.number}</td>
                      <td className="px-5 py-3">
                        <p className="text-sm font-medium text-white">{p.supplierName}</p>
                        <p className="text-xs" style={{ color: '#6b7280' }}>{p.payment}</p>
                      </td>
                      <td className="px-5 py-3 text-sm text-center" style={{ color: '#9ca3af' }}>{p.items.length}</td>
                      <td className="px-5 py-3 text-sm whitespace-nowrap" style={{ color: '#9ca3af' }}>
                        {p.freight > 0 ? `R$ ${p.freight.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className="px-5 py-3 text-sm font-bold whitespace-nowrap" style={{ color: '#10b981' }}>
                        R$ {p.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-3 text-xs whitespace-nowrap" style={{ color: '#9ca3af' }}>{p.expectedAt || '—'}</td>
                      <td className="px-5 py-3">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: st.bg, color: st.color }}>{p.status}</span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setDetailPurchase(p)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer"
                            style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>
                            <i className="ri-eye-line text-sm"></i>
                          </button>
                          <button onClick={() => printPurchase(p)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer"
                            style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}
                            title="Imprimir pedido">
                            <i className="ri-printer-line text-sm"></i>
                          </button>
                          {p.status !== 'Recebido' && p.status !== 'Cancelado' && (
                            <button onClick={() => openEdit(p)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer"
                              style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                              <i className="ri-edit-line text-sm"></i>
                            </button>
                          )}
                          {['Enviado', 'Confirmado'].includes(p.status) && (
                            <button onClick={() => handleReceive(p)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer"
                              style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}
                              title="Marcar como recebido">
                              <i className="ri-checkbox-circle-line text-sm"></i>
                            </button>
                          )}
                          {p.status === 'Rascunho' && (
                            <button onClick={() => deletePurchase(p.id)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer"
                              style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                              <i className="ri-delete-bin-line text-sm"></i>
                            </button>
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

      {/* Modal Novo/Editar */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-3xl rounded-2xl overflow-hidden flex flex-col" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '90vh' }}>
            <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <p className="text-white font-bold text-lg">{editingId ? 'Editar Pedido' : 'Novo Pedido de Compra'}</p>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer" style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>
                <i className="ri-close-line"></i>
              </button>
            </div>
            <div className="overflow-y-auto p-6 flex flex-col gap-5">
              {/* Fornecedor */}
              <div>
                <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: '#6b7280' }}>Fornecedor</p>
                <div className="relative">
                  <input type="text" placeholder="Buscar fornecedor *" value={form.supplierName}
                    onChange={e => { setForm(f => ({ ...f, supplierName: e.target.value, supplierId: '' })); setSupplierSearch(e.target.value); setShowSupplierDrop(true); }}
                    onFocus={() => setShowSupplierDrop(true)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
                  {showSupplierDrop && supplierSearch && filteredSuppliers.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-xl overflow-hidden" style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)' }}>
                      {filteredSuppliers.slice(0, 4).map(s => (
                        <button key={s.id} onClick={() => { setForm(f => ({ ...f, supplierName: s.name, supplierId: s.id })); setShowSupplierDrop(false); }}
                          className="w-full text-left px-3 py-2 text-sm cursor-pointer transition-all"
                          style={{ color: '#d1d5db' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                          <p className="font-medium">{s.name}</p>
                          <p className="text-xs" style={{ color: '#6b7280' }}>{s.document}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Produtos */}
              <div>
                <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: '#6b7280' }}>Produtos</p>
                <div className="relative mb-3">
                  <div className="w-4 h-4 flex items-center justify-center absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#6b7280' }}>
                    <i className="ri-search-line text-sm"></i>
                  </div>
                  <input type="text" placeholder="Buscar produto para adicionar..." value={productSearch}
                    onChange={e => { setProductSearch(e.target.value); setShowProductDrop(true); }}
                    onFocus={() => setShowProductDrop(true)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
                  {showProductDrop && productSearch && filteredProducts.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-xl overflow-hidden" style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', maxHeight: '180px', overflowY: 'auto' }}>
                      {filteredProducts.slice(0, 8).map(p => (
                        <button key={p.id} onClick={() => addItem(p)}
                          className="w-full text-left px-3 py-2 text-sm cursor-pointer transition-all flex items-center justify-between"
                          style={{ color: '#d1d5db' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                          <div>
                            <p className="font-medium">{p.name}</p>
                            <p className="text-xs" style={{ color: '#6b7280' }}>Custo: R$ {p.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          </div>
                          <span className="text-xs" style={{ color: '#f59e0b' }}>Estoque: {p.quantity}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {items.length > 0 && (
                  <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                    <table className="w-full">
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                          {['Produto', 'Qtd', 'Custo Unit.', 'Total', ''].map(h => (
                            <th key={h} className="px-3 py-2 text-left text-xs font-semibold" style={{ color: '#4b5563' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {items.map(item => (
                          <tr key={item.productId} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                            <td className="px-3 py-2 text-sm text-white">{item.productName}</td>
                            <td className="px-3 py-2">
                              <input type="number" min="1" value={item.quantity}
                                onChange={e => updateItemQty(item.productId, Number(e.target.value))}
                                className="w-16 px-2 py-1 rounded-lg text-sm text-center outline-none"
                                style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
                            </td>
                            <td className="px-3 py-2">
                              <input type="number" min="0" step="0.01" value={item.unitCost}
                                onChange={e => updateItemCost(item.productId, Number(e.target.value))}
                                className="w-28 px-2 py-1 rounded-lg text-sm text-center outline-none"
                                style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
                            </td>
                            <td className="px-3 py-2 text-sm font-bold whitespace-nowrap" style={{ color: '#10b981' }}>
                              R$ {item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-3 py-2">
                              <button onClick={() => setItems(prev => prev.filter(i => i.productId !== item.productId))}
                                className="w-6 h-6 flex items-center justify-center rounded cursor-pointer" style={{ color: '#ef4444' }}>
                                <i className="ri-close-line text-sm"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Configurações */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-semibold mb-1 block uppercase tracking-wider" style={{ color: '#6b7280' }}>Pagamento</label>
                  <select value={form.payment} onChange={e => setForm(f => ({ ...f, payment: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none cursor-pointer"
                    style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }}>
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1 block uppercase tracking-wider" style={{ color: '#6b7280' }}>Previsão de entrega</label>
                  <input type="date" value={form.expectedAt} onChange={e => setForm(f => ({ ...f, expectedAt: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1 block uppercase tracking-wider" style={{ color: '#6b7280' }}>Frete (R$)</label>
                  <input type="number" min="0" step="0.01" value={form.freight}
                    onChange={e => setForm(f => ({ ...f, freight: Number(e.target.value) }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1 block uppercase tracking-wider" style={{ color: '#6b7280' }}>Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Purchase['status'] }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none cursor-pointer"
                    style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }}>
                    {['Rascunho', 'Enviado', 'Confirmado'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: '#0f1117' }}>
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between gap-8 text-sm" style={{ color: '#6b7280' }}>
                    <span>Subtotal</span><span>R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between gap-8 text-sm" style={{ color: '#6b7280' }}>
                    <span>Frete</span><span>R$ {form.freight.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs" style={{ color: '#6b7280' }}>Total do Pedido</p>
                  <p className="text-xl font-bold" style={{ color: '#f59e0b' }}>R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold mb-1 block uppercase tracking-wider" style={{ color: '#6b7280' }}>Observações</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value.slice(0, 500) }))}
                  placeholder="Instruções de entrega, condições especiais..."
                  rows={2} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                  style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
              </div>
            </div>
            <div className="px-6 py-4 border-t flex items-center justify-end gap-3 flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <button onClick={() => setShowModal(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-medium cursor-pointer whitespace-nowrap"
                style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>Cancelar</button>
              <button onClick={handleSave} disabled={!form.supplierName || items.length === 0}
                className="px-5 py-2.5 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap"
                style={{ background: form.supplierName && items.length > 0 ? '#f59e0b' : 'rgba(255,255,255,0.06)', color: form.supplierName && items.length > 0 ? '#000' : '#4b5563' }}>
                {editingId ? 'Salvar Alterações' : 'Criar Pedido'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <div>
                <p className="text-white font-bold">{detailPurchase.number}</p>
                <p className="text-xs" style={{ color: '#6b7280' }}>Criado em {detailPurchase.createdAt}</p>
              </div>
              <button onClick={() => setDetailPurchase(null)} className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer" style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>
                <i className="ri-close-line"></i>
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-semibold">{detailPurchase.supplierName}</p>
                  <p className="text-xs" style={{ color: '#6b7280' }}>{detailPurchase.payment} · Previsão: {detailPurchase.expectedAt || '—'}</p>
                </div>
                <span className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: STATUS_STYLE[detailPurchase.status]?.bg, color: STATUS_STYLE[detailPurchase.status]?.color }}>
                  {detailPurchase.status}
                </span>
              </div>
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                {detailPurchase.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3" style={{ borderBottom: i < detailPurchase.items.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <div>
                      <p className="text-sm text-white">{item.productName}</p>
                      <p className="text-xs" style={{ color: '#6b7280' }}>{item.quantity} × R$ {item.unitCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <p className="text-sm font-bold" style={{ color: '#10b981' }}>R$ {item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-xl p-4" style={{ background: '#0f1117' }}>
                <div className="flex justify-between text-sm mb-1" style={{ color: '#6b7280' }}>
                  <span>Subtotal</span><span>R$ {detailPurchase.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                {detailPurchase.freight > 0 && (
                  <div className="flex justify-between text-sm mb-1" style={{ color: '#6b7280' }}>
                    <span>Frete</span><span>R$ {detailPurchase.freight.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold mt-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <span className="text-white">Total</span>
                  <span style={{ color: '#f59e0b' }}>R$ {detailPurchase.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <button onClick={() => printPurchase(detailPurchase)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap"
                  style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.2)' }}>
                  <i className="ri-printer-line"></i> Imprimir Pedido de Compra
                </button>
                {['Enviado', 'Confirmado'].includes(detailPurchase.status) && (
                  <button onClick={() => handleReceive(detailPurchase)}
                    className="w-full py-3 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap"
                    style={{ background: '#10b981', color: '#fff' }}>
                    <i className="ri-checkbox-circle-line mr-2"></i>Confirmar Recebimento (atualiza estoque)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </ERPLayout>
  );
}
