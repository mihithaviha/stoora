// DEMO ADAPTER DATA — a made-up sample shop ("Meera Studio") so every screen can be tried
// before the real Stoora API is connected. Nothing here is real business data.
import type { Db } from './types';

export const DEMO_NOTICE = 'Demo shop: sample data, not your real business.';

export function demoDb(): Db {
  return {
    shop: { name: 'Meera Studio', owner: 'Meera', handle: 'meera', email: 'meera.studio@example.in', phone: '+91 98480 21234', city: 'Jaipur', open: true, showPrices: true, cod: true, look: 'Warm' },
    products: [
      { id: 'p1', name: 'Handblock cotton kurta', category: 'Kurtas', color: 'Natural white', sizes: ['S', 'M', 'L', 'XL'], price: 1499, stock: 24, status: 'Active', soldLast30Days: 31, viewsYesterday: 9, icon: 'checkroom' },
      { id: 'p2', name: 'Silk dupatta, maroon', category: 'Dupattas', color: 'Maroon', sizes: [], price: 2299, stock: 7, status: 'Active', soldLast30Days: 12, viewsYesterday: 4, icon: 'dry_cleaning' },
      { id: 'p3', name: 'Indigo kurta set', category: 'Kurtas', color: 'Indigo blue', sizes: ['M', 'L'], price: 2899, stock: 3, status: 'Active', soldLast30Days: 22, viewsYesterday: 12, icon: 'apparel' },
      { id: 'p6', name: 'Handblock kurta, sky blue', category: 'Kurtas', color: 'Sky blue', sizes: ['S', 'M', 'L', 'XL'], price: 1599, stock: 10, status: 'Active', soldLast30Days: 14, viewsYesterday: 7, icon: 'checkroom' },
      { id: 'p4', name: 'Cotton dupatta, mustard', category: 'Dupattas', color: 'Mustard', sizes: [], price: 699, stock: 0, status: 'Active', soldLast30Days: 18, viewsYesterday: 6, icon: 'texture' },
      { id: 'p5', name: 'Linen kurta, sage', category: 'Kurtas', color: 'Sage green', sizes: ['S', 'M', 'L'], price: 1899, stock: 12, status: 'Draft', soldLast30Days: 0, viewsYesterday: 0, icon: 'apparel' },
    ],
    services: [
      { id: 'v1', name: 'Morning yoga (group class)', type: 'Class', price: 499, minutes: 60, next: 'Wed 7:00 am · 4 seats left', icon: 'self_improvement' },
      { id: 'v2', name: '1-on-1 yoga session', type: '1-on-1', price: 1200, minutes: 60, next: 'Thu 6:00 pm', icon: 'person' },
      { id: 'v3', name: 'Yoga for beginners e-book', type: 'Digital', price: 299, minutes: 0, next: 'Instant download', icon: 'menu_book' },
    ],
    orders: [
      { id: 1012, buyer: 'Priya Sharma', phone: '+91 98xxx x1234', city: 'Pune', lines: [{ productId: 'p1', qty: 1, size: 'M', price: 1499 }, { productId: 'p2', qty: 1, price: 2299 }], shipping: 0, total: 3798, paid: true, method: 'upi', shipped: false, source: 'WhatsApp', createdAt: 'Today, 10:42 am', createdBy: 'buyer' },
      { id: 1011, buyer: 'Rahul Verma', phone: '+91 90xxx x4410', city: 'Lucknow', lines: [{ productId: 'p1', qty: 1, size: 'L', price: 1499 }], shipping: 0, total: 1499, paid: false, method: 'upi', shipped: false, source: 'Instagram', createdAt: 'Yesterday, 6:15 pm', createdBy: 'buyer' },
      { id: 1010, buyer: 'Anjali Rao', phone: '+91 99xxx x5521', city: 'Bengaluru', lines: [{ productId: 'p3', qty: 1, size: 'M', price: 2899 }], shipping: 0, total: 2899, paid: true, method: 'upi', shipped: true, courier: 'Delhivery', tracking: 'DL4482190', source: 'Shop link', createdAt: '23 Oct, 2:05 pm', createdBy: 'buyer' },
      { id: 1009, buyer: 'Walk-in buyer', city: 'Jaipur', lines: [{ productId: 'p4', qty: 1, price: 699 }], shipping: 0, total: 699, paid: true, method: 'cash', shipped: true, source: 'In person', createdAt: '22 Oct, 11:30 am', createdBy: 'manual' },
    ],
    bookings: [
      { id: 'B-208', buyer: 'Kavya Iyer', serviceId: 'v1', when: 'Today, 7:00 am', day: 'Today', paid: true, status: 'Done' },
      { id: 'B-209', buyer: 'Arjun Mehta', serviceId: 'v2', when: 'Thu 30 Oct, 6:00 pm', day: 'Thu 30 Oct', paid: false, status: 'Upcoming' },
      { id: 'B-210', buyer: 'Sneha Kulkarni', serviceId: 'v1', when: 'Wed 29 Oct, 7:00 am', day: 'Wed 29 Oct', paid: true, status: 'Upcoming' },
    ],
    chats: [
      { id: 'c1', buyer: 'Priya Sharma', source: 'WhatsApp', mood: 'ready', last: 'Is the indigo set there in size M?', time: '2 min', unread: true,
        messages: [{ from: 'them', text: 'Hi, loved the kurta I got last week', time: '10:31 am' }, { from: 'them', text: 'Is the indigo set there in size M?', time: '10:32 am' }],
        draft: 'Hi Priya, yes — the indigo kurta set is in stock in M, only 3 left. It is ₹2,899. Shall I send you a UPI link to book it?' },
      { id: 'c2', buyer: 'Rohan Das', source: 'Instagram', mood: 'ready', last: 'How do I pay for the yoga class?', time: '18 min', unread: true,
        messages: [{ from: 'them', text: 'How do I pay for the yoga class?', time: '10:16 am' }],
        draft: 'Hi Rohan, the morning yoga class is ₹499. Wednesday 7 am has 4 seats left. I will send you a UPI link now.' },
      { id: 'c3', buyer: 'Anjali Rao', source: 'WhatsApp', mood: 'upset', last: 'My parcel still hasn’t come', time: '1 hr', unread: true,
        messages: [{ from: 'them', text: 'My parcel still hasn’t come', time: '9:20 am' }, { from: 'them', text: 'It has been 4 days', time: '9:21 am' }],
        draft: 'Sorry for the wait, Anjali. Order #1010 left on 23 Oct with Delhivery, tracking DL4482190. It should reach you tomorrow — I will keep checking and message you.' },
      { id: 'c4', buyer: 'Neha Joshi', source: 'Instagram', mood: 'look', last: 'Such lovely colours', time: '3 hr', unread: false,
        messages: [{ from: 'them', text: 'Such lovely colours', time: '7:48 am' }],
        draft: 'Thank you, Neha. New block prints go up every Friday — shall I message you when they are live?' },
    ],
    customers: [
      { id: 'u1', name: 'Priya Sharma', phone: '+91 98xxx x1234', city: 'Pune', source: 'WhatsApp', orders: 3, spent: 7196, lastOrder: 'Today' },
      { id: 'u2', name: 'Kavya Iyer', phone: '+91 97xxx x8890', city: 'Jaipur', source: 'Instagram', orders: 6, spent: 2994, lastOrder: 'Today' },
      { id: 'u3', name: 'Anjali Rao', phone: '+91 99xxx x5521', city: 'Bengaluru', source: 'Shop link', orders: 2, spent: 4398, lastOrder: '23 Oct' },
      { id: 'u4', name: 'Rahul Verma', phone: '+91 90xxx x4410', city: 'Lucknow', source: 'Instagram', orders: 1, spent: 0, lastOrder: 'Yesterday' },
      { id: 'u5', name: 'Arjun Mehta', phone: '+91 88xxx x0912', city: 'Jaipur', source: 'WhatsApp', orders: 1, spent: 0, lastOrder: 'Yesterday' },
    ],
    offers: [
      { code: 'DIWALI10', what: '10% off everything', used: 14, ends: 'Ends 2 Nov', on: true },
      { code: 'YOGA100', what: '₹100 off yoga classes', used: 3, ends: 'Ends 30 Oct', on: true },
      { code: 'FIRSTKURTA', what: '₹150 off first order', used: 41, ends: 'No end date', on: false },
    ],
    ideas: [
      { id: 'i1', icon: 'photo_camera', text: 'The indigo kurta set has 3 left, and 12 people looked at it yesterday. Post “Only 3 left” to Instagram?', earn: 8600, cost: 0, action: 'Prepare post', done: 'Post draft ready to copy' },
      { id: 'i2', icon: 'currency_rupee', text: 'Rahul has not paid ₹1,499 for 2 days. Send him a gentle UPI reminder on WhatsApp?', earn: 1499, cost: 0, action: 'Send reminder', done: 'Reminder ready to send from WhatsApp' },
      { id: 'i3', icon: 'self_improvement', text: 'Wednesday’s morning yoga has 4 seats free. Offer ₹100 off to your 9 past students?', earn: 1600, cost: 400, action: 'Send offer', done: 'Offer message ready to send' },
    ],
    alerts: [
      { id: 'a1', icon: 'shopping_bag', title: 'New order #1012 from Priya Sharma', detail: '₹3,798 · paid by UPI', when: '10:42 am', href: '/orders/1012' },
      { id: 'a2', icon: 'inventory_2', title: 'Cotton dupatta, mustard is sold out', detail: 'Buyers can still see it. Restock or hide it.', when: '9:05 am', href: '/products/p4' },
      { id: 'a3', icon: 'event', title: 'Arjun booked a 1-on-1 session', detail: 'Thu 30 Oct, 6:00 pm · not paid yet', when: 'Yesterday', href: '/orders?tab=bookings' },
    ],
    stats: {
      salesToday: 8195, salesYesterday: 6940, ordersYesterday: 5, visitsToday: 148, visitsYesterday: 125,
      receivedToday: 4497, receivedWeek: 31840, receivedMonth: 128460, refundsWeek: 699, refundsMonth: 1398,
      salesByDay: [
        { day: 'Wed', sales: 5200, orders: 4, visits: 132 }, { day: 'Thu', sales: 3100, orders: 3, visits: 118 },
        { day: 'Fri', sales: 6900, orders: 5, visits: 160 }, { day: 'Sat', sales: 9400, orders: 7, visits: 201 },
        { day: 'Sun', sales: 5900, orders: 4, visits: 162 }, { day: 'Mon', sales: 6940, orders: 5, visits: 125 },
        { day: 'Today', sales: 8195, orders: 3, visits: 148 },
      ],
      salesByWeek: [
        { week: '28 Sep', sales: 28400, orders: 24 }, { week: '5 Oct', sales: 31200, orders: 27 }, { week: '12 Oct', sales: 26900, orders: 22 },
        { week: '19 Oct', sales: 36800, orders: 30 }, { week: '26 Oct', sales: 15135, orders: 15 },
      ],
      sourcesPercent: { WhatsApp: 46, Instagram: 31, 'Shop link': 15, 'In person': 8 },
      payout: { amount: 8120, date: 'Tue 28 Oct', to: 'HDFC ••4421' },
      pastPayouts: [{ date: 'Mon 20 Oct', amount: 12480 }, { date: 'Mon 13 Oct', amount: 9655 }],
    },
    nextOrderId: 1013,
  };
}
