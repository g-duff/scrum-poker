import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import type { ApiResponse } from '@scrum-poker/shared';
import { DEFAULT_DECK } from '@scrum-poker/shared';
import { HomePage } from '#src/pages/HomePage';

function renderHomePage() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/s/:id" element={<p>Session page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('HomePage', () => {
  it('pre-fills the cards field with the default deck', () => {
    renderHomePage();

    expect(screen.getByLabelText('Cards (comma separated)')).toHaveValue(
      DEFAULT_DECK.join(', '),
    );
  });

  it('creates a session with the entered deck and navigates to it', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          data: { id: 's1' },
          error: null,
        } satisfies ApiResponse<{ id: string }>),
    });
    vi.stubGlobal('fetch', fetchMock);
    renderHomePage();

    fireEvent.change(screen.getByLabelText('Cards (comma separated)'), {
      target: { value: 'S, M, L' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create session' }));

    await waitFor(() => {
      expect(screen.getByText('Session page')).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledWith('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deck: ['S', 'M', 'L'] }),
    });
  });

  it('shows the server error message when creation fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: () =>
          Promise.resolve({
            data: null,
            error: { code: 'invalid_deck', message: 'Deck is invalid.' },
          } satisfies ApiResponse<{ id: string }>),
      }),
    );
    renderHomePage();

    fireEvent.click(screen.getByRole('button', { name: 'Create session' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Deck is invalid.');
    });
  });

  it('shows a generic error when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
    renderHomePage();

    fireEvent.click(screen.getByRole('button', { name: 'Create session' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Could not reach the server. Try again.',
      );
    });
  });
});
