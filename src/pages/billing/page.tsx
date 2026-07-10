import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ERPLayout from '@/components/feature/ERPLayout';
import { useERP } from '@/hooks/useERPContext';
import type { Invoice } from '@/types/erp';
import { printDocument } from '@/utils/printDocument';

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  Emitida: { bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
  Cancelada: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
  Pendente: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
};

const PAYMENT_OPTIONS = ['Dinheiro', 'PIX', 'Cartão de Débito', 'Cartão de Crédito', 'Boleto', 'Crediário', 'Transferência'];
const CFOP_OPTIONS = [
  { code: '5.102', label: '5.102 — Venda de mercadoria adquirida para revenda (dentro do estado)' },
  { code: '6.102', label: '6.102 — Venda de mercadoria adquirida para revenda (fora do estado)' },
  { code: '5.405', label: '5.405 — Venda de mercadoria sujeita ao regime de substituição tributária' },
  { code: '5.101', label: '5.101 — Venda de produção do estabelecimento' },
  { code: '5.949', label: '5.949 — Outra saída de mercadoria' },
];

interface FormState {
  customerName: string;
  customerDocument: string;
  value: string;
  payment: string;
  nature: string;
  cfop: string;
  notes: string;
  type: 'NF-e' | 'NFC-e';
  number: string;
}

const EMPTY_FORM: FormState = {
  customerName: '',
  customerDocument: '',
  value: '',
  payment: 'PIX',
  nature: 'Venda de mercadoria',
  cfop: '5.102',
  notes: '',
  type: 'NF-e',
  number: '',
};

export default function BillingPage() {
  const { invoices, addInvoice, updateInvoice, deleteInvoice } = useERP();
  const location = useLocation();
  const [typeFilter, setTypeFilter] = useState('Todos');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [search, setSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Invoice | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' }>({ msg: '', type: 'success' });
  const [saving, setSaving] = useState(false);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: 'success' }), 3000);
  };

  const filtered = useMemo(() => {
    return invoices.filter((i) => {
      const matchType = typeFilter === 'Todos' || i.type === typeFilter;
      const matchStatus = statusFilter === 'Todos' || i.status === statusFilter;
      const matchSearch = !search || i.customerName.toLowerCase().includes(search.toLowerCase()) || i.number.includes(search) || (i.customerDocument || '').includes(search);
      const matchMonth = !monthFilter || i.issuedAt.includes(monthFilter.split('-').reverse().join('/').slice(3));
      return matchType && matchStatus && matchSearch && matchMonth;
    });
  }, [invoices, typeFilter, statusFilter, search, monthFilter]);

  // Metrics
  const totalEmitido = invoices.filter(i => i.status === 'Emitida').reduce((s, i) => s + i.value, 0);
  const totalMes = useMemo(() => {
    const now = new Date();
    const mes = String(now.getMonth() + 1).padStart(2, '0');
    const ano = String(now.getFullYear());
    return invoices
      .filter(i => i.status === 'Emitida' && i.issuedAt.includes(`/${mes}/${ano}`))
      .reduce((s, i) => s + i.value, 0);
  }, [invoices]);

  // Pre-fill form from PDV query params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const customerName = params.get('customerName');
    const value = params.get('value');
    const saleId = params.get('saleId');
    const payment = params.get('payment');
    if (customerName && value) {
      setForm(f => ({
        ...f,
        customerName: customerName || '',
        value: value || '',
        payment: payment || 'PIX',
        number: '',
      }));
      setShowModal(true);
      // Clean URL without reload
      window.history.replaceState({}, '', '/billing');
    }
  }, [location.search]);

  const handleSave = async () => {
    if (!form.customerName.trim() || !form.value || !form.number.trim()) {
      showToast('Preencha número, cliente e valor.', 'error');
      return;
    }
    setSaving(true);
    try {
      await addInvoice({
        number: form.number.trim(),
        type: form.type,
        customerName: form.customerName.trim(),
        customerDocument: form.customerDocument.trim(),
        value: parseFloat(form.value.replace(',', '.')) || 0,
        status: 'Emitida',
        issuedAt: new Date().toLocaleDateString('pt-BR'),
      });
      setShowModal(false);
      setForm(EMPTY_FORM);
      showToast(`${form.type} registrada com sucesso!`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (inv: Invoice) => {
    await updateInvoice(inv.id, { status: 'Cancelada' });
    if (viewInvoice?.id === inv.id) setViewInvoice({ ...inv, status: 'Cancelada' });
    showToast('Nota fiscal cancelada.');
  };

  const handleDelete = async (inv: Invoice) => {
    await deleteInvoice(inv.id);
    setConfirmDelete(null);
    if (viewInvoice?.id === inv.id) setViewInvoice(null);
    showToast('Nota excluída do sistema.');
  };

  const exportCSV = () => {
    const header = 'Número,Data,Tipo,Cliente,CPF/CNPJ,Valor,Status\n';
    const rows = filtered.map(i =>
      `${i.number},${i.issuedAt},${i.type},"${i.customerName}","${i.customerDocument || ''}",${i.value.toFixed(2)},${i.status}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notas_fiscais_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exportado!');
  };

  const printInvoice = (inv: Invoice) => {
    const companyName = 'BS LOJA';
    const companyDoc = '';
    const companyAddress = '';
    const companyPhone = '';
    const companyIE = '';

    const statusBadge = (s: string) => {
      const map: Record<string, string> = { 'Emitida': 'badge-green', 'Pendente': 'badge-yellow', 'Cancelada': 'badge-red' };
      return `<span class="badge ${map[s] || 'badge-gray'}">${s}</span>`;
    };

    const html = `
      <div class="header">
        <div class="header-left">
          <h1>${companyName}</h1>
          <p>CNPJ: ${companyDoc} · IE: ${companyIE}</p>
          <p>${companyAddress}</p>
          <p>Tel: ${companyPhone}</p>
        </div>
        <div class="header-right">
          <div class="doc-label">${inv.type} — Nota Fiscal</div>
          <div class="doc-number">Nº ${inv.number}</div>
          <div style="margin-top:6px;">${statusBadge(inv.status)}</div>
          <p style="font-size:11px;color:#777;margin-top:4px;">Data de Emissão: ${inv.issuedAt}</p>
        </div>
      </div>

      <div style="background:#fff3cd;border:1px solid #ffc107;border-radius:6px;padding:8px 12px;margin-bottom:16px;font-size:11px;color:#856404;">
        <strong>DOCUMENTO AUXILIAR — CONTROLE INTERNO</strong><br/>
        Este documento é apenas um registro auxiliar. O ${inv.type} oficial foi emitido no sistema da SEFAZ/Sebrae.
      </div>

      <div class="grid-2 section">
        <div>
          <div class="section-title">Destinatário</div>
          <div class="field"><label>Nome / Razão Social</label><span>${inv.customerName}</span></div>
          ${inv.customerDocument ? `<div class="field"><label>CPF / CNPJ</label><span>${inv.customerDocument}</span></div>` : ''}
        </div>
        <div>
          <div class="section-title">Dados da Nota</div>
          <div class="field"><label>Tipo</label><span>${inv.type}</span></div>
          <div class="field"><label>Status</label><span>${inv.status}</span></div>
          <div class="field"><label>Data de Emissão</label><span>${inv.issuedAt}</span></div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Valores</div>
        <table>
          <thead>
            <tr>
              <th>Descrição</th>
              <th class="text-right">Valor (R$)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Valor Total da Nota Fiscal</td>
              <td class="text-right"><strong>R$ ${inv.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></td>
            </tr>
          </tbody>
        </table>
        <div class="totals">
          <div class="totals-row total"><span>VALOR TOTAL</span><span>R$ ${inv.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Informações Complementares</div>
        <div class="notes-box">
          Nota fiscal registrada no sistema em ${inv.issuedAt}.<br/>
          Para consultar o XML e DANFE oficial, acesse o portal da SEFAZ ou o emissor onde a nota foi gerada.<br/>
          Guarde os arquivos XML por pelo menos 5 anos conforme legislação fiscal vigente.
        </div>
      </div>

      <div class="signature-area">
        <div class="signature-line">Emitente: ${companyName}</div>
        <div class="signature-line">Destinatário: ${inv.customerName}</div>
      </div>

      <div class="footer">
        <span>${companyName} · CNPJ ${companyDoc}</span>
        <span>${inv.type} Nº ${inv.number} · Gerado em ${new Date().toLocaleDateString('pt-BR')}</span>
      </div>
    `;
    printDocument(`${inv.type} Nº ${inv.number} — ${inv.customerName}`, html);
  };

  return (
    <ERPLayout title="Controle de Notas Fiscais" subtitle="Registre e gerencie as NF-e e NFC-e emitidas no Sebrae ou outro emissor">

      {/* Aviso informativo */}
      <div className="flex items-start gap-3 p-4 rounded-2xl mb-6" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
          <i className="ri-information-line text-base" style={{ color: '#f59e0b' }}></i>
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: '#f59e0b' }}>Módulo de controle manual</p>
          <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>
            Emita suas notas no <strong style={{ color: '#d1d5db' }}>Emissor Gratuito do Sebrae</strong> ou portal da SEFAZ, depois registre aqui para manter o controle centralizado. Isso não emite notas — apenas organiza o seu histórico.
          </p>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Faturado', value: `R$ ${totalEmitido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: 'ri-money-dollar-circle-line', color: '#10b981' },
          { label: 'Faturado no Mês', value: `R$ ${totalMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: 'ri-calendar-check-line', color: '#f59e0b' },
          { label: 'NF-e Emitidas', value: String(invoices.filter(i => i.type === 'NF-e' && i.status === 'Emitida').length), icon: 'ri-file-text-line', color: '#8b5cf6' },
          { label: 'Canceladas', value: String(invoices.filter(i => i.status === 'Cancelada').length), icon: 'ri-close-circle-line', color: '#ef4444' },
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

      {/* Filtros e ações */}
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Tipo */}
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#1a1f2e' }}>
            {['Todos', 'NF-e', 'NFC-e'].map((t) => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer whitespace-nowrap transition-all"
                style={typeFilter === t ? { background: '#f59e0b', color: '#000' } : { color: '#6b7280' }}>{t}</button>
            ))}
          </div>
          {/* Status */}
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#1a1f2e' }}>
            {['Todos', 'Emitida', 'Pendente', 'Cancelada'].map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer whitespace-nowrap transition-all"
                style={statusFilter === s ? { background: '#f59e0b', color: '#000' } : { color: '#6b7280' }}>{s}</button>
            ))}
          </div>
          {/* Busca */}
          <div className="relative">
            <div className="w-4 h-4 flex items-center justify-center absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#6b7280' }}>
              <i className="ri-search-line text-sm"></i>
            </div>
            <input type="text" placeholder="Buscar cliente, número..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-xl text-sm outline-none w-48"
              style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
          </div>
          {/* Mês */}
          <input type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm outline-none cursor-pointer"
            style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: '#6b7280' }}>{filtered.length} nota{filtered.length !== 1 ? 's' : ''}</span>
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium cursor-pointer whitespace-nowrap"
            style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
            <i className="ri-download-line"></i> CSV
          </button>
          <button onClick={() => { setForm(EMPTY_FORM); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap"
            style={{ background: '#f59e0b', color: '#000' }}>
            <i className="ri-add-line"></i> Registrar Nota
          </button>
        </div>
      </div>

      {/* Tabela */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}>
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-14 h-14 flex items-center justify-center rounded-2xl mx-auto mb-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <i className="ri-file-text-line text-3xl" style={{ color: '#4b5563' }}></i>
            </div>
            <p className="text-white font-medium">Nenhuma nota registrada</p>
            <p className="text-sm mt-1" style={{ color: '#6b7280' }}>
              {invoices.length === 0 ? 'Clique em "Registrar Nota" para começar' : 'Tente ajustar os filtros'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Número', 'Data', 'Tipo', 'Cliente', 'CPF/CNPJ', 'Valor', 'Status', 'Ações'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: '#4b5563' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => {
                  const st = STATUS_STYLE[inv.status] || { bg: 'rgba(107,114,128,0.12)', color: '#6b7280' };
                  return (
                    <tr key={inv.id} className="transition-all" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                      <td className="px-4 py-3 text-sm font-semibold" style={{ color: '#f59e0b' }}>#{inv.number}</td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: '#6b7280' }}>{inv.issuedAt}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-md font-medium"
                          style={inv.type === 'NF-e' ? { background: 'rgba(245,158,11,0.12)', color: '#f59e0b' } : { background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>
                          {inv.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-white max-w-[180px] truncate">{inv.customerName}</td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: '#6b7280' }}>{inv.customerDocument || '—'}</td>
                      <td className="px-4 py-3 text-sm font-bold whitespace-nowrap" style={{ color: '#10b981' }}>R$ {inv.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: st.bg, color: st.color }}>{inv.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => setViewInvoice(inv)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer transition-all" style={{ color: '#6b7280' }}
                            title="Ver detalhes"
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#f59e0b'; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#6b7280'; }}>
                            <i className="ri-eye-line text-sm"></i>
                          </button>
                          <button onClick={() => printInvoice(inv)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer transition-all" style={{ color: '#6b7280' }}
                            title="Imprimir nota"
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#8b5cf6'; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#6b7280'; }}>
                            <i className="ri-printer-line text-sm"></i>
                          </button>
                          {inv.status === 'Emitida' && (
                            <button onClick={() => handleCancel(inv)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer transition-all" style={{ color: '#6b7280' }}
                              title="Marcar como cancelada"
                              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#6b7280'; }}>
                              <i className="ri-close-circle-line text-sm"></i>
                            </button>
                          )}
                          <button onClick={() => setConfirmDelete(inv)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer transition-all" style={{ color: '#6b7280' }}
                            title="Excluir registro"
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

      {/* Modal — Registrar Nota */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0" style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#1a1f2e' }}>
              <div>
                <h3 className="text-white font-bold text-lg">Registrar Nota Fiscal</h3>
                <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>Informe os dados da nota emitida no Sebrae/SEFAZ</p>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer" style={{ color: '#6b7280' }}>
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>
            <div className="p-6">
              {/* Tipo */}
              <div className="flex gap-2 mb-5">
                {(['NF-e', 'NFC-e'] as const).map((t) => (
                  <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap transition-all"
                    style={form.type === t
                      ? { background: '#f59e0b', color: '#000' }
                      : { background: 'rgba(255,255,255,0.05)', color: '#6b7280', border: '1px solid rgba(255,255,255,0.08)' }}>
                    {t}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Número da nota */}
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: '#6b7280' }}>Número da Nota *</label>
                  <input type="text" placeholder="Ex: 000123" value={form.number}
                    onChange={(e) => setForm(f => ({ ...f, number: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
                </div>
                {/* Valor */}
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: '#6b7280' }}>Valor Total (R$) *</label>
                  <input type="text" placeholder="0,00" value={form.value}
                    onChange={(e) => setForm(f => ({ ...f, value: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
                </div>
                {/* Cliente */}
                <div className="col-span-2">
                  <label className="text-xs font-medium block mb-1" style={{ color: '#6b7280' }}>Cliente / Destinatário *</label>
                  <input type="text" placeholder="Nome ou razão social" value={form.customerName}
                    onChange={(e) => setForm(f => ({ ...f, customerName: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
                </div>
                {/* CPF/CNPJ */}
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: '#6b7280' }}>CPF / CNPJ</label>
                  <input type="text" placeholder="000.000.000-00" value={form.customerDocument}
                    onChange={(e) => setForm(f => ({ ...f, customerDocument: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
                </div>
                {/* Pagamento */}
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: '#6b7280' }}>Forma de Pagamento</label>
                  <select value={form.payment} onChange={(e) => setForm(f => ({ ...f, payment: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none cursor-pointer"
                    style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }}>
                    {PAYMENT_OPTIONS.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                {/* Natureza */}
                <div className="col-span-2">
                  <label className="text-xs font-medium block mb-1" style={{ color: '#6b7280' }}>Natureza da Operação</label>
                  <input type="text" placeholder="Venda de mercadoria" value={form.nature}
                    onChange={(e) => setForm(f => ({ ...f, nature: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
                </div>
                {/* CFOP */}
                <div className="col-span-2">
                  <label className="text-xs font-medium block mb-1" style={{ color: '#6b7280' }}>CFOP</label>
                  <select value={form.cfop} onChange={(e) => setForm(f => ({ ...f, cfop: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none cursor-pointer"
                    style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }}>
                    {CFOP_OPTIONS.map(o => <option key={o.code} value={o.code}>{o.label}</option>)}
                  </select>
                </div>
                {/* Observações */}
                <div className="col-span-2">
                  <label className="text-xs font-medium block mb-1" style={{ color: '#6b7280' }}>Observações</label>
                  <textarea placeholder="Informações adicionais..." value={form.notes}
                    onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-none"
                    style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
                </div>
              </div>

              <div className="flex gap-3 mt-5">
                <button onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium cursor-pointer whitespace-nowrap"
                  style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>Cancelar</button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap transition-all"
                  style={{ background: saving ? 'rgba(245,158,11,0.5)' : '#f59e0b', color: '#000' }}>
                  {saving ? 'Salvando...' : 'Registrar Nota'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal — Detalhes */}
      {viewInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="rounded-2xl w-full max-w-lg overflow-hidden" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 flex items-center justify-center rounded-xl" style={{ background: 'rgba(245,158,11,0.12)' }}>
                  <i className="ri-file-text-line text-base" style={{ color: '#f59e0b' }}></i>
                </div>
                <div>
                  <h3 className="text-white font-bold">Nota Fiscal #{viewInvoice.number}</h3>
                  <p className="text-xs" style={{ color: '#6b7280' }}>{viewInvoice.type} — {viewInvoice.issuedAt}</p>
                </div>
              </div>
              <button onClick={() => setViewInvoice(null)} className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer" style={{ color: '#6b7280' }}>
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-5">
                {[
                  { label: 'Tipo', value: viewInvoice.type },
                  { label: 'Status', value: viewInvoice.status },
                  { label: 'Cliente / Destinatário', value: viewInvoice.customerName },
                  { label: 'CPF / CNPJ', value: viewInvoice.customerDocument || '—' },
                  { label: 'Data de Emissão', value: viewInvoice.issuedAt },
                  { label: 'Valor Total', value: `R$ ${viewInvoice.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
                ].map((f) => (
                  <div key={f.label} className="p-3 rounded-xl" style={{ background: '#0f1117' }}>
                    <p className="text-xs mb-1" style={{ color: '#6b7280' }}>{f.label}</p>
                    <p className="text-sm font-medium text-white">{f.value}</p>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-xl mb-5" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
                <p className="text-xs font-semibold mb-1" style={{ color: '#f59e0b' }}>Lembrete</p>
                <p className="text-xs" style={{ color: '#9ca3af' }}>
                  O XML e DANFE desta nota estão no portal da SEFAZ ou no emissor onde ela foi gerada (ex: Sebrae). Guarde esses arquivos por pelo menos 5 anos.
                </p>
              </div>

              <div className="flex gap-2 flex-wrap">
                <button onClick={() => printInvoice(viewInvoice)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap"
                  style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.2)' }}>
                  <i className="ri-printer-line"></i> Imprimir
                </button>
                {viewInvoice.status === 'Emitida' && (
                  <button onClick={() => { handleCancel(viewInvoice); setViewInvoice(null); }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium cursor-pointer whitespace-nowrap"
                    style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                    <i className="ri-close-circle-line"></i> Marcar Cancelada
                  </button>
                )}
                <button onClick={() => { setConfirmDelete(viewInvoice); setViewInvoice(null); }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium cursor-pointer whitespace-nowrap"
                  style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}>
                  <i className="ri-delete-bin-line"></i> Excluir
                </button>
                <button onClick={() => setViewInvoice(null)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium cursor-pointer whitespace-nowrap"
                  style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal — Confirmar exclusão */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="rounded-2xl p-6 w-full max-w-sm" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="w-12 h-12 flex items-center justify-center rounded-2xl mx-auto mb-4" style={{ background: 'rgba(239,68,68,0.12)' }}>
              <i className="ri-delete-bin-line text-2xl" style={{ color: '#ef4444' }}></i>
            </div>
            <h3 className="text-white font-bold text-center mb-2">Excluir nota #{confirmDelete.number}?</h3>
            <p className="text-sm text-center mb-5" style={{ color: '#6b7280' }}>
              Isso remove o registro do sistema. A nota emitida na SEFAZ não é afetada.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium cursor-pointer whitespace-nowrap"
                style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>Cancelar</button>
              <button onClick={() => handleDelete(confirmDelete)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap"
                style={{ background: '#ef4444', color: '#fff' }}>Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast.msg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl"
          style={{ background: toast.type === 'error' ? '#ef4444' : '#10b981', color: 'white' }}>
          <div className="w-5 h-5 flex items-center justify-center">
            <i className={toast.type === 'error' ? 'ri-error-warning-line' : 'ri-check-line'}></i>
          </div>
          <p className="text-sm font-semibold">{toast.msg}</p>
        </div>
      )}
    </ERPLayout>
  );
}
