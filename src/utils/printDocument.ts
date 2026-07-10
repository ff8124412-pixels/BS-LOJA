/**
 * Generic print utility — opens a new window with styled HTML and triggers print.
 * All modules use this to keep print logic consistent.
 */
export function printDocument(title: string, html: string) {
  const win = window.open('', '_blank', 'width=800,height=900');
  if (!win) return;
  win.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <title>${title}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #111; background: #fff; padding: 24px; }
        h1 { font-size: 18px; font-weight: bold; margin-bottom: 2px; }
        h2 { font-size: 14px; font-weight: bold; margin-bottom: 8px; color: #333; }
        h3 { font-size: 12px; font-weight: bold; margin-bottom: 4px; color: #555; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid #111; }
        .header-left h1 { font-size: 20px; }
        .header-left p { font-size: 11px; color: #555; margin-top: 2px; }
        .header-right { text-align: right; }
        .header-right .doc-number { font-size: 22px; font-weight: bold; color: #111; }
        .header-right .doc-label { font-size: 10px; color: #777; text-transform: uppercase; letter-spacing: 1px; }
        .section { margin-bottom: 16px; }
        .section-title { font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #777; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid #ddd; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
        .field { margin-bottom: 6px; }
        .field label { font-size: 10px; color: #777; display: block; margin-bottom: 1px; }
        .field span { font-size: 12px; font-weight: 600; color: #111; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        thead tr { background: #f5f5f5; }
        th { padding: 8px 10px; text-align: left; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #555; border-bottom: 1px solid #ddd; }
        td { padding: 8px 10px; font-size: 12px; border-bottom: 1px solid #eee; vertical-align: top; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .totals { margin-left: auto; width: 280px; }
        .totals-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; }
        .totals-row.total { font-size: 15px; font-weight: bold; border-top: 2px solid #111; padding-top: 8px; margin-top: 4px; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: bold; }
        .badge-green { background: #d1fae5; color: #065f46; }
        .badge-yellow { background: #fef3c7; color: #92400e; }
        .badge-red { background: #fee2e2; color: #991b1b; }
        .badge-gray { background: #f3f4f6; color: #374151; }
        .notes-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 12px; font-size: 11px; color: #374151; }
        .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #ddd; display: flex; justify-content: space-between; font-size: 10px; color: #999; }
        .signature-area { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
        .signature-line { border-top: 1px solid #999; padding-top: 6px; font-size: 10px; color: #777; text-align: center; }
        @media print {
          body { padding: 12px; }
          @page { margin: 10mm; size: A4; }
        }
      </style>
    </head>
    <body>
      ${html}
      <script>
        window.onload = function() {
          setTimeout(function() { window.print(); window.close(); }, 400);
        };
      </script>
    </body>
    </html>
  `);
  win.document.close();
}
