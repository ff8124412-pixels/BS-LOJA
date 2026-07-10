import { useRef } from 'react';
import type { Sale } from '@/types/erp';

interface PrintReceiptProps {
  sale: Sale;
  companyName?: string;
  companyCNPJ?: string;
  companyAddress?: string;
  companyPhone?: string;
  onClose: () => void;
}

export default function PrintReceipt({
  sale,
  companyName = 'BS LOJA',
  companyCNPJ = '',
  companyAddress = '',
  companyPhone = '',
  onClose,
}: PrintReceiptProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const paymentsHtml = sale.payments && sale.payments.length > 1
    ? sale.payments.map(p =>
        `<div class="row"><span>${p.method}:</span><span>R$ ${p.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>`
      ).join('')
    : `<div class="row"><span>Pagamento:</span><span>${sale.payment}</span></div>`;

  const notesHtml = sale.notes
    ? `<div class="divider"></div><div class="bold" style="margin-bottom:2px;">OBSERVAÇÕES</div><div style="font-size:11px;color:#333;">${sale.notes}</div>`
    : '';

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=420,height=750');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Cupom — ${sale.id.slice(0, 8).toUpperCase()}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Courier New', Courier, monospace; font-size: 12px; color: #000; background: #fff; padding: 16px; width: 300px; margin: 0 auto; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .row { display: flex; justify-content: space-between; margin: 2px 0; }
            .row-item { display: flex; justify-content: space-between; margin: 3px 0; }
            .company-name { font-size: 15px; font-weight: bold; text-align: center; margin-bottom: 2px; }
            .small { font-size: 10px; color: #333; }
            .total-row { display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; margin: 4px 0; }
            .footer { text-align: center; margin-top: 12px; font-size: 10px; color: #555; }
            @media print { body { padding: 0; } @page { margin: 0; size: 80mm auto; } }
          </style>
        </head>
        <body>
          <div class="company-name">${companyName}</div>
          <div class="center small">CNPJ: ${companyCNPJ}</div>
          <div class="center small">${companyAddress}</div>
          <div class="center small">Tel: ${companyPhone}</div>
          <div class="divider"></div>
          <div class="center bold" style="font-size:13px;">CUPOM NÃO FISCAL</div>
          <div class="divider"></div>
          <div class="row"><span>Nº Venda:</span><span class="bold">${sale.id.slice(0, 8).toUpperCase()}</span></div>
          <div class="row"><span>Data:</span><span>${sale.createdAt}</span></div>
          <div class="row"><span>Cliente:</span><span>${sale.customerName}</span></div>
          <div class="row"><span>Vendedor:</span><span>${sale.sellerName}</span></div>
          ${paymentsHtml}
          <div class="divider"></div>
          <div class="bold" style="margin-bottom:4px;">ITENS</div>
          ${sale.items.map((item) => `
            <div style="margin-bottom:4px;">
              <div>${item.productName}</div>
              <div class="row-item">
                <span class="small">${item.quantity} x R$ ${item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                <span class="bold">R$ ${item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          `).join('')}
          <div class="divider"></div>
          <div class="row"><span>Subtotal:</span><span>R$ ${sale.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
          ${sale.discount > 0 ? `<div class="row"><span>Desconto:</span><span>- R$ ${sale.discount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>` : ''}
          <div class="divider"></div>
          <div class="total-row"><span>TOTAL:</span><span>R$ ${sale.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
          ${notesHtml}
          <div class="divider"></div>
          <div class="footer">
            <div>Obrigado pela preferência!</div>
            <div style="margin-top:4px;">Volte sempre — ${companyName}</div>
            <div style="margin-top:8px; font-size:9px;">Documento sem valor fiscal</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
      <div className="rounded-2xl w-full max-w-sm overflow-hidden" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg" style={{ background: 'rgba(245,158,11,0.12)' }}>
              <i className="ri-printer-line text-sm" style={{ color: '#f59e0b' }}></i>
            </div>
            <div>
              <p className="text-white font-bold text-sm">Imprimir Cupom</p>
              <p className="text-xs" style={{ color: '#6b7280' }}>Venda #{sale.id.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer" style={{ color: '#6b7280' }}>
            <i className="ri-close-line text-base"></i>
          </button>
        </div>

        {/* Preview */}
        <div className="p-5 max-h-[65vh] overflow-y-auto">
          <div
            ref={printRef}
            className="rounded-xl p-4 mx-auto"
            style={{ background: '#fff', color: '#000', fontFamily: '\'Courier New\', Courier, monospace', fontSize: '11px', maxWidth: '260px', lineHeight: '1.5' }}
          >
            <div className="text-center font-bold text-sm mb-0.5">{companyName}</div>
            <div className="text-center text-xs text-gray-600">CNPJ: {companyCNPJ}</div>
            <div className="text-center text-xs text-gray-600">{companyAddress}</div>
            <div className="text-center text-xs text-gray-600">Tel: {companyPhone}</div>
            <div className="border-t border-dashed border-gray-400 my-2"></div>
            <div className="text-center font-bold text-xs mb-1">CUPOM NÃO FISCAL</div>
            <div className="border-t border-dashed border-gray-400 my-2"></div>

            <div className="flex justify-between text-xs mb-0.5"><span>Nº Venda:</span><span className="font-bold">{sale.id.slice(0, 8).toUpperCase()}</span></div>
            <div className="flex justify-between text-xs mb-0.5"><span>Data:</span><span>{sale.createdAt}</span></div>
            <div className="flex justify-between text-xs mb-0.5"><span>Cliente:</span><span className="truncate ml-2 text-right">{sale.customerName}</span></div>
            <div className="flex justify-between text-xs mb-0.5"><span>Vendedor:</span><span>{sale.sellerName}</span></div>

            {/* Payments */}
            {sale.payments && sale.payments.length > 1 ? (
              sale.payments.map((p, i) => (
                <div key={i} className="flex justify-between text-xs mb-0.5">
                  <span>{p.method}:</span>
                  <span>R$ {p.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              ))
            ) : (
              <div className="flex justify-between text-xs mb-0.5"><span>Pagamento:</span><span>{sale.payment}</span></div>
            )}

            <div className="border-t border-dashed border-gray-400 my-2"></div>
            <div className="font-bold text-xs mb-1">ITENS</div>
            {sale.items.map((item, idx) => (
              <div key={idx} className="mb-1.5">
                <div className="text-xs font-medium">{item.productName}</div>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>{item.quantity} x R$ {item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  <span className="font-bold text-black">R$ {item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            ))}
            <div className="border-t border-dashed border-gray-400 my-2"></div>
            <div className="flex justify-between text-xs mb-0.5"><span>Subtotal:</span><span>R$ {sale.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-xs mb-0.5 text-red-600">
                <span>Desconto:</span><span>- R$ {sale.discount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="border-t border-dashed border-gray-400 my-2"></div>
            <div className="flex justify-between font-bold text-sm"><span>TOTAL:</span><span>R$ {sale.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>

            {/* Notes */}
            {sale.notes && (
              <>
                <div className="border-t border-dashed border-gray-400 my-2"></div>
                <div className="font-bold text-xs mb-0.5">OBSERVAÇÕES</div>
                <div className="text-xs text-gray-600">{sale.notes}</div>
              </>
            )}

            <div className="border-t border-dashed border-gray-400 my-2"></div>
            <div className="text-center text-xs text-gray-600 mt-1">
              <div>Obrigado pela preferência!</div>
              <div>Volte sempre — {companyName}</div>
              <div className="text-gray-400 text-xs mt-1">Documento sem valor fiscal</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-5 pb-5">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium cursor-pointer whitespace-nowrap"
            style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>
            Fechar
          </button>
          <button onClick={handlePrint}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
            style={{ background: '#f59e0b', color: '#000' }}>
            <i className="ri-printer-line"></i> Imprimir
          </button>
        </div>
      </div>
    </div>
  );
}
