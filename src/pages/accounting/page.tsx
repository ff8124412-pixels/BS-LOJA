import { useState, useMemo, useCallback } from 'react';
import ERPLayout from '@/components/feature/ERPLayout';
import { useERP } from '@/hooks/useERPContext';
import type { Sale } from '@/types/erp';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function parseBRDate(str: string): Date | null {
  const parts = str.split('/');
  if (parts.length !== 3) return null;
  return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
}

function toISO(str: string): string {
  const parts = str.split('/');
  if (parts.length !== 3) return str;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

function formatCurrency(v: number) {
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function downloadCSV(filename: string, rows: string[][]) {
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Date Filter Bar ──────────────────────────────────────────────────────────
interface DateFilterProps {
  dateFrom: string;
  dateTo: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  onClear: () => void;
  count: number;
  total?: number;
}

function DateFilterBar({ dateFrom, dateTo, onFromChange, onToChange, onClear, count, total }: DateFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl mb-4" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 flex items-center justify-center">
          <i className="ri-calendar-line text-sm" style={{ color: '#f59e0b' }}></i>
        </div>
        <span className="text-sm font-semibold text-white">Filtrar por período:</span>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs" style={{ color: '#6b7280' }}>De</label>
        <input
          type="date"
          value={dateFrom}
          onChange={e => onFromChange(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-sm outline-none cursor-pointer"
          style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.1)', color: '#d1d5db' }}
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs" style={{ color: '#6b7280' }}>Até</label>
        <input
          type="date"
          value={dateTo}
          onChange={e => onToChange(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-sm outline-none cursor-pointer"
          style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.1)', color: '#d1d5db' }}
        />
      </div>
      {(dateFrom || dateTo) && (
        <button
          onClick={onClear}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs cursor-pointer whitespace-nowrap"
          style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
          <i className="ri-close-line"></i> Limpar
        </button>
      )}
      <div className="ml-auto flex items-center gap-4">
        <span className="text-xs" style={{ color: '#6b7280' }}>
          <strong className="text-white">{count}</strong> registro{count !== 1 ? 's' : ''}
        </span>
        {total !== undefined && (
          <span className="text-xs" style={{ color: '#6b7280' }}>
            Total: <strong style={{ color: '#f59e0b' }}>{formatCurrency(total)}</strong>
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    'Concluído': { bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
    'Pendente': { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
    'Cancelado': { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
    'Em andamento': { bg: 'rgba(139,92,246,0.12)', color: '#8b5cf6' },
  };
  const s = map[status] ?? { bg: 'rgba(255,255,255,0.06)', color: '#9ca3af' };
  return (
    <span className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: s.bg, color: s.color }}>
      {status}
    </span>
  );
}

const PAYMENT_COLORS: Record<string, string> = {
  'Dinheiro': '#10b981', 'PIX': '#06b6d4', 'Boleto': '#f59e0b',
  'Cartão de Crédito': '#8b5cf6', 'Cartão de Débito': '#f97316',
  'Crediário': '#ef4444', 'Transferência': '#3b82f6',
};

type Tab = 'reports' | 'sales' | 'financial' | 'invoices' | 'stock';

// ─── DRE Visual Chart ─────────────────────────────────────────────────────────
function DREChart({ grossRevenue, deductions, das, icms, netRevenue }: {
  grossRevenue: number; deductions: number; das: number; icms: number; netRevenue: number;
}) {
  const max = Math.max(grossRevenue, 1);
  const items = [
    { label: 'Faturamento Bruto', value: grossRevenue, color: '#10b981', icon: 'ri-arrow-up-circle-line' },
    { label: 'Deduções (5%)', value: deductions, color: '#ef4444', icon: 'ri-subtract-line', negative: true },
    { label: 'DAS Simples (4%)', value: das, color: '#f97316', icon: 'ri-government-line', negative: true },
    { label: 'ICMS (3%)', value: icms, color: '#8b5cf6', icon: 'ri-percent-line', negative: true },
    { label: 'Faturamento Líquido', value: netRevenue, color: '#f59e0b', icon: 'ri-funds-line' },
  ];

  return (
    <div className="rounded-2xl p-5 mb-5" style={{ background: '#1a1f2e', border: '1px solid rgba(245,158,11,0.2)' }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 flex items-center justify-center rounded-xl" style={{ background: 'rgba(245,158,11,0.15)' }}>
          <i className="ri-file-chart-line text-base" style={{ color: '#f59e0b' }}></i>
        </div>
        <div>
          <p className="text-white font-semibold">DRE Visual — Demonstração do Resultado</p>
          <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>Composição do faturamento no período selecionado</p>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {items.map((item, i) => {
          const pct = max > 0 ? (item.value / max) * 100 : 0;
          return (
            <div key={i} className="flex items-center gap-3">
              <div className="w-7 h-7 flex items-center justify-center rounded-lg flex-shrink-0" style={{ background: `${item.color}18` }}>
                <i className={`${item.icon} text-xs`} style={{ color: item.color }}></i>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium" style={{ color: '#9ca3af' }}>{item.label}</span>
                  <span className="text-sm font-bold ml-3 flex-shrink-0" style={{ color: item.color }}>
                    {item.negative ? '- ' : ''}R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.max(pct, 1)}%`, background: item.color }}></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {/* Summary */}
      <div className="mt-4 pt-4 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <span className="text-xs" style={{ color: '#6b7280' }}>Margem líquida</span>
        <span className="text-lg font-bold" style={{ color: '#f59e0b' }}>
          {grossRevenue > 0 ? ((netRevenue / grossRevenue) * 100).toFixed(1) : '0'}%
        </span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AccountingPage() {
  const { sales, invoices, receivables, payables, stockMovements, products, auth } = useERP();
  const [tab, setTab] = useState<Tab>('reports');
  const [toast, setToast] = useState('');

  // Global date filter (used in reports tab)
  const [reportFrom, setReportFrom] = useState('');
  const [reportTo, setReportTo] = useState('');

  // Sales tab filters
  const [salesFrom, setSalesFrom] = useState('');
  const [salesTo, setSalesTo] = useState('');
  const [salesSearch, setSalesSearch] = useState('');
  const [salesStatus, setSalesStatus] = useState('Todos');
  const [salesPayment, setSalesPayment] = useState('Todos');
  const [salesSeller, setSalesSeller] = useState('Todos');
  const [sortField, setSortField] = useState<'createdAt' | 'total' | 'customerName'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  // Financial tab filters
  const [finFrom, setFinFrom] = useState('');
  const [finTo, setFinTo] = useState('');
  const [finType, setFinType] = useState('Todos');

  // Invoices tab filters
  const [invFrom, setInvFrom] = useState('');
  const [invTo, setInvTo] = useState('');
  const [invType, setInvType] = useState('Todos');

  // Stock tab filters
  const [stockFrom, setStockFrom] = useState('');
  const [stockTo, setStockTo] = useState('');
  const [stockType, setStockType] = useState('Todos');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  // ─── Date filter helper ───────────────────────────────────────────────────
  const inDateRange = useCallback((dateStr: string, from: string, to: string): boolean => {
    const d = parseBRDate(dateStr);
    if (!d) return true;
    if (from) {
      const f = new Date(from + 'T00:00:00');
      if (d < f) return false;
    }
    if (to) {
      const t = new Date(to + 'T23:59:59');
      if (d > t) return false;
    }
    return true;
  }, []);

  // ─── Filtered data ────────────────────────────────────────────────────────
  const filteredSales = useMemo(() => {
    return sales
      .filter(s => {
        const matchDate = inDateRange(s.createdAt, salesFrom, salesTo);
        const matchSearch = !salesSearch || s.customerName.toLowerCase().includes(salesSearch.toLowerCase()) || s.id.includes(salesSearch) || s.sellerName.toLowerCase().includes(salesSearch.toLowerCase());
        const matchStatus = salesStatus === 'Todos' || s.status === salesStatus;
        const matchPayment = salesPayment === 'Todos' || s.payment === salesPayment;
        const matchSeller = salesSeller === 'Todos' || s.sellerName === salesSeller;
        return matchDate && matchSearch && matchStatus && matchPayment && matchSeller;
      })
      .sort((a, b) => {
        let va: string | number = '', vb: string | number = '';
        if (sortField === 'total') { va = a.total; vb = b.total; }
        else if (sortField === 'customerName') { va = a.customerName; vb = b.customerName; }
        else { va = toISO(a.createdAt); vb = toISO(b.createdAt); }
        if (va < vb) return sortDir === 'asc' ? -1 : 1;
        if (va > vb) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
  }, [sales, salesFrom, salesTo, salesSearch, salesStatus, salesPayment, salesSeller, sortField, sortDir, inDateRange]);

  const filteredFinancial = useMemo(() => {
    const all = [...receivables, ...payables];
    return all.filter(f => {
      const matchDate = inDateRange(f.dueDate.includes('/') ? f.dueDate : new Date(f.dueDate).toLocaleDateString('pt-BR'), finFrom, finTo);
      const matchType = finType === 'Todos' || f.type === finType;
      return matchDate && matchType;
    });
  }, [receivables, payables, finFrom, finTo, finType, inDateRange]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(i => {
      const matchDate = inDateRange(i.issuedAt, invFrom, invTo);
      const matchType = invType === 'Todos' || i.type === invType;
      return matchDate && matchType;
    });
  }, [invoices, invFrom, invTo, invType, inDateRange]);

  const filteredStock = useMemo(() => {
    return stockMovements.filter(m => {
      const dateStr = m.createdAt.split(' ')[0];
      const matchDate = inDateRange(dateStr, stockFrom, stockTo);
      const matchType = stockType === 'Todos' || m.type === stockType;
      return matchDate && matchType;
    });
  }, [stockMovements, stockFrom, stockTo, stockType, inDateRange]);

  // Report-period filtered sales
  const reportSales = useMemo(() => {
    return sales.filter(s => s.status === 'Concluído' && inDateRange(s.createdAt, reportFrom, reportTo));
  }, [sales, reportFrom, reportTo, inDateRange]);

  // ─── Metrics ──────────────────────────────────────────────────────────────
  const grossRevenue = reportSales.reduce((s, sale) => s + sale.total, 0);
  const deductions = grossRevenue * 0.05;
  const taxBase = grossRevenue - deductions;
  const das = taxBase * 0.04;
  const icms = taxBase * 0.03;
  const netRevenue = grossRevenue - deductions - das - icms;

  const sellers = useMemo(() => [...new Set(sales.map(s => s.sellerName))], [sales]);
  const payments = useMemo(() => [...new Set(sales.map(s => s.payment))], [sales]);

  const salesTotal = filteredSales.reduce((s, v) => s + v.total, 0);
  const salesConcluded = filteredSales.filter(s => s.status === 'Concluído').reduce((s, v) => s + v.total, 0);
  const finTotal = filteredFinancial.reduce((s, f) => s + f.value, 0);
  const invTotal = filteredInvoices.reduce((s, i) => s + i.value, 0);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  // ─── Export functions ─────────────────────────────────────────────────────
  const exportSalesCSV = () => {
    const rows = [
      ['ID', 'Data', 'Cliente', 'Vendedor', 'Itens', 'Pagamento', 'Desconto', 'Total', 'Status'],
      ...filteredSales.map(s => [s.id.slice(0, 8), s.createdAt, s.customerName, s.sellerName, String(s.items.length), s.payment, s.discount.toFixed(2), s.total.toFixed(2), s.status]),
    ];
    downloadCSV(`vendas_${salesFrom || 'inicio'}_${salesTo || 'fim'}.csv`, rows);
    showToast('CSV de vendas exportado!');
  };

  const exportFinancialCSV = () => {
    const rows = [
      ['Tipo', 'Categoria', 'Descrição', 'Entidade', 'Vencimento', 'Valor', 'Status'],
      ...filteredFinancial.map(f => [f.type, f.category, f.description, f.entityName, f.dueDate, f.value.toFixed(2), f.status]),
    ];
    downloadCSV(`financeiro_${finFrom || 'inicio'}_${finTo || 'fim'}.csv`, rows);
    showToast('CSV financeiro exportado!');
  };

  const exportInvoicesCSV = () => {
    const rows = [
      ['Número', 'Tipo', 'Cliente', 'CPF/CNPJ', 'Valor', 'Data', 'Status'],
      ...filteredInvoices.map(i => [i.number, i.type, i.customerName, i.customerDocument || '', i.value.toFixed(2), i.issuedAt, i.status]),
    ];
    downloadCSV(`notas_fiscais_${invFrom || 'inicio'}_${invTo || 'fim'}.csv`, rows);
    showToast('CSV de notas fiscais exportado!');
  };

  const exportStockCSV = () => {
    const rows = [
      ['Produto', 'Tipo', 'Quantidade', 'Motivo', 'Depósito', 'Usuário', 'Data'],
      ...filteredStock.map(m => [m.productName, m.type, String(m.quantity), m.reason, m.warehouse, m.userName, m.createdAt]),
    ];
    downloadCSV(`movimentacoes_estoque_${stockFrom || 'inicio'}_${stockTo || 'fim'}.csv`, rows);
    showToast('CSV de estoque exportado!');
  };

  const exportDRE = () => {
    const rows = [
      ['DRE — Demonstração do Resultado do Exercício'],
      ['Período', `${reportFrom || 'Início'} a ${reportTo || 'Hoje'}`],
      [''],
      ['Descrição', 'Valor (R$)'],
      ['(+) Faturamento Bruto', grossRevenue.toFixed(2)],
      ['(-) Deduções (5%)', deductions.toFixed(2)],
      ['(=) Base de Cálculo', taxBase.toFixed(2)],
      ['(-) DAS Simples Nacional (4%)', das.toFixed(2)],
      ['(-) ICMS (3%)', icms.toFixed(2)],
      ['(=) Faturamento Líquido', netRevenue.toFixed(2)],
      [''],
      ['Total de Vendas', String(reportSales.length)],
      ['Ticket Médio', reportSales.length > 0 ? (grossRevenue / reportSales.length).toFixed(2) : '0,00'],
    ];
    downloadCSV(`DRE_${reportFrom || 'inicio'}_${reportTo || 'fim'}.csv`, rows);
    showToast('DRE exportado!');
  };

  const exportLivroCaixa = () => {
    const allFin = [...receivables, ...payables].filter(f => inDateRange(
      f.dueDate.includes('/') ? f.dueDate : new Date(f.dueDate).toLocaleDateString('pt-BR'),
      reportFrom, reportTo
    ));
    const rows = [
      ['Livro Caixa'],
      ['Período', `${reportFrom || 'Início'} a ${reportTo || 'Hoje'}`],
      [''],
      ['Tipo', 'Categoria', 'Descrição', 'Entidade', 'Vencimento', 'Valor', 'Status'],
      ...allFin.map(f => [f.type, f.category, f.description, f.entityName, f.dueDate, f.value.toFixed(2), f.status]),
    ];
    downloadCSV(`livro_caixa_${reportFrom || 'inicio'}_${reportTo || 'fim'}.csv`, rows);
    showToast('Livro Caixa exportado!');
  };

  const exportVendasDetalhado = () => {
    const rows = [
      ['Relatório de Vendas Detalhado'],
      ['Período', `${reportFrom || 'Início'} a ${reportTo || 'Hoje'}`],
      [''],
      ['ID Venda', 'Data', 'Cliente', 'Vendedor', 'Produto', 'Qtd', 'Preço Unit.', 'Total Item', 'Desconto Venda', 'Total Venda', 'Pagamento', 'Status'],
    ];
    reportSales.forEach(s => {
      s.items.forEach((item, idx) => {
        rows.push([
          s.id.slice(0, 8),
          s.createdAt,
          s.customerName,
          s.sellerName,
          item.productName,
          String(item.quantity),
          item.unitPrice.toFixed(2),
          item.total.toFixed(2),
          idx === 0 ? s.discount.toFixed(2) : '0',
          idx === 0 ? s.total.toFixed(2) : '',
          s.payment,
          s.status,
        ]);
      });
    });
    downloadCSV(`vendas_detalhado_${reportFrom || 'inicio'}_${reportTo || 'fim'}.csv`, rows);
    showToast('Relatório detalhado exportado!');
  };

  const exportEstoque = () => {
    const rows = [
      ['Relatório de Estoque Atual'],
      ['Gerado em', new Date().toLocaleDateString('pt-BR')],
      [''],
      ['SKU', 'Produto', 'Categoria', 'Unidade', 'Qtd Atual', 'Qtd Mínima', 'Situação', 'Preço Custo', 'Preço Venda'],
      ...products.map(p => [
        p.sku, p.name, p.category, p.unit,
        String(p.quantity), String(p.minQuantity),
        p.quantity <= p.minQuantity ? 'CRÍTICO' : 'OK',
        p.cost.toFixed(2), p.price.toFixed(2),
      ]),
    ];
    downloadCSV(`estoque_${new Date().toISOString().slice(0, 10)}.csv`, rows);
    showToast('Relatório de estoque exportado!');
  };

  const exportNotasFiscais = () => {
    const filtered = invoices.filter(i => inDateRange(i.issuedAt, reportFrom, reportTo));
    const rows = [
      ['Arquivo de Notas Fiscais'],
      ['Período', `${reportFrom || 'Início'} a ${reportTo || 'Hoje'}`],
      [''],
      ['Número', 'Tipo', 'Cliente', 'CPF/CNPJ', 'Valor', 'Data', 'Status'],
      ...filtered.map(i => [i.number, i.type, i.customerName, i.customerDocument || '', i.value.toFixed(2), i.issuedAt, i.status]),
    ];
    downloadCSV(`notas_fiscais_${reportFrom || 'inicio'}_${reportTo || 'fim'}.csv`, rows);
    showToast('Arquivo de NF-e exportado!');
  };

  const REPORT_LIST = [
    { id: 'dre', name: 'DRE — Demonstração do Resultado', type: 'DRE', desc: 'Faturamento bruto, deduções, impostos e líquido', icon: 'ri-file-chart-line', color: '#10b981', action: exportDRE },
    { id: 'vendas', name: 'Relatório de Vendas Detalhado', type: 'Vendas', desc: 'Todas as vendas com itens, clientes e vendedores', icon: 'ri-shopping-cart-2-line', color: '#f59e0b', action: exportVendasDetalhado },
    { id: 'caixa', name: 'Livro Caixa', type: 'Caixa', desc: 'Todas as entradas e saídas financeiras', icon: 'ri-book-2-line', color: '#8b5cf6', action: exportLivroCaixa },
    { id: 'nfe', name: 'Arquivo de Notas Fiscais', type: 'NF-e', desc: 'Todas as NF-e e NFC-e registradas', icon: 'ri-file-text-line', color: '#06b6d4', action: exportNotasFiscais },
    { id: 'estoque', name: 'Relatório de Estoque Atual', type: 'Estoque', desc: 'Posição atual de todos os produtos', icon: 'ri-archive-stack-line', color: '#f97316', action: exportEstoque },
  ];

  return (
    <ERPLayout title="Contabilidade & Relatórios" subtitle={`Área contábil — ${auth.user?.name ?? 'Contador'}`}>

      {/* Header badge */}
      <div className="flex items-center gap-3 mb-6 p-4 rounded-2xl" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
        <div className="w-10 h-10 flex items-center justify-center rounded-xl flex-shrink-0" style={{ background: 'rgba(245,158,11,0.15)' }}>
          <i className="ri-shield-check-line text-lg" style={{ color: '#f59e0b' }}></i>
        </div>
        <div>
          <p className="text-white font-semibold text-sm">Acesso Autorizado</p>
          <p className="text-xs" style={{ color: '#9ca3af' }}>Logado como <strong style={{ color: '#f59e0b' }}>{auth.user?.name}</strong> — {auth.user?.role}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Faturamento Bruto', value: grossRevenue, color: '#10b981', icon: 'ri-money-dollar-circle-line' },
          { label: 'Deduções (5%)', value: deductions, color: '#ef4444', icon: 'ri-subtract-line' },
          { label: 'Base de Cálculo', value: taxBase, color: '#f59e0b', icon: 'ri-calculator-line' },
          { label: 'DAS — Simples Nacional (4%)', value: das, color: '#8b5cf6', icon: 'ri-government-line' },
          { label: 'ICMS (3%)', value: icms, color: '#f97316', icon: 'ri-percent-line' },
          { label: 'Faturamento Líquido', value: netRevenue, color: '#10b981', icon: 'ri-funds-line' },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl p-4" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="w-9 h-9 flex items-center justify-center rounded-xl mb-3" style={{ background: `${c.color}20` }}>
              <i className={`${c.icon} text-base`} style={{ color: c.color }}></i>
            </div>
            <p className="text-white font-bold text-base leading-tight">{formatCurrency(c.value)}</p>
            <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{c.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl mb-5 flex-wrap" style={{ background: '#1a1f2e' }}>
        {[
          { key: 'reports', label: 'Relatórios', icon: 'ri-file-chart-line' },
          { key: 'sales', label: 'Vendas', icon: 'ri-shopping-cart-2-line' },
          { key: 'financial', label: 'Financeiro', icon: 'ri-bank-line' },
          { key: 'invoices', label: 'Notas Fiscais', icon: 'ri-file-text-line' },
          { key: 'stock', label: 'Movimentações', icon: 'ri-archive-stack-line' },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key as Tab)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer whitespace-nowrap transition-all"
            style={tab === t.key ? { background: '#f59e0b', color: '#000' } : { color: '#6b7280' }}>
            <i className={t.icon}></i> {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: RELATÓRIOS ── */}
      {tab === 'reports' && (
        <div>
          {/* Filtro de período global */}
          <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl mb-5" style={{ background: '#1a1f2e', border: '1px solid rgba(245,158,11,0.2)' }}>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 flex items-center justify-center">
                <i className="ri-calendar-2-line text-sm" style={{ color: '#f59e0b' }}></i>
              </div>
              <span className="text-sm font-semibold text-white">Período dos relatórios:</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs" style={{ color: '#6b7280' }}>De</label>
              <input type="date" value={reportFrom} onChange={e => setReportFrom(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-sm outline-none cursor-pointer"
                style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.1)', color: '#d1d5db' }} />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs" style={{ color: '#6b7280' }}>Até</label>
              <input type="date" value={reportTo} onChange={e => setReportTo(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-sm outline-none cursor-pointer"
                style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.1)', color: '#d1d5db' }} />
            </div>
            {(reportFrom || reportTo) && (
              <button onClick={() => { setReportFrom(''); setReportTo(''); }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs cursor-pointer whitespace-nowrap"
                style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                <i className="ri-close-line"></i> Limpar
              </button>
            )}
            <div className="ml-auto">
              <span className="text-xs" style={{ color: '#6b7280' }}>
                {reportFrom || reportTo
                  ? `${reportSales.length} vendas no período — ${formatCurrency(grossRevenue)}`
                  : `Todos os períodos — ${reportSales.length} vendas`}
              </span>
            </div>
          </div>

          {/* DRE Visual */}
          <DREChart
            grossRevenue={grossRevenue}
            deductions={deductions}
            das={das}
            icms={icms}
            netRevenue={netRevenue}
          />

          {/* Lista de relatórios */}
          <div className="rounded-2xl overflow-hidden" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <p className="text-white font-semibold">Relatórios disponíveis para download</p>
              <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
                {reportFrom || reportTo
                  ? `Período: ${reportFrom ? new Date(reportFrom + 'T00:00:00').toLocaleDateString('pt-BR') : 'início'} até ${reportTo ? new Date(reportTo + 'T00:00:00').toLocaleDateString('pt-BR') : 'hoje'}`
                  : 'Selecione um período acima para filtrar os dados exportados'}
              </p>
            </div>
            {REPORT_LIST.map((r, idx) => (
              <div key={r.id}
                className="px-5 py-4 flex items-center justify-between gap-4 transition-all"
                style={{ borderBottom: idx < REPORT_LIST.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 flex items-center justify-center rounded-xl flex-shrink-0" style={{ background: `${r.color}18` }}>
                    <i className={`${r.icon} text-base`} style={{ color: r.color }}></i>
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">{r.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{r.desc}</p>
                  </div>
                </div>
                <button
                  onClick={r.action}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap transition-all"
                  style={{ background: `${r.color}18`, color: r.color, border: `1px solid ${r.color}30` }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = `${r.color}30`; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = `${r.color}18`; }}>
                  <i className="ri-download-line"></i> Baixar CSV
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB: VENDAS ── */}
      {tab === 'sales' && (
        <div>
          <DateFilterBar
            dateFrom={salesFrom} dateTo={salesTo}
            onFromChange={setSalesFrom} onToChange={setSalesTo}
            onClear={() => { setSalesFrom(''); setSalesTo(''); }}
            count={filteredSales.length} total={salesTotal}
          />

          {/* Filtros adicionais */}
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="flex items-center gap-2 flex-1 min-w-[200px] px-3 py-2 rounded-xl" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="w-4 h-4 flex items-center justify-center">
                <i className="ri-search-line text-sm" style={{ color: '#6b7280' }}></i>
              </div>
              <input type="text" placeholder="Buscar cliente, ID, vendedor..." value={salesSearch}
                onChange={e => setSalesSearch(e.target.value)}
                className="bg-transparent outline-none text-sm w-full" style={{ color: '#e5e7eb' }} />
            </div>
            <select value={salesStatus} onChange={e => setSalesStatus(e.target.value)}
              className="px-3 py-2 rounded-xl text-sm cursor-pointer outline-none"
              style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)', color: '#e5e7eb' }}>
              <option value="Todos">Todos os status</option>
              {['Concluído', 'Pendente', 'Em andamento', 'Cancelado'].map(s => <option key={s}>{s}</option>)}
            </select>
            <select value={salesPayment} onChange={e => setSalesPayment(e.target.value)}
              className="px-3 py-2 rounded-xl text-sm cursor-pointer outline-none"
              style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)', color: '#e5e7eb' }}>
              <option value="Todos">Todos os pagamentos</option>
              {payments.map(p => <option key={p}>{p}</option>)}
            </select>
            <select value={salesSeller} onChange={e => setSalesSeller(e.target.value)}
              className="px-3 py-2 rounded-xl text-sm cursor-pointer outline-none"
              style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)', color: '#e5e7eb' }}>
              <option value="Todos">Todos os vendedores</option>
              {sellers.map(s => <option key={s}>{s}</option>)}
            </select>
            <button onClick={exportSalesCSV}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap"
              style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
              <i className="ri-download-line"></i> Exportar CSV
            </button>
          </div>

          {/* Resumo */}
          <div className="flex items-center gap-6 px-4 py-3 rounded-xl mb-4" style={{ background: '#1a1f2e' }}>
            <div><span className="text-xs" style={{ color: '#6b7280' }}>Vendas: </span><span className="text-sm font-bold text-white">{filteredSales.length}</span></div>
            <div><span className="text-xs" style={{ color: '#6b7280' }}>Total: </span><span className="text-sm font-bold" style={{ color: '#f59e0b' }}>{formatCurrency(salesTotal)}</span></div>
            <div><span className="text-xs" style={{ color: '#6b7280' }}>Concluídas: </span><span className="text-sm font-bold" style={{ color: '#10b981' }}>{formatCurrency(salesConcluded)}</span></div>
          </div>

          <div className="rounded-2xl overflow-hidden" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}>
            {filteredSales.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-14 h-14 flex items-center justify-center rounded-2xl mx-auto mb-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <i className="ri-shopping-cart-line text-3xl" style={{ color: '#4b5563' }}></i>
                </div>
                <p className="text-white font-medium">Nenhuma venda no período</p>
                <p className="text-sm mt-1" style={{ color: '#6b7280' }}>Ajuste os filtros de data</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {[
                        { label: 'ID', field: null },
                        { label: 'Data', field: 'createdAt' },
                        { label: 'Cliente', field: 'customerName' },
                        { label: 'Vendedor', field: null },
                        { label: 'Pagamento', field: null },
                        { label: 'Status', field: null },
                        { label: 'Total', field: 'total' },
                        { label: '', field: null },
                      ].map((h) => (
                        <th key={h.label}
                          className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap ${h.field ? 'cursor-pointer select-none' : ''}`}
                          style={{ color: '#4b5563' }}
                          onClick={() => h.field && toggleSort(h.field as typeof sortField)}>
                          <span className="flex items-center gap-1">
                            {h.label}
                            {h.field && sortField === h.field && (
                              <i className={`${sortDir === 'asc' ? 'ri-arrow-up-line' : 'ri-arrow-down-line'} text-xs`} style={{ color: '#f59e0b' }}></i>
                            )}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSales.map((sale) => (
                      <tr key={sale.id} className="transition-all cursor-pointer"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                        onClick={() => setSelectedSale(sale)}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                        <td className="px-4 py-3 text-xs font-mono font-semibold" style={{ color: '#f59e0b' }}>#{sale.id.slice(0, 8).toUpperCase()}</td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: '#9ca3af' }}>{sale.createdAt}</td>
                        <td className="px-4 py-3 text-sm text-white font-medium max-w-[160px] truncate">{sale.customerName}</td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: '#9ca3af' }}>{sale.sellerName}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-md whitespace-nowrap"
                            style={{ background: `${PAYMENT_COLORS[sale.payment] ?? '#6b7280'}18`, color: PAYMENT_COLORS[sale.payment] ?? '#9ca3af' }}>
                            {sale.payment}
                          </span>
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={sale.status} /></td>
                        <td className="px-4 py-3 text-sm font-bold whitespace-nowrap" style={{ color: '#10b981' }}>{formatCurrency(sale.total)}</td>
                        <td className="px-4 py-3">
                          <button className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer" style={{ color: '#6b7280' }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#f59e0b'; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#6b7280'; }}>
                            <i className="ri-eye-line text-sm"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: FINANCEIRO ── */}
      {tab === 'financial' && (
        <div>
          <DateFilterBar
            dateFrom={finFrom} dateTo={finTo}
            onFromChange={setFinFrom} onToChange={setFinTo}
            onClear={() => { setFinFrom(''); setFinTo(''); }}
            count={filteredFinancial.length} total={finTotal}
          />
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#1a1f2e' }}>
              {['Todos', 'Receita', 'Despesa'].map(t => (
                <button key={t} onClick={() => setFinType(t)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer whitespace-nowrap transition-all"
                  style={finType === t ? { background: '#f59e0b', color: '#000' } : { color: '#6b7280' }}>{t}</button>
              ))}
            </div>
            <button onClick={exportFinancialCSV}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap ml-auto"
              style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
              <i className="ri-download-line"></i> Exportar CSV
            </button>
          </div>
          <div className="rounded-2xl overflow-hidden" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}>
            {filteredFinancial.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-14 h-14 flex items-center justify-center rounded-2xl mx-auto mb-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <i className="ri-bank-line text-3xl" style={{ color: '#4b5563' }}></i>
                </div>
                <p className="text-white font-medium">Nenhum lançamento no período</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {['Tipo', 'Categoria', 'Descrição', 'Entidade', 'Vencimento', 'Valor', 'Status'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: '#4b5563' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFinancial.map((f) => (
                      <tr key={f.id} className="transition-all" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                        <td className="px-4 py-3">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-md"
                            style={f.type === 'Receita' ? { background: 'rgba(16,185,129,0.12)', color: '#10b981' } : { background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                            {f.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: '#9ca3af' }}>{f.category}</td>
                        <td className="px-4 py-3 text-sm text-white max-w-[200px] truncate">{f.description}</td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: '#9ca3af' }}>{f.entityName}</td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: '#6b7280' }}>{f.dueDate}</td>
                        <td className="px-4 py-3 text-sm font-bold whitespace-nowrap" style={{ color: f.type === 'Receita' ? '#10b981' : '#ef4444' }}>{formatCurrency(f.value)}</td>
                        <td className="px-4 py-3"><StatusBadge status={f.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: NOTAS FISCAIS ── */}
      {tab === 'invoices' && (
        <div>
          <DateFilterBar
            dateFrom={invFrom} dateTo={invTo}
            onFromChange={setInvFrom} onToChange={setInvTo}
            onClear={() => { setInvFrom(''); setInvTo(''); }}
            count={filteredInvoices.length} total={invTotal}
          />
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#1a1f2e' }}>
              {['Todos', 'NF-e', 'NFC-e'].map(t => (
                <button key={t} onClick={() => setInvType(t)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer whitespace-nowrap transition-all"
                  style={invType === t ? { background: '#f59e0b', color: '#000' } : { color: '#6b7280' }}>{t}</button>
              ))}
            </div>
            <button onClick={exportInvoicesCSV}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap ml-auto"
              style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
              <i className="ri-download-line"></i> Exportar CSV
            </button>
          </div>
          <div className="rounded-2xl overflow-hidden" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}>
            {filteredInvoices.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-14 h-14 flex items-center justify-center rounded-2xl mx-auto mb-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <i className="ri-file-text-line text-3xl" style={{ color: '#4b5563' }}></i>
                </div>
                <p className="text-white font-medium">Nenhuma nota fiscal no período</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {['Número', 'Tipo', 'Cliente', 'CPF/CNPJ', 'Valor', 'Data', 'Status'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: '#4b5563' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map((inv) => (
                      <tr key={inv.id} className="transition-all" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                        <td className="px-4 py-3 text-sm font-semibold" style={{ color: '#f59e0b' }}>#{inv.number}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded-md font-medium"
                            style={inv.type === 'NF-e' ? { background: 'rgba(245,158,11,0.12)', color: '#f59e0b' } : { background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>
                            {inv.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-white max-w-[160px] truncate">{inv.customerName}</td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: '#6b7280' }}>{inv.customerDocument || '—'}</td>
                        <td className="px-4 py-3 text-sm font-bold whitespace-nowrap" style={{ color: '#10b981' }}>{formatCurrency(inv.value)}</td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: '#6b7280' }}>{inv.issuedAt}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                            style={inv.status === 'Emitida' ? { background: 'rgba(16,185,129,0.12)', color: '#10b981' } : { background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: MOVIMENTAÇÕES DE ESTOQUE ── */}
      {tab === 'stock' && (
        <div>
          <DateFilterBar
            dateFrom={stockFrom} dateTo={stockTo}
            onFromChange={setStockFrom} onToChange={setStockTo}
            onClear={() => { setStockFrom(''); setStockTo(''); }}
            count={filteredStock.length}
          />
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#1a1f2e' }}>
              {['Todos', 'Entrada', 'Saída', 'Ajuste', 'Transferência'].map(t => (
                <button key={t} onClick={() => setStockType(t)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer whitespace-nowrap transition-all"
                  style={stockType === t ? { background: '#f59e0b', color: '#000' } : { color: '#6b7280' }}>{t}</button>
              ))}
            </div>
            <button onClick={exportStockCSV}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap ml-auto"
              style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
              <i className="ri-download-line"></i> Exportar CSV
            </button>
          </div>
          <div className="rounded-2xl overflow-hidden" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}>
            {filteredStock.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-14 h-14 flex items-center justify-center rounded-2xl mx-auto mb-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <i className="ri-archive-stack-line text-3xl" style={{ color: '#4b5563' }}></i>
                </div>
                <p className="text-white font-medium">Nenhuma movimentação no período</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {['Produto', 'Tipo', 'Quantidade', 'Motivo', 'Depósito', 'Usuário', 'Data'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: '#4b5563' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStock.map((m) => {
                      const typeColors: Record<string, { bg: string; color: string }> = {
                        'Entrada': { bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
                        'Saída': { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
                        'Ajuste': { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
                        'Transferência': { bg: 'rgba(139,92,246,0.12)', color: '#8b5cf6' },
                      };
                      const tc = typeColors[m.type] ?? { bg: 'rgba(255,255,255,0.06)', color: '#9ca3af' };
                      return (
                        <tr key={m.id} className="transition-all" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                          <td className="px-4 py-3 text-sm text-white max-w-[180px] truncate">{m.productName}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: tc.bg, color: tc.color }}>{m.type}</span>
                          </td>
                          <td className="px-4 py-3 text-sm font-bold text-center" style={{ color: m.type === 'Entrada' ? '#10b981' : m.type === 'Saída' ? '#ef4444' : '#f59e0b' }}>
                            {m.type === 'Saída' ? '-' : '+'}{m.quantity}
                          </td>
                          <td className="px-4 py-3 text-xs max-w-[160px] truncate" style={{ color: '#9ca3af' }}>{m.reason}</td>
                          <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: '#6b7280' }}>{m.warehouse}</td>
                          <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: '#9ca3af' }}>{m.userName}</td>
                          <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: '#6b7280' }}>{m.createdAt}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal detalhe da venda */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setSelectedSale(null)}>
          <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.1)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <p className="text-white font-bold">Venda #{selectedSale.id.slice(0, 8).toUpperCase()}</p>
                <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{selectedSale.createdAt} — {selectedSale.payment}</p>
              </div>
              <button onClick={() => setSelectedSale(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer" style={{ color: '#6b7280' }}>
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Cliente', value: selectedSale.customerName },
                  { label: 'Vendedor', value: selectedSale.sellerName },
                  { label: 'Pagamento', value: selectedSale.payment },
                  { label: 'Status', value: selectedSale.status },
                ].map(f => (
                  <div key={f.label} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <p className="text-xs mb-1" style={{ color: '#6b7280' }}>{f.label}</p>
                    <p className="text-sm font-semibold text-white">{f.value}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="px-4 py-2" style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>Itens</p>
                </div>
                {selectedSale.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5"
                    style={{ borderBottom: i < selectedSale.items.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <div>
                      <p className="text-sm text-white">{item.productName}</p>
                      <p className="text-xs" style={{ color: '#6b7280' }}>{item.quantity}x {formatCurrency(item.unitPrice)}</p>
                    </div>
                    <p className="text-sm font-bold" style={{ color: '#10b981' }}>{formatCurrency(item.total)}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span style={{ color: '#6b7280' }}>Subtotal</span>
                  <span className="text-white">{formatCurrency(selectedSale.subtotal)}</span>
                </div>
                {selectedSale.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span style={{ color: '#6b7280' }}>Desconto</span>
                    <span style={{ color: '#ef4444' }}>- {formatCurrency(selectedSale.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <span className="text-white">Total</span>
                  <span style={{ color: '#10b981' }}>{formatCurrency(selectedSale.total)}</span>
                </div>
              </div>
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
