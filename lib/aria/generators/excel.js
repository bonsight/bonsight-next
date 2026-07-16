import * as XLSX from 'xlsx';

export function generateMeasurementExcel(data) {
  const wb = XLSX.utils.book_new();
  wb.Props = {
    Title: data.title ?? 'Plan de Medición',
    Author: 'Bonsight · Aria',
    CreatedDate: new Date(),
  };

  for (const sheet of (data.sheets ?? [])) {
    const headers = sheet.headers ?? [];
    const rows = sheet.rows ?? [];

    const aoa = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Column widths — wider for descriptive columns, narrower for codes/IDs
    ws['!cols'] = headers.map((h, i) => {
      const maxContentLen = Math.max(
        h.length,
        ...rows.map((r) => String(r[i] ?? '').length).slice(0, 50),
      );
      return { wch: Math.min(Math.max(maxContentLen + 4, 15), 60) };
    });

    // Freeze header row
    ws['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft', state: 'frozen' };

    // Auto-filter on header row
    if (headers.length > 0 && rows.length > 0) {
      ws['!autofilter'] = { ref: ws['!ref'] };
    }

    const safeName = (sheet.name ?? 'Hoja').slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, safeName);
  }

  if (!data.sheets?.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Sin datos']]), 'Hoja1');
  }

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}
