import { useState } from 'react';
import type { SubmitEvent } from 'react';
import { useNavigate } from 'react-router';
import type { ApiResponse } from '@scrum-poker/shared';
import { DEFAULT_DECK } from '@scrum-poker/shared';
import shared from '#src/styles/shared.module.css';
import { cx } from '#src/styles/cx';
import styles from '#src/pages/HomePage.module.css';

function parseDeck(cardsInput: string): string[] {
  return cardsInput
    .split(',')
    .map((card) => card.trim())
    .filter((card) => card.length > 0);
}

export function HomePage() {
  const [cardsInput, setCardsInput] = useState(DEFAULT_DECK.join(', '));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function createSession(): Promise<void> {
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deck: parseDeck(cardsInput) }),
      });
      const body = (await response.json()) as ApiResponse<{ id: string }>;
      if (body.error !== null) {
        setError(body.error.message);
        return;
      }
      void navigate(`/s/${body.data.id}`);
    } catch {
      setError('Could not reach the server. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    void createSession();
  }

  return (
    <main className={cx(shared.wrap)}>
      <h1 className={cx(styles.title)}>Scrum Poker</h1>
      <div className={cx(shared.panel)}>
        <form onSubmit={handleSubmit}>
          <label htmlFor="cards" className={cx(shared.label)}>
            Cards (comma separated)
          </label>
          <div className={cx(shared.row)}>
            <input
              id="cards"
              className={cx(shared.textInput)}
              value={cardsInput}
              onChange={(event) => {
                setCardsInput(event.target.value);
              }}
            />
            <button
              type="submit"
              className={cx(shared.buttonPrimary)}
              disabled={submitting}
            >
              Create session
            </button>
          </div>
          {error !== null && (
            <p role="alert" className={cx(shared.note, shared.noteErr)}>
              {error}
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
