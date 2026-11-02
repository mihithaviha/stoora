// The two lines that describe a shop's state. The same words are used on the seller's switch and on the live shop.
export const OPEN_LINE = 'Shop is open. Buyers can order.';
export const PAUSED_LINE = 'Shop is paused. Buyers can look but can’t order.';

// What a shop sells. Picked in the shop setup, changed in Settings > Shop details. Both kinds stay saved when it changes:
// the menu just shows the one that fits (a shop with neither value, like the sample shop, shows everything).
export const PHYSICAL = 'Physical products';
export const DIGITAL = 'Digital products';
export const sellsDigital = (s: { category?: string }) => s.category === DIGITAL;
export const sellsPhysical = (s: { category?: string }) => s.category === PHYSICAL;
