// Enquiries sent from the public site (demo: kept in this browser) plus a few samples for the admin inbox.
// API_TODO: POST /api/enquiries (public form), GET/PATCH /api/admin/enquiries (admin only).
export type EnquiryStatus = 'New' | 'Open' | 'Answered' | 'Closed';
export interface Enquiry { id: string; name: string; contact: string; topic: string; message: string; when: string; status: EnquiryStatus; from: 'Landing page' | 'Storefront' | 'Seller help' }

export const TOPICS = ['I want to open a shop', 'Pricing and plans', 'Payments and payouts', 'Moving my products over', 'Something is not working', 'Other'];
export const SAMPLE_ENQUIRIES: Enquiry[] = [
  { id: 'e1', name: 'Sunita Rao', contact: 'sunita.pottery@example.in', topic: 'I want to open a shop', message: 'Hello, I make ceramic cups and bowls in Pondicherry and sell on Instagram right now. Can I take UPI payments through Stoora, and how long does setup take?', when: '10:12 am', status: 'New', from: 'Landing page' },
  { id: 'e2', name: 'Imran Qureshi', contact: '+91 98xxx x7788', topic: 'Moving my products over', message: 'I have about 140 products in a spreadsheet. Is there a way to bring them in without typing each one?', when: '9:40 am', status: 'New', from: 'Landing page' },
  { id: 'e3', name: 'Meera Studio', contact: 'meera.studio@example.in', topic: 'Payments and payouts', message: 'My payout for Tuesday has not shown up in my bank yet. Order numbers #1008 and #1009 are included.', when: 'Yesterday', status: 'Open', from: 'Seller help' },
  { id: 'e4', name: 'Farah Khan', contact: 'farah@example.in', topic: 'Pricing and plans', message: 'Is there any monthly fee? I only sell a few things a month.', when: 'Yesterday', status: 'Answered', from: 'Landing page' },
  { id: 'e5', name: 'Rohit Nair', contact: '+91 90xxx x1120', topic: 'Something is not working', message: 'The shop link opens but my photos are not showing on the phone.', when: '24 Oct', status: 'Closed', from: 'Seller help' },
];

const KEY = 'stoora.enquiries.v1';
export function readSent(): Enquiry[] { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } }
export function saveSent(e: Enquiry) { try { localStorage.setItem(KEY, JSON.stringify([e, ...readSent()])); } catch { /* ignore */ } }
