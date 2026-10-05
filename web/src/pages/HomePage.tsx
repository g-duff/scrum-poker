import { useEffect, useState } from 'react';
import type { ApiResponse } from '@scrum-poker/shared';

type HealthStatus = 'loading' | 'ok' | 'error';

export function HomePage() {
  const [status, setStatus] = useState<HealthStatus>('loading');

  useEffect(() => {
    let cancelled = false;

    fetch('/api/health')
      .then((res) => res.json() as Promise<ApiResponse<{ status: string }>>)
      .then((body) => {
        if (!cancelled) {
          setStatus(body.error === null ? 'ok' : 'error');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('error');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main>
      <h1>Scrum Poker</h1>
      <p>Server status: {status}</p>
    </main>
  );
}
