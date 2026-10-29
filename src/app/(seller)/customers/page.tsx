'use client';
// Customers: everyone who has bought or booked, in one table (the dashboard prototype's Customers screen).
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Chk, DAv, DI, SrcTag, TopRow } from '@/components/dash/parts';
import { Skeleton, useToast } from '@/components/ui';
import { downloadCsv } from '@/lib/csv';
import { rs } from '@/lib/format';
import { useStore } from '@/lib/store';

/** Understands a few plain-language asks ("bought twice", "spent over 3000", "new buyers") on top of searching names and cities. */
function matcher(text: string) {
  const t = text.trim().toLowerCase();
  if (!t) return () => true;
  const over = t.match(/(?:over|above|more than|>)\s*₹?\s*([\d,]+)/);
  if (over) { const n = Number(over[1].replace(/,/g, '')); return (c: { spent: number }) => c.spent > n; }
  if (/twice|repeat|returning|more than once|bought again/.test(t)) return (c: { orders: number }) => c.orders >= 2;
  if (/\bnew\b|first (order|time)|once/.test(t)) return (c: { orders: number }) => c.orders === 1;
  return (c: { name: string; city: string; phone: string }) => `${c.name} ${c.city} ${c.phone}`.toLowerCase().includes(t);
}

export default function CustomersPage() {
  const { db, ready } = useStore();
  const router = useRouter();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const list = useMemo(() => db.customers.filter(matcher(q)), [db.customers, q]);
  if (!ready) return <div className="dpad" style={{ paddingTop: 20 }}><Skeleton rows={4} height={70} /></div>;
  const allOn = list.length > 0 && list.every((c) => picked.includes(c.id));

  return (
    <>
      <TopRow icon="user" title="Customers">
        <button className="btn line sm" type="button" onClick={() => { downloadCsv('customers.csv', [['Customer', 'Phone', 'City', 'Orders', 'Amount spent', 'Last order', 'Came from'], ...db.customers.map((c) => [c.name, c.phone, c.city, c.orders, c.spent, c.lastOrder, c.source])]); toast('Customers downloaded.', { icon: 'download' }); }}>Export</button>
      </TopRow>
      <div className="dpad">
        <div className="box tbox">
          <div className="tbar">
            <label className="search" style={{ flex: 1, width: 'auto', maxWidth: 520 }}><DI n="spark" s={16} /><span className="sr">Search customers</span>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search, or describe who you want: “bought twice”, “spent over 3000”" style={{ border: 0, background: 'none', outline: 'none', flex: 1, minWidth: 0, fontSize: 14 }} /></label>
            <span className="small muted">{list.length} of {db.customers.length}</span>
          </div>
          <table className="tbl">
            <thead><tr><th className="ck"><Chk on={allOn} onChange={(on) => setPicked(on ? list.map((c) => c.id) : [])} label="Select all customers" /></th><th>Customer</th><th>Phone</th><th>Orders</th><th className="r">Amount spent</th><th>Last order</th><th>Came from</th></tr></thead>
            <tbody>
              {list.map((c, i) => (
                <tr className="rw" key={c.id} onClick={() => router.push(`/customers/${c.id}`)}>
                  <td className="ck"><Chk on={picked.includes(c.id)} onChange={(v) => setPicked((p) => (v ? [...p, c.id] : p.filter((x) => x !== c.id)))} label={`Select ${c.name}`} /></td>
                  <td><span className="row" style={{ gap: 10 }}><DAv name={c.name} i={i} /><b>{c.name}</b></span></td>
                  <td className="muted">{c.phone}</td><td>{c.orders}</td><td className="r money">{rs(c.spent)}</td><td className="muted">{c.lastOrder}</td><td><SrcTag s={c.source} /></td>
                </tr>
              ))}
              {!list.length && <tr><td colSpan={7} className="muted" style={{ textAlign: 'center', padding: 28 }}>{db.customers.length ? `Nobody matches “${q}”.` : 'No customers yet. They appear here after their first order.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
