import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ERPLayout from '@/components/feature/ERPLayout';
import { useERP } from '@/hooks/useERPContext';
import PrintReceipt from '@/components/feature/PrintReceipt';
import type { Sale, PaymentSplit } from '@/types/erp';

const PAYMENT_METHODS = [
  { id: 'Dinheiro', label: 'Dinheiro', icon: 'ri-money-dollar-circle-line' },
  { id: 'PIX', label: 'PIX', icon: 'ri-qr-code-line' },
  { id: 'Débito', label: 'Débito', icon: 'ri-bank-card-line' },
  { id: 'Crédito', label: 'Crédito', icon: 'ri-bank-card-2-line' },
  { id: 'Boleto', label: 'Boleto', icon: 'ri-file-text-line' },
  { id: 'Crediário', label: 'Crediário', icon: 'ri-calendar-check-line' },
];

interface CartItem { id: string; name: string; price: number; unit: string; quantity: number; }

export default function PDVPage() {
  const { products, customers, addSale, auth } = useERP();
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('Todos');
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<typeof customers[0] | null>(null);
  const [showCustomerDrop, setShowCustomerDrop] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastTotal, setLastTotal] = useState(0);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [showPrint, setShowPrint] = useState(false);

  // Multi-payment
  const [splitMode, setSplitMode] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState('PIX');
  const [paymentSplits, setPaymentSplits] = useState<PaymentSplit[]>([]);
  const [splitMethod, setSplitMethod] = useState('Dinheiro');
  const [splitAmount, setSplitAmount] = useState('');

  const searchRef = useRef<HTMLInputElement>(null);

  const activeProducts = products.filter(p => p.status === 'Ativo');
  const categories = ['Todos', ...Array.from(new Set(activeProducts.map(p => p.category)))];

  const filtered = activeProducts.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()) || (p.barcode || '').includes(search);
    const matchCat = catFilter === 'Todos' || p.category === catFilter;
    return matchSearch && matchCat;
  });

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.document.includes(customerSearch)
  );

  // Auto-focus search on mount
  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const addToCart = useCallback((p: typeof activeProducts[0]) => {
    setCart(prev => {
      const ex = prev.find(i => i.id === p.id);
      if (ex) return prev.map(i => i.id === p.id ? { ...i, quantity: Math.min(i.quantity + 1, p.quantity) } : i);
      return [...prev, { id: p.id, name: p.name, price: p.price, unit: p.unit, quantity: 1 }];
    });
  }, [activeProducts]);

  const updateQty = (id: string, qty: number) => {
    if (qty <= 0) { setCart(prev => prev.filter(i => i.id !== id)); return; }
    const product = products.find(p => p.id === id);
    const maxQty = product ? product.quantity : qty;
    setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: Math.min(qty, maxQty) } : i));
  };

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const discountValue = (subtotal * discount) / 100;
  const total = subtotal - discountValue;
  const splitTotal = paymentSplits.reduce((s, p) => s + p.amount, 0);
  const splitRemaining = total - splitTotal;
  const canFinalize = cart.length > 0 && (!splitMode ? true : Math.abs(splitRemaining) < 0.01);

  const handleFinalize = useCallback(() => {
    if (!canFinalize) return;
    const paymentLabel = !splitMode ? selectedPayment
      : paymentSplits.length === 0 ? 'Sem pagamento'
      : paymentSplits.length === 1 ? paymentSplits[0].method
      : paymentSplits.map(p => p.method).join(' + ');
    const newSale = addSale({
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer?.name || 'Consumidor Final',
      items: cart.map(i => ({ productId: i.id, productName: i.name, quantity: i.quantity, unitPrice: i.price, total: i.price * i.quantity })),
      subtotal, discount: discountValue, total,
      payment: paymentLabel,
      payments: splitMode ? paymentSplits : undefined,
      notes: notes.trim() || undefined,
      status: 'Concluído',
      sellerId: auth.user?.id || '',
      sellerName: auth.user?.name || '',
    });
    setLastTotal(total);
    setLastSale(newSale);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setCart([]); setDiscount(0); setNotes('');
      setSelectedCustomer(null); setCustomerSearch('');
      setPaymentSplits([]); setSplitMode(false);
      searchRef.current?.focus();
    }, 6000);
  }, [canFinalize, splitMode, selectedPayment, paymentSplits, selectedCustomer, cart, subtotal, discountValue, total, notes, auth, addSale]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // F2 = finalizar venda
      if (e.key === 'F2') { e.preventDefault(); handleFinalize(); return; }
      // Escape = limpar busca
      if (e.key === 'Escape') { setSearch(''); searchRef.current?.focus(); return; }
      // Enter na busca = adicionar primeiro produto
      if (e.key === 'Enter' && document.activeElement === searchRef.current) {
        if (filtered.length > 0) { addToCart(filtered[0]); setSearch(''); }
        return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleFinalize, filtered, addToCart]);

  const paymentLabel = () => {
    if (!splitMode) return selectedPayment;
    if (paymentSplits.length === 0) return 'Sem pagamento';
    if (paymentSplits.length === 1) return paymentSplits[0].method;
    return paymentSplits.map(p => p.method).join(' + ');
  };

  const addSplitPayment = () => {
    const amt = parseFloat(splitAmount);
    if (!amt || amt <= 0) return;
    const capped = Math.min(amt, splitRemaining);
    setPaymentSplits(prev => [...prev, { method: splitMethod, amount: capped }]);
    setSplitAmount('');
  };

  const removeSplit = (idx: number) => {
    setPaymentSplits(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <ERPLayout title="PDV — Ponto de Venda" subtitle="Venda rápida · Enter para adicionar · F2 para finalizar · Esc para limpar">
      {activeProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="w-16 h-16 flex items-center justify-center rounded-2xl mb-4" style={{ background: 'rgba(245,158,11,0.12)' }}>
            <i className="ri-store-3-line text-3xl" style={{ color: '#f59e0b' }}></i>
          </div>
          <p className="text-white font-bold text-xl mb-2">PDV sem produtos</p>
          <p className="text-sm mb-4" style={{ color: '#6b7280' }}>Cadastre produtos no módulo de Estoque para começar a vender.</p>
        </div>
      ) : (
        <div className="flex gap-5" style={{ height: 'calc(100vh - 140px)' }}>
          {/* Products */}
          <div className="flex-1 flex flex-col min-w-0 gap-3">
            {/* Atalhos hint */}
            <div className="flex items-center gap-3 flex-wrap">
              {[
                { key: 'Enter', desc: 'Adicionar 1º produto' },
                { key: 'F2', desc: 'Finalizar venda' },
                { key: 'Esc', desc: 'Limpar busca' },
              ].map(k => (
                <span key={k.key} className="flex items-center gap-1.5 text-xs" style={{ color: '#4b5563' }}>
                  <kbd className="px-1.5 py-0.5 rounded text-xs font-mono" style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.1)' }}>{k.key}</kbd>
                  {k.desc}
                </span>
              ))}
            </div>

            <div className="relative">
              <div className="w-4 h-4 flex items-center justify-center absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#6b7280' }}>
                <i className="ri-barcode-line text-sm"></i>
              </div>
              <input
                ref={searchRef}
                type="text"
                placeholder="Buscar produto, SKU ou código de barras..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }}
              />
              {search && (
                <button onClick={() => { setSearch(''); searchRef.current?.focus(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center cursor-pointer" style={{ color: '#6b7280' }}>
                  <i className="ri-close-line text-sm"></i>
                </button>
              )}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {categories.map((cat) => (
                <button key={cat} onClick={() => setCatFilter(cat)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer whitespace-nowrap transition-all flex-shrink-0"
                  style={catFilter === cat ? { background: '#f59e0b', color: '#000' } : { background: '#1a1f2e', color: '#6b7280', border: '1px solid rgba(255,255,255,0.06)' }}>
                  {cat}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40" style={{ color: '#4b5563' }}>
                  <i className="ri-search-line text-3xl mb-2"></i>
                  <p className="text-sm">Nenhum produto encontrado</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                  {filtered.map((p, idx) => (
                    <button key={p.id} onClick={() => addToCart(p)} disabled={p.quantity === 0}
                      className="rounded-xl p-3 text-left transition-all cursor-pointer relative"
                      style={{ background: '#1a1f2e', border: `1px solid ${idx === 0 && search ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.06)'}`, opacity: p.quantity === 0 ? 0.5 : 1 }}
                      onMouseEnter={(e) => { if (p.quantity > 0) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(245,158,11,0.4)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = idx === 0 && search ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.06)'; }}>
                      {idx === 0 && search && (
                        <span className="absolute top-2 right-2 text-xs px-1.5 py-0.5 rounded font-bold" style={{ background: 'rgba(245,158,11,0.2)', color: '#f59e0b' }}>Enter</span>
                      )}
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ background: 'rgba(255,255,255,0.06)', color: '#6b7280' }}>{p.sku}</span>
                        <span className="text-xs" style={{ color: p.quantity <= p.minQuantity ? '#ef4444' : '#6b7280' }}>{p.quantity} {p.unit}</span>
                      </div>
                      <p className="text-sm font-medium text-white leading-tight mb-2">{p.name}</p>
                      <p className="text-base font-bold" style={{ color: '#f59e0b' }}>
                        R$ {p.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        <span className="text-xs font-normal ml-1" style={{ color: '#6b7280' }}>/{p.unit}</span>
                      </p>
                      {p.quantity === 0 && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>Sem estoque</p>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cart + Payment */}
          <div className="w-80 flex-shrink-0 flex flex-col gap-3 overflow-y-auto">
            {/* Customer */}
            <div className="rounded-xl p-3 relative flex-shrink-0" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="relative">
                <div className="w-4 h-4 flex items-center justify-center absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#6b7280' }}>
                  <i className="ri-user-line text-sm"></i>
                </div>
                <input type="text" placeholder="Buscar cliente (opcional)"
                  value={selectedCustomer ? selectedCustomer.name : customerSearch}
                  onChange={(e) => { setCustomerSearch(e.target.value); setSelectedCustomer(null); setShowCustomerDrop(true); }}
                  onFocus={() => setShowCustomerDrop(true)}
                  className="w-full pl-9 pr-4 py-2 rounded-lg text-sm outline-none"
                  style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.06)', color: '#d1d5db' }} />
                {selectedCustomer && (
                  <button onClick={() => { setSelectedCustomer(null); setCustomerSearch(''); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center cursor-pointer" style={{ color: '#6b7280' }}>
                    <i className="ri-close-line text-sm"></i>
                  </button>
                )}
              </div>
              {showCustomerDrop && !selectedCustomer && customerSearch && filteredCustomers.length > 0 && (
                <div className="absolute left-3 right-3 top-14 z-20 rounded-xl overflow-hidden" style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {filteredCustomers.slice(0, 4).map((c) => (
                    <button key={c.id} onClick={() => { setSelectedCustomer(c); setShowCustomerDrop(false); }}
                      className="w-full text-left px-3 py-2 text-sm cursor-pointer transition-all"
                      style={{ color: '#d1d5db' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs" style={{ color: '#6b7280' }}>{c.document}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Cart Items */}
            <div className="rounded-xl overflow-hidden flex flex-col flex-shrink-0" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)', minHeight: '160px', maxHeight: '220px' }}>
              <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <p className="text-white font-semibold text-sm">Carrinho</p>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                  {cart.reduce((s, i) => s + i.quantity, 0)} itens
                </span>
              </div>
              <div className="overflow-y-auto p-3 flex flex-col gap-2">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6" style={{ color: '#4b5563' }}>
                    <div className="w-8 h-8 flex items-center justify-center mb-1">
                      <i className="ri-shopping-cart-line text-xl"></i>
                    </div>
                    <p className="text-xs">Carrinho vazio</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.id} className="rounded-lg p-2.5" style={{ background: '#0f1117' }}>
                      <p className="text-xs font-medium text-white leading-tight mb-2">{item.name}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <button onClick={() => updateQty(item.id, item.quantity - 1)}
                            className="w-6 h-6 flex items-center justify-center rounded cursor-pointer text-xs font-bold"
                            style={{ background: 'rgba(255,255,255,0.08)', color: '#9ca3af' }}>-</button>
                          <span className="text-sm font-bold text-white w-8 text-center">{item.quantity}</span>
                          <button onClick={() => updateQty(item.id, item.quantity + 1)}
                            className="w-6 h-6 flex items-center justify-center rounded cursor-pointer text-xs font-bold"
                            style={{ background: 'rgba(255,255,255,0.08)', color: '#9ca3af' }}>+</button>
                        </div>
                        <span className="text-sm font-bold" style={{ color: '#10b981' }}>
                          R$ {(item.price * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Observações */}
            <div className="rounded-xl p-3 flex-shrink-0" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: '#6b7280' }}>OBSERVAÇÕES (opcional)</p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value.slice(0, 200))}
                placeholder="Ex: Entregar na obra, cliente pediu nota..."
                rows={2}
                className="w-full px-3 py-2 rounded-lg text-xs outline-none resize-none"
                style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.06)', color: '#d1d5db' }}
              />
              <p className="text-xs mt-1 text-right" style={{ color: '#4b5563' }}>{notes.length}/200</p>
            </div>

            {/* Payment */}
            <div className="rounded-xl p-3 flex-shrink-0" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}>
              {/* Toggle split */}
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold" style={{ color: '#6b7280' }}>PAGAMENTO</p>
                <button
                  onClick={() => { setSplitMode(!splitMode); setPaymentSplits([]); }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer whitespace-nowrap transition-all"
                  style={splitMode ? { background: 'rgba(245,158,11,0.15)', color: '#f59e0b' } : { background: 'rgba(255,255,255,0.06)', color: '#6b7280' }}>
                  <i className="ri-split-cells-horizontal text-xs"></i>
                  {splitMode ? 'Dividido' : 'Dividir'}
                </button>
              </div>

              {!splitMode ? (
                <div className="grid grid-cols-3 gap-1.5 mb-3">
                  {PAYMENT_METHODS.map((pm) => (
                    <button key={pm.id} onClick={() => setSelectedPayment(pm.id)}
                      className="flex flex-col items-center gap-1 py-2 rounded-lg cursor-pointer transition-all"
                      style={selectedPayment === pm.id
                        ? { background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', color: '#f59e0b' }
                        : { background: '#0f1117', border: '1px solid rgba(255,255,255,0.06)', color: '#6b7280' }}>
                      <div className="w-4 h-4 flex items-center justify-center">
                        <i className={`${pm.icon} text-sm`}></i>
                      </div>
                      <span className="text-xs font-medium whitespace-nowrap">{pm.label}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mb-3">
                  {paymentSplits.length > 0 && (
                    <div className="flex flex-col gap-1.5 mb-2">
                      {paymentSplits.map((sp, idx) => (
                        <div key={idx} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: '#0f1117' }}>
                          <span className="text-xs font-medium text-white">{sp.method}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold" style={{ color: '#10b981' }}>
                              R$ {sp.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                            <button onClick={() => removeSplit(idx)} className="w-4 h-4 flex items-center justify-center cursor-pointer" style={{ color: '#ef4444' }}>
                              <i className="ri-close-line text-xs"></i>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {splitRemaining > 0.01 && (
                    <div className="flex items-center gap-2 mb-2">
                      <select value={splitMethod} onChange={(e) => setSplitMethod(e.target.value)}
                        className="flex-1 px-2 py-1.5 rounded-lg text-xs outline-none cursor-pointer"
                        style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }}>
                        {PAYMENT_METHODS.map(pm => <option key={pm.id} value={pm.id}>{pm.label}</option>)}
                      </select>
                      <input type="number" min="0.01" step="0.01"
                        placeholder={splitRemaining.toFixed(2)}
                        value={splitAmount}
                        onChange={(e) => setSplitAmount(e.target.value)}
                        className="w-24 px-2 py-1.5 rounded-lg text-xs outline-none text-center"
                        style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
                      <button onClick={addSplitPayment}
                        className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer flex-shrink-0"
                        style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                        <i className="ri-add-line text-sm"></i>
                      </button>
                    </div>
                  )}
                  <div className="flex justify-between text-xs px-1">
                    <span style={{ color: '#6b7280' }}>Restante:</span>
                    <span style={{ color: splitRemaining > 0.01 ? '#f59e0b' : '#10b981', fontWeight: 'bold' }}>
                      R$ {Math.max(0, splitRemaining).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}

              {/* Discount */}
              <div className="flex items-center gap-2 mb-3">
                <label className="text-xs whitespace-nowrap" style={{ color: '#6b7280' }}>Desconto %</label>
                <input type="number" min="0" max="100" value={discount}
                  onChange={(e) => setDiscount(Math.min(100, Math.max(0, Number(e.target.value))))}
                  className="flex-1 px-2 py-1.5 rounded-lg text-sm outline-none text-center"
                  style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.06)', color: '#d1d5db' }} />
              </div>

              {/* Totals */}
              <div className="flex flex-col gap-1 mb-3 pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="flex justify-between text-xs" style={{ color: '#6b7280' }}>
                  <span>Subtotal</span>
                  <span>R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-xs" style={{ color: '#ef4444' }}>
                    <span>Desconto ({discount}%)</span>
                    <span>- R$ {discountValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold mt-1">
                  <span className="text-white">Total</span>
                  <span style={{ color: '#f59e0b' }}>R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <button onClick={handleFinalize} disabled={!canFinalize}
                className="w-full py-3 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap transition-all flex items-center justify-center gap-2"
                style={{ background: canFinalize ? '#f59e0b' : 'rgba(255,255,255,0.06)', color: canFinalize ? '#000' : '#4b5563' }}>
                <i className="ri-check-line"></i>
                {splitMode && splitRemaining > 0.01 ? `Falta R$ ${splitRemaining.toFixed(2)}` : 'Finalizar Venda'}
                {canFinalize && <kbd className="text-xs px-1 py-0.5 rounded font-mono opacity-60" style={{ background: 'rgba(0,0,0,0.2)' }}>F2</kbd>}
              </button>
              {cart.length > 0 && (
                <button onClick={() => { setCart([]); setPaymentSplits([]); }}
                  className="w-full py-2 rounded-xl text-xs font-medium cursor-pointer whitespace-nowrap mt-2"
                  style={{ color: '#ef4444' }}>
                  Cancelar venda
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showSuccess && lastSale && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl"
          style={{ background: '#10b981', color: 'white' }}>
          <div className="w-6 h-6 flex items-center justify-center">
            <i className="ri-check-double-line text-lg"></i>
          </div>
          <div>
            <p className="font-bold text-sm">Venda finalizada com sucesso!</p>
            <p className="text-xs opacity-80">Total: R$ {lastTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="flex items-center gap-2 ml-2">
            <button onClick={() => setShowPrint(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap"
              style={{ background: 'rgba(255,255,255,0.25)', color: 'white' }}>
              <i className="ri-printer-line"></i> Imprimir
            </button>
            <button
              onClick={() => {
                const params = new URLSearchParams({
                  customerName: lastSale.customerName,
                  value: String(lastSale.total),
                  saleId: lastSale.id,
                  payment: lastSale.payment,
                });
                navigate(`/billing?${params.toString()}`);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap"
              style={{ background: 'rgba(0,0,0,0.25)', color: 'white' }}>
              <i className="ri-file-text-line"></i> Gerar NF-e
            </button>
          </div>
        </div>
      )}

      {showPrint && lastSale && (
        <PrintReceipt sale={lastSale} onClose={() => setShowPrint(false)} />
      )}
    </ERPLayout>
  );
}
