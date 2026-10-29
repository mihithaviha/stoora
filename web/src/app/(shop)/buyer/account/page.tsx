'use client';
// Buyer account: details, saved addresses and privacy shortcuts. Saved in this browser in demo mode.
// API_TODO: GET/PATCH /api/buyer/profile, GET/POST/DELETE /api/buyer/addresses.
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button, Card, ConfirmDialog, Dialog, Field, Icon, PageHeader, Skeleton, useToast, Badge } from '@/components/ui';
import { BUYER_KEY, readBuyer } from '@/components/bits';
import { useAuth } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase/client';
import { deleteAddress, listAddresses, saveAddress } from '@/lib/supabase/data';

interface Addr { id: string; label: string; line: string; city: string; pin: string; main?: boolean }
const ADDR_KEY = 'stoora.addresses.v1';
const SEED: Addr[] = [{ id: 'a1', label: 'Home', line: '12 Lake View Road, Indiranagar', city: 'Pune', pin: '411001', main: true }, { id: 'a2', label: 'Office', line: '4th floor, Tech Park, Baner', city: 'Pune', pin: '411045' }];

export default function BuyerAccount() {
  const toast = useToast(); const auth = useAuth(); const sb = getSupabase();
  const [me, setMe] = useState<{ name: string; phone: string } | null>(null); const [email, setEmail] = useState('priya@example.in');
  const [addrs, setAddrs] = useState<Addr[]>(sb ? [] : SEED); const [edit, setEdit] = useState<Addr | null>(null); const [del, setDel] = useState<Addr | null>(null); const [tried, setTried] = useState(false);
  const refresh = () => { if (sb) listAddresses(sb).then(setAddrs).catch((e) => toast(`Couldn’t load addresses: ${e.message}`, { icon: 'error' })); };
  useEffect(() => {
    if (sb) { if (auth.user) { setMe({ name: auth.user.name, phone: auth.user.phone ? '+' + auth.user.phone.replace(/\D/g, '') : auth.user.email }); setEmail(auth.user.email); refresh(); } return; }
    setMe(readBuyer()); try { const a = JSON.parse(localStorage.getItem(ADDR_KEY) || 'null'); if (a) setAddrs(a); } catch { /* ignore */ }
  }, [auth.user]); // eslint-disable-line react-hooks/exhaustive-deps
  const persist = (a: Addr[]) => { setAddrs(a); if (!sb) try { localStorage.setItem(ADDR_KEY, JSON.stringify(a)); } catch { /* ignore */ } };
  if (!me) return <Skeleton rows={3} height={110} />;
  const err = (a: Addr) => ({ label: a.label.trim() ? '' : 'Give it a name, like Home.', line: a.line.trim().length < 6 ? 'Add a house number and street.' : '', pin: /^\d{6}$/.test(a.pin) ? '' : 'A pincode has 6 digits.', city: a.city.trim() ? '' : 'Add the city.' });
  const saveAddr = () => { if (!edit) return; setTried(true); if (Object.values(err(edit)).some(Boolean)) return; if (sb && auth.user) saveAddress(sb, auth.user.id, edit).then(refresh).catch((e) => toast(`Couldn’t save: ${e.message}`, { icon: 'error' })); else persist(addrs.some((a) => a.id === edit.id) ? addrs.map((a) => (a.id === edit.id ? edit : a)) : [...addrs, edit]); setEdit(null); setTried(false); toast('Address saved.'); };
  const ee = edit ? err(edit) : null;
  return (
    <div className="stack" style={{ paddingTop: 'var(--s3)' }}>
      <PageHeader title="My account" lede="Your details and where we deliver." />
      <div className="detail">
        <div>
          <Card className="stack" title="About you" icon="person">
            <Field id="ba-name" label="Name"><input id="ba-name" className="input" value={me.name} onChange={(e) => setMe({ ...me, name: e.target.value })} autoComplete="name" /></Field>
            <Field id="ba-phone" label="Mobile number" hint="You log in with this number."><div className="affix" style={{ background: 'var(--muted)' }}><input id="ba-phone" value={me.phone} readOnly aria-readonly="true" style={{ paddingLeft: 18 }} /><Badge tone="ok" icon="verified">Verified</Badge></div></Field>
            <Field id="ba-email" label="Email" optional hint="For receipts."><input id="ba-email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
            <div><Button kind="ink" onClick={() => { try { localStorage.setItem(BUYER_KEY, JSON.stringify(me)); } catch { /* ignore */ } toast('Details saved.'); }}>Save details</Button></div>
          </Card>
          <Card title="Saved addresses" icon="location_on" aside={<Button small icon="add" onClick={() => { setTried(false); setEdit({ id: 'a' + Date.now(), label: '', line: '', city: '', pin: '' }); }}>Add</Button>}>
            <div className="rows">{addrs.map((a) => (
              <div className="li" key={a.id} style={{ alignItems: 'flex-start' }}><span className="thumb"><Icon name={a.label === 'Office' ? 'business' : 'home'} /></span><span className="grow"><span className="t">{a.label} {a.main && <Badge tone="ok" icon="check">Default</Badge>}</span><span className="s">{a.line}, {a.city} {a.pin}</span></span>
                <span className="row" style={{ gap: 0 }}><Button kind="quiet" small icon="edit" aria-label={`Edit ${a.label}`} onClick={() => { setTried(false); setEdit(a); }} /><Button kind="danger" small icon="delete" aria-label={`Delete ${a.label}`} onClick={() => setDel(a)} /></span></div>))}
              {addrs.length === 0 && <p className="t-body">No saved addresses. Add one to check out faster.</p>}</div>
          </Card>
        </div>
        <div>
          <Card title="Privacy and data" icon="lock" className="stack tight"><p className="cap">You choose what Stoora keeps. You can see, correct, export or delete your data at any time.</p><div className="btns"><Link className="btn line sm" href="/data-requests">Make a data request</Link><Link className="btn quiet sm" href="/privacy">Privacy policy</Link></div></Card>
          <Card title="Offers" icon="local_offer"><div className="toggle-row"><span className="grow"><span className="t-ink" style={{ fontWeight: 500, display: 'block' }}>Messages about offers</span><span className="cap">Only from shops you ordered from. Turn off any time.</span></span><Button small onClick={() => toast('Offer messages turned off.', { icon: 'notifications_off' })}>Turn off</Button></div></Card>
        </div>
      </div>
      <Dialog open={!!edit} onClose={() => setEdit(null)} title={edit && addrs.some((a) => a.id === edit.id) ? 'Edit address' : 'Add address'} footer={<><Button onClick={() => setEdit(null)}>Cancel</Button><Button kind="ink" onClick={saveAddr}>Save address</Button></>}>
        {edit && ee && <div className="stack">
          <Field id="ad-l" label="Name this address" required error={tried && ee.label ? ee.label : undefined}><input id="ad-l" className={`input ${tried && ee.label ? 'bad' : ''}`} value={edit.label} onChange={(e) => setEdit({ ...edit, label: e.target.value })} placeholder="Home, Office…" /></Field>
          <Field id="ad-a" label="House number and street" required error={tried && ee.line ? ee.line : undefined}><input id="ad-a" className={`input ${tried && ee.line ? 'bad' : ''}`} value={edit.line} onChange={(e) => setEdit({ ...edit, line: e.target.value })} /></Field>
          <div className="grid2"><Field id="ad-c" label="City" required error={tried && ee.city ? ee.city : undefined}><input id="ad-c" className={`input ${tried && ee.city ? 'bad' : ''}`} value={edit.city} onChange={(e) => setEdit({ ...edit, city: e.target.value })} /></Field><Field id="ad-p" label="Pincode" required error={tried && ee.pin ? ee.pin : undefined}><input id="ad-p" className={`input ${tried && ee.pin ? 'bad' : ''}`} inputMode="numeric" maxLength={6} value={edit.pin} onChange={(e) => setEdit({ ...edit, pin: e.target.value.replace(/\D/g, '') })} /></Field></div>
        </div>}
      </Dialog>
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} danger title="Delete this address?" yes="Delete" body={del ? `${del.label}: ${del.line}, ${del.city} will be removed from your account.` : ''} onYes={() => { if (del) { if (sb) deleteAddress(sb, del.id).then(refresh).catch((e) => toast(`Couldn’t delete: ${e.message}`, { icon: 'error' })); else persist(addrs.filter((a) => a.id !== del.id)); toast('Address deleted.', { icon: 'delete' }); } }} />
    </div>
  );
}
