import { redirect } from 'next/navigation';

// "Open a shop" is now Start for Free. Old links and bookmarks keep working.
export default async function SignupPage({ searchParams }: { searchParams: Promise<{ shop?: string }> }) {
  const { shop } = await searchParams;
  redirect(shop ? `/shop/start?shop=${encodeURIComponent(shop)}` : '/shop/start');
}
