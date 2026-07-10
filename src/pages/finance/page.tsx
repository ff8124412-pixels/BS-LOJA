import { useState } from 'react';
import ERPLayout from '@/components/feature/ERPLayout';
import { invoices, accountsReceivable, accountsPayable } from '@/mocks/finance';

const invoiceStatus: Record<string, { bg: string; color: string }> = {
  'Emitida': { bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
  'Cancelada': { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
  'Pendente': { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
};

const arStatus: Record<string, { bg: string; color: string }> = {
  'A vencer': { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  'Vencido': { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
  'Pago': { bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
};

export default function FinancePage() {
  const [tab, setTab] = useState<'invoices' | 'receivable' | 'payable'>('invoices');

  return (
    <ERPLayout title="Financeiro & Faturamento" subtitle="Notas fiscais, contas a receber e a pagar">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Faturamento Mensal', value: 'R$ 167.450,75', icon: 'ri-bill-line', color: '#10b981' },
          { label: 'A Receber', value: 'R$ 94.320,00', icon: 'ri-arrow-up-circle-line', color: '#f59e0b' },
          { label: 'A Pagar', value: 'R$ 67.600,00', icon: 'ri-arrow-down-circle-line', color: '#ef4444' },
          { label: 'NFs Emitidas (mês)', value: '89', icon: 'ri-file-text-line', color: '#8b5cf6' },
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
      <div className="flex gap-1 p-1 rounded-xl mb-5 w-fit" style={{ background: '#1a1f2e' }}>
        {[
          { key: 'invoices', label: 'Notas Fiscais' },
          { key: 'receivable', label: 'Contas a Receber' },
          { key: 'payable', label: 'Contas a Pagar' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer whitespace-nowrap transition-all"
            style={tab === t.key ? { background: '#f59e0b', color: '#000' } : { color: '#6b7280' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}>
        {tab === 'invoices' && (
          <>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <p className="text-white font-semibold">Notas Fiscais Emitidas</p>
              <div className="flex gap-2">
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap" style={{ background: '#f59e0b', color: '#000' }}>
                  <i className="ri-add-line"></i> Emitir NF-e
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer whitespace-nowrap" style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>
                  <i className="ri-download-line"></i> Exportar
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    {['Número', 'Data', 'Cliente', 'Tipo', 'Valor', 'Status', 'Ações'].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: '#4b5563' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => {
                    const st = invoiceStatus[inv.status] || { bg: 'rgba(107,114,128,0.12)', color: '#6b7280' };
                    return (
                      <tr key={inv.id} className="transition-all" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                        <td className="px-5 py-3 text-sm font-semibold" style={{ color: '#f59e0b' }}>#{inv.number}</td>
                        <td className="px-5 py-3 text-xs whitespace-nowrap" style={{ color: '#6b7280' }}>{inv.date}</td>
                        <td className="px-5 py-3 text-sm text-white">{inv.customer}</td>
                        <td className="px-5 py-3"><span className="text-xs px-2 py-0.5 rounded-md font-medium" style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>{inv.type}</span></td>
                        <td className="px-5 py-3 text-sm font-bold whitespace-nowrap" style={{ color: '#10b981' }}>R$ {inv.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td className="px-5 py-3"><span className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: st.bg, color: st.color }}>{inv.status}</span></td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1">
                            {['ri-eye-line', 'ri-download-line', 'ri-mail-send-line'].map((icon) => (
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
          </>
        )}

        {tab === 'receivable' && (
          <>
            <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <p className="text-white font-semibold">Contas a Receber</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    {['Cliente', 'Valor', 'Vencimento', 'Status', 'Ações'].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#4b5563' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {accountsReceivable.map((a) => {
                    const st = arStatus[a.status] || { bg: 'rgba(107,114,128,0.12)', color: '#6b7280' };
                    return (
                      <tr key={a.id} className="transition-all" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                        <td className="px-5 py-3 text-sm text-white">{a.customer}</td>
                        <td className="px-5 py-3 text-sm font-bold" style={{ color: '#10b981' }}>R$ {a.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td className="px-5 py-3 text-xs" style={{ color: '#6b7280' }}>{a.dueDate}</td>
                        <td className="px-5 py-3"><span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: st.bg, color: st.color }}>{a.status}</span></td>
                        <td className="px-5 py-3">
                          <button className="text-xs px-3 py-1 rounded-lg cursor-pointer whitespace-nowrap" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>Registrar pagamento</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'payable' && (
          <>
            <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <p className="text-white font-semibold">Contas a Pagar</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    {['Fornecedor', 'Valor', 'Vencimento', 'Status', 'Ações'].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#4b5563' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {accountsPayable.map((a) => {
                    const st = arStatus[a.status] || { bg: 'rgba(107,114,128,0.12)', color: '#6b7280' };
                    return (
                      <tr key={a.id} className="transition-all" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                        <td className="px-5 py-3 text-sm text-white">{a.supplier}</td>
                        <td className="px-5 py-3 text-sm font-bold" style={{ color: '#ef4444' }}>R$ {a.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td className="px-5 py-3 text-xs" style={{ color: '#6b7280' }}>{a.dueDate}</td>
                        <td className="px-5 py-3"><span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: st.bg, color: st.color }}>{a.status}</span></td>
                        <td className="px-5 py-3">
                          <button className="text-xs px-3 py-1 rounded-lg cursor-pointer whitespace-nowrap" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>Pagar</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </ERPLayout>
  );
}
