'use client';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { AppIcon, Ic, Wordmark } from '../bits';
import { ShopFront, WatercolorDefs } from '../ShopFront';

/** The frame around every sign-in screen: a painted shop on the left (wide screens) and the form on the right. */
export function AuthShell({ children, handle }: { children: ReactNode; handle?: string }) {
  return (
    <>
      <WatercolorDefs />
      <div className="auth">
        <aside className="auth-side" aria-hidden="true">
          <Link className="logo row" href="/" style={{ textDecoration: 'none' }} tabIndex={-1}><AppIcon /><Wordmark /></Link>
          <div className="shop paint-in"><ShopFront boardId="board-auth" handle={handle} /></div>
          <div className="stack">
            <h2 className="l-h3">Your shop, live on day one.</h2>
            <ol>
              <li>Your shop goes up at stoora.in/yourname.</li>
              <li>A short setup list tells you what to do next.</li>
              <li>Add one product and share the link.</li>
            </ol>
          </div>
        </aside>
        <main className="auth-main" id="main">
          <div className="auth-top">
            <Link className="logo row" href="/" style={{ textDecoration: 'none' }} aria-label="stoora.in home">
              <AppIcon style={{ width: 30, height: 30, fontSize: 17 }} /><span className="wordmark" style={{ fontSize: 20 }}>stoora<i>.in</i></span>
            </Link>
            <Link className="link" href="/"><Ic n="arrow_back" c="sm" />Back to the website</Link>
          </div>
          <div className="auth-box" style={{ animation: 'rise .45s var(--ease-out)' }}>{children}</div>
        </main>
      </div>
    </>
  );
}
