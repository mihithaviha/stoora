'use client';
import { useSearchParams } from 'next/navigation';
import { ChannelPage } from '@/components/ChannelPage';
export default function InstagramPage() { const searchParams = Object.fromEntries(useSearchParams()) as { c?: string }; return <ChannelPage channel="Instagram" openId={searchParams.c ?? null} />; }
