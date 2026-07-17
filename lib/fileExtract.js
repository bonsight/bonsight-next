import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import zlib from 'zlib';

export const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export const OFFICE_MIMES = new Set([
  PPTX_MIME,
  DOCX_MIME,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
]);

// Extract text from a PPTX buffer by parsing the ZIP structure and reading slide XML.
export function parsePptxText(buffer) {
  let eocd = -1;
  for (let i = buffer.length - 22; i >= 0; i--) {
    if (buffer[i] === 0x50 && buffer[i + 1] === 0x4b && buffer[i + 2] === 0x05 && buffer[i + 3] === 0x06) {
      eocd = i;
      break;
    }
  }
  if (eocd === -1) return '';

  const cdOffset = buffer.readUInt32LE(eocd + 16);
  const cdSize   = buffer.readUInt32LE(eocd + 12);

  const slides = [];
  let pos = cdOffset;

  while (pos < cdOffset + cdSize) {
    if (buffer.readUInt32LE(pos) !== 0x02014b50) break;
    const compression = buffer.readUInt16LE(pos + 10);
    const compSize    = buffer.readUInt32LE(pos + 20);
    const nameLen     = buffer.readUInt16LE(pos + 28);
    const extraLen    = buffer.readUInt16LE(pos + 30);
    const commentLen  = buffer.readUInt16LE(pos + 32);
    const localOffset = buffer.readUInt32LE(pos + 42);
    const name        = buffer.slice(pos + 46, pos + 46 + nameLen).toString('utf8');
    pos += 46 + nameLen + extraLen + commentLen;

    if (!/^ppt\/slides\/slide\d+\.xml$/.test(name)) continue;

    const lhNameLen  = buffer.readUInt16LE(localOffset + 26);
    const lhExtraLen = buffer.readUInt16LE(localOffset + 28);
    const dataStart  = localOffset + 30 + lhNameLen + lhExtraLen;
    const compressed = buffer.slice(dataStart, dataStart + compSize);

    let xml;
    if (compression === 0) {
      xml = compressed.toString('utf8');
    } else if (compression === 8) {
      try { xml = zlib.inflateRawSync(compressed).toString('utf8'); } catch { continue; }
    } else continue;

    const matches  = xml.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g) ?? [];
    const texts    = matches.map((m) => m.replace(/<[^>]+>/g, '').trim()).filter(Boolean);
    if (texts.length) slides.push(texts.join(' '));
  }

  return slides.join('\n\n');
}

// Extract text from any supported office file buffer.
export async function extractTextFromBuffer(buffer, mimeType) {
  if (mimeType === DOCX_MIME) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value?.trim() ?? '';
  }

  if (mimeType === PPTX_MIME) {
    return parsePptxText(buffer);
  }

  // XLSX / XLS / CSV
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const parts = workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    return `## Hoja: ${name}\n${XLSX.utils.sheet_to_csv(sheet, { blankrows: false })}`;
  });
  return parts.join('\n\n').trim();
}
