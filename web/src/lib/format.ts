export const rs = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
export const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;
export const initials = (name: string) => name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
export const avatarTone = (name: string) => 'c' + (1 + ([...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 4));
export const toNum = (s: string | number) => Number(String(s).replace(/[^\d.]/g, '')) || 0;
export const cleanHandle = (s: string) => s.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30);
