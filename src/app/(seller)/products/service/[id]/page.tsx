'use client';
// Add or change a class, a 1-on-1 session or a download (the dashboard prototype's Add service screen).
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, use } from 'react';
import { BackRow, DSeg, SaveRow } from '@/components/dash/parts';
import { ConfirmDialog, EmptyState, Skeleton, useToast } from '@/components/ui';
import { useStore } from '@/lib/store';
import type { Service } from '@/lib/types';

const TYPE_ICON: Record<Service['type'], string> = { Class: 'self_improvement', '1-on-1': 'person', Digital: 'menu_book' };
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIMES = ['6:00 am', '7:00 am', '8:00 am', '10:00 am', '4:00 pm', '5:00 pm', '6:00 pm', '7:00 pm'];
type Form = { name: string; type: Service['type']; price: string; minutes: string; days: string[]; time: string; seats: number; where: string };
const toForm = (s?: Service): Form => ({ name: s?.name ?? '', type: s?.type ?? 'Class', price: s ? String(s.price) : '', minutes: s ? String(s.minutes) : '60', days: [], time: '7:00 am', seats: 10, where: 'Online' });

/** The line the shop page shows for when it runs, built from the days, time and seats the seller picked. */
const nextLine = (f: Form) => (f.type === 'Digital' ? 'Instant download' : f.days.length ? `${f.days.join(', ')} ${f.time}${f.type === 'Class' ? ` · ${f.seats} seats` : ''}` : '');

export default function ServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { db, ready, saveService, deleteService } = useStore();
  const router = useRouter();
  const toast = useToast();
  const isNew = id === 'new';
  const s = db.services.find((x) => x.id === id);
  const [f, setF] = useState<Form>(() => toForm(s));
  const [loaded, setLoaded] = useState(false);
  const [tried, setTried] = useState(false);
  const [del, setDel] = useState(false);
  useEffect(() => { if (ready && !loaded) { setF(toForm(s)); setLoaded(true); } }, [ready, loaded, s]);
  const base = useMemo(() => JSON.stringify(toForm(s)), [s]);
  const dirty = loaded && JSON.stringify(f) !== base;

  if (!ready) return <div className="dpad" style={{ paddingTop: 20 }}><Skeleton rows={3} height={100} /></div>;
  if (!isNew && !s) {
    return (
      <>
        <BackRow to="/products?tab=services" icon="tag" title="Services" />
        <div className="dpad"><div className="card"><EmptyState icon="search_off" title="We couldn’t find that service" text="It may have been deleted." action={<Link className="btn line sm" href="/products?tab=services">Back to services</Link>} /></div></div>
      </>
    );
  }

  const errors: Record<string, string> = {};
  if (!f.name.trim()) errors.name = 'Add a name buyers will recognise.';
  if (!/^\d+$/.test(f.price.replace(/,/g, '')) || Number(f.price.replace(/,/g, '')) < 0 || f.price === '') errors.price = 'Add a price in rupees, like 499.';
  if (f.type !== 'Digital' && (!/^\d+$/.test(f.minutes) || Number(f.minutes) < 5)) errors.minutes = 'How long it runs, in minutes.';
  const e = (k: string) => (tried ? errors[k] : undefined);
  const set = (patch: Partial<Form>) => setF((x) => ({ ...x, ...patch }));
  const line = nextLine(f) || s?.next || '';

  const save = () => {
    setTried(true);
    if (Object.keys(errors).length) { toast('Fix the highlighted fields.', { icon: 'error' }); return; }
    const next: Service = { id: s?.id ?? 's' + Date.now().toString(36), name: f.name.trim(), type: f.type, price: Number(f.price.replace(/,/g, '')), minutes: f.type === 'Digital' ? 0 : Number(f.minutes), next: line, icon: TYPE_ICON[f.type] };
    saveService(next);
    toast(isNew ? `${next.name} added.` : 'Saved.');
    router.replace('/products?tab=services');
  };

  return (
    <>
      {dirty
        ? <SaveRow what="service" onSave={save} onDiscard={() => { setF(toForm(s)); setTried(false); }} />
        : <BackRow to="/products?tab=services" icon="tag" title="Services" />}
      <div className="dpad">
        <h1 className="h1" style={{ margin: '0 0 16px' }}>{isNew ? 'Add service' : s!.name}</h1>
        <form className="cols" noValidate onSubmit={(ev) => { ev.preventDefault(); save(); }}>
          <div>
            <div className="card">
              <div className="field" style={{ margin: 0 }}><label htmlFor="sv-name">Title</label><input id="sv-name" className={`input${e('name') ? ' bad' : ''}`} placeholder="e.g. Morning yoga (group class)" value={f.name} onChange={(x) => set({ name: x.target.value })} />{e('name') ? <span className="err" role="alert">{e('name')}</span> : null}</div>
            </div>
            <div className="card">
              <div className="row" style={{ alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                <div className="field sp" style={{ flex: '1 1 140px' }}><label htmlFor="sv-price">Price</label><div className="money-in" style={e('price') ? { borderColor: 'var(--negative)' } : undefined}><span>₹</span><input id="sv-price" inputMode="numeric" placeholder="499" value={f.price} onChange={(x) => set({ price: x.target.value.replace(/[^\d,]/g, '') })} /></div>{e('price') ? <span className="err" role="alert">{e('price')}</span> : null}</div>
                {f.type !== 'Digital' ? (
                  <div className="field sp" style={{ flex: '1 1 140px' }}><label htmlFor="sv-min">Duration</label>
                    <select id="sv-min" className="input" value={f.minutes} onChange={(x) => set({ minutes: x.target.value })}>{['30', '45', '60', '75', '90', '120'].map((m) => <option key={m} value={m}>{m} min</option>)}{!['30', '45', '60', '75', '90', '120'].includes(f.minutes) ? <option value={f.minutes}>{f.minutes} min</option> : null}</select>
                    {e('minutes') ? <span className="err" role="alert">{e('minutes')}</span> : null}
                  </div>
                ) : null}
              </div>
              {f.type !== 'Digital' ? (
                <div className="field" style={{ margin: 0 }}><label>Where</label>
                  <div className="chips">{['Online', 'At my studio', 'At buyer’s home'].map((w) => <button key={w} type="button" className={`chip${f.where === w ? ' on' : ''}`} aria-pressed={f.where === w} onClick={() => set({ where: w })}>{w}</button>)}</div>
                </div>
              ) : <p className="small muted" style={{ margin: 0 }}>A download is sent to the buyer as soon as they pay.</p>}
            </div>
            {f.type !== 'Digital' ? (
              <div className="card">
                <div className="box-h"><span className="box-t">Slots</span></div>
                <div className="field"><label>Days</label><div className="chips">{DAYS.map((d) => <button key={d} type="button" className={`chip${f.days.includes(d) ? ' on' : ''}`} aria-pressed={f.days.includes(d)} onClick={() => set({ days: f.days.includes(d) ? f.days.filter((x) => x !== d) : DAYS.filter((x) => x === d || f.days.includes(x)) })}>{d}</button>)}</div></div>
                <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
                  <div className="field sp" style={{ flex: '1 1 140px' }}><label htmlFor="sv-time">Time</label><select id="sv-time" className="input" value={f.time} onChange={(x) => set({ time: x.target.value })}>{TIMES.map((t) => <option key={t}>{t}</option>)}</select></div>
                  {f.type === 'Class' ? (
                    <div className="field sp" style={{ flex: '1 1 140px' }}><label>Seats per class</label>
                      <div className="dstep"><button type="button" aria-label="Fewer seats" onClick={() => set({ seats: Math.max(1, f.seats - 1) })}>−</button><input value={f.seats} readOnly aria-label="Seats" /><button type="button" aria-label="More seats" onClick={() => set({ seats: Math.min(100, f.seats + 1) })}>+</button></div>
                    </div>
                  ) : null}
                </div>
                <p className="small muted" style={{ margin: 0 }}>Shown on your shop page as: <b style={{ color: 'var(--ink)' }}>{line || 'pick at least one day'}</b></p>
              </div>
            ) : null}
          </div>
          <div>
            <div className="card"><div className="box-h"><span className="box-t">Type</span></div>
              <DSeg label="Type" value={f.type} onChange={(v) => set({ type: v })} options={[{ value: 'Class', label: 'Class' }, { value: '1-on-1', label: '1-on-1' }, { value: 'Digital', label: 'Digital' }]} />
              {!isNew ? <button className="btn line sm" type="button" style={{ marginTop: 12 }} onClick={() => setDel(true)}>Delete service</button> : null}
            </div>
            <button className="btn main full" type="submit">{isNew ? 'Add service' : dirty ? 'Save changes' : 'Saved'}</button>
          </div>
        </form>
      </div>
      {!isNew && <ConfirmDialog open={del} onClose={() => setDel(false)} title={`Delete ${s!.name}?`} body="Buyers won’t see it any more. Past bookings keep their details." yes="Delete" danger
        onYes={() => { deleteService(s!.id); router.push('/products?tab=services'); toast(`${s!.name} deleted.`, { icon: 'delete' }); }} />}
    </>
  );
}
