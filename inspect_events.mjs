import fs from 'node:fs/promises';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const input = await FileBlob.load('D:/Users/warintorn.sak/Downloads/AUAUSAVE_Event.xlsx');
const workbook = await SpreadsheetFile.importXlsx(input);
const targets = ['2025','2024','FANBOY_EVENT','YOURSKY_EVENT'];
await fs.mkdir('tmp/event-preview', { recursive: true });
const extracted = {};
for (const name of targets) {
  const sheet = workbook.worksheets.getItem(name);
  const used = sheet.getUsedRange(true);
  extracted[name] = used.values;
  const preview = await workbook.render({ sheetName: name, autoCrop: 'all', scale: 1, format: 'png' });
  await fs.writeFile(`tmp/event-preview/${name}.png`, new Uint8Array(await preview.arrayBuffer()));
}
await fs.writeFile('tmp/extracted-events.json', JSON.stringify(extracted, null, 2), 'utf8');
const cleanDate = value => {
  if (!value) return null;
  const s = String(value).trim().replace(/\s/g, '').replace(/[./]/g, '-');
  const m = s.match(/^(20\d{2})-(\d{1,2})-(\d{1,2})$/);
  return m ? `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}` : null;
};
const artistId = value => {
  const s = String(value || '').toLowerCase();
  if (s.includes('save') && !s.includes('auau')) return 'save';
  if (s.includes('auau') && !s.includes('save') && !s.includes('#auau')) return 'auau';
  if ((s === 'auau') || s.includes('dvi') || s.includes('dexx')) return 'auau';
  return 'duo';
};
const rows = [];
const add = (sheet, row, dateIndex, nameIndex, typeIndex, artistIndex, timeIndex = -1) => {
  const date = cleanDate(row[dateIndex]);
  const title = String(row[nameIndex] || '').trim();
  if (!date || !title) return;
  rows.push({
    id: `imp_${sheet}_${rows.length + 1}`,
    artistId: sheet === 'FANBOY_EVENT' || sheet === 'YOURSKY_EVENT' ? 'duo' : artistId(row[artistIndex]),
    date,
    title,
    place: timeIndex >= 0 && row[timeIndex] ? String(row[timeIndex]) : `ข้อมูลจากชีท ${sheet}`,
    type: String(row[typeIndex] || (sheet === 'FANBOY_EVENT' ? 'SERIES' : 'EVENT')).toUpperCase(),
    sourceSheet: sheet,
  });
};
for (const row of extracted['2025'].slice(1)) add('2025', row, 3, 4, 1, 2);
for (const row of extracted['2024'].slice(1)) add('2024', row, 3, 4, 1, 2);
for (const row of extracted['YOURSKY_EVENT'].slice(1)) add('YOURSKY_EVENT', row, 3, 4, 1, 2);
for (const row of extracted['FANBOY_EVENT'].slice(2)) add('FANBOY_EVENT', row, 2, 3, 1, -1);
const seen = new Set();
const unique = rows.filter(row => {
  const key = `${row.date}|${row.title.toLowerCase().replace(/\s+/g,' ')}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});
await fs.writeFile('imported-events.js', `window.IMPORTED_EVENTS = ${JSON.stringify(unique, null, 2)};\n`, 'utf8');
console.log(`Generated ${unique.length} unique imported events`);
console.log(JSON.stringify(Object.fromEntries(Object.entries(extracted).map(([k,v])=>[k,{rows:v.length,headers:v[0]}])),null,2));
