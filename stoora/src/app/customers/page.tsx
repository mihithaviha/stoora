'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Avatar, Button, Card, Chips, DemoBar, EmptyState, PageHeader, SearchBox, Skeleton, SourceTag } from '@/components/ui';
import { plural, rs } from '@/lib/format';

type Sort = 'Recent' | 'Most spent' | 'Most orders';
export default function CustomersPage() {
  const { db, ready } = useStore(); const router = useRouter();
  const [q, setQ] = useState(''); const [sort, setSort] = useState<Sort>('Recent');
  const t = q.trim().toLowerCase();
  const list = db.customers.filter((c) => !t || `${c.name} ${c.city} ${c.source}`.toLowerCase().includes(t))
    .sort((a, b) => sort === 'Most spent' ? b.spent - a.spent : sort === 'Most orders' ? b.orders - a.orders : 0);
  return (
    <>
      <DemoBar />
      <PageHeader title="Customers" lede={`${plural(db.customers.length, 'person', 'people')} have bought or booked with you.`} />
      <div className="stack">
        <Card className="stack tight">
          <SearchBox id="cust-q" value={q} onChange={setQ} placeholder="Search by name or city" />
          <Chips label="Sort" value={sort} onChange={setSort} options={(['Recent', 'Most spent', 'Most orders'] as Sort[]).map((s) => ({ value: s, label: s }))} />
        </Card>
        {!ready ? <Skeleton rows={4} /> : !list.length ? <Card><EmptyState icon="person_search" title={`Nobody matches “${q}”`} text="Try a first name or a city." action={<Button small onClick={() => setQ('')}>Clear search</Button>} /></Card> : <>
          <div className="tbl-wrap only-wide"><table className="tbl">
            <thead><tr><th>Name</th><th>Phone</th><th>City</th><th>Came from</th><th className="r">Orders</th><th className="r">Spent</th><th>Last order</th></tr></thead>
            <tbody>{list.map((c) => <tr key={c.id} tabIndex={0} style={{ cursor: 'pointer' }} onClick={() => router.push(`/customers/${c.id}`)} onKeyDown={(e) => e.key === 'Enter' && router.push(`/customers/${c.id}`)}>
              <td><span className="row"><Avatar name={c.name} /><b>{c.name}</b></span></td><td className="num">{c.phone}</td><td>{c.city}</td><td><SourceTag source={c.source} /></td><td className="r num">{c.orders}</td><td className="r num"><b>{rs(c.spent)}</b></td><td>{c.lastOrder}</td></tr>)}</tbody>
          </table></div>
          <div className="rows only-narrow">{list.map((c) => <Link key={c.id} className="li" href={`/customers/${c.id}`}><Avatar name={c.name} /><span className="grow"><span className="t">{c.name}</span><span className="s">{plural(c.orders, 'order')} · last {c.lastOrder}</span></span><span className="money">{rs(c.spent)}</span></Link>)}</div>
        </>}
        <p className="cap">Phone numbers are partly hidden in this sample shop.</p>
      </div>
    </>
  );
}
