import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HomePage } from '#src/pages/HomePage';

describe('HomePage', () => {
  it('shows the server health status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ data: { status: 'ok' }, error: null }),
      }),
    );

    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText('Server status: ok')).toBeInTheDocument();
    });
  });
});
