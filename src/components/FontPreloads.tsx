import { SUPABASE_URL, isSupabaseConfigured } from '@/lib/supabase/config';

/**
 * Head hints, so the first screen starts early:
 *  - the fonts it needs start downloading right away (all self-hosted, no other site involved);
 *  - `data`: pages that read from the database open the connection to it before the code asks, saving a handshake.
 */
export function FontPreloads({ logo = false, data = false }: { logo?: boolean; data?: boolean }) {
  const f = (file: string) => <link rel="preload" href={`/fonts/${file}`} as="font" type="font/woff2" crossOrigin="anonymous" />;
  return (
    <>
      {f('lexend-latin-400-700.woff2')}
      {f('bricolage-latin-600-800.woff2')}
      {f('material-symbols-subset.woff2')}
      {logo ? f('fraunces-latin-900.woff2') : null}
      {data && isSupabaseConfigured ? <link rel="preconnect" href={new URL(SUPABASE_URL).origin} crossOrigin="anonymous" /> : null}
    </>
  );
}
