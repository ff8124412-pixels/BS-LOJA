import { useState, useRef, useCallback } from 'react';
import ERPLayout from '@/components/feature/ERPLayout';
import { useERP } from '@/hooks/useERPContext';
import type { Product } from '@/types/erp';

const UNITS = ['un', 'sc', 'm³', 'br', 'rl', 'kg', 'gl', 'ch', 'cx', 'm', 'm²'];
const CATEGORIES = ['Cimentos e Argamassas', 'Tijolos e Blocos', 'Areia e Brita', 'Ferragens e Aços', 'Telhas e Coberturas', 'Tintas e Revestimentos', 'Hidráulica', 'Elétrica', 'Ferramentas', 'Outros'];
const WAREHOUSES = ['Depósito Principal', 'Depósito 2', 'Filial Centro', 'Filial Norte'];

const EMPTY_FORM = {
  sku: '', name: '', description: '', ncm: '', unit: 'un', brand: '',
  category: CATEGORIES[0], price: '', cost: '', quantity: '', minQuantity: '',
  barcode: '', warehouse: WAREHOUSES[0], status: 'Ativo' as const, image: '',
};

type FormState = typeof EMPTY_FORM;

// ─── Photo Upload Component ───────────────────────────────────────────────────
function PhotoUpload({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = useState('');
  const [tab, setTab] = useState<'upload' | 'url'>('upload');
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      onChange(result);
    };
    reader.readAsDataURL(file);
  }, [onChange]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleUrlApply = () => {
    if (urlInput.trim()) {
      onChange(urlInput.trim());
      setUrlInput('');
    }
  };

  return (
    <div className="col-span-2">
      <label className="text-xs font-medium block mb-2" style={{ color: '#6b7280' }}>Foto do Produto</label>

      {/* Preview */}
      {value && (
        <div className="relative mb-3 rounded-xl overflow-hidden" style={{ height: 160, background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)' }}>
          <img src={value} alt="Produto" className="w-full h-full object-contain" />
          <button
            onClick={() => onChange('')}
            className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer"
            style={{ background: 'rgba(239,68,68,0.85)', color: '#fff' }}
          >
            <i className="ri-close-line text-sm"></i>
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg mb-3" style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.06)' }}>
        {[{ key: 'upload', label: 'Enviar Arquivo' }, { key: 'url', label: 'URL da Imagem' }].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key as 'upload' | 'url')}
            className="flex-1 py-1.5 rounded-md text-xs font-medium cursor-pointer whitespace-nowrap transition-all"
            style={tab === t.key ? { background: '#f59e0b', color: '#000' } : { color: '#6b7280' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'upload' ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2 rounded-xl cursor-pointer transition-all py-6"
          style={{
            border: `2px dashed ${dragging ? '#f59e0b' : 'rgba(255,255,255,0.1)'}`,
            background: dragging ? 'rgba(245,158,11,0.05)' : 'rgba(255,255,255,0.02)',
          }}
        >
          <div className="w-10 h-10 flex items-center justify-center rounded-xl" style={{ background: 'rgba(245,158,11,0.12)' }}>
            <i className="ri-image-add-line text-xl" style={{ color: '#f59e0b' }}></i>
          </div>
          <p className="text-sm font-medium" style={{ color: '#d1d5db' }}>
            {dragging ? 'Solte a imagem aqui' : 'Clique ou arraste uma imagem'}
          </p>
          <p className="text-xs" style={{ color: '#4b5563' }}>PNG, JPG, WEBP — máx. 5MB</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="https://exemplo.com/imagem.jpg"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleUrlApply(); }}
            className="flex-1 px-3 py-2.5 rounded-lg text-sm outline-none"
            style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }}
          />
          <button
            type="button"
            onClick={handleUrlApply}
            className="px-4 py-2.5 rounded-lg text-sm font-semibold cursor-pointer whitespace-nowrap"
            style={{ background: '#f59e0b', color: '#000' }}
          >
            Aplicar
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Product Detail Modal ─────────────────────────────────────────────────────
function ProductDetailModal({ product, onClose, onEdit }: { product: Product; onClose: () => void; onEdit: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }}>
      <div className="rounded-2xl w-full max-w-lg overflow-hidden" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)' }}>
        {/* Image */}
        <div className="relative" style={{ height: 220, background: '#0f1117' }}>
          {product.image ? (
            <img src={product.image} alt={product.name} className="w-full h-full object-contain" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
              <div className="w-14 h-14 flex items-center justify-center rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <i className="ri-image-line text-3xl" style={{ color: '#4b5563' }}></i>
              </div>
              <p className="text-xs" style={{ color: '#4b5563' }}>Sem foto cadastrada</p>
            </div>
          )}
          <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer" style={{ background: 'rgba(0,0,0,0.5)', color: '#fff' }}>
            <i className="ri-close-line"></i>
          </button>
          <div className="absolute bottom-3 left-3">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={product.status === 'Ativo' ? { background: 'rgba(16,185,129,0.85)', color: '#fff' } : { background: 'rgba(107,114,128,0.85)', color: '#fff' }}>
              {product.status}
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <p className="text-xs font-mono mb-1" style={{ color: '#f59e0b' }}>{product.sku}</p>
              <h3 className="text-white font-bold text-lg leading-tight">{product.name}</h3>
              {product.brand && <p className="text-sm mt-0.5" style={{ color: '#6b7280' }}>{product.brand}</p>}
            </div>
            <div className="text-right">
              <p className="text-xs" style={{ color: '#6b7280' }}>Preço de Venda</p>
              <p className="text-xl font-bold" style={{ color: '#10b981' }}>R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          {product.description && (
            <p className="text-sm mb-4 leading-relaxed" style={{ color: '#9ca3af' }}>{product.description}</p>
          )}

          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: 'Estoque', value: `${product.quantity} ${product.unit}`, color: product.quantity <= product.minQuantity ? '#ef4444' : '#10b981' },
              { label: 'Mínimo', value: `${product.minQuantity} ${product.unit}`, color: '#6b7280' },
              { label: 'Custo', value: `R$ ${product.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, color: '#f59e0b' },
            ].map((item) => (
              <div key={item.label} className="rounded-xl p-3 text-center" style={{ background: '#0f1117' }}>
                <p className="text-xs mb-1" style={{ color: '#4b5563' }}>{item.label}</p>
                <p className="text-sm font-bold" style={{ color: item.color }}>{item.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs mb-5">
            {[
              { label: 'Categoria', value: product.category },
              { label: 'Depósito', value: product.warehouse || '—' },
              { label: 'NCM', value: product.ncm || '—' },
              { label: 'Cód. Barras', value: product.barcode || '—' },
            ].map((item) => (
              <div key={item.label} className="flex justify-between gap-2 py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ color: '#4b5563' }}>{item.label}</span>
                <span className="font-medium text-right" style={{ color: '#9ca3af' }}>{item.value}</span>
              </div>
            ))}
          </div>

          <button onClick={onEdit} className="w-full py-2.5 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap" style={{ background: '#f59e0b', color: '#000' }}>
            <i className="ri-edit-line mr-2"></i>Editar Produto
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function InventoryPage() {
  const { products, addProduct, updateProduct, deleteProduct, stockMovements, addStockMovement, auth } = useERP();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('Todos');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [tab, setTab] = useState<'products' | 'movements'>('products');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [showModal, setShowModal] = useState(false);
  const [showMovModal, setShowMovModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [movForm, setMovForm] = useState({ productId: '', type: 'Entrada' as const, quantity: '', reason: '', warehouse: WAREHOUSES[0] });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()) || (p.barcode || '').includes(search);
    const matchCat = catFilter === 'Todos' || p.category === catFilter;
    const matchStatus = statusFilter === 'Todos' || (statusFilter === 'Crítico' ? p.quantity <= p.minQuantity : statusFilter === 'Normal' ? p.quantity > p.minQuantity : true);
    return matchSearch && matchCat && matchStatus;
  });

  const openAdd = () => { setEditProduct(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = (p: Product) => {
    setEditProduct(p);
    setForm({ ...EMPTY_FORM, ...p, price: String(p.price), cost: String(p.cost), quantity: String(p.quantity), minQuantity: String(p.minQuantity), image: p.image || '' });
    setShowDetailModal(false);
    setShowModal(true);
  };
  const openDetail = (p: Product) => { setDetailProduct(p); setShowDetailModal(true); };

  const handleSave = () => {
    if (!form.sku || !form.name || !form.price) return;
    const data = {
      ...form,
      price: parseFloat(form.price) || 0,
      cost: parseFloat(form.cost) || 0,
      quantity: parseInt(form.quantity) || 0,
      minQuantity: parseInt(form.minQuantity) || 0,
    };
    if (editProduct) { updateProduct(editProduct.id, data); }
    else { addProduct(data); }
    setShowModal(false);
  };

  const handleMovement = () => {
    if (!movForm.productId || !movForm.quantity) return;
    const product = products.find(p => p.id === movForm.productId);
    if (!product) return;
    addStockMovement({
      productId: movForm.productId, productName: product.name,
      type: movForm.type, quantity: parseInt(movForm.quantity),
      reason: movForm.reason, warehouse: movForm.warehouse,
      userId: auth.user?.id || '', userName: auth.user?.name || '',
    });
    setShowMovModal(false);
    setMovForm({ productId: '', type: 'Entrada', quantity: '', reason: '', warehouse: WAREHOUSES[0] });
  };

  const criticalCount = products.filter(p => p.quantity <= p.minQuantity && p.status === 'Ativo').length;

  return (
    <ERPLayout title="Gestão de Estoque" subtitle="Produtos, movimentações e múltiplos depósitos">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total de Produtos', value: String(products.length), icon: 'ri-archive-stack-line', color: '#10b981' },
          { label: 'Estoque Crítico', value: String(criticalCount), icon: 'ri-error-warning-line', color: '#ef4444' },
          { label: 'Valor em Estoque', value: `R$ ${products.reduce((s, p) => s + p.cost * p.quantity, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: 'ri-money-dollar-circle-line', color: '#f59e0b' },
          { label: 'Movimentações', value: String(stockMovements.length), icon: 'ri-swap-box-line', color: '#8b5cf6' },
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

      {/* Tabs + Actions */}
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#1a1f2e' }}>
          {[{ key: 'products', label: 'Produtos' }, { key: 'movements', label: 'Movimentações' }].map((t) => (
            <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
              className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer whitespace-nowrap transition-all"
              style={tab === t.key ? { background: '#f59e0b', color: '#000' } : { color: '#6b7280' }}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 items-center">
          {tab === 'products' && (
            <>
              {/* View toggle */}
              <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#1a1f2e' }}>
                {[{ key: 'table', icon: 'ri-list-check' }, { key: 'grid', icon: 'ri-grid-line' }].map((v) => (
                  <button key={v.key} onClick={() => setViewMode(v.key as 'table' | 'grid')}
                    className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer transition-all"
                    style={viewMode === v.key ? { background: '#f59e0b', color: '#000' } : { color: '#6b7280' }}>
                    <i className={`${v.icon} text-sm`}></i>
                  </button>
                ))}
              </div>
              <button onClick={() => setShowMovModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer whitespace-nowrap"
                style={{ background: 'rgba(139,92,246,0.15)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.3)' }}>
                <i className="ri-swap-box-line"></i> Movimentar
              </button>
            </>
          )}
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap"
            style={{ background: '#f59e0b', color: '#000' }}>
            <i className="ri-add-line"></i> Novo Produto
          </button>
        </div>
      </div>

      {tab === 'products' && (
        <>
          {/* Filters */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <div className="w-4 h-4 flex items-center justify-center absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#6b7280' }}>
                <i className="ri-search-line text-sm"></i>
              </div>
              <input type="text" placeholder="Buscar por nome, SKU ou código de barras..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
            </div>
            <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl text-sm outline-none cursor-pointer"
              style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }}>
              <option>Todos</option>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#1a1f2e' }}>
              {['Todos', 'Normal', 'Crítico'].map((s) => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer whitespace-nowrap transition-all"
                  style={statusFilter === s ? { background: s === 'Crítico' ? '#ef4444' : '#f59e0b', color: '#000' } : { color: '#6b7280' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-2xl py-16 text-center" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="w-14 h-14 flex items-center justify-center rounded-2xl mx-auto mb-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <i className="ri-archive-line text-3xl" style={{ color: '#4b5563' }}></i>
              </div>
              <p className="text-white font-medium">Nenhum produto encontrado</p>
              <p className="text-sm mt-1" style={{ color: '#6b7280' }}>
                {products.length === 0 ? 'Cadastre seu primeiro produto clicando em "Novo Produto"' : 'Tente ajustar os filtros de busca'}
              </p>
              {products.length === 0 && (
                <button onClick={openAdd} className="mt-4 px-5 py-2 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap"
                  style={{ background: '#f59e0b', color: '#000' }}>Cadastrar primeiro produto</button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            /* Grid View */
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filtered.map((p) => {
                const isCritical = p.quantity <= p.minQuantity;
                return (
                  <div key={p.id} className="rounded-2xl overflow-hidden cursor-pointer transition-all group"
                    style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}
                    onClick={() => openDetail(p)}>
                    {/* Image */}
                    <div className="relative" style={{ height: 140, background: '#0f1117' }}>
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="w-full h-full object-contain transition-transform group-hover:scale-105" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <i className="ri-image-line text-3xl" style={{ color: '#2d3748' }}></i>
                        </div>
                      )}
                      {isCritical && (
                        <div className="absolute top-2 left-2">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.9)', color: '#fff' }}>Crítico</span>
                        </div>
                      )}
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); openEdit(p); }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer"
                          style={{ background: 'rgba(245,158,11,0.9)', color: '#000' }}>
                          <i className="ri-edit-line text-xs"></i>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(p.id); }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer"
                          style={{ background: 'rgba(239,68,68,0.9)', color: '#fff' }}>
                          <i className="ri-delete-bin-line text-xs"></i>
                        </button>
                      </div>
                    </div>
                    {/* Info */}
                    <div className="p-3">
                      <p className="text-xs font-mono mb-0.5" style={{ color: '#f59e0b' }}>{p.sku}</p>
                      <p className="text-sm font-semibold text-white leading-tight line-clamp-2 mb-2">{p.name}</p>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold" style={{ color: '#10b981' }}>R$ {p.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        <p className="text-xs" style={{ color: isCritical ? '#ef4444' : '#6b7280' }}>{p.quantity} {p.unit}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Table View */
            <div className="rounded-2xl overflow-hidden" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {['Foto', 'SKU', 'Produto', 'NCM', 'Categoria', 'Unid.', 'Marca', 'Depósito', 'Custo', 'Preço', 'Estoque', 'Mín.', 'Status', 'Ações'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: '#4b5563' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => {
                      const isCritical = p.quantity <= p.minQuantity;
                      return (
                        <tr key={p.id} className="transition-all" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                          {/* Photo cell */}
                          <td className="px-4 py-2">
                            <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center cursor-pointer"
                              style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.06)' }}
                              onClick={() => openDetail(p)}>
                              {p.image ? (
                                <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                              ) : (
                                <i className="ri-image-line text-sm" style={{ color: '#374151' }}></i>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs font-mono whitespace-nowrap" style={{ color: '#f59e0b' }}>{p.sku}</td>
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-white whitespace-nowrap cursor-pointer hover:underline" onClick={() => openDetail(p)}>{p.name}</p>
                            {p.description && <p className="text-xs truncate max-w-[160px]" style={{ color: '#6b7280' }}>{p.description}</p>}
                          </td>
                          <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: '#6b7280' }}>{p.ncm || '—'}</td>
                          <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-md whitespace-nowrap" style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>{p.category}</span></td>
                          <td className="px-4 py-3 text-xs text-center" style={{ color: '#9ca3af' }}>{p.unit}</td>
                          <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: '#9ca3af' }}>{p.brand || '—'}</td>
                          <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: '#9ca3af' }}>{p.warehouse || '—'}</td>
                          <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: '#9ca3af' }}>R$ {p.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="px-4 py-3 text-sm font-bold whitespace-nowrap" style={{ color: '#10b981' }}>R$ {p.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="px-4 py-3 text-sm font-bold whitespace-nowrap" style={{ color: isCritical ? '#ef4444' : '#d1d5db' }}>
                            {p.quantity.toLocaleString('pt-BR')} {p.unit}
                            {isCritical && <i className="ri-error-warning-line ml-1 text-xs" style={{ color: '#ef4444' }}></i>}
                          </td>
                          <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: '#6b7280' }}>{p.minQuantity}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                              style={p.status === 'Ativo' ? { background: 'rgba(16,185,129,0.12)', color: '#10b981' } : { background: 'rgba(107,114,128,0.12)', color: '#6b7280' }}>
                              {p.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <button onClick={() => openDetail(p)} className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer transition-all" style={{ color: '#6b7280' }}
                                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#8b5cf6'; }}
                                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#6b7280'; }}>
                                <i className="ri-eye-line text-sm"></i>
                              </button>
                              <button onClick={() => openEdit(p)} className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer transition-all" style={{ color: '#6b7280' }}
                                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#f59e0b'; }}
                                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#6b7280'; }}>
                                <i className="ri-edit-line text-sm"></i>
                              </button>
                              <button onClick={() => setDeleteConfirm(p.id)} className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer transition-all" style={{ color: '#6b7280' }}
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
            </div>
          )}
        </>
      )}

      {tab === 'movements' && (
        <div className="rounded-2xl overflow-hidden" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}>
          {stockMovements.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 flex items-center justify-center rounded-2xl mx-auto mb-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <i className="ri-swap-box-line text-3xl" style={{ color: '#4b5563' }}></i>
              </div>
              <p className="text-white font-medium">Nenhuma movimentação registrada</p>
              <p className="text-sm mt-1" style={{ color: '#6b7280' }}>Registre entradas, saídas e ajustes de estoque</p>
              <button onClick={() => setShowMovModal(true)} className="mt-4 px-5 py-2 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap"
                style={{ background: '#f59e0b', color: '#000' }}>Registrar movimentação</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['Data/Hora', 'Produto', 'Tipo', 'Quantidade', 'Depósito', 'Motivo', 'Usuário'].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: '#4b5563' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stockMovements.map((m) => {
                    const typeStyle: Record<string, { bg: string; color: string }> = {
                      'Entrada': { bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
                      'Saída': { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
                      'Ajuste': { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
                      'Transferência': { bg: 'rgba(139,92,246,0.12)', color: '#8b5cf6' },
                    };
                    const ts = typeStyle[m.type] || { bg: 'rgba(107,114,128,0.12)', color: '#6b7280' };
                    return (
                      <tr key={m.id} className="transition-all" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                        <td className="px-5 py-3 text-xs whitespace-nowrap" style={{ color: '#6b7280' }}>{m.createdAt}</td>
                        <td className="px-5 py-3 text-sm text-white">{m.productName}</td>
                        <td className="px-5 py-3"><span className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: ts.bg, color: ts.color }}>{m.type}</span></td>
                        <td className="px-5 py-3 text-sm font-bold" style={{ color: m.type === 'Entrada' ? '#10b981' : m.type === 'Saída' ? '#ef4444' : '#f59e0b' }}>
                          {m.type === 'Saída' ? '-' : '+'}{m.quantity}
                        </td>
                        <td className="px-5 py-3 text-xs whitespace-nowrap" style={{ color: '#9ca3af' }}>{m.warehouse}</td>
                        <td className="px-5 py-3 text-sm" style={{ color: '#9ca3af' }}>{m.reason || '—'}</td>
                        <td className="px-5 py-3 text-sm" style={{ color: '#9ca3af' }}>{m.userName}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Product Detail Modal */}
      {showDetailModal && detailProduct && (
        <ProductDetailModal
          product={detailProduct}
          onClose={() => setShowDetailModal(false)}
          onEdit={() => openEdit(detailProduct)}
        />
      )}

      {/* Product Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg">{editProduct ? 'Editar Produto' : 'Novo Produto'}</h3>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer" style={{ color: '#6b7280' }}>
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {/* Photo Upload */}
              <PhotoUpload value={form.image} onChange={(url) => setForm(prev => ({ ...prev, image: url }))} />

              {[
                { label: 'SKU *', key: 'sku', type: 'text', placeholder: 'CIM-001', full: false },
                { label: 'Código de Barras', key: 'barcode', type: 'text', placeholder: '7891234560001', full: false },
                { label: 'Nome do Produto *', key: 'name', type: 'text', placeholder: 'Cimento CP-II 50kg', full: true },
                { label: 'Descrição', key: 'description', type: 'text', placeholder: 'Descrição detalhada', full: true },
                { label: 'NCM', key: 'ncm', type: 'text', placeholder: '2523.29.10', full: false },
                { label: 'Marca', key: 'brand', type: 'text', placeholder: 'Votorantim', full: false },
                { label: 'Preço de Custo (R$) *', key: 'cost', type: 'number', placeholder: '0,00', full: false },
                { label: 'Preço de Venda (R$) *', key: 'price', type: 'number', placeholder: '0,00', full: false },
                { label: 'Quantidade em Estoque', key: 'quantity', type: 'number', placeholder: '0', full: false },
                { label: 'Estoque Mínimo', key: 'minQuantity', type: 'number', placeholder: '10', full: false },
              ].map((f) => (
                <div key={f.key} className={f.full ? 'col-span-2' : ''}>
                  <label className="text-xs font-medium block mb-1" style={{ color: '#6b7280' }}>{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder} value={(form as Record<string, string>)[f.key]}
                    onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
                </div>
              ))}
              {[
                { label: 'Unidade de Medida', key: 'unit', options: UNITS },
                { label: 'Categoria', key: 'category', options: CATEGORIES },
                { label: 'Depósito', key: 'warehouse', options: WAREHOUSES },
                { label: 'Status', key: 'status', options: ['Ativo', 'Inativo'] },
              ].map((f) => (
                <div key={f.key}>
                  <label className="text-xs font-medium block mb-1" style={{ color: '#6b7280' }}>{f.label}</label>
                  <select value={(form as Record<string, string>)[f.key]} onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
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
                {editProduct ? 'Salvar Alterações' : 'Cadastrar Produto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Movement Modal */}
      {showMovModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="rounded-2xl p-6 w-full max-w-md" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg">Movimentar Estoque</h3>
              <button onClick={() => setShowMovModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer" style={{ color: '#6b7280' }}>
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>
            {products.length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: '#6b7280' }}>Cadastre produtos antes de movimentar o estoque.</p>
            ) : (
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: '#6b7280' }}>Produto *</label>
                  <select value={movForm.productId} onChange={(e) => setMovForm(f => ({ ...f, productId: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none cursor-pointer"
                    style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }}>
                    <option value="">Selecione um produto</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name} (Estoque: {p.quantity} {p.unit})</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: '#6b7280' }}>Tipo de Movimentação *</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['Entrada', 'Saída', 'Ajuste', 'Transferência'] as const).map((t) => (
                      <button key={t} onClick={() => setMovForm(f => ({ ...f, type: t }))}
                        className="py-2 rounded-lg text-xs font-medium cursor-pointer whitespace-nowrap transition-all"
                        style={movForm.type === t
                          ? { background: t === 'Entrada' ? '#10b981' : t === 'Saída' ? '#ef4444' : t === 'Ajuste' ? '#f59e0b' : '#8b5cf6', color: '#fff' }
                          : { background: 'rgba(255,255,255,0.06)', color: '#6b7280' }}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: '#6b7280' }}>Quantidade *</label>
                  <input type="number" min="1" placeholder="0" value={movForm.quantity} onChange={(e) => setMovForm(f => ({ ...f, quantity: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: '#6b7280' }}>Depósito</label>
                  <select value={movForm.warehouse} onChange={(e) => setMovForm(f => ({ ...f, warehouse: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none cursor-pointer"
                    style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }}>
                    {WAREHOUSES.map((w) => <option key={w}>{w}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: '#6b7280' }}>Motivo / Observação</label>
                  <input type="text" placeholder="Ex: Compra de fornecedor, Venda, Inventário..." value={movForm.reason} onChange={(e) => setMovForm(f => ({ ...f, reason: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
                </div>
                <div className="flex gap-3 mt-2">
                  <button onClick={() => setShowMovModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium cursor-pointer whitespace-nowrap" style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>Cancelar</button>
                  <button onClick={handleMovement} className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap" style={{ background: '#f59e0b', color: '#000' }}>Registrar</button>
                </div>
              </div>
            )}
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
            <p className="text-white font-bold text-lg mb-1">Excluir produto?</p>
            <p className="text-sm mb-5" style={{ color: '#6b7280' }}>Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium cursor-pointer whitespace-nowrap" style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>Cancelar</button>
              <button onClick={() => { deleteProduct(deleteConfirm); setDeleteConfirm(null); }} className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap" style={{ background: '#ef4444', color: '#fff' }}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </ERPLayout>
  );
}
