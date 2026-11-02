'use client';
// Add or change a workshop, a class, a 1-on-1 session or a download (PRD P0-5).
// "Add service" first asks which kind (or reads ?kind= from the address), then opens that form: no stock, sizes or weight.
//   workshop  one date, one time, seats        class      weekdays, time slots, seats      session  weekdays, time slots, one buyer
//   digital   a file the buyer receives after paying
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useRef, useState, use } from 'react';
import { BackRow, DI, SaveRow } from '@/components/dash/parts';
import { ConfirmDialog, EmptyState, Skeleton, useToast } from '@/components/ui';
import { useLeaveGuard } from '@/lib/leave-guard';
import { useStore } from '@/lib/store';
import type { Service } from '@/lib/types';

type Kind = NonNullable<Service['kind']>;
const KIND_INFO: Record<Kind, { label: string; text: string; icon: string; type: Service['type'] }> = {
  workshop: { label: 'Workshop', text: 'One date, a few hours, a fixed number of seats.', icon: 'cal', type: 'Class' },
  class: { label: 'Class or course', text: 'Repeats every week on the days and times you pick.', icon: 'cal', type: 'Class' },
  session: { label: '1-on-1 session', text: 'One buyer at a time, booked into your time slots.', icon: 'cal', type: '1-on-1' },
  digital: { label: 'Digital download', text: 'A file (PDF, ebook, audio, video) buyers get after paying.', icon: 'box', type: 'Digital' },
};
const KINDS = Object.keys(KIND_INFO) as Kind[];
const ICON: Record<Kind, string> = { workshop: 'palette', class: 'self_improvement', session: 'person', digital: 'menu_book' };
const kindOf = (s?: Service): Kind | undefined => s?.kind ?? (s ? (s.type === 'Digital' ? 'digital' : s.type === '1-on-1' ? 'session' : 'class') : undefined);
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIMES = ['6:00 am', '7:00 am', '8:00 am', '10:00 am', '12:00 pm', '4:00 pm', '5:00 pm', '6:00 pm', '7:00 pm'];
const MAX_FILE = 50 * 1024 * 1024;
const WHERE = ['Online', 'At my studio', 'At buyer’s home'];
type Form = { name: string; price: string; minutes: string; days: string[]; times: string[]; date: string; seats: number; place: string; fileName: string };
const toForm = (s?: Service): Form => ({ name: s?.name ?? '', price: s ? String(s.price) : '', minutes: s ? String(s.minutes || 60) : '60', days: s?.days ?? [], times: s?.times ?? (s ? [] : ['7:00 am']), date: s?.date ?? '', seats: s?.seats ?? 10, place: s?.place ?? 'Online', fileName: s?.fileName ?? '' });

const today = () => new Date().toISOString().slice(0, 10);
const niceDate = (d: string) => { const x = new Date(d + 'T00:00:00'); return Number.isNaN(x.getTime()) ? d : x.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }); };
/** The line the shop page shows for when it runs, built from what the seller picked. */
const nextLine = (k: Kind, f: Form) => {
  if (k === 'digital') return 'Instant download';
  if (k === 'workshop') return f.date && f.times[0] ? `${niceDate(f.date)}, ${f.times[0]} · ${f.seats} ${f.seats === 1 ? 'seat' : 'seats'}` : '';
  if (!f.days.length || !f.times.length) return '';
  return `${f.days.join(', ')} ${f.times.join(', ')}${k === 'class' ? ` · ${f.seats} seats` : ''}`;
};

function Chooser() {
  return (
    <>
      <BackRow to="/products?tab=services" icon="tag" title="Services" />
      <div className="dpad">
        <h1 className="h1" style={{ margin: '0 0 6px' }}>What are you adding?</h1>
        <p className="muted" style={{ margin: '0 0 16px' }}>Pick one. You can add the others later.</p>
        <div className="grid2" role="list">
          {KINDS.map((k) => (
            <Link key={k} role="listitem" className="card" href={`/products/service/new?kind=${k}`} style={{ display: 'grid', gap: 6, textDecoration: 'none', color: 'inherit' }}>
              <span className="row" style={{ gap: 8 }}><DI n={KIND_INFO[k].icon} s={20} /><b>{KIND_INFO[k].label}</b></span>
              <span className="small muted">{KIND_INFO[k].text}</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}

function Editor({ id }: { id: string }) {
  const { db, ready, saveService, deleteService } = useStore();
  const router = useRouter();
  const toast = useToast();
  const sp = useSearchParams();
  const isNew = id === 'new';
  const s = db.services.find((x) => x.id === id);
  const asked = sp.get('kind');
  const kind: Kind | undefined = kindOf(s) ?? (KINDS.includes(asked as Kind) ? (asked as Kind) : undefined);
  const [f, setF] = useState<Form>(() => toForm(s));
  const [loaded, setLoaded] = useState(false);
  const [tried, setTried] = useState(false);
  const [del, setDel] = useState(false);
  const [leaveTo, setLeaveTo] = useState<string | null>(null);
  const file = useRef<File | undefined>(undefined);
  const [fileErr, setFileErr] = useState('');
  useEffect(() => { if (ready && !loaded) { setF(toForm(s)); setLoaded(true); } }, [ready, loaded, s]);
  const base = useMemo(() => JSON.stringify(toForm(s)), [s]);
  const dirty = loaded && JSON.stringify(f) !== base;
  useLeaveGuard(dirty, (href) => setLeaveTo(href));

  if (!ready) return <div className="dpad" style={{ paddingTop: 20 }}><Skeleton rows={3} height={100} /></div>;
  if (!isNew && !s) {
    return (
      <>
        <BackRow to="/products?tab=services" icon="tag" title="Services" />
        <div className="dpad"><div className="card"><EmptyState icon="search_off" title="We couldn’t find that service" text="It may have been deleted." action={<Link className="btn line sm" href="/products?tab=services">Back to services</Link>} /></div></div>
      </>
    );
  }
  if (!kind) return <Chooser />;

  const errors: Record<string, string> = {};
  if (!f.name.trim()) errors.name = 'Add a name buyers will recognise.';
  if (f.price === '' || !/^\d+$/.test(f.price.replace(/,/g, ''))) errors.price = 'Add a price in rupees, like 499. Use 0 if it is free.';
  if (kind !== 'digital' && (!/^\d+$/.test(f.minutes) || Number(f.minutes) < 5)) errors.minutes = 'How long it runs, in minutes.';
  if (kind === 'workshop') {
    if (!f.date) errors.date = 'Pick the date of the workshop.';
    else if (f.date < today()) errors.date = 'Pick a date that has not passed.';
    if (!f.times.length) errors.times = 'Pick a start time.';
  }
  if (kind === 'class' || kind === 'session') {
    if (!f.days.length) errors.days = 'Pick at least one day.';
    if (!f.times.length) errors.times = 'Pick at least one time slot.';
  }
  if (kind === 'digital' && !f.fileName) errors.file = 'Add the file buyers will receive.';
  const e = (k: string) => (tried ? errors[k] : undefined);
  const set = (patch: Partial<Form>) => setF((x) => ({ ...x, ...patch }));
  const line = nextLine(kind, f) || s?.next || '';
  const toggle = (key: 'days' | 'times', v: string, order: string[]) => set({ [key]: f[key].includes(v) ? f[key].filter((x) => x !== v) : order.filter((x) => x === v || f[key].includes(x)) } as Partial<Form>);

  const pickFile = (list: FileList | null) => {
    const picked = list?.[0]; setFileErr('');
    if (!picked) return;
    if (picked.size > MAX_FILE) { setFileErr('That file is over 50 MB. Send a smaller one, or a link to it in the description.'); return; }
    file.current = picked; set({ fileName: picked.name });
  };

  const save = () => {
    setTried(true);
    if (Object.keys(errors).length) { toast('Fix the highlighted fields.', { icon: 'error' }); setTimeout(() => (document.querySelector('.input.bad, .money-in[style], [data-bad="1"]') as HTMLElement | null)?.focus(), 30); return; }
    const info = KIND_INFO[kind];
    const next: Service = { id: s?.id ?? 's' + Date.now().toString(36), name: f.name.trim(), type: info.type, price: Number(f.price.replace(/,/g, '')), minutes: kind === 'digital' ? 0 : Number(f.minutes), next: line, icon: ICON[kind], kind,
      date: kind === 'workshop' ? f.date : undefined, days: kind === 'class' || kind === 'session' ? f.days : undefined, times: kind === 'digital' ? undefined : f.times,
      seats: kind === 'workshop' || kind === 'class' ? f.seats : undefined, place: kind === 'digital' ? undefined : f.place, fileName: kind === 'digital' ? f.fileName : undefined, filePath: kind === 'digital' ? s?.filePath : undefined };
    saveService(next, file.current);
    toast(isNew ? `${next.name} added.` : 'Saved.');
    router.replace('/products?tab=services');
  };

  return (
    <>
      <BackRow to="/products?tab=services" icon="tag" title="Services" />
      {dirty ? <SaveRow what="service" onSave={save} onDiscard={() => { setF(toForm(s)); setTried(false); file.current = undefined; setFileErr(''); }} /> : null}
      <div className="dpad" style={{ paddingBottom: dirty ? 90 : undefined }}>
        <h1 className="h1" style={{ margin: '0 0 4px' }}>{isNew ? `Add ${KIND_INFO[kind].label.toLowerCase()}` : s!.name}</h1>
        <p className="muted small" style={{ margin: '0 0 16px' }}>{KIND_INFO[kind].text}{isNew ? <> · <Link className="link" href="/products/service/new">Change kind</Link></> : null}</p>
        <form className="cols" noValidate onSubmit={(ev) => { ev.preventDefault(); save(); }}>
          <div>
            <div className="card">
              <div className="field" style={{ margin: 0 }}><label htmlFor="sv-name">Title</label><input id="sv-name" className={`input${e('name') ? ' bad' : ''}`} placeholder={kind === 'workshop' ? 'e.g. Block printing workshop' : kind === 'class' ? 'e.g. Morning yoga (group class)' : kind === 'session' ? 'e.g. 1-on-1 styling session' : 'e.g. Kurta pattern ebook'} value={f.name} onChange={(x) => set({ name: x.target.value })} />{e('name') ? <span className="err" role="alert">{e('name')}</span> : null}</div>
            </div>
            <div className="card">
              <div className="row" style={{ alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                <div className="field sp" style={{ flex: '1 1 140px' }}><label htmlFor="sv-price">Price</label><div className="money-in" style={e('price') ? { borderColor: 'var(--negative)' } : undefined}><span>₹</span><input id="sv-price" inputMode="numeric" placeholder="499" value={f.price} onChange={(x) => set({ price: x.target.value.replace(/[^\d,]/g, '') })} /></div>{e('price') ? <span className="err" role="alert">{e('price')}</span> : null}</div>
                {kind !== 'digital' ? (
                  <div className="field sp" style={{ flex: '1 1 140px' }}><label htmlFor="sv-min">Duration</label>
                    <select id="sv-min" className="input" value={f.minutes} onChange={(x) => set({ minutes: x.target.value })}>{['30', '45', '60', '75', '90', '120', '180', '240'].map((m) => <option key={m} value={m}>{Number(m) >= 60 && Number(m) % 60 === 0 ? `${Number(m) / 60} hr` : `${m} min`}</option>)}{!['30', '45', '60', '75', '90', '120', '180', '240'].includes(f.minutes) ? <option value={f.minutes}>{f.minutes} min</option> : null}</select>
                    {e('minutes') ? <span className="err" role="alert">{e('minutes')}</span> : null}
                  </div>
                ) : null}
              </div>
              {kind !== 'digital' ? (
                <div className="field" style={{ margin: 0 }}><label>Where</label>
                  <div className="chips" role="group" aria-label="Where">{WHERE.map((w) => <button key={w} type="button" className={`chip${f.place === w ? ' on' : ''}`} aria-pressed={f.place === w} onClick={() => set({ place: w })}>{w}</button>)}</div>
                </div>
              ) : null}
            </div>

            {kind === 'digital' ? (
              <div className="card">
                <div className="box-h"><span className="box-t">The file</span></div>
                <label className="drop" htmlFor="sv-file">
                  <span className="btn grey sm"><DI n="img" s={16} /> {f.fileName ? 'Choose a different file' : 'Add the file'}</span>
                  <span className="tiny muted">PDF, ebook, audio, video or a zip, up to 50 MB. Buyers get it as soon as they pay.</span>
                  <input type="file" id="sv-file" accept=".pdf,.zip,.epub,.mp3,.mp4,.jpg,.jpeg,.png,.webp,application/pdf,application/zip,application/epub+zip,audio/mpeg,video/mp4,image/*" onChange={(x) => { pickFile(x.target.files); x.target.value = ''; }} />
                </label>
                {f.fileName ? <p className="small" style={{ margin: '10px 0 0' }}>Selected: <b className="t-ink">{f.fileName}</b></p> : null}
                {fileErr ? <span className="err" role="alert">{fileErr}</span> : null}
                {e('file') ? <span className="err" role="alert" data-bad="1">{e('file')}</span> : null}
              </div>
            ) : (
              <div className="card">
                <div className="box-h"><span className="box-t">{kind === 'workshop' ? 'Date and time' : 'Time slots'}</span></div>
                {kind === 'workshop' ? (
                  <div className="field"><label htmlFor="sv-date">Date</label><input id="sv-date" type="date" className={`input${e('date') ? ' bad' : ''}`} min={today()} value={f.date} onChange={(x) => set({ date: x.target.value })} style={{ maxWidth: 220 }} />{e('date') ? <span className="err" role="alert">{e('date')}</span> : null}</div>
                ) : (
                  <div className="field"><label>Days</label><div className="chips" role="group" aria-label="Days">{DAYS.map((d) => <button key={d} type="button" className={`chip${f.days.includes(d) ? ' on' : ''}`} aria-pressed={f.days.includes(d)} onClick={() => toggle('days', d, DAYS)}>{d}</button>)}</div>{e('days') ? <span className="err" role="alert">{e('days')}</span> : null}</div>
                )}
                {kind === 'workshop' ? (
                  <div className="field"><label htmlFor="sv-time">Start time</label><select id="sv-time" className="input" style={{ maxWidth: 220 }} value={f.times[0] ?? ''} onChange={(x) => set({ times: [x.target.value] })}>{TIMES.map((t) => <option key={t}>{t}</option>)}</select>{e('times') ? <span className="err" role="alert">{e('times')}</span> : null}</div>
                ) : (
                  <div className="field"><label>Time slots</label><div className="chips wrap" role="group" aria-label="Time slots">{TIMES.map((t) => <button key={t} type="button" className={`chip${f.times.includes(t) ? ' on' : ''}`} aria-pressed={f.times.includes(t)} onClick={() => toggle('times', t, TIMES)}>{t}</button>)}</div>{e('times') ? <span className="err" role="alert">{e('times')}</span> : null}</div>
                )}
                {kind !== 'session' ? (
                  <div className="field"><label>{kind === 'workshop' ? 'Seats' : 'Seats per class'}</label>
                    <div className="dstep"><button type="button" aria-label="Fewer seats" onClick={() => set({ seats: Math.max(1, f.seats - 1) })}>−</button><input value={f.seats} readOnly aria-label="Seats" /><button type="button" aria-label="More seats" onClick={() => set({ seats: Math.min(1000, f.seats + 1) })}>+</button></div>
                  </div>
                ) : <p className="small muted" style={{ margin: 0 }}>One buyer books each slot.</p>}
                <p className="small muted" style={{ margin: 0 }}>Shown on your shop page as: <b style={{ color: 'var(--ink)' }}>{line || (kind === 'workshop' ? 'pick a date and time' : 'pick at least one day and time')}</b></p>
              </div>
            )}
          </div>
          <div>
            <button className="btn main full" type="submit">{isNew ? `Add ${KIND_INFO[kind].label.toLowerCase()}` : dirty ? 'Save changes' : 'Saved'}</button>
            {!isNew ? <button className="btn line sm" type="button" style={{ marginTop: 12 }} onClick={() => setDel(true)}>Delete service</button> : null}
          </div>
        </form>
      </div>
      {!isNew && <ConfirmDialog open={del} onClose={() => setDel(false)} title={`Delete ${s!.name}?`} body="Buyers won’t see it any more. Past bookings keep their details." yes="Delete" danger
        onYes={() => { deleteService(s!.id); router.push('/products?tab=services'); toast(`${s!.name} deleted.`, { icon: 'delete' }); }} />}
      <ConfirmDialog open={leaveTo !== null} onClose={() => setLeaveTo(null)} title="Leave without saving?" body="Your changes to this service won’t be saved." yes="Leave" danger onYes={() => { if (leaveTo) router.push(leaveTo); }} />
    </>
  );
}

export default function ServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <Suspense fallback={<div className="dpad" style={{ paddingTop: 20 }}><Skeleton rows={3} height={100} /></div>}><Editor id={id} key={id} /></Suspense>;
}
