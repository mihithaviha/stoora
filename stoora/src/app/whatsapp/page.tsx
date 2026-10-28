'use client';
import { useSearchParams } from 'next/navigation';
import { ChannelPage } from '@/components/ChannelPage';
export default function WhatsAppPage() { const searchParams = Object.fromEntries(useSearchParams()) as { c?: string }; return <ChannelPage channel="WhatsApp" openId={searchParams.c ?? null} />; }
