import { useState } from 'react';
import type { SubmitEvent } from 'react';
import shared from '#src/styles/shared.module.css';
import { cx } from '#src/styles/cx';
import styles from '#src/pages/SessionPage.module.css';

export function JoinForm({
  submitting,
  error,
  onSubmit,
}: {
  submitting: boolean;
  error: string | null;
  onSubmit: (displayName: string) => void;
}) {
  const [displayName, setDisplayName] = useState('');

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    onSubmit(displayName);
  }

  return (
    <main className={cx(shared.wrap)}>
      <h1 className={cx(styles.title)}>Scrum Poker</h1>
      <div className={cx(shared.panel)}>
        <h2 className={cx(styles.subtitle)}>Join this session</h2>
        <form onSubmit={handleSubmit}>
          <label htmlFor="displayName" className={cx(shared.label)}>
            Your name
          </label>
          <div className={cx(shared.row)}>
            <input
              id="displayName"
              className={cx(shared.textInput)}
              value={displayName}
              onChange={(event) => {
                setDisplayName(event.target.value);
              }}
            />
            <button
              type="submit"
              className={cx(shared.buttonPrimary)}
              disabled={submitting}
            >
              Join
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
