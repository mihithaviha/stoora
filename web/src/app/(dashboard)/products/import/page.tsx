'use client';
// Import products from a CSV file: upload, match columns, review problems, import.
// API_TODO: POST /api/products/import (multipart CSV) returning created and rejected rows.
import { useSearchParams } from 'next/navigation';
import React, { useMemo, useRef, useState } from 'react';
import { Button, ButtonLink, Card, DemoBar, Icon, PageHeader, useToast } from '@/components/ui';
import { Stepper } from '@/components/bits';
import { useStore } from '@/lib/store';
import { plural, toNum } from '@/lib/format';
import type { Product } from '@/lib/types';

const STEPS = ['Upload', 'Match columns', 'Review', 'Done'];
const FIELDS: [keyof Row, string, boolean][] = [['name', 'Product name', true], ['price', 'Price (₹)', true], ['stock', 'Stock', false], ['category', 'Category', false], ['sizes', 'Sizes', false]];
interface Row { name: string; price: string; stock: string; category: string; sizes: string }
const SAMPLE = `name,price,stock,category,sizes
Block-print cotton stole,899,14,Dupattas,
Chanderi silk kurta,2499,6,Kurtas,"S,M,L"
Linen kurta set,3199,4,Kurtas,"M,L,XL"
Mirror-work clutch,,8,Other,
Cotton palazzo,649,abc,Other,"S,M,L"
Ajrakh dupatta,1299,9,Dupattas,`;

/** A small CSV reader: commas, quoted values with commas, and "" for a quote inside quotes. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let cur: string[] = []; let f = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { f += '"'; i++; } else if (c === '"') q = false; else f += c; }
    else if (c === '"') q = true; else if (c === ',') { cur.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; cur.push(f); f = ''; if (cur.some((x) => x.trim())) rows.push(cur); cur = []; }
    else f += c;
  }
  cur.push(f); if (cur.some((x) => x.trim())) rows.push(cur);
  return rows;
}
const guess = (headers: string[], key: string) => { const alias: Record<string, string[]> = { name: ['name', 'title', 'product'], price: ['price', 'mrp', 'rate', 'amount'], stock: ['stock', 'qty', 'quantity', 'inventory'], category: ['category', 'type'], sizes: ['sizes', 'size'] }; return headers.findIndex((h) => alias[key].includes(h.trim().toLowerCase())); };

export default function ImportPage() {
  const { saveProduct } = useStore(); const toast = useToast();
  const start = Number(useSearchParams().get('step') || 1) - 1;
  const [step, setStep] = useState(0); const [file, setFile] = useState(''); const [data, setData] = useState<string[][]>([]);
  const [map, setMap] = useState<Record<string, number>>({}); const [over, setOver] = useState(false); const [note, setNote] = useState(''); const [added, setAdded] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  const load = (name: string, text: string) => {
    const rows = parseCsv(text);
    if (rows.length < 2) { setNote('That file has no product rows. Check that the first row has column names and the next rows have products.'); return; }
    setNote(''); setFile(name); setData(rows); setMap(Object.fromEntries(FIELDS.map(([k]) => [k, guess(rows[0], k)]))); setStep(1);
  };
  const onFile = (f?: File) => {
    if (!f) return;
    if (!/\.csv$/i.test(f.name) && f.type !== 'text/csv') { setNote('That is not a CSV file. In Excel or Google Sheets, choose File › Download › CSV.'); return; }
    if (f.size > 1024 * 1024) { setNote('That file is over 1 MB. Split it into smaller files of about 1,000 products.'); return; }
    const r = new FileReader(); r.onload = () => load(f.name, String(r.result)); r.onerror = () => setNote('That file could not be read. Try saving it again.'); r.readAsText(f);
  };
  const demoReview = start >= 2 && !data.length;
  React.useEffect(() => { if (demoReview) { load('sample-products.csv', SAMPLE); setStep(Math.min(start, 3)); } }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const items = useMemo(() => data.slice(1).map((r, i) => {
    const get = (k: keyof Row) => (map[k] >= 0 && map[k] != null ? (r[map[k]] ?? '').trim() : '');
    const row: Row = { name: get('name'), price: get('price'), stock: get('stock'), category: get('category'), sizes: get('sizes') };
    const problems: string[] = [];
    if (!row.name) problems.push('No name');
    if (!row.price) problems.push('No price'); else if (!(toNum(row.price) > 0)) problems.push('Price is not a number');
    if (row.stock && !/^\d+$/.test(row.stock)) problems.push('Stock is not a whole number');
    return { n: i + 2, row, problems };
  }), [data, map]);
  const good = items.filter((x) => !x.problems.length); const bad = items.filter((x) => x.problems.length);
  const missing = FIELDS.filter(([k, , req]) => req && !(map[k] >= 0));

  const doImport = () => {
    good.forEach((x, i) => { const p: Product = { id: 'imp' + Date.now() + i, name: x.row.name, category: x.row.category === 'Kurtas' || x.row.category === 'Dupattas' ? x.row.category : 'Other', sizes: x.row.sizes ? x.row.sizes.split(/[,\s]+/).filter(Boolean) : [], price: toNum(x.row.price), stock: toNum(x.row.stock), status: 'Active', soldLast30Days: 0, icon: 'sell' }; saveProduct(p); });
    setAdded(good.length); setStep(3); toast(`${plural(good.length, 'product')} imported.`, { icon: 'upload_file' });
  };
  const template = () => { const url = URL.createObjectURL(new Blob([SAMPLE.split('\n')[0] + '\nExample product,499,10,Kurtas,"S,M,L"\n'], { type: 'text/csv' })); const a = document.createElement('a'); a.href = url; a.download = 'stoora-products-template.csv'; a.click(); URL.revokeObjectURL(url); };

  return (
    <>
      <DemoBar />
      <PageHeader title="Import products" lede="Bring a list in from a spreadsheet instead of typing each product." actions={<ButtonLink href="/products" icon="arrow_back">Back to products</ButtonLink>} />
      <div className="stack">
        <Stepper steps={STEPS} current={step} />
        {step === 0 && (
          <Card className="stack" title="Choose a CSV file">
            <div className={`drop ${over ? 'over' : ''}`} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); onFile(e.dataTransfer.files[0]); }}>
              <Icon name="upload_file" size="lg" /><b className="t-ink">Drag a CSV file here, or tap to choose</b><span className="cap">One product per row. The first row holds the column names. Up to 1 MB.</span>
              <input ref={input} type="file" accept=".csv,text/csv" aria-label="Choose a CSV file" onChange={(e) => onFile(e.target.files?.[0])} />
            </div>
            {note && <div className="banner bad" role="alert"><Icon name="error" /><span>{note}</span></div>}
            <div className="btns"><Button icon="download" onClick={template}>Download a template</Button><Button icon="science" onClick={() => load('sample-products.csv', SAMPLE)}>Try a sample file</Button></div>
            <p className="cap">Exporting from another shop? Download your products as CSV there, then upload it here. Photos are added afterwards.</p>
          </Card>
        )}
        {step === 1 && (
          <Card className="stack" title={`Match the columns in ${file}`} aside={<span className="cap">{plural(data.length - 1, 'row')} found</span>}>
            <p className="t-body">Tell Stoora which column holds what. We matched the ones we recognised.</p>
            <div className="mapgrid">{FIELDS.map(([k, label, req]) => (
              <div className="field" key={k}><label htmlFor={`map-${k}`}>{label} {req ? <span className="req">Required</span> : <span className="opt">Optional</span>}</label>
                <select id={`map-${k}`} className={`input ${req && !(map[k] >= 0) ? 'flag' : ''}`} value={map[k] ?? -1} onChange={(e) => setMap({ ...map, [k]: Number(e.target.value) })}><option value={-1}>{req ? 'Choose a column' : 'Skip this'}</option>{data[0].map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}</select></div>))}</div>
            <div><b className="t-ink">Preview</b><div className="csv" style={{ marginTop: 'var(--s1)' }}><table><thead><tr>{data[0].map((h, i) => <th key={i}>{h}</th>)}</tr></thead><tbody>{data.slice(1, 4).map((r, i) => <tr key={i}>{data[0].map((_, j) => <td key={j}>{r[j]}</td>)}</tr>)}</tbody></table></div></div>
            {missing.length > 0 && <div className="banner warn"><Icon name="warning" /><span>Choose a column for: {missing.map(([, l]) => l).join(', ')}.</span></div>}
            <div className="wiz-foot"><Button icon="arrow_back" onClick={() => { setStep(0); setData([]); }}>Choose another file</Button><Button kind="primary" disabled={missing.length > 0} onClick={() => setStep(2)}>Review products</Button></div>
          </Card>
        )}
        {step === 2 && (
          <Card className="stack" title="Review before importing">
            <div className="row" style={{ flexWrap: 'wrap' }}><span className="bdg ok"><Icon name="check_circle" />{plural(good.length, 'product')} ready</span>{bad.length > 0 && <span className="bdg bad"><Icon name="error" />{plural(bad.length, 'row')} need fixing</span>}</div>
            {bad.length > 0 && <div className="banner warn"><Icon name="info" /><span>Rows with a problem are skipped. Fix them in your file and import again, or add them one by one later.</span></div>}
            <div className="csv"><table><thead><tr><th>Row</th><th>Name</th><th>Price</th><th>Stock</th><th>Category</th><th>Status</th></tr></thead><tbody>{items.map((x) => <tr key={x.n} className={x.problems.length ? 'bad' : ''}><td>{x.n}</td><td>{x.row.name || '—'}</td><td>{x.row.price || '—'}</td><td>{x.row.stock || '—'}</td><td>{x.row.category || '—'}</td><td>{x.problems.length ? <span style={{ color: 'var(--negative-deep)' }}>{x.problems.join(', ')}</span> : <span style={{ color: 'var(--positive-deep)' }}>OK</span>}</td></tr>)}</tbody></table></div>
            <div className="wiz-foot"><Button icon="arrow_back" onClick={() => setStep(1)}>Back</Button><Button kind="primary" icon="upload" disabled={!good.length} onClick={doImport}>Import {plural(good.length, 'product')}</Button></div>
          </Card>
        )}
        {step === 3 && (
          <Card className="stack done-card"><span className="big-ok"><Icon name="check" size="lg" /></span><h2 className="h2">{plural(added, 'product')} imported</h2>
            <p className="t-body">They are live on your shop page. Add photos and details by opening any product.{bad.length > 0 && ` ${plural(bad.length, 'row was', 'rows were')} skipped.`}</p>
            <div className="btns"><ButtonLink href="/products" kind="primary">See my products</ButtonLink><Button onClick={() => { setStep(0); setData([]); setFile(''); }}>Import another file</Button></div></Card>
        )}
      </div>
    </>
  );
}
