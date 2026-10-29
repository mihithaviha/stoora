export const SETTINGS: [string, string, string][] = [
  ['General', 'store', 'Shop name, contact details and address'], ['Order-taking', 'shopping_bag', 'When, how and how much you can take orders'], ['WhatsApp verification', 'verified', 'Verify the number buyers contact you on'], ['Plan', 'workspace_premium', 'Your Stoora plan'], ['Billing', 'receipt_long', 'Invoices for your plan'],
  ['Users', 'group', 'People who can use this shop'], ['Payments', 'payments', 'UPI, cards and payouts'], ['Checkout', 'shopping_cart_checkout', 'What buyers fill in to order'],
  ['Customer accounts', 'account_circle', 'Buyer logins and saved addresses'], ['Shipping and delivery', 'local_shipping', 'Couriers, rates and pickup'], ['Taxes and duties', 'percent', 'GST on your invoices'],
  ['Locations', 'location_on', 'Where you keep stock'], ['Apps', 'apps', 'Tools connected to Stoora'], ['Sales channels', 'hub', 'Where orders come from'],
  ['Domains', 'language', 'Your own web address'], ['Customer events', 'ads_click', 'Tracking for ads'], ['Notifications', 'notifications', 'What Stoora alerts you about'],
  ['Languages', 'translate', 'Languages your shop shows'], ['Customer privacy', 'lock', 'Cookie and data choices'], ['Policies', 'description', 'Returns, refunds and privacy'],
];
export const slug = (s: string) => s.toLowerCase().replace(/[^a-z]+/g, '-');
