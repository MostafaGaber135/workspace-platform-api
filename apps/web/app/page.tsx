'use client';

import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { fetchHealth } from '@/lib/api-client';

/**
 * Foundation landing page.
 *
 * This is NOT a product screen — it exists to prove the end-to-end web↔API
 * wiring is sound (Next App Router, TanStack Query, the shared HealthCheck type,
 * and the shadcn Button primitive all working together). Product screens replace
 * this page in later phases.
 */
export default function HomePage(): ReactNode {
  const { data, isPending, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">DeveloperOS</h1>
        <p className="text-sm text-muted-foreground">
          Foundation is running. This page verifies connectivity to the API.
        </p>
      </div>

      <section
        aria-live="polite"
        className="w-full rounded-lg border border-border bg-card p-6 text-left shadow-sm"
      >
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">API health</h2>

        {isPending ? (
          <p className="text-sm">Checking API…</p>
        ) : isError ? (
          <p className="text-sm text-destructive" data-testid="health-error">
            Could not reach the API: {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        ) : (
          <dl className="grid grid-cols-2 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Status</dt>
            <dd className="font-medium" data-testid="health-status">
              {data.status}
            </dd>
            <dt className="text-muted-foreground">Version</dt>
            <dd className="font-medium">{data.version}</dd>
            <dt className="text-muted-foreground">Uptime</dt>
            <dd className="font-medium">{data.uptimeSeconds}s</dd>
          </dl>
        )}
      </section>

      <Button variant="secondary" onClick={() => void refetch()} disabled={isFetching}>
        <RefreshCw className="h-4 w-4" aria-hidden />
        {isFetching ? 'Refreshing…' : 'Refresh'}
      </Button>
    </main>
  );
}
