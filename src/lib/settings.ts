// Settings has four pages. Each one is real: nothing here says "coming soon". A page comes back to this list only when it is built.
export const SETTINGS: [string, string, string][] = [
  ['Shop details', 'store', 'Name, link, contact details and pausing your shop'],
  ['Getting paid', 'payments', 'UPI and cash on delivery'],
  ['Delivery', 'local_shipping', 'Delivery charge, area and order limits'],
  ['WhatsApp', 'verified', 'Verify the number buyers contact you on'],
];
export const slug = (s: string) => s.toLowerCase().replace(/[^a-z]+/g, '-');

/** Addresses from older versions of Settings go to the page that replaced them. */
export const LEGACY_SETTINGS: Record<string, string> = {
  general: 'shop-details', 'order-taking': 'delivery', 'whatsapp-verification': 'whatsapp', payments: 'getting-paid', 'shipping-and-delivery': 'delivery',
  checkout: 'delivery', notifications: 'shop-details', 'sales-channels': 'shop-details', domains: 'shop-details',
};
