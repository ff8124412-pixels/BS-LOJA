import { useState, useMemo, useRef } from 'react';
import ERPLayout from '@/components/feature/ERPLayout';
import { useERP } from '@/hooks/useERPContext';
import type { Quote, QuoteItem } from '@/types/erp';
import { printDocument } from '@/utils/printDocument';

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  'Rascunho':  { bg: 'rgba(107,114,128,0.15)', color: '#9ca3af' },
  'Enviado':   { bg: 'rgba(99,102,241,0.15)',  color: '#818cf8' },
  'Aprovado':  { bg: 'rgba(16,185,129,0.15)',  color: '#10b981' },
  'Recusado':  { bg: 'rgba(239,68,68,0.15)',   color: '#ef4444' },
  'Expirado':  { bg: 'rgba(245,158,11,0.15)',  color: '#f59e0b' },
};

const EMPTY_FORM = {
  customerName: '', customerEmail: '', customerPhone: '', customerDoc: '',
  projectName: '', projectAddress: '',
  discount: 0, notes: '', validUntil: '', status: 'Rascunho' as Quote['status'],
};

type Mode = 'm2' | 'manual';

interface M2Item {
  productId: string;
  area: number; // m²
  wastePct: number; // % de perda
}

export default function QuotesPage() {
  const { quotes, addQuote, updateQuote, deleteQuote, products, customers, auth } = useERP();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [mode, setMode] = useState<Mode>('m2');

  // M² mode state
  const [globalArea, setGlobalArea] = useState('');
  const [m2Items, setM2Items] = useState<M2Item[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductDrop, setShowProductDrop] = useState(false);
  const productSearchRef = useRef<HTMLInputElement>(null);

  // Customer autocomplete
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDrop, setShowCustomerDrop] = useState(false);

  const [detailQuote, setDetailQuote] = useState<Quote | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const activeProducts = products.filter(p => p.status === 'Ativo');
  const m2Products = activeProducts.filter(p => p.m2Coverage != null && p.m2Coverage > 0);
  const manualProducts = activeProducts;

  const filteredProductSearch = (list: typeof activeProducts) =>
    list.filter(p =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(productSearch.toLowerCase())
    );

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.document.includes(customerSearch)
  );

  const filtered = useMemo(() => {
    return quotes.filter(q => {
      const matchSearch = q.customerName.toLowerCase().includes(search.toLowerCase()) ||
        q.number.toLowerCase().includes(search.toLowerCase()) ||
        (q as Quote & { projectName?: string }).projectName?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'Todos' || q.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [quotes, search, statusFilter]);

  // ── Compute items from m2 mode ──────────────────────────────────────────────
  const computedM2Items = useMemo((): QuoteItem[] => {
    return m2Items.map(mi => {
      const prod = products.find(p => p.id === mi.productId);
      if (!prod || !prod.m2Coverage) return null;
      const areaWithWaste = mi.area * (1 + mi.wastePct / 100);
      // m2Coverage = quantos m² 1 unidade cobre
      // Se m2Coverage > 1: 1 unidade cobre vários m² → qty = area / coverage
      // Se m2Coverage < 1: 1 unidade cobre menos de 1 m² → qty = area / coverage (ex: tijolo 0.04 → 25/m²)
      const qty = Math.ceil(areaWithWaste / prod.m2Coverage);
      const total = qty * prod.price;
      return {
        productId: prod.id,
        productName: prod.name,
        quantity: qty,
        unitPrice: prod.price,
        total,
        unit: prod.unit,
        m2Area: mi.area,
        m2Coverage: prod.m2Coverage,
      } as QuoteItem;
    }).filter(Boolean) as QuoteItem[];
  }, [m2Items, products]);

  // ── Subtotal / total ────────────────────────────────────────────────────────
  const activeItems = mode === 'm2' ? computedM2Items : items;
  const subtotal = activeItems.reduce((s, i) => s + i.total, 0);
  const discountValue = (subtotal * form.discount) / 100;
  const total = subtotal - discountValue;

  // ── Open modal ──────────────────────────────────────────────────────────────
  const openNew = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setItems([]);
    setM2Items([]);
    setGlobalArea('');
    setCustomerSearch('');
    setMode('m2');
    setShowModal(true);
  };

  const openEdit = (q: Quote) => {
    setEditingId(q.id);
    const qAny = q as Quote & { projectName?: string; projectAddress?: string; customerDoc?: string };
    setForm({
      customerName: q.customerName,
      customerEmail: q.customerEmail || '',
      customerPhone: q.customerPhone || '',
      customerDoc: qAny.customerDoc || '',
      projectName: qAny.projectName || '',
      projectAddress: qAny.projectAddress || '',
      discount: q.discount > 0 ? (q.discount / q.subtotal) * 100 : 0,
      notes: q.notes || '',
      validUntil: q.validUntil,
      status: q.status,
    });
    setItems(q.items);
    setM2Items([]);
    setCustomerSearch(q.customerName);
    setMode('manual');
    setShowModal(true);
  };

  // ── M² mode: add product ────────────────────────────────────────────────────
  const addM2Product = (productId: string) => {
    if (m2Items.find(i => i.productId === productId)) return;
    const area = parseFloat(globalArea) || 0;
    setM2Items(prev => [...prev, { productId, area, wastePct: 10 }]);
    setProductSearch('');
    setShowProductDrop(false);
  };

  const updateM2Item = (productId: string, field: 'area' | 'wastePct', value: number) => {
    setM2Items(prev => prev.map(i => i.productId === productId ? { ...i, [field]: value } : i));
  };

  const removeM2Item = (productId: string) => {
    setM2Items(prev => prev.filter(i => i.productId !== productId));
  };

  // Apply global area to all m2 items
  const applyGlobalArea = () => {
    const area = parseFloat(globalArea);
    if (!area || area <= 0) return;
    setM2Items(prev => prev.map(i => ({ ...i, area })));
  };

  // ── Manual mode: add product ────────────────────────────────────────────────
  const addManualItem = (p: typeof activeProducts[0]) => {
    setItems(prev => {
      const ex = prev.find(i => i.productId === p.id);
      if (ex) return prev.map(i => i.productId === p.id ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.unitPrice } : i);
      return [...prev, { productId: p.id, productName: p.name, quantity: 1, unitPrice: p.price, total: p.price, unit: p.unit }];
    });
    setProductSearch('');
    setShowProductDrop(false);
  };

  const updateManualQty = (productId: string, qty: number) => {
    if (qty <= 0) { setItems(prev => prev.filter(i => i.productId !== productId)); return; }
    setItems(prev => prev.map(i => i.productId === productId ? { ...i, quantity: qty, total: qty * i.unitPrice } : i));
  };

  const updateManualPrice = (productId: string, price: number) => {
    setItems(prev => prev.map(i => i.productId === productId ? { ...i, unitPrice: price, total: i.quantity * price } : i));
  };

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = () => {
    if (!form.customerName || activeItems.length === 0) return;
    const payload = {
      customerName: form.customerName,
      customerEmail: form.customerEmail || undefined,
      customerPhone: form.customerPhone || undefined,
      items: activeItems,
      subtotal,
      discount: discountValue,
      total,
      notes: form.notes || undefined,
      validUntil: form.validUntil,
      status: form.status,
      sellerId: auth.user?.id || '',
      sellerName: auth.user?.name || '',
      // extra fields stored as any
      ...(form.projectName ? { projectName: form.projectName } : {}),
      ...(form.projectAddress ? { projectAddress: form.projectAddress } : {}),
      ...(form.customerDoc ? { customerDoc: form.customerDoc } : {}),
    } as Parameters<typeof addQuote>[0];

    if (editingId) {
      updateQuote(editingId, payload);
      showToast('Orçamento atualizado!');
    } else {
      addQuote(payload);
      showToast('Orçamento criado com sucesso!');
    }
    setShowModal(false);
  };

  const printQuote = (q: Quote) => {
    const qAny = q as Quote & { projectName?: string; projectAddress?: string; customerDoc?: string };
    const companyName = 'BS LOJA';
    const companyDoc = '';
    const companyAddress = '';
    const companyPhone = '';

    const statusBadge = (s: string) => {
      const map: Record<string, string> = { 'Aprovado': 'badge-green', 'Enviado': 'badge-gray', 'Rascunho': 'badge-gray', 'Recusado': 'badge-red', 'Expirado': 'badge-yellow' };
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
          <div class="doc-label">Orçamento</div>
          <div class="doc-number">${q.number}</div>
          <div style="margin-top:6px;">${statusBadge(q.status)}</div>
          <p style="font-size:11px;color:#777;margin-top:4px;">Emitido em: ${q.createdAt}</p>
          ${q.validUntil ? `<p style="font-size:11px;color:#777;">Válido até: ${q.validUntil}</p>` : ''}
        </div>
      </div>

      <div class="grid-2 section">
        <div>
          <div class="section-title">Cliente / Destinatário</div>
          <div class="field"><label>Nome</label><span>${q.customerName}</span></div>
          ${qAny.customerDoc ? `<div class="field"><label>CPF / CNPJ</label><span>${qAny.customerDoc}</span></div>` : ''}
          ${q.customerEmail ? `<div class="field"><label>E-mail</label><span>${q.customerEmail}</span></div>` : ''}
          ${q.customerPhone ? `<div class="field"><label>Telefone</label><span>${q.customerPhone}</span></div>` : ''}
        </div>
        <div>
          <div class="section-title">Dados do Projeto</div>
          ${qAny.projectName ? `<div class="field"><label>Projeto / Obra</label><span>${qAny.projectName}</span></div>` : ''}
          ${qAny.projectAddress ? `<div class="field"><label>Endereço da Obra</label><span>${qAny.projectAddress}</span></div>` : ''}
          <div class="field"><label>Vendedor Responsável</label><span>${q.sellerName}</span></div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Materiais / Itens do Orçamento</div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Produto / Descrição</th>
              <th class="text-center">Qtd</th>
              <th class="text-center">Unid.</th>
              ${q.items.some(i => i.m2Area) ? '<th class="text-center">Área (m²)</th>' : ''}
              <th class="text-right">Preço Unit.</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${q.items.map((item, i) => `
              <tr>
                <td style="color:#999;">${i + 1}</td>
                <td><strong>${item.productName}</strong></td>
                <td class="text-center">${item.quantity}</td>
                <td class="text-center">${item.unit || 'un'}</td>
                ${q.items.some(it => it.m2Area) ? `<td class="text-center">${item.m2Area ? item.m2Area + ' m²' : '—'}</td>` : ''}
                <td class="text-right">R$ ${item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td class="text-right"><strong>R$ ${item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="totals">
          <div class="totals-row"><span>Subtotal</span><span>R$ ${q.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
          ${q.discount > 0 ? `<div class="totals-row" style="color:#dc2626;"><span>Desconto</span><span>- R$ ${q.discount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>` : ''}
          <div class="totals-row total"><span>TOTAL</span><span>R$ ${q.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
        </div>
      </div>

      ${q.notes ? `
        <div class="section">
          <div class="section-title">Observações / Condições Comerciais</div>
          <div class="notes-box">${q.notes}</div>
        </div>
      ` : ''}

      <div class="signature-area">
        <div class="signature-line">${companyName} — Vendedor: ${q.sellerName}</div>
        <div class="signature-line">Cliente: ${q.customerName}</div>
      </div>

      <div class="footer">
        <span>${companyName} · CNPJ ${companyDoc}</span>
        <span>Orçamento ${q.number} · Gerado em ${new Date().toLocaleDateString('pt-BR')}</span>
      </div>
    `;
    printDocument(`Orçamento ${q.number} — ${q.customerName}`, html);
  };

  const totalValue = filtered.reduce((s, q) => s + q.total, 0);
  const approvedCount = filtered.filter(q => q.status === 'Aprovado').length;
  const pendingCount = filtered.filter(q => q.status === 'Enviado').length;
  const conversionRate = filtered.length > 0 ? Math.round((approvedCount / filtered.length) * 100) : 0;

  const exportCSV = () => {
    const header = 'Número,Cliente,Projeto,Total,Válido até,Vendedor,Status\n';
    const rows = filtered.map(q => {
      const qAny = q as Quote & { projectName?: string };
      return `${q.number},"${q.customerName}","${qAny.projectName || ''}",${q.total.toFixed(2)},${q.validUntil},${q.sellerName},${q.status}`;
    }).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `orcamentos_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exportado!');
  };

  return (
    <ERPLayout title="Orçamentos & Propostas" subtitle="Cálculo automático por m² — gere propostas profissionais em segundos">

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total de Orçamentos', value: String(filtered.length), icon: 'ri-file-list-3-line', color: '#f59e0b' },
          { label: 'Valor Total', value: `R$ ${(totalValue / 1000).toFixed(1)}k`, icon: 'ri-money-dollar-circle-line', color: '#10b981' },
          { label: 'Aprovados', value: String(approvedCount), icon: 'ri-checkbox-circle-line', color: '#10b981' },
          { label: 'Taxa de Conversão', value: `${conversionRate}%`, icon: 'ri-percent-line', color: '#818cf8' },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl p-4" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="w-8 h-8 flex items-center justify-center rounded-xl mb-2" style={{ background: `${c.color}20` }}>
              <i className={`${c.icon} text-sm`} style={{ color: c.color }}></i>
            </div>
            <p className="text-white font-bold text-xl leading-tight">{c.value}</p>
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
          <input type="text" placeholder="Buscar por cliente, projeto ou número..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
        </div>
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#1a1f2e' }}>
          {['Todos', 'Rascunho', 'Enviado', 'Aprovado', 'Recusado'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer whitespace-nowrap transition-all"
              style={statusFilter === s ? { background: '#f59e0b', color: '#000' } : { color: '#6b7280' }}>
              {s}
            </button>
          ))}
        </div>
        <button onClick={exportCSV}
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer whitespace-nowrap"
          style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
          <i className="ri-download-line"></i> CSV
        </button>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap"
          style={{ background: '#f59e0b', color: '#000' }}>
          <i className="ri-add-line"></i> Novo Orçamento
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 flex items-center justify-center rounded-2xl mb-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <i className="ri-file-list-3-line text-3xl" style={{ color: '#4b5563' }}></i>
            </div>
            <p className="text-white font-medium">Nenhum orçamento encontrado</p>
            <p className="text-sm mt-1" style={{ color: '#6b7280' }}>Crie seu primeiro orçamento com cálculo por m²</p>
            <button onClick={openNew} className="mt-4 px-5 py-2 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap" style={{ background: '#f59e0b', color: '#000' }}>
              Criar Orçamento
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Número', 'Cliente / Projeto', 'Itens', 'Total', 'Válido até', 'Vendedor', 'Status', 'Ações'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: '#4b5563' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(q => {
                  const st = STATUS_STYLE[q.status] || STATUS_STYLE['Rascunho'];
                  const qAny = q as Quote & { projectName?: string };
                  return (
                    <tr key={q.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                      className="cursor-pointer transition-all"
                      onClick={() => setDetailQuote(q)}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                      <td className="px-5 py-3 text-xs font-mono font-bold" style={{ color: '#f59e0b' }}>{q.number}</td>
                      <td className="px-5 py-3">
                        <p className="text-sm font-medium text-white">{q.customerName}</p>
                        {qAny.projectName && <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{qAny.projectName}</p>}
                        {q.customerEmail && !qAny.projectName && <p className="text-xs" style={{ color: '#6b7280' }}>{q.customerEmail}</p>}
                      </td>
                      <td className="px-5 py-3 text-sm text-center" style={{ color: '#9ca3af' }}>{q.items.length}</td>
                      <td className="px-5 py-3">
                        <p className="text-sm font-bold whitespace-nowrap" style={{ color: '#10b981' }}>
                          R$ {q.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        {q.items.some(i => i.m2Area) && (
                          <p className="text-xs" style={{ color: '#6b7280' }}>
                            R$ {q.items[0]?.m2Area ? (q.total / q.items[0].m2Area).toFixed(2) : '—'}/m²
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3 text-xs whitespace-nowrap" style={{ color: '#9ca3af' }}>{q.validUntil || '—'}</td>
                      <td className="px-5 py-3 text-sm" style={{ color: '#9ca3af' }}>{q.sellerName}</td>
                      <td className="px-5 py-3">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: st.bg, color: st.color }}>{q.status}</span>
                      </td>
                      <td className="px-5 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button onClick={() => printQuote(q)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer transition-all"
                            style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }} title="Imprimir proposta">
                            <i className="ri-printer-line text-sm"></i>
                          </button>
                          <button onClick={() => openEdit(q)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer transition-all"
                            style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }} title="Editar">
                            <i className="ri-edit-line text-sm"></i>
                          </button>
                          <button onClick={() => setDeleteConfirm(q.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer transition-all"
                            style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }} title="Excluir">
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

      {/* ── Modal Novo/Editar ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="w-full max-w-4xl rounded-2xl overflow-hidden flex flex-col" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '92vh' }}>

            {/* Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <div>
                <p className="text-white font-bold text-lg">{editingId ? 'Editar Orçamento' : 'Novo Orçamento'}</p>
                <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>Preencha os dados do cliente e selecione os materiais</p>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer" style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>
                <i className="ri-close-line"></i>
              </button>
            </div>

            <div className="overflow-y-auto p-6 flex flex-col gap-6">

              {/* ── Seção 1: Cliente & Projeto ── */}
              <div>
                <p className="text-xs font-bold mb-3 uppercase tracking-wider flex items-center gap-2" style={{ color: '#f59e0b' }}>
                  <i className="ri-user-3-line"></i> Cliente & Projeto
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {/* Cliente autocomplete */}
                  <div className="relative col-span-2 sm:col-span-1">
                    <label className="text-xs font-medium block mb-1" style={{ color: '#6b7280' }}>Nome do Cliente *</label>
                    <input type="text" placeholder="Buscar ou digitar cliente..."
                      value={form.customerName}
                      onChange={e => { setForm(f => ({ ...f, customerName: e.target.value })); setCustomerSearch(e.target.value); setShowCustomerDrop(true); }}
                      onFocus={() => setShowCustomerDrop(true)}
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                      style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
                    {showCustomerDrop && customerSearch && filteredCustomers.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 z-30 rounded-xl overflow-hidden" style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.1)' }}>
                        {filteredCustomers.slice(0, 5).map(c => (
                          <button key={c.id} onClick={() => {
                            setForm(f => ({ ...f, customerName: c.name, customerEmail: c.email, customerPhone: c.phone, customerDoc: c.document }));
                            setShowCustomerDrop(false);
                          }}
                            className="w-full text-left px-3 py-2.5 text-sm cursor-pointer transition-all flex items-center justify-between"
                            style={{ color: '#d1d5db', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                            <div>
                              <p className="font-medium">{c.name}</p>
                              <p className="text-xs" style={{ color: '#6b7280' }}>{c.document} · {c.city}/{c.state}</p>
                            </div>
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>{c.type}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-medium block mb-1" style={{ color: '#6b7280' }}>CPF / CNPJ</label>
                    <input type="text" placeholder="000.000.000-00" value={form.customerDoc}
                      onChange={e => setForm(f => ({ ...f, customerDoc: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                      style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
                  </div>

                  <div>
                    <label className="text-xs font-medium block mb-1" style={{ color: '#6b7280' }}>E-mail</label>
                    <input type="email" placeholder="cliente@email.com" value={form.customerEmail}
                      onChange={e => setForm(f => ({ ...f, customerEmail: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                      style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
                  </div>

                  <div>
                    <label className="text-xs font-medium block mb-1" style={{ color: '#6b7280' }}>Telefone</label>
                    <input type="text" placeholder="(11) 99999-9999" value={form.customerPhone}
                      onChange={e => setForm(f => ({ ...f, customerPhone: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                      style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
                  </div>

                  <div>
                    <label className="text-xs font-medium block mb-1" style={{ color: '#6b7280' }}>Nome do Projeto / Obra</label>
                    <input type="text" placeholder="Ex: Residência Almeida — Fase 2" value={form.projectName}
                      onChange={e => setForm(f => ({ ...f, projectName: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                      style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
                  </div>

                  <div>
                    <label className="text-xs font-medium block mb-1" style={{ color: '#6b7280' }}>Endereço da Obra</label>
                    <input type="text" placeholder="Rua, número, bairro, cidade" value={form.projectAddress}
                      onChange={e => setForm(f => ({ ...f, projectAddress: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                      style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
                  </div>
                </div>
              </div>

              {/* ── Seção 2: Modo de cálculo ── */}
              <div>
                <p className="text-xs font-bold mb-3 uppercase tracking-wider flex items-center gap-2" style={{ color: '#f59e0b' }}>
                  <i className="ri-calculator-line"></i> Materiais
                </p>

                {/* Mode toggle */}
                <div className="flex gap-1 p-1 rounded-xl mb-4 w-fit" style={{ background: '#0f1117' }}>
                  <button onClick={() => setMode('m2')}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer whitespace-nowrap transition-all"
                    style={mode === 'm2' ? { background: '#f59e0b', color: '#000' } : { color: '#6b7280' }}>
                    <i className="ri-layout-grid-line text-sm"></i>
                    Calcular por m²
                  </button>
                  <button onClick={() => setMode('manual')}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer whitespace-nowrap transition-all"
                    style={mode === 'manual' ? { background: '#f59e0b', color: '#000' } : { color: '#6b7280' }}>
                    <i className="ri-list-check text-sm"></i>
                    Inserir manualmente
                  </button>
                </div>

                {/* ── M² Mode ── */}
                {mode === 'm2' && (
                  <div>
                    {/* Global area input */}
                    <div className="flex items-end gap-3 mb-4 p-4 rounded-xl" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
                      <div className="flex-1">
                        <label className="text-xs font-semibold block mb-1" style={{ color: '#f59e0b' }}>Área Total da Obra (m²)</label>
                        <div className="flex items-center gap-2">
                          <input type="number" min="0" step="0.5" placeholder="Ex: 120"
                            value={globalArea}
                            onChange={e => setGlobalArea(e.target.value)}
                            className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none font-bold"
                            style={{ background: '#0f1117', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b' }} />
                          <span className="text-sm font-bold" style={{ color: '#f59e0b' }}>m²</span>
                        </div>
                      </div>
                      <button onClick={applyGlobalArea}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap"
                        style={{ background: '#f59e0b', color: '#000' }}>
                        <i className="ri-refresh-line"></i> Aplicar a todos
                      </button>
                      <div className="text-xs" style={{ color: '#6b7280' }}>
                        <p>Cada produto pode ter</p>
                        <p>sua própria área abaixo</p>
                      </div>
                    </div>

                    {/* Product search — only m2 products */}
                    <div className="relative mb-3">
                      <div className="w-4 h-4 flex items-center justify-center absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#6b7280' }}>
                        <i className="ri-search-line text-sm"></i>
                      </div>
                      <input ref={productSearchRef} type="text"
                        placeholder="Buscar produto com cobertura por m² cadastrada..."
                        value={productSearch}
                        onChange={e => { setProductSearch(e.target.value); setShowProductDrop(true); }}
                        onFocus={() => setShowProductDrop(true)}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
                        style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
                      {showProductDrop && productSearch && (
                        <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-xl overflow-hidden" style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', maxHeight: '200px', overflowY: 'auto' }}>
                          {filteredProductSearch(m2Products).length === 0 ? (
                            <div className="px-4 py-3 text-sm" style={{ color: '#6b7280' }}>Nenhum produto com m² cadastrado encontrado</div>
                          ) : filteredProductSearch(m2Products).map(p => (
                            <button key={p.id} onClick={() => addM2Product(p.id)}
                              className="w-full text-left px-3 py-2.5 text-sm cursor-pointer transition-all flex items-center justify-between"
                              style={{ color: '#d1d5db', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                              <div>
                                <p className="font-medium">{p.name}</p>
                                <p className="text-xs" style={{ color: '#6b7280' }}>
                                  {p.sku} · 1 {p.unit} cobre {p.m2Coverage! >= 1 ? `${p.m2Coverage} m²` : `${(1 / p.m2Coverage!).toFixed(0)} un/m²`}
                                </p>
                              </div>
                              <span className="font-bold text-xs" style={{ color: '#f59e0b' }}>R$ {p.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/{p.unit}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* M² items table */}
                    {m2Items.length === 0 ? (
                      <div className="rounded-xl py-8 text-center" style={{ border: '2px dashed rgba(255,255,255,0.06)' }}>
                        <div className="w-10 h-10 flex items-center justify-center rounded-xl mx-auto mb-2" style={{ background: 'rgba(245,158,11,0.1)' }}>
                          <i className="ri-layout-grid-line text-xl" style={{ color: '#f59e0b' }}></i>
                        </div>
                        <p className="text-sm font-medium" style={{ color: '#6b7280' }}>Busque e adicione produtos acima</p>
                        <p className="text-xs mt-1" style={{ color: '#4b5563' }}>O sistema calcula automaticamente a quantidade necessária</p>
                      </div>
                    ) : (
                      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="grid text-xs font-semibold uppercase tracking-wider px-4 py-2.5" style={{ background: 'rgba(255,255,255,0.03)', color: '#4b5563', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto' }}>
                          <span>Produto</span>
                          <span className="text-center">Área (m²)</span>
                          <span className="text-center">Perda %</span>
                          <span className="text-center">Qtd calculada</span>
                          <span className="text-right">Total</span>
                          <span></span>
                        </div>
                        {m2Items.map(mi => {
                          const prod = products.find(p => p.id === mi.productId);
                          if (!prod || !prod.m2Coverage) return null;
                          const areaWithWaste = mi.area * (1 + mi.wastePct / 100);
                          const qty = Math.ceil(areaWithWaste / prod.m2Coverage);
                          const itemTotal = qty * prod.price;
                          const perM2 = mi.area > 0 ? itemTotal / mi.area : 0;
                          return (
                            <div key={mi.productId} className="grid items-center px-4 py-3 gap-2" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                              <div>
                                <p className="text-sm font-medium text-white">{prod.name}</p>
                                <p className="text-xs" style={{ color: '#6b7280' }}>
                                  {prod.m2Coverage >= 1
                                    ? `1 ${prod.unit} cobre ${prod.m2Coverage} m²`
                                    : `${Math.round(1 / prod.m2Coverage)} ${prod.unit}/m²`}
                                  {' · '}R$ {prod.price.toFixed(2)}/{prod.unit}
                                </p>
                              </div>
                              <div className="flex items-center justify-center">
                                <input type="number" min="0" step="0.5" value={mi.area}
                                  onChange={e => updateM2Item(mi.productId, 'area', parseFloat(e.target.value) || 0)}
                                  className="w-20 px-2 py-1.5 rounded-lg text-sm text-center outline-none"
                                  style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
                              </div>
                              <div className="flex items-center justify-center gap-1">
                                <input type="number" min="0" max="50" step="1" value={mi.wastePct}
                                  onChange={e => updateM2Item(mi.productId, 'wastePct', parseFloat(e.target.value) || 0)}
                                  className="w-16 px-2 py-1.5 rounded-lg text-sm text-center outline-none"
                                  style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
                                <span className="text-xs" style={{ color: '#6b7280' }}>%</span>
                              </div>
                              <div className="text-center">
                                <p className="text-sm font-bold text-white">{qty} {prod.unit}</p>
                                {mi.area > 0 && <p className="text-xs" style={{ color: '#6b7280' }}>R$ {perM2.toFixed(2)}/m²</p>}
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold" style={{ color: '#10b981' }}>R$ {itemTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                              </div>
                              <button onClick={() => removeM2Item(mi.productId)}
                                className="w-6 h-6 flex items-center justify-center rounded cursor-pointer" style={{ color: '#ef4444' }}>
                                <i className="ri-close-line text-sm"></i>
                              </button>
                            </div>
                          );
                        })}
                        {/* Totals */}
                        <div className="px-4 py-3 flex items-center justify-between" style={{ background: 'rgba(245,158,11,0.06)', borderTop: '1px solid rgba(245,158,11,0.15)' }}>
                          <div className="text-xs" style={{ color: '#6b7280' }}>
                            {m2Items.length} produto{m2Items.length !== 1 ? 's' : ''} · área média {m2Items.length > 0 ? (m2Items.reduce((s, i) => s + i.area, 0) / m2Items.length).toFixed(0) : 0} m²
                          </div>
                          <div className="text-right">
                            <p className="text-xs" style={{ color: '#6b7280' }}>Subtotal materiais</p>
                            <p className="text-lg font-bold" style={{ color: '#f59e0b' }}>R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Manual Mode ── */}
                {mode === 'manual' && (
                  <div>
                    <div className="relative mb-3">
                      <div className="w-4 h-4 flex items-center justify-center absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#6b7280' }}>
                        <i className="ri-search-line text-sm"></i>
                      </div>
                      <input type="text" placeholder="Buscar qualquer produto..."
                        value={productSearch}
                        onChange={e => { setProductSearch(e.target.value); setShowProductDrop(true); }}
                        onFocus={() => setShowProductDrop(true)}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
                        style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
                      {showProductDrop && productSearch && (
                        <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-xl overflow-hidden" style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', maxHeight: '200px', overflowY: 'auto' }}>
                          {filteredProductSearch(manualProducts).slice(0, 8).map(p => (
                            <button key={p.id} onClick={() => addManualItem(p)}
                              className="w-full text-left px-3 py-2.5 text-sm cursor-pointer transition-all flex items-center justify-between"
                              style={{ color: '#d1d5db', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                              <div>
                                <p className="font-medium">{p.name}</p>
                                <p className="text-xs" style={{ color: '#6b7280' }}>{p.sku} · {p.unit}</p>
                              </div>
                              <span className="font-bold text-xs" style={{ color: '#f59e0b' }}>R$ {p.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
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
                              {['Produto', 'Qtd', 'Preço Unit.', 'Total', ''].map(h => (
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
                                    onChange={e => updateManualQty(item.productId, Number(e.target.value))}
                                    className="w-16 px-2 py-1 rounded-lg text-sm text-center outline-none"
                                    style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
                                </td>
                                <td className="px-3 py-2">
                                  <input type="number" min="0" step="0.01" value={item.unitPrice}
                                    onChange={e => updateManualPrice(item.productId, Number(e.target.value))}
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
                )}
              </div>

              {/* ── Seção 3: Condições ── */}
              <div>
                <p className="text-xs font-bold mb-3 uppercase tracking-wider flex items-center gap-2" style={{ color: '#f59e0b' }}>
                  <i className="ri-settings-3-line"></i> Condições Comerciais
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs font-medium block mb-1" style={{ color: '#6b7280' }}>Desconto %</label>
                    <input type="number" min="0" max="100" value={form.discount}
                      onChange={e => setForm(f => ({ ...f, discount: Number(e.target.value) }))}
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none text-center"
                      style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1" style={{ color: '#6b7280' }}>Válido até</label>
                    <input type="date" value={form.validUntil}
                      onChange={e => setForm(f => ({ ...f, validUntil: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                      style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1" style={{ color: '#6b7280' }}>Status</label>
                    <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Quote['status'] }))}
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none cursor-pointer"
                      style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }}>
                      {['Rascunho', 'Enviado', 'Aprovado', 'Recusado', 'Expirado'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col justify-end">
                    <div className="rounded-xl p-3" style={{ background: '#0f1117', border: '1px solid rgba(245,158,11,0.2)' }}>
                      <p className="text-xs" style={{ color: '#6b7280' }}>Total do Orçamento</p>
                      <p className="text-xl font-bold" style={{ color: '#f59e0b' }}>R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      {form.discount > 0 && (
                        <p className="text-xs mt-0.5" style={{ color: '#ef4444' }}>- R$ {discountValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({form.discount}%)</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="text-xs font-medium block mb-1" style={{ color: '#6b7280' }}>Observações / Condições de Pagamento</label>
                  <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value.slice(0, 500) }))}
                    placeholder="Ex: Frete incluso, prazo de entrega 5 dias úteis, pagamento 50% entrada + 50% na entrega..."
                    rows={3} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                    style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
                  <p className="text-xs text-right mt-0.5" style={{ color: '#4b5563' }}>{form.notes.length}/500</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t flex items-center justify-between flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <div className="text-sm" style={{ color: '#6b7280' }}>
                {activeItems.length} produto{activeItems.length !== 1 ? 's' : ''} · Total: <strong style={{ color: '#f59e0b' }}>R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium cursor-pointer whitespace-nowrap"
                  style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>Cancelar</button>
                <button onClick={handleSave} disabled={!form.customerName || activeItems.length === 0}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap"
                  style={{ background: form.customerName && activeItems.length > 0 ? '#f59e0b' : 'rgba(255,255,255,0.06)', color: form.customerName && activeItems.length > 0 ? '#000' : '#4b5563' }}>
                  <i className="ri-save-line mr-2"></i>
                  {editingId ? 'Salvar Alterações' : 'Criar Orçamento'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Detail Modal ── */}
      {detailQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}
          onClick={() => setDetailQuote(null)}>
          <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <div>
                <p className="text-white font-bold">{detailQuote.number}</p>
                <p className="text-xs" style={{ color: '#6b7280' }}>Criado em {detailQuote.createdAt} · {detailQuote.sellerName}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: STATUS_STYLE[detailQuote.status]?.bg, color: STATUS_STYLE[detailQuote.status]?.color }}>
                  {detailQuote.status}
                </span>
                <button onClick={() => setDetailQuote(null)} className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer" style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>
                  <i className="ri-close-line"></i>
                </button>
              </div>
            </div>
            <div className="p-6 flex flex-col gap-4">
              {/* Cliente */}
              <div className="rounded-xl p-4" style={{ background: '#0f1117' }}>
                <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: '#6b7280' }}>Cliente</p>
                <p className="text-white font-semibold">{detailQuote.customerName}</p>
                {(detailQuote as Quote & { projectName?: string }).projectName && (
                  <p className="text-sm mt-0.5" style={{ color: '#f59e0b' }}>
                    <i className="ri-building-2-line mr-1"></i>
                    {(detailQuote as Quote & { projectName?: string }).projectName}
                  </p>
                )}
                {detailQuote.customerEmail && <p className="text-xs mt-1" style={{ color: '#6b7280' }}>{detailQuote.customerEmail}</p>}
                {detailQuote.customerPhone && <p className="text-xs" style={{ color: '#6b7280' }}>{detailQuote.customerPhone}</p>}
              </div>

              {/* Items */}
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="px-4 py-2" style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>Materiais</p>
                </div>
                {detailQuote.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3" style={{ borderBottom: i < detailQuote.items.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <div>
                      <p className="text-sm text-white font-medium">{item.productName}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
                        {item.quantity} {item.unit || 'un'} × R$ {item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        {item.m2Area ? ` · ${item.m2Area} m²` : ''}
                      </p>
                    </div>
                    <p className="text-sm font-bold" style={{ color: '#10b981' }}>R$ {item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="rounded-xl p-4" style={{ background: '#0f1117' }}>
                <div className="flex justify-between text-sm mb-1" style={{ color: '#6b7280' }}>
                  <span>Subtotal</span><span>R$ {detailQuote.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                {detailQuote.discount > 0 && (
                  <div className="flex justify-between text-sm mb-1" style={{ color: '#ef4444' }}>
                    <span>Desconto</span><span>- R$ {detailQuote.discount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold mt-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <span className="text-white">Total</span>
                  <span style={{ color: '#f59e0b' }}>R$ {detailQuote.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {detailQuote.notes && (
                <div className="rounded-xl p-4" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
                  <p className="text-xs font-semibold mb-1" style={{ color: '#f59e0b' }}>OBSERVAÇÕES</p>
                  <p className="text-sm" style={{ color: '#d1d5db' }}>{detailQuote.notes}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => printQuote(detailQuote)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap"
                  style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.2)' }}>
                  <i className="ri-printer-line"></i> Imprimir
                </button>
                <button onClick={() => { openEdit(detailQuote); setDetailQuote(null); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap"
                  style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                  <i className="ri-edit-line mr-2"></i>Editar
                </button>
                {detailQuote.status !== 'Aprovado' && (
                  <button onClick={() => { updateQuote(detailQuote.id, { status: 'Aprovado' }); setDetailQuote(null); showToast('Orçamento aprovado!'); }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap"
                    style={{ background: '#10b981', color: '#fff' }}>
                    <i className="ri-checkbox-circle-line mr-2"></i>Aprovar
                  </button>
                )}
                {detailQuote.status !== 'Recusado' && detailQuote.status !== 'Aprovado' && (
                  <button onClick={() => { updateQuote(detailQuote.id, { status: 'Recusado' }); setDetailQuote(null); showToast('Orçamento marcado como recusado.'); }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap"
                    style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                    <i className="ri-close-circle-line mr-2"></i>Recusar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="rounded-2xl p-6 w-full max-w-sm text-center" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="w-12 h-12 flex items-center justify-center rounded-2xl mx-auto mb-4" style={{ background: 'rgba(239,68,68,0.12)' }}>
              <i className="ri-delete-bin-line text-2xl" style={{ color: '#ef4444' }}></i>
            </div>
            <p className="text-white font-bold text-lg mb-1">Excluir orçamento?</p>
            <p className="text-sm mb-5" style={{ color: '#6b7280' }}>Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium cursor-pointer whitespace-nowrap" style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>Cancelar</button>
              <button onClick={() => { deleteQuote(deleteConfirm); setDeleteConfirm(null); showToast('Orçamento excluído.'); }} className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap" style={{ background: '#ef4444', color: '#fff' }}>Excluir</button>
            </div>
          </div>
        </div>
      )}

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
