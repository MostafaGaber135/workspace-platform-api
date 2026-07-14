import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'DeveloperOS',
  description: 'Turn real Git activity into reviewable, human-approved work logs.',
};

/**
 * Root layout. Establishes the html/body shell and mounts the global providers
 * (TanStack Query) around every route.
 */
export default function RootLayout({ children }: { children: ReactNode }): ReactNode {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
